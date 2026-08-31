/**
 * Client-safe Catalog of Approved & Suggested WhatsApp Cloud API Templates
 */

export interface WhatsAppTemplateDefinition {
  name: string;
  category: 'UTILITY' | 'MARKETING' | 'AUTHENTICATION';
  language: string;
  description: string;
  bodyText: string;
  parameterCount: number;
  sampleParameters: string[];
}

export const STANDARD_WHATSAPP_TEMPLATES: WhatsAppTemplateDefinition[] = [
  {
    name: 'hello_world',
    category: 'UTILITY',
    language: 'en_US',
    description: "Meta's Default Pre-Approved Welcome Template (Guaranteed to work on all active WABA accounts)",
    bodyText: 'Hello World! Welcome and thank you for contacting us.',
    parameterCount: 0,
    sampleParameters: [],
  },
  {
    name: 'lead_outreach_v1',
    category: 'MARKETING',
    language: 'en_US',
    description: 'Initial Business Lead Outreach & Engagement (Opens 24h Customer Service Window)',
    bodyText: 'Hello {{1}}, thank you for expressing interest in our compliance and filing services. How may we assist you today?',
    parameterCount: 1,
    sampleParameters: ['Valued Customer'],
  },
  {
    name: 'task_assignment_v22',
    category: 'UTILITY',
    language: 'en_US',
    description: 'Meta-Approved Staff & Associate Operational Task Intimation',
    bodyText: 'Dear Mr. {{1}},\n\nMr. {{2}} has assigned a task for you, kindly complete within the time limit.\n\nTask Details: {{3}}\nPriority: {{4}}\n\nIf task completed, then Mark as Done in your CRM.',
    parameterCount: 4,
    sampleParameters: ['Associate Name', 'Administrator', 'Review GSTR-3B filings for Apex Retails', 'High'],
  },
  {
    name: 'service_update',
    category: 'UTILITY',
    language: 'en_US',
    description: 'Compliance & Filing Status Update for Clients',
    bodyText: 'Hello {{1}}, this is an update regarding your {{2}} with Efilingg. Current Status: {{3}}.',
    parameterCount: 3,
    sampleParameters: ['Client Name', 'ITR Filing', 'Processed Successfully'],
  },
  {
    name: 'payment_reminder',
    category: 'UTILITY',
    language: 'en_US',
    description: 'Invoice & Payment Reminder Notification',
    bodyText: 'Dear {{1}}, gentle reminder regarding your pending invoice {{2}} of amount {{3}}.',
    parameterCount: 3,
    sampleParameters: ['Client Name', 'INV-2026-001', '₹4,999'],
  },
];
