let statusTimeout;
let isConfirming = false;
let confirmTimeout;

function show_status(text) {
  const status = document.getElementById('status');
  status.innerText = text;
  status.classList.add('visible');
  
  if (statusTimeout) clearTimeout(statusTimeout);
  statusTimeout = setTimeout(() => {
    status.classList.remove('visible');
  }, 2500);
}

function save_options() {
  const syncEnabled = document.getElementById('sync-enabled').checked;
  chrome.storage.local.set({ sync_enabled: syncEnabled }, function() {
    show_status("Settings saved!");
    update_debug_info();
  });
}

function restore_options() {
  chrome.storage.local.get({ sync_enabled: false }, function(items) {
    document.getElementById('sync-enabled').checked = items.sync_enabled;
  });
  update_debug_info();
}

function update_debug_info() {
  // Sync Storage
  chrome.storage.sync.get(null, (data) => {
    document.getElementById('debug-sync').value = JSON.stringify(data, null, 2);
  });

  // Local Extension Storage
  chrome.storage.local.get(null, (data) => {
    document.getElementById('debug-local').value = JSON.stringify(data, null, 2);
  });

  // Legacy localStorage
  // Note: This is the localStorage of the options page context
  // To see the content script's LS, we'd need a message bridge, 
  // but let's see what's here first.
  const lsData = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    lsData[key] = localStorage.getItem(key);
  }
  document.getElementById('debug-ls').value = JSON.stringify(lsData, null, 2);
}

function reset_data() {
  const resetButton = document.getElementById('reset-data');
  
  if (!isConfirming) {
    isConfirming = true;
    resetButton.innerText = "Are you sure? Click again to Reset";
    resetButton.style.backgroundColor = "#f29900";
    
    confirmTimeout = setTimeout(() => {
      isConfirming = false;
      resetButton.innerText = "Reset Extension Data";
      resetButton.style.backgroundColor = "";
    }, 3000);
    
    return;
  }

  clearTimeout(confirmTimeout);
  isConfirming = false;
  resetButton.innerText = "Reset Extension Data";
  resetButton.style.backgroundColor = "";

  const checkbox = document.getElementById('sync-enabled');
  checkbox.onchange = null; 

  chrome.storage.sync.clear(() => {
    chrome.storage.local.clear(() => {
      localStorage.clear();
      checkbox.checked = false;
      checkbox.onchange = save_options;
      show_status("Data cleared successfully!");
      update_debug_info();
    });
  });
}

function toggle_debug() {
  const zone = document.getElementById('debug-zone');
  const toggle = document.getElementById('toggle-debug');
  if (zone.classList.contains('visible')) {
    zone.classList.remove('visible');
    toggle.innerText = "Show Storage Debug Info";
  } else {
    zone.classList.add('visible');
    toggle.innerText = "Hide Storage Debug Info";
    update_debug_info();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  restore_options();
  document.getElementById('sync-enabled').onchange = save_options;
  document.getElementById('reset-data').onclick = reset_data;
  document.getElementById('toggle-debug').onclick = toggle_debug;
});
