import { showCustomModal, confirmDeletion, logError } from "../utils/utils.js";
import { Cache } from "../utils/cache.js";
import { fetchWithRetries, fetchEmails } from "../utils/api.js";

const labelCache = new Cache({
  ttl: 15 * 60 * 1000,
  maxSize: 500,
  cacheKey: "labelCache",
});

export function clearLabelCache() {
  labelCache.clear();
  const labelSelect = document.getElementById("labelSelect");
  if (labelSelect) {
    labelSelect.innerHTML = "";
    labelSelect.style.display = "none";
  }
}

export async function batchDeleteLabel(token, labelId, labelName) {
  const messageIds = labelCache.messageIds.get(labelId);
  if (messageIds && messageIds.length > 0) {
    confirmDeletion(token, messageIds, labelName);
    updateDeletedLabel(labelId);
  } else {
    showCustomModal(`No emails found under "${labelName}".`);
  }
}

export function updateDeletedLabel(labelId) {
  const labelSelect = document.getElementById("labelSelect");
  if (!labelSelect) return;

  const option = labelSelect.querySelector(`option[value="${labelId}"]`);
  if (option) {
    const label = labelCache.items.get(labelId);
    if (label) {
      option.textContent = `${label.labelName} (0 emails)`;
    }
  }

  labelCache.updateAfterDeletion(labelId);
}

export async function fetchLabels(token) {
  clearLabelCache();
  const url = "https://www.googleapis.com/gmail/v1/users/me/labels";

  try {
    const data = await fetchWithRetries(url, token);

    if (!data.labels || !Array.isArray(data.labels)) {
      showCustomModal("No labels found in your Gmail account.");
      return;
    }

    await processLabels(token, data.labels);
    displayLabels();
  } catch (error) {
    logError(error);
    showCustomModal(`Error fetching labels: ${error.message}`);
  }
}

async function processLabels(token, labels) {
  const processPromises = labels.map(async (label) => {
    try {
      const emailData = await fetchEmails(token, label.id);
      const formattedLabel = {
        labelId: label.id,
        labelName: formatLabelName(label.name),
        emailCount: emailData.emailCount,
      };

      labelCache.setItem(label.id, formattedLabel);
      labelCache.setCount(label.id, emailData.emailCount);
      labelCache.setMessageIds(label.id, emailData.emailIds);
    } catch (error) {
      logError(error, label.name);
    }
  });

  await Promise.all(processPromises);
}

function displayLabels() {
  const labelSelect = document.getElementById("labelSelect");
  if (!labelSelect) return;

  labelSelect.innerHTML = "";

  if (labelCache.items.size === 0) {
    showCustomModal("No labels found or error occurred while fetching labels.");
    return;
  }

  const sortedLabels = Array.from(labelCache.items.values()).sort(
    (a, b) =>
      labelCache.counts.get(b.labelId) - labelCache.counts.get(a.labelId)
  );

  sortedLabels.forEach((label) => {
    const option = document.createElement("option");
    option.value = label.labelId;
    option.textContent = `${label.labelName} (${labelCache.counts.get(
      label.labelId
    )} emails)`;
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
