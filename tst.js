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
    Utility Methods
     -------------------
*/

  // Handles token acquisition and error handling
  async getAuthTokenAndHandle(interactive = false) {
    try {
      const token = await getAuthToken(interactive);
      this.authToken = token;
    } catch (error) {
      logError(error);
      throw error;
    }
  }

  // Wraps operations with loading spinner and error handling
  async handleOperation(operation, errorMessage = "Operation failed") {
    try {
      loadingSpinner(true);
      await operation();
      loadingSpinner(false);
    } catch (error) {
      loadingSpinner(false);
      showCustomModal(errorMessage);
      logError(error);
    }
  }

  // Validates selection and returns element or false
  validateSelection(selectId, message = "Please make a selection first.") {
    const selectElement = document.getElementById(selectId);
    if (!selectElement?.value) {
      showCustomModal(message);
      return false;
    }
    return selectElement;
  }

  /* -------------------
    Common email operations
     -------------------
*/

  // Handles viewing emails for both senders and subscriptions
  async handleViewEmails(manager, selectId, columns) {
    const select = this.validateSelection(selectId);
    if (!select) return;

    await this.handleOperation(async () => {
      const token = await this.getAuthTokenAndHandle(true);
      const messageIds = manager.cache.messageIds.get(
        manager.getCacheKey(select.value)
      );

      if (!messageIds?.length) {
        showCustomModal("No emails found.");
        return;
      }

      const dataPayload = await manager.fetchEmailDetails(
        token,
        messageIds,
        columns
      );
      if (dataPayload) {
        // Add email address column for subscriptions
        if (manager === this.subscriptionManager) {
          dataPayload.dataItems = dataPayload.dataItems.map((item) => ({
            ...item,
            email: select.value,
          }));
        }
        openDataWindow("../popup/list-page/listPage.html", dataPayload);
      }
    }, "Error fetching email details.");
  }

  // Handles email deletion for both senders and subscriptions
  async handleDeleteEmails(manager, selectId) {
    const select = this.validateSelection(selectId);
    if (!select) return;

    await this.handleOperation(async () => {
      const token = await this.getAuthTokenAndHandle(false);
      await manager.batchDelete(token, select.value);
    });
  }

  /* -------------------
    Initialization Methods
     -------------------
*/

  // Sets up all event listeners on popup load
  async initEventListeners() {
    document.addEventListener("DOMContentLoaded", () => this.initPopup());
    this.initAuthButtons();
    this.initFeatureHandlers();
    this.initBackButtons();
  }

  // Initializes authentication-related buttons
  initAuthButtons() {
    document
      .getElementById("loginButton")
      ?.addEventListener("click", () => this.handleLogin());
    document
      .getElementById("logoutButton")
      ?.addEventListener("click", () => this.handleLogout());
  }

  // Initializes feature-specific handlers
  initFeatureHandlers() {
    this.initDeleteByLabel();
    this.initDeleteBySender();
    this.initSubscriptions();
  }

  // Sets up back button functionality
  initBackButtons() {
    document.querySelectorAll("#backToMenu").forEach((button) => {
      button.addEventListener("click", () => location.reload());
    });
  }

  /* -------------------
    Authentication Methods
     -------------------
*/

  // Handles user login and language detection
  async handleLogin() {
    await this.handleOperation(async () => {
      const token = await this.getAuthTokenAndHandle(true);

      // Detect languages on first login only
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

  // Handles user logout
  async handleLogout() {
    try {
      if (this.authToken) {
        await logout(this.authToken);
      }
      await this.clearAuthState();
    } catch (error) {
      logError(error);
      await this.clearAuthState();
    }
  }

  // Clears authentication state
  async clearAuthState() {
    await SecureStorage.clear();
    this.authToken = null;
    showWindow("loginWindow");
  }

  // Initializes user welcome message
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

  // Initializes label deletion functionality
  initDeleteByLabel() {
    document.getElementById("byLabel")?.addEventListener("click", async () => {
      await this.handleOperation(async () => {
        const token = await this.getAuthTokenAndHandle(true);
        const labels = await this.labelManager.fetchLabels(token);
        this.labelManager.displayItems(labels);
        showWindow("byLabelWindow");
      });
    });

    document
      .getElementById("deleteByLabel")
      ?.addEventListener("click", () =>
        this.handleDeleteEmails(this.labelManager, "labelSelect")
      );
  }

  // Initializes sender-based email management
  initDeleteBySender() {
    document.getElementById("bySender")?.addEventListener("click", () => {
      showWindow("bySenderWindow");
    });

    // Search functionality
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

        await this.handleOperation(async () => {
          const token = await this.getAuthTokenAndHandle(true);
          const senders = await this.senderManager.fetchBySearch(
            token,
            searchTerm
          );
          this.senderManager.displayItems(senders);
        });
      });

    // View and delete handlers
    document.getElementById("viewEmails")?.addEventListener("click", () =>
      this.handleViewEmails(this.senderManager, "senderSelect", [
        { label: "Subject", key: "subject" },
        { label: "Date", key: "date" },
        { label: "Time", key: "time" },
      ])
    );

    document
      .getElementById("deleteBySender")
      ?.addEventListener("click", () =>
        this.handleDeleteEmails(this.senderManager, "senderSelect")
      );
  }

  // Initializes subscription management
  initSubscriptions() {
    document.getElementById("subscriptions")?.addEventListener("click", () => {
      this.populateYearSelect();
      showWindow("subsWindow");
    });

    // Fetch subscriptions handler
    document
      .getElementById("fetchSubscriptions")
      ?.addEventListener("click", async () => {
        const yearSelect = this.validateSelection(
          "yearSelect",
          "Please select a year first."
        );
        if (!yearSelect) return;

        await this.handleOperation(async () => {
          const token = await this.getAuthTokenAndHandle(true);
          const subscriptions = await this.subscriptionManager.fetchByYear(
            token,
            yearSelect.value
          );
          this.subscriptionManager.displayItems(subscriptions);
        });
      });

    // View and delete handlers
    document
      .getElementById("viewSubscriptionEmails")
      ?.addEventListener("click", () =>
        this.handleViewEmails(this.subscriptionManager, "subscriptionSelect", [
          { label: "Email Address", key: "email" },
          { label: "Subject", key: "subject" },
          { label: "Date", key: "date" },
          { label: "Time", key: "time" },
        ])
      );

    document
      .getElementById("deleteSubscription")
      ?.addEventListener("click", () =>
        this.handleDeleteEmails(this.subscriptionManager, "subscriptionSelect")
      );

    // Unsubscribe handler
    document
      .getElementById("unsubscribeButton")
      ?.addEventListener("click", () => {
        const subSelect = this.validateSelection("subscriptionSelect");
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
  }

  // Populates year selection dropdown
  populateYearSelect() {
    const yearSelect = document.getElementById("yearSelect");
    if (!yearSelect) return;

    yearSelect.innerHTML = "";
    const currentYear = new Date().getFullYear();

    for (let year = currentYear; year >= 2004; year--) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }
  }

  // Main initialization
  async initPopup() {
    try {
      const storageData = await SecureStorage.get("authData");
      if (!storageData?.loggedIn) {
        showWindow("loginWindow");
        return;
      }

      await this.handleOperation(async () => {
        await this.getAuthTokenAndHandle(false);
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
