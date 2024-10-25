import {
  showCustomModal,
  loadingSpinner,
  showWindow,
  logError,
} from "../utils/utils.js";
import { fetchLabels, batchDeleteLabel } from "../features/deleteByLabel.js";
import {
  fetchEmailsBySearch,
  batchDeleteSender,
  displayEmailsCounts,
  fetchSenderEmails,
} from "../features/deleteBySender.js";
import {
  handleFetchSubscriptionsByYear,
  populateYearOptions,
} from "../features/manageSubscriptions.js";
import { getAuthToken, getUserInfo, logout } from "../utils/api.js";
import { sanitizeInput, sanitizeEmailAddress } from "../utils/sanitization.js";
import { SecureStorage } from "../utils/storage.js";

class PopupManager {
  constructor() {
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
      const token = this.authToken;
      if (!token) {
        await SecureStorage.clear();
        showWindow("loginWindow");
        return;
      }

      try {
        await logout(token);
      } catch (error) {
        logError(error);
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

  async initUserDetails() {
    const userInfo = await getUserInfo();
    const message = document.getElementById("welcomeMessage");
    if (message) {
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
        await fetchLabels(token);
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
        try {
          const labelSelect = document.getElementById("labelSelect");
          if (!labelSelect) return;

          const token = await getAuthToken(false);
          await batchDeleteLabel(
            token,
            labelSelect.value,
            labelSelect.options[labelSelect.selectedIndex].text
          );
        } catch (error) {
          showCustomModal(error.message);
        }
      });
  }

  initDeleteBySender() {
    document.getElementById("bySender")?.addEventListener("click", () => {
      showWindow("bySenderWindow");
    });

    this.initSearchHandler();
    this.initViewEmailsHandler();
    this.initDeleteSenderHandler();
  }

  initSearchHandler() {
    document
      .getElementById("searchSender")
      ?.addEventListener("click", async () => {
        const searchInput = document.getElementById("searchInput");
        const searchTerm = sanitizeInput(searchInput?.value?.trim());

        if (!searchTerm) {
          showCustomModal("Please enter a valid search term.");
          return;
        }

        try {
          loadingSpinner(true);
          const token = await getAuthToken(true);
          const senders = await fetchEmailsBySearch(token, searchTerm);
          loadingSpinner(false);
          displayEmailsCounts(senders);
        } catch (error) {
          loadingSpinner(false);
          showCustomModal(error.message);
        }
      });
  }

  initViewEmailsHandler() {
    document
      .getElementById("viewEmails")
      ?.addEventListener("click", async () => {
        const senderSelect = document.getElementById("senderSelect");
        const selectedSender = senderSelect?.value;

        if (!selectedSender) {
          showCustomModal("Please select a sender first.");
          return;
        }

        try {
          loadingSpinner(true);
          const token = await getAuthToken(true);
          await fetchSenderEmails(token, selectedSender);
          loadingSpinner(false);
        } catch (error) {
          loadingSpinner(false);
          showCustomModal("Error fetching email details.");
          logError(error);
        }
      });
  }

  initDeleteSenderHandler() {
    document
      .getElementById("deleteBySender")
      ?.addEventListener("click", async () => {
        const senderSelect = document.getElementById("senderSelect");
        if (!senderSelect) return;

        try {
          const token = await getAuthToken(false);
          await batchDeleteSender(token, senderSelect.value);
        } catch (error) {
          showCustomModal(error.message);
        }
      });
  }

  initSubscriptions() {
    document.getElementById("subscriptions")?.addEventListener("click", () => {
      populateYearOptions();
      showWindow("subsWindow");
    });

    document
      .getElementById("fetchByYear")
      ?.addEventListener("click", async () => {
        const yearSelect = document.getElementById("yearSelect");
        if (!yearSelect) return;

        try {
          loadingSpinner(true);
          const token = await getAuthToken(true);
          const dataPayload = await handleFetchSubscriptionsByYear(
            token,
            yearSelect.value
          );
          loadingSpinner(false);

          if (!dataPayload.dataItems.length) {
            showCustomModal("No subscriptions found for the selected year.");
            return;
          }

          openDataWindow("listPage.html", dataPayload);
        } catch (error) {
          loadingSpinner(false);
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
