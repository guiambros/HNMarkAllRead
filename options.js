function save_options() {
  const syncEnabled = document.getElementById('sync-enabled').checked;
  chrome.storage.local.set({ sync_enabled: syncEnabled }, function() {
    const status = document.getElementById('status');
    status.style.display = 'block';
    setTimeout(function() {
      status.style.display = 'none';
    }, 2000);
  });
}

function restore_options() {
  chrome.storage.local.get({ sync_enabled: false }, function(items) {
    document.getElementById('sync-enabled').checked = items.sync_enabled;
  });
}

function reset_data() {
  if (confirm("Are you sure you want to clear ALL extension history and settings? This cannot be undone.")) {
    // 1. Clear chrome.storage.sync
    chrome.storage.sync.clear(function() {
      // 2. Clear chrome.storage.local
      chrome.storage.local.clear(function() {
        // 3. Clear localStorage (must be done in content script context, but we can clear current tab context if it's the options page)
        // Note: localStorage in the options page is different from the content script, 
        // but the content script will be notified of storage.local changes if we add a listener, 
        // or it will just see empty data on next load.
        // For the content script's localStorage, we'll need to handle it there.
        localStorage.clear();

        const status = document.getElementById('status');
        status.innerText = "All data cleared successfully!";
        status.style.display = 'block';
        document.getElementById('sync-enabled').checked = false;
        
        setTimeout(function() {
          status.style.display = 'none';
          status.innerText = "Settings saved!";
        }, 3000);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('sync-enabled').addEventListener('change', save_options);
document.getElementById('reset-data').addEventListener('click', reset_data);
