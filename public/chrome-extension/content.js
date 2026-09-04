// Content Script - Efilingg CRM Assistant V2.0.0
console.log("[Efilingg Content] Content script loaded on: " + window.location.href);

// Helper to resolve stable API origin
function getCRMOrigin(providedUrl) {
  if (providedUrl && !providedUrl.includes("gst.gov.in")) {
    return providedUrl;
  }
  if (window.location.hostname.includes("gst.gov.in")) {
    return "";
  }
  return window.location.origin;
}

let lastTriggerTime = 0;
let lastTriggerClientId = '';

// Helper to handle initiating GST Portal login via extension background page
function triggerExtensionLogin(clientId, exchangeToken, apiUrl, username, password, gstin, firmName, skipTabCreation) {
  const now = Date.now();
  if (clientId === lastTriggerClientId && (now - lastTriggerTime) < 500) {
    console.log("[Efilingg Content] Debouncing rapid trigger for client: " + clientId);
    return;
  }
  lastTriggerTime = now;
  lastTriggerClientId = clientId;

  const resolvedApiUrl = getCRMOrigin(apiUrl);
  console.log(`[Efilingg Content] Triggering login for ${username || gstin || clientId}...`);

  chrome.runtime.sendMessage({
    action: "initiate_gst_login",
    clientId,
    exchangeToken,
    username,
    password,
    gstin,
    firmName,
    skipTabCreation: !!skipTabCreation,
    apiUrl: resolvedApiUrl
  }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn("[Efilingg Content] Extension service worker not reachable:", chrome.runtime.lastError.message);
      return;
    }
    if (response && response.success) {
      console.log("[Efilingg Content] Credentials stored in extension storage cache.");
    }
  });
}

// 1. Listen for CRM page postMessages
window.addEventListener('message', (event) => {
  if (event.data && event.data.source === 'efilingg-crm-page') {
    if (event.data.action === 'initiate_gst_login') {
      const { clientId, exchangeToken, username, password, gstin, firmName, crmUrl, skipTabCreation } = event.data;
      const apiUrl = crmUrl || event.origin || window.location.origin;
      triggerExtensionLogin(clientId, exchangeToken, apiUrl, username, password, gstin, firmName, skipTabCreation);
    } 
    else if (event.data.action === 'ping_extension') {
      window.postMessage({
        source: 'efilingg-extension',
        action: 'extension_pong',
        success: true,
        version: '2.0.0'
      }, '*');
    }
  }
});

// 2. Custom document-event listener fallback
document.addEventListener('EfilinggLaunchExtension', (event) => {
  const detail = event.detail;
  if (detail) {
    let data = detail;
    if (typeof detail === 'string') {
      try { data = JSON.parse(detail); } catch (e) {}
    }
    const { clientId, exchangeToken, username, password, gstin, firmName, crmUrl, skipTabCreation } = data;
    const apiUrl = crmUrl || window.location.origin;
    triggerExtensionLogin(clientId, exchangeToken, apiUrl, username, password, gstin, firmName, skipTabCreation);
  }
});

// 3. Listen for manual autofill trigger from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "force_autofill_now") {
    console.log("[Efilingg Content] Force autofill requested from popup.");
    attemptGstAutofill(true);
    sendResponse({ success: true });
  }
});

// 4. GST PORTAL AUTO-FILL LOGIC
const isGstPortal = window.location.hostname.includes("gst.gov.in") || 
                    window.location.pathname.includes("/services/login") ||
                    window.location.href.includes("services.gst.gov.in");

if (isGstPortal) {
  console.log("[Efilingg Content] Active on GST Portal page. Starting autofill watcher...");
  attemptGstAutofill(false);
}

// Storage change listener - auto-fill immediately if new credentials arrive
if (chrome?.storage?.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.activeCredentials && changes.activeCredentials.newValue && changes.activeCredentials.newValue.username) {
      console.log("[Efilingg Content] Detected active credentials update in storage, triggering autofill...");
      if (isGstPortal) {
        attemptGstAutofill(true);
      }
    }
  });
}

// Re-attempt autofill when user focuses the tab
window.addEventListener('focus', () => {
  if (isGstPortal) {
    attemptGstAutofill(true);
  }
});

function findInputElement(selectors) {
  for (const selector of selectors) {
    try {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) return el; // visible
      if (el) return el;
    } catch (e) {}
  }
  return null;
}

const usernameSelectors = [
  '#username',
  'input[name="username"]',
  'input[formcontrolname="username"]',
  'input[ng-model*="username" i]',
  'input[placeholder*="Username" i]',
  'input[id*="username" i]'
];

const passwordSelectors = [
  '#user_pass',
  'input[name="user_pass"]',
  '#password',
  'input[name="password"]',
  'input[type="password"]',
  'input[formcontrolname="password"]',
  'input[ng-model*="password" i]',
  'input[placeholder*="Password" i]',
  'input[id*="password" i]'
];

const captchaSelectors = [
  '#captcha',
  'input[name="captcha"]',
  'input[placeholder*="Captcha" i]',
  'input[id*="captcha" i]'
];

// Helper to set input value safely across AngularJS, React, Vue, and Native HTML
function fillInputField(inputElement, value) {
  if (!inputElement || value === undefined || value === null) return;

  try {
    inputElement.focus();

    // Set value directly bypassing virtual DOM / setters
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(inputElement, value);
    } else {
      inputElement.value = value;
    }

    // Fire standard input & change event sequence
    inputElement.dispatchEvent(new Event('focus', { bubbles: true }));
    inputElement.dispatchEvent(new Event('beforeinput', { bubbles: true }));
    inputElement.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
    inputElement.dispatchEvent(new Event('change', { bubbles: true }));
    inputElement.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
    inputElement.dispatchEvent(new Event('blur', { bubbles: true }));

    // Visual feedback
    inputElement.style.borderColor = '#10b981';
    inputElement.style.backgroundColor = '#ecfdf5';
  } catch (err) {
    console.warn("[Efilingg Content] fillInputField warning:", err);
    inputElement.value = value;
  }
}

// Main autofill execution with robust polling and storage sync
let autofillPollingInterval = null;

function attemptGstAutofill(forceImmediate) {
  if (autofillPollingInterval) {
    clearInterval(autofillPollingInterval);
    autofillPollingInterval = null;
  }

  let pollCount = 0;
  const maxPolls = forceImmediate ? 20 : 60; // Poll up to 30 seconds

  const executeFill = (username, password, gstin) => {
    const userInput = findInputElement(usernameSelectors);
    const passInput = findInputElement(passwordSelectors);

    if (userInput && username) {
      fillInputField(userInput, username);
      if (passInput && password) {
        fillInputField(passInput, password);
      }
      injectMainWorldAngularSync(username, password || '');

      setTimeout(() => {
        const captchaInput = findInputElement(captchaSelectors);
        if (captchaInput) {
          captchaInput.focus();
          captchaInput.style.borderColor = '#6366f1';
          captchaInput.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.2)';
        }
      }, 300);

      injectAutofillBanner(username, password || '', gstin || '', userInput, passInput);
      return true;
    }
    return false;
  };

  const checkAndFill = () => {
    pollCount++;

    // Try reading credentials from storage directly first
    chrome.storage.local.get(['activeCredentials'], (store) => {
      const creds = store?.activeCredentials;
      if (creds && creds.username) {
        const success = executeFill(creds.username, creds.password, creds.gstin);
        if (success) {
          clearInterval(autofillPollingInterval);
          autofillPollingInterval = null;
          console.log(`[Efilingg Content] Auto-filled credentials for ${creds.username} successfully.`);
          return;
        }
      } else {
        // Fallback: ask background worker
        chrome.runtime.sendMessage({ action: "request_gst_credentials" }, (response) => {
          if (chrome.runtime.lastError) return;
          if (response && response.success && response.username) {
            const success = executeFill(response.username, response.password, response.gstin);
            if (success) {
              clearInterval(autofillPollingInterval);
              autofillPollingInterval = null;
              console.log(`[Efilingg Content] Auto-filled credentials from worker for ${response.username}.`);
            }
          }
        });
      }

      if (pollCount >= maxPolls) {
        clearInterval(autofillPollingInterval);
        autofillPollingInterval = null;
      }
    });
  };

  autofillPollingInterval = setInterval(checkAndFill, 500);
  checkAndFill(); // Immediate run
}

// Inject main world script to sync AngularJS scope directly
function injectMainWorldAngularSync(username, password) {
  try {
    const script = document.createElement('script');
    script.textContent = `
      (function() {
        try {
          const u = ${JSON.stringify(username)};
          const p = ${JSON.stringify(password)};
          const uEl = document.querySelector('#username') || document.querySelector('input[name="username"]');
          const pEl = document.querySelector('#user_pass') || document.querySelector('#password') || document.querySelector('input[type="password"]');

          if (window.angular && uEl && window.angular.element) {
            const ngEl = window.angular.element(uEl);
            const scope = ngEl.scope();
            if (scope) {
              scope.$apply(function() {
                if (scope.user) {
                  scope.user.username = u;
                  if (p) scope.user.password = p;
                }
              });
            }
          }
        } catch (e) {}
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
  } catch (e) {
    // CSP may restrict inline scripts; native input dispatch already handled it
  }
}

// 5. Floating action banner on top of GST portal
function injectAutofillBanner(username, password, gstin, usernameField, passwordField) {
  if (document.getElementById('efilingg-action-bar')) return;

  const bar = document.createElement('div');
  bar.id = 'efilingg-action-bar';
  bar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: linear-gradient(90deg, #022c22 0%, #064e3b 100%);
    border-bottom: 3px solid #10b981;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    z-index: 2147483647;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  `;

  const left = document.createElement('div');
  left.style.cssText = 'display: flex; align-items: center; gap: 10px;';
  left.innerHTML = `
    <div style="background: #10b981; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; color: #ffffff;">E</div>
    <div style="font-size: 12px; font-weight: 600;">
      <span style="color: #6ee7b7; font-weight: 800;">Efilingg CRM:</span> 
      Auto-filled login for <span style="color: #34d399; font-weight: 800; font-family: monospace;">${username}</span> 
      ${gstin ? `(${gstin})` : ''} ✔
    </div>
  `;

  const right = document.createElement('div');
  right.style.cssText = 'display: flex; align-items: center; gap: 10px;';

  const reInjectBtn = document.createElement('button');
  reInjectBtn.innerText = '⚡ Re-Fill';
  reInjectBtn.style.cssText = `
    background: #10b981;
    color: #ffffff;
    border: none;
    padding: 5px 12px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  `;

  reInjectBtn.onclick = () => {
    fillInputField(usernameField, username);
    if (password) fillInputField(passwordField, password);
    injectMainWorldAngularSync(username, password);
    reInjectBtn.innerText = '✔ Filled!';
    setTimeout(() => { reInjectBtn.innerText = '⚡ Re-Fill'; }, 1200);
  };

  const closeBtn = document.createElement('button');
  closeBtn.innerText = '✕';
  closeBtn.style.cssText = `
    background: transparent;
    color: #a7f3d0;
    border: none;
    font-size: 16px;
    cursor: pointer;
    padding: 4px 8px;
  `;
  closeBtn.onclick = () => {
    bar.remove();
    document.body.style.paddingTop = '0px';
  };

  right.appendChild(reInjectBtn);
  right.appendChild(closeBtn);

  bar.appendChild(left);
  bar.appendChild(right);

  document.body.style.paddingTop = '48px';
  document.body.appendChild(bar);
}
