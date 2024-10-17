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
    "byLabelWindow",
    "bySenderWindow",
    "subsWindow",
  ];
  windows.forEach((window) => {
    const element = document.getElementById(window);
    element.classList.toggle("hidden", window !== windowToShow);
  });
}

// Handle delete by label flow
function deleteByLabelHandler() {
  document.getElementById("byLabel").addEventListener("click", () => {
    loadingSpinner(true);
    fetchToken(true, (token) => {
      fetchLabels(token, () => {
        loadingSpinner(false);
        showWindow("byLabelWindow");
      });
    });
  });

  document.getElementById("deleteByLabel").addEventListener("click", () => {
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
  document.getElementById("bySender").addEventListener("click", () => {
    showWindow("bySenderWindow");
  });

  document.getElementById("searchSender").addEventListener("click", () => {
    const searchTerm = document.getElementById("searchInput").value.trim();

    if (!searchTerm) {
      showCustomModal("Please enter a search term.");
      return;
    }

    loadingSpinner(true);
    fetchToken(true, (token) => {
      clearPreviousEmailList();
      fetchEmailsBySearch(token, searchTerm, (senders) => {
        loadingSpinner(false);
        displaySendersEmailCounts(token, senders);
      });
    });
  });

  document.getElementById("deleteBySender").addEventListener("click", () => {
    fetchToken(false, (token) => {
      batchDeleteSender(token, document.getElementById("senderSelect").value);
    });
  });
}

function subscriptionHandler() {
  document.getElementById("subscriptions").addEventListener("click", () => {
    loadingSpinner(true); // Show the loading spinner while fetching
    fetchToken(true, (token) => {
      subscriptionCache.emails = []; // Reset cache before fetching
      subscriptionCache.emailCount = 0; // Reset count
      fetchAllSubscriptions(token, () => {
        loadingSpinner(false); // Hide the spinner when done fetching
        showWindow("subsWindow"); // Show the subscription window
        // Display the count of unique email addresses
        alert(
          `Found ${subscriptionCache.emailCount} unique subscription email addresses.`
        );
      });
    });
  });

  // When the 'Unsubscribe' button is clicked
  document.getElementById("unsubButton").addEventListener("click", () => {
    const subSelect = document.getElementById("subSelect");
    const selectedEmail = subSelect.value; // Get the selected email address
    fetchToken(false, (token) => {
      unsubscribeFromEmail(token, selectedEmail); // Perform unsubscribe action
    });
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
function initializePopup() {
  document.addEventListener("DOMContentLoaded", () => {
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
  });

  initializeButtonsHandler();
  deleteByLabelHandler();
  deleteBySenderHandler();
  subscriptionHandler();
}

initializePopup();
