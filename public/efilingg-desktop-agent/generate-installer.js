/**
 * Generate Efilingg Agent Installer configuration for Windows
 * This script automates compiler bundles and packages them for corporate deployment.
 */

const fs = require('fs');
const path = require('path');

console.log("====================================================");
console.log("   EFILINGG CRM CUSTOM WINDOWS INSTALLER CREATOR  ");
console.log("====================================================\n");

const templatePath = path.join(__dirname, 'config.template.json');
const targetConfigPath = path.join(__dirname, 'config.json');

const defaultConfig = {
  deviceId: "EFID_FINGERPRINT_PLACEHOLDER",
  deviceKey: "EFSK_CRYPTO_KEY_PLACEHOLDER",
  deviceName: "WORKSTATION_OFFICE_PC",
  authorizedByCrm: false,
  registeredEmployeeId: "",
  createdAt: new Date().toISOString()
};

try {
  // Save template configuration helper
  fs.writeFileSync(templatePath, JSON.stringify(defaultConfig, null, 2), 'utf8');
  console.log("✔ Saved configuration template config.template.json");

  // Output mock compiler directions or ready to package file structures
  const buildDir = path.join(__dirname, 'bin');
  if (!fs.existsSync(buildDir)){
    fs.mkdirSync(buildDir, { recursive: true });
  }
  
  console.log("\nInstaller environment structured perfectly!");
  console.log("Deployment files created at: " + __dirname);
  console.log("\nTo compile to a single EfilinggDesktopAgent.exe execution binary on Windows:");
  console.log(" 1. Run: npm install");
  console.log(" 2. Run: npm run compile");
  console.log("\nDeploy on employee systems using your corporate Active Directory GPO or standard .exe distribution!");
  console.log("====================================================");

} catch (err) {
  console.error("Installer structure generation failed:", err);
}
