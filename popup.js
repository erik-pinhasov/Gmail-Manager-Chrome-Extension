// Utility: Show/hide the loading spinner with the overlay
function toggleLoadingSpinner(show) {
  const overlay = document.getElementById("loadingOverlay");
  if (show) {
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
}

// Utility: Fetch OAuth token
function fetchToken(interactive, callback) {
  getAuthToken(interactive, (token) => {
    if (token) {
      callback(token);
    } else {
      console.error("Error fetching token");
    }
  });
}

// Utility: Show a specific window and hide others
function showWindow(windowToShow) {
  const windows = [
    "mainMenu",
    "batchDeleteWindow",
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

// Handle batch delete flow
function initializeBatchDeleteHandler() {
  // When the "Batch Delete" button is clicked
  document.getElementById("batchDelete").addEventListener("click", () => {
    toggleLoadingSpinner(true); // Show the spinner only for fetching labels
    fetchToken(true, (token) => {
      fetchAndDisplayLabels(token, () => {
        toggleLoadingSpinner(false); // Hide spinner once fetching is done
        showWindow("batchDeleteWindow"); // Show the window after fetching
      });
    });
  });

  // Handle batch deletion after label is selected
  document.getElementById("deleteSelected").addEventListener("click", () => {
    const labelSelect = document.getElementById("labelSelect");
    const selectedLabelId = labelSelect.value;
    const selectedLabelName =
      labelSelect.options[labelSelect.selectedIndex].text;

    fetchToken(false, (token) => {
      batchDeleteEmails(token, selectedLabelId, selectedLabelName);
    });
  });
}

// Initialize UI Handlers for buttons that require fetching data
function initializeMainActionHandlers() {
  // Handle Delete by Sender button
  document.getElementById("deleteBySender").addEventListener("click", () => {
    // No fetching needed here, just show the window
    showWindow("deleteBySenderWindow");
  });

  // Handle Manage Subscriptions button
  document.getElementById("subscriptions").addEventListener("click", () => {
    // No fetching needed here, just show the window
    showWindow("subscriptionsWindow");
  });
}

// Initialize back button handlers
function initializeBackButtonHandlers() {
  document
    .getElementById("backToMenu")
    .addEventListener("click", () => showWindow("mainMenu"));
  document
    .getElementById("backToMenuFromSender")
    .addEventListener("click", () => showWindow("mainMenu"));
  document
    .getElementById("backToMenuFromSubscriptions")
    .addEventListener("click", () => showWindow("mainMenu"));
}

// Initialize the popup
function initializePopup() {
  initializeUserDetails();
  initializeBatchDeleteHandler(); // Handle batch delete flow
  initializeMainActionHandlers(); // Handle other main actions
  initializeBackButtonHandlers(); // Handle back buttons
}

// Run the initialization when the popup loads
initializePopup();
