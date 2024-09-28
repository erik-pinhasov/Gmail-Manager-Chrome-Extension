// Fetch emails and batch delete a whole category/label
function batchDeleteEmails(token, labelId, labelName) {
  fetchEmails(token, labelId, "", (totalEmails, messageIds) => {
    if (totalEmails > 0) {
      showCustomConfirm(
        `Are you sure you want to delete all emails from "${labelName}"?`,
        () => {
          deleteEmails(token, messageIds, labelId, labelName, totalEmails);
        }
      );
    } else {
      showCustomAlert(`No emails found under "${labelName}".`);
    }
  });
}

// Delete emails in batches
function deleteEmails(token, messageIds, labelId, labelName, totalEmails) {
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
          // After all batches are deleted, refetch the updated labels
          toggleLoadingSpinner(true);
          fetchAndDisplayLabels(token, () => {
            toggleLoadingSpinner(false);
            handleDeletionSuccess(labelId, labelName, totalEmails);
          });
        }
      })
      .catch((error) => {
        showCustomAlert("Error occurred while deleting emails.");
        console.error("Error deleting emails:", error);
      });
  };

  deleteInBatches(messageIds); // Start batch deletion
}

// Handle successful deletion
function handleDeletionSuccess(labelId, labelName, totalEmails) {
  showCustomAlert(`${labelName} deleted successfully!`);
}
