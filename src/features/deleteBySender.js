import {
  showCustomModal,
  extractEmailAddress,
  getHeaderValue,
  formatDate,
  formatTime,
  confirmDeletion,
  openDataWindow,
  logError,
} from "../utils/utils.js";
import { Cache } from "../utils/cache.js";
import { fetchEmails, fetchEmailDetails } from "../utils/api.js";
import {
  sanitizeEmailAddress,
  sanitizeSearchQuery,
} from "../utils/sanitization.js";

const senderCache = new Cache({
  ttl: 15 * 60 * 1000,
  maxSize: 1000,
  cacheKey: "senderCache",
});

export function clearSenderCache() {
  senderCache.clear();
  toggleSenderElements(false);
}

export function updateSenderAfterDeletion(sender) {
  const senderSelect = document.getElementById("senderSelect");
  if (!senderSelect) return;

  const option = senderSelect.querySelector(`option[value="${sender}"]`);
  if (option) {
    senderSelect.removeChild(option);
  }

  const cacheKey = `from:${sender}`;
  senderCache.updateAfterDeletion(cacheKey);

  if (senderSelect.options.length === 0) {
    toggleSenderElements(false);
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
  if (messageIds && messageIds.length > 0) {
    confirmDeletion(token, messageIds, sender);
    updateSenderAfterDeletion(sender);
  } else {
    showCustomModal(`No emails found for "${sender}".`);
  }
}

export async function fetchEmailsBySearch(token, searchTerm) {
  const sanitizedTerm = sanitizeSearchQuery(searchTerm);
  if (!sanitizedTerm) {
    showCustomModal("Please enter a valid search term.");
    return [];
  }
  clearSenderCache();
  const { emailCount, emailIds } = await fetchEmails(token, "", sanitizedTerm);

  if (emailCount === 0) {
    showCustomModal("No results found.");
    return [];
  }

  try {
    const sendersArray = await extractSenders(token, emailIds);
    const sortedSenders = await fetchAndSortSenders(token, sendersArray);

    senderCache.setItem("senders", sortedSenders);
    return sortedSenders;
  } catch (error) {
    logError(error);
    showCustomModal("An error occurred while fetching email details.");
    return [];
  }
}

async function extractSenders(token, messageIds) {
  const sendersSet = new Set();
  const senderPromises = messageIds.map(async (messageId) => {
    try {
      const emailData = await fetchEmailDetails(token, messageId);
      const sender = extractSender(emailData);
      if (sender) sendersSet.add(sender);
    } catch (error) {
      logError(error, messageId);
    }
  });

  await Promise.all(senderPromises);
  return Array.from(sendersSet);
}

function extractSender(emailData) {
  if (emailData && emailData.headers) {
    const senderHeaderValue = getHeaderValue(emailData.headers, "From");
    return senderHeaderValue
      ? sanitizeEmailAddress(extractEmailAddress(senderHeaderValue))
      : null;
  }
  return null;
}

export async function fetchSenderEmails(token, sender) {
  const cacheKey = `from:${sender}`;
  const messageIds = senderCache.messageIds.get(cacheKey);
  if (!messageIds || messageIds.length === 0) {
    showCustomModal("No emails found for this sender.");
    return;
  }

  const dataPayload = await displayEmailSubjects(token, messageIds);
  if (dataPayload) {
    openDataWindow("../popup/list-page/listPage.html", dataPayload);
  }
}

async function displayEmailSubjects(token, messageIds) {
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
      try {
        const query = `in:anywhere from:${sender}`;
        const { emailCount, emailIds } = await fetchEmails(token, "", query);
        const cacheKey = `from:${sender}`;
        senderCache.setMessageIds(cacheKey, emailIds);
        senderCache.setCount(cacheKey, emailCount); // Add this
        return { sender, count: emailCount };
      } catch (error) {
        logError(error, sender);
        return { sender, count: 0 };
      }
    })
  );

  return senderCounts
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
}

async function getEmailDetails(token, messageId) {
  if (senderCache.emailDetails?.has(messageId)) {
    return senderCache.emailDetails.get(messageId);
  }

  const emailData = await fetchEmailDetails(token, messageId);
  if (emailData && emailData.headers) {
    const formattedData = {
      subject: getHeaderValue(emailData.headers, "Subject") || "(No Subject)",
      date: formatDate(
        new Date(getHeaderValue(emailData.headers, "Date") || Date.now())
      ),
      time: formatTime(
        new Date(getHeaderValue(emailData.headers, "Date") || Date.now())
      ),
    };

    if (!senderCache.emailDetails) {
      senderCache.emailDetails = new Map();
    }
    senderCache.emailDetails.set(messageId, formattedData);
    return formattedData;
  }
  return null;
}

export function displayEmailsCounts(senders) {
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
