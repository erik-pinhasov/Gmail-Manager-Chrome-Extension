// Fetch all emails from a specific sender and delete them
function batchDeleteSender(token, sender) {
  fetchEmails(token, "", `from:${sender}`, (totalEmails, messageIds) => {
    if (totalEmails > 0) {
      showCustomConfirm(
        `Are you sure you want to delete all emails from "${sender}"?`,
        () => {
          // Delete emails once confirmed
          deleteEmails(token, messageIds, () => {
            // Only reload for delete by sender to avoid affecting delete by label
            showCustomAlert(
              `All emails from ${sender} have been deleted.`,
              () => {
                location.reload(); // Reload the extension page after deletion
              }
            );
          });
        }
      );
    } else {
      showCustomAlert(`No emails found from "${sender}".`);
    }
  });
}

// Search senders by query and display them with their email counts
function fetchEmailsBySearch(token, searchTerm, callback) {
  const sendersSet = new Set(); // Set to store unique senders

  // Fetch emails based on the search term (this part still uses the search term)
  fetchEmails(token, "", searchTerm, (totalEmails, messageIds) => {
    const promises = messageIds.map((messageId) =>
      fetchEmailDetails(token, messageId).then((emailData) => {
        if (emailData && emailData.headers) {
          const senderHeader = emailData.headers.find(
            (header) => header.name === "From"
          );
          if (senderHeader) {
            const sender = extractEmailAddress(senderHeader.value);
            sendersSet.add(sender); // Add unique senders to the set
          }
        }
      })
    );

    // Once we have unique senders, fetch all emails from each sender
    Promise.all(promises).then(() => {
      const sendersArray = Array.from(sendersSet);
      fetchEmailsCountForSenders(token, sendersArray, callback);
    });
  });
}

// Fetch all emails for each sender and return their counts
function fetchEmailsCountForSenders(token, sendersArray, callback) {
  const sendersWithCounts = [];

  // For each sender, fetch all emails sent by that sender
  const promises = sendersArray.map((sender) => {
    return new Promise((resolve) => {
      fetchEmails(token, "", `from:${sender}`, (totalEmails) => {
        sendersWithCounts.push({ sender, count: totalEmails });
        resolve();
      });
    });
  });

  // Once all senders are processed, return the senders with their email counts
  Promise.all(promises).then(() => {
    callback(sendersWithCounts); // Return senders and their email counts
  });
}

// Extract the email address from the 'From' header (removing display name)
function extractEmailAddress(fromHeader) {
  const emailRegex = /<([^>]+)>/; // Regex to match the email address inside <>
  const match = fromHeader.match(emailRegex);

  if (match && match[1]) {
    return match[1].trim(); // Return the clean email address
  }

  return fromHeader.trim(); // Return the whole header if no <email> pattern found
}

// Fetch email details for each message
function fetchEmailDetails(token, messageId) {
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?fields=payload.headers`;
  return fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
    .then((response) => response.json())
    .then((data) => data.payload)
    .catch((error) => {
      console.error("Error fetching email details:", error);
      return null;
    });
}

// Display senders with their total email counts
function displaySendersWithEmailCounts(token, senders) {
  const senderSelect = document.getElementById("senderSelect");
  senderSelect.innerHTML = ""; // Clear previous entries

  senders.forEach(({ sender, count }) => {
    const option = document.createElement("option");
    option.value = sender;
    option.textContent = `${sender} (${count} emails)`; // Display sender with total email count
    senderSelect.appendChild(option);
  });

  senderSelect.classList.remove("hidden");
  document.getElementById("deleteBySenderConfirm").classList.remove("hidden");
  addViewEmailsListener(token);
}

// Add event listener for the "View Emails" button
function addViewEmailsListener(token) {
  const viewEmailsButton = document.getElementById("viewEmailsButton");

  if (!viewEmailsButton) {
    // Create the "View Emails" button if it doesn't exist
    const button = document.createElement("button");
    button.id = "viewEmailsButton";
    button.textContent = "View Emails";
    button.classList.add("view-emails-button");

    // Append the button to the DOM above the delete button
    document.getElementById("deleteBySenderConfirm").before(button);

    // Attach the event listener to the button
    button.addEventListener("click", () => {
      const senderSelect = document.getElementById("senderSelect");
      const selectedSender = senderSelect.value;

      if (!selectedSender) {
        showCustomAlert("Please select a sender first.");
        return;
      }

      toggleLoadingSpinner(true); // Show loading animation when fetching begins

      // Fetch emails for the selected sender and display them
      fetchEmails(
        token,
        "", // No label ID since we are fetching by sender
        `from:${selectedSender}`, // Query for emails from the selected sender
        (totalEmails, messageIds) => {
          if (totalEmails > 0) {
            // Fetch the subjects for each email ID and display them
            const subjectPromises = messageIds.map((messageId) =>
              fetchEmailDetails(token, messageId).then((emailData) => {
                if (emailData && emailData.headers) {
                  const subjectHeader = emailData.headers.find(
                    (header) => header.name === "Subject"
                  );
                  return subjectHeader ? subjectHeader.value : "(No Subject)";
                } else {
                  return "(No Subject)";
                }
              })
            );

            Promise.all(subjectPromises).then((subjects) => {
              toggleLoadingSpinner(false); // Hide loading spinner after fetching
              displayEmailSubjects(subjects); // Display the list of subjects
            });
          } else {
            toggleLoadingSpinner(false); // Hide loading spinner if no emails are found
            showCustomAlert(`No emails found for sender "${selectedSender}".`);
          }
        }
      );
    });
  } else {
    // If the button already exists, ensure it is visible
    viewEmailsButton.classList.remove("hidden");
  }
}

// Display the list of email subjects in the UI
function displayEmailSubjects(subjects) {
  const emailListContainer = document.getElementById("emailListContainer");

  if (!emailListContainer) {
    // Create the email list container if it doesn't exist
    const container = document.createElement("div");
    container.id = "emailListContainer";
    container.classList.add("email-list-container");

    // Append the container to the DOM right below the sender selection box
    document.getElementById("senderSelect").after(container);
  }

  // Clear any existing content in the container
  document.getElementById("emailListContainer").innerHTML = "";

  // Populate the container with the list of subjects
  subjects.forEach((subject, index) => {
    const listItem = document.createElement("p");
    listItem.textContent = `${index + 1}. ${subject}`;
    document.getElementById("emailListContainer").appendChild(listItem);
  });
}
