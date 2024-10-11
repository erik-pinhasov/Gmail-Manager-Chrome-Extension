// Utility function to close the modal
function closeModal(modal, modalContent, cancelButton) {
  modal.style.display = "none";
  modalContent.removeChild(cancelButton);
}

// Function to show a custom modal (combined for Confirm and Alert)
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
  const modalContent = document.querySelector(".modal-content");
  modalContent.appendChild(cancelButton);

  // Confirm action
  modalButton.onclick = () => {
    closeModal(modal, modalContent, cancelButton);
    callback();
  };

  // Cancel action
  cancelButton.onclick = () => {
    closeModal(modal, modalContent, cancelButton);
  };
}

// Utility function to show or hide multiple elements
function toggleVisibility(isVisible, ...elements) {
  elements.forEach((element) => {
    if (isVisible) {
      element.classList.remove("hidden");
    } else {
      element.classList.add("hidden");
    }
  });
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
    true // isConfirm = true for confirmation modal
  );
}

// Fetch total emails with optional query (e.g., by label or by sender)
function fetchEmails(token, labelId = "", query = "", callback, retries = 3) {
  let totalEmails = 0;
  let messageIds = [];

  function buildUrl(pageToken) {
    let url = `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=500&q=${query}`;
    if (labelId) url += `&labelIds=${labelId}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    return url;
  }

  function handleResponse(response) {
    if (!response.ok)
      throw new Error(`Failed to fetch emails for label: ${labelId}`);
    return response.json();
  }

  function processEmailData(data) {
    if (data.messages) {
      totalEmails += data.messages.length;
      messageIds = [...messageIds, ...data.messages.map((msg) => msg.id)];
    }

    if (data.nextPageToken) {
      getEmails(data.nextPageToken); // Recursively fetch next pages
    } else {
      callback(totalEmails, messageIds); // Pass totalEmails and messageIds to callback
    }
  }

  function handleError(error) {
    if (retries > 0) {
      console.warn(`Retrying fetchEmails... (${retries} attempts left)`);
      setTimeout(
        () => fetchEmails(token, labelId, query, callback, retries - 1),
        500
      );
    } else {
      console.error(`Failed to fetch emails.`);
      callback(0, []); // Return 0 emails if fetching fails completely
    }
  }

  function getEmails(pageToken = null) {
    const url = buildUrl(pageToken);

    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(handleResponse)
      .then(processEmailData)
      .catch(handleError);
  }

  getEmails(); // Start fetching
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
