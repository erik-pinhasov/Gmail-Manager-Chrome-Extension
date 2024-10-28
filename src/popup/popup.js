import {
  showCustomModal,
  loadingSpinner,
  showWindow,
  logError,
  openDataWindow,
} from "../utils/utils.js";
import { getAuthToken, getUserInfo, logout } from "../utils/api.js";
import { sanitizeEmailAddress } from "../utils/sanitization.js";
import { SecureStorage } from "../utils/storage.js";
import { LanguageDetector } from "../utils/languageDetector.js";
import { SenderManager } from "../features/senderManager.js";
import { LabelManager } from "../features/labelManager.js";
import { SubscriptionManager } from "../features/subscriptionManager.js";

/**
 * Manages the extension's popup UI and feature interactions.
 * Initializes three main features: email sender management, label management, and subscription management.
 *
 * Properties:
 * - senderManager: Handles email batch deletion based on sender address
 * - labelManager: Handles email batch deletion based on Gmail labels/Categories
 * - subscriptionManager: Handles unsubscription and batch deletion
 */
class PopupManager {
  constructor() {
    this.senderManager = new SenderManager();
    this.labelManager = new LabelManager();
    this.subscriptionManager = new SubscriptionManager();
    this.authToken = null;
    this.initEventListeners();
  }

  /* -------------------
    Utility and Initialization Methods
     -------------------
*/

  // Set up all event listeners on DOM load
  async initEventListeners() {
    document.addEventListener("DOMContentLoaded", () => this.initPopup());
    this.initAuthButtons();
    this.initFeatureHandlers();
    document
      .querySelectorAll("#backToMenu")
      .forEach((button) =>
        button.addEventListener("click", () => location.reload())
      );
  }

  // Initialize login/logout button handlers
  initAuthButtons() {
    document
      .getElementById("loginButton")
      ?.addEventListener("click", () => this.handleLogin());
    document
      .getElementById("logoutButton")
      ?.addEventListener("click", () => this.handleLogout());
  }

  // Initialize all feature event handlers
  initFeatureHandlers() {
    this.initDeleteByLabel();
    this.initDeleteBySender();
    this.initSubscriptions();
  }

  // Safely execute async operations with loading state and error handling
  async safeOperation(operation, errorMessage = "Operation failed") {
    try {
      loadingSpinner(true);
      await operation();
      loadingSpinner(false);
    } catch (error) {
      loadingSpinner(false);
      logError(error);
      showCustomModal(errorMessage);
    }
  }

  // Validate select element value and show error if invalid
  validateSelection(selectId, message) {
    const select = document.getElementById(selectId);
    if (!select?.value) {
      showCustomModal(message);
      return null;
    }
    return select;
  }

  /* -------------------
    Authentication and Email Methods
     -------------------
*/

  // Handle email viewing for both sender and subscription features
  async handleViewEmails(
    manager,
    identifier,
    columns,
    includeEmailColumn = false
  ) {
    const messageIds = manager.cache.messageIds.get(
      manager.getCacheKey(identifier)
    );

    if (!messageIds?.length) {
      showCustomModal("No emails found.");
      return;
    }

    const token = await getAuthToken(true);
    const dataPayload = await manager.fetchEmailDetails(
      token,
      messageIds,
      columns
    );

    if (dataPayload) {
      if (includeEmailColumn) {
        dataPayload.dataItems = dataPayload.dataItems.map((item) => ({
          ...item,
          email: identifier,
        }));
      }
      openDataWindow("../popup/list-page/listPage.html", dataPayload);
    }
  }

  // Handle user login and language detection
  async handleLogin() {
    await this.safeOperation(async () => {
      const token = await getAuthToken(true);
      this.authToken = token;

      const existingLanguages = await SecureStorage.get("userLanguages");
      if (!existingLanguages) {
        const languageDetector = new LanguageDetector();
        await languageDetector.detectAndSaveUserLanguages(token);
      }

      await SecureStorage.set("authData", {
        loggedIn: true,
        token,
        timestamp: Date.now(),
      });

      await this.initUserDetails();
      showWindow("mainWindow");
    }, "Login failed. Please try again.");
  }

  // Handle user logout and state cleanup
  async handleLogout() {
    try {
      if (this.authToken) {
        await logout(this.authToken);
      }
      await SecureStorage.clear();
      this.authToken = null;
      showCustomModal("Logged out successfully.");
      showWindow("loginWindow");
    } catch (error) {
      logError(error);
      await SecureStorage.clear();
      this.authToken = null;
      showWindow("loginWindow");
    }
  }

  // Initialize welcome message with user email
  async initUserDetails() {
    const userInfo = await getUserInfo();
    const message = document.getElementById("welcomeMessage");
    if (message && userInfo?.email) {
      const sanitizedEmail = sanitizeEmailAddress(userInfo.email);
      message.textContent = sanitizedEmail
        ? `Welcome, ${sanitizedEmail}`
        : "Welcome, User";
    }
  }

  /* -------------------
    Feature Handlers
     -------------------
*/

  // Set up label deletion feature handlers
  initDeleteByLabel() {
    document.getElementById("byLabel")?.addEventListener("click", async () => {
      await this.safeOperation(async () => {
        const token = await getAuthToken(true);
        const labels = await this.labelManager.fetchLabels(token);
        this.labelManager.displayItems(labels);
        showWindow("byLabelWindow");
      });
    });

    document
      .getElementById("deleteByLabel")
      ?.addEventListener("click", async () => {
        const labelSelect = this.validateSelection(
          "labelSelect",
          "Please select a label first."
        );
        if (!labelSelect) return;

        await this.safeOperation(async () => {
          const token = await getAuthToken(false);
          await this.labelManager.batchDelete(token, labelSelect.value);
        });
      });
  }

  // Set up sender-based email management handlers
  initDeleteBySender() {
    document.getElementById("bySender")?.addEventListener("click", () => {
      showWindow("bySenderWindow");
    });

    document
      .getElementById("searchSender")
      ?.addEventListener("click", async () => {
        const searchTerm = document
          .getElementById("searchInput")
          ?.value?.trim();
        if (!searchTerm) {
          showCustomModal("Please enter a search term.");
          return;
        }

        await this.safeOperation(async () => {
          const token = await getAuthToken(true);
          const senders = await this.senderManager.fetchBySearch(
            token,
            searchTerm
          );
          this.senderManager.displayItems(senders);
        });
      });

    document
      .getElementById("viewEmails")
      ?.addEventListener("click", async () => {
        const senderSelect = this.validateSelection(
          "senderSelect",
          "Please select a sender first."
        );
        if (!senderSelect) return;

        await this.safeOperation(async () => {
          await this.handleViewEmails(this.senderManager, senderSelect.value, [
            { label: "Subject", key: "subject" },
            { label: "Date", key: "date" },
            { label: "Time", key: "time" },
          ]);
        }, "Error fetching email details.");
      });

    document
      .getElementById("deleteBySender")
      ?.addEventListener("click", async () => {
        const senderSelect = this.validateSelection(
          "senderSelect",
          "Please select a sender first."
        );
        if (!senderSelect) return;

        await this.safeOperation(async () => {
          const token = await getAuthToken(false);
          await this.senderManager.batchDelete(token, senderSelect.value);
        });
      });
  }

  // Set up subscription management handlers
  initSubscriptions() {
    document.getElementById("subscriptions")?.addEventListener("click", () => {
      this.subscriptionManager.populateYearOptions();
      showWindow("subsWindow");
    });

    document
      .getElementById("fetchSubscriptions")
      ?.addEventListener("click", async () => {
        const yearSelect = this.validateSelection(
          "yearSelect",
          "Please select a year first."
        );
        if (!yearSelect) return;

        await this.safeOperation(async () => {
          const token = await getAuthToken(true);
          const subscriptions = await this.subscriptionManager.fetchByYear(
            token,
            yearSelect.value
          );
          this.subscriptionManager.displayItems(subscriptions);
        });
      });

    document
      .getElementById("viewSubscriptionEmails")
      ?.addEventListener("click", async () => {
        const subSelect = this.validateSelection(
          "subscriptionSelect",
          "Please select a subscription first."
        );
        if (!subSelect) return;

        await this.safeOperation(async () => {
          await this.handleViewEmails(
            this.subscriptionManager,
            subSelect.value,
            [
              { label: "Email Address", key: "email" },
              { label: "Subject", key: "subject" },
              { label: "Date", key: "date" },
              { label: "Time", key: "time" },
            ],
            true
          );
        }, "Error fetching subscription details.");
      });

    document
      .getElementById("unsubscribeButton")
      ?.addEventListener("click", () => {
        const subSelect = this.validateSelection(
          "subscriptionSelect",
          "Please select a subscription first."
        );
        if (!subSelect) return;

        const subscription = this.subscriptionManager.cache.items.get(
          subSelect.value
        );
        if (subscription?.unsubscribeLink) {
          chrome.windows.create(
            {
              url: subscription.unsubscribeLink,
              type: "popup",
              width: 800,
              height: 600,
            },
            () => {
              this.subscriptionManager.markAsUnsubscribed(subSelect.value);
            }
          );
        } else {
          showCustomModal(
            "No valid unsubscribe link found for this subscription."
          );
        }
      });

    document
      .getElementById("deleteSubscription")
      ?.addEventListener("click", async () => {
        const subSelect = this.validateSelection(
          "subscriptionSelect",
          "Please select a subscription first."
        );
        if (!subSelect) return;

        await this.safeOperation(async () => {
          const token = await getAuthToken(false);
          await this.subscriptionManager.batchDelete(token, subSelect.value);
        });
      });
  }

  // Initialize popup state based on auth status
  async initPopup() {
    try {
      const storageData = await SecureStorage.get("authData");
      if (!storageData?.loggedIn) {
        showWindow("loginWindow");
        return;
      }

      await this.safeOperation(async () => {
        const token = await getAuthToken(false);
        this.authToken = token;
        await this.initUserDetails();
        showWindow("mainWindow");
      });
    } catch (error) {
      logError(error);
      showWindow("loginWindow");
    }
  }
}

new PopupManager();
