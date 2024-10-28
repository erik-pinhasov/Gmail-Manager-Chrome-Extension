import { logError } from "../utils/utils.js";

export const SecureStorage = {
  // Store data in Chrome's local storage with type safety
  async set(key, value) {
    if (!key || typeof key !== "string") {
      throw new Error("Invalid storage key");
    }

    // Ensure value is safely stringified
    const safeValue =
      typeof value === "object" ? JSON.stringify(value) : String(value);

    return new Promise((resolve) => {
      chrome.storage.local.set({ [key]: safeValue }, () => {
        if (chrome.runtime.lastError) {
          logError(error, chrome.runtime.lastError);
          resolve(false);
        }
        resolve(true);
      });
    });
  },

  // Retrieve and parse data from storage
  async get(key) {
    if (!key || typeof key !== "string") {
      throw new Error("Invalid storage key");
    }

    return new Promise((resolve) => {
      chrome.storage.local.get([key], (result) => {
        if (chrome.runtime.lastError) {
          logError(error, chrome.runtime.lastError);
          resolve(null);
        }

        try {
          const value = result[key];
          resolve(value ? JSON.parse(value) : null);
        } catch {
          resolve(result[key]); // Return raw value if parsing fails
        }
      });
    });
  },

  // Clear all stored data
  async clear() {
    return new Promise((resolve) => {
      chrome.storage.local.clear(() => {
        if (chrome.runtime.lastError) {
          logError(error, chrome.runtime.lastError);
          resolve(false);
        }
        resolve(true);
      });
    });
  },
};
