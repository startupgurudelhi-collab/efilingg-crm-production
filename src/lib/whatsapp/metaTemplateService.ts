/**
 * Meta WhatsApp Cloud API Template Client
 * Communicates with Graph API for Message Template Lifecycle Management
 */

import { WhatsAppTemplate, WhatsAppTemplateComponent, WhatsAppSyncResult } from './templateTypes';

export class MetaTemplateService {
  private static getGraphVersion(): string {
    return process.env.META_GRAPH_VERSION || 'v25.0';
  }

  private static getWabaId(): string {
    return process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '987654321098765';
  }

  private static getPhoneNumberId(): string {
    return process.env.WHATSAPP_PHONE_NUMBER_ID || '109283746501234';
  }

  private static getAccessToken(): string {
    return process.env.WHATSAPP_ACCESS_TOKEN || '';
  }

  private static isConfigured(): boolean {
    const token = this.getAccessToken();
    return !!token && token !== 'EAAP_SANDBOX_DEMO_TOKEN_2026' && token.startsWith('EAA');
  }

  /**
   * Fetch all templates from Meta WhatsApp Cloud API
   * GET https://graph.facebook.com/{version}/{waba_id}/message_templates
   */
  public static async fetchMetaTemplates(): Promise<{
    success: boolean;
    data: any[];
    isLiveMeta: boolean;
    error?: string;
  }> {
    const wabaId = this.getWabaId();
    const token = this.getAccessToken();
    const version = this.getGraphVersion();

    if (!this.isConfigured()) {
      return {
        success: true,
        data: [],
        isLiveMeta: false,
      };
    }

    try {
      const url = `https://graph.facebook.com/${version}/${wabaId}/message_templates?fields=id,name,status,category,language,components,rejected_reason,quality_score&limit=100`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        const errorMsg = json.error?.message || `HTTP ${res.status} Error fetching templates from Meta`;
        return {
          success: false,
          data: [],
          isLiveMeta: true,
          error: errorMsg,
        };
      }

      return {
        success: true,
        data: json.data || [],
        isLiveMeta: true,
      };
    } catch (err: any) {
      return {
        success: false,
        data: [],
        isLiveMeta: true,
        error: err.message || 'Network error connecting to Meta Graph API',
      };
    }
  }

  /**
   * Submit a new template to Meta for approval
   * POST https://graph.facebook.com/{version}/{waba_id}/message_templates
   */
  public static async submitTemplateToMeta(template: WhatsAppTemplate): Promise<{
    success: boolean;
    metaTemplateId?: string;
    status: 'APPROVED' | 'PENDING' | 'REJECTED';
    rejectedReason?: string;
    rejectionGuidance?: string;
    isLiveMeta: boolean;
    error?: string;
  }> {
    const wabaId = this.getWabaId();
    const token = this.getAccessToken();
    const version = this.getGraphVersion();

    // Construct Meta components payload
    const components: WhatsAppTemplateComponent[] = [];

    // Header
    if (template.headerType && template.headerType !== 'NONE') {
      if (template.headerType === 'TEXT' && template.headerText) {
        components.push({
          type: 'HEADER',
          format: 'TEXT',
          text: template.headerText,
        });
      } else if (['IMAGE', 'DOCUMENT', 'VIDEO'].includes(template.headerType)) {
        components.push({
          type: 'HEADER',
          format: template.headerType as any,
          example: template.headerMediaUrl ? { header_handle: [template.headerMediaUrl] } : undefined,
        });
      }
    }

    // Body
    const bodyComponent: WhatsAppTemplateComponent = {
      type: 'BODY',
      text: template.bodyText,
    };

    if (template.parameterCount > 0 && template.sampleParameters?.length > 0) {
      bodyComponent.example = {
        body_text: [template.sampleParameters],
      };
    }
    components.push(bodyComponent);

    // Footer
    if (template.footerText?.trim()) {
      components.push({
        type: 'FOOTER',
        text: template.footerText.trim(),
      });
    }

    // Buttons
    if (template.buttons && template.buttons.length > 0) {
      const metaButtons = template.buttons.map((b) => {
        if (b.type === 'QUICK_REPLY') {
          return { type: 'QUICK_REPLY' as const, text: b.text };
        } else if (b.type === 'URL') {
          return { type: 'URL' as const, text: b.text, url: b.url || 'https://efilingg.com' };
        } else {
          return { type: 'PHONE_NUMBER' as const, text: b.text, phone_number: b.phoneNumber || '+919876543210' };
        }
      });
      components.push({
        type: 'BUTTONS',
        buttons: metaButtons,
      });
    }

    const payload = {
      name: template.name.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      category: template.category,
      language: template.language || 'en_US',
      components,
    };

    if (!this.isConfigured()) {
      // In Demo / Sandbox mode, simulate realistic Meta verification
      const isQuickPass = template.category === 'UTILITY' || template.name.includes('lead') || template.name.includes('task');
      return {
        success: true,
        metaTemplateId: `meta_tmpl_${Math.random().toString(36).substring(2, 10)}`,
        status: isQuickPass ? 'APPROVED' : 'PENDING',
        isLiveMeta: false,
      };
    }

    try {
      const url = `https://graph.facebook.com/${version}/${wabaId}/message_templates`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        const errorMsg = json.error?.message || `Meta API Error (${res.status})`;
        const errorSubcode = json.error?.error_subcode;
        return {
          success: false,
          status: 'REJECTED',
          rejectedReason: errorMsg,
          rejectionGuidance: getMetaRejectionGuidance(errorSubcode || errorMsg),
          isLiveMeta: true,
          error: errorMsg,
        };
      }

      return {
        success: true,
        metaTemplateId: json.id,
        status: json.status || 'PENDING',
        isLiveMeta: true,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'REJECTED',
        rejectedReason: err.message,
        isLiveMeta: true,
        error: err.message || 'Connection failed while submitting to Meta',
      };
    }
  }

  /**
   * Delete a template from Meta Cloud API
   * DELETE https://graph.facebook.com/{version}/{waba_id}/message_templates?name={name}
   */
  public static async deleteMetaTemplate(templateName: string): Promise<{
    success: boolean;
    isLiveMeta: boolean;
    error?: string;
  }> {
    if (!this.isConfigured()) {
      return { success: true, isLiveMeta: false };
    }

    const wabaId = this.getWabaId();
    const token = this.getAccessToken();
    const version = this.getGraphVersion();

    try {
      const url = `https://graph.facebook.com/${version}/${wabaId}/message_templates?name=${encodeURIComponent(
        templateName
      )}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        return {
          success: false,
          isLiveMeta: true,
          error: json.error?.message || 'Failed to delete template from Meta',
        };
      }

      return { success: true, isLiveMeta: true };
    } catch (err: any) {
      return {
        success: false,
        isLiveMeta: true,
        error: err.message,
      };
    }
  }

  /**
   * Send a test template message to a target phone number
   */
  public static async sendTestTemplate(params: {
    toPhone: string;
    template: WhatsAppTemplate;
    parameters: string[];
    senderId: string;
    senderName: string;
  }): Promise<{
    success: boolean;
    messageId?: string;
    providerErrorCode?: number;
    providerErrorMessage?: string;
    httpStatus: number;
  }> {
    const phoneNumberId = this.getPhoneNumberId();
    const token = this.getAccessToken();
    const version = this.getGraphVersion();

    // Clean phone
    let cleanPhone = params.toPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length === 10 && !cleanPhone.startsWith('91')) {
      cleanPhone = `91${cleanPhone}`;
    }

    const formattedParams = params.parameters.map((p) => ({
      type: 'text',
      text: p || 'Valued User',
    }));

    const components: any[] = [];
    if (formattedParams.length > 0) {
      components.push({
        type: 'body',
        parameters: formattedParams,
      });
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: cleanPhone,
      type: 'template',
      template: {
        name: params.template.name,
        language: {
          code: params.template.language || 'en_US',
        },
        components,
      },
    };

    if (!this.isConfigured()) {
      console.log(`[MetaTemplateService Demo Send] Template "${params.template.name}" simulated test to ${cleanPhone}`);
      return {
        success: true,
        messageId: `wamid.HBgL${Math.random().toString(36).substring(2, 14)}TEST`,
        httpStatus: 200,
      };
    }

    try {
      const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || json.error) {
        return {
          success: false,
          providerErrorCode: json.error?.code || res.status,
          providerErrorMessage: json.error?.message || 'Meta Cloud API test dispatch rejected',
          httpStatus: res.status,
        };
      }

      const wamid = json.messages?.[0]?.id;
      return {
        success: true,
        messageId: wamid,
        httpStatus: 200,
      };
    } catch (err: any) {
      return {
        success: false,
        providerErrorCode: 500,
        providerErrorMessage: err.message || 'Network error dispatching test template',
        httpStatus: 500,
      };
    }
  }
}

/**
 * Helper to generate human-readable actionable guidance for Meta rejection reasons
 */
export function getMetaRejectionGuidance(reason: string | number): string {
  const r = String(reason).toUpperCase();
  if (r.includes('CATEGORY') || r.includes('INCORRECT_CATEGORY')) {
    return 'Meta categorized this template differently. Utility templates must be transactional updates. If promotional language is used, change category to MARKETING.';
  }
  if (r.includes('VARIABLE') || r.includes('PARAM') || r.includes('SAMPLE')) {
    return 'Meta requires sample values for all dynamic variables {{1}}, {{2}}, etc. Ensure realistic sample parameters are supplied.';
  }
  if (r.includes('POLICY') || r.includes('COMMERCE') || r.includes('TERMS')) {
    return 'Template violates Meta Commerce or Business Messaging Policy. Avoid sensitive keywords, offensive phrasing, or deceptive links.';
  }
  if (r.includes('LANGUAGE') || r.includes('TRANSLATION')) {
    return 'Template text does not match the chosen language code. Make sure the body text is translated into the specified language.';
  }
  return 'Review Meta WhatsApp Business Policy guidelines. Ensure variables are formatted correctly and sample parameters are provided.';
}
