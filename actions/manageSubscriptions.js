// manageSubscriptions.js: Manage and delete subscription emails

function manageSubscriptions(token) {
    const query = 'unsubscribe';
    fetchEmails(token, null, query, (totalEmails, messageIds) => {
      if (totalEmails > 0) {
        const confirmDelete = confirm(`Are you sure you want to delete ${totalEmails} subscription emails?`);
        if (confirmDelete) {
          fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/batchDelete`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: messageIds })
          })
          .then(() => showCustomAlert(`${totalEmails} subscription emails deleted successfully!`))
          .catch(error => console.error('Error deleting subscription emails:', error));
        }
      } else {
        showCustomAlert('No subscription emails found.');
      }
    });
  }
  