// Popup Control Script - Efilingg CRM Assistant V2.0.0
document.addEventListener('DOMContentLoaded', () => {
  const statusDisplay = document.getElementById('status-display');
  const clientInfoSection = document.getElementById('client-info-section');
  const infoGstin = document.getElementById('info-gstin');
  const infoUsername = document.getElementById('info-username');
  const infoFirm = document.getElementById('info-firm');
  const firmRow = document.getElementById('firm-row');
  const hintText = document.getElementById('hint-text');
  const autofillActiveBtn = document.getElementById('autofill-active-btn');
  const copyUserBtn = document.getElementById('copy-user-btn');
  const copyPassBtn = document.getElementById('copy-pass-btn');
  const copyFeedback = document.getElementById('copy-feedback');
  const clearSessionBtn = document.getElementById('clear-session-btn');

  function updatePopupUI() {
    chrome.runtime.sendMessage({ action: "get_status" }, (response) => {
      chrome.storage.local.get(['lastStatus', 'currentClientInfo', 'activeCredentials'], (store) => {
        const lastStatus = store.lastStatus || (response ? response.status : "Idle - Waiting for CRM Launch");
        const clientInfo = store.currentClientInfo || (response ? response.clientInfo : null);
        const hasCreds = !!(store.activeCredentials && store.activeCredentials.username);

        statusDisplay.innerText = lastStatus;
        statusDisplay.className = "status-badge";

        if (lastStatus.toLowerCase().includes("fail") || lastStatus.toLowerCase().includes("error")) {
          statusDisplay.classList.add("status-error");
        }

        if (hasCreds && clientInfo) {
          clientInfoSection.style.display = "block";
          hintText.style.display = "none";
          autofillActiveBtn.style.display = "flex";
          infoGstin.innerText = clientInfo.gstin || "N/A";
          infoUsername.innerText = clientInfo.username || "N/A";
          
          if (clientInfo.firmName) {
            firmRow.style.display = "block";
            infoFirm.innerText = clientInfo.firmName;
          } else {
            firmRow.style.display = "none";
          }
          
          copyUserBtn.disabled = false;
          copyPassBtn.disabled = !store.activeCredentials.password;
          clearSessionBtn.style.display = "block";
        } else {
          clientInfoSection.style.display = "none";
          hintText.style.display = "block";
          autofillActiveBtn.style.display = "none";
          copyUserBtn.disabled = true;
          copyPassBtn.disabled = true;
          clearSessionBtn.style.display = "none";
        }
      });
    });
  }

  // Initial render
  updatePopupUI();
  const pollInterval = setInterval(updatePopupUI, 1200);

  // Trigger autofill on active browser tab
  autofillActiveBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "force_autofill_now" }, (res) => {
          if (chrome.runtime.lastError) {
            showFeedback("Please navigate to GST login tab first.");
          } else {
            showFeedback("✔ Autofill executed on page!");
          }
        });
      }
    });
  });

  // Copy Username Handler
  copyUserBtn.addEventListener('click', () => {
    chrome.storage.local.get(['activeCredentials', 'currentClientInfo'], (store) => {
      const u = store.activeCredentials?.username || store.currentClientInfo?.username;
      if (u) {
        navigator.clipboard.writeText(u).then(() => {
          showFeedback("✔ Username copied!");
        }).catch(() => {
          showFeedback("Copy failed");
        });
      }
    });
  });

  // Copy Password Handler
  copyPassBtn.addEventListener('click', () => {
    chrome.storage.local.get(['activeCredentials'], (store) => {
      const p = store.activeCredentials?.password;
      if (p) {
        navigator.clipboard.writeText(p).then(() => {
          showFeedback("✔ Password copied!");
        }).catch(() => {
          showFeedback("Copy failed");
        });
      } else {
        showFeedback("No password stored.");
      }
    });
  });

  // Clear Session Handler
  clearSessionBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: "clear_session" }, () => {
      updatePopupUI();
      showFeedback("Session cleared.");
    });
  });

  function showFeedback(text) {
    copyFeedback.innerText = text;
    setTimeout(() => {
      copyFeedback.innerText = "";
    }, 2200);
  }
});
