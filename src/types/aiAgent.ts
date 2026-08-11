/**
 * AI Sales Agent V1 Foundation - Data Types & Interfaces
 * Efilingg CRM AI Sales Module
 */

export type AiQualifiedLeadStatus = 'NEW' | 'PENDING_FOLLOWUP' | 'CONTACTED' | 'CONVERTED' | 'LOST';

export type AiSessionStatus = 'ACTIVE' | 'HANDOVER' | 'COMPLETED' | 'EXPIRED';

export type AiFormFieldType = 'Text' | 'Email' | 'Phone' | 'Number' | 'Dropdown' | 'Textarea' | 'Date';

export interface AiAgentSettings {
  id: string;
  agent_enabled: boolean;
  max_questions: number;
  max_messages: number;
  handover_message: string;
  created_at: string;
  updated_at: string;
}

export interface AiService {
  id: string;
  service_name: string;
  description: string;
  price: number | string;
  timeline: string;
  required_documents: string[] | string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiFaq {
  id: string;
  service_id: string;
  question: string;
  answer: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiLeadForm {
  id: string;
  service_id: string;
  form_name: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiLeadFormField {
  id: string;
  form_id: string;
  field_name: string;
  field_label: string;
  field_type: AiFormFieldType;
  required: boolean;
  display_order: number;
  options?: string[];
  created_at: string;
  updated_at: string;
}

export interface AiQualifiedLeadStatusHistoryItem {
  status: AiQualifiedLeadStatus;
  changed_by?: string;
  changed_at: string;
  notes?: string;
}

export interface AiQualifiedLead {
  id: string;
  conversation_id: string;
  customer_name: string;
  mobile: string;
  email: string;
  service_name: string;
  lead_summary: string;
  collected_data: Record<string, any>;
  status: AiQualifiedLeadStatus;
  status_history?: AiQualifiedLeadStatusHistoryItem[];
  assigned_to?: string;
  created_at: string;
  updated_at: string;
}

export interface AiConversationSession {
  id: string;
  conversation_id: string;
  customer_phone: string;
  customer_number?: string;
  current_service: string;
  service_detected?: string;
  current_stage: string;
  current_step?: string;
  collected_fields_json: Record<string, any>;
  collected_data?: Record<string, any>;
  lead_score?: number;
  handover_required: boolean;
  session_status?: AiSessionStatus;
  language?: 'EN' | 'HI' | string;
  created_at: string;
  updated_at: string;
}

export interface AiTrainingLog {
  id: string;
  action_type: string;
  user_id: string;
  user_name?: string;
  description: string;
  created_at: string;
}

export interface AiDashboardMetrics {
  totalServices: number;
  activeServices: number;
  totalFaqs: number;
  activeFaqs: number;
  totalLeadForms: number;
  activeLeadForms: number;
  totalQualifiedLeads: number;
  todaysLeads: number;
  convertedLeads: number;
  contactedLeads: number;
  newLeads: number;
  lostLeads: number;
  agentEnabled: boolean;
  conversionRate: number;
}
