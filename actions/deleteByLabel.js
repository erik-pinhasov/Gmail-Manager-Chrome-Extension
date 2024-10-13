// // Main function to handle batch deletion by label
// function batchDeleteLabel(token, labelId, labelName) {
//   fetchEmails(token, labelId, "", (totalEmails, messageIds) => {
//     if (totalEmails > 0) {
//       confirmDeletion(token, messageIds, labelName);
//     } else {
//       showCustomModal(`No emails found under "${labelName}".`);
//     }
//   });
// }

// Fetch, sort and display labels/categories with email counts
function fetchLabels(token, callback) {
  const labelSelect = document.getElementById("labelSelect");
  const url = "https://www.googleapis.com/gmail/v1/users/me/labels";

  fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })
    .then((response) => response.json())
    .then((data) => {
      const labelsWithCounts = [];

      // Fetch email counts for each label
      const labelPromises = data.labels.map(
        (label) =>
          new Promise((resolve) => {
            const formattedLabelName = formatLabelName(label.name);
            fetchEmails(token, label.id, "", (emailCount, messageIds) => {
              labelsWithCounts.push({
                labelId: label.id,
                labelName: formattedLabelName,
                emailCount,
                messageIds, // Save message IDs for later use
              });
              resolve();
            });
          })
      );

      Promise.all(labelPromises).then(() => {
        labelsWithCounts.sort((a, b) => b.emailCount - a.emailCount);
        displayLabels(labelSelect, labelsWithCounts);
        callback(labelsWithCounts); // Return the fetched labels and their email counts
      });
    })
    .catch((error) => {
      console.error("Error fetching labels:", error);
      callback([]);
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

// Format category name for display
function formatLabelName(labelName) {
  if (labelName.startsWith("CATEGORY_")) {
    labelName = labelName.replace("CATEGORY_", "");
  }

  return labelName
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}
