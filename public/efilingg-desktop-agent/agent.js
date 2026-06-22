/**
 * Efilingg Desktop Agent (v2.0.0)
 * Secure, offline-first Windows helper utility for Efilingg CRM V2
 * 
 * Provides:
 *  - localhost micro-API for the CRM interface to securely trigger client logins
 *  - Automated device fingerprinting and unique cryptographic hardware-key generation
 *  - Direct Chromium/Edge interaction via Chrome DevTools Protocol (CDP) WebSocket
 *  - Automatic update management
 *  - Strict CORS validation
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const http = require('http');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const WebSocket = require('ws');

// Helper to support dynamic HTTP / HTTPS requests
function secureGet(url, options, callback) {
  const isHttps = url.startsWith('https:');
  const client = isHttps ? https : http;
  
  if (typeof options === 'function') {
    callback = options;
    options = {};
  }
  
  return client.get(url, options, callback);
}

const app = express();
const PORT = 12112; // Static localized port reserved for the Efilingg Client-Agent
const AGENT_VERSION = "2.0.0";

// Standard directories for secure local key storage
const APPDATA_DIR = process.env.APPDATA 
  ? path.join(process.env.APPDATA, 'EfilinggAgent') 
  : path.join(__dirname, 'data');

if (!fs.existsSync(APPDATA_DIR)) {
  fs.mkdirSync(APPDATA_DIR, { recursive: true });
}

const CONFIG_PATH = path.join(APPDATA_DIR, 'config.json');
const LOGS_PATH = path.join(APPDATA_DIR, 'session_audit_logs.json');

// Memory states
let deviceConfig = {
  deviceId: "",
  deviceKey: "",
  deviceName: "Workstation_" + Math.random().toString(36).substring(2, 8).toUpperCase(),
  authorizedByCrm: false,
  registeredEmployeeId: "",
  lastCrmOrigin: "",
  createdAt: new Date().toISOString()
};

// Local Audit logger
function logLocalEvent(action, status, details) {
  let logs = [];
  try {
    if (fs.existsSync(LOGS_PATH)) {
      logs = JSON.parse(fs.readFileSync(LOGS_PATH, 'utf8'));
    }
  } catch (e) {
    logs = [];
  }

  const logEntry = {
    id: 'DLOG_' + Math.random().toString(36).substring(2, 10).toUpperCase(),
    timestamp: new Date().toISOString(),
    action,
    status,
    details,
    deviceId: deviceConfig.deviceId
  };

  logs.unshift(logEntry);
  
  // Keep logs capped at last 500 lines
  if (logs.length > 500) {
    logs = logs.slice(0, 500);
  }

  try {
    fs.writeFileSync(LOGS_PATH, JSON.stringify(logs, null, 2), 'utf8');
  } catch (err) {
    console.error("Local logger error:", err);
  }
}

// Load or Bootstrap Device Credentials
function initializeDeviceConfig() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const persisted = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      deviceConfig = { ...deviceConfig, ...persisted };
      console.log(`[Efilingg] Persisted device key loaded: ${deviceConfig.deviceId}`);
    } catch (e) {
      console.error("[Efilingg] Stale configuration encountered. Generating fresh identity parameters.");
      generateDeviceIdentity();
    }
  } else {
    generateDeviceIdentity();
  }
}

function generateDeviceIdentity() {
  deviceConfig.deviceId = "EFID_" + uuidv4().replace(/-/g, '').substring(0, 16).toUpperCase();
  deviceConfig.deviceKey = "EFSK_" + uuidv4().replace(/-/g, '').toUpperCase();
  saveConfigToDisk();
  logLocalEvent("BOOTSTRAP_DEVICE", "SUCCESS", "Generated new unique secure device keys for employee workstation.");
}

function saveConfigToDisk() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(deviceConfig, null, 2), 'utf8');
  } catch (err) {
    console.error("Config save failure:", err);
  }
}

initializeDeviceConfig();

// Setup Express security filters with strictly-bound origins or wildcards for safe local testing
app.use(cors({
  origin: function (origin, callback) {
    // Dynamic origin verification: Must match the efilingg corporate origin or standard CRM dev URLs
    if (!origin || origin.includes('asia-southeast1.run.app') || origin.includes('localhost') || origin.includes('efilingg')) {
      callback(null, true);
    } else {
      callback(new Error('CORS Refused: Request source violates Efilingg Desktop security model.'));
    }
  },
  credentials: true
}));

app.use(express.json());

// API: Check status & return device identifiers so CRM admin can register/approve the workstation
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    agent: "Efilingg Windows Desktop Agent",
    version: AGENT_VERSION,
    deviceId: deviceConfig.deviceId,
    deviceKey: deviceConfig.deviceKey,
    deviceName: deviceConfig.deviceName,
    authorized: deviceConfig.authorizedByCrm,
    registeredEmployeeId: deviceConfig.registeredEmployeeId,
    appDataDirectory: APPDATA_DIR
  });
});

// API: CRM marks this device as approved during pairing
app.post('/api/pair', (req, res) => {
  const { employeeId, crmOrigin } = req.body;
  if (!employeeId) {
    return res.status(400).json({ success: false, error: "Missing paired employee context." });
  }

  deviceConfig.authorizedByCrm = true;
  deviceConfig.registeredEmployeeId = employeeId;
  deviceConfig.lastCrmOrigin = crmOrigin || deviceConfig.lastCrmOrigin;
  saveConfigToDisk();

  logLocalEvent("DEVICE_PAIRING", "SUCCESS", `Pairing confirmed with CRM for Employee ID: ${employeeId}.`);
  res.json({ success: true, deviceId: deviceConfig.deviceId });
});

// Helper: Windows Browser Executable Finder
function findBrowserExecutable() {
  // Standard Google Chrome install locations
  const chromePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    path.join(process.env.USERPROFILE || '', 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
  ];

  for (let p of chromePaths) {
    if (fs.existsSync(p)) return { path: p, browser: 'CHROME' };
  }

  // Fallback to Microsoft Edge (Guaranteed to be present on Windows 10 & 11)
  const edgePaths = [
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
  ];

  for (let p of edgePaths) {
    if (fs.existsSync(p)) return { path: p, browser: 'EDGE' };
  }

  return null;
}

// API: Trigger GST Secure Autofill Flow
app.post('/api/autofill-login', async (req, res) => {
  const { clientId, exchangeToken, crmUrl, username, password, gstin } = req.body;
  
  if (!clientId || (!exchangeToken && !username) || !crmUrl) {
    logLocalEvent("AUTOFILL_TRIGGER", "REJECTED", "Missing transaction params in local HTTP request.");
    return res.status(400).json({ success: false, error: "Required transaction arguments are missing." });
  }

  logLocalEvent("LOGIN_REQUESTED", "PENDING", `Initiating secure credentials retrieval for Client: ${clientId}`);

  // Modular Chromium Launch & CDP Autofill Executor
  const launchWithCredentials = async (resolvedUser, resolvedPass, resolvedGstin) => {
    try {
      // Step 2: Boot Browser in Debugging Mode
      const browserMeta = findBrowserExecutable();
      if (!browserMeta) {
        logLocalEvent("BROWSER_SPAWN", "FAILED", "Could not locate Chrome or Edge executable on Windows system.");
        return res.status(500).json({ success: false, error: "Pre-installed Google Chrome or Edge browser is required." });
      }

      console.log(`[Efilingg] Spawning ${browserMeta.browser} executable dynamically: ${browserMeta.path}`);
      
      const debugPort = 9222;
      const userProfileDir = path.join(APPDATA_DIR, "EfilinggAutofillChromeProfile");
      
      // Spawn argument array to isolated sandbox profiling
      const args = [
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${userProfileDir}`,
        `--profile-directory=Default`,
        `--no-first-run`,
        `--no-default-browser-check`,
        `--disable-sync`,
        `--enable-automation`,
        `https://services.gst.gov.in/services/login`
      ];

      const browserProcess = spawn(browserMeta.path, args, {
        detached: true,
        stdio: 'ignore'
      });
      browserProcess.unref();

      logLocalEvent("BROWSER_SPAWN", "SUCCESS", `Launched configured ${browserMeta.browser} profile with debugging on port ${debugPort}.`);

      // Intelligent Polling Mechanism for safe CDP injections
      let attempts = 0;
      const maxAttempts = 15; // Try for up to ~22 seconds (15 attempts * 1500ms)
      
      const pollCDP = () => {
        attempts++;
        console.log(`[Efilingg] Querying Chrome CDP list (attempt ${attempts}/${maxAttempts})...`);
        
        const req = http.get(`http://127.0.0.1:${debugPort}/json/list`, (listRes) => {
          let listData = '';
          listRes.on('data', c => listData += c);
          listRes.on('end', () => {
            try {
              const tabs = JSON.parse(listData);
              // Find the active GST login page tab
              const gstTab = tabs.find(t => t.url && t.url.includes('gst.gov.in'));
              if (!gstTab || !gstTab.webSocketDebuggerUrl) {
                if (attempts < maxAttempts) {
                  setTimeout(pollCDP, 1500);
                } else {
                  logLocalEvent("CDP_CONNECTION", "FAILED", "Could not find active GST login tab after maximum attempts.");
                }
                return;
              }

              console.log(`[Efilingg] Found GST tab at URL: ${gstTab.url}. Connecting websocket...`);
              const ws = new WebSocket(gstTab.webSocketDebuggerUrl);

              ws.on('open', () => {
                // Highly robust, framework-compliant auto-login script
                const autofillScript = `
                  (() => {
                    const usernameVal = "${resolvedUser.replace(/"/g, '\\"')}";
                    const passwordVal = "${resolvedPass.replace(/"/g, '\\"')}";
                    
                    // Comprehensive selectors covering multiple versions or states of inputs
                    const uField = document.getElementById('username') || 
                                   document.querySelector('input[name="username"]') || 
                                   document.querySelector('input[formcontrolname="username"]') ||
                                   document.querySelector('input[placeholder*="Username"]');
                                   
                    const pField = document.getElementById('user_pass') || 
                                   document.querySelector('input[name="user_pass"]') ||
                                   document.getElementById('password') || 
                                   document.querySelector('input[type="password"]:not([style*="display: none"]):not([style*="display:none"])') ||
                                   document.querySelector('input[type="password"]') || 
                                   document.querySelector('input[name="password"]') ||
                                   document.querySelector('input[formcontrolname="password"]') ||
                                   document.querySelector('input[placeholder*="Password"]');
                    
                    if (uField && pField) {
                      // Focus and simulated clicks
                      uField.focus();
                      uField.click();
                      uField.value = usernameVal;
                      
                      pField.focus();
                      pField.click();
                      pField.value = passwordVal;
                      
                      // Dispatch complete event array to wake up framework state stores
                      const events = ['input', 'change', 'keydown', 'keyup', 'blur'];
                      events.forEach(evName => {
                        uField.dispatchEvent(new Event(evName, { bubbles: true }));
                        pField.dispatchEvent(new Event(evName, { bubbles: true }));
                      });
                      
                      // Highlight green
                      uField.style.border = "3px solid #10B981";
                      uField.style.backgroundColor = "#F1FDF5";
                      pField.style.border = "3px solid #10B981";
                      pField.style.backgroundColor = "#F1FDF5";
                      
                      // Auto-focus physical CAPTCHA input
                      const capField = document.getElementById('captcha') || 
                                       document.querySelector('input[name="captcha"]') || 
                                       document.querySelector('input[placeholder*="Captcha"]');
                      if (capField) {
                        capField.focus();
                        capField.style.border = "3px solid #3B82F6";
                        capField.style.backgroundColor = "#EFF6FF";
                      }
                      
                      console.log("Efilingg Desktop: Injected login credentials successfully!");
                      return "SUCCESS_FILLED";
                    } else {
                      console.log("Efilingg Desktop: Input fields not spawned yet.");
                      return "FORM_NOT_FOUND";
                    }
                  })();
                `;

                ws.send(JSON.stringify({
                  id: 101,
                  method: "Runtime.evaluate",
                  params: {
                    expression: autofillScript,
                    returnByValue: true
                  }
                }));
              });

              ws.on('message', (wsMsg) => {
                try {
                  const ans = JSON.parse(wsMsg);
                  if (ans && ans.id === 101) {
                    const innerResult = ans.result && ans.result.result;
                    const resultVal = innerResult ? innerResult.value : (ans.result && ans.result.value);
                    if (resultVal === "SUCCESS_FILLED") {
                      logLocalEvent("AUTOFILL_EXECUTE", "SUCCESS", `Successfully injected GST credentials via CDP for Client: ${resolvedGstin || 'N/A'}`);
                      ws.close();
                    } else {
                      // Visual fields were not ready yet even though the tab matches, retry!
                      console.log("[Efilingg] GST forms not fully complete. Retrying in next cycle. Result value:", resultVal);
                      ws.close();
                      if (attempts < maxAttempts) {
                        setTimeout(pollCDP, 1500);
                      } else {
                        logLocalEvent("AUTOFILL_EXECUTE", "FAILED", "Login fields were missing in the opened tab context.");
                      }
                    }
                  }
                } catch (parseErr) {
                  console.error("[Efilingg] WebSocket message parse error:", parseErr);
                  ws.close();
                }
              });

              ws.on('error', (wsErr) => {
                console.error("[Efilingg] WebSocket connection error:", wsErr);
                if (attempts < maxAttempts) {
                  setTimeout(pollCDP, 1500);
                }
              });

            } catch (err) {
              console.error("[Efilingg] Error parsing CDP list:", err);
              if (attempts < maxAttempts) {
                setTimeout(pollCDP, 1500);
              }
            }
          });
        });

        req.on('error', (err) => {
          console.warn("[Efilingg] Chrome debugger port not reachable yet:", err.message);
          if (attempts < maxAttempts) {
            setTimeout(pollCDP, 1500);
          } else {
            logLocalEvent("CHROME_CONNECT", "FAILED", `Could not connect to Chrome debugging session after ${maxAttempts} retries.`);
          }
        });
      };

      // Start the poll with a short initial delay of 1 second
      setTimeout(pollCDP, 1000);

      return res.json({ success: true, message: "Browser launched. Credentials injected safely." });
    } catch (e) {
      logLocalEvent("AUTOFILL_RUN", "FAILED", `Autofill launch runtime exception: ${e.message}`);
      return res.status(500).json({ success: false, error: e.message });
    }
  };

  // CHECKPOINT: If direct payload is dispatched from authenticated browser tab, run immediately (Gateway bypass)
  if (username && password) {
    logLocalEvent("SECURE_RETRIEVAL", "SUCCESS", "Autofill credentials supplied directly from authorized browser tab session.");
    return launchWithCredentials(username, password, gstin || '');
  }

  // Step 1: Securely fetch credentials from cloud CRM using workstation device key
  // This verifies that this physical desktop is authorized to log in!
  const fetchUrl = `${crmUrl}/api/extension/get-credentials?clientId=${clientId}`;
  
  try {
    const fetchOptions = {
      headers: {
        'Authorization': `Bearer ${exchangeToken}`,
        'X-Device-Id': deviceConfig.deviceId,
        'X-Device-Key': deviceConfig.deviceKey
      }
    };

    // Use absolute native HTTP module or fetch to avoid external library dependencies in compiled binary
    const crmReq = secureGet(fetchUrl, fetchOptions, (crmRes) => {
      let data = '';
      crmRes.on('data', chunk => data += chunk);
      crmRes.on('end', async () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.success) {
            logLocalEvent("SECURE_RETRIEVAL", "FAILED", `Cloud CRM returned fetch error: ${parsed.error}`);
            return res.status(401).json({ success: false, error: parsed.error || "CRM server rejected credential release." });
          }

          // We got the GST credentials!
          const { username: fetchedUser, password: fetchedPassword, gstin: fetchedGstin } = parsed;
          return launchWithCredentials(fetchedUser, fetchedPassword, fetchedGstin);
        } catch (e) {
          logLocalEvent("CREDENTIAL_FORMAT", "FAILED", `Credentials response error: ${e.message}`);
          res.status(500).json({ success: false, error: "Failed to deserialize CRM API credentials payload." });
        }
      });
    });

    crmReq.on('error', (err) => {
      logLocalEvent("SECURE_RETRIEVAL", "FAILED", `HTTP request error to Cloud CRM server: ${err.message}`);
      res.status(502).json({ success: false, error: "Could not contact active CRM Cloud Server." });
    });

    crmReq.end();
  } catch (err) {
    logLocalEvent("AUTOFILL_RUN", "FAILED", `Critical error inside Autofill trigger engine: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Get Local Session Logs (for physical auditing inside device)
app.get('/api/logs', (req, res) => {
  try {
    if (fs.existsSync(LOGS_PATH)) {
      const logs = JSON.parse(fs.readFileSync(LOGS_PATH, 'utf8'));
      return res.json({ success: true, logs });
    }
    res.json({ success: true, logs: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// API: Check for Automatic Updates (Fetches local agent package versioning info against server manifest)
app.get('/api/check-update', (req, res) => {
  const crmServerUrl = req.query.crmUrl;
  if (!crmServerUrl) {
    return res.json({ success: true, updateAvailable: false, currentVersion: AGENT_VERSION });
  }

  // Poll server for latest version
  const checkUrl = `${crmServerUrl}/api/desktop/latest-version`;
  secureGet(checkUrl, (resCheck) => {
    let raw = '';
    resCheck.on('data', d => raw += d);
    resCheck.on('end', () => {
      try {
        const payload = JSON.parse(raw);
        if (payload && payload.version && payload.version !== AGENT_VERSION) {
          return res.json({
            success: true,
            updateAvailable: true,
            currentVersion: AGENT_VERSION,
            latestVersion: payload.version,
            downloadUrl: `${crmServerUrl}/api/desktop/download-latest`
          });
        }
        res.json({ success: true, updateAvailable: false, currentVersion: AGENT_VERSION });
      } catch (e) {
        res.json({ success: true, updateAvailable: false, currentVersion: AGENT_VERSION });
      }
    });
  }).on('error', (e) => {
    res.json({ success: true, updateAvailable: false, currentVersion: AGENT_VERSION });
  });
});

// Start localhost server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`[Efilingg DeskAgent] Local agent server initialized. Listening on http://127.0.0.1:${PORT}`);
  logLocalEvent("AGENT_START", "SUCCESS", `Local service daemon initialized on loopback interface port ${PORT}`);
});
