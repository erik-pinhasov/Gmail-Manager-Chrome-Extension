// common.js
import { showCustomModal, fetchWithRetries } from "./util.js";

export async function fetchEmails(token, labelId = "", query = "") {
  let emailCount = 0;
  let emailIds = [];
  const maxResults = 1000; // Increased page size

  async function fetchPage(pageToken = null) {
    const params = new URLSearchParams({
      maxResults,
      q: query,
      ...(labelId && { labelIds: labelId }),
      ...(pageToken && { pageToken }),
    });

    try {
      const data = await fetchWithRetries(
        `https://www.googleapis.com/gmail/v1/users/me/messages?${params}`,
        token
      );

      if (data.messages) {
        emailCount += data.messages.length;
        emailIds.push(...data.messages.map((msg) => msg.id));
      }

      if (data.nextPageToken) {
        await fetchPage(data.nextPageToken);
      }
    } catch (error) {
      console.error("Failed to fetch emails:", error);
      throw error;
    }
  }

  await fetchPage();
  return { emailCount, emailIds };
}

export async function fetchEmailDetails(token, messageId) {
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?fields=payload.headers`;

  try {
    const data = await fetchWithRetries(url, token);
    return data.payload || null;
  } catch (error) {
    console.error("Error fetching email details:", error);
    return null;
  }
}

export async function deleteEmails(token, messageIds) {
  const batchSize = 1000;

  async function deleteInBatches(ids) {
    const batch = ids.slice(0, batchSize);
    const remaining = ids.slice(batchSize);

    try {
      const response = await fetch(
        `https://www.googleapis.com/gmail/v1/users/me/messages/batchDelete`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: batch }),
        }
      );

      if (!response.ok) {
        throw new Error(`Delete failed with status: ${response.status}`);
      }

      if (remaining.length > 0) {
        await deleteInBatches(remaining);
      }
    } catch (error) {
      console.error("Error deleting emails:", error);
      throw error;
    }
  }

  try {
    await deleteInBatches(messageIds);
    return true;
  } catch (error) {
    showCustomModal("Error occurred while deleting emails.");
    console.error("Error in deleteEmails:", error);
    return false;
  }
}

export function confirmDeletion(token, messageIds, itemName) {
  showCustomModal(
    `Delete all emails from "${itemName}"?`,
    async () => {
      try {
        const success = await deleteEmails(token, messageIds);
        if (success) {
          showCustomModal(`${itemName} deleted successfully!`);
        }
      } catch (error) {
        console.error("Error in confirmDeletion:", error);
        showCustomModal(`Error deleting emails: ${error.message}`);
      }
    },
    true
  );
}
