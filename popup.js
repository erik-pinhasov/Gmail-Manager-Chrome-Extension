// Login with Google OAuth2
function login() {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      showCustomModal("Login failed. Please try again.");
    } else {
      chrome.storage.local.set({ loggedIn: true, token: token }, () => {
        initUserDetails();
        showWindow("mainWindow");
      });
    }
  });
}

// Logout with Google OAuth2
function logout() {
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (!token) {
      console.error("No token found to remove.");
      showWindow("loginWindow");
      return;
    }

    fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
      .then(() => chrome.identity.removeCachedAuthToken({ token }))
      .then(() => chrome.identity.clearAllCachedAuthTokens())
      .then(() => chrome.storage.local.set({ loggedIn: false, token: null }))
      .then(() => {
        showCustomModal("Logged out successfully.");
        showWindow("loginWindow");
      })
      .catch((error) => {
        console.error("Error during logout process:", error);
        showWindow("loginWindow");
      });
  });
}

// Show user email address in main window
function initUserDetails() {
  chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (userInfo) => {
    const message = document.getElementById("welcomeMessage");
    if (userInfo.email) {
      message.textContent = `Welcome, ${userInfo.email}`;
    } else {
      message.textContent = "Welcome, User";
    }
  });
}

// Token handling
function fetchToken(interactive = true, callback) {
  chrome.runtime.sendMessage(
    { action: "getAuthToken", interactive: interactive },
    (response) => {
      if (response.token) {
        callback(response.token);
      } else {
        showCustomModal("Authorization failed. Please try again.");
      }
    }
  );
}

// Show/hide the loading spinner with the overlay
function loadingSpinner(show) {
  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.toggle("hidden", !show);
}

// Show UI window and hide others
function showWindow(windowToShow) {
  const windows = [
    "loginWindow",
    "mainWindow",
    "deleteByLabelWindow",
    "deleteBySenderWindow",
    "subscriptionsWindow",
  ];
  windows.forEach((window) => {
    const element = document.getElementById(window);
    element.classList.toggle("hidden", window !== windowToShow);
  });
}

// Handle delete by label flow
function deleteByLabelHandler() {
  document.getElementById("deleteByLabel").addEventListener("click", () => {
    loadingSpinner(true);
    fetchToken(true, (token) => {
      fetchLabels(token, () => {
        loadingSpinner(false);
        showWindow("deleteByLabelWindow");
      });
    });
  });

  document.getElementById("deleteSelected").addEventListener("click", () => {
    const labelSelect = document.getElementById("labelSelect");
    const selectedLabelId = labelSelect.value;
    const selectedLabel = labelSelect.options[labelSelect.selectedIndex].text;
    fetchToken(false, (token) => {
      batchDeleteLabel(token, selectedLabelId, selectedLabel);
    });
  });
}

// Handle delete by sender flow
function deleteBySenderHandler() {
  document.getElementById("deleteBySender").addEventListener("click", () => {
    showWindow("deleteBySenderWindow");
  });

  document
    .getElementById("searchSenderButton")
    .addEventListener("click", () => {
      const searchTerm = document
        .getElementById("searchSenderInput")
        .value.trim();

      if (!searchTerm) {
        showCustomModal("Please enter a search term.");
        return;
      }

      loadingSpinner(true);
      fetchToken(true, (token) => {
        clearPreviousEmailList();
        fetchEmailsBySearch(token, searchTerm, (senders) => {
          loadingSpinner(false);
          displaySendersWithEmailCounts(token, senders);
        });
      });
    });

  document
    .getElementById("deleteBySenderConfirm")
    .addEventListener("click", () => {
      fetchToken(false, (token) => {
        const senderSelect = document.getElementById("senderSelect");
        const selectedSender = senderSelect.value;
        batchDeleteSender(token, selectedSender);
      });
    });
}

// Initialize back button handlers
function initializeBackButtonHandlers() {
  document.querySelectorAll("#backToMenu").forEach((button) => {
    button.addEventListener("click", () => location.reload());
  });
}

// Initialize the popup
function initializePopup() {
  document.getElementById("loginButton").addEventListener("click", login);
  document.getElementById("logoutButton").addEventListener("click", logout);

  chrome.storage.local.get(["loggedIn", "token"], (data) => {
    if (data.loggedIn && data.token) {
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          initUserDetails();
          showWindow("mainWindow");
        } else {
          showWindow("loginWindow");
        }
      });
    } else {
      showWindow("loginWindow");
    }
  });

  initializeBackButtonHandlers();
  deleteByLabelHandler();
  deleteBySenderHandler();
}

initializePopup();
