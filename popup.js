// Show/hide the loading spinner with the overlay
function showLoadingSpinner() {
  document.getElementById("loadingOverlay").classList.remove("hidden");
}

function hideLoadingSpinner() {
  document.getElementById("loadingOverlay").classList.add("hidden");
}

// Fetch OAuth token
function fetchToken(interactive, callback) {
  getAuthToken(interactive, (token) => {
    if (token) {
      callback(token);
    } else {
      console.error("Error fetching token");
    }
  });
}

// Show a specific window and hide others
function showWindow(windowToShow) {
  const windows = [
    "mainMenu",
    "batchDeleteWindow",
    "deleteBySenderWindow",
    "subscriptionsWindow",
  ];
  windows.forEach((window) => {
    const element = document.getElementById(window);
    if (window === windowToShow) {
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
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

// Handle the main logic for each button click
function initializeUIHandlers() {
  // Batch Delete button
  document.getElementById("batchDelete").addEventListener("click", () => {
    showLoadingSpinner();

    // Fetch token and fetch the data for the batch delete view
    fetchToken(true, (token) => {
      // Once token is fetched, show the window and fetch labels
      fetchAndDisplayLabels(token, () => {
        hideLoadingSpinner();
        showWindow("batchDeleteWindow");
      });
    });
  });

  // Handle batch deletion after label is selected
  document.getElementById("deleteSelected").addEventListener("click", () => {
    const labelSelect = document.getElementById("labelSelect");
    const selectedLabelId = labelSelect.value;
    const selectedLabelName =
      labelSelect.options[labelSelect.selectedIndex].text;

    showLoadingSpinner();
    fetchToken(false, (token) => {
      // Perform batch delete, and after it's done, hide spinner
      batchDeleteEmails(token, selectedLabelId, selectedLabelName, () => {
        hideLoadingSpinner();
      });
    });
  });

  // Delete by Sender button
  document.getElementById("deleteBySender").addEventListener("click", () => {
    showLoadingSpinner();
    fetchToken(true, (token) => {
      hideLoadingSpinner();
      showWindow("deleteBySenderWindow");
    });
  });

  // Handle delete by sender confirmation
  document
    .getElementById("deleteBySenderConfirm")
    .addEventListener("click", () => {
      showLoadingSpinner();
      fetchToken(true, (token) => {
        deleteEmailsBySender(token, () => {
          hideLoadingSpinner();
        });
      });
    });

  // Manage Subscriptions button
  document.getElementById("subscriptions").addEventListener("click", () => {
    showLoadingSpinner();
    fetchToken(true, (token) => {
      hideLoadingSpinner();
      showWindow("subscriptionsWindow");
    });
  });

  // Handle manage subscriptions confirmation
  document
    .getElementById("manageSubscriptionsConfirm")
    .addEventListener("click", () => {
      showLoadingSpinner();
      fetchToken(true, (token) => {
        manageSubscriptions(token, () => {
          hideLoadingSpinner();
        });
      });
    });

  // Back buttons for each window
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
  initializeUIHandlers();
}

// Run the initialization when the popup loads
initializePopup();
