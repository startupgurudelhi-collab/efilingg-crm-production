/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ChatAttachment {
  id: string;
  name: string;
  type: string; // Mimetype: e.g. 'application/pdf', 'audio/webm', 'image/png'
  size: number;
  dataUrl: string; // base64 payload or public URL path
  version?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  editedAt?: string;
  deletedAt?: string;
  pinnedFor?: string[]; // users who pinned this specific message
  isReadBy: string[]; // User IDs who have read this message
  mentions?: string[]; // User IDs or role tags like '@SalesTeam'
  linkedTaskId?: string; // Task ID if a task was created from this
}

export interface ChatConversation {
  id: string;
  name?: string; // blank for 1-on-1 private chats, populated for group chats
  isGroup: boolean;
  participants: string[]; // Employee IDs involved
  groupCode?: 'Sales Team' | 'Operations Team' | 'Accounts Team' | 'HR Team' | 'Management' | string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  pinnedBy?: string[]; // User IDs who pinned this conversation
  archivedBy?: string[]; // User IDs who archived this conversation
  lastMessage?: {
    text: string;
    senderName: string;
    createdAt: string;
  };
}

export interface ChatAnnouncement {
  id: string;
  senderId: string;
  senderName: string;
  title: string;
  content: string;
  attachments?: ChatAttachment[];
  createdAt: string;
  seenBy: string[]; // Employee IDs who acknowledged/seen
}

export interface ChatNotification {
  id: string;
  title: string;
  message: string;
  type: 'chat_dm' | 'chat_group' | 'chat_mention' | 'chat_announcement' | 'chat_task';
  link: string; // e.g. path or chat:conversationId
  userId: string; // target user ID or 'all'
  read: boolean;
  createdAt: string;
}

export interface ChatTask {
  id: string;
  title: string;
  sourceMessageId: string;
  conversationId: string;
  assignedTo: string; // Employee ID
  assignedToName: string;
  createdBy: string;
  createdAt: string;
  dueDate: string; // YYYY-MM-DD
  status: 'pending' | 'completed';
}

export interface ChatPresence {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: string;
  typingIn?: string; // Conversation ID user is actively typing in
}

export interface ChatAuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string; // e.g., 'edit_message', 'delete_message', 'group_created'
  targetId: string;
  details: string;
  timestamp: string;
}
