import { EmailManager } from "./emailManager.js";
import { showCustomModal, logError } from "../utils/utils.js";
import { fetchWithRetries, fetchEmails } from "../utils/api.js";

export class LabelManager extends EmailManager {
  // Initialize label manager with cache and UI configuration
  constructor() {
    super({
      cacheKey: "labelCache",
      elementIds: ["labelSelect", "deleteByLabel"],
      type: "label",
    });
  }

  // Fetch and process all Gmail labels with their email counts
  async fetchLabels(token) {
    this.clearCache();
    const url = "https://www.googleapis.com/gmail/v1/users/me/labels";

    try {
      const data = await fetchWithRetries(url, token);
      if (!data.labels || !Array.isArray(data.labels)) {
        showCustomModal("No labels found in your Gmail account.");
        return [];
      }

      // Transform labels into standard format
      const labelsArray = data.labels.map((label) => ({
        identifier: label.id,
        metadata: {
          labelName: this.formatLabelName(label.name),
          originalName: label.name,
        },
      }));

      // Fetch email counts for each label in parallel
      const labelCounts = await Promise.all(
        labelsArray.map(async (label) => {
          try {
            const { emailCount, emailIds } = await fetchEmails(
              token,
              label.identifier,
              ""
            );
            const cacheKey = this.getCacheKey(label.identifier);

            // Cache all label data
            this.cache.setMessageIds(cacheKey, emailIds || []);
            this.cache.setCount(cacheKey, emailCount);
            this.cache.setItem(label.identifier, label.metadata);

            return {
              ...label,
              count: emailCount,
            };
          } catch (error) {
            logError(error, label);
            return {
              ...label,
              count: 0,
            };
          }
        })
      );

      return labelCounts.sort((a, b) => b.count - a.count);
    } catch (error) {
      logError(error);
      showCustomModal(`Error fetching labels: ${error.message}`);
      return [];
    }
  }

  // Format Gmail label names for display
  formatLabelName(labelName) {
    try {
      if (labelName.startsWith("CATEGORY_")) {
        labelName = labelName.replace("CATEGORY_", "");
      }
      return labelName
        .split("_")
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(" ");
    } catch (error) {
      logError(error, labelName);
      return labelName; // Return original name if formatting fails
    }
  }

  // Get title for email list view
  getTableTitle() {
    return "Labeled Emails";
  }

  // Format display text for label in dropdown
  formatOptionText(item) {
    return `${item.metadata.labelName} (${item.count} emails)`;
  }
}
