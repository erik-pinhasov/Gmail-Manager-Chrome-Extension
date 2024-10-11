// Fetch emails and batch delete a whole category/label
function batchDeleteLabel(token, labelId, labelName) {
  fetchEmails(token, labelId, "", (totalEmails, messageIds) => {
    if (totalEmails > 0) {
      showCustomConfirm(
        `Are you sure you want to delete all emails from "${labelName}"?`,
        () => {
          deleteEmails(token, messageIds, () => {
            // Refetch labels after deletion and show a success message
            toggleLoadingSpinner(true); // Show the spinner during refetch
            fetchAndDisplayLabels(token, () => {
              toggleLoadingSpinner(false); // Hide the spinner once refetch is done
              showCustomAlert(`${labelName} deleted successfully!`);
            });
          });
        }
      );
    } else {
      showCustomAlert(`No emails found under "${labelName}".`);
    }
  });
}
