/**
 * WhatsApp Provider Factory & Configuration Switch
 * 
 * Manages active provider (Meta WhatsApp Cloud API vs Legomark CPaaS)
 * based on WHATSAPP_PROVIDER environment variable or dynamic runtime admin toggle.
 */

import { IWhatsAppProvider, WhatsAppProviderName } from './IWhatsAppProvider';
import { MetaWhatsAppProvider, maskToken } from './MetaWhatsAppProvider';
import { LegomarkCPaasProvider } from './LegomarkCPaasProvider';

let runtimeOverride: 'meta' | 'cpaas' | null = null;
let cachedMetaProvider: MetaWhatsAppProvider | null = null;
let cachedCPaasProvider: LegomarkCPaasProvider | null = null;

export class WhatsAppProviderFactory {
  /**
   * Validates required environment variables on server startup.
   * If any variable is missing for active provider 'meta', stops startup and logs error.
   */
  public static validateEnvironmentOnStartup(): { valid: boolean; missingVariables: string[] } {
    const activeProvider = WhatsAppProviderFactory.getActiveProviderType();
    const missing: string[] = [];

    if (activeProvider === 'meta') {
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
          console.error(`Active WHATSAPP_PROVIDER = "${process.env.WHATSAPP_PROVIDER || 'meta'}"`);
          console.error(`The following REQUIRED environment variables are missing from process.env:`);
          missing.forEach((v) => console.error(`  - ${v}`));
          console.error(`===================================================================\n`);

          throw new Error(
            `[Meta WhatsApp Cloud API Fatal Startup Error] Missing required environment variables in production: ${missing.join(', ')}`
          );
        }

        console.warn(`\n===================================================================`);
        console.warn(`[DEV CONFIG WARNING] Meta WhatsApp Cloud API Missing Environment Variables!`);
        console.warn(`Active WHATSAPP_PROVIDER = "${process.env.WHATSAPP_PROVIDER || 'meta'}"`);
        console.warn(`The following REQUIRED environment variables are missing from process.env:`);
        missing.forEach((v) => console.warn(`  - ${v}`));
        console.warn(`\nAutomatically switching to Sandbox Mode for dev server startup.`);
        console.warn(`===================================================================\n`);

        // Provide fallback sandbox defaults so applet dev server boots cleanly in development
        if (!process.env.WHATSAPP_ACCESS_TOKEN) process.env.WHATSAPP_ACCESS_TOKEN = 'EAAP_SANDBOX_DEMO_TOKEN_2026';
        if (!process.env.WHATSAPP_PHONE_NUMBER_ID) process.env.WHATSAPP_PHONE_NUMBER_ID = '109283746501234';
        if (!process.env.WHATSAPP_BUSINESS_ACCOUNT_ID) process.env.WHATSAPP_BUSINESS_ACCOUNT_ID = '987654321098765';
        if (!process.env.WHATSAPP_VERIFY_TOKEN) process.env.WHATSAPP_VERIFY_TOKEN = 'efilingg_whatsapp_verify_token_2026';
      } else {
        console.log(`\n===================================================================`);
        console.log(`[META WHATSAPP CLOUD API STARTUP VALIDATION SUCCESSFUL]`);
        console.log(`WHATSAPP_PROVIDER            : ${process.env.WHATSAPP_PROVIDER || 'meta'}`);
        console.log(`WHATSAPP_PHONE_NUMBER_ID     : ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
        console.log(`WHATSAPP_BUSINESS_ACCOUNT_ID : ${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}`);
        console.log(`WHATSAPP_VERIFY_TOKEN        : ${process.env.WHATSAPP_VERIFY_TOKEN}`);
        console.log(`META_GRAPH_VERSION           : ${process.env.META_GRAPH_VERSION}`);
        console.log(`WHATSAPP_ACCESS_TOKEN (Masked): ${maskToken(process.env.WHATSAPP_ACCESS_TOKEN)}`);
        console.log(`===================================================================\n`);
      }
    } else if (activeProvider === 'cpaas') {
      console.warn(`\n[CPaaS Provider Active] Operating on deprecated Legomark CPaaS fallback transport.`);
    }

    return { valid: missing.length === 0, missingVariables: missing };
  }

  /**
   * Determine the configured provider mode from environment or runtime toggle
   */
  public static getActiveProviderType(): 'meta' | 'cpaas' {
    if (runtimeOverride) {
      return runtimeOverride;
    }

    const envVal = (process.env.WHATSAPP_PROVIDER || '').toLowerCase().trim();
    if (envVal === 'cpaas' || envVal === 'legomark') {
      return 'cpaas';
    }

    // Default to Meta WhatsApp Cloud API
    return 'meta';
  }

  /**
   * Get active IWhatsAppProvider instance
   */
  public static getProvider(overrideType?: 'meta' | 'cpaas'): IWhatsAppProvider {
    const targetType = overrideType || WhatsAppProviderFactory.getActiveProviderType();

    if (targetType === 'cpaas') {
      if (!cachedCPaasProvider) {
        cachedCPaasProvider = new LegomarkCPaasProvider();
      }
      return cachedCPaasProvider;
    }

    if (!cachedMetaProvider) {
      cachedMetaProvider = new MetaWhatsAppProvider();
    }
    return cachedMetaProvider;
  }

  /**
   * Dynamically switch the active provider at runtime without restart
   */
  public static setRuntimeProviderOverride(provider: 'meta' | 'cpaas'): void {
    runtimeOverride = provider;
    console.log(`[WhatsAppProviderFactory] Runtime provider updated to: ${provider.toUpperCase()}`);
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
    const activeType = WhatsAppProviderFactory.getActiveProviderType();
    const isMeta = activeType === 'meta';

    const hasMetaToken = !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_ACCESS_TOKEN.trim() !== '');
    const hasMetaPhoneId = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_PHONE_NUMBER_ID.trim() !== '');
    const hasMetaBusinessId = !!(process.env.WHATSAPP_BUSINESS_ACCOUNT_ID && process.env.WHATSAPP_BUSINESS_ACCOUNT_ID.trim() !== '');

    const hasCPaasKey = !!(process.env.CPAAS_API_KEY && process.env.CPAAS_API_KEY.trim() !== '');
    const hasCPaasWaba = !!(process.env.CPAAS_WABA_NUMBER && process.env.CPAAS_WABA_NUMBER.trim() !== '');

    return {
      activeProvider: isMeta ? 'META_CLOUD_API' : 'LEGOMARK_CPAAS',
      configuredEnvProvider: process.env.WHATSAPP_PROVIDER || 'meta (default)',
      runtimeOverride: runtimeOverride || null,
      metaConfigured: hasMetaToken && hasMetaPhoneId && hasMetaBusinessId,
      cpaasConfigured: hasCPaasKey && hasCPaasWaba,
      deprecationNotice: activeType === 'cpaas'
        ? 'Legomark CPaaS provider is active but DEPRECATED. Migration to Meta WhatsApp Cloud API (WHATSAPP_PROVIDER=meta) is recommended.'
        : null,
      environmentVariables: {
        WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || 'meta',
        WHATSAPP_ACCESS_TOKEN: maskToken(process.env.WHATSAPP_ACCESS_TOKEN),
        WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || 'NOT_SET',
        WHATSAPP_BUSINESS_ACCOUNT_ID: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || 'NOT_SET',
        WHATSAPP_VERIFY_TOKEN: process.env.WHATSAPP_VERIFY_TOKEN || 'NOT_SET',
        META_GRAPH_VERSION: process.env.META_GRAPH_VERSION || 'v25.0',
        CPAAS_API_KEY: hasCPaasKey ? '***PRESENT***' : 'NOT_SET',
        CPAAS_WABA_NUMBER: process.env.CPAAS_WABA_NUMBER || 'NOT_SET',
      },
    };
  }
}
