import { deleteEmails } from "./api.js";

// Display modal dialog with optional confirmation
export function showCustomModal(message, callback = null, isConfirm = false) {
  const modal = document.getElementById("customModal");
  const modalContent = document.querySelector(".modalContent");
  const modalMessage = document.getElementById("modalMessage");

  if (!modal || !modalContent || !modalMessage) return;

  modalContent.innerHTML = "";
  modalMessage.textContent = message;
  modalContent.appendChild(modalMessage);

  const okButton = document.createElement("button");
  okButton.textContent = isConfirm ? "Confirm" : "OK";
  okButton.onclick = () => {
    modal.style.display = "none";
    if (callback) callback();
  };
  modalContent.appendChild(okButton);

  if (isConfirm) {
    const cancelButton = document.createElement("button");
    cancelButton.textContent = "Cancel";
    cancelButton.onclick = () => {
      modal.style.display = "none";
    };
    modalContent.appendChild(cancelButton);
  }

  modal.style.display = "flex";
}

// Format date as DD/MM/YY
export function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
}

// Format time as HH:MM
export function formatTime(time) {
  return `${String(time.getHours()).padStart(2, "0")}:${String(
    time.getMinutes()
  ).padStart(2, "0")}`;
}

// Create Gmail API URL with query parameters
export function createGmailUrl(query, pageToken) {
  const baseUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}`;
  return pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
}

// Toggle loading spinner visibility
export function loadingSpinner(show) {
  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.toggle("hidden", !show);
}

// Switch between different windows/views
export function showWindow(windowToShow) {
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

// Extract value from email headers
export function getHeaderValue(headers, headerName) {
  const header = headers.find((h) => h.name === headerName);
  return header ? header.value : null;
}

// Extract email address from From header
export function extractEmailAddress(fromHeader) {
  const emailRegex = /<([^>]+)>/;
  const match = fromHeader.match(emailRegex);
  return match ? match[1].trim() : fromHeader.trim();
}

// Handle email deletion with confirmation
export function confirmDeletion(token, messageIds, itemName, callback = null) {
  showCustomModal(
    `Delete all emails from "${itemName}"?`,
    async () => {
      try {
        loadingSpinner(true);
        const success = await deleteEmails(token, messageIds);
        loadingSpinner(false);
        if (success) {
          showCustomModal(`${itemName} deleted successfully!`);
          if (callback) callback(true);
        } else {
          if (callback) callback(false);
        }
      } catch (error) {
        loadingSpinner(false);
        logError(error);
        showCustomModal(`Error deleting emails: ${error.message}`);
        if (callback) callback(false);
      }
    },
    true
  );
}

// Open and populate emails list window
export function openDataWindow(url, dataPayload) {
  const listWindow = window.open(url, "Emails List", `width=1000,height=800`);

  // Send data to new window with retry
  const sendData = () => {
    if (listWindow && !listWindow.closed) {
      listWindow.postMessage(dataPayload, "*");
      clearInterval(checkInterval);
    }
  };

  listWindow.addEventListener("load", sendData);
  const checkInterval = setInterval(sendData, 100);
}

// Enhanced error logging with stack trace
export function logError(error, ...params) {
  try {
    const stack = new Error().stack;
    const callerLine = stack.split("\n")[2];
    const functionName =
      callerLine.match(/at (\w+)/)?.[1] || "Unknown Function";

    const paramString =
      params.length > 0 ? `, Parameters: ${JSON.stringify(params)}` : "";

    console.error(`Error in ${functionName}${paramString}:`, error);
  } catch (errorInLogger) {
    console.error("Error:", error);
  }
}
