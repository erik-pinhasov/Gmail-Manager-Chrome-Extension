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

// UI Modals
function showCustomConfirm(message, onConfirm) {
  const modal = document.getElementById("customModal");
  const modalMessage = document.getElementById("modalMessage");
  const modalButton = document.getElementById("modalButton");

  setupModal(modal, modalMessage, modalButton, message, onConfirm, true);
}

function showCustomAlert(message, callback) {
  const modal = document.getElementById("customModal");
  const modalMessage = document.getElementById("modalMessage");
  const modalButton = document.getElementById("modalButton");

  setupModal(modal, modalMessage, modalButton, message, callback, false);
}

// Setup modals
function setupModal(
  modal,
  modalMessage,
  modalButton,
  message,
  callback,
  isConfirm
) {
  modalMessage.textContent = message;
  modal.style.display = "flex";
  modalButton.onclick = null;

  if (isConfirm) {
    setupConfirmModal(modal, modalButton, callback);
  } else {
    modalButton.textContent = "OK";
    modalButton.onclick = () => {
      modal.style.display = "none";
      if (callback) callback();
    };
  }
}

function setupConfirmModal(modal, modalButton, callback) {
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  modalButton.textContent = "Confirm";
  const modalContent = document.querySelector(".modal-content");
  modalContent.appendChild(cancelButton);

  modalButton.onclick = () => {
    modal.style.display = "none";
    modalContent.removeChild(cancelButton);
    callback();
  };

  cancelButton.onclick = () => {
    modal.style.display = "none";
    modalContent.removeChild(cancelButton);
  };
}

// Fetch total emails with optional query (e.g., by label or by sender)
// Fetch total emails with optional query (e.g., by label or by sender)
function fetchEmails(token, labelId = "", query = "", callback) {
  let totalEmails = 0;
  let messageIds = [];
  const maxResults = 500;

  function getEmails(pageToken = null) {
    let url = `https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${query}`;
    if (labelId) url += `&labelIds=${labelId}`; // If labelId is provided, fetch by label
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
        console.error("Error fetching emails:", error);
        callback(0, []); // Return 0 emails if fetching fails
      });
  }

  getEmails(); // Start fetching
}

// Fetch and Display Labels
function fetchAndDisplayLabels(token, callback, forceRefresh = false) {
  const labelSelect = document.getElementById("labelSelect");
  labelSelect.innerHTML = "";

  const url = "https://www.googleapis.com/gmail/v1/users/me/labels";

  // Fetch labels from Gmail API
  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: forceRefresh ? "no-store" : "default", // Use no-store if forcing a refresh
  })
    .then((response) => response.json())
    .then((data) => {
      const labelsWithCounts = [];

      // Fetch email counts for each label
      data.labels.forEach((label) => {
        const formattedLabelName = formatLabelName(label.name);
        fetchEmails(token, label.id, "", (emailCount) => {
          labelsWithCounts.push({
            labelId: label.id,
            labelName: formattedLabelName,
            emailCount,
          });

          // Sort and display labels after fetching all counts
          if (labelsWithCounts.length === data.labels.length) {
            labelsWithCounts.sort((a, b) => b.emailCount - a.emailCount);
            displayLabels(labelSelect, labelsWithCounts);
            callback();
          }
        });
      });
    })
    .catch((error) => {
      displayErrorLabel(labelSelect);
      console.error("Error fetching labels:", error);
      callback();
    });
}

// Display labels with email count
function displayLabels(labelSelect, labelsWithCounts) {
  labelSelect.innerHTML = "";
  labelsWithCounts.forEach(({ labelId, labelName, emailCount }) => {
    const option = document.createElement("option");
    option.value = labelId;
    option.textContent = `${labelName} (${emailCount} emails)`;
    labelSelect.appendChild(option);
  });
  labelSelect.style.display = "block";
}

// Display error if labels can't be fetched
function displayErrorLabel(labelSelect) {
  labelSelect.innerHTML = "";
  const errorMessage = document.createElement("option");
  errorMessage.textContent = "Error loading categories";
  labelSelect.appendChild(errorMessage);
}

function formatLabelName(labelName) {
  if (labelName.startsWith("CATEGORY_")) {
    labelName = labelName.replace("CATEGORY_", "");
  }
  const words = labelName.split("_");
  const formattedWords = [];

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const formattedWord = word.charAt(0) + word.slice(1).toLowerCase();
    formattedWords.push(formattedWord);
  }

  return formattedWords.join(" ");
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
        showCustomAlert("Error occurred while deleting emails.");
        console.error("Error deleting emails:", error);
      });
  };

  deleteInBatches(messageIds);
}
