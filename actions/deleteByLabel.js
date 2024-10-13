// Cache object to store label data
const labelCache = {
  labels: [],
  emailCounts: new Map(),
  messageIds: new Map(),
};

// Main function to handle batch deletion by label
function batchDeleteLabel(token, labelId, labelName) {
  const messageIds = labelCache.messageIds.get(labelId);
  if (messageIds && messageIds.length > 0) {
    confirmDeletion(token, messageIds, labelName);
  } else {
    showCustomModal(`No emails found under "${labelName}".`);
  }
}

// Fetch and Display Labels
function fetchLabels(token, callback) {
  const labelSelect = document.getElementById("labelSelect");
  const url = "https://www.googleapis.com/gmail/v1/users/me/labels";

  // Fetch labels from Gmail API
  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
    .then((response) => response.json())
    .then((data) => {
      labelCache.labels = [];
      const fetchPromises = data.labels.map((label) => {
        const formattedLabelName = formatLabelName(label.name);
        return fetchEmailsForLabel(token, label.id).then((emailData) => {
          labelCache.labels.push({
            labelId: label.id,
            labelName: formattedLabelName,
            emailCount: emailData.totalEmails,
          });
          labelCache.emailCounts.set(label.id, emailData.totalEmails);
          labelCache.messageIds.set(label.id, emailData.messageIds);
        });
      });

      Promise.all(fetchPromises).then(() => {
        labelCache.labels.sort((a, b) => b.emailCount - a.emailCount);
        displayLabels(labelSelect, labelCache.labels);
        callback();
      });
    })
    .catch((error) => {
      console.error("Error fetching labels:", error);
      callback();
    });
}

// Fetch emails for a specific label
function fetchEmailsForLabel(token, labelId) {
  return new Promise((resolve) => {
    fetchEmails(token, labelId, "", (totalEmails, messageIds) => {
      resolve({ totalEmails, messageIds });
    });
  });
}

// Display labels with email count
function displayLabels(labelSelect, labels) {
  labelSelect.innerHTML = "";
  labels.forEach(({ labelId, labelName, emailCount }) => {
    const option = document.createElement("option");
    option.value = labelId;
    option.textContent = `${labelName} (${emailCount} emails)`;
    labelSelect.appendChild(option);
  });
  labelSelect.style.display = "block";
}

// Format Label/Category name for display
function formatLabelName(labelName) {
  if (labelName.startsWith("CATEGORY_")) {
    labelName = labelName.replace("CATEGORY_", "");
  }

  return labelName
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
