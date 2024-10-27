import { EmailManager } from "./emailManager.js";
import {
  extractEmailAddress,
  logError,
  showCustomModal,
  getHeaderValue,
} from "../utils/utils.js";
import { LanguageDetector } from "../utils/languageDetector.js";
import { fetchEmailDetails, fetchEmails } from "../utils/api.js";
import { sanitizeEmailAddress } from "../utils/sanitization.js";
import { SecureStorage } from "../utils/storage.js";

export class SubscriptionManager extends EmailManager {
  constructor() {
    super({
      cacheKey: "subscriptionCache",
      elementIds: [
        "subscriptionSelect",
        "viewSubscriptionEmails",
        "deleteSubscription",
        "unsubscribeButton",
      ],
      type: "subscription",
    });
    this.unsubscribedEmails = new Set();
  }

  async fetchByYear(token, year) {
    this.clearCache();
    this.unsubscribedEmails.clear();

    try {
      const userLanguages = (await SecureStorage.get("userLanguages")) || [
        "en",
      ];
      const languageDetector = new LanguageDetector();

      const searchQuery = languageDetector.buildSearchQuery(
        year,
        userLanguages
      );

      const { emailCount, emailIds } = await fetchEmails(
        token,
        "",
        searchQuery
      );
      if (emailCount === 0) {
        showCustomModal("No subscriptions found for the selected year.");
        return [];
      }

      const subscriptions = await this.processSubscriptionEmails(
        token,
        emailIds
      );
      return this.fetchAndSortItems(
        token,
        subscriptions,
        (sub) => `in:anywhere from:${sub.identifier}`
      );
    } catch (error) {
      logError(error);
      showCustomModal("Error fetching subscriptions. Please try again.");
      return [];
    }
  }

  async processSubscriptionEmails(token, messageIds) {
    const subscriptionsMap = new Map();

    for (let i = 0; i < messageIds.length; i += 20) {
      const batch = messageIds.slice(i, i + 20);

      await Promise.all(
        batch.map(async (messageId) => {
          try {
            const emailData = await fetchEmailDetails(token, messageId);
            const headers = emailData?.headers;
            if (!headers) {
              return;
            }

            const unsubscribeHeader = getHeaderValue(
              headers,
              "List-Unsubscribe"
            );
            if (!unsubscribeHeader) return;

            const fromHeader = getHeaderValue(headers, "From");

            if (!fromHeader) return;

            const emailAddress = sanitizeEmailAddress(
              extractEmailAddress(fromHeader)
            );
            if (!emailAddress || subscriptionsMap.has(emailAddress)) return;

            const unsubscribeLink =
              this.extractUnsubscribeLink(unsubscribeHeader);
            if (unsubscribeLink) {
              subscriptionsMap.set(emailAddress, {
                identifier: emailAddress,
                metadata: {
                  name: fromHeader.split("<")[0].trim(),
                  unsubscribeLink,
                },
              });
            }
          } catch (error) {
            logError(error, messageId);
          }
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return Array.from(subscriptionsMap.values());
  }
  extractUnsubscribeLink(header) {
    const urls = header
      .split(",")
      .map((url) => url.trim().replace(/[<>]/g, ""));
    return urls.find((url) => {
      if (url.startsWith("mailto:")) return false;
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });
  }

  markAsUnsubscribed(emailAddress) {
    this.unsubscribedEmails.add(emailAddress);

    const selectElement = document.getElementById(this.elementIds[0]);
    if (!selectElement) return;

    const option = selectElement.querySelector(
      `option[value="${emailAddress}"]`
    );
    if (option) {
      const currentText = option.textContent;
      if (!currentText.includes("(unsubscribed)")) {
        option.textContent = currentText.replace(")", ") (unsubscribed)");
      }
    }
  }

  formatOptionText(item) {
    const baseText = `${item.metadata.name || item.identifier} (${
      item.count
    } emails)`;
    return this.unsubscribedEmails.has(item.identifier)
      ? `${baseText} (unsubscribed)`
      : baseText;
  }

  getTableTitle() {
    const selectElement = document.getElementById(this.elementIds[0]);
    const selectedOption = selectElement?.options[selectElement.selectedIndex];
    const subscriptionName =
      selectedOption?.textContent?.split(" (")[0] || "Subscription";
    return `Emails from ${subscriptionName}`;
  }
}
