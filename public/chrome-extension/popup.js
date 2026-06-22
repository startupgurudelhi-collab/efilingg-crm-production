// Popup Control Script - Efilingg CRM V2
document.addEventListener('DOMContentLoaded', () => {
  const statusDisplay = document.getElementById('status-display');
  const clientInfoSection = document.getElementById('client-info-section');
  const infoGstin = document.getElementById('info-gstin');
  const infoUsername = document.getElementById('info-username');
  const copyUserBtn = document.getElementById('copy-user-btn');
  const copyPassBtn = document.getElementById('copy-pass-btn');
  const copyFeedback = document.getElementById('copy-feedback');
  const clearSessionBtn = document.getElementById('clear-session-btn');

  function updatePopupUI() {
    // 1. Send status query to service worker background script
    chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
      chrome.storage.local.get(['lastStatus', 'currentClientInfo', 'activeCredentials'], (store) => {
        const lastStatus = store.lastStatus || (response ? response.status : "Idle");
        const clientInfo = store.currentClientInfo || (response ? response.clientInfo : null);
        
        statusDisplay.innerText = lastStatus;
        
        // Handle Visual Status Class styling
        statusDisplay.className = "status-badge";
        if (lastStatus.toLowerCase().includes("fail") || lastStatus.toLowerCase().includes("error") || lastStatus.toLowerCase().includes("denied")) {
          statusDisplay.classList.add("status-error");
        }

        if (clientInfo) {
          clientInfoSection.style.display = "block";
          infoGstin.innerText = clientInfo.gstin || "N/A";
          infoUsername.innerText = clientInfo.username || "N/A";
          
          copyUserBtn.disabled = false;
          copyPassBtn.disabled = !store.activeCredentials; // Disable pass copy if wiped
          clearSessionBtn.style.display = "block";
        } else {
          clientInfoSection.style.display = "none";
          copyUserBtn.disabled = true;
          copyPassBtn.disabled = true;
          clearSessionBtn.style.display = "none";
        }
      });
    });
  }

  // Initial render
  updatePopupUI();
  // Poll periodically
  const pollInterval = setInterval(updatePopupUI, 1000);

  // Copy Username Handler
  copyUserBtn.addEventListener('click', () => {
    chrome.storage.local.get(['currentClientInfo'], (store) => {
      if (store.currentClientInfo && store.currentClientInfo.username) {
        navigator.clipboard.writeText(store.currentClientInfo.username).then(() => {
          showFeedback("Username copied to clipboard!");
        });
      }
    });
  });

  // Copy Password Handler
  copyPassBtn.addEventListener('click', () => {
    chrome.storage.local.get(['activeCredentials'], (store) => {
      if (store.activeCredentials && store.activeCredentials.password) {
        navigator.clipboard.writeText(store.activeCredentials.password).then(() => {
          showFeedback("Password copied to clipboard!");
        });
      } else {
        showFeedback("Password wiped for safety. Please re-trigger login in CRM.");
      }
    });
  });

  // Force Session Cleanup Handler
  clearSessionBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "clear_session" }, (res) => {
      updatePopupUI();
      showFeedback("Session cache completely wiped.");
    });
  });

  function showFeedback(text) {
    copyFeedback.innerText = text;
    setTimeout(() => {
      copyFeedback.innerText = "";
    }, 2500);
  }
});
