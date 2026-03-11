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
  });
}

function restore_options() {
  chrome.storage.local.get({ sync_enabled: false }, function(items) {
    document.getElementById('sync-enabled').checked = items.sync_enabled;
  });
}

function reset_data() {
  const resetButton = document.getElementById('reset-data');
  
  if (!isConfirming) {
    // First click: Ask for confirmation on the button itself
    isConfirming = true;
    resetButton.innerText = "Are you sure? Click again to Reset";
    resetButton.style.backgroundColor = "#f29900"; // Orange
    
    // Reset button after 3 seconds if not clicked again
    confirmTimeout = setTimeout(() => {
      isConfirming = false;
      resetButton.innerText = "Reset Extension Data";
      resetButton.style.backgroundColor = ""; // Back to CSS default
    }, 3000);
    
    return;
  }

  // Second click: Perform the actual reset
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
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restore_options();
  document.getElementById('sync-enabled').onchange = save_options;
  document.getElementById('reset-data').onclick = reset_data;
});
