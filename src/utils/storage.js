import { logError } from "../utils/utils.js";

export const SecureStorage = {
  async set(key, value) {
    if (!key || typeof key !== "string") {
      throw new Error("Invalid storage key");
    }

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
          resolve(result[key]);
        }
      });
    });
  },

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
