// Token Handling
function getAuthToken(interactive = true, callback) {
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
      if (callback) {
        callback();
      }
    };
  }
}

// Setup confirm modal
function setupConfirmModal(modal, modalButton, callback) {
  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  modalButton.textContent = "Confirm";
  const modalContent = document.querySelector(".modal-content");
  modalContent.appendChild(cancelButton);

  // Confirm button action
  modalButton.onclick = () => {
    modal.style.display = "none";
    modalContent.removeChild(cancelButton);
    callback();
  };

  // Cancel button action
  cancelButton.onclick = () => {
    modal.style.display = "none";
    modalContent.removeChild(cancelButton);
  };
}

// Fetch total emails
function fetchEmails(token, labelId, query = "", callback) {
  let totalEmails = 0;
  let messageIds = [];
  const maxResults = 500;

  function getEmails(pageToken = null) {
    let paginatedUrl = `https://www.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}&q=${query}&maxResults=${maxResults}`;
    if (pageToken) {
      paginatedUrl += `&pageToken=${pageToken}`;
    }

    fetch(paginatedUrl, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.json())
      .then((data) => {
        totalEmails += data.messages ? data.messages.length : 0;
        if (data.messages) {
          messageIds = [...messageIds, ...data.messages.map((msg) => msg.id)];
        }

        if (data.nextPageToken) {
          getEmails(data.nextPageToken); // Recursively fetch next pages
        } else {
          callback(totalEmails, messageIds); // Return the total count and all message IDs
        }
      })
      .catch((error) => console.error("Error fetching emails:", error));
  }

  getEmails();
}

// Fetch and Display Sorted Labels with Email Counts
function fetchAndDisplayLabels(token, callback) {
  const labelSelect = document.getElementById("labelSelect");
  labelSelect.innerHTML = "";

  const url = "https://www.googleapis.com/gmail/v1/users/me/labels";

  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((response) => response.json())
    .then((data) => {
      const labelsWithCounts = [];
      data.labels.forEach((label) => {
        const formattedLabelName = formatLabelName(label.name);

        fetchEmails(token, label.id, "", (emailCount) => {
          labelsWithCounts.push({
            labelId: label.id,
            labelName: formattedLabelName,
            emailCount,
          });

          // Sort by email count
          if (labelsWithCounts.length === data.labels.length) {
            labelsWithCounts.sort((a, b) => b.emailCount - a.emailCount);
            displayLabels(labelSelect, labelsWithCounts);
            callback(); // Call the callback after fetching labels
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

// Format Label Names
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
