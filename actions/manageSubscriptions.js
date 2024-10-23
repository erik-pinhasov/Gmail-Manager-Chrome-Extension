// manageSubscriptions.js
import {
  showCustomModal,
  getHeaderValue,
  createGmailApiUrl,
  fetchWithRetries,
  extractEmailAddress,
} from "./util.js";
import { fetchEmailDetails } from "./common.js";

const subscriptionCache = {
  emails: new Map(),
};

export function populateYearOptions() {
  const yearSelect = document.getElementById("yearSelect");
  const currentYear = new Date().getFullYear();

  for (let year = currentYear; year >= 2004; year--) {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = year;
    yearSelect.appendChild(option);
  }
}

export async function handleFetchSubscriptionsByYear(token, selectedYear) {
  subscriptionCache.emails.clear();
  await fetchSubsByYear(token, selectedYear);
  return generateDataPayload(selectedYear);
}

function createSearchQuery(year) {
  return `after:${year}/01/01 before:${year}/12/31 ("unsubscribe" OR "notifications" OR "alerts" OR "preferences" OR "mailing" OR "דיוור" OR "תפוצה" OR "לנהל")`;
}

async function fetchSubsByYear(token, year) {
  const processPage = async (pageToken = null) => {
    try {
      const data = await fetchWithRetries(
        createGmailApiUrl(createSearchQuery(year), pageToken),
        token
      );

      if (data.messages?.length) {
        await processSubsEmails(token, data.messages);

        if (data.nextPageToken) {
          await processPage(data.nextPageToken);
        }
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
    }
  };

  await processPage();
}

async function processSubsEmails(token, messages) {
  const batchSize = 20;
  const delay = 50;

  for (let i = 0; i < messages.length; i += batchSize) {
    await processEmailBatch(token, messages.slice(i, i + batchSize));

    if (i + batchSize < messages.length) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function processEmailBatch(token, batch) {
  await Promise.all(
    batch.map(async (message) => {
      try {
        const details = await fetchEmailDetails(token, message.id);
        const headers = details?.payload?.headers;
        if (!headers) return;

        const fromHeader = getHeaderValue(headers, "From");
        const emailAddress = extractEmailAddress(fromHeader)?.toLowerCase();
        const name = fromHeader?.split("<")[0]?.trim();

        if (!emailAddress || subscriptionCache.emails.has(emailAddress)) return;

        const unsubscribeHeader = getHeaderValue(headers, "List-Unsubscribe");
        const validLink = isValidUnsubscribeLink(unsubscribeHeader);

        if (validLink) {
          const totalEmails = await fetchEmailCountBySender(
            token,
            emailAddress
          );

          subscriptionCache.emails.set(emailAddress, {
            name,
            unsubscribeLink: validLink,
            count: totalEmails,
          });
        }
      } catch (error) {
        console.error(`Error processing message ${message.id}:`, error);
      }
    })
  );
}

async function fetchEmailCountBySender(token, emailAddress) {
  const query = `from:${emailAddress}`;
  const url = createGmailApiUrl(query);

  try {
    const data = await fetchWithRetries(url, token);
    return data.resultSizeEstimate || 0;
  } catch (error) {
    console.error(`Error fetching email count for ${emailAddress}:`, error);
    return 0;
  }
}

function isValidUnsubscribeLink(link) {
  if (!link) return null;

  const urls = link.split(",").map((url) => url.trim().replace(/[<>]/g, ""));

  return (
    urls.find((url) => {
      if (url.startsWith("mailto:")) return false;
      try {
        const parsedUrl = new URL(url);
        return (
          parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
        );
      } catch {
        return false;
      }
    }) || null
  );
}

function generateDataPayload(year) {
  return {
    tableTitle: `Subscriptions for ${year}`,
    columns: [
      { label: "Name", key: "name" },
      { label: "Email Address", key: "email" },
      { label: "Number of Emails", key: "count" },
      { label: "", key: "actions" },
    ],
    dataItems: Array.from(subscriptionCache.emails.entries())
      .map(([email, data]) => ({
        name: data.name,
        email,
        count: data.count,
        actions: `
          <button class="unsubscribe-btn" 
            data-email="${encodeURIComponent(email)}" 
            data-unsubscribe="${encodeURIComponent(data.unsubscribeLink)}">
            Unsubscribe
          </button>
          <button class="delete-emails-btn" 
            data-email="${encodeURIComponent(email)}">
            Delete All Emails
          </button>`,
      }))
      .sort((a, b) => b.count - a.count),
    rowsPerPage: 100,
  };
}
