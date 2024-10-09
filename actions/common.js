// Token Handling
function fetchToken(interactive = true, callback) {
  chrome.runtime.sendMessage(
    { action: "getAuthToken", interactive: interactive },
    (response) => {
      if (response.token) {
        callback(response.token);
      } else {
        alert("Authorization failed. Please try again.");
      }
    }
  );
}

// UI Modal (combined for Confirm and Alert)
function showCustomModal(message, callback, isConfirm = false) {
  const modal = document.getElementById("customModal");
  const modalMessage = document.getElementById("modalMessage");
  const modalButton = document.getElementById("modalButton");

  // Set up the modal content
  modalMessage.textContent = message;
  modal.style.display = "flex";
  modalButton.onclick = null;

  if (isConfirm) {
    setupConfirmModal(modal, modalButton, callback);
  } else {
    // Alert modal setup
    modalButton.textContent = "OK";
    modalButton.onclick = () => {
      modal.style.display = "none";
      if (callback) callback();
    };
  }
}

// Function to set up Confirm modal
function setupConfirmModal(modal, modalButton, callback) {
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  modalButton.textContent = "Confirm";
  const modalContent = document.querySelector(".modal-content");
  modalContent.appendChild(cancelButton);

  // Confirm action
  modalButton.onclick = () => {
    modal.style.display = "none";
    modalContent.removeChild(cancelButton);
    callback();
  };

  // Cancel action
  cancelButton.onclick = () => {
    modal.style.display = "none";
    modalContent.removeChild(cancelButton);
  };
}

// Fetch total emails with optional query (e.g., by label or by sender)
function fetchEmails(
  token,
  labelId = "",
  query = "",
  callback,
  retries = 3,
  maxErrors = 10
) {
  let totalEmails = 0;
  let messageIds = [];
  let errorCount = 0; // Track number of errors

  function getEmails(pageToken = null) {
    let url = `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=500&q=${query}`;
    if (labelId) url += `&labelIds=${labelId}`;
    if (pageToken) url += `&pageToken=${pageToken}`;

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch emails for label: ${labelId}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.messages) {
          totalEmails += data.messages.length;
          messageIds = [...messageIds, ...data.messages.map((msg) => msg.id)];
        }

        if (data.nextPageToken) {
          getEmails(data.nextPageToken); // Recursively fetch next pages
        } else {
          callback(totalEmails, messageIds); // Pass totalEmails and messageIds to callback
        }
      })
      .catch((error) => {
        errorCount++;
        console.error("Error fetching emails:", error);

        if (retries > 0 && errorCount < maxErrors) {
          console.warn(`Retrying fetchEmails... (${retries} attempts left)`);
          setTimeout(
            () =>
              fetchEmails(
                token,
                labelId,
                query,
                callback,
                retries - 1,
                maxErrors
              ),
            500
          );
        } else {
          console.error(
            `Max retries or errors reached. Failed to fetch emails.`
          );
          callback(0, []); // Return 0 emails if fetching fails completely
        }
      });
  }

  getEmails(); // Start fetching
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
          deleteInBatches(remaining); // Recursively delete remaining batches
        } else {
          callback(); // Call the callback once all emails are deleted
        }
      })
      .catch((error) => {
        showCustomModal("Error occurred while deleting emails.");
        console.error("Error deleting emails:", error);
      });
  };

  deleteInBatches(messageIds);
}

// Helper function to confirm deletion
function confirmDeletion(token, messageIds, itemName) {
  showCustomModal(
    `Delete all emails from "${itemName}"?`,
    () => {
      deleteEmails(token, messageIds, () => {
        showCustomModal(`${itemName} deleted successfully!`, () => {
          location.reload(); // Reload after user acknowledges the success message
        });
      });
    },
    true // isConfirm = true for confirmation modal
  );
}

// Utility function to show an element
function showElement(element) {
  element.classList.remove("hidden");
}

// Utility function to hide an element
function hideElement(element) {
  element.classList.add("hidden");
}
