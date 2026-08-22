/**
 * WhatsApp Provider Factory & Configuration Switch
 * 
 * Manages Meta WhatsApp Cloud API (WhatsApp Business API) integration.
 */

import { IWhatsAppProvider, WhatsAppProviderName } from './IWhatsAppProvider';
import { MetaWhatsAppProvider, maskToken } from './MetaWhatsAppProvider';

let cachedMetaProvider: MetaWhatsAppProvider | null = null;

export class WhatsAppProviderFactory {
  /**
   * Validates required environment variables on server startup.
   */
  public static validateEnvironmentOnStartup(): { valid: boolean; missingVariables: string[] } {
    const missing: string[] = [];

    const requiredVars = [
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_BUSINESS_ACCOUNT_ID',
      'WHATSAPP_VERIFY_TOKEN',
    ];

    for (const v of requiredVars) {
      if (!process.env[v] || process.env[v]?.trim() === '') {
        missing.push(v);
      }
    }

    if (!process.env.META_GRAPH_VERSION) {
      process.env.META_GRAPH_VERSION = 'v25.0';
    }

    if (missing.length > 0) {
      const isProduction = process.env.NODE_ENV === 'production';

      if (isProduction) {
        console.error(`\n===================================================================`);
        console.error(`[CRITICAL FATAL CONFIGURATION ERROR] Meta WhatsApp Cloud API Missing Environment Variables!`);
        console.error(`The following REQUIRED environment variables are missing from process.env:`);
        missing.forEach((v) => console.error(`  - ${v}`));
        console.error(`===================================================================\n`);

        throw new Error(
          `[Meta WhatsApp Cloud API Fatal Startup Error] Missing required environment variables in production: ${missing.join(', ')}`
        );
      }

      console.warn(`\n===================================================================`);
      console.warn(`[DEV CONFIG WARNING] Meta WhatsApp Cloud API Missing Environment Variables!`);
      console.warn(`The following REQUIRED environment variables are missing from process.env:`);
      missing.forEach((v) => console.warn(`  - ${v}`));
      console.warn(`\nAutomatically using sandbox defaults for dev preview.`);
      console.warn(`===================================================================\n`);

      // Provide fallback sandbox defaults so applet dev server boots cleanly in development
      if (!process.env.WHATSAPP_ACCESS_TOKEN) process.env.WHATSAPP_ACCESS_TOKEN = 'EAAP_SANDBOX_DEMO_TOKEN_2026';
      if (!process.env.WHATSAPP_PHONE_NUMBER_ID) process.env.WHATSAPP_PHONE_NUMBER_ID = '109283746501234';
      if (!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = '987654321098765';
      if (!process.env.WHATSAPP_VERIFY_TOKEN) process.env.WHATSAPP_VERIFY_TOKEN = 'efilingg_whatsapp_verify_token_2026';
    } else {
      console.log(`\n===================================================================`);
      console.log(`[META WHATSAPP BUSINESS CLOUD API STARTUP VALIDATION SUCCESSFUL]`);
      console.log(`WHATSAPP_PHONE_NUMBER_ID     : ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
      console.log(`WHATSAPP_BUSINESS_ACCOUNT_ID : ${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}`);
      console.log(`WHATSAPP_VERIFY_TOKEN        : ${process.env.WHATSAPP_VERIFY_TOKEN}`);
      console.log(`META_GRAPH_VERSION           : ${process.env.META_GRAPH_VERSION}`);
      console.log(`WHATSAPP_ACCESS_TOKEN (Masked): ${maskToken(process.env.WHATSAPP_ACCESS_TOKEN)}`);
      console.log(`===================================================================\n`);
    }

    return { valid: missing.length === 0, missingVariables: missing };
  }

  /**
   * Determine the configured provider mode
   */
  public static getActiveProviderType(): 'meta' {
    return 'meta';
  }

  /**
   * Get active IWhatsAppProvider instance (Meta WhatsApp Cloud API)
   */
  public static getProvider(): IWhatsAppProvider {
    if (!cachedMetaProvider) {
      cachedMetaProvider = new MetaWhatsAppProvider();
    }
    return cachedMetaProvider;
  }

  /**
   * Runtime provider override (no-op as Meta is the sole provider)
   */
  public static setRuntimeProviderOverride(provider: string): void {
    console.log(`[WhatsAppProviderFactory] Active provider is Meta WhatsApp Cloud API`);
  }

  /**
   * Get detailed status report of WhatsApp provider subsystem
   */
  public static getStatusReport(): {
    activeProvider: WhatsAppProviderName;
    configuredEnvProvider: string;
    runtimeOverride: string | null;
    metaConfigured: boolean;
    cpaasConfigured: boolean;
    deprecationNotice: string | null;
    environmentVariables: Record<string, string>;
  } {
    const hasMetaToken = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN.trim() !== '');
    const hasMetaPhoneId = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_PHONE_NUMBER_ID.trim() !== '');
    const hasMetaBusinessId = !!(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID && process.env.WHATSAPP_BUSINESS_ACCOUNT_ID.trim() !== '');

    return {
      activeProvider: 'META_CLOUD_API',
      configuredEnvProvider: 'meta (Meta WhatsApp Cloud API)',
      runtimeOverride: null,
      metaConfigured: hasMetaToken && hasMetaPhoneId && hasMetaBusinessId,
      cpaasConfigured: false,
      deprecationNotice: null,
      environmentVariables: {
        WHATSAPP_PROVIDER: 'meta',
        WHATSAPP_ACCESS_TOKEN: maskToken(process.env.WHATSAPP_ACCESS_TOKEN),
        WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || 'NOT_SET',
        WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'NOT_SET',
        WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || 'NOT_SET',
        META_GRAPH_VERSION: process.env.META_GRAPH_VERSION || 'v25.0',
      },
    };
  }
}
