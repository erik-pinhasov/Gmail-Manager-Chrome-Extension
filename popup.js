function login() {
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    if (chrome.runtime.lastError) {
      showCustomModal("Login failed. Please try again.");
    } else {
      chrome.storage.local.set({ loggedIn: true, token: token }, () => {
        initializeUserDetails(token);
        showWindow("mainWindow");
      });
    }
  });
}

function logout() {
  chrome.identity.getAuthToken({ interactive: false }, (token) => {
    if (token) {
      fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`)
        .then(() => {
          chrome.identity.removeCachedAuthToken({ token: token }, () => {
            if (chrome.runtime.lastError) {
              console.error(
                "Error removing token:",
                chrome.runtime.lastError.message
              );
            } else {
              chrome.identity.clearAllCachedAuthTokens(() => {
                chrome.storage.local.set(
                  { loggedIn: false, token: null },
                  () => {
                    showCustomModal("Logged out successfully.");
                    showWindow("loginWindow");
                  }
                );
              });
            }
          });
        })
        .catch((error) => {
          console.error("Error revoking token:", error);
          showWindow("loginWindow");
        });
    } else {
      console.error("No token found to remove.");
      showWindow("loginWindow");
    }
  });
}

function initializeUserDetails(token) {
  chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, (userInfo) => {
    if (userInfo.email) {
      document.getElementById(
        "welcomeMessage"
      ).textContent = `Welcome, ${userInfo.email}`;
    } else {
      document.getElementById("welcomeMessage").textContent = "Welcome, User";
    }
  });
}

// Token Handling
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
function toggleLoadingSpinner(show) {
  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.toggle("hidden", !show);
}

// UI windows
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
  if (windowToShow === "loginWindow") {
    document.body.style.height = "50%";
  } else {
    document.body.style.height = "100%";
  }
}

// Handle delete by label flow
function deleteByLabelHandler() {
  document.getElementById("deleteByLabel").addEventListener("click", () => {
    toggleLoadingSpinner(true);
    fetchToken(true, (token) => {
      fetchLabels(
        token,
        () => {
          toggleLoadingSpinner(false);
          showWindow("deleteByLabelWindow");
        },
        true
      );
    });
  });

  document.getElementById("deleteSelected").addEventListener("click", () => {
    const labelSelect = document.getElementById("labelSelect");
    const selectedLabelId = labelSelect.value;
    const selectedLabelName =
      labelSelect.options[labelSelect.selectedIndex].text;

    fetchToken(false, (token) => {
      batchDeleteLabel(token, selectedLabelId, selectedLabelName);
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

      toggleLoadingSpinner(true);
      fetchToken(true, (token) => {
        clearPreviousEmailList();
        fetchEmailsBySearch(token, searchTerm, (senders) => {
          toggleLoadingSpinner(false);
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
      console.log(data.token);
      chrome.identity.getAuthToken({ interactive: false }, (token) => {
        if (token) {
          initializeUserDetails(token);
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
