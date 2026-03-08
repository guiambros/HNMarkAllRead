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

document.addEventListener('DOMContentLoaded', restore_options);
document.getElementById('sync-enabled').addEventListener('change', save_options);
