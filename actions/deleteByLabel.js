// Main function to handle batch deletion by label
function batchDeleteLabel(token, labelId, labelName) {
  fetchEmails(token, labelId, "", (totalEmails, messageIds) => {
    if (totalEmails > 0) {
      confirmDeletion(token, messageIds, labelName);
    } else {
      showCustomModal(`No emails found under "${labelName}".`);
    }
  });
}

// Fetch and Display Labels
function fetchLabels(token, callback, forceRefresh = false) {
  const labelSelect = document.getElementById("labelSelect");

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
      console.error("Error fetching labels:", error);
      callback();
    });
}

// Display labels with email count
function displayLabels(labelSelect, labelsWithCounts) {
  labelsWithCounts.forEach(({ labelId, labelName, emailCount }) => {
    const option = document.createElement("option");
    option.value = labelId;
    option.textContent = `${labelName} (${emailCount} emails)`;
    labelSelect.appendChild(option);
  });
  labelSelect.style.display = "block";
}

function formatLabelName(labelName) {
  if (labelName.startsWith("CATEGORY_")) {
    labelName = labelName.replace("CATEGORY_", "");
  }

  return labelName
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
