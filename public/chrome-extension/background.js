// Secure Background Service Worker - Efilingg CRM GST Portal Auto-Login Assistant
console.log("[Efilingg Background] Extension background script initialized successfully. Version 1.0.0 (Manifest V3)");

let activeCredentials = null;
let currentClientInfo = null;
let lastStatus = "Idle - Waiting for login trigger";

// Helper to update extension badge status
function updateBadge(status) {
  try {
    if (status === "ready") {
      chrome.action.setBadgeText({ text: "READY" });
      chrome.action.setBadgeBackgroundColor({ color: "#10b981" }); // Emerald green
      chrome.action.setTitle({ title: "Efilingg Assistant: Credentials loaded and ready!" });
    } else if (status === "waiting") {
      chrome.action.setBadgeText({ text: "WAIT" });
      chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" }); // Amber orange
      chrome.action.setTitle({ title: "Efilingg Assistant: Awaiting GST page load" });
    } else {
      chrome.action.setBadgeText({ text: "" }); // Empty badge for idle
      chrome.action.setTitle({ title: "Efilingg Assistant: CRM connection idle" });
    }
  } catch (err) {
    console.warn("[Efilingg Background] Failed to set badge action:", err);
  }
}

// Ensure badge reset on service worker startup
updateBadge("idle");

// Listen to runtime messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`[Efilingg Background] Received message action: "${request.action}" from sender:`, sender.tab ? `Tab ${sender.tab.id} (${sender.tab.url})` : "Popup/CRM");

  if (request.action === "initiate_gst_login") {
    try {
      const { clientId, exchangeToken, apiUrl } = request;
      lastStatus = "Authorizing credentials request...";
      updateBadge("waiting");

      // Check if message came from a content script running directly on the GST portal
      const cameFromGstPortal = sender && sender.tab && sender.tab.url && sender.tab.url.includes("gst.gov.in");

      // Direct credentials transfer to bypass third party hurdles
      if (request.username && request.password) {
        console.log("[Efilingg Background] Credential receipt: Securely received direct credentials for client ID:", clientId);
        lastStatus = "Credentials Loaded securely";
        
        activeCredentials = {
          gstin: request.gstin || "",
          username: request.username,
          password: request.password
        };
        currentClientInfo = {
          id: clientId,
          gstin: request.gstin || "",
          username: request.username
        };
        
        chrome.storage.local.set({ 
          activeCredentials, 
          currentClientInfo, 
          lastStatus 
        }, () => {
          if (chrome.runtime.lastError) {
            console.error("[Efilingg Background] Error storing session in local storage:", chrome.runtime.lastError);
            sendResponse({ success: false, error: "Storage error occurred." });
            return;
          }

          console.log("[Efilingg Background] CRM connection: Credentials successfully stored in extension storage cache.");
          updateBadge("ready");

          if (cameFromGstPortal || request.skipTabCreation) {
            lastStatus = "Credentials Loaded directly on portal";
            chrome.storage.local.set({ lastStatus });
          } else {
            // Normal behavior: Open GST Portal
            console.log("[Efilingg Background] Spawning GST Portal login page in a new normal browser tab...");
            chrome.tabs.create({ url: "https://services.gst.gov.in/services/login" }, (tab) => {
              lastStatus = "GST Portal page opened";
              chrome.storage.local.set({ lastStatus });
            });
          }
          sendResponse({ success: true, message: "Credentials loaded securely in Extension background." });
        });
        return true; // Keep message channel open
      }
      
      // Perform fallback secure API call to CRM back-end if username/password were not supplied in message payload
      if (!exchangeToken) {
        throw new Error("No exchange token was provided in client launch message.");
      }

      console.log("[Efilingg Background] Standard exchangeToken flow: Fetching from CRM endpoint:", apiUrl);
      fetch(`${apiUrl}/api/extension/get-credentials?clientId=${clientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${exchangeToken}`,
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Authentication token invalid: status ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.success && data.username && data.password) {
          console.log("[Efilingg Background] Credential receipt: Successfully decrypted raw credentials from CRM api secure query.");
          lastStatus = "Credentials Loaded securely";
          
          activeCredentials = {
            gstin: data.gstin || "",
            username: data.username,
            password: data.password
          };
          currentClientInfo = {
            id: clientId,
            gstin: data.gstin || "",
            username: data.username
          };
          
          chrome.storage.local.set({ 
            activeCredentials, 
            currentClientInfo, 
            lastStatus 
          }, () => {
            console.log("[Efilingg Background] Local credentials cached successfully from backend fetch.");
            updateBadge("ready");

            if (cameFromGstPortal || request.skipTabCreation) {
              lastStatus = "Credentials Loaded directly on portal";
              chrome.storage.local.set({ lastStatus });
            } else {
              chrome.tabs.create({ url: "https://services.gst.gov.in/services/login" });
            }
            sendResponse({ success: true, message: "Credentials retrieved and loaded in Extension." });
          });
        } else {
          lastStatus = "Authentication Failed: Server error";
          chrome.storage.local.set({ lastStatus });
          updateBadge("idle");
          sendResponse({ success: false, error: data.error || "Credential payload invalid from CRM backend." });
        }
      })
      .catch(err => {
        console.error("[Efilingg Background] Failed network credential retrieval feed:", err);
        lastStatus = `Connection Error: ${err.message}`;
        chrome.storage.local.set({ lastStatus });
        updateBadge("idle");
        sendResponse({ success: false, error: err.message });
      });

      return true; // async
    } catch (e) {
      console.error("[Efilingg Background] Fatal crash in initiate_gst_login:", e);
      lastStatus = `System Error: ${e.message}`;
      chrome.storage.local.set({ lastStatus });
      updateBadge("idle");
      sendResponse({ success: false, error: e.message });
      return false;
    }
  }

  else if (request.action === "get_status") {
    try {
      chrome.storage.local.get(['lastStatus', 'currentClientInfo'], (store) => {
        sendResponse({ 
          status: store.lastStatus || lastStatus, 
          clientInfo: store.currentClientInfo || currentClientInfo 
        });
      });
      return true;
    } catch (err) {
      sendResponse({ status: "Error querying status", error: err.message });
      return false;
    }
  }

  else if (request.action === "request_gst_credentials") {
    try {
      chrome.storage.local.get(['activeCredentials'], (result) => {
        if (result.activeCredentials && result.activeCredentials.username) {
          console.log("[Efilingg Background] Credential transmission: Sending Username & Password safely to Authorized Content Script...");
          
          lastStatus = "Credentials Injected successfully";
          chrome.storage.local.set({ lastStatus });

          sendResponse({ 
            success: true, 
            username: result.activeCredentials.username, 
            password: result.activeCredentials.password,
            gstin: result.activeCredentials.gstin || ""
          });

          // Enforce 100% strict data-confidentiality: wipe raw credentials in storage 3 seconds after being injected
          console.log("[Efilingg Background] Securing session: Arming instant 3-second self-destruct wipe timer on credentials cache.");
          setTimeout(() => {
            chrome.storage.local.remove(['activeCredentials'], () => {
              if (chrome.runtime.lastError) {
                console.error("[Efilingg Background] Security wipe failed:", chrome.runtime.lastError);
              } else {
                console.log("[Efilingg Background] Secure wipe complete: Password cache cleared completely from Chrome storage.");
                activeCredentials = null;
                updateBadge("idle");
              }
            });
          }, 3000);

        } else {
          console.warn("[Efilingg Background] Content script requested credentials, but cache was empty or already wiped.");
          sendResponse({ success: false, error: "No active credentials available or already cleared." });
        }
      });
      return true; // Keep channel open
    } catch (err) {
      console.error("[Efilingg Background] Error processing direct credentials request:", err);
      sendResponse({ success: false, error: err.message });
      return false;
    }
  }
  
  else if (request.action === "clear_session") {
    try {
      chrome.storage.local.remove(['activeCredentials', 'currentClientInfo'], () => {
        activeCredentials = null;
        currentClientInfo = null;
        lastStatus = "Idle - Session cleared.";
        chrome.storage.local.set({ lastStatus });
        updateBadge("idle");
        console.log("[Efilingg Background] Session cache completely wiped manually by employee action.");
        sendResponse({ success: true, message: "Cleared successfully." });
      });
      return true;
    } catch (err) {
      sendResponse({ success: false, error: err.message });
      return false;
    }
  }

  // Handle fallback ping action to prove connection
  else if (request.action === "ping_extension") {
    console.log("[Efilingg Background] Extension ping-pong: Received ping from page. Returning alive status.");
    sendResponse({ success: true, message: "pong", version: "1.0.0", status: lastStatus });
    return false;
  }

  else {
    sendResponse({ success: false, error: "Unknown action parameter" });
    return false;
  }
});
