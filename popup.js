import { showCustomModal, loadingSpinner, showWindow } from "./actions/util.js";
import { fetchLabels, batchDeleteLabel } from "./actions/deleteByLabel.js";
import {
  fetchEmailsBySearch,
  batchDeleteSender,
  displaySendersEmailCounts,
  fetchEmailsForSender,
} from "./actions/deleteBySender.js";
import {
  handleFetchSubscriptionsByYear,
  populateYearOptions,
} from "./actions/manageSubscriptions.js";

// Wrap all Chrome API calls in functions
function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

function setStorageData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

function getUserInfo() {
  return new Promise((resolve) => {
    chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, resolve);
  });
}

// Login function
async function login() {
  try {
    const token = await getAuthToken(true);
    await setStorageData({ loggedIn: true, token: token });
    await initUserDetails();
    showWindow("mainWindow");
  } catch (error) {
    showCustomModal("Login failed. Please try again.");
    console.error("Login error:", error);
  }
}

// Logout function
async function logout() {
  try {
    const token = await getAuthToken(false);
    if (!token) {
      console.error("No token found to remove.");
      showWindow("loginWindow");
      return;
    }

    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
    await new Promise((resolve) =>
      chrome.identity.removeCachedAuthToken({ token }, resolve)
    );
    await new Promise((resolve) =>
      chrome.identity.clearAllCachedAuthTokens(resolve)
    );
    await setStorageData({ loggedIn: false, token: null });

    showCustomModal("Logged out successfully.");
    showWindow("loginWindow");
  } catch (error) {
    console.error("Error during logout process:", error);
    showWindow("loginWindow");
  }
}

// Show user email address in main window
function initUserDetails() {
  chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (userInfo) => {
    const message = document.getElementById("welcomeMessage");
    message.textContent = userInfo.email
      ? `Welcome, ${userInfo.email}`
      : "Welcome, User";
  });
}

// Token handling
function fetchToken(interactive = true) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "getAuthToken", interactive: interactive },
      (response) => {
        if (response.token) {
          resolve(response.token);
        } else {
          reject(new Error("Authorization failed. Please try again."));
        }
      }
    );
  });
}

// Handle delete by label flow
function deleteByLabelHandler() {
  document.getElementById("byLabel").addEventListener("click", async () => {
    try {
      loadingSpinner(true);
      const token = await fetchToken(true);
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
    .addEventListener("click", async () => {
      const labelSelect = document.getElementById("labelSelect");
      const selectedLabelId = labelSelect.value;
      const selectedLabel = labelSelect.options[labelSelect.selectedIndex].text;
      try {
        const token = await fetchToken(false);
        await batchDeleteLabel(token, selectedLabelId, selectedLabel);
      } catch (error) {
        showCustomModal(error.message);
      }
    });
}

// Handle delete by sender flow
function deleteBySenderHandler() {
  document.getElementById("bySender").addEventListener("click", () => {
    showWindow("bySenderWindow");
  });

  document
    .getElementById("searchSender")
    .addEventListener("click", async () => {
      const searchTerm = document.getElementById("searchInput").value.trim();

      if (!searchTerm) {
        showCustomModal("Please enter a search term.");
        return;
      }

      try {
        loadingSpinner(true);
        const token = await fetchToken(true);
        const senders = await fetchEmailsBySearch(token, searchTerm);
        loadingSpinner(false);
        displaySendersEmailCounts(senders);
      } catch (error) {
        loadingSpinner(false);
        showCustomModal(error.message);
      }
    });

  document.getElementById("viewEmails").addEventListener("click", async () => {
    const selectedSender = document.getElementById("senderSelect").value;
    if (!selectedSender) {
      showCustomModal("Please select a sender first.");
      return;
    }

    try {
      loadingSpinner(true);
      const token = await fetchToken(true);
      await fetchEmailsForSender(token, selectedSender);
      loadingSpinner(false);
    } catch (error) {
      loadingSpinner(false);
      showCustomModal("Error fetching email details.");
      console.error("Error viewing emails:", error);
    }
  });

  document
    .getElementById("deleteBySender")
    .addEventListener("click", async () => {
      try {
        const token = await fetchToken(false);
        await batchDeleteSender(
          token,
          document.getElementById("senderSelect").value
        );
      } catch (error) {
        showCustomModal(error.message);
      }
    });
}

// Handle subscription flow
function subscriptionHandler() {
  document.getElementById("subscriptions").addEventListener("click", () => {
    populateYearOptions();
    showWindow("subsWindow");
  });

  document.getElementById("fetchByYear").addEventListener("click", async () => {
    const yearSelect = document.getElementById("yearSelect");
    const selectedYear = yearSelect.value;
    try {
      loadingSpinner(true);
      const token = await fetchToken(true);
      const dataPayload = await handleFetchSubscriptionsByYear(
        token,
        selectedYear
      );
      loadingSpinner(false);
      if (dataPayload.dataItems.length === 0) {
        showCustomModal("No subscriptions found for the selected year.");
      } else {
        openDataWindow("listPage.html", dataPayload);
      }
    } catch (error) {
      loadingSpinner(false);
      showCustomModal(error.message);
    }
  });
}

// Initialize back button handlers
function initializeButtonsHandler() {
  document.getElementById("loginButton").addEventListener("click", login);
  document.getElementById("logoutButton").addEventListener("click", logout);

  document.querySelectorAll("#backToMenu").forEach((button) => {
    button.addEventListener("click", () => location.reload());
  });
}

// Initialize the popup
async function initializePopup() {
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      const data = await chrome.storage.local.get(["loggedIn", "token"]);
      if (data.loggedIn && data.token) {
        const token = await new Promise((resolve) => {
          chrome.identity.getAuthToken({ interactive: false }, resolve);
        });
        if (token) {
          initUserDetails();
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
  });

  initializeButtonsHandler();
  deleteByLabelHandler();
  deleteBySenderHandler();
  subscriptionHandler();
}

initializePopup();
