// deleteBySender.js: Delete emails by a specific sender

function deleteEmailsBySender(token, labelId) {
    const sender = prompt('Enter the sender email address:');
    if (!sender) {
      showCustomAlert('No sender entered.');
      return;
    }
  
    const query = `from:${sender}`;
    fetchEmails(token, labelId, query, (totalEmails, messageIds) => {
      if (totalEmails > 0) {
        const confirmDelete = confirm(`Are you sure you want to delete ${totalEmails} emails from "${sender}"?`);
        if (confirmDelete) {
          fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/batchDelete`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ids: messageIds })
          })
          .then(() => showCustomAlert(`${totalEmails} emails from "${sender}" deleted successfully!`))
          .catch(error => console.error('Error deleting emails:', error));
        }
      } else {
        showCustomAlert(`No emails found from "${sender}".`);
      }
    });
  }
  