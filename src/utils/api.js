import { SecureStorage } from "../utils/storage.js";
import { showCustomModal, logError } from "../utils/utils.js";

// Validates Gmail OAuth token format
function isValidToken(token) {
  return (
    typeof token === "string" && token.length > 0 && token.startsWith("ya29.")
  );
}

// Creates a promise-based delay
export async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Makes authenticated requests to Gmail API
async function makeRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
      ...options.headers,
    },
  });

  if (response.status === 429) {
    throw { status: 429 };
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (response.status !== 204) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return response.json();
    }
  }

  return null;
}

// Verifies if token is still valid with Google
async function checkTokenExpiry(token) {
  try {
    await makeRequest("https://www.googleapis.com/oauth2/v1/tokeninfo", {
      token,
    });
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}

// Handles token errors by clearing storage and optionally requesting new token
async function handleTokenError(error, interactive) {
  await SecureStorage.clear();
  if (!interactive) {
    throw new Error(error);
  }
  return getAuthToken(true);
}

// Gets and validates OAuth token for Gmail API access
export function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, async (token) => {
      try {
        if (chrome.runtime.lastError) {
          if (chrome.runtime.lastError.message.includes("OAuth2")) {
            const newToken = await handleTokenError(
              "Authentication required",
              interactive
            );
            resolve(newToken);
            return;
          }
          throw new Error(chrome.runtime.lastError.message);
        }

        if (!isValidToken(token)) {
          throw new Error("Invalid token format");
        }

        const isValid = await checkTokenExpiry(token);
        if (!isValid) {
          const newToken = await handleTokenError("Token expired", interactive);
          resolve(newToken);
          return;
        }

        resolve(token);
      } catch (error) {
        reject(error);
      }
    });
  });
}

// Makes API requests with retry logic for rate limits (429 errors)
export async function fetchWithRetries(url, token, retries = 3, delayMs = 200) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await makeRequest(url, { token });
    } catch (error) {
      if (error.status === 429) {
        await delay(delayMs * Math.pow(2, attempt));
        continue;
      }
      if (attempt === retries - 1) throw error;
      await delay(delayMs * Math.pow(2, attempt));
    }
  }
}

// Fetches emails with pagination support
export async function fetchEmails(token, labelId = "", query = "") {
  const maxResults = 1000;
  let emailCount = 0;
  let emailIds = [];

  const fetchEmailPage = async (pageToken = null) => {
    const params = new URLSearchParams({
      maxResults,
      q: query,
      ...(labelId && { labelIds: labelId }),
      ...(pageToken && { pageToken }),
    });

    const data = await fetchWithRetries(
      `https://www.googleapis.com/gmail/v1/users/me/messages?${params}`,
      token
    );

    if (data.messages) {
      emailCount += data.messages.length;
      emailIds.push(...data.messages.map((msg) => msg.id));
    }

    if (data.nextPageToken) {
      await fetchEmailPage(data.nextPageToken);
    }
  };

  try {
    await fetchEmailPage();
    return { emailCount, emailIds };
  } catch (error) {
    logError(error);
    throw error;
  }
}

// Fetches email headers for a specific message ID
export async function fetchEmailDetails(token, messageId) {
  try {
    const url = `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?fields=payload.headers`;
    const data = await fetchWithRetries(url, token);
    return data.payload || null;
  } catch (error) {
    logError(error);
    return null;
  }
}

// Deletes emails in batches of 1000
export async function deleteEmails(token, messageIds) {
  const batchSize = 1000;

  const deleteBatch = async (ids) => {
    try {
      const response = await fetch(
        "https://www.googleapis.com/gmail/v1/users/me/messages/batchDelete",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids }),
        }
      );

      if (!response.ok) {
        throw new Error(`Delete failed with status: ${response.status}`);
      }

      return true;
    } catch (error) {
      logError(error);
      throw error;
    }
  };

  try {
    // Delete in batches
    for (let i = 0; i < messageIds.length; i += batchSize) {
      const batch = messageIds.slice(i, i + batchSize);
      await deleteBatch(batch);
      if (i + batchSize < messageIds.length) {
        await delay(100);
      }
    }
    return true;
  } catch (error) {
    logError(error);
    showCustomModal("Error occurred while deleting emails.");
    return false;
  }
}
// Handles user logout and token cleanup
export async function logout(token) {
  if (!token) {
    throw new Error("No token provided for logout");
  }

  try {
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);

    await Promise.all([
      new Promise((resolve) =>
        chrome.identity.removeCachedAuthToken({ token }, resolve)
      ),
      new Promise((resolve) =>
        chrome.identity.clearAllCachedAuthTokens(resolve)
      ),
      setStorageData({ loggedIn: false, token: null }),
    ]);
  } catch (error) {
    logError(error);
    await Promise.all([
      new Promise((resolve) =>
        chrome.identity.removeCachedAuthToken({ token }, resolve)
      ),
      new Promise((resolve) =>
        chrome.identity.clearAllCachedAuthTokens(resolve)
      ),
      setStorageData({ loggedIn: false, token: null }),
    ]);
    throw error;
  }
}

// Storage helper functions
export const setStorageData = (data) => SecureStorage.set("authData", data);
export const getStorageData = () => SecureStorage.get("authData");
export const getUserInfo = () =>
  new Promise((resolve) =>
    chrome.identity.getProfileUserInfo({ accountStatus: "ANY" }, resolve)
  );
