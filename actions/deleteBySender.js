// Cache object to store email data
const emailCache = {
  senders: new Map(),
  messageIds: new Map(),
  emailDetails: new Map(),
};

// Date formatting
function formatDate(date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}/${String(date.getFullYear()).slice(-2)}`;
}

// Time formatting
function formatTime(time) {
  return `${String(time.getHours()).padStart(2, "0")}:${String(
    time.getMinutes()
  ).padStart(2, "0")}`;
}

// Handle batch deletion by sender
function batchDeleteSender(token, sender) {
  const cacheKey = `from:${sender}`;
  const messageIds = emailCache.messageIds.get(cacheKey);
  confirmDeletion(token, messageIds, sender);
}

// Search senders by query and display them with their email counts
function fetchEmailsBySearch(token, searchTerm, callback) {
  if (emailCache.senders.has(searchTerm)) {
    const cachedSenders = emailCache.senders.get(searchTerm);
    fetchAndSortSenders(token, cachedSenders, callback);
    return;
  }

  fetchEmails(token, "", searchTerm, (totalEmails, messageIds) => {
    if (totalEmails === 0) {
      loadingSpinner(false);
      showCustomModal("No results found.");
      return;
    }

    extractSendersFromEmails(token, messageIds)
      .then((sendersArray) => {
        emailCache.senders.set(searchTerm, sendersArray);
        fetchAndSortSenders(token, sendersArray, callback);
      })
      .catch((error) => {
        console.error("Error processing email details:", error);
        loadingSpinner(false);
        showCustomModal("An error occurred while fetching email details.");
      });
  });
}

// Extract senders from email messages
function extractSendersFromEmails(token, messageIds) {
  const sendersSet = new Set();
  const senderPromises = messageIds.map((messageId) =>
    fetchEmailDetails(token, messageId).then((emailData) => {
      const sender = extractSender(emailData);
      if (sender) sendersSet.add(sender);
    })
  );

  return Promise.all(senderPromises).then(() => Array.from(sendersSet));
}

// Helper to extract sender's email address from email data
function extractSender(emailData) {
  if (emailData && emailData.headers) {
    const senderHeaderValue = getHeaderValue(emailData.headers, "From");
    return senderHeaderValue ? extractEmailAddress(senderHeaderValue) : null;
  }
  return null;
}

// Extract the email address from the 'From' header
function extractEmailAddress(fromHeader) {
  const emailRegex = /<([^>]+)>/;
  const match = fromHeader.match(emailRegex);
  return match ? match[1].trim() : fromHeader.trim();
}

// Display senders with their email counts in the dropdown
function displaySendersEmailCounts(token, senders) {
  senders.forEach(({ sender, count }) => {
    const option = document.createElement("option");
    option.value = sender;
    option.textContent = `${sender} (${count} emails)`;
    document.getElementById("senderSelect").appendChild(option);
  });

  toggleSenderResults(true);
  addViewEmailsListener(token);
}

// Show/hide the sender selection dropdown and buttons
function toggleSenderResults(show) {
  const elements = [
    document.getElementById("senderSelect"),
    document.getElementById("viewEmails"),
    document.getElementById("deleteBySender"),
  ];

  elements.forEach((element) => {
    element.style.display = show ? "block" : "none";
  });
}

// Add event listener for the "View Emails" button
function addViewEmailsListener(token) {
  document.getElementById("viewEmails").addEventListener("click", () => {
    const selectedSender = document.getElementById("senderSelect").value;
    loadingSpinner(true);
    fetchEmailsForSender(token, selectedSender);
  });
}

// Clear any previous email list displayed and hide buttons
function clearPreviousEmailList() {
  document.getElementById("senderSelect").innerHTML = "";
  toggleSenderResults(false);
}

// Fetch emails for the selected sender and display subjects
function fetchEmailsForSender(token, sender) {
  const cacheKey = `from:${sender}`;
  const messageIds = emailCache.messageIds.get(cacheKey);
  fetchAndDisplayEmailSubjects(token, messageIds);
}

// Fetch and display email subjects for view emails list
function fetchAndDisplayEmailSubjects(token, messageIds) {
  const subjectPromises = messageIds.map((messageId) =>
    getEmailDetails(token, messageId)
  );

  Promise.all(subjectPromises).then((subjects) => {
    loadingSpinner(false);
    const validSubjects = subjects.filter((subject) => subject !== null);

    if (validSubjects.length === 0) {
      showCustomModal("No email subjects could be retrieved.");
    } else {
      openSubjectListWindow(validSubjects);
    }
  });
}

// Fetch all emails for each sender, return their counts, and sort by email count
function fetchAndSortSenders(token, sendersArray, callback) {
  const senderCounts = sendersArray.map(
    (sender) =>
      new Promise((resolve) => {
        const query = `in:anywhere from:${sender}`;
        fetchEmails(token, "", query, (totalEmails, messageIds) => {
          emailCache.messageIds.set(`from:${sender}`, messageIds);
          resolve({ sender, count: totalEmails });
        });
      })
  );

  Promise.all(senderCounts).then((resolvedCounts) => {
    const sortedSenders = resolvedCounts.sort((a, b) => a.count - b.count);
    callback(sortedSenders);
  });
}

// Fetch and format individual email details
function getEmailDetails(token, messageId) {
  if (emailCache.emailDetails.has(messageId)) {
    return Promise.resolve(emailCache.emailDetails.get(messageId));
  }

  return fetchEmailDetails(token, messageId).then((emailData) => {
    if (emailData && emailData.headers) {
      const formattedData = formatEmailData(emailData);
      emailCache.emailDetails.set(messageId, formattedData);
      return formattedData;
    }
    return null;
  });
}

// Format email subject and date for display
function formatEmailData(data) {
  const subject = getHeaderValue(data.headers, "Subject") || "(No Subject)";
  const date = new Date(getHeaderValue(data.headers, "Date") || Date.now());
  return {
    subject,
    date: formatDate(date),
    time: formatTime(date),
  };
}

// Extract header value from email headers
function getHeaderValue(headers, headerName) {
  const header = headers.find((h) => h.name === headerName);
  return header ? header.value : null;
}
