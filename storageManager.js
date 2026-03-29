/**
 * Storage Manager for HN Mark All Read
 * Handles local storage operations and sync with background service worker
 */

const StorageManager = {
  // Cache for quick access
  _cache: {
    marked_read_urls: {},
    marked_read_comments: {},
    followed_items: {},
    hide_marked_urls: false,
    hide_marked_comments: false
  },

  _initialized: false,
  _initPromise: null,
  _pendingChanges: false,
  _syncDebounceTimer: null,

  /**
   * Wait for initialization to complete
   */
  ready() {
    return this._initPromise || Promise.resolve();
  },

  /**
   * Initialize storage manager and migrate from localStorage if needed
   */
  async init() {
    if (this._initialized) return;
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._doInit();
    return this._initPromise;
  },

  async _doInit() {

    // Check if we need to migrate from localStorage
    const migrated = await this._get('_migrated_from_localstorage');

    if (!migrated) {
      await this._migrateFromLocalStorage();
    }

    // Load data into cache
    await this._loadCache();
    this._initialized = true;

    // Listen for storage changes from other tabs/background
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        for (const key in changes) {
          if (key in this._cache) {
            this._cache[key] = changes[key].newValue;
          }
        }
      }
    });
  },

  /**
   * Migrate data from localStorage to chrome.storage.local
   */
  async _migrateFromLocalStorage() {
    const dataToMigrate = {};
    const keys = [
      'marked_read_urls',
      'marked_read_comments',
      'followed_items',
      'hide_marked_urls',
      'hide_marked_comments'
    ];

    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        try {
          // Try to parse as JSON for object values
          if (key.startsWith('hide_')) {
            dataToMigrate[key] = value === 'true';
          } else {
            dataToMigrate[key] = JSON.parse(value);
          }
        } catch (e) {
          dataToMigrate[key] = value;
        }
      }
    }

    // Save to chrome.storage.local
    if (Object.keys(dataToMigrate).length > 0) {
      await this._set(dataToMigrate);
    }

    // Mark as migrated
    await this._set({ _migrated_from_localstorage: true });

    console.log('HN Mark All Read: Migrated from localStorage to chrome.storage');
  },

  /**
   * Load all data into cache
   */
  async _loadCache() {
    const data = await this._get([
      'marked_read_urls',
      'marked_read_comments',
      'followed_items',
      'hide_marked_urls',
      'hide_marked_comments'
    ]);

    this._cache.marked_read_urls = data.marked_read_urls || {};
    this._cache.marked_read_comments = data.marked_read_comments || {};
    this._cache.followed_items = data.followed_items || {};
    this._cache.hide_marked_urls = data.hide_marked_urls || false;
    this._cache.hide_marked_comments = data.hide_marked_comments || false;

    // Clean up old data (older than 4 days)
    this._cleanupOldData();
  },

  /**
   * Clean up data older than 4 days
   */
  _cleanupOldData() {
    const now = Date.now();
    const maxAge = 4 * 24 * 60 * 60 * 1000; // 4 days
    let changed = false;

    // Clean marked_read_urls
    for (const url in this._cache.marked_read_urls) {
      if (now - this._cache.marked_read_urls[url] > maxAge) {
        delete this._cache.marked_read_urls[url];
        changed = true;
      }
    }

    // Clean marked_read_comments
    for (const id in this._cache.marked_read_comments) {
      if (now - this._cache.marked_read_comments[id] > maxAge) {
        delete this._cache.marked_read_comments[id];
        changed = true;
      }
    }

    // Clean followed_items
    for (const id in this._cache.followed_items) {
      if (now - this._cache.followed_items[id].time > maxAge) {
        delete this._cache.followed_items[id];
        changed = true;
      }
    }

    if (changed) {
      this._saveCache();
    }
  },

  /**
   * Get value from chrome.storage.local
   */
  _get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  },

  /**
   * Set value in chrome.storage.local
   */
  _set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  },

  /**
   * Save cache to storage and trigger sync
   */
  async _saveCache() {
    await this._set({
      marked_read_urls: this._cache.marked_read_urls,
      marked_read_comments: this._cache.marked_read_comments,
      followed_items: this._cache.followed_items,
      hide_marked_urls: this._cache.hide_marked_urls,
      hide_marked_comments: this._cache.hide_marked_comments
    });

    // Debounce sync trigger
    this._pendingChanges = true;
    if (this._syncDebounceTimer) {
      clearTimeout(this._syncDebounceTimer);
    }
    this._syncDebounceTimer = setTimeout(() => {
      this._triggerSync();
    }, 10000); // 10 second debounce
  },

  /**
   * Trigger background sync
   */
  async _triggerSync() {
    if (!this._pendingChanges) return;

    try {
      const response = await chrome.runtime.sendMessage({ action: 'sync' });
      if (response.success) {
        this._pendingChanges = false;
      }
    } catch (error) {
      // Background not available or sync failed, will retry on next alarm
      console.log('Sync trigger failed, will retry:', error.message);
    }
  },

  // ============ Public API ============

  /**
   * Get marked read URLs
   */
  getMarkedReadUrls() {
    return { ...this._cache.marked_read_urls };
  },

  /**
   * Mark URL as read
   */
  markUrlAsRead(url) {
    this._cache.marked_read_urls[url] = Date.now();
    this._saveCache();
  },

  /**
   * Check if URL is marked as read
   */
  isUrlMarkedRead(url) {
    return !!this._cache.marked_read_urls[url];
  },

  /**
   * Get marked read comments
   */
  getMarkedReadComments() {
    return { ...this._cache.marked_read_comments };
  },

  /**
   * Mark comment as read
   */
  markCommentAsRead(commentId) {
    this._cache.marked_read_comments[commentId] = Date.now();
    this._saveCache();
  },

  /**
   * Mark multiple comments as read
   */
  markCommentsAsRead(commentIds) {
    const now = Date.now();
    for (const id of commentIds) {
      this._cache.marked_read_comments[id] = now;
    }
    this._saveCache();
  },

  /**
   * Check if comment is marked as read
   */
  isCommentMarkedRead(commentId) {
    return !!this._cache.marked_read_comments[commentId];
  },

  /**
   * Get followed items
   */
  getFollowedItems() {
    return { ...this._cache.followed_items };
  },

  /**
   * Follow an item
   */
  followItem(itemId, readComments) {
    this._cache.followed_items[itemId] = {
      time: Date.now(),
      read_comments: readComments
    };
    this._saveCache();
  },

  /**
   * Unfollow an item
   */
  unfollowItem(itemId) {
    delete this._cache.followed_items[itemId];
    this._saveCache();
  },

  /**
   * Check if item is followed
   */
  isItemFollowed(itemId) {
    return !!this._cache.followed_items[itemId];
  },

  /**
   * Get followed item info
   */
  getFollowedItem(itemId) {
    return this._cache.followed_items[itemId] || null;
  },

  /**
   * Update followed item read comments count
   */
  updateFollowedItemComments(itemId, readComments) {
    if (this._cache.followed_items[itemId]) {
      this._cache.followed_items[itemId].read_comments = readComments;
      this._saveCache();
    }
  },

  /**
   * Get hide marked URLs preference
   */
  getHideMarkedUrls() {
    return this._cache.hide_marked_urls;
  },

  /**
   * Set hide marked URLs preference
   */
  setHideMarkedUrls(value) {
    this._cache.hide_marked_urls = !!value;
    this._saveCache();
  },

  /**
   * Get hide marked comments preference
   */
  getHideMarkedComments() {
    return this._cache.hide_marked_comments;
  },

  /**
   * Set hide marked comments preference
   */
  setHideMarkedComments(value) {
    this._cache.hide_marked_comments = !!value;
    this._saveCache();
  },

  // ============ Sync API ============

  /**
   * Check if user is authenticated with Google Drive
   */
  async isAuthenticated() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getSyncStatus' });
      return response.isAuthenticated;
    } catch {
      return false;
    }
  },

  /**
   * Authenticate with Google Drive
   */
  async authenticate() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'authenticate' });
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Sign out from Google Drive
   */
  async signOut() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'signOut' });
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Force sync now
   */
  async syncNow(forcePush = false) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'sync',
        forcePush
      });
      if (response.success) {
        // Reload cache after sync
        await this._loadCache();
      }
      return response;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  /**
   * Get sync status
   */
  async getSyncStatus() {
    try {
      return await chrome.runtime.sendMessage({ action: 'getSyncStatus' });
    } catch (error) {
      return {
        isAuthenticated: false,
        isSyncing: false,
        lastSyncTime: 0,
        error: error.message
      };
    }
  }
};

// Auto-initialize when loaded
StorageManager.init().catch(console.error);
