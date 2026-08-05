/**
 * Meta Click-to-WhatsApp Tracking Service
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 3 - Module 1)
 *
 * Captures, parses, and persists Meta ad referral parameters:
 * Page ID, Campaign ID/Name, AdSet ID/Name, Ad ID/Name, Creative ID, Click ID, Referral Source.
 */

import { MetaAttribution } from './types';
import { saveConversation, getConversationById, saveLead, getLeadById } from '../block1/db';
import { addTimelineEntry } from '../block1/db';

export class MetaAttributionService {
  /**
   * Parse incoming Meta Webhook referral payload object
   */
  public static parseMetaReferralPayload(rawPayload: any): MetaAttribution {
    const referral = rawPayload?.referral || rawPayload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]?.referral || {};

    return {
      pageId: referral.source_id || referral.page_id || rawPayload.page_id,
      campaignId: referral.campaign_id || referral.ad_id,
      campaignName: referral.campaign_name || 'Facebook Click-to-WhatsApp Campaign',
      adSetId: referral.adset_id,
      adSetName: referral.adset_name || 'Default AdSet',
      adId: referral.ad_id,
      adName: referral.ad_name || 'Click-to-WhatsApp Ad',
      creativeId: referral.creative_id,
      clickId: referral.fbclid || referral.click_id || `FBCLID-${Date.now()}`,
      referralSource: referral.source_type || 'AD_CLICK',
      landingTimestamp: new Date().toISOString(),
      conversationSource: 'META_CLICK_TO_WHATSAPP',
      marketingAttribution: {
        headline: referral.headline || 'Get Immediate GST & Tax Compliance Support',
        body: referral.body || 'Chat with Efilingg AI Assistant on WhatsApp',
        mediaType: referral.media_type || 'IMAGE',
      },
    };
  }

  /**
   * Persist Meta Attribution with Conversation and Lead
   */
  public static attachAttributionToConversation(
    conversationId: string,
    attribution: MetaAttribution,
    leadId?: string
  ): void {
    const conv = getConversationById(conversationId);
    if (conv) {
      conv.marketingAttribution = {
        ...(conv.marketingAttribution || {}),
        ...attribution,
      };
      saveConversation(conv);

      addTimelineEntry(
        conversationId,
        'META_ATTRIBUTION_CAPTURED',
        `Meta Ad Referral Tracked: Campaign "${attribution.campaignName}" (ClickID: ${attribution.clickId})`,
        'MetaWebhookEngine'
      );
    }

    if (leadId) {
      const lead = getLeadById(leadId);
      if (lead) {
        lead.campaignSource = attribution.campaignName;
        lead.adSetId = attribution.adSetId;
        lead.adId = attribution.adId;
        lead.clickId = attribution.clickId;
        saveLead(lead);
      }
    }
  }
}
