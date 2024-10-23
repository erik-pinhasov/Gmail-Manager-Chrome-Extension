// utils.js

export function showCustomModal(message, callback = null, isConfirm = false) {
  const modal = document.getElementById("customModal");
  const modalContent = document.querySelector(".modalContent");
  const modalMessage = document.getElementById("modalMessage");

  if (!modal || !modalContent || !modalMessage) {
    console.error("Modal elements not found");
    return;
  }

  // Clear existing content
  modalContent.innerHTML = "";

  // Add message
  modalMessage.textContent = message;
  modalContent.appendChild(modalMessage);

  // Create and add OK button
  const okButton = document.createElement("button");
  okButton.textContent = isConfirm ? "Confirm" : "OK";
  okButton.onclick = () => {
    modal.style.display = "none";
    if (callback) callback();
  };
  modalContent.appendChild(okButton);

  // If it's a confirm dialog, add Cancel button
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

export async function fetchWithRetries(url, token, retries = 5, delay = 500) {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 429 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetries(url, token, retries - 1, delay * 1.5);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetries(url, token, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

export function createGmailApiUrl(query, pageToken) {
  const baseUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(
    query
  )}`;
  return pageToken ? `${baseUrl}&pageToken=${pageToken}` : baseUrl;
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
