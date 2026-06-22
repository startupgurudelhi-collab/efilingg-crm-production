// Content Script - Efilingg CRM Assistant
console.log("[Efilingg Content] Extension content script loaded and active on page: " + window.location.href);

// Helper to resolve stable API origin and bypass third-party overrides
function getCRMOrigin(providedUrl) {
  if (providedUrl && !providedUrl.includes("gst.gov.in")) {
    return providedUrl;
  }
  if (window.location.hostname.includes("gst.gov.in")) {
    return ""; // No backend exists directly on services.gst.gov.in domain
  }
  return window.location.origin;
}

// Helper to handle initiating GST Portal login via extension background page
let lastTriggerTime = 0;
let lastTriggerClientId = '';

function triggerExtensionLogin(clientId, exchangeToken, apiUrl, username, password, gstin, skipTabCreation) {
  const now = Date.now();
  if (clientId === lastTriggerClientId && (now - lastTriggerTime) < 1000) {
    console.log("[Efilingg Content] Ignoring duplicate login trigger within 1000ms for client ID: " + clientId);
    return;
  }
  lastTriggerTime = now;
  lastTriggerClientId = clientId;

  const resolvedApiUrl = getCRMOrigin(apiUrl);
  console.log("[Efilingg Content] CRM Connection: Action triggered login for client " + (gstin || clientId) + " on API: " + resolvedApiUrl + " with skipTabCreation: " + !!skipTabCreation);
  
  chrome.runtime.sendMessage({
    action: "initiate_gst_login",
    clientId,
    exchangeToken,
    username,
    password,
    gstin,
    skipTabCreation: !!skipTabCreation,
    apiUrl: resolvedApiUrl
  }, (response) => {
    // Error handling on message response
    if (chrome.runtime.lastError) {
      console.error("[Efilingg Content] Connection Failure: Could not reach extension background script.", chrome.runtime.lastError);
      return;
    }

    if (response && response.success) {
      console.log("[Efilingg Content] CRM Connection: Extension acknowledged initiation. Credentials cached in background service worker.");
    } else {
      const errMsg = response ? response.error : 'Connection timeout';
      console.error("[Efilingg Content] Secure receipt rejected:", errMsg);
    }
  });
}

// 1. Check for standard window messages (extremely reliable for crossing isolated world limits from the CRM page)
window.addEventListener('message', (event) => {
  if (event.data && event.data.source === 'efilingg-crm-page') {
    if (event.data.action === 'initiate_gst_login') {
      const { clientId, exchangeToken, username, password, gstin, crmUrl, skipTabCreation } = event.data;
      const apiUrl = crmUrl || event.origin || window.location.origin;
      triggerExtensionLogin(clientId, exchangeToken, apiUrl, username, password, gstin, skipTabCreation);
    } 
    
    else if (event.data.action === 'ping_extension') {
      console.log("[Efilingg Content] Ping received from CRM page. Responding pong to confirm connectivity.");
      window.postMessage({
        source: 'efilingg-extension',
        action: 'extension_pong',
        success: true,
        version: '1.0.0'
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
    const { clientId, exchangeToken, username, password, gstin, crmUrl, skipTabCreation } = data;
    const apiUrl = crmUrl || window.location.origin;
    triggerExtensionLogin(clientId, exchangeToken, apiUrl, username, password, gstin, skipTabCreation);
  }
});


// 3. IDENTIFY IF CURRENTLY RUNNING SECURELY ON GOVERNMENT GST PORTAL LOGIN
if (window.location.hostname.includes("gst.gov.in") && window.location.pathname.includes("/login")) {
  console.log("[Efilingg Content] GST Portal: Page Match! Querying extension background script for active credentials...");
  
  let attempts = 0;
  const maxAttempts = 50; // 25 seconds of polling retry
  
  const locatorInterval = setInterval(() => {
    attempts++;
    
    // Dynamic / fallback selector collection on DOM inputs with strict null checking
    const usernameField = document.getElementById('username') || 
                          document.querySelector('input[name="username"]') || 
                          document.querySelector('input[formcontrolname="username"]') ||
                          document.querySelector('input[placeholder*="Username"]') ||
                          document.querySelector('input[id*="username" i]');
                          
    const passwordField = document.getElementById('user_pass') || 
                          document.querySelector('input[name="user_pass"]') ||
                          document.getElementById('password') || 
                          document.querySelector('input[type="password"]:not([style*="display: none"]):not([style*="display:none"])') ||
                          document.querySelector('input[type="password"]') || 
                          document.querySelector('input[name="password"]') ||
                          document.querySelector('input[formcontrolname="password"]') ||
                          document.querySelector('input[placeholder*="Password"]') ||
                          document.querySelector('input[id*="password" i]');
    
    if (usernameField && passwordField) {
      clearInterval(locatorInterval);
      console.log("[Efilingg Content] GST Portal: Input selectors found in DOM. Querying stored session credentials...");
      
      chrome.runtime.sendMessage({ action: "request_gst_credentials" }, (response) => {
        if (chrome.runtime.lastError) {
          console.warn("[Efilingg Content] Failed to query workspace credentials. Chrome Service Worker is sleeping.", chrome.runtime.lastError);
          return;
        }

        if (response && response.success && response.username) {
          console.log("[Efilingg Content] Credential receipt: Secure credentials confirmed! Injecting user-action prompt bar at the absolute top of the page...");
          
          injectAutofillBanner(response.username, response.password, usernameField, passwordField);
        } else {
          console.log("[Efilingg Content] Idle: No active credentials ready in Chrome extension cache. Awaiting CRM launch.");
        }
      });
    }
    
    if (attempts >= maxAttempts) {
      clearInterval(locatorInterval);
      console.log("[Efilingg Content] End Polling: Input targets not found on the page in 25s.");
    }
  }, 500); // 500ms intervals
}


// 4. FUNCTION TO INJECT A PREMIUM USER-ACTION BAR AT THE VIEWPORT TOP
// This ensures Username/Password are filled ONLY after explicit user consent/action to comply with phase constraints
function injectAutofillBanner(username, password, usernameField, passwordField) {
  // Prevent double injection
  if (document.getElementById('efilingg-action-bar')) return;
  
  // Create beautiful, non-intrusive container
  const bar = document.createElement('div');
  bar.id = 'efilingg-action-bar';
  
  // Custom Styles for our bar
  bar.style.position = 'fixed';
  bar.style.top = '0';
  bar.style.left = '0';
  bar.style.right = '0';
  bar.style.height = '50px';
  bar.style.background = 'linear-gradient(90deg, #1e1b4b 0%, #0f172a 100%)';
  bar.style.borderBottom = '3px solid #6366f1';
  bar.style.color = '#ffffff';
  bar.style.display = 'flex';
  bar.style.alignItems = 'center';
  bar.style.justify = 'space-between';
  bar.style.justifyContent = 'space-between';
  bar.style.padding = '0 24px';
  bar.style.zIndex = '2147483647';
  bar.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  bar.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
  bar.style.transition = 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease';
  
  // Left Label
  const leftLabel = document.createElement('div');
  leftLabel.style.display = 'flex';
  leftLabel.style.alignItems = 'center';
  leftLabel.style.gap = '10px';
  
  const logoCircle = document.createElement('div');
  logoCircle.style.background = '#6366f1';
  logoCircle.style.width = '24px';
  logoCircle.style.height = '24px';
  logoCircle.style.borderRadius = '50%';
  logoCircle.style.display = 'flex';
  logoCircle.style.alignItems = 'center';
  logoCircle.style.justifyContent = 'center';
  logoCircle.style.fontSize = '12px';
  logoCircle.style.fontWeight = 'bold';
  logoCircle.style.color = '#ffffff';
  logoCircle.innerText = 'E';
  
  const labelText = document.createElement('span');
  labelText.style.fontSize = '12.5px';
  labelText.style.fontWeight = 'bold';
  labelText.style.letterSpacing = '0.3px';
  labelText.innerHTML = `Efilingg CRM <span style="color:#a5b4fc">✔</span> Secured login ready for <span style="color:#34d399; font-weight:800; font-family: monospace;">${username}</span>`;
  
  leftLabel.appendChild(logoCircle);
  leftLabel.appendChild(labelText);
  
  // Right Actions Container
  const actions = document.createElement('div');
  actions.style.display = 'flex';
  actions.style.alignItems = 'center';
  actions.style.gap = '12px';
  
  // Autofill Action Button
  const fillBtn = document.createElement('button');
  fillBtn.type = 'button';
  fillBtn.innerText = '⚡ Auto-Fill Credentials';
  fillBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
  fillBtn.style.color = '#ffffff';
  fillBtn.style.border = 'none';
  fillBtn.style.padding = '7px 16px';
  fillBtn.style.borderRadius = '8px';
  fillBtn.style.fontWeight = '800';
  fillBtn.style.fontSize = '11px';
  fillBtn.style.textTransform = 'uppercase';
  fillBtn.style.letterSpacing = '0.5px';
  fillBtn.style.cursor = 'pointer';
  fillBtn.style.transition = 'all 0.2s ease';
  fillBtn.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
  
  fillBtn.onmouseenter = () => {
    fillBtn.style.backgroundColor = '#10b981';
    fillBtn.style.transform = 'scale(1.02)';
  };
  fillBtn.onmouseleave = () => {
    fillBtn.style.backgroundColor = '';
    fillBtn.style.transform = 'none';
  };
  
  // Dismiss Button
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.innerText = '✕';
  closeBtn.style.background = 'transparent';
  closeBtn.style.color = '#94a3b8';
  closeBtn.style.border = 'none';
  closeBtn.style.fontSize = '16px';
  closeBtn.style.cursor = 'pointer';
  closeBtn.style.transition = 'color 0.2s';
  closeBtn.style.padding = '4px 8px';
  closeBtn.onmouseenter = () => { closeBtn.style.color = '#ffffff'; };
  closeBtn.onmouseleave = () => { closeBtn.style.color = '#94a3b8'; };
  
  actions.appendChild(fillBtn);
  actions.appendChild(closeBtn);
  
  bar.appendChild(leftLabel);
  bar.appendChild(actions);
  
  // Push body down slightly so bar does not overlay official GST headers
  document.body.style.paddingTop = '50px';
  document.body.appendChild(bar);
  
  // CLICK BEHAVIOR: Execute autofill ONLY on clicking 'Auto-Fill Credentials'
  fillBtn.addEventListener('click', () => {
    try {
      console.log("[Efilingg Content] Autofill execution: User clicked autofill banner. Securing Main World AngularJS update...");
      
      // Phase 1: Local Context fallback (just in case)
      if (usernameField) {
        usernameField.focus();
        usernameField.click();
        usernameField.value = username;
      }
      
      if (passwordField) {
        passwordField.focus();
        passwordField.click();
        passwordField.value = password;
      }
      
      // Phase 2: Create dynamic script to execute directly in webpage's MAIN world context
      // This has full execution access to window.angular and can properly trigger digests
      const bridgeScript = document.createElement('script');
      bridgeScript.id = 'efilingg-main-world-bridge';
      bridgeScript.textContent = `
        (function() {
          console.log("[Efilingg Bridge] Running main-world credential syncing routine...");
          const rawUser = ${JSON.stringify(username)};
          const rawPass = ${JSON.stringify(password)};
          
          function secureAutofillField(selectors, rawTextValue) {
            let fieldElement = null;
            for (const selector of selectors) {
              try {
                fieldElement = document.querySelector(selector);
                if (fieldElement) break;
              } catch (e) {}
            }
            
            if (!fieldElement) {
              console.warn("[Efilingg Bridge] Target field element not located for selectors:", selectors);
              return;
            }
            
            // Set autocomplete attribute to off / new-password to block native auto-fill triggers
            fieldElement.setAttribute('autocomplete', 'new-password');
            
            // Set focus to simulate user presence
            fieldElement.focus();
            fieldElement.click();
            
            // Set element value securely passing React/Angular prototype setter tracks
            try {
              const prototypeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
              if (prototypeSetter) {
                prototypeSetter.call(fieldElement, rawTextValue);
              } else {
                fieldElement.value = rawTextValue;
              }
            } catch (err) {
              fieldElement.value = rawTextValue;
            }
            
            // Dispatch standard interaction notifications
            ['input', 'change', 'blur'].forEach(evType => {
              try {
                fieldElement.dispatchEvent(new Event(evType, { bubbles: true, cancelable: true }));
              } catch (err) {
                console.warn("[Efilingg Bridge] Dispatch event failed: " + evType, err);
              }
            });
            
            // Sync AngularJS scope controllers
            function syncAngularModel() {
              try {
                if (window.angular && window.angular.element) {
                  const ngEl = window.angular.element(fieldElement);
                  const scope = ngEl.scope();
                  const ngModelCtrl = ngEl.controller('ngModel');
                  if (scope) {
                    scope.$apply(function() {
                      if (ngModelCtrl) {
                        ngModelCtrl.$setViewValue(rawTextValue);
                        ngModelCtrl.$render();
                        ngModelCtrl.$setDirty();
                        ngModelCtrl.$setTouched();
                      } else {
                        // Fallback direct string key path setting
                        const ngModelAttr = fieldElement.getAttribute('ng-model');
                        if (ngModelAttr) {
                          const modelKeys = ngModelAttr.split('.');
                          let currentObj = scope;
                          for (let i = 0; i < modelKeys.length - 1; i++) {
                            if (!currentObj[modelKeys[i]]) {
                              currentObj[modelKeys[i]] = {};
                            }
                            currentObj = currentObj[modelKeys[i]];
                          }
                          currentObj[modelKeys[modelKeys.length - 1]] = rawTextValue;
                        }
                      }
                    });
                  }
                }
              } catch (angularErr) {
                console.error("[Efilingg Bridge] AngularJS scope digest error:", angularErr);
              }
            }
            
            syncAngularModel();
            
            // Lock value against browser autofill/password manager overrides for 5 seconds
            let lockCounter = 0;
            const lockInterval = setInterval(() => {
              if (fieldElement.value !== rawTextValue) {
                console.log("[Efilingg Bridge] Locking active: Blocked external attempt to change field. Instantly restoring CRM client value.");
                fieldElement.value = rawTextValue;
                syncAngularModel();
              }
              lockCounter++;
              if (lockCounter > 50) { // 50 * 100ms = 5 seconds
                clearInterval(lockInterval);
              }
            }, 100);
          }
          
          secureAutofillField(['#username', 'input[name="username"]', 'input[formcontrolname="username"]', 'input[id*="username" i]'], rawUser);
          secureAutofillField(['#user_pass', '#password', 'input[type="password"]', 'input[name="password"]', 'input[id*="password" i]'], rawPass);
          
          console.log("[Efilingg Bridge] AngularJS state syncing & secure lock finished.");
        })();
      `;
      (document.head || document.documentElement).appendChild(bridgeScript);
      bridgeScript.remove(); // Keep page DOM pristine
      
      // Apply beautiful visual success borders
      if (usernameField) {
        usernameField.style.border = "2px solid #059669";
        usernameField.style.backgroundColor = "#ecfdf5";
      }
      if (passwordField) {
        passwordField.style.border = "2px solid #059669";
        passwordField.style.backgroundColor = "#ecfdf5";
      }
      
      // Direct focus onto the Captcha code field to complete employee operation
      const captchaField = document.getElementById('captcha') || 
                           document.querySelector('input[name="captcha"]') || 
                           document.querySelector('input[placeholder*="Captcha"]') ||
                           document.querySelector('input[id*="captcha" i]');
                           
      if (captchaField) {
        captchaField.focus();
        captchaField.style.border = "2px solid #3b82f6";
      }
      
      console.log("[Efilingg Content] Autofill process completed successfully. Banner sliding up.");
      
      // Slide-up transition
      bar.style.transform = 'translateY(-100%)';
      bar.style.opacity = '0';
      setTimeout(() => {
        bar.remove();
        document.body.style.paddingTop = '0px';
      }, 400);

    } catch (err) {
      console.error("[Efilingg Content] Autofill execution caught an unexpected error:", err);
    }
  });
  
  // Close Button behavior
  closeBtn.addEventListener('click', () => {
    bar.style.transform = 'translateY(-100%)';
    bar.style.opacity = '0';
    setTimeout(() => {
      bar.remove();
      document.body.style.paddingTop = '0px';
    }, 400);
  });
}
