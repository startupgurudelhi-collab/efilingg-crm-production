# Efilingg Desktop Agent (v2.0.0) - Windows Utility System Manual
### Enterprise Architecture, Security Model, and Administrative Deployment Guide

This document defines the architecture, code paths, deployment pipeline, and threat security model for the **Efilingg CRM V2 Secure Desktop Agent**, replacing legacy browser extension boundaries with a robust local Windows background service.

---

## 1. Executive Summary & Security Philosophy

The **Efilingg Windows Desktop Agent** runs as an offline background daemon on the employee's local workstation. By offloading the login orchestration from front-end Javascript context scripts to an OS-level environment, we achieve:
- **Zero Front-End Exposure**: Credentials (`username`/`password`) never pass through or exist in the web page DOM or client-side Javascript memory.
- **Hardware Bindings (Workstation MFA)**: Only workstations explicitly whitelisted by the Admin in the cloud CRM are permitted to trigger credential decryption.
- **Direct Applet Interfacing (CDP)**: Controls Google Chrome or MS Edge through a localized Chrome DevTools Protocol (CDP) WebSocket connection, avoiding unreliable browser extension sandboxes.

---

## 2. Secure Flow Sequence

```
[Employee Browser Frame]       [Local Dev Agent (Port 12112)]       [Corporate CRM Cloud]       [Official GST Portal]
      |                                      |                                  |                           |
      |-- 1. Clicks "Auto-Login" ----------->|                                  |                           |
      |   (Exchanges short token)            |                                  |                           |
      |                                      |-- 2. GET Check Credentials ------>|                           |
      |                                      |   (Signed with unique DeviceKey) |                           |
      |                                      |                                  |                           |
      |                                      |<-- 3. Decrypted Credentials -----|                           |
      |                                      |    (Released to authorized agent)|                           |
      |                                      |                                  |                           |
      |                                      |-- 4. Launches Chrome/Edge ------>|                           |
      |                                      |   (Debugging Port 9222 Armed)    |                           |
      |                                      |                                  |                           |
      |                                      |-- 5. Conn to CDP WebSocket --------------------------------->|
      |                                      |   (Autofills fields / focus Captcha)                         |
      |                                      |                                  |                           |
      |                                      |-- 6. Discards Credentials -------|                           |
      |                                      |   (Zeros local memory)           |                           |
```

---

## 3. Core Architectural Modules

The agent consists of four highly integrated modular systems:

### A. Local HTTP Daemon (`agent.js`)
Listens on loopback `127.0.0.1:12112`. Strictly isolates incoming bindings by matching request `Origin` headers against verified corporate tenant URLs.

### B. Unique Workstation Identity (`config.json`)
Saves a unique generated payload under `%APPDATA%\EfilinggAgent\config.json`.
```json
{
  "deviceId": "EFID_B73C8E991A",
  "deviceKey": "EFSK_4021C78EA9024B1AA...",
  "deviceName": "Workstation_TL_Row4",
  "authorizedByCrm": true,
  "registeredEmployeeId": "emp_01",
  "lastCrmOrigin": "https://efilingg-crm-v2.asia-southeast1.run.app"
}
```

### C. Chrome DevTools Protocol Injected Driver (CDP)
Launches the Chromium instance using standard security isolation flags:
`--remote-debugging-port=9222 --user-data-dir="%APPDATA%\EfilinggAgent\EfilinggAutofillChromeProfile" --no-first-run`
Sends structured evaluations directly down the WebSocket debugging pipe to simulate high-fidelity typing. No browser-level storage files are modified.

### D. Centralized Audit Log Pipe
Lobbies all transactional actions (startups, failures, logins, updates) downstream directly into the localized write logs and replicates the actions securely to the central CRM server log history.

---

## 4. Workgroup GPO & MSI Installer Deployment Guide

To deploy the **Efilingg Windows Desktop Agent** across hundreds of employee systems silolessly, follow these administrative guidelines:

### Step 1: Create the Standard Setup Installer
Using standard Windows installer builder software like **Inno Setup (Free & Open Source)**, compile the compiled `bin/EfilinggDesktopAgent.exe` executable:

Create an Inno Setup script (`setup.iss`):
```pascal
[Setup]
AppName=Efilingg Desktop Agent
AppVersion=2.0.0
DefaultDirName={pf}\EfilinggAgent
DefaultGroupName=Efilingg CRM
UninstallDisplayIcon={app}\EfilinggDesktopAgent.exe
OutputDir=.
OutputBaseFilename=EfilinggDesktopAgentSetup
Compression=lzma
SolidCompression=yes

[Files]
Source: "bin\EfilinggDesktopAgent.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Efilingg Agent"; Filename: "{app}\EfilinggDesktopAgent.exe"
Name: "{commonstartup}\EfilinggAgent"; Filename: "{app}\EfilinggDesktopAgent.exe"

[Run]
Filename: "{app}\EfilinggDesktopAgent.exe"; Description: "Launch Background Service"; Flags: nowait postinstall
```

### Step 2: Push via Active Directory GPO
1. Convert the resulting `.exe` installer to `.msi` using standard wrap compilers (e.g., *MSI Wrapper*).
2. Open **Group Policy Management** in your Windows Domain Controller.
3. Establish a New GPO: **Deploy-Efilingg-Agent**.
4. Navigate to **Computer Configuration -> Policies -> Software Settings -> Software installation**.
5. Right-click, select **New -> Package**, and point to the `.msi` package on your shared network path.
6. Set deployment state as **Assigned**. This automatically silently installs the agent on every computer at next system startup.

---

## 5. Automated Updates Mechanism
The Windows Agent checks version matches by polling `/api/desktop/check-update?crmUrl=...` every time it starts or daily in the background. If a newer package is registered, it downloads the compiled executable from `/api/desktop/download-latest` into a transition directory, safely terminates the current process, overwrites itself, and re-launches itself in less than 3 seconds!

---

## 6. Security Threat Model & Protections

| Threat Vector | Potential Exposure | Mitigating Desktop Agent Control |
|---|---|---|
| **Interception of Exchange Token** | Man-In-the-Middle sniffs a login token. | **Single-Use Policy**: CRM voids the exchange token immediately once consumed. Even if intercepted, reuse is blocked. |
| **Rogue Site calling Localhost** | Malicious script in another tab POSTs to local port `12112`. | **CORS Strict Domain Checking**: Agent rejects any HTTP request whose Origin fails to match corporate white-listed boundaries. |
| **Stolen Workstation Device** | Physical computer stolen from office. | **Admin Central-Revocation**: Remote Master admin can immediately toggle device status to **REVOKED** inside the CRM Device Masters list. |
| **Credential sniffing on disk** | Inspecting temporary workstation storage caches. | **Zero-Persistence RAM Design**: Decrypted passwords exist exclusively in short-lived memory during the CDP injection script frame and are immediately garbage-collected. |
