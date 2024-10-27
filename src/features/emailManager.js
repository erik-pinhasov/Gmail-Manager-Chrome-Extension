import {
  showCustomModal,
  getHeaderValue,
  formatDate,
  formatTime,
  confirmDeletion,
  logError,
} from "../utils/utils.js";
import { Cache } from "../utils/cache.js";
import { fetchEmails, fetchEmailDetails } from "../utils/api.js";

export class EmailManager {
  constructor(config) {
    this.cache = new Cache({
      ttl: 15 * 60 * 1000,
      maxSize: 1000,
      cacheKey: config.cacheKey,
    });
    this.elementIds = config.elementIds;
    this.type = config.type;
  }

  clearCache() {
    this.cache.clear();
    this.toggleElements(false);
  }

  toggleElements(showElements) {
    this.elementIds.forEach((elementId) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = showElements ? "block" : "none";
      }
    });
  }

  updateAfterDeletion(identifier) {
    const selectElement = document.getElementById(this.elementIds[0]);
    if (!selectElement) return;

    const option = selectElement.querySelector(`option[value="${identifier}"]`);
    if (option) {
      const metadata = this.cache.items.get(identifier);
      const item = {
        identifier,
        metadata,
        count: 0,
      };

      if (metadata) {
        option.textContent = this.formatOptionText(item);
      }
    }

    const cacheKey = this.getCacheKey(identifier);
    this.cache.updateAfterDeletion(cacheKey);

    const allZeroCount = Array.from(selectElement.options).every((opt) =>
      opt.textContent.includes("(0 emails)")
    );

    if (allZeroCount) {
      this.toggleElements(false);
    }
  }

  async batchDelete(token, identifier) {
    const cacheKey = this.getCacheKey(identifier);
    const messageIds = this.cache.messageIds.get(cacheKey);
    const metadata = this.cache.items.get(identifier);
    const displayName = metadata?.labelName || identifier;

    if (messageIds && messageIds.length > 0) {
      confirmDeletion(token, messageIds, displayName, (success) => {
        if (success) {
          this.updateAfterDeletion(identifier);
        }
      });
    } else {
      showCustomModal(`No emails found for "${displayName}".`);
    }
  }

  getCacheKey(identifier) {
    return `${this.type}:${identifier}`;
  }

  async fetchAndSortItems(token, items, queryBuilder) {
    const itemCounts = await Promise.all(
      items.map(async (item) => {
        try {
          const query = queryBuilder(item);
          const { emailCount, emailIds } = await fetchEmails(token, "", query);
          const cacheKey = this.getCacheKey(item.identifier);

          this.cache.setMessageIds(cacheKey, emailIds);
          this.cache.setCount(cacheKey, emailCount);

          if (item.metadata) {
            this.cache.setItem(item.identifier, item.metadata);
          }

          return {
            ...item,
            count: emailCount,
          };
        } catch (error) {
          logError(error, item);
          return { ...item, count: 0 };
        }
      })
    );

    return itemCounts
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  async fetchEmailDetails(token, messageIds, columns) {
    const detailsPromises = messageIds.map((messageId) =>
      this.getEmailDetails(token, messageId)
    );

    const details = await Promise.all(detailsPromises);
    const validDetails = details.filter((detail) => detail !== null);

    if (validDetails.length === 0) {
      showCustomModal("No email details could be retrieved.");
      return null;
    }

    return {
      tableTitle: this.getTableTitle(),
      columns,
      dataItems: validDetails,
    };
  }

  async getEmailDetails(token, messageId) {
    if (this.cache.emailDetails?.has(messageId)) {
      return this.cache.emailDetails.get(messageId);
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

      if (!this.cache.emailDetails) {
        this.cache.emailDetails = new Map();
      }
      this.cache.emailDetails.set(messageId, formattedData);
      return formattedData;
    }
    return null;
  }

  displayItems(items) {
    this.toggleElements(false);

    if (!items || items.length === 0) {
      showCustomModal(`No ${this.type} found.`);
      return;
    }

    const selectElement = document.getElementById(this.elementIds[0]);
    selectElement.innerHTML = "";

    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.identifier;
      option.textContent = this.formatOptionText(item);
      selectElement.appendChild(option);
    });

    this.toggleElements(true);
  }

  getTableTitle() {
    throw new Error("getTableTitle must be implemented");
  }

  formatOptionText(item) {
    throw new Error("formatOptionText must be implemented");
  }
}
