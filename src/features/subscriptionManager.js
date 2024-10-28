import { EmailManager } from "./emailManager.js";
import {
  extractEmailAddress,
  logError,
  showCustomModal,
  getHeaderValue,
} from "../utils/utils.js";
import { LanguageDetector } from "../utils/languageDetector.js";
import { fetchEmailDetails, fetchEmails, delay } from "../utils/api.js";
import { sanitizeEmailAddress } from "../utils/sanitization.js";
import { SecureStorage } from "../utils/storage.js";

export class SubscriptionManager extends EmailManager {
  // Initialize subscription manager with cache, UI elements, and unsubscribe tracking
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

  // Fetch and process subscription emails for a specific year using user's detected languages
  async fetchByYear(token, year) {
    this.clearCache();
    this.unsubscribedEmails.clear();

    try {
      // Get user's detected languages or default to English
      const userLanguages = (await SecureStorage.get("userLanguages")) || [
        "en",
      ];
      const languageDetector = new LanguageDetector();

      // Build search query with multilanguage support
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

      // Process emails to find subscription senders
      const subscriptions = await this.processSubscriptionEmails(
        token,
        emailIds
      );

      // Get email counts for each subscription
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

  // Process emails in batches to find subscription senders with unsubscribe links
  async processSubscriptionEmails(token, messageIds, batchSize = 20) {
    const subscriptionsMap = new Map();

    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (messageId) => {
          try {
            const emailData = await fetchEmailDetails(token, messageId);
            const headers = emailData?.headers;
            if (!headers) return;

            // Only process emails with unsubscribe headers
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
              // Store subscription info with sender name and unsubscribe link
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

      // Add delay between batches to avoid rate limits
      if (i + batchSize < messageIds.length) {
        await delay(100);
      }
    }

    return Array.from(subscriptionsMap.values());
  }

  // Extract the first valid HTTP/HTTPS unsubscribe link from header
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

  // Mark an email as unsubscribed and update UI
  markAsUnsubscribed(emailAddress) {
    this.unsubscribedEmails.add(emailAddress);

    const selectElement = document.getElementById(this.elementIds[0]);
    if (!selectElement) return;

    const option = selectElement.querySelector(
      `option[value="${emailAddress}"]`
    );
    if (option && !option.textContent.includes("(unsubscribed)")) {
      option.textContent = option.textContent.replace(")", ") (unsubscribed)");
    }
  }

  populateYearOptions() {
    const yearSelect = document.getElementById("yearSelect");
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    yearSelect.innerHTML = "";

    for (let year = currentYear; year >= 2004; year--) {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      yearSelect.appendChild(option);
    }
  }

  // Format display text for subscription in dropdown
  formatOptionText(item) {
    const baseText = `${item.metadata.name || item.identifier} (${
      item.count
    } emails)`;
    return this.unsubscribedEmails.has(item.identifier)
      ? `${baseText} (unsubscribed)`
      : baseText;
  }

  // Get title for email list view using selected subscription name
  getTableTitle() {
    const selectElement = document.getElementById(this.elementIds[0]);
    const selectedOption = selectElement?.options[selectElement.selectedIndex];
    const subscriptionName =
      selectedOption?.textContent?.split(" (")[0] || "Subscription";
    return `Emails from ${subscriptionName}`;
  }
}
