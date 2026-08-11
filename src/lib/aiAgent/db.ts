/**
 * AI Sales Agent V1 Foundation - Database Storage Layer
 * Efilingg CRM AI Sales Module
 */

import {
  AiAgentSettings,
  AiService,
  AiFaq,
  AiLeadForm,
  AiLeadFormField,
  AiQualifiedLead,
  AiConversationSession,
  AiTrainingLog,
  AiDashboardMetrics,
  AiQualifiedLeadStatus,
} from '../../types/aiAgent';
import { getStorageString, setStorageString } from '../db';

// Storage Keys
const KEY_SETTINGS = 'efilingg_crm_ai_agent_settings';
const KEY_SERVICES = 'efilingg_crm_ai_services';
const KEY_FAQS = 'efilingg_crm_ai_faqs';
const KEY_LEAD_FORMS = 'efilingg_crm_ai_lead_forms';
const KEY_LEAD_FIELDS = 'efilingg_crm_ai_lead_form_fields';
const KEY_QUALIFIED_LEADS = 'efilingg_crm_ai_qualified_leads';
const KEY_SESSIONS = 'efilingg_crm_ai_conversation_sessions';
const KEY_LOGS = 'efilingg_crm_ai_training_logs';

// Helper read/write
function getItem<T>(key: string, defaultValue: T): T {
  try {
    const val = getStorageString(key);
    if (!val) return defaultValue;
    return JSON.parse(val);
  } catch {
    return defaultValue;
  }
}

function getItems<T>(key: string, defaultItems: T[]): T[] {
  try {
    const val = getStorageString(key);
    if (!val) return defaultItems;
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed) && parsed.length === 0 && defaultItems.length > 0) {
      return defaultItems;
    }
    return parsed;
  } catch {
    return defaultItems;
  }
}

function saveItems<T>(key: string, items: T): void {
  try {
    setStorageString(key, JSON.stringify(items));
  } catch (err) {
    console.error(`[AiAgentDB] Failed to save key ${key}:`, err);
  }
}

// ==========================================
// Initial Production Seed Data
// ==========================================

const DEFAULT_SETTINGS: AiAgentSettings = {
  id: 'AI-SETTINGS-1',
  agent_enabled: true,
  max_questions: 5,
  max_messages: 20,
  handover_message: 'Thank you for sharing the information.\nOur team will connect with you shortly.',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SEED_SERVICES: AiService[] = [
  {
    id: 'SRV-GST-01',
    service_name: 'GST Registration',
    description: 'New GSTIN Registration for Proprietorship, Partnership, LLP & Private Limited companies.',
    price: 1499,
    timeline: '3 - 5 Working Days',
    required_documents: ['PAN Card', 'Aadhaar Card', 'Passport Photo', 'Electricity Bill / Rent Agreement'],
    active: true,
    created_at: '2026-08-01T10:00:00Z',
    updated_at: '2026-08-01T10:00:00Z',
  },
  {
    id: 'SRV-TM-02',
    service_name: 'Trademark Registration',
    description: 'Brand logo and wordmark trademark filing under Controller General of Patents, Designs & Trademarks.',
    price: 4999,
    timeline: '1 Day Filing (Search + TM Application)',
    required_documents: ['Brand Logo PNG/JPEG', 'Applicant Identity Proof', 'Authorization Form TM-48'],
    active: true,
    created_at: '2026-08-02T10:00:00Z',
    updated_at: '2026-08-02T10:00:00Z',
  },
  {
    id: 'SRV-PVT-03',
    service_name: 'Private Limited Incorporation',
    description: 'End-to-end company incorporation including SPICe+ form, DSC, DIN, MOA, AOA, PAN, TAN & Bank Account.',
    price: 7999,
    timeline: '7 - 10 Working Days',
    required_documents: ['2 Directors ID Proofs', '2 Directors Address Proofs', 'Registered Office Utility Bill'],
    active: true,
    created_at: '2026-08-03T10:00:00Z',
    updated_at: '2026-08-03T10:00:00Z',
  },
  {
    id: 'SRV-ITR-04',
    service_name: 'Income Tax Return (ITR) Filing',
    description: 'Tax planning & filing for Salaried, Business Proprietors, F&O Traders & Capital Gains.',
    price: 1999,
    timeline: '1 - 2 Working Days',
    required_documents: ['Form 16', 'Bank Statement', 'Aadhaar Card', 'Investment Proofs'],
    active: true,
    created_at: '2026-08-04T10:00:00Z',
    updated_at: '2026-08-04T10:00:00Z',
  },
];

const SEED_FAQS: AiFaq[] = [
  {
    id: 'FAQ-001',
    service_id: 'SRV-GST-01',
    question: 'Is GST Registration mandatory for all online businesses?',
    answer: 'GST registration is mandatory for any business selling goods via e-commerce operators, or businesses exceeding ₹40 Lakhs turnover for goods (₹20 Lakhs for services).',
    active: true,
    created_at: '2026-08-01T10:30:00Z',
    updated_at: '2026-08-01T10:30:00Z',
  },
  {
    id: 'FAQ-002',
    service_id: 'SRV-GST-01',
    question: 'How long does GST registration approval take?',
    answer: 'Standard government GST portal processing takes 3 to 7 working days upon Aadhaar authentication.',
    active: true,
    created_at: '2026-08-01T10:35:00Z',
    updated_at: '2026-08-01T10:35:00Z',
  },
  {
    id: 'FAQ-003',
    service_id: 'SRV-TM-02',
    question: 'Can I use the ® symbol immediately after filing?',
    answer: 'No, you can use the ™ symbol immediately after filing the application. You can use the ® symbol only after the trademark is registered.',
    active: true,
    created_at: '2026-08-02T11:00:00Z',
    updated_at: '2026-08-02T11:00:00Z',
  },
  {
    id: 'FAQ-004',
    service_id: 'SRV-PVT-03',
    question: 'What is the minimum number of directors required for a Private Limited Company?',
    answer: 'A minimum of 2 directors and 2 shareholders are required for Private Limited incorporation. One director must be a resident of India.',
    active: true,
    created_at: '2026-08-03T11:30:00Z',
    updated_at: '2026-08-03T11:30:00Z',
  },
];

const SEED_LEAD_FORMS: AiLeadForm[] = [
  {
    id: 'FORM-GST-01',
    service_id: 'SRV-GST-01',
    form_name: 'GST Registration Lead Form',
    active: true,
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
  },
  {
    id: 'FORM-TM-02',
    service_id: 'SRV-TM-02',
    form_name: 'Trademark Application Lead Form',
    active: true,
    created_at: '2026-08-02T12:00:00Z',
    updated_at: '2026-08-02T12:00:00Z',
  },
];

const SEED_LEAD_FIELDS: AiLeadFormField[] = [
  // GST Form Fields
  {
    id: 'FLD-GST-01',
    form_id: 'FORM-GST-01',
    field_name: 'applicant_name',
    field_label: 'Applicant Name',
    field_type: 'Text',
    required: true,
    display_order: 1,
    created_at: '2026-08-01T12:05:00Z',
    updated_at: '2026-08-01T12:05:00Z',
  },
  {
    id: 'FLD-GST-02',
    form_id: 'FORM-GST-01',
    field_name: 'mobile_number',
    field_label: 'Mobile Number',
    field_type: 'Phone',
    required: true,
    display_order: 2,
    created_at: '2026-08-01T12:05:00Z',
    updated_at: '2026-08-01T12:05:00Z',
  },
  {
    id: 'FLD-GST-03',
    form_id: 'FORM-GST-01',
    field_name: 'email_address',
    field_label: 'Email Address',
    field_type: 'Email',
    required: true,
    display_order: 3,
    created_at: '2026-08-01T12:05:00Z',
    updated_at: '2026-08-01T12:05:00Z',
  },
  {
    id: 'FLD-GST-04',
    form_id: 'FORM-GST-01',
    field_name: 'state',
    field_label: 'State',
    field_type: 'Dropdown',
    required: true,
    display_order: 4,
    options: ['Delhi NCR', 'Maharashtra', 'Karnataka', 'Gujarat', 'Tamil Nadu', 'Uttar Pradesh', 'Other'],
    created_at: '2026-08-01T12:05:00Z',
    updated_at: '2026-08-01T12:05:00Z',
  },
  {
    id: 'FLD-GST-05',
    form_id: 'FORM-GST-01',
    field_name: 'business_type',
    field_label: 'Business Type',
    field_type: 'Dropdown',
    required: true,
    display_order: 5,
    options: ['Proprietorship', 'Partnership', 'LLP', 'Private Limited'],
    created_at: '2026-08-01T12:05:00Z',
    updated_at: '2026-08-01T12:05:00Z',
  },
  {
    id: 'FLD-GST-06',
    form_id: 'FORM-GST-01',
    field_name: 'annual_turnover',
    field_label: 'Annual Turnover',
    field_type: 'Dropdown',
    required: false,
    display_order: 6,
    options: ['Below ₹20 Lakhs', '₹20 Lakhs - ₹40 Lakhs', 'Above ₹40 Lakhs'],
    created_at: '2026-08-01T12:05:00Z',
    updated_at: '2026-08-01T12:05:00Z',
  },

  // Trademark Form Fields
  {
    id: 'FLD-TM-01',
    form_id: 'FORM-TM-02',
    field_name: 'applicant_name',
    field_label: 'Applicant Name',
    field_type: 'Text',
    required: true,
    display_order: 1,
    created_at: '2026-08-02T12:05:00Z',
    updated_at: '2026-08-02T12:05:00Z',
  },
  {
    id: 'FLD-TM-02',
    form_id: 'FORM-TM-02',
    field_name: 'mobile_number',
    field_label: 'Mobile Number',
    field_type: 'Phone',
    required: true,
    display_order: 2,
    created_at: '2026-08-02T12:05:00Z',
    updated_at: '2026-08-02T12:05:00Z',
  },
  {
    id: 'FLD-TM-03',
    form_id: 'FORM-TM-02',
    field_name: 'brand_name',
    field_label: 'Brand / Logo Name',
    field_type: 'Text',
    required: true,
    display_order: 3,
    created_at: '2026-08-02T12:05:00Z',
    updated_at: '2026-08-02T12:05:00Z',
  },
  {
    id: 'FLD-TM-04',
    form_id: 'FORM-TM-02',
    field_name: 'business_category',
    field_label: 'Business Category / Industry',
    field_type: 'Textarea',
    required: false,
    display_order: 4,
    created_at: '2026-08-02T12:05:00Z',
    updated_at: '2026-08-02T12:05:00Z',
  },
];

const SEED_QUALIFIED_LEADS: AiQualifiedLead[] = [
  {
    id: 'AI-LEAD-001',
    conversation_id: 'CONV-WA-91981000101',
    customer_name: 'Vikram Sethi',
    mobile: '91981000101',
    email: 'vikram.sethi@techcorp.in',
    service_name: 'GST Registration',
    lead_summary: 'Customer requested urgent GST registration for new Proprietorship business in Delhi NCR. All 6 questions answered via AI agent.',
    collected_data: {
      applicant_name: 'Vikram Sethi',
      mobile_number: '91981000101',
      email_address: 'vikram.sethi@techcorp.in',
      state: 'Delhi NCR',
      business_type: 'Proprietorship',
      annual_turnover: 'Below ₹20 Lakhs',
    },
    status: 'NEW',
    status_history: [
      {
        status: 'NEW',
        changed_by: 'AI Sales Agent',
        changed_at: new Date().toISOString(),
        notes: 'Lead qualified automatically after completing required fields.',
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'AI-LEAD-002',
    conversation_id: 'CONV-WA-91981000102',
    customer_name: 'Ananya Roy',
    mobile: '91981000102',
    email: 'ananya@royapparel.com',
    service_name: 'Trademark Registration',
    lead_summary: 'Requested trademark registration for brand "Roy Apparel". Verified brand availability search.',
    collected_data: {
      applicant_name: 'Ananya Roy',
      mobile_number: '91981000102',
      brand_name: 'Roy Apparel',
      business_category: 'Clothing, Fashion & E-commerce',
    },
    status: 'CONTACTED',
    status_history: [
      {
        status: 'NEW',
        changed_by: 'AI Sales Agent',
        changed_at: '2026-08-10T14:00:00Z',
        notes: 'Lead qualified by AI agent.',
      },
      {
        status: 'CONTACTED',
        changed_by: 'Neha Sharma',
        changed_at: '2026-08-10T16:30:00Z',
        notes: 'Executive called customer on WhatsApp and sent proposal.',
      },
    ],
    created_at: '2026-08-10T14:00:00Z',
    updated_at: '2026-08-10T16:30:00Z',
  },
  {
    id: 'AI-LEAD-003',
    conversation_id: 'CONV-WA-91981000103',
    customer_name: 'Rajesh Mehta',
    mobile: '91981000103',
    email: 'rajesh@mehtalogistics.com',
    service_name: 'Private Limited Incorporation',
    lead_summary: 'Incorporation enquiry for 2 directors in Logistics sector. Payment link sent and converted.',
    collected_data: {
      applicant_name: 'Rajesh Mehta',
      mobile_number: '91981000103',
      directors_count: '2',
      state: 'Maharashtra',
    },
    status: 'CONVERTED',
    status_history: [
      {
        status: 'NEW',
        changed_by: 'AI Sales Agent',
        changed_at: '2026-08-09T10:00:00Z',
        notes: 'Lead qualified by AI agent.',
      },
      {
        status: 'CONVERTED',
        changed_by: 'Master Admin',
        changed_at: '2026-08-09T18:00:00Z',
        notes: 'Payment received ₹7,999 for SPICe+ Private Limited registration.',
      },
    ],
    created_at: '2026-08-09T10:00:00Z',
    updated_at: '2026-08-09T18:00:00Z',
  },
];

const SEED_LOGS: AiTrainingLog[] = [
  {
    id: 'LOG-001',
    action_type: 'SETTINGS_UPDATE',
    user_id: 'EMP-ADMIN',
    user_name: 'Master Admin',
    description: 'Updated AI Agent Handover Message & Max Question parameters.',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'LOG-002',
    action_type: 'SERVICE_ADDED',
    user_id: 'EMP-ADMIN',
    user_name: 'Master Admin',
    description: 'Added service "Income Tax Return (ITR) Filing" to AI Knowledge Base.',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

// ==========================================
// Database Repository Operations
// ==========================================

export class AiAgentRepository {
  // SETTINGS
  static getSettings(): AiAgentSettings {
    return getItem<AiAgentSettings>(KEY_SETTINGS, DEFAULT_SETTINGS);
  }

  static updateSettings(settings: Partial<AiAgentSettings>, userId = 'EMP-ADMIN', userName = 'Master Admin'): AiAgentSettings {
    const current = this.getSettings();
    const updated: AiAgentSettings = {
      ...current,
      ...settings,
      updated_at: new Date().toISOString(),
    };
    saveItems(KEY_SETTINGS, updated);

    this.addTrainingLog({
      action_type: 'SETTINGS_UPDATE',
      user_id: userId,
      user_name: userName,
      description: `Updated AI Agent Settings (Enabled: ${updated.agent_enabled}, Max Questions: ${updated.max_questions})`,
    });

    return updated;
  }

  // SERVICES
  static getServices(): AiService[] {
    return getItems<AiService>(KEY_SERVICES, SEED_SERVICES);
  }

  static getServiceById(id: string): AiService | undefined {
    return this.getServices().find((s) => s.id === id);
  }

  static addService(serviceData: Omit<AiService, 'id' | 'created_at' | 'updated_at'>, userId = 'EMP-ADMIN', userName = 'Master Admin'): AiService {
    const services = this.getServices();
    const newService: AiService = {
      ...serviceData,
      id: `SRV-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    services.unshift(newService);
    saveItems(KEY_SERVICES, services);

    this.addTrainingLog({
      action_type: 'SERVICE_ADDED',
      user_id: userId,
      user_name: userName,
      description: `Added new service "${newService.service_name}" (Price: ₹${newService.price})`,
    });

    return newService;
  }

  static updateService(id: string, updates: Partial<AiService>, userId = 'EMP-ADMIN', userName = 'Master Admin'): AiService | null {
    const services = this.getServices();
    const idx = services.findIndex((s) => s.id === id);
    if (idx === -1) return null;

    services[idx] = {
      ...services[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveItems(KEY_SERVICES, services);

    this.addTrainingLog({
      action_type: 'SERVICE_UPDATED',
      user_id: userId,
      user_name: userName,
      description: `Updated service "${services[idx].service_name}"`,
    });

    return services[idx];
  }

  static deleteService(id: string, userId = 'EMP-ADMIN', userName = 'Master Admin'): boolean {
    const services = this.getServices();
    const target = services.find((s) => s.id === id);
    if (!target) return false;

    const filtered = services.filter((s) => s.id !== id);
    saveItems(KEY_SERVICES, filtered);

    this.addTrainingLog({
      action_type: 'SERVICE_DELETED',
      user_id: userId,
      user_name: userName,
      description: `Deleted service "${target.service_name}"`,
    });

    return true;
  }

  // FAQS
  static getFaqs(serviceId?: string): AiFaq[] {
    const faqs = getItems<AiFaq>(KEY_FAQS, SEED_FAQS);
    if (serviceId) {
      return faqs.filter((f) => f.service_id === serviceId);
    }
    return faqs;
  }

  static addFaq(faqData: Omit<AiFaq, 'id' | 'created_at' | 'updated_at'>, userId = 'EMP-ADMIN', userName = 'Master Admin'): AiFaq {
    const faqs = this.getFaqs();
    const newFaq: AiFaq = {
      ...faqData,
      id: `FAQ-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    faqs.unshift(newFaq);
    saveItems(KEY_FAQS, faqs);

    this.addTrainingLog({
      action_type: 'FAQ_ADDED',
      user_id: userId,
      user_name: userName,
      description: `Added new FAQ question: "${newFaq.question.substring(0, 60)}..."`,
    });

    return newFaq;
  }

  static updateFaq(id: string, updates: Partial<AiFaq>, userId = 'EMP-ADMIN', userName = 'Master Admin'): AiFaq | null {
    const faqs = this.getFaqs();
    const idx = faqs.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    faqs[idx] = {
      ...faqs[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveItems(KEY_FAQS, faqs);

    this.addTrainingLog({
      action_type: 'FAQ_UPDATED',
      user_id: userId,
      user_name: userName,
      description: `Updated FAQ question: "${faqs[idx].question.substring(0, 60)}..."`,
    });

    return faqs[idx];
  }

  static deleteFaq(id: string, userId = 'EMP-ADMIN', userName = 'Master Admin'): boolean {
    const faqs = this.getFaqs();
    const target = faqs.find((f) => f.id === id);
    if (!target) return false;

    const filtered = faqs.filter((f) => f.id !== id);
    saveItems(KEY_FAQS, filtered);

    this.addTrainingLog({
      action_type: 'FAQ_DELETED',
      user_id: userId,
      user_name: userName,
      description: `Deleted FAQ question: "${target.question.substring(0, 60)}..."`,
    });

    return true;
  }

  // LEAD FORMS & FIELDS
  static getLeadForms(serviceId?: string): AiLeadForm[] {
    const forms = getItems<AiLeadForm>(KEY_LEAD_FORMS, SEED_LEAD_FORMS);
    if (serviceId) {
      return forms.filter((f) => f.service_id === serviceId);
    }
    return forms;
  }

  static addLeadForm(formData: Omit<AiLeadForm, 'id' | 'created_at' | 'updated_at'>, userId = 'EMP-ADMIN', userName = 'Master Admin'): AiLeadForm {
    const forms = this.getLeadForms();
    const newForm: AiLeadForm = {
      ...formData,
      id: `FORM-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    forms.unshift(newForm);
    saveItems(KEY_LEAD_FORMS, forms);

    this.addTrainingLog({
      action_type: 'FORM_ADDED',
      user_id: userId,
      user_name: userName,
      description: `Created new lead form "${newForm.form_name}"`,
    });

    return newForm;
  }

  static updateLeadForm(id: string, updates: Partial<AiLeadForm>, userId = 'EMP-ADMIN', userName = 'Master Admin'): AiLeadForm | null {
    const forms = this.getLeadForms();
    const idx = forms.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    forms[idx] = {
      ...forms[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveItems(KEY_LEAD_FORMS, forms);

    this.addTrainingLog({
      action_type: 'FORM_UPDATED',
      user_id: userId,
      user_name: userName,
      description: `Updated lead form "${forms[idx].form_name}"`,
    });

    return forms[idx];
  }

  static deleteLeadForm(id: string, userId = 'EMP-ADMIN', userName = 'Master Admin'): boolean {
    const forms = this.getLeadForms();
    const target = forms.find((f) => f.id === id);
    if (!target) return false;

    const filtered = forms.filter((f) => f.id !== id);
    saveItems(KEY_LEAD_FORMS, filtered);

    // Also remove fields
    const fields = this.getLeadFields();
    const filteredFields = fields.filter((f) => f.form_id !== id);
    saveItems(KEY_LEAD_FIELDS, filteredFields);

    this.addTrainingLog({
      action_type: 'FORM_DELETED',
      user_id: userId,
      user_name: userName,
      description: `Deleted lead form "${target.form_name}"`,
    });

    return true;
  }

  static getLeadFields(formId?: string): AiLeadFormField[] {
    const fields = getItems<AiLeadFormField>(KEY_LEAD_FIELDS, SEED_LEAD_FIELDS);
    if (formId) {
      return fields.filter((f) => f.form_id === formId).sort((a, b) => a.display_order - b.display_order);
    }
    return fields.sort((a, b) => a.display_order - b.display_order);
  }

  static addLeadField(fieldData: Omit<AiLeadFormField, 'id' | 'created_at' | 'updated_at'>, userId = 'EMP-ADMIN', userName = 'Master Admin'): AiLeadFormField {
    const fields = this.getLeadFields();
    const newField: AiLeadFormField = {
      ...fieldData,
      id: `FLD-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    fields.push(newField);
    saveItems(KEY_LEAD_FIELDS, fields);

    this.addTrainingLog({
      action_type: 'FIELD_ADDED',
      user_id: userId,
      user_name: userName,
      description: `Added field "${newField.field_label}" to form ${newField.form_id}`,
    });

    return newField;
  }

  static updateLeadField(id: string, updates: Partial<AiLeadFormField>, userId = 'EMP-ADMIN', userName = 'Master Admin'): AiLeadFormField | null {
    const fields = this.getLeadFields();
    const idx = fields.findIndex((f) => f.id === id);
    if (idx === -1) return null;

    fields[idx] = {
      ...fields[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveItems(KEY_LEAD_FIELDS, fields);

    this.addTrainingLog({
      action_type: 'FIELD_UPDATED',
      user_id: userId,
      user_name: userName,
      description: `Updated field "${fields[idx].field_label}"`,
    });

    return fields[idx];
  }

  static deleteLeadField(id: string, userId = 'EMP-ADMIN', userName = 'Master Admin'): boolean {
    const fields = this.getLeadFields();
    const target = fields.find((f) => f.id === id);
    if (!target) return false;

    const filtered = fields.filter((f) => f.id !== id);
    saveItems(KEY_LEAD_FIELDS, filtered);

    this.addTrainingLog({
      action_type: 'FIELD_DELETED',
      user_id: userId,
      user_name: userName,
      description: `Deleted field "${target.field_label}"`,
    });

    return true;
  }

  // QUALIFIED LEADS
  static getQualifiedLeads(): AiQualifiedLead[] {
    return getItems<AiQualifiedLead>(KEY_QUALIFIED_LEADS, SEED_QUALIFIED_LEADS);
  }

  static getQualifiedLeadById(id: string): AiQualifiedLead | undefined {
    return this.getQualifiedLeads().find((l) => l.id === id);
  }

  static addQualifiedLead(leadData: Omit<AiQualifiedLead, 'id' | 'created_at' | 'updated_at'>): AiQualifiedLead {
    const leads = this.getQualifiedLeads();
    const newLead: AiQualifiedLead = {
      ...leadData,
      id: `AI-LEAD-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status_history: [
        {
          status: leadData.status || 'NEW',
          changed_by: 'AI Sales Agent',
          changed_at: new Date().toISOString(),
          notes: 'Qualified lead captured via AI conversational form.',
        },
      ],
    };
    leads.unshift(newLead);
    saveItems(KEY_QUALIFIED_LEADS, leads);

    return newLead;
  }

  static updateQualifiedLeadStatus(id: string, status: AiQualifiedLeadStatus, changedBy = 'Master Admin', notes = ''): AiQualifiedLead | null {
    const leads = this.getQualifiedLeads();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    const oldStatus = leads[idx].status;
    const history = leads[idx].status_history || [];
    history.push({
      status,
      changed_by: changedBy,
      changed_at: new Date().toISOString(),
      notes: notes || `Status changed from ${oldStatus} to ${status}`,
    });

    leads[idx] = {
      ...leads[idx],
      status,
      status_history: history,
      updated_at: new Date().toISOString(),
    };
    saveItems(KEY_QUALIFIED_LEADS, leads);

    this.addTrainingLog({
      action_type: 'LEAD_STATUS_CHANGED',
      user_id: changedBy,
      user_name: changedBy,
      description: `Changed lead "${leads[idx].customer_name}" status from ${oldStatus} to ${status}`,
    });

    return leads[idx];
  }

  static updateQualifiedLead(id: string, updates: Partial<AiQualifiedLead>): AiQualifiedLead | null {
    const leads = this.getQualifiedLeads();
    const idx = leads.findIndex((l) => l.id === id);
    if (idx === -1) return null;

    leads[idx] = {
      ...leads[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    saveItems(KEY_QUALIFIED_LEADS, leads);

    return leads[idx];
  }

  static deleteQualifiedLead(id: string, userId = 'EMP-ADMIN', userName = 'Master Admin'): boolean {
    const leads = this.getQualifiedLeads();
    const target = leads.find((l) => l.id === id);
    if (!target) return false;

    const filtered = leads.filter((l) => l.id !== id);
    saveItems(KEY_QUALIFIED_LEADS, filtered);

    this.addTrainingLog({
      action_type: 'LEAD_DELETED',
      user_id: userId,
      user_name: userName,
      description: `Deleted qualified lead "${target.customer_name}" (${target.mobile})`,
    });

    return true;
  }

  // CONVERSATION SESSIONS
  static getConversationSessions(): AiConversationSession[] {
    return getItems<AiConversationSession>(KEY_SESSIONS, []);
  }

  static saveConversationSession(sessionData: Omit<AiConversationSession, 'id' | 'created_at' | 'updated_at'>): AiConversationSession {
    const sessions = this.getConversationSessions();
    const existingIdx = sessions.findIndex((s) => s.conversation_id === sessionData.conversation_id);

    if (existingIdx !== -1) {
      sessions[existingIdx] = {
        ...sessions[existingIdx],
        ...sessionData,
        updated_at: new Date().toISOString(),
      };
      saveItems(KEY_SESSIONS, sessions);
      return sessions[existingIdx];
    } else {
      const newSession: AiConversationSession = {
        ...sessionData,
        id: `SESS-${Date.now().toString(36).toUpperCase()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      sessions.unshift(newSession);
      saveItems(KEY_SESSIONS, sessions);
      return newSession;
    }
  }

  // TRAINING LOGS
  static getTrainingLogs(): AiTrainingLog[] {
    return getItems<AiTrainingLog>(KEY_LOGS, SEED_LOGS);
  }

  static addTrainingLog(log: Omit<AiTrainingLog, 'id' | 'created_at'>): AiTrainingLog {
    const logs = this.getTrainingLogs();
    const newLog: AiTrainingLog = {
      ...log,
      id: `LOG-${Date.now().toString(36).toUpperCase()}`,
      created_at: new Date().toISOString(),
    };
    logs.unshift(newLog);
    // keep last 200 logs max
    saveItems(KEY_LOGS, logs.slice(0, 200));
    return newLog;
  }

  // DASHBOARD METRICS
  static getDashboardMetrics(): AiDashboardMetrics {
    const services = this.getServices();
    const faqs = this.getFaqs();
    const forms = this.getLeadForms();
    const leads = this.getQualifiedLeads();
    const settings = this.getSettings();

    const todayStr = new Date().toISOString().substring(0, 10);
    const todaysLeads = leads.filter((l) => l.created_at.startsWith(todayStr)).length;
    const convertedLeads = leads.filter((l) => l.status === 'CONVERTED').length;
    const contactedLeads = leads.filter((l) => l.status === 'CONTACTED').length;
    const newLeads = leads.filter((l) => l.status === 'NEW').length;
    const lostLeads = leads.filter((l) => l.status === 'LOST').length;

    const conversionRate = leads.length > 0 ? Math.round((convertedLeads / leads.length) * 100) : 0;

    return {
      totalServices: services.length,
      activeServices: services.filter((s) => s.active).length,
      totalFaqs: faqs.length,
      activeFaqs: faqs.filter((f) => f.active).length,
      totalLeadForms: forms.length,
      activeLeadForms: forms.filter((f) => f.active).length,
      totalQualifiedLeads: leads.length,
      todaysLeads,
      convertedLeads,
      contactedLeads,
      newLeads,
      lostLeads,
      agentEnabled: settings.agent_enabled,
      conversionRate,
    };
  }
}
