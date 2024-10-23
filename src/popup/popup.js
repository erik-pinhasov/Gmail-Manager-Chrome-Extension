import { showCustomModal, loadingSpinner, showWindow } from "../utils/utils.js";
import { fetchLabels, batchDeleteLabel } from "../actions/deleteByLabel.js";
import {
  fetchEmailsBySearch,
  batchDeleteSender,
  displaySendersEmailCounts,
  fetchEmailsForSender,
} from "../actions/deleteBySender.js";
import {
  handleFetchSubscriptionsByYear,
  populateYearOptions,
} from "../actions/manageSubscriptions.js";
import {
  getAuthToken,
  setStorageData,
  getUserInfo,
  logout,
} from "../utils/api.js";

class PopupManager {
  constructor() {
    this.initializeEventListeners();
  }

  async initializeEventListeners() {
    document.addEventListener("DOMContentLoaded", () => this.initializePopup());
    this.initializeAuthButtons();
    this.initializeFeatureHandlers();
    this.initializeBackButtons();
  }

  initializeAuthButtons() {
    document
      .getElementById("loginButton")
      ?.addEventListener("click", () => this.handleLogin());
    document
      .getElementById("logoutButton")
      ?.addEventListener("click", () => this.handleLogout());
  }

  initializeFeatureHandlers() {
    this.initializeDeleteByLabel();
    this.initializeDeleteBySender();
    this.initializeSubscriptions();
  }

  initializeBackButtons() {
    document.querySelectorAll("#backToMenu").forEach((button) => {
      button.addEventListener("click", () => location.reload());
    });
  }

  // Auth handlers
  async handleLogin() {
    try {
      const token = await getAuthToken(true);
      await setStorageData({ loggedIn: true, token });
      await this.initUserDetails();
      showWindow("mainWindow");
    } catch (error) {
      console.error("Login error:", error);
      showCustomModal("Login failed. Please try again.");
    }
  }

  async handleLogout() {
    try {
      const token = await getAuthToken(false);
      if (!token) {
        showWindow("loginWindow");
        return;
      }

      await logout(token);
      showCustomModal("Logged out successfully.");
      showWindow("loginWindow");
    } catch (error) {
      console.error("Logout error:", error);
      showWindow("loginWindow");
    }
  }

  async initUserDetails() {
    const userInfo = await getUserInfo();
    const message = document.getElementById("welcomeMessage");
    if (message) {
      message.textContent = userInfo.email
        ? `Welcome, ${userInfo.email}`
        : "Welcome, User";
    }
  }

  // Feature handlers
  initializeDeleteByLabel() {
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

  initializeDeleteBySender() {
    document.getElementById("bySender")?.addEventListener("click", () => {
      showWindow("bySenderWindow");
    });

    this.initializeSearchHandler();
    this.initializeViewEmailsHandler();
    this.initializeDeleteSenderHandler();
  }

  initializeSearchHandler() {
    document
      .getElementById("searchSender")
      ?.addEventListener("click", async () => {
        const searchInput = document.getElementById("searchInput");
        const searchTerm = searchInput?.value.trim();

        if (!searchTerm) {
          showCustomModal("Please enter a search term.");
          return;
        }

        try {
          loadingSpinner(true);
          const token = await getAuthToken(true);
          const senders = await fetchEmailsBySearch(token, searchTerm);
          loadingSpinner(false);
          displaySendersEmailCounts(senders);
        } catch (error) {
          loadingSpinner(false);
          showCustomModal(error.message);
        }
      });
  }

  initializeViewEmailsHandler() {
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
          await fetchEmailsForSender(token, selectedSender);
          loadingSpinner(false);
        } catch (error) {
          loadingSpinner(false);
          showCustomModal("Error fetching email details.");
          console.error("Error viewing emails:", error);
        }
      });
  }

  initializeDeleteSenderHandler() {
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

  initializeSubscriptions() {
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

  async initializePopup() {
    try {
      const data = await chrome.storage.local.get(["loggedIn", "token"]);
      if (data.loggedIn && data.token) {
        const token = await getAuthToken(false);
        if (token) {
          await this.initUserDetails();
          showWindow("mainWindow");
        } else {
          showWindow("loginWindow");
        }
      } else {
        showWindow("loginWindow");
      }
    } catch (error) {
      console.error("Error initializing popup:", error);
      showWindow("loginWindow");
    }
  }
}

// Initialize the popup
new PopupManager();
