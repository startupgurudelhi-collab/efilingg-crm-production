/**
 * CPaaS Filter & Isolation Utility
 * 
 * Ensures all webhooks, payloads, and messages associated with legacy CPaaS
 * or the old CPaaS number (9217666839) are completely discarded and prevented
 * from entering CRM Chat, Lead Engine, or AI Agents.
 */

export const FORBIDDEN_CPAAS_NUMBERS = [
  '9217666839',
  '919217666839',
  '+919217666839',
  '09217666839',
];

export const FORBIDDEN_CPAAS_KEYWORDS = [
  '9217666839',
  '51736254',
  '1632',
  'legomark',
  'cpaas',
  'legomark cpaas',
];

/**
 * Checks if a given payload, phone number, or message object originates from or is targeted at legacy CPaaS
 */
export function isForbiddenCPaaSPayload(payload: any): boolean {
  if (!payload) return false;

  try {
    const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const lowerStr = payloadStr.toLowerCase();

    // 1. String match for legacy CPaaS identifiers & number 9217666839
    for (const kw of FORBIDDEN_CPAAS_KEYWORDS) {
      if (lowerStr.includes(kw)) {
        return true;
      }
    }

    // 2. Structural checks
    if (typeof payload === 'object') {
      const p = payload as any;

      if (
        p.srno ||
        p.wabaSrno ||
        p.waba_srno ||
        p.replyFrom ||
        p.cpaas ||
        p.provider === 'LEGOMARK_CPAAS' ||
        p.provider_name === 'LEGOMARK_CPAAS'
      ) {
        return true;
      }

      // Check direct phone fields
      const checkNumbers = [
        p.wabaNumber,
        p.waba_number,
        p.from,
        p.to,
        p.mobile,
        p.phone,
        p.sender_number,
        p.senderNumber,
        p.recipient_id,
        p.destination,
      ];

      for (const num of checkNumbers) {
        if (num && String(num).replace(/\D/g, '').includes('9217666839')) {
          return true;
        }
      }

      // Check Meta nested structure
      const entries = p.entry || [];
      for (const entry of entries) {
        const changes = entry?.changes || [];
        for (const change of changes) {
          const val = change?.value;
          if (!val) continue;

          const displayPhone = val.metadata?.display_phone_number;
          const phoneId = val.metadata?.phone_number_id;

          if (displayPhone && String(displayPhone).replace(/\D/g, '').includes('9217666839')) {
            return true;
          }
          if (phoneId && String(phoneId).includes('9217666839')) {
            return true;
          }

          const msgs = val.messages || [];
          for (const m of msgs) {
            if (m.from && String(m.from).replace(/\D/g, '').includes('9217666839')) {
              return true;
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('[cpaasFilter] Error checking payload:', err);
  }

  return false;
}

/**
 * Checks if a contact phone or conversation belongs to legacy CPaaS number
 */
export function isForbiddenCPaaSPhone(phone?: string | null): boolean {
  if (!phone) return false;
  const clean = String(phone).replace(/\D/g, '');
  return clean.includes('9217666839');
}
