// Secure Background Service Worker - Efilingg CRM GST Portal Auto-Login Assistant
console.log("[Efilingg Background] Extension background script initialized. Version 2.0.0 (Manifest V3)");

let activeCredentials = null;
let currentClientInfo = null;
let lastStatus = "Idle - Waiting for 1-Click Launch from Efilingg CRM";

// Helper to update extension badge status
function updateBadge(status) {
  try {
    if (status === "ready") {
      chrome.action.setBadgeText({ text: "READY" });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981" }); // Emerald green
      chrome.action.setTitle({ title: "Efilingg Assistant: Credentials loaded and ready for auto-fill!" });
    } else if (status === "waiting") {
      chrome.action.setBadgeText({ text: "WAIT" });
      chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" }); // Amber orange
      chrome.action.setTitle({ title: "Efilingg Assistant: Awaiting GST page load" });
    } else {
      chrome.action.setBadgeText({ text: "" }); // Empty badge for idle
      chrome.action.setTitle({ title: "Efilingg Assistant: Ready - Waiting for 1-Click Launch from CRM" });
    }
  } catch (err) {
    console.warn("[Efilingg Background] Failed to set badge action:", err);
  }
}

// Restore active session state from storage on service worker start
chrome.storage.local.get(['activeCredentials', 'currentClientInfo', 'lastStatus'], (stored) => {
  if (stored && stored.activeCredentials && stored.activeCredentials.username) {
    activeCredentials = stored.activeCredentials;
    currentClientInfo = stored.currentClientInfo || null;
    lastStatus = stored.lastStatus || `Ready: Active for ${activeCredentials.username}`;
    updateBadge("ready");
    console.log(`[Efilingg Background] Restored active credentials for user: ${activeCredentials.username}`);
  } else {
    updateBadge("idle");
  }
});

// Listen to runtime messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  const senderInfo = sender.tab ? `Tab ${sender.tab.id} (${sender.tab.url})` : "Popup/CRM Page";
  console.log(`[Efilingg Background] Received action: "${request.action}" from: ${senderInfo}`);

  // ACTION 1: Initiate GST login from CRM
  if (request.action === "initiate_gst_login") {
    try {
      const { clientId, exchangeToken, apiUrl, username, password, gstin, firmName, skipTabCreation } = request;
      updateBadge("waiting");

      // Check if message came directly from GST portal tab
      const cameFromGstPortal = sender && sender.tab && sender.tab.url && sender.tab.url.includes("gst.gov.in");

      // Direct credentials transfer
      if (username) {
        console.log(`[Efilingg Background] Credential receipt: Received credentials for client ${gstin || clientId} (${username})`);
        
        activeCredentials = {
          gstin: gstin || "",
          username: username.trim(),
          password: (password || "").trim(),
          firmName: firmName || ""
        };
        currentClientInfo = {
          id: clientId || "CL-AUTO",
          gstin: gstin || "",
          username: username.trim(),
          firmName: firmName || ""
        };
        lastStatus = `Ready: Active for ${username}`;

        chrome.storage.local.set({ 
          activeCredentials, 
          currentClientInfo, 
          lastStatus 
        }, () => {
          updateBadge("ready");
          console.log("[Efilingg Background] Credentials successfully cached in Chrome storage.");

          if (!cameFromGstPortal && !skipTabCreation) {
            console.log("[Efilingg Background] Spawning GST Portal tab...");
            chrome.tabs.create({ url: "https://services.gst.gov.in/services/login" });
          }

          sendResponse({ 
            success: true, 
            message: `Credentials loaded securely for ${username}. Ready to autofill on GST Portal.` 
          });
        });

        return true; // Keep message channel open for async storage response
      }

      // Fallback: Fetch credentials from CRM API if not provided in payload
      const targetApiUrl = apiUrl || "https://efilingg.cloud";
      const fetchHeaders = { 'Content-Type': 'application/json' };
      if (exchangeToken) {
        fetchHeaders['Authorization'] = `Bearer ${exchangeToken}`;
      }

      console.log(`[Efilingg Background] Querying CRM API: ${targetApiUrl}/api/extension/get-credentials for client ${clientId}...`);
      
      fetch(`${targetApiUrl}/api/extension/get-credentials?clientId=${clientId || ''}`, {
        method: 'GET',
        headers: fetchHeaders
      })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.username) {
          activeCredentials = {
            gstin: data.gstin || gstin || "",
            username: data.username.trim(),
            password: (data.password || "").trim(),
            firmName: data.firmName || firmName || ""
          };
          currentClientInfo = {
            id: clientId || data.clientId || "CL-AUTO",
            gstin: activeCredentials.gstin,
            username: activeCredentials.username,
            firmName: activeCredentials.firmName
          };
          lastStatus = `Ready: Active for ${activeCredentials.username}`;

          chrome.storage.local.set({ activeCredentials, currentClientInfo, lastStatus }, () => {
            updateBadge("ready");
            if (!cameFromGstPortal && !skipTabCreation) {
              chrome.tabs.create({ url: "https://services.gst.gov.in/services/login" });
            }
            sendResponse({ success: true, message: `Loaded credentials for ${activeCredentials.username}` });
          });
        } else {
          lastStatus = "Idle - Waiting for 1-Click Launch from Efilingg CRM";
          chrome.storage.local.set({ lastStatus });
          updateBadge("idle");
          sendResponse({ success: false, error: "No credentials returned for this client." });
        }
      })
      .catch(err => {
        console.warn("[Efilingg Background] CRM API fetch notice:", err);
        lastStatus = "Idle - Click 1-Click Launch on client in Efilingg CRM";
        chrome.storage.local.set({ lastStatus });
        updateBadge("idle");
        sendResponse({ success: false, error: err.message });
      });

      return true;
    } catch (e) {
      console.error("[Efilingg Background] initiate_gst_login error:", e);
      lastStatus = "Idle - Waiting for 1-Click Launch from Efilingg CRM";
      chrome.storage.local.set({ lastStatus });
      updateBadge("idle");
      sendResponse({ success: false, error: e.message });
      return false;
    }
  }

  // ACTION 2: Get status & current client info for popup
  else if (request.action === "get_status") {
    chrome.storage.local.get(['lastStatus', 'currentClientInfo', 'activeCredentials'], (store) => {
      sendResponse({ 
        status: store.lastStatus || lastStatus, 
        clientInfo: store.currentClientInfo || currentClientInfo,
        hasCredentials: !!(store.activeCredentials && store.activeCredentials.username)
      });
    });
    return true;
  }

  // ACTION 3: Request GST credentials (called by content.js on GST portal)
  else if (request.action === "request_gst_credentials") {
    chrome.storage.local.get(['activeCredentials', 'currentClientInfo'], (result) => {
      const creds = result.activeCredentials || activeCredentials;
      if (creds && creds.username) {
        console.log(`[Efilingg Background] Sending credentials for ${creds.username} to GST Portal page.`);
        lastStatus = `Credentials Auto-Filled for ${creds.username}`;
        chrome.storage.local.set({ lastStatus });

        sendResponse({ 
          success: true, 
          username: creds.username, 
          password: creds.password || "",
          gstin: creds.gstin || "",
          firmName: creds.firmName || ""
        });
      } else {
        console.log("[Efilingg Background] Content script requested credentials, but no client has been launched yet.");
        sendResponse({ success: false, error: "No active client launched from CRM yet." });
      }
    });
    return true;
  }

  // ACTION 4: Clear / Wipe session
  else if (request.action === "clear_session") {
    chrome.storage.local.remove(['activeCredentials', 'currentClientInfo'], () => {
      activeCredentials = null;
      currentClientInfo = null;
      lastStatus = "Idle - Waiting for 1-Click Launch from Efilingg CRM";
      chrome.storage.local.set({ lastStatus });
      updateBadge("idle");
      console.log("[Efilingg Background] Session wiped clean.");
      sendResponse({ success: true, message: "Session cleared successfully." });
    });
    return true;
  }

  // ACTION 5: Ping extension
  else if (request.action === "ping_extension") {
    sendResponse({ success: true, message: "pong", version: "2.0.0", status: lastStatus });
    return false;
  }

  return false;
});
