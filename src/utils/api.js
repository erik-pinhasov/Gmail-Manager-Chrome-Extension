export async function fetchWithRetries(url, token, retries = 5, delay = 500) {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 429 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetries(url, token, retries - 1, delay * 1.5);
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetries(url, token, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

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

export function getAuthToken(interactive) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

export function setStorageData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

export function getStorageData(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, resolve);
  });
}

export function getUserInfo() {
  return new Promise((resolve) => {
    chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, resolve);
  });
}

export async function logout(token) {
  if (!token) {
    throw new Error("No token provided for logout");
  }

  await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);
  await new Promise((resolve) =>
    chrome.identity.removeCachedAuthToken({ token }, resolve)
  );
  await new Promise((resolve) =>
    chrome.identity.clearAllCachedAuthTokens(resolve)
  );
  await setStorageData({ loggedIn: false, token: null });
}
