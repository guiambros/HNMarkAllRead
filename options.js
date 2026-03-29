/**
 * Options page script for HN Mark All Read
 */

// DOM elements
const syncStatus = document.getElementById('sync-status');
const statusText = document.getElementById('status-text');
const connectBtn = document.getElementById('connect-btn');
const syncNowBtn = document.getElementById('sync-now-btn');
const disconnectBtn = document.getElementById('disconnect-btn');
const syncInfo = document.getElementById('sync-info');
const deleteRemoteBtn = document.getElementById('delete-remote-btn');
const showCacheBtn = document.getElementById('show-cache-btn');
const hideCacheBtn = document.getElementById('hide-cache-btn');
const deleteLocalBtn = document.getElementById('delete-local-btn');
const debugContainer = document.getElementById('debug-container');
const debugOutput = document.getElementById('debug-output');
const copyCacheBtn = document.getElementById('copy-cache-btn');
const statUrls = document.getElementById('stat-urls');
const statComments = document.getElementById('stat-comments');
const statFollowed = document.getElementById('stat-followed');
const expirationDays = document.getElementById('expiration-days');
const saveIndicator = document.getElementById('save-indicator');

/**
 * Update the UI based on sync status
 */
async function updateUI() {
  try {
    const status = await chrome.runtime.sendMessage({ action: 'getSyncStatus' });
    const data = await chrome.runtime.sendMessage({ action: 'getLocalData' });

    // Update connection status
    if (status.isAuthenticated) {
      syncStatus.className = 'status connected';
      statusText.textContent = 'Connected to Google Drive';
      connectBtn.style.display = 'none';
      syncNowBtn.style.display = 'inline-block';
      disconnectBtn.style.display = 'inline-block';
      deleteRemoteBtn.style.display = 'inline-block';

      // Show last sync time
      if (status.lastSyncTime > 0) {
        const ago = getTimeAgo(status.lastSyncTime);
        syncInfo.textContent = `Last synced: ${ago}`;
      } else {
        syncInfo.textContent = 'Not synced yet';
      }
    } else {
      syncStatus.className = 'status disconnected';
      statusText.textContent = 'Not connected';
      connectBtn.style.display = 'inline-block';
      syncNowBtn.style.display = 'none';
      disconnectBtn.style.display = 'none';
      deleteRemoteBtn.style.display = 'none';
      syncInfo.textContent = 'Connect to sync your data across devices';
    }

    // Update statistics
    const urls = data.marked_read_urls || {};
    const comments = data.marked_read_comments || {};
    const followed = data.followed_items || {};

    statUrls.textContent = Object.keys(urls).length;
    statComments.textContent = Object.keys(comments).length;
    statFollowed.textContent = Object.keys(followed).length;

  } catch (error) {
    console.error('Error updating UI:', error);
    statusText.textContent = 'Error loading status';
  }
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return '1 hour ago';
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 172800) return '1 day ago';
  return `${Math.floor(seconds / 86400)} days ago`;
}

/**
 * Connect to Google Drive
 */
async function connect() {
  connectBtn.disabled = true;
  connectBtn.textContent = 'Connecting...';

  try {
    const result = await chrome.runtime.sendMessage({ action: 'authenticate' });

    if (result.success) {
      // Trigger initial sync
      connectBtn.textContent = 'Syncing...';
      await chrome.runtime.sendMessage({ action: 'sync' });
      await updateUI();
    } else {
      alert('Failed to connect: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Failed to connect: ' + error.message);
  } finally {
    connectBtn.disabled = false;
    connectBtn.textContent = 'Connect to Google Drive';
  }
}

/**
 * Sync now
 */
async function syncNow() {
  syncNowBtn.disabled = true;
  syncNowBtn.textContent = 'Syncing...';

  try {
    const result = await chrome.runtime.sendMessage({ action: 'sync' });

    if (result.success) {
      await updateUI();
    } else {
      alert('Sync failed: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Sync failed: ' + error.message);
  } finally {
    syncNowBtn.disabled = false;
    syncNowBtn.textContent = 'Sync Now';
  }
}

/**
 * Disconnect from Google Drive
 */
async function disconnect() {
  if (!confirm('Are you sure you want to disconnect? Your local data will be preserved, but syncing will stop.')) {
    return;
  }

  disconnectBtn.disabled = true;
  disconnectBtn.textContent = 'Disconnecting...';

  try {
    const result = await chrome.runtime.sendMessage({ action: 'signOut' });

    if (result.success) {
      await updateUI();
    } else {
      alert('Failed to disconnect: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Failed to disconnect: ' + error.message);
  } finally {
    disconnectBtn.disabled = false;
    disconnectBtn.textContent = 'Disconnect';
  }
}

/**
 * Show cache data
 */
async function showCache() {
  try {
    const data = await chrome.runtime.sendMessage({ action: 'getLocalData' });

    // Format the data nicely
    const formatted = JSON.stringify(data, null, 2);
    debugOutput.textContent = formatted;
    debugContainer.classList.add('visible');
    showCacheBtn.style.display = 'none';
    hideCacheBtn.style.display = 'inline-block';
  } catch (error) {
    debugOutput.textContent = 'Error loading cache: ' + error.message;
    debugContainer.classList.add('visible');
  }
}

/**
 * Hide cache data
 */
function hideCache() {
  debugContainer.classList.remove('visible');
  showCacheBtn.style.display = 'inline-block';
  hideCacheBtn.style.display = 'none';
}

/**
 * Copy cache data to clipboard
 */
async function copyCache() {
  try {
    await navigator.clipboard.writeText(debugOutput.textContent);
    copyCacheBtn.textContent = 'Copied!';
    copyCacheBtn.classList.add('copied');
    setTimeout(() => {
      copyCacheBtn.textContent = 'Copy';
      copyCacheBtn.classList.remove('copied');
    }, 2000);
  } catch (error) {
    console.error('Failed to copy:', error);
  }
}

/**
 * Delete local cache data
 */
async function deleteLocalData() {
  if (!confirm('Are you sure you want to delete all local data? This will clear all your read URLs, comments, and followed items from this device.')) {
    return;
  }

  deleteLocalBtn.disabled = true;
  deleteLocalBtn.textContent = 'Deleting...';

  try {
    const result = await chrome.runtime.sendMessage({ action: 'deleteLocalData' });

    if (result.success) {
      alert('Local data deleted successfully.');
      await updateUI();
      // Hide cache output if visible
      hideCache();
    } else {
      alert('Failed to delete local data: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Failed to delete local data: ' + error.message);
  } finally {
    deleteLocalBtn.disabled = false;
    deleteLocalBtn.textContent = 'Delete Local Data';
  }
}

/**
 * Load expiration setting
 */
async function loadExpirationSetting() {
  try {
    const data = await chrome.runtime.sendMessage({ action: 'getLocalData' });
    const days = data.expiration_days || 4;
    expirationDays.value = days.toString();
  } catch (error) {
    console.error('Error loading expiration setting:', error);
  }
}

/**
 * Save expiration setting
 */
async function saveExpirationSetting() {
  const days = parseInt(expirationDays.value, 10);
  try {
    await chrome.runtime.sendMessage({
      action: 'setLocalData',
      data: { expiration_days: days }
    });

    // Show save indicator immediately
    saveIndicator.classList.add('visible');
    setTimeout(() => {
      saveIndicator.classList.remove('visible');
    }, 2000);

    // Trigger sync in background (don't wait)
    chrome.runtime.sendMessage({ action: 'sync' });
  } catch (error) {
    console.error('Error saving expiration setting:', error);
  }
}

/**
 * Delete remote data from Google Drive
 */
async function deleteRemoteData() {
  if (!confirm('Are you sure you want to delete your sync data from Google Drive? This will remove the sync file from your Google Drive. Local data will be preserved.')) {
    return;
  }

  deleteRemoteBtn.disabled = true;
  deleteRemoteBtn.textContent = 'Deleting...';

  try {
    const result = await chrome.runtime.sendMessage({ action: 'deleteRemoteData' });

    if (result.success) {
      alert('Remote data deleted successfully.');
      await updateUI();
    } else {
      alert('Failed to delete remote data: ' + (result.error || 'Unknown error'));
    }
  } catch (error) {
    alert('Failed to delete remote data: ' + error.message);
  } finally {
    deleteRemoteBtn.disabled = false;
    deleteRemoteBtn.textContent = 'Delete Remote Data';
  }
}

// Event listeners
connectBtn.addEventListener('click', connect);
syncNowBtn.addEventListener('click', syncNow);
disconnectBtn.addEventListener('click', disconnect);
deleteRemoteBtn.addEventListener('click', deleteRemoteData);
showCacheBtn.addEventListener('click', showCache);
hideCacheBtn.addEventListener('click', hideCache);
copyCacheBtn.addEventListener('click', copyCache);
deleteLocalBtn.addEventListener('click', deleteLocalData);
expirationDays.addEventListener('change', saveExpirationSetting);

// Initialize
updateUI();
loadExpirationSetting();

// Refresh UI periodically
setInterval(updateUI, 30000);
