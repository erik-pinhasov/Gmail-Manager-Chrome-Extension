import { deleteEmails } from "./api.js";

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

export function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
}

export function formatTime(time) {
  return `${String(time.getHours()).padStart(2, "0")}:${String(
    time.getMinutes()
  ).padStart(2, "0")}`;
}

export function createGmailUrl(query, pageToken) {
  const baseUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}`;
  return pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
}

export function loadingSpinner(show) {
  const overlay = document.getElementById("loadingOverlay");
  overlay.classList.toggle("hidden", !show);
}

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

export function getHeaderValue(headers, headerName) {
  const header = headers.find((h) => h.name === headerName);
  return header ? header.value : null;
}

export function extractEmailAddress(fromHeader) {
  const emailRegex = /<([^>]+)>/;
  const match = fromHeader.match(emailRegex);
  return match ? match[1].trim() : fromHeader.trim();
}

export function confirmDeletion(token, messageIds, itemName) {
  showCustomModal(
    `Delete all emails from "${itemName}"?`,
    async () => {
      try {
        const success = await deleteEmails(token, messageIds);
        if (success) {
          showCustomModal(`${itemName} deleted successfully!`);
        }
      } catch (error) {
        logError(error);
        showCustomModal(`Error deleting emails: ${error.message}`);
      }
    },
    true
  );
}

export function openDataWindow(url, dataPayload) {
  const listWindow = window.open(url, "Emails List", `width=1000,height=800`);

  const sendData = () => {
    if (listWindow && !listWindow.closed) {
      listWindow.postMessage(dataPayload, "*");
      clearInterval(checkInterval);
    }
  };

  listWindow.addEventListener("load", sendData);
  const checkInterval = setInterval(sendData, 100);
}

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
