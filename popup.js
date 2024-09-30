// Show/hide the loading spinner with the overlay
function toggleLoadingSpinner(show) {
  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.toggle("hidden", !show);
}

// UI windows
function showWindow(windowToShow) {
  const windows = [
    "mainMenu",
    "deleteByLabelWindow",
    "deleteBySenderWindow",
    "subscriptionsWindow",
  ];
  windows.forEach((window) => {
    const element = document.getElementById(window);
    element.classList.toggle("hidden", window !== windowToShow);
  });
}

// Initialize user info display
function initializeUserDetails() {
  chrome.identity.getProfileUserInfo((userInfo) => {
    if (userInfo.email) {
      const welcomeMessage = document.getElementById("welcomeMessage");
      welcomeMessage.textContent = `Welcome, ${userInfo.email}`;
    }
  });
}

// Handle delete by label flow
function deleteByLabelHandler() {
  document.getElementById("deleteByLabel").addEventListener("click", () => {
    toggleLoadingSpinner(true);
    fetchToken(true, (token) => {
      fetchAndDisplayLabels(
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
        showCustomAlert("Please enter a search term.");
        return;
      }

      toggleLoadingSpinner(true);
      fetchToken(true, (token) => {
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
    button.addEventListener("click", () => showWindow("mainMenu"));
  });
}

// Initialize the popup
function initializePopup() {
  initializeUserDetails();
  initializeBackButtonHandlers();
  deleteByLabelHandler();
  deleteBySenderHandler();
}

initializePopup();
