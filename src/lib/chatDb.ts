/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  ChatMessage, 
  ChatConversation, 
  ChatAnnouncement, 
  ChatNotification, 
  ChatTask, 
  ChatAuditLog,
  ChatAttachment
} from '../types/chat';
import { Employee } from '../types';
import { getEmployees, getISTISOString, crmMemoryStore } from './db';
import { pushToPostgres } from './postgresSync';

const STORAGE_PREFIX = 'efilingg_crm_';
const KEYS = {
  conversations: `${STORAGE_PREFIX}chat_conversations`,
  messages: `${STORAGE_PREFIX}chat_messages`,
  announcements: `${STORAGE_PREFIX}chat_announcements`,
  tasks: `${STORAGE_PREFIX}chat_tasks`,
  notifications: `${STORAGE_PREFIX}chat_notifications`,
  logs: `${STORAGE_PREFIX}chat_audit_logs`,
};

function getChatStorageItem(key: string): string | null {
  const memoryVal = crmMemoryStore[key];
  if (memoryVal !== undefined && memoryVal !== null) {
    return memoryVal;
  }
  try {
    const localVal = localStorage.getItem(key);
    if (localVal) {
      crmMemoryStore[key] = localVal;
    }
    return localVal;
  } catch (e) {
    return null;
  }
}

function setChatStorageItem(key: string, value: string) {
  crmMemoryStore[key] = value;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error('[localStorage set failed]', e);
  }
}

// --- INITIAL DATA SEEDING & RESOLVING ---

export function seedDefaultGroups() {
  const employees = getEmployees();
  const conversations = getConversationsRaw();
  
  const defaultGroups: { code: string; name: string; desc: string }[] = [
    { code: 'Sales Team', name: '📢 Sales & Marketing Desk', desc: 'Department-wide discussions for Sales Team' },
    { code: 'Operations Team', name: '⚙️ Operations Squad', desc: 'Internal ticketing & compliance tracking for Management' },
    { code: 'Accounts Team', name: '📈 Accounts & Audits', desc: 'GST, MCA, ITR payroll validation queries' },
    { code: 'HR Team', name: '👥 Human Relations', desc: 'Offer letters, leaves, resignations approvals' },
    { code: 'Management', name: '🛡️ Core Leadership Control', desc: 'Master admin & strategic TL collaboration desk' }
  ];

  let updated = false;

  defaultGroups.forEach(g => {
    const exists = conversations.find(c => c.isGroup && c.groupCode === g.code);
    if (!exists) {
      // Resolve participants based on employee roles and designations
      const participants = employees
        .filter(emp => {
          if (emp.role === 'admin') return true;
          if (g.code === 'Sales Team' && emp.department === 'Sales & Marketing') return true;
          if (g.code === 'Operations Team' && emp.department === 'Operation Management') return true;
          if (g.code === 'Accounts Team' && emp.designation?.toLowerCase().includes('account')) return true;
          if (g.code === 'HR Team' && emp.designation?.toLowerCase().includes('hr')) return true;
          if (g.code === 'Management' && emp.role === 'team_leader') return true;
          return false;
        })
        .map(emp => emp.id);

      const groupConverson: ChatConversation = {
        id: `group-${g.code.replace(/\s+/g, '-').toLowerCase()}`,
        name: g.name,
        isGroup: true,
        groupCode: g.code,
        description: g.desc,
        participants: Array.from(new Set([...participants, 'admin'])), // always include admin
        createdBy: 'admin',
        createdAt: getISTISOString()
      };
      
      conversations.push(groupConverson);
      updated = true;
    } else {
      // Keep participants up-to-date
      const currentParticipants = new Set(exists.participants);
      const originalCount = currentParticipants.size;
      
      employees.forEach(emp => {
        if (emp.role === 'admin') currentParticipants.add('admin');
        if (g.code === 'Sales Team' && emp.department === 'Sales & Marketing') currentParticipants.add(emp.id);
        if (g.code === 'Operations Team' && emp.department === 'Operation Management') currentParticipants.add(emp.id);
        if (g.code === 'Accounts Team' && emp.designation?.toLowerCase().includes('account')) currentParticipants.add(emp.id);
        if (g.code === 'HR Team' && emp.designation?.toLowerCase().includes('hr')) currentParticipants.add(emp.id);
        if (g.code === 'Management' && emp.role === 'team_leader') currentParticipants.add(emp.id);
      });
      
      if (currentParticipants.size !== originalCount) {
        exists.participants = Array.from(currentParticipants);
        updated = true;
      }
    }
  });

  if (updated) {
    saveConversationsRaw(conversations);
  }
}

// --- CONVERSATIONS ---

function getConversationsRaw(): ChatConversation[] {
  try {
    const val = getChatStorageItem(KEYS.conversations);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    return [];
  }
}

function saveConversationsRaw(conversations: ChatConversation[]) {
  const value = JSON.stringify(conversations);
  setChatStorageItem(KEYS.conversations, value);
  pushToPostgres(KEYS.conversations, value);
}

export function getConversations(userId: string): ChatConversation[] {
  seedDefaultGroups();
  const all = getConversationsRaw();
  // Return conversations where this user is a participant
  return all.filter(c => c.participants.includes(userId) || c.participants.includes('all'));
}

export function createConversation(
  participants: string[], 
  isGroup = false, 
  name?: string, 
  createdBy?: string,
  groupCode?: string,
  description?: string
): ChatConversation {
  const conversations = getConversationsRaw();
  
  // If it's a 1-on-1 private conversation, first check if an identical conversation already exists
  if (!isGroup && participants.length === 2) {
    const match = conversations.find(c => 
      !c.isGroup && 
      c.participants.includes(participants[0]) && 
      c.participants.includes(participants[1])
    );
    if (match) return match;
  }

  const newConv: ChatConversation = {
    id: `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    isGroup,
    participants,
    groupCode,
    description,
    createdBy,
    createdAt: getISTISOString()
  };

  conversations.push(newConv);
  saveConversationsRaw(conversations);
  
  if (createdBy) {
    const employee = getEmployees().find(e => e.id === createdBy);
    addChatAuditLog(
      createdBy, 
      employee?.name || 'Unknown', 
      'create_conversation', 
      newConv.id, 
      `Created ${isGroup ? 'Group Chat ' + name : 'Direct Chat'}`
    );
  }

  return newConv;
}

export function togglePinConversation(conversationId: string, userId: string): boolean {
  const conversations = getConversationsRaw();
  const conv = conversations.find(c => c.id === conversationId);
  if (!conv) return false;

  const currentPin = conv.pinnedBy || [];
  if (currentPin.includes(userId)) {
    conv.pinnedBy = currentPin.filter(id => id !== userId);
  } else {
    conv.pinnedBy = [...currentPin, userId];
  }
  
  saveConversationsRaw(conversations);
  return conv.pinnedBy.includes(userId);
}

export function toggleArchiveConversation(conversationId: string, userId: string): boolean {
  const conversations = getConversationsRaw();
  const conv = conversations.find(c => c.id === conversationId);
  if (!conv) return false;

  const currentArchived = conv.archivedBy || [];
  if (currentArchived.includes(userId)) {
    conv.archivedBy = currentArchived.filter(id => id !== userId);
  } else {
    conv.archivedBy = [...currentArchived, userId];
  }
  
  saveConversationsRaw(conversations);
  return conv.archivedBy.includes(userId);
}

// --- MESSAGES ---

export function getMessages(conversationId: string): ChatMessage[] {
  try {
    const val = getChatStorageItem(KEYS.messages);
    const all: ChatMessage[] = val ? JSON.parse(val) : [];
    return all.filter(m => m.conversationId === conversationId);
  } catch (e) {
    return [];
  }
}

export function getAllMessagesRaw(): ChatMessage[] {
  try {
    const val = getChatStorageItem(KEYS.messages);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    return [];
  }
}

export function saveAllMessagesRaw(messages: ChatMessage[]) {
  const value = JSON.stringify(messages);
  setChatStorageItem(KEYS.messages, value);
  pushToPostgres(KEYS.messages, value);
}

export function addMessage(
  conversationId: string, 
  senderId: string, 
  senderName: string, 
  text: string,
  attachments?: ChatAttachment[],
  mentions?: string[]
): ChatMessage {
  const allMessages = getAllMessagesRaw();
  
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    conversationId,
    senderId,
    senderName,
    text,
    createdAt: getISTISOString(),
    attachments,
    mentions,
    isReadBy: [senderId] // sender reads their own message
  };

  allMessages.push(newMsg);
  saveAllMessagesRaw(allMessages);

  // Update conversation's lastMessage cache
  const conversations = getConversationsRaw();
  const conv = conversations.find(c => c.id === conversationId);
  if (conv) {
    conv.lastMessage = {
      text: attachments && attachments.length > 0 ? `📎 Attachment${attachments.length > 1 ? 's' : ''}` : text,
      senderName,
      createdAt: newMsg.createdAt
    };
    saveConversationsRaw(conversations);
  }

  // Create real-time notification alerts for other participants
  if (conv) {
    conv.participants.forEach(pId => {
      if (pId !== senderId && pId !== 'all') {
        addChatNotification(
          pId,
          conv.isGroup ? `New in ${conv.name}` : `New message from ${senderName}`,
          text.substr(0, 60) + (text.length > 60 ? '...' : ''),
          conv.isGroup ? 'chat_group' : 'chat_dm',
          `chat:${conversationId}`
        );
      }
    });
  }

  // Handle Mentions Notifications Trigger
  if (mentions && mentions.length > 0) {
    mentions.forEach(mentionee => {
      if (mentionee !== senderId) {
        addChatNotification(
          mentionee,
          `@Mention from ${senderName}`,
          `You were mentioned in a discussion.`,
          'chat_mention',
          `chat:${conversationId}`
        );
      }
    });
  }

  return newMsg;
}

export function editMessage(messageId: string, userId: string, newText: string): boolean {
  const allMessages = getAllMessagesRaw();
  const msg = allMessages.find(m => m.id === messageId);
  if (!msg || msg.senderId !== userId) return false;

  msg.text = newText;
  msg.editedAt = getISTISOString();
  saveAllMessagesRaw(allMessages);

  addChatAuditLog(userId, msg.senderName, 'edit_message', messageId, 'Modified message text contents');
  return true;
}

export function deleteMessage(messageId: string, userId: string): boolean {
  const allMessages = getAllMessagesRaw();
  const msg = allMessages.find(m => m.id === messageId);
  if (!msg || msg.senderId !== userId) return false;

  msg.text = '⚠️ This message was deleted.';
  msg.deletedAt = getISTISOString();
  msg.attachments = [];
  saveAllMessagesRaw(allMessages);

  addChatAuditLog(userId, msg.senderName, 'delete_message', messageId, 'Deleted chat message content');
  return true;
}

export function markMessagesAsRead(conversationId: string, userId: string) {
  const allMessages = getAllMessagesRaw();
  let updated = false;

  allMessages.forEach(m => {
    if (m.conversationId === conversationId && !m.isReadBy.includes(userId)) {
      m.isReadBy.push(userId);
      updated = true;
    }
  });

  if (updated) {
    saveAllMessagesRaw(allMessages);
  }
}

// --- ANNOUNCEMENTS ---

export function getAnnouncements(): ChatAnnouncement[] {
  try {
    const val = getChatStorageItem(KEYS.announcements);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    return [];
  }
}

export function addAnnouncement(
  senderId: string, 
  senderName: string, 
  title: string, 
  content: string,
  attachments?: ChatAttachment[]
): ChatAnnouncement {
  const all = getAnnouncements();
  
  const announcement: ChatAnnouncement = {
    id: `ann-${Date.now()}`,
    senderId,
    senderName,
    title,
    content,
    attachments,
    createdAt: getISTISOString(),
    seenBy: [senderId]
  };

  all.unshift(announcement); // latest first
  const value = JSON.stringify(all);
  setChatStorageItem(KEYS.announcements, value);
  pushToPostgres(KEYS.announcements, value);

  // Alert all active CRM employees immediately in Notification desk
  addChatNotification(
    'all',
    `🔔 Official Policy Bulletin: ${title}`,
    content.substr(0, 80) + (content.length > 80 ? '...' : ''),
    'chat_announcement',
    'announcements'
  );

  addChatAuditLog(senderId, senderName, 'create_announcement', announcement.id, `Created Policy Announcement: ${title}`);

  return announcement;
}

export function acknowledgeAnnouncement(announcementId: string, userId: string): boolean {
  const all = getAnnouncements();
  const item = all.find(a => a.id === announcementId);
  if (!item) return false;

  if (!item.seenBy.includes(userId)) {
    item.seenBy.push(userId);
    const value = JSON.stringify(all);
    setChatStorageItem(KEYS.announcements, value);
    pushToPostgres(KEYS.announcements, value);

    const employee = getEmployees().find(e => e.id === userId);
    addChatAuditLog(userId, employee?.name || 'Teammate', 'acknowledge_announcement', announcementId, 'Read the policy bulletin');
    return true;
  }
  return false;
}

// --- CHAT TASKS ---

export function getChatTasks(): ChatTask[] {
  try {
    const val = getChatStorageItem(KEYS.tasks);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    return [];
  }
}

export function createChatTask(
  title: string,
  sourceMessageId: string,
  conversationId: string,
  assignedTo: string,
  createdBy: string,
  dueDate: string
): ChatTask {
  const all = getChatTasks();
  const employee = getEmployees().find(e => e.id === assignedTo);
  const creator = getEmployees().find(e => e.id === createdBy);

  const newTask: ChatTask = {
    id: `ctask-${Date.now()}`,
    title,
    sourceMessageId,
    conversationId,
    assignedTo,
    assignedToName: employee?.name || 'Employee',
    createdBy,
    createdAt: getISTISOString(),
    dueDate,
    status: 'pending'
  };

  all.push(newTask);
  const value = JSON.stringify(all);
  setChatStorageItem(KEYS.tasks, value);
  pushToPostgres(KEYS.tasks, value);

  // Link inside discussion message
  const allMessages = getAllMessagesRaw();
  const msg = allMessages.find(m => m.id === sourceMessageId);
  if (msg) {
    msg.linkedTaskId = newTask.id;
    saveAllMessagesRaw(allMessages);
  }

  // Create standard Task in user's notification bar
  addChatNotification(
    assignedTo,
    `📅 New Task Assigned: ${title}`,
    `Duty mapped by ${creator?.name || 'TL'}. Due-date: ${dueDate}`,
    'chat_task',
    `tasks`
  );

  addChatAuditLog(createdBy, creator?.name || 'TL', 'create_task', newTask.id, `Created task for ${newTask.assignedToName}: ${title}`);

  return newTask;
}

export function toggleChatTaskStatus(taskId: string, userId: string): boolean {
  const all = getChatTasks();
  const task = all.find(t => t.id === taskId);
  if (!task) return false;

  task.status = task.status === 'pending' ? 'completed' : 'pending';
  const value = JSON.stringify(all);
  setChatStorageItem(KEYS.tasks, value);
  pushToPostgres(KEYS.tasks, value);

  const employee = getEmployees().find(e => e.id === userId);
  addChatAuditLog(
    userId, 
    employee?.name || 'Teammate', 
    'toggle_task_status', 
    taskId, 
    `Flagged task status as ${task.status.toUpperCase()}`
  );
  
  return task.status === 'completed';
}

// --- NOTIFICATIONS ---

export function getChatNotifications(userId: string): ChatNotification[] {
  try {
    const val = getChatStorageItem(KEYS.notifications);
    const all: ChatNotification[] = val ? JSON.parse(val) : [];
    return all.filter(n => n.userId === userId || n.userId === 'all');
  } catch (e) {
    return [];
  }
}

export function addChatNotification(
  userId: string, 
  title: string, 
  message: string, 
  type: ChatNotification['type'], 
  link: string
): ChatNotification {
  try {
    const val = getChatStorageItem(KEYS.notifications);
    const all: ChatNotification[] = val ? JSON.parse(val) : [];
    
    const newNotif: ChatNotification = {
      id: `cnotif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      link,
      userId,
      read: false,
      createdAt: getISTISOString()
    };

    all.push(newNotif);
    setChatStorageItem(KEYS.notifications, JSON.stringify(all));
    pushToPostgres(KEYS.notifications, JSON.stringify(all));
    return newNotif;
  } catch (e) {
    return {
      id: `cnotif-${Date.now()}`,
      title, message, type, link, userId, read: false, createdAt: getISTISOString()
    };
  }
}

export function markChatNotificationsRead(userId: string) {
  try {
    const val = getChatStorageItem(KEYS.notifications);
    const all: ChatNotification[] = val ? JSON.parse(val) : [];
    let changed = false;

    all.forEach(n => {
      if ((n.userId === userId || n.userId === 'all') && !n.read) {
        n.read = true;
        changed = true;
      }
    });

    if (changed) {
      setChatStorageItem(KEYS.notifications, JSON.stringify(all));
      pushToPostgres(KEYS.notifications, JSON.stringify(all));
    }
  } catch (e) {}
}

// --- AUDIT LOGS ---

export function getChatAuditLogs(): ChatAuditLog[] {
  try {
    const val = getChatStorageItem(KEYS.logs);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    return [];
  }
}

export function addChatAuditLog(
  userId: string, 
  userName: string, 
  action: string, 
  targetId: string, 
  details: string
) {
  try {
    const val = getChatStorageItem(KEYS.logs);
    const all: ChatAuditLog[] = val ? JSON.parse(val) : [];
    
    const log: ChatAuditLog = {
      id: `clog-${Date.now()}`,
      userId,
      userName,
      action,
      targetId,
      details,
      timestamp: getISTISOString()
    };

    all.unshift(log); // newest first
    // Limit to 500 audit logs to avoid massive sizes
    const trimmed = all.slice(0, 500);
    setChatStorageItem(KEYS.logs, JSON.stringify(trimmed));
    pushToPostgres(KEYS.logs, JSON.stringify(trimmed));
  } catch (e) {}
}

// --- LEAD & CLIENT SPECIFIC CONVERSATION RESOLVING ---

export function getLeadConversation(leadId: string, customerName: string, createdByUserId: string): ChatConversation {
  const conversations = getConversationsRaw();
  const convId = `lead-${leadId}`;
  
  const existing = conversations.find(c => c.id === convId);
  if (existing) return existing;

  // Resolve participants: lead owner, creator, TLs, and admins
  const employees = getEmployees();
  const leadOwnerId = createdByUserId; // Fallback or dynamic
  
  const initialParticipants = new Set<string>(['admin']);
  employees.forEach(emp => {
    if (emp.role === 'admin' || emp.role === 'team_leader') {
      initialParticipants.add(emp.id);
    }
  });
  if (createdByUserId) initialParticipants.add(createdByUserId);

  const newConv: ChatConversation = {
    id: convId,
    name: `💬 Briefing: ${customerName}`,
    isGroup: true,
    groupCode: `lead-discussion`,
    description: `Internal collaboration for Lead ID: ${leadId}`,
    participants: Array.from(initialParticipants),
    createdBy: createdByUserId || 'admin',
    createdAt: getISTISOString()
  };

  conversations.push(newConv);
  saveConversationsRaw(conversations);
  return newConv;
}

export function saveIncomingMessage(msg: ChatMessage, participants?: string[]) {
  try {
    const conversations = getConversationsRaw();
    let conv = conversations.find(c => c.id === msg.conversationId);
    
    if (!conv) {
      const isGroup = msg.conversationId.startsWith('group-') || msg.conversationId.startsWith('lead-');
      const groupCode = msg.conversationId.startsWith('group-') ? msg.conversationId.replace('group-', '') : (msg.conversationId.startsWith('lead-') ? 'lead-discussion' : undefined);
      
      let resolvedParts = participants || [msg.senderId];
      if (msg.conversationId.startsWith('group-')) {
        const groupCodeName = msg.conversationId.replace('group-', '');
        const employees = getEmployees();
        resolvedParts = employees
          .filter(emp => {
            if (emp.role === 'admin') return true;
            if (groupCodeName === 'sales-team' && emp.department === 'Sales & Marketing') return true;
            if (groupCodeName === 'operations-team' && emp.department === 'Operation Management') return true;
            if (groupCodeName === 'accounts-team' && emp.designation?.toLowerCase().includes('account')) return true;
            if (groupCodeName === 'hr-team' && emp.designation?.toLowerCase().includes('hr')) return true;
            if (groupCodeName === 'management' && emp.role === 'team_leader') return true;
            return false;
          })
          .map(emp => emp.id);
        
        if (!resolvedParts.includes('admin')) resolvedParts.push('admin');
      }

      conv = {
        id: msg.conversationId,
        name: isGroup ? (msg.conversationId.startsWith('lead-') ? 'Briefing' : 'Group Chat') : undefined,
        isGroup,
        groupCode,
        participants: resolvedParts,
        createdBy: msg.senderId,
        createdAt: msg.createdAt
      };
      conversations.push(conv);
    }

    conv.lastMessage = {
      text: msg.attachments && msg.attachments.length > 0 ? `📎 Attachment` : msg.text,
      senderName: msg.senderName,
      createdAt: msg.createdAt
    };
    saveConversationsRaw(conversations);

    const allMessages = getAllMessagesRaw();
    if (!allMessages.some(m => m.id === msg.id)) {
      allMessages.push(msg);
      saveAllMessagesRaw(allMessages);
    }
  } catch (e) {
    console.error('Error in saveIncomingMessage:', e);
  }
}
