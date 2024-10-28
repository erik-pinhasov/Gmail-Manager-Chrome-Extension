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
  // Initialize manager with cache configuration and UI elements
  constructor(config) {
    this.cache = new Cache({
      ttl: 15 * 60 * 1000, // 15 minutes cache lifetime
      maxSize: 1000,
      cacheKey: config.cacheKey,
    });
    this.elementIds = config.elementIds;
    this.type = config.type;
  }

  // Clear cache and hide UI elements
  clearCache() {
    this.cache.clear();
    this.toggleElements(false);
  }

  // Toggle visibility of UI elements based on state
  toggleElements(showElements) {
    this.elementIds.forEach((elementId) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.style.display = showElements ? "block" : "none";
      }
    });
  }

  // Update UI and cache after email deletion
  updateAfterDeletion(identifier) {
    const selectElement = document.getElementById(this.elementIds[0]);
    if (!selectElement) return;

    // Update display text to show zero count
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

    // Update cache with empty data
    const cacheKey = this.getCacheKey(identifier);
    this.cache.updateAfterDeletion(cacheKey);

    // Hide UI if all items have zero emails
    const allZeroCount = Array.from(selectElement.options).every((opt) =>
      opt.textContent.includes("(0 emails)")
    );

    if (allZeroCount) {
      this.toggleElements(false);
    }
  }

  // Handle batch deletion of emails with confirmation
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

  // Generate cache key using type prefix
  getCacheKey(identifier) {
    return `${this.type}:${identifier}`;
  }

  // Fetch and sort items with their email counts
  async fetchAndSortItems(token, items, queryBuilder) {
    // Process items in parallel with proper error handling
    const itemCounts = await Promise.all(
      items.map(async (item) => {
        try {
          const query = queryBuilder(item);
          const { emailCount, emailIds } = await fetchEmails(token, "", query);
          const cacheKey = this.getCacheKey(item.identifier);

          // Cache all item data
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

    // Filter out zero-count items and sort by count
    return itemCounts
      .filter((item) => item.count > 0)
      .sort((a, b) => b.count - a.count);
  }

  // Fetch and format email details for display
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

  // Get cached or fetch new email details
  async getEmailDetails(token, messageId) {
    // Check cache first
    if (this.cache.emailDetails?.has(messageId)) {
      return this.cache.emailDetails.get(messageId);
    }

    // Fetch and format email details
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

      // Initialize cache if needed
      if (!this.cache.emailDetails) {
        this.cache.emailDetails = new Map();
      }
      this.cache.emailDetails.set(messageId, formattedData);
      return formattedData;
    }
    return null;
  }

  // Display items in dropdown with counts
  displayItems(items) {
    this.toggleElements(false);

    if (!items || items.length === 0) {
      showCustomModal(`No ${this.type} found.`);
      return;
    }

    const selectElement = document.getElementById(this.elementIds[0]);
    selectElement.innerHTML = "";

    // Populate dropdown with formatted items
    items.forEach((item) => {
      const option = document.createElement("option");
      option.value = item.identifier;
      option.textContent = this.formatOptionText(item);
      selectElement.appendChild(option);
    });

    this.toggleElements(true);
  }

  // Abstract methods to be implemented by child classes
  getTableTitle() {
    throw new Error("getTableTitle must be implemented");
  }

  formatOptionText(item) {
    throw new Error("formatOptionText must be implemented");
  }
}
