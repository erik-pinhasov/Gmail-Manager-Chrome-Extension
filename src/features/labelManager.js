// labelManager.js

import { EmailManager } from "./emailManager.js";
import { showCustomModal, logError } from "../utils/utils.js";
import { fetchWithRetries, fetchEmails } from "../utils/api.js";

export class LabelManager extends EmailManager {
  constructor() {
    super({
      cacheKey: "labelCache",
      elementIds: ["labelSelect", "deleteByLabel"],
      type: "label",
    });
  }

  async fetchLabels(token) {
    this.clearCache();
    const url = "https://www.googleapis.com/gmail/v1/users/me/labels";

    try {
      const data = await fetchWithRetries(url, token);
      if (!data.labels || !Array.isArray(data.labels)) {
        showCustomModal("No labels found in your Gmail account.");
        return [];
      }

      // Process all labels
      const labelsArray = data.labels.map((label) => ({
        identifier: label.id,
        metadata: {
          labelName: this.formatLabelName(label.name),
          originalName: label.name, // Keep original name for reference
        },
      }));

      // Fetch email counts for all labels
      const labelCounts = await Promise.all(
        labelsArray.map(async (label) => {
          try {
            const { emailCount, emailIds } = await fetchEmails(
              token,
              label.identifier,
              ""
            );
            const cacheKey = this.getCacheKey(label.identifier);

            this.cache.setMessageIds(cacheKey, emailIds || []);
            this.cache.setCount(cacheKey, emailCount);

            // Store the metadata with the formatted name
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

  formatLabelName(labelName) {
    if (labelName.startsWith("CATEGORY_")) {
      labelName = labelName.replace("CATEGORY_", "");
    }
    return labelName
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  }

  getTableTitle() {
    return "Labeled Emails";
  }

  formatOptionText(item) {
    return `${item.metadata.labelName} (${item.count} emails)`;
  }
}
