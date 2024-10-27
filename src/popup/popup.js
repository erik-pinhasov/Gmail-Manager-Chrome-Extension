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

class PopupManager {
  constructor() {
    this.senderManager = new SenderManager();
    this.labelManager = new LabelManager();
    this.subscriptionManager = new SubscriptionManager();

    this.initEventListeners();
  }

  async initEventListeners() {
    document.addEventListener("DOMContentLoaded", () => this.initPopup());
    this.initAuthButtons();
    this.initFeatureHandlers();
    this.initBackButtons();
  }

  initAuthButtons() {
    document
      .getElementById("loginButton")
      ?.addEventListener("click", () => this.handleLogin());
    document
      .getElementById("logoutButton")
      ?.addEventListener("click", () => this.handleLogout());
  }

  initFeatureHandlers() {
    this.initDeleteByLabel();
    this.initDeleteBySender();
    this.initSubscriptions();
  }

  initBackButtons() {
    document.querySelectorAll("#backToMenu").forEach((button) => {
      button.addEventListener("click", () => location.reload());
    });
  }

  async handleLogin() {
    try {
      const token = await getAuthToken(true);
      this.authToken = token;

      // Detect languages during first login
      const existingLanguages = await SecureStorage.get("userLanguages");
      if (!existingLanguages) {
        loadingSpinner(true);
        const languageDetector = new LanguageDetector();
        await languageDetector.detectAndSaveUserLanguages(token);
        loadingSpinner(false);
      }

      await SecureStorage.set("authData", {
        loggedIn: true,
        token,
        timestamp: Date.now(),
      });

      await this.initUserDetails();
      showWindow("mainWindow");
    } catch (error) {
      logError(error);
      showCustomModal("Login failed. Please try again.");
    }
  }

  async handleLogout() {
    try {
      if (!this.authToken) {
        await SecureStorage.clear();
        showWindow("loginWindow");
        return;
      }

      await logout(this.authToken);
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

  initDeleteByLabel() {
    document.getElementById("byLabel")?.addEventListener("click", async () => {
      try {
        loadingSpinner(true);
        const token = await getAuthToken(true);
        const labels = await this.labelManager.fetchLabels(token);
        this.labelManager.displayItems(labels);
        loadingSpinner(false);
        showWindow("byLabelWindow");
      } catch (error) {
        loadingSpinner(false);
        showCustomModal(error.message);
      }
    });

    document
      .getElementById("deleteByLabel")
      ?.addEventListener("click", async () => {
        const labelSelect = document.getElementById("labelSelect");
        if (!labelSelect?.value) {
          showCustomModal("Please select a label first.");
          return;
        }

        try {
          const token = await getAuthToken(false);
          await this.labelManager.batchDelete(token, labelSelect.value);
        } catch (error) {
          showCustomModal(error.message);
        }
      });
  }

  initDeleteBySender() {
    document.getElementById("bySender")?.addEventListener("click", () => {
      showWindow("bySenderWindow");
    });

    // Search handler
    document
      .getElementById("searchSender")
      ?.addEventListener("click", async () => {
        const searchInput = document.getElementById("searchInput");
        const searchTerm = searchInput?.value?.trim();

        if (!searchTerm) {
          showCustomModal("Please enter a search term.");
          return;
        }

        try {
          loadingSpinner(true);
          const token = await getAuthToken(true);
          const senders = await this.senderManager.fetchBySearch(
            token,
            searchTerm
          );
          this.senderManager.displayItems(senders);
          loadingSpinner(false);
        } catch (error) {
          loadingSpinner(false);
          showCustomModal(error.message);
        }
      });

    // View emails handler
    document
      .getElementById("viewEmails")
      ?.addEventListener("click", async () => {
        const senderSelect = document.getElementById("senderSelect");
        if (!senderSelect?.value) {
          showCustomModal("Please select a sender first.");
          return;
        }

        try {
          loadingSpinner(true);
          const token = await getAuthToken(true);
          const messageIds = this.senderManager.cache.messageIds.get(
            this.senderManager.getCacheKey(senderSelect.value)
          );

          if (!messageIds?.length) {
            showCustomModal("No emails found for this sender.");
            loadingSpinner(false);
            return;
          }

          const dataPayload = await this.senderManager.fetchEmailDetails(
            token,
            messageIds,
            [
              { label: "Subject", key: "subject" },
              { label: "Date", key: "date" },
              { label: "Time", key: "time" },
            ]
          );

          if (dataPayload) {
            openDataWindow("../popup/list-page/listPage.html", dataPayload);
          }
          loadingSpinner(false);
        } catch (error) {
          loadingSpinner(false);
          showCustomModal("Error fetching email details.");
        }
      });

    // Delete sender handler
    document
      .getElementById("deleteBySender")
      ?.addEventListener("click", async () => {
        const senderSelect = document.getElementById("senderSelect");
        if (!senderSelect?.value) {
          showCustomModal("Please select a sender first.");
          return;
        }

        try {
          const token = await getAuthToken(false);
          await this.senderManager.batchDelete(token, senderSelect.value);
        } catch (error) {
          showCustomModal(error.message);
        }
      });
  }

  initSubscriptions() {
    const populateYearOptions = () => {
      const yearSelect = document.getElementById("yearSelect");
      if (!yearSelect) return;

      const currentYear = new Date().getFullYear();
      yearSelect.innerHTML = "";

      for (let year = currentYear; year >= 2004; year--) {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
      }
    };

    document.getElementById("subscriptions")?.addEventListener("click", () => {
      populateYearOptions();
      showWindow("subsWindow");
    });

    document
      .getElementById("fetchSubscriptions")
      ?.addEventListener("click", async () => {
        const yearSelect = document.getElementById("yearSelect");
        if (!yearSelect?.value) {
          showCustomModal("Please select a year first.");
          return;
        }

        try {
          loadingSpinner(true);
          const token = await getAuthToken(true);
          const subscriptions = await this.subscriptionManager.fetchByYear(
            token,
            yearSelect.value
          );
          this.subscriptionManager.displayItems(subscriptions);
          loadingSpinner(false);
        } catch (error) {
          loadingSpinner(false);
          showCustomModal(error.message);
        }
      });

    // View subscription emails handler
    document
      .getElementById("viewSubscriptionEmails")
      ?.addEventListener("click", async () => {
        const subSelect = document.getElementById("subscriptionSelect");
        if (!subSelect?.value) {
          showCustomModal("Please select a subscription first.");
          return;
        }

        try {
          loadingSpinner(true);
          const token = await getAuthToken(true);
          const messageIds = this.subscriptionManager.cache.messageIds.get(
            this.subscriptionManager.getCacheKey(subSelect.value)
          );

          if (!messageIds?.length) {
            showCustomModal("No emails found for this subscription.");
            loadingSpinner(false);
            return;
          }

          const dataPayload = await this.subscriptionManager.fetchEmailDetails(
            token,
            messageIds,
            [
              { label: "Email Address", key: "email" },
              { label: "Subject", key: "subject" },
              { label: "Date", key: "date" },
              { label: "Time", key: "time" },
            ]
          );

          if (dataPayload) {
            dataPayload.dataItems = dataPayload.dataItems.map((item) => ({
              ...item,
              email: subSelect.value,
            }));

            openDataWindow("../popup/list-page/listPage.html", dataPayload);
          } else {
            throw new Error("No data payload created");
          }
          loadingSpinner(false);
        } catch (error) {
          console.error("Error details:", error);
          loadingSpinner(false);
          showCustomModal("Error fetching subscription details.");
        }
      });

    // Unsubscribe handler
    document
      .getElementById("unsubscribeButton")
      ?.addEventListener("click", () => {
        const subSelect = document.getElementById("subscriptionSelect");
        if (!subSelect?.value) {
          showCustomModal("Please select a subscription first.");
          return;
        }

        const subscription = this.subscriptionManager.cache.items.get(
          subSelect.value
        );
        if (subscription?.unsubscribeLink) {
          // Use chrome.windows.create instead of window.open
          chrome.windows.create(
            {
              url: subscription.unsubscribeLink,
              type: "popup",
              width: 800,
              height: 600,
            },
            () => {
              // Mark as unsubscribed after opening the window
              this.subscriptionManager.markAsUnsubscribed(subSelect.value);
            }
          );
        } else {
          showCustomModal(
            "No valid unsubscribe link found for this subscription."
          );
        }
      });

    // Delete subscription handler
    document
      .getElementById("deleteSubscription")
      ?.addEventListener("click", async () => {
        const subSelect = document.getElementById("subscriptionSelect");
        if (!subSelect?.value) {
          showCustomModal("Please select a subscription first.");
          return;
        }

        try {
          const token = await getAuthToken(false);
          await this.subscriptionManager.batchDelete(token, subSelect.value);
        } catch (error) {
          showCustomModal(error.message);
        }
      });
  }

  async initPopup() {
    try {
      const storageData = await SecureStorage.get("authData");

      if (!storageData?.loggedIn) {
        showWindow("loginWindow");
        return;
      }

      try {
        const token = await getAuthToken(false);
        this.authToken = token;
        await this.initUserDetails();
        showWindow("mainWindow");
      } catch (error) {
        logError(error);
        await SecureStorage.clear();
        showWindow("loginWindow");
      }
    } catch (error) {
      logError(error);
      showWindow("loginWindow");
    }
  }
}

new PopupManager();
