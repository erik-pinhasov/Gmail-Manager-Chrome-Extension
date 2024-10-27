import { EmailManager } from "./emailManager.js";
import {
  showCustomModal,
  extractEmailAddress,
  getHeaderValue,
  logError,
} from "../utils/utils.js";
import { fetchEmails, fetchEmailDetails } from "../utils/api.js";
import {
  sanitizeEmailAddress,
  sanitizeSearchQuery,
} from "../utils/sanitization.js";

export class SenderManager extends EmailManager {
  constructor() {
    super({
      cacheKey: "senderCache",
      elementIds: ["senderSelect", "viewEmails", "deleteBySender"],
      type: "sender",
    });
  }

  async fetchBySearch(token, searchTerm) {
    const sanitizedTerm = sanitizeSearchQuery(searchTerm);
    if (!sanitizedTerm) {
      showCustomModal("Please enter a valid search term.");
      return [];
    }

    this.clearCache();

    try {
      const { emailCount, emailIds } = await fetchEmails(
        token,
        "",
        `in:anywhere ${sanitizedTerm}`
      );

      if (emailCount === 0) {
        showCustomModal("No results found.");
        return [];
      }

      const sendersMap = await this.extractSendersInBatches(token, emailIds);
      const sendersArray = Array.from(sendersMap.values());

      return this.fetchAndSortItems(
        token,
        sendersArray,
        (sender) => `in:anywhere from:${sender.identifier}`
      );
    } catch (error) {
      logError(error);
      showCustomModal(
        "An error occurred while fetching emails. Please try again."
      );
      return [];
    }
  }

  async extractSendersInBatches(token, messageIds, batchSize = 20) {
    const sendersMap = new Map();
    const retryDelay = 1000;

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          await this.processSenderBatch(token, batch, sendersMap);
          break;
        } catch (error) {
          retryCount++;
          if (error.status === 429 || error.message?.includes("429")) {
            await new Promise((resolve) =>
              setTimeout(resolve, retryDelay * Math.pow(2, retryCount))
            );
            continue;
          }
          logError(error, { batch, retryCount });
          break;
        }
      }

      if (i + batchSize < messageIds.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return sendersMap;
  }

  async processSenderBatch(token, messageIds, sendersMap) {
    await Promise.all(
      messageIds.map(async (messageId) => {
        try {
          const emailData = await fetchEmailDetails(token, messageId);
          if (emailData?.headers) {
            const from = getHeaderValue(emailData.headers, "From");
            if (from) {
              const emailAddress = sanitizeEmailAddress(
                extractEmailAddress(from)
              );
              if (emailAddress && !sendersMap.has(emailAddress)) {
                sendersMap.set(emailAddress, {
                  identifier: emailAddress,
                  metadata: { name: from.split("<")[0].trim() },
                });
              }
            }
          }
        } catch (error) {
          logError(error, messageId);
        }
      })
    );
  }

  getTableTitle() {
    return "Email Subjects";
  }

  formatOptionText(item) {
    return `${item.identifier} (${item.count} emails)`;
  }
}
