// deleteByLabel.js

import { showCustomModal, confirmDeletion } from "../utils/utils.js";
import { fetchWithRetries, fetchEmails } from "../utils/api.js";

const labelCache = {
  labels: [],
  emailCounts: new Map(),
  messageIds: new Map(),
};

function clearLabelCache() {
  labelCache.labels = [];
  labelCache.emailCounts.clear();
  labelCache.messageIds.clear();
}

function updateLabelAfterDeletion(labelId) {
  const labelSelect = document.getElementById("labelSelect");
  if (!labelSelect) return;

  // Find and update the option in the select element
  const option = labelSelect.querySelector(`option[value="${labelId}"]`);
  if (option) {
    const labelName =
      labelCache.labels.find((l) => l.labelId === labelId)?.labelName || "";
    option.textContent = `${labelName} (0 emails)`;
  }

  // Update cache
  labelCache.emailCounts.set(labelId, 0);
  labelCache.messageIds.set(labelId, []);

  // Update the labels array
  const labelIndex = labelCache.labels.findIndex((l) => l.labelId === labelId);
  if (labelIndex !== -1) {
    labelCache.labels[labelIndex].emailCount = 0;
  }
}

export async function batchDeleteLabel(token, labelId, labelName) {
  const messageIds = labelCache.messageIds.get(labelId);
  if (messageIds && messageIds.length > 0) {
    confirmDeletion(token, messageIds, labelName);
    updateLabelAfterDeletion(labelId);
  } else {
    showCustomModal(`No emails found under "${labelName}".`);
  }
}

export async function fetchLabels(token) {
  clearLabelCache();
  const url = "https://www.googleapis.com/gmail/v1/users/me/labels";

  try {
    const data = await fetchWithRetries(url, token);

    if (!data.labels || !Array.isArray(data.labels)) {
      console.error("No labels found in the API response:", data);
      showCustomModal("No labels found in your Gmail account.");
      return;
    }

    await processLabels(token, data.labels);
    displayLabels();
  } catch (error) {
    console.error("Error fetching labels:", error);
    showCustomModal(`Error fetching labels: ${error.message}`);
  }
}

async function processLabels(token, labels) {
  labelCache.labels = [];
  const fetchPromises = labels.map(async (label) => {
    try {
      const emailData = await fetchEmailsForLabel(token, label.id);
      const formattedLabelName = formatLabelName(label.name);
      labelCache.labels.push({
        labelId: label.id,
        labelName: formattedLabelName,
        emailCount: emailData.emailCount,
      });
      labelCache.emailCounts.set(label.id, emailData.emailCount);
      labelCache.messageIds.set(label.id, emailData.emailIds);
    } catch (error) {
      console.error(`Error processing label ${label.name}:`, error);
    }
  });

  await Promise.all(fetchPromises);
  labelCache.labels.sort((a, b) => b.emailCount - a.emailCount);
}

async function fetchEmailsForLabel(token, labelId) {
  return fetchEmails(token, labelId);
}

function displayLabels() {
  const labelSelect = document.getElementById("labelSelect");
  labelSelect.innerHTML = "";

  if (labelCache.labels.length === 0) {
    showCustomModal("No labels found or error occurred while fetching labels.");
    return;
  }

  labelCache.labels.forEach(({ labelId, labelName, emailCount }) => {
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
