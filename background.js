/**
 * Background Service Worker for HN Mark All Read
 * Handles Google Drive sync and OAuth authentication
 */

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';
const SYNC_FILENAME = 'hn_markallread_sync.json';
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Store sync state
let syncState = {
  lastSyncTime: 0,
  isSyncing: false,
  isAuthenticated: false,
  fileId: null
};

/**
 * Get OAuth token using Chrome Identity API
 * @param {boolean} interactive - Whether to show auth prompt
 * @returns {Promise<string>} Access token
 */
async function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (token) {
        syncState.isAuthenticated = true;
        resolve(token);
      } else {
        reject(new Error('No token received'));
      }
    });
  });
}

/**
 * Remove cached auth token (for re-auth scenarios)
 * @param {string} token - Token to remove
 */
async function removeCachedToken(token) {
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve);
  });
}

/**
 * Make authenticated request to Google Drive API
 * @param {string} url - API URL
 * @param {object} options - Fetch options
 * @param {boolean} retry - Whether this is a retry after token refresh
 * @returns {Promise<Response>}
 */
async function driveRequest(url, options = {}, retry = false) {
  const token = await getAuthToken(false);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  });

  // Handle token expiration
  if (response.status === 401 && !retry) {
    await removeCachedToken(token);
    return driveRequest(url, options, true);
  }

  return response;
}

/**
 * Find the sync file in App Data folder
 * @returns {Promise<string|null>} File ID or null if not found
 */
async function findSyncFile() {
  const query = encodeURIComponent(`name='${SYNC_FILENAME}' and 'appDataFolder' in parents and trashed=false`);
  const url = `${DRIVE_API_BASE}/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`;

  const response = await driveRequest(url);

  if (!response.ok) {
    throw new Error(`Failed to search files: ${response.status}`);
  }

  const data = await response.json();

  if (data.files && data.files.length > 0) {
    syncState.fileId = data.files[0].id;
    return data.files[0];
  }

  return null;
}

/**
 * Create sync file in App Data folder
 * @param {object} content - Initial content
 * @returns {Promise<string>} File ID
 */
async function createSyncFile(content) {
  const metadata = {
    name: SYNC_FILENAME,
    parents: ['appDataFolder']
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

  const response = await driveRequest(
    `${DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id`,
    {
      method: 'POST',
      body: form
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to create file: ${response.status}`);
  }

  const data = await response.json();
  syncState.fileId = data.id;
  return data.id;
}

/**
 * Read sync file content from Google Drive
 * @param {string} fileId - File ID
 * @returns {Promise<object>} File content
 */
async function readSyncFile(fileId) {
  const response = await driveRequest(
    `${DRIVE_API_BASE}/files/${fileId}?alt=media`
  );

  if (!response.ok) {
    throw new Error(`Failed to read file: ${response.status}`);
  }

  return response.json();
}

/**
 * Update sync file content in Google Drive
 * @param {string} fileId - File ID
 * @param {object} content - New content
 * @returns {Promise<void>}
 */
async function updateSyncFile(fileId, content) {
  const response = await driveRequest(
    `${DRIVE_UPLOAD_BASE}/files/${fileId}?uploadType=media`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(content)
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update file: ${response.status}`);
  }
}

/**
 * Get local storage data
 * @returns {Promise<object>}
 */
async function getLocalData() {
  return new Promise((resolve) => {
    chrome.storage.local.get([
      'marked_read_urls',
      'marked_read_comments',
      'followed_items',
      'hide_marked_urls',
      'hide_marked_comments',
      'expiration_days',
      'sync_metadata'
    ], resolve);
  });
}

/**
 * Set local storage data
 * @param {object} data - Data to store
 * @returns {Promise<void>}
 */
async function setLocalData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, resolve);
  });
}

/**
 * Merge two data objects with conflict resolution (last-write-wins based on timestamps)
 * @param {object} local - Local data
 * @param {object} remote - Remote data
 * @returns {object} Merged data
 */
function mergeData(local, remote) {
  const merged = {};
  const keys = ['marked_read_urls', 'marked_read_comments', 'followed_items'];

  for (const key of keys) {
    const localObj = local[key] || {};
    const remoteObj = remote[key] || {};
    merged[key] = {};

    // Merge all keys, keeping the one with the later timestamp
    const allKeys = new Set([...Object.keys(localObj), ...Object.keys(remoteObj)]);

    for (const itemKey of allKeys) {
      const localValue = localObj[itemKey];
      const remoteValue = remoteObj[itemKey];

      if (localValue === undefined) {
        merged[key][itemKey] = remoteValue;
      } else if (remoteValue === undefined) {
        merged[key][itemKey] = localValue;
      } else {
        // Both exist - compare timestamps
        const localTime = typeof localValue === 'object' ? localValue.time : localValue;
        const remoteTime = typeof remoteValue === 'object' ? remoteValue.time : remoteValue;

        merged[key][itemKey] = localTime >= remoteTime ? localValue : remoteValue;
      }
    }
  }

  // Merge preferences (local wins for preferences)
  merged.hide_marked_urls = local.hide_marked_urls ?? remote.hide_marked_urls ?? false;
  merged.hide_marked_comments = local.hide_marked_comments ?? remote.hide_marked_comments ?? false;
  merged.expiration_days = local.expiration_days ?? remote.expiration_days ?? 4;

  return merged;
}

/**
 * Clean up old data based on configured expiration
 * @param {object} data - Data to clean
 * @returns {object} Cleaned data
 */
function cleanupOldData(data) {
  const now = Date.now();
  const days = data.expiration_days || 4;
  const maxAge = days * 24 * 60 * 60 * 1000;

  const cleaned = { ...data };
  const timestampKeys = ['marked_read_urls', 'marked_read_comments', 'followed_items'];

  for (const key of timestampKeys) {
    if (cleaned[key]) {
      const obj = { ...cleaned[key] };
      for (const itemKey in obj) {
        const timestamp = typeof obj[itemKey] === 'object' ? obj[itemKey].time : obj[itemKey];
        if (now - timestamp > maxAge) {
          delete obj[itemKey];
        }
      }
      cleaned[key] = obj;
    }
  }

  return cleaned;
}

/**
 * Perform sync with Google Drive
 * @param {boolean} forcePush - Force push local data (overwrite remote)
 * @returns {Promise<object>} Sync result
 */
async function performSync(forcePush = false) {
  if (syncState.isSyncing) {
    return { success: false, error: 'Sync already in progress' };
  }

  syncState.isSyncing = true;

  try {
    // Get local data
    let localData = await getLocalData();
    localData = cleanupOldData(localData);

    // Find or create remote file
    let fileInfo = await findSyncFile();

    if (!fileInfo) {
      // First sync - create file with local data
      const syncData = {
        ...localData,
        sync_metadata: {
          lastModified: Date.now(),
          version: 1
        }
      };
      await createSyncFile(syncData);
      await setLocalData(syncData);
      syncState.lastSyncTime = Date.now();

      return { success: true, action: 'created' };
    }

    // Read remote data
    const remoteData = await readSyncFile(fileInfo.id);

    if (forcePush) {
      // Force push - overwrite remote with local
      const syncData = {
        ...localData,
        sync_metadata: {
          lastModified: Date.now(),
          version: (remoteData.sync_metadata?.version || 0) + 1
        }
      };
      await updateSyncFile(fileInfo.id, syncData);
      await setLocalData(syncData);
    } else {
      // Merge local and remote
      const merged = mergeData(localData, remoteData);
      merged.sync_metadata = {
        lastModified: Date.now(),
        version: (remoteData.sync_metadata?.version || 0) + 1
      };

      // Update both local and remote
      await updateSyncFile(fileInfo.id, merged);
      await setLocalData(merged);
    }

    syncState.lastSyncTime = Date.now();
    return { success: true, action: 'synced' };

  } catch (error) {
    console.error('Sync failed:', error);
    return { success: false, error: error.message };
  } finally {
    syncState.isSyncing = false;
  }
}

/**
 * Sign out and clear auth
 */
async function signOut() {
  try {
    const token = await getAuthToken(false);

    // Revoke the token
    await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`);

    // Remove cached token
    await removeCachedToken(token);

    syncState.isAuthenticated = false;
    syncState.fileId = null;

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Delete remote sync file from Google Drive
 */
async function deleteRemoteData() {
  try {
    // Find the sync file
    const fileInfo = await findSyncFile();

    if (!fileInfo) {
      return { success: true, message: 'No remote data found' };
    }

    // Delete the file
    const response = await driveRequest(
      `${DRIVE_API_BASE}/files/${fileInfo.id}`,
      { method: 'DELETE' }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete file: ${response.status}`);
    }

    syncState.fileId = null;

    return { success: true };
  } catch (error) {
    console.error('Delete remote data failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete all local data
 */
async function deleteLocalData() {
  try {
    await new Promise((resolve) => {
      chrome.storage.local.clear(resolve);
    });

    return { success: true };
  } catch (error) {
    console.error('Delete local data failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get current sync status
 */
function getSyncStatus() {
  return {
    isAuthenticated: syncState.isAuthenticated,
    isSyncing: syncState.isSyncing,
    lastSyncTime: syncState.lastSyncTime,
    hasFileId: !!syncState.fileId
  };
}

// Message handler for content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const handleAsync = async () => {
    switch (message.action) {
      case 'authenticate':
        try {
          await getAuthToken(true);
          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }

      case 'sync':
        return performSync(message.forcePush);

      case 'signOut':
        return signOut();

      case 'getSyncStatus':
        return getSyncStatus();

      case 'getLocalData':
        return getLocalData();

      case 'setLocalData':
        await setLocalData(message.data);
        return { success: true };

      case 'deleteLocalData':
        return deleteLocalData();

      case 'deleteRemoteData':
        return deleteRemoteData();

      default:
        return { success: false, error: 'Unknown action' };
    }
  };

  handleAsync().then(sendResponse);
  return true; // Keep channel open for async response
});

// Set up periodic sync alarm
chrome.alarms.create('syncAlarm', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'syncAlarm') {
    // Only sync if we're authenticated
    getAuthToken(false)
      .then(() => performSync())
      .catch(() => {
        // Not authenticated, skip sync
      });
  }
});

// Sync when extension starts (if authenticated)
getAuthToken(false)
  .then(() => performSync())
  .catch(() => {
    // Not authenticated yet, that's okay
  });

console.log('HN Mark All Read: Background service worker loaded');
