// deleteBySender.js
import {
  showCustomModal,
  extractEmailAddress,
  getHeaderValue,
  formatDate,
  formatTime,
  confirmDeletion,
  openDataWindow,
} from "../utils/utils.js";
import { fetchEmails, fetchEmailDetails } from "../utils/api.js";

const senderCache = {
  senders: new Map(),
  messageIds: new Map(),
  emailDetails: new Map(),
};

function clearSenderCache() {
  senderCache.senders.clear();
  senderCache.messageIds.clear();
  senderCache.emailDetails.clear();
}

// Function to update UI after deletion
function updateSenderAfterDeletion(sender) {
  const senderSelect = document.getElementById("senderSelect");
  if (!senderSelect) return;

  // Remove the sender option from select element
  const option = senderSelect.querySelector(`option[value="${sender}"]`);
  if (option) {
    senderSelect.removeChild(option);
  }

  // Update cache
  const cacheKey = `from:${sender}`;
  senderCache.messageIds.delete(cacheKey);

  // If this was the last sender, hide the buttons
  if (senderSelect.options.length === 0) {
    const elements = ["viewEmails", "deleteBySender"];
    elements.forEach((elementId) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = "none";
      }
    });
    senderSelect.style.display = "none";
  }
}

export function toggleSenderElements(showElements) {
  const elements = ["senderSelect", "viewEmails", "deleteBySender"];

  elements.forEach((elementId) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.style.display = showElements ? "block" : "none";
    }
  });
}

export async function batchDeleteSender(token, sender) {
  const cacheKey = `from:${sender}`;
  const messageIds = senderCache.messageIds.get(cacheKey);
  confirmDeletion(token, messageIds, sender);
  updateSenderAfterDeletion(sender);
}

export async function fetchEmailsBySearch(token, searchTerm) {
  clearSenderCache();

  const { emailCount, emailIds } = await fetchEmails(token, "", searchTerm);

  if (emailCount === 0) {
    showCustomModal("No results found.");
    return [];
  }

  try {
    const sendersArray = await extractSendersFromEmails(token, emailIds);
    senderCache.senders.set(searchTerm, sendersArray);
    return fetchAndSortSenders(token, sendersArray);
  } catch (error) {
    console.error("Error processing email details:", error);
    showCustomModal("An error occurred while fetching email details.");
    return [];
  }
}

async function extractSendersFromEmails(token, messageIds) {
  const sendersSet = new Set();
  const senderPromises = messageIds.map(async (messageId) => {
    const emailData = await fetchEmailDetails(token, messageId);
    const sender = extractSender(emailData);
    if (sender) sendersSet.add(sender);
  });

  await Promise.all(senderPromises);
  return Array.from(sendersSet);
}

function extractSender(emailData) {
  if (emailData && emailData.headers) {
    const senderHeaderValue = getHeaderValue(emailData.headers, "From");
    return senderHeaderValue ? extractEmailAddress(senderHeaderValue) : null;
  }
  return null;
}

export async function fetchEmailsForSender(token, sender) {
  const cacheKey = `from:${sender}`;
  const messageIds = senderCache.messageIds.get(cacheKey);
  if (!messageIds || messageIds.length === 0) {
    showCustomModal("No emails found for this sender.");
    return;
  }

  const dataPayload = await fetchAndDisplayEmailSubjects(token, messageIds);
  if (dataPayload) {
    openDataWindow("../popup/list-page/listPage.html", dataPayload);
  }
}

async function fetchAndDisplayEmailSubjects(token, messageIds) {
  const subjectPromises = messageIds.map((messageId) =>
    getEmailDetails(token, messageId)
  );

  const subjects = await Promise.all(subjectPromises);
  const validSubjects = subjects.filter((subject) => subject !== null);

  if (validSubjects.length === 0) {
    showCustomModal("No email subjects could be retrieved.");
    return null;
  }

  return {
    tableTitle: "Email Subjects",
    columns: [
      { label: "Subject", key: "subject" },
      { label: "Date", key: "date" },
      { label: "Time", key: "time" },
    ],
    dataItems: validSubjects,
  };
}

async function fetchAndSortSenders(token, sendersArray) {
  const senderCounts = await Promise.all(
    sendersArray.map(async (sender) => {
      const query = `in:anywhere from:${sender}`;
      const { emailCount, emailIds } = await fetchEmails(token, "", query);
      senderCache.messageIds.set(`from:${sender}`, emailIds);
      return { sender, count: emailCount };
    })
  );

  return senderCounts.sort((a, b) => b.count - a.count);
}

async function getEmailDetails(token, messageId) {
  if (senderCache.emailDetails.has(messageId)) {
    return senderCache.emailDetails.get(messageId);
  }

  const emailData = await fetchEmailDetails(token, messageId);
  if (emailData && emailData.headers) {
    const formattedData = formatEmailData(emailData);
    senderCache.emailDetails.set(messageId, formattedData);
    return formattedData;
  }
  return null;
}

function formatEmailData(data) {
  const subject = getHeaderValue(data.headers, "Subject") || "(No Subject)";
  const date = new Date(getHeaderValue(data.headers, "Date") || Date.now());
  return {
    subject,
    date: formatDate(date),
    time: formatTime(date),
  };
}

export function displaySendersEmailCounts(senders) {
  toggleSenderElements(false);

  if (!senders || senders.length === 0) {
    showCustomModal("No senders found.");
    return;
  }

  const senderSelect = document.getElementById("senderSelect");
  senderSelect.innerHTML = "";

  senders.forEach(({ sender, count }) => {
    const option = document.createElement("option");
    option.value = sender;
    option.textContent = `${sender} (${count} emails)`;
    senderSelect.appendChild(option);
  });

  toggleSenderElements(true);
}
