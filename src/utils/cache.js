import * as storage from "./storage.js";
import { logError } from "../utils/utils.js";

export class Cache {
  // Initialize cache with TTL, size limits, and load persisted data
  constructor(options = {}) {
    this.ttl = options.ttl || 15 * 60 * 1000; // Default 15 minutes
    this.maxSize = options.maxSize || 1000;
    this.cacheKey = options.cacheKey || "defaultCache";
    this.timestamps = new Map();
    this.clear();
    this.loadPersistedCache();
  }

  // Reset all cache collections
  clear() {
    this.items = new Map();
    this.counts = new Map();
    this.messageIds = new Map();
    this.timestamps.clear();
  }

  // Save cache state to storage
  async persistCache() {
    try {
      const cacheData = {
        items: Array.from(this.items.entries()),
        counts: Array.from(this.counts.entries()),
        messageIds: Array.from(this.messageIds.entries()),
        timestamps: Array.from(this.timestamps.entries()),
        ttl: this.ttl,
        maxSize: this.maxSize,
      };
      await storage.SecureStorage.set(this.cacheKey, cacheData);
    } catch (error) {
      logError(error);
    }
  }

  // Load previously saved cache state
  async loadPersistedCache() {
    try {
      const cacheData = await storage.SecureStorage.get(this.cacheKey);
      if (cacheData) {
        // Restore all cache collections
        this.items = new Map(cacheData.items);
        this.counts = new Map(cacheData.counts);
        this.messageIds = new Map(cacheData.messageIds);
        this.timestamps = new Map(cacheData.timestamps);
        this.ttl = cacheData.ttl || this.ttl;
        this.maxSize = cacheData.maxSize || this.maxSize;
        this.cleanCache(); // Remove expired items
      }
    } catch (error) {
      logError(error);
      this.clear();
    }
  }

  // Add or update item with size management
  setItem(id, item) {
    this.cleanCache();
    // Remove oldest item if cache is full
    if (this.items.size >= this.maxSize) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) this.deleteItem(oldestKey);
    }
    this.items.set(id, item);
    this.timestamps.set(id, Date.now());
    this.persistCache();
  }

  // Update email count for an item
  setCount(id, count) {
    this.counts.set(id, count);
    this.timestamps.set(id, Date.now());
    this.persistCache();
  }

  // Update message IDs for an item
  setMessageIds(id, messageIds) {
    this.messageIds.set(id, messageIds);
    this.timestamps.set(id, Date.now());
    this.persistCache();
  }

  // Reset item data after deletion
  updateAfterDeletion(id) {
    this.counts.set(id, 0);
    this.messageIds.set(id, []);
    this.timestamps.set(id, Date.now());
    this.persistCache();
  }

  // Remove expired items from cache
  cleanCache() {
    const now = Date.now();
    let hasChanges = false;
    for (const [id, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > this.ttl) {
        this.deleteItem(id);
        hasChanges = true;
      }
    }
    if (hasChanges) this.persistCache();
  }

  // Remove item from all collections
  deleteItem(id) {
    this.items.delete(id);
    this.counts.delete(id);
    this.messageIds.delete(id);
    this.timestamps.delete(id);
  }

  // Get item if not expired
  getItem(id) {
    const timestamp = this.timestamps.get(id);
    if (!timestamp || Date.now() - timestamp > this.ttl) {
      this.deleteItem(id);
      this.persistCache();
      return null;
    }
    return this.items.get(id);
  }

  // Find oldest item in cache
  getOldestKey() {
    let oldestTime = Date.now();
    let oldestKey = null;

    for (const [key, timestamp] of this.timestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }
}
