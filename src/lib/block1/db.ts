/**
 * Isolated Enterprise Storage Repository for Block 1
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 1)
 *
 * Stores Customers, Leads, Conversations, Messages, Opportunities,
 * Executives, and Webhook Audit Logs cleanly without modifying existing production schema.
 */

import {
  CustomerV2,
  LeadV2,
  ConversationV2,
  MessageV2,
  OpportunityV2,
  ExecutiveV2,
  WebhookLogV2,
  ConversationTimelineEntry,
} from './types';
import { getStorageString, setStorageString } from '../db';

// Storage Keys
const KEY_CUSTOMERS = 'efilingg_crm_block1_customers';
const KEY_LEADS = 'efilingg_crm_block1_leads';
const KEY_CONVERSATIONS = 'efilingg_crm_block1_conversations';
const KEY_MESSAGES = 'efilingg_crm_block1_messages';
const KEY_OPPORTUNITIES = 'efilingg_crm_block1_opportunities';
const KEY_EXECUTIVES = 'efilingg_crm_block1_executives';
const KEY_TIMELINE = 'efilingg_crm_block1_timeline';
const KEY_WEBHOOK_LOGS = 'efilingg_crm_block1_webhook_logs';
const KEY_RR_INDEX = 'efilingg_crm_block1_rr_index';

// Helper read/write functions
function getItems<T>(key: string, defaultVal: T[] = []): T[] {
  try {
    const val = getStorageString(key);
    if (!val) return defaultVal;
    const parsed = JSON.parse(val);
    if (Array.isArray(parsed) && parsed.length === 0 && defaultVal.length > 0) {
      return defaultVal;
    }
    return parsed;
  } catch {
    return defaultVal;
  }
}

function saveItems<T>(key: string, items: T[]): void {
  try {
    setStorageString(key, JSON.stringify(items));
  } catch (e) {
    console.error(`[Block1DB] Failed to persist items for ${key}:`, e);
  }
}

// ==========================================
// Initial Seed Data
// ==========================================

const INITIAL_EXECUTIVES: ExecutiveV2[] = [
  {
    id: 'EMP-ADMIN',
    name: 'Master Admin',
    email: 'admin@efilingg.com',
    phone: '919810000001',
    department: 'General Management',
    role: 'SUPER_ADMIN',
    isActive: true,
    assignedConversationsCount: 0,
  },
  {
    id: 'EMP-NEHA',
    name: 'Neha Sharma',
    email: 'neha.sharma@efilingg.com',
    phone: '919810000002',
    department: 'GST Compliance',
    role: 'EXECUTIVE',
    isActive: true,
    assignedConversationsCount: 0,
  },
  {
    id: 'EMP-RAMESH',
    name: 'Ramesh Kumar',
    email: 'ramesh.kumar@efilingg.com',
    phone: '919810000003',
    department: 'MCA Corporate Filing',
    role: 'EXECUTIVE',
    isActive: true,
    assignedConversationsCount: 0,
  },
  {
    id: 'EMP-ALOK',
    name: 'CA Alok Sharma',
    email: 'alok.sharma@efilingg.com',
    phone: '919810000004',
    department: 'ITR & Tax Audit',
    role: 'SENIOR_AUDITOR',
    isActive: true,
    assignedConversationsCount: 0,
  },
];

const INITIAL_CUSTOMERS: CustomerV2[] = [
  {
    id: 'CUST-RAHUL-SEED',
    name: 'Rahul Sharma',
    phone: '919999999999',
    email: 'rahul@test.com',
    pan: 'ABCDE1234F',
    gstin: '07ABCDE1234F1Z5',
    companyName: 'ABC Traders',
    address: 'Delhi, India',
    tags: ['GST_CLIENT', 'VIP'],
    assignedExecutiveId: 'EMP-ADMIN',
    assignedExecutiveName: 'Master Admin',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-03T10:00:00.000Z',
  },
  {
    id: 'CUST-1001',
    name: 'Aditya Gupta',
    phone: '919812492102',
    email: 'compliance@apexretails.com',
    pan: 'AAACA4192G',
    gstin: '09AAACA4192G1ZX',
    companyName: 'Apex Retails Corp',
    address: 'Plot 4, Sector 62, Noida, UP',
    tags: ['GST_CLIENT', 'VIP'],
    assignedExecutiveId: 'EMP-NEHA',
    assignedExecutiveName: 'Neha Sharma',
    createdAt: '2026-05-10T10:00:00.000Z',
    updatedAt: '2026-05-10T10:00:00.000Z',
  },
  {
    id: 'CUST-1002',
    name: 'Vikas Sharma',
    phone: '918102941029',
    email: 'vikastraders99@gmail.com',
    pan: 'ABKPV8412F',
    gstin: '07ABKPV8412F1Z9',
    companyName: 'Vikas Traders',
    address: 'Chawri Bazar, Delhi - 110006',
    tags: ['PROPRIETOR'],
    assignedExecutiveId: 'EMP-RAMESH',
    assignedExecutiveName: 'Ramesh Kumar',
    createdAt: '2026-05-12T14:30:00.000Z',
    updatedAt: '2026-05-12T14:30:00.000Z',
  },
];

const INITIAL_LEADS: LeadV2[] = [
  {
    id: 'LEAD-RAHUL-SEED',
    name: 'Rahul Sharma',
    phone: '919999999999',
    email: 'rahul@test.com',
    companyName: 'ABC Traders',
    gstin: '07ABCDE1234F1Z5',
    pan: 'ABCDE1234F',
    source: 'WHATSAPP',
    serviceRequested: 'GST Registration',
    status: 'NEW',
    assignedExecutiveId: 'EMP-ADMIN',
    assignedExecutiveName: 'Master Admin',
    convertedCustomerId: 'CUST-RAHUL-SEED',
    campaignSource: 'Facebook Test Campaign',
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: '2026-08-03T10:00:00.000Z',
  },
];

const INITIAL_CONVERSATIONS: ConversationV2[] = [
  {
    id: 'CONV-RAHUL-SEED',
    channel: 'WHATSAPP',
    contactNumber: '919999999999',
    customerId: 'CUST-RAHUL-SEED',
    leadId: 'LEAD-RAHUL-SEED',
    customerName: 'Rahul Sharma',
    state: 'OPEN',
    assignedExecutiveId: 'EMP-ADMIN',
    assignedExecutiveName: 'Master Admin',
    assignedType: 'ROUND_ROBIN',
    serviceCategory: 'GST Registration',
    lastMessageText: 'Okay.',
    lastMessageTimestamp: new Date().toISOString(),
    marketingAttribution: {
      campaignName: 'Facebook Test Campaign',
      campaignSource: 'Facebook Test Campaign',
    },
    unreadCount: 1,
    createdAt: '2026-08-03T10:00:00.000Z',
    updatedAt: new Date().toISOString(),
  },
];

const INITIAL_MESSAGES: MessageV2[] = [
  {
    id: 'MSG-SEED-1',
    conversationId: 'CONV-RAHUL-SEED',
    direction: 'INBOUND',
    senderId: '919999999999',
    senderName: 'Rahul Sharma',
    messageType: 'TEXT',
    content: 'Hi',
    deliveryStatus: 'READ',
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: 'MSG-SEED-2',
    conversationId: 'CONV-RAHUL-SEED',
    direction: 'OUTBOUND',
    senderId: 'AI_ASSISTANT',
    senderName: 'Efilingg AI Co-pilot',
    messageType: 'TEXT',
    content: 'Welcome to Efilingg. How can I help you?',
    deliveryStatus: 'DELIVERED',
    timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: 'MSG-SEED-3',
    conversationId: 'CONV-RAHUL-SEED',
    direction: 'INBOUND',
    senderId: '919999999999',
    senderName: 'Rahul Sharma',
    messageType: 'TEXT',
    content: 'I want GST Registration.',
    deliveryStatus: 'READ',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 'MSG-SEED-4',
    conversationId: 'CONV-RAHUL-SEED',
    direction: 'OUTBOUND',
    senderId: 'AI_ASSISTANT',
    senderName: 'Efilingg AI Co-pilot',
    messageType: 'TEXT',
    content: 'Sure. Please share your PAN Card.',
    deliveryStatus: 'DELIVERED',
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
  {
    id: 'MSG-SEED-5',
    conversationId: 'CONV-RAHUL-SEED',
    direction: 'INBOUND',
    senderId: '919999999999',
    senderName: 'Rahul Sharma',
    messageType: 'TEXT',
    content: 'How much does it cost?',
    deliveryStatus: 'READ',
    timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
  },
  {
    id: 'MSG-SEED-6',
    conversationId: 'CONV-RAHUL-SEED',
    direction: 'OUTBOUND',
    senderId: 'AI_ASSISTANT',
    senderName: 'Efilingg AI Co-pilot',
    messageType: 'TEXT',
    content: '₹1000.',
    deliveryStatus: 'DELIVERED',
    timestamp: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
  },
  {
    id: 'MSG-SEED-7',
    conversationId: 'CONV-RAHUL-SEED',
    direction: 'INBOUND',
    senderId: '919999999999',
    senderName: 'Rahul Sharma',
    messageType: 'TEXT',
    content: 'How many days?',
    deliveryStatus: 'READ',
    timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
  {
    id: 'MSG-SEED-8',
    conversationId: 'CONV-RAHUL-SEED',
    direction: 'OUTBOUND',
    senderId: 'AI_ASSISTANT',
    senderName: 'Efilingg AI Co-pilot',
    messageType: 'TEXT',
    content: 'Normally 3–7 working days.',
    deliveryStatus: 'DELIVERED',
    timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: 'MSG-SEED-9',
    conversationId: 'CONV-RAHUL-SEED',
    direction: 'INBOUND',
    senderId: '919999999999',
    senderName: 'Rahul Sharma',
    messageType: 'TEXT',
    content: 'Okay.',
    deliveryStatus: 'READ',
    timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
  },
];

// ==========================================
// Executive Storage Methods
// ==========================================

export function getExecutives(): ExecutiveV2[] {
  return getItems<ExecutiveV2>(KEY_EXECUTIVES, INITIAL_EXECUTIVES);
}

export function updateExecutive(exec: ExecutiveV2): void {
  const list = getExecutives();
  const idx = list.findIndex((e) => e.id === exec.id);
  if (idx !== -1) {
    list[idx] = exec;
  } else {
    list.push(exec);
  }
  saveItems(KEY_EXECUTIVES, list);
}

export function getNextRoundRobinExecutive(): ExecutiveV2 {
  const executives = getExecutives().filter((e) => e.isActive);
  if (executives.length === 0) {
    return INITIAL_EXECUTIVES[0];
  }

  let currIdx = 0;
  try {
    const saved = getStorageString(KEY_RR_INDEX);
    if (saved) currIdx = parseInt(saved, 10) || 0;
  } catch {
    currIdx = 0;
  }

  const selectedIdx = currIdx % executives.length;
  const nextIdx = (selectedIdx + 1) % executives.length;
  setStorageString(KEY_RR_INDEX, nextIdx.toString());

  const selected = executives[selectedIdx];
  selected.assignedConversationsCount = (selected.assignedConversationsCount || 0) + 1;
  updateExecutive(selected);
  return selected;
}

// ==========================================
// Customer Identity Storage Methods
// ==========================================

export function getCustomers(): CustomerV2[] {
  return getItems<CustomerV2>(KEY_CUSTOMERS, INITIAL_CUSTOMERS);
}

export function getCustomerById(id: string): CustomerV2 | undefined {
  return getCustomers().find((c) => c.id === id);
}

export function saveCustomer(customer: CustomerV2): CustomerV2 {
  const list = getCustomers();
  const idx = list.findIndex((c) => c.id === customer.id);
  customer.updatedAt = new Date().toISOString();

  if (idx !== -1) {
    list[idx] = customer;
  } else {
    list.push(customer);
  }
  saveItems(KEY_CUSTOMERS, list);
  return customer;
}

// ==========================================
// Lead Storage Methods
// ==========================================

export function getLeads(): LeadV2[] {
  return getItems<LeadV2>(KEY_LEADS, INITIAL_LEADS);
}

export function getLeadById(id: string): LeadV2 | undefined {
  return getLeads().find((l) => l.id === id);
}

export function saveLead(lead: LeadV2): LeadV2 {
  const list = getLeads();
  const idx = list.findIndex((l) => l.id === lead.id);
  lead.updatedAt = new Date().toISOString();

  if (idx !== -1) {
    list[idx] = lead;
  } else {
    list.push(lead);
  }
  saveItems(KEY_LEADS, list);
  return lead;
}

// ==========================================
// Conversation Storage Methods
// ==========================================

export function getConversations(): ConversationV2[] {
  const conversations = getItems<ConversationV2>(KEY_CONVERSATIONS, INITIAL_CONVERSATIONS);
  const messages = getItems<MessageV2>(KEY_MESSAGES, INITIAL_MESSAGES);

  // Dynamically calculate and enforce unreadCount based on last_read_at and message read status
  conversations.forEach((conv) => {
    const lastReadAt = conv.last_read_at || conv.lastReadAt;
    const convMsgs = messages.filter(
      (m) => m.conversationId === conv.id && (m.direction === 'INBOUND' || !m.direction)
    );

    const unreadMsgs = convMsgs.filter((m) => {
      const isAlreadyRead = m.is_read || m.isRead || m.deliveryStatus === 'READ';
      if (isAlreadyRead) return false;
      if (lastReadAt && m.timestamp) {
        return new Date(m.timestamp).getTime() > new Date(lastReadAt).getTime();
      }
      return true;
    });

    conv.unreadCount = unreadMsgs.length;
    conv.unread_count = unreadMsgs.length;
  });

  return conversations;
}

export function getConversationById(id: string): ConversationV2 | undefined {
  return getConversations().find((c) => c.id === id);
}

export function getConversationByContact(contactNumber: string): ConversationV2 | undefined {
  const cleanContact = contactNumber.replace(/\D/g, '');
  return getConversations().find((c) => c.contactNumber.replace(/\D/g, '') === cleanContact);
}

export function saveConversation(conv: ConversationV2): ConversationV2 {
  const list = getItems<ConversationV2>(KEY_CONVERSATIONS, INITIAL_CONVERSATIONS);
  const idx = list.findIndex((c) => c.id === conv.id);
  conv.updatedAt = new Date().toISOString();

  if (idx !== -1) {
    list[idx] = conv;
  } else {
    list.push(conv);
  }
  saveItems(KEY_CONVERSATIONS, list);
  return conv;
}

/**
 * Mark Conversation as Read
 * 1. Marks all inbound messages as read (is_read = true, read_at = timestamp)
 * 2. Sets conversation last_read_at and resets unread_count = 0
 * 3. Persists directly to database storage
 */
export function markConversationAsRead(conversationId: string): {
  conversation: ConversationV2;
  markedCount: number;
} {
  const nowISO = new Date().toISOString();
  console.log('[READ STATE UPDATE START]', { conversationId, timestamp: nowISO });

  // 1. Mark all inbound messages as read
  const messages = getItems<MessageV2>(KEY_MESSAGES, INITIAL_MESSAGES);
  let markedCount = 0;
  messages.forEach((m) => {
    if (m.conversationId === conversationId && (m.direction === 'INBOUND' || !m.direction)) {
      m.is_read = true;
      m.isRead = true;
      m.read_at = m.read_at || nowISO;
      m.readAt = m.readAt || nowISO;
      m.deliveryStatus = 'READ';
      markedCount++;
    }
  });
  saveItems(KEY_MESSAGES, messages);
  console.log('[MESSAGES MARKED READ]', { conversationId, markedCount });

  // 2. Update conversation record
  const conversations = getItems<ConversationV2>(KEY_CONVERSATIONS, INITIAL_CONVERSATIONS);
  const conv = conversations.find((c) => c.id === conversationId);
  if (conv) {
    conv.last_read_at = nowISO;
    conv.lastReadAt = nowISO;
    conv.unread_count = 0;
    conv.unreadCount = 0;
    conv.updatedAt = nowISO;
    saveItems(KEY_CONVERSATIONS, conversations);
    console.log('[POSTGRES READ SAVE SUCCESS]', { conversationId, unreadCount: 0, lastReadAt: nowISO });
    console.log('[UNREAD COUNT RESET]', { conversationId });
    return { conversation: conv, markedCount };
  }

  return { conversation: null as any, markedCount };
}

// ==========================================
// Message Storage Methods
// ==========================================

export function getMessages(conversationId?: string): MessageV2[] {
  const list = getItems<MessageV2>(KEY_MESSAGES, INITIAL_MESSAGES);
  if (conversationId) {
    return list.filter((m) => m.conversationId === conversationId);
  }
  return list;
}

export function getMessageById(id: string): MessageV2 | undefined {
  return getMessages().find((m) => m.id === id);
}

export function saveMessage(msg: MessageV2): MessageV2 {
  const list = getMessages();
  const idx = list.findIndex((m) => m.id === msg.id);

  if (msg.direction === 'INBOUND' && msg.is_read === undefined && msg.isRead === undefined) {
    msg.is_read = false;
    msg.isRead = false;
  }

  if (idx !== -1) {
    list[idx] = msg;
  } else {
    list.push(msg);
  }
  saveItems(KEY_MESSAGES, list);

  // Update conversation's last message text and timestamp
  const conv = getConversationById(msg.conversationId);
  if (conv) {
    conv.lastMessageText = msg.content;
    conv.lastMessageTimestamp = msg.timestamp;
    if (msg.direction === 'INBOUND' && (!msg.is_read && !msg.isRead)) {
      conv.unreadCount = (conv.unreadCount || 0) + 1;
      conv.unread_count = conv.unreadCount;
    }
    saveConversation(conv);
  }

  return msg;
}

export function updateMessageStatus(
  whatsappMessageIdOrId: string,
  status: MessageV2['deliveryStatus']
): boolean {
  const list = getMessages();
  const msg = list.find(
    (m) => m.whatsappMessageId === whatsappMessageIdOrId || m.id === whatsappMessageIdOrId
  );
  if (msg) {
    msg.deliveryStatus = status;
    saveItems(KEY_MESSAGES, list);
    return true;
  }
  return false;
}

// ==========================================
// Opportunity Storage Methods
// ==========================================

export function getOpportunities(customerId?: string): OpportunityV2[] {
  const list = getItems<OpportunityV2>(KEY_OPPORTUNITIES, []);
  if (customerId) {
    return list.filter((o) => o.customerId === customerId);
  }
  return list;
}

export function saveOpportunity(opp: OpportunityV2): OpportunityV2 {
  const list = getOpportunities();
  const idx = list.findIndex((o) => o.id === opp.id);
  opp.updatedAt = new Date().toISOString();

  if (idx !== -1) {
    list[idx] = opp;
  } else {
    list.push(opp);
  }
  saveItems(KEY_OPPORTUNITIES, list);
  return opp;
}

// ==========================================
// Timeline Activity Storage
// ==========================================

export function getTimelineEntries(conversationId: string): ConversationTimelineEntry[] {
  const list = getItems<ConversationTimelineEntry>(KEY_TIMELINE, []);
  return list.filter((t) => t.conversationId === conversationId);
}

export function addTimelineEntry(
  conversationId: string,
  activityType: string,
  summary: string,
  actor: string,
  metadata?: Record<string, unknown>
): ConversationTimelineEntry {
  const list = getItems<ConversationTimelineEntry>(KEY_TIMELINE, []);
  const entry: ConversationTimelineEntry = {
    id: `TL-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    conversationId,
    activityType,
    summary,
    actor,
    metadata,
    timestamp: new Date().toISOString(),
  };
  list.push(entry);
  saveItems(KEY_TIMELINE, list);
  return entry;
}

// ==========================================
// Webhook Audit Logs
// ==========================================

export function getWebhookLogs(): WebhookLogV2[] {
  return getItems<WebhookLogV2>(KEY_WEBHOOK_LOGS, []);
}

export function addWebhookLog(log: Omit<WebhookLogV2, 'id' | 'receivedAt'>): WebhookLogV2 {
  const list = getWebhookLogs();
  const newLog: WebhookLogV2 = {
    ...log,
    id: `WH-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    receivedAt: new Date().toISOString(),
  };

  // Enforce memory safety cap (max 200 logs)
  if (list.length >= 200) {
    list.shift();
  }

  list.push(newLog);
  saveItems(KEY_WEBHOOK_LOGS, list);
  return newLog;
}

// ==========================================
// DB Reset (For Testing Isolation)
// ==========================================

export function resetBlock1DB(): void {
  saveItems(KEY_CUSTOMERS, INITIAL_CUSTOMERS);
  saveItems(KEY_LEADS, INITIAL_LEADS);
  saveItems(KEY_CONVERSATIONS, INITIAL_CONVERSATIONS);
  saveItems(KEY_MESSAGES, INITIAL_MESSAGES);
  saveItems(KEY_OPPORTUNITIES, []);
  saveItems(KEY_EXECUTIVES, INITIAL_EXECUTIVES);
  saveItems(KEY_TIMELINE, []);
  saveItems(KEY_WEBHOOK_LOGS, []);
  setStorageString(KEY_RR_INDEX, '0');
}
