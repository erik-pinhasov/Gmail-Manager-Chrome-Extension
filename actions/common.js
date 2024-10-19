// Utility function to close the modal
function closeModal(modal, modalContent, cancelButton) {
  modal.style.display = "none";
  modalContent.removeChild(cancelButton);
}

// Function to show a custom modal (combined for Confirm and Alert)
function showCustomModal(message, callback, isConfirm = false) {
  const modal = document.getElementById("customModal");
  const modalButton = document.getElementById("modalButton");

  document.getElementById("modalMessage").textContent = message;
  modal.style.display = "flex";
  modalButton.onclick = null;

  if (isConfirm) {
    setupConfirmModal(modal, modalButton, callback);
  } else {
    setupAlertModal(modal, modalButton, callback);
  }
}

// Function to set up Alert modal
function setupAlertModal(modal, modalButton, callback) {
  modalButton.textContent = "OK";
  modalButton.onclick = () => {
    modal.style.display = "none";
    if (callback) callback();
  };
}

// Function to set up Confirm modal
function setupConfirmModal(modal, modalButton, callback) {
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  modalButton.textContent = "Confirm";
  const modalContent = document.querySelector(".modalContent");
  modalContent.appendChild(cancelButton);

  modalButton.onclick = () => {
    closeModal(modal, modalContent, cancelButton);
    callback();
  };

  cancelButton.onclick = () => {
    closeModal(modal, modalContent, cancelButton);
  };
}

// Helper function to confirm deletion
function confirmDeletion(token, messageIds, itemName) {
  showCustomModal(
    `Delete all emails from "${itemName}"?`,
    () => {
      deleteEmails(token, messageIds, () => {
        showCustomModal(`${itemName} deleted successfully!`, () => {
          location.reload();
        });
      });
    },
    true
  );
}

// Fetch total emails with optional query (e.g., by label or by sender)
function fetchEmails(token, labelId = "", query = "", callback, retries = 3) {
  let emailCount = 0;
  let emailIds = [];

  function fetchPage(pageToken = null) {
    const params = new URLSearchParams({
      maxResults: 500,
      q: query,
      ...(labelId && { labelIds: labelId }),
      ...(pageToken && { pageToken }),
    });

    // Fetch emails from Gmail API
    fetch(`https://www.googleapis.com/gmail/v1/users/me/messages?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) =>
        response.ok ? response.json() : Promise.reject("Fetch failed")
      )
      .then((data) => {
        if (data.messages) {
          emailCount += data.messages.length;
          emailIds.push(...data.messages.map((msg) => msg.id));
        }

        data.nextPageToken
          ? fetchPage(data.nextPageToken)
          : callback(emailCount, emailIds);
      })
      .catch((error) => {
        if (retries > 0) {
          setTimeout(
            () => fetchEmails(token, labelId, query, callback, retries - 1),
            500
          );
        } else {
          console.error("Failed to fetch emails:", error);
          callback(0, []);
        }
      });
  }

  fetchPage();
}

// Fetch email details with retry mechanism
function fetchEmailDetails(token, messageId, retries = 3) {
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?fields=payload.headers`;

  return fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then((response) => {
      if (!response.ok) throw new Error("Failed to fetch email details");
      return response.json();
    })
    .then((data) => data.payload || null)
    .catch((error) => {
      if (retries > 0) {
        console.warn(
          `Retrying fetch for message ID: ${messageId}... (${retries} attempts left)`
        );
        return new Promise((resolve) =>
          setTimeout(
            () => resolve(fetchEmailDetails(token, messageId, retries - 1)),
            500
          )
        );
      } else {
        console.error("Error fetching email details:", error);
        return null;
      }
    });
}

// Delete emails in batches
function deleteEmails(token, messageIds, callback) {
  const batchSize = 1000;
  const deleteInBatches = (ids) => {
    const batch = ids.slice(0, batchSize);
    const remaining = ids.slice(batchSize);

    fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/batchDelete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids: batch }),
    })
      .then(() => {
        if (remaining.length > 0) {
          deleteInBatches(remaining);
        } else {
          callback();
        }
      })
      .catch((error) => {
        showCustomModal("Error occurred while deleting emails.");
        console.error("Error deleting emails:", error);
      });
  };

  deleteInBatches(messageIds);
}

// Extract header value from email headers
function getHeaderValue(headers, headerName) {
  const header = headers.find((h) => h.name === headerName);
  return header ? header.value : null;
}
