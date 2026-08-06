/**
 * Enterprise AI Sales Workspace Component
 * Efilingg CRM Enterprise Layer (Sprint 1.3 - Block 2)
 *
 * Full-featured executive workspace for managing WhatsApp AI conversations,
 * customer 360 intelligence, executive takeover, AI replies, and notifications.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  InboxTabFilter,
  InternalNote,
  AISuggestReplyResult,
  NotificationAlert,
} from '../lib/block2/types';
import {
  ConversationV2,
  MessageV2,
  CustomerV2,
  LeadV2,
  OpportunityV2,
  ConversationTimelineEntry,
  AttachmentV2,
} from '../lib/block1/types';
import {
  Bot,
  User,
  Send,
  Sparkles,
  Search,
  Filter,
  FileText,
  Paperclip,
  CheckCheck,
  Clock,
  Building2,
  CreditCard,
  Tag,
  AlertCircle,
  Plus,
  RefreshCw,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  Lock,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  X,
  FileCheck,
  Flame,
  UserPlus,
  CheckCircle2,
  Mic,
  ArrowRight,
} from 'lucide-react';
import { eventBus } from '../lib/eventBus';

interface AISalesWorkspaceProps {
  currentUserId: string;
  currentUserName: string;
}

export default function AISalesWorkspace({ currentUserId, currentUserName }: AISalesWorkspaceProps) {
  // Inbox List & Active Selection State
  const [conversations, setConversations] = useState<ConversationV2[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<InboxTabFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Active Thread Data States
  const [messages, setMessages] = useState<MessageV2[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [timeline, setTimeline] = useState<ConversationTimelineEntry[]>([]);
  const [customer, setCustomer] = useState<CustomerV2 | null>(null);
  const [lead, setLead] = useState<LeadV2 | null>(null);

  // Composer & AI Action States
  const [messageText, setMessageText] = useState('');
  const [composerMode, setComposerMode] = useState<'PUBLIC' | 'INTERNAL_NOTE'>('PUBLIC');
  const [suggestedReplies, setSuggestedReplies] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [isAiReplying, setIsAiReplying] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [docChecklist, setDocChecklist] = useState<string[] | null>(null);
  const [newTagInput, setNewTagInput] = useState('');

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationAlert[]>([]);

  // Scroll ref for chat messages
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeConvIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConvIdRef.current = activeConvId;
  }, [activeConvId]);

  // Initial Load & Event Bus Subscriptions & Real-time Polling
  useEffect(() => {
    fetchConversations();

    // Subscribe to Event Bus for live workspace alerts
    const subLead = eventBus.subscribe('LeadCreated', (data) => {
      const payload = data.payload as any;
      addNotification({
        type: 'NEW_LEAD',
        title: 'New Lead Ingested',
        message: `Lead ${payload?.name || 'Contact'} created via WhatsApp`,
      });
      fetchConversations();
    });

    const subConv = eventBus.subscribe('ConversationCreated', (data) => {
      const payload = data.payload as any;
      addNotification({
        type: 'NEW_MESSAGE',
        title: 'New Inbound Conversation',
        message: `New WhatsApp message from ${payload?.contactNumber || 'Customer'}`,
      });
      fetchConversations();
      if (activeConvIdRef.current) {
        fetchActiveConversationDetails(activeConvIdRef.current);
      }
    });

    const subMsg = eventBus.subscribe('NewMessage', () => {
      fetchConversations();
      if (activeConvIdRef.current) {
        fetchActiveConversationDetails(activeConvIdRef.current);
      }
    });

    const subTimeline = eventBus.subscribe('TimelineUpdated', () => {
      fetchConversations();
      if (activeConvIdRef.current) {
        fetchActiveConversationDetails(activeConvIdRef.current);
      }
    });

    const subAssign = eventBus.subscribe('ConversationAssigned', (data) => {
      const payload = data.payload as any;
      if (payload?.assignedType === 'HUMAN_EXECUTIVE') {
        addNotification({
          type: 'EXECUTIVE_ASSIGNMENT',
          title: 'Executive Assignment',
          message: `Conversation ${payload?.conversationId} assigned to human executive`,
        });
      }
      fetchConversations();
    });

    // Background interval to refresh conversations & active conversation real-time without manual refresh
    const pollInterval = setInterval(() => {
      fetchConversations();
      if (activeConvIdRef.current) {
        fetchActiveConversationDetails(activeConvIdRef.current);
      }
    }, 3000);

    return () => {
      subLead.unsubscribe();
      subConv.unsubscribe();
      subMsg.unsubscribe();
      subTimeline.unsubscribe();
      subAssign.unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Fetch conversation messages when active selection changes
  useEffect(() => {
    if (activeConvId) {
      fetchActiveConversationDetails(activeConvId);
    }
  }, [activeConvId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, internalNotes]);

  const addNotification = (notif: Omit<NotificationAlert, 'id' | 'timestamp' | 'read'>) => {
    const newNotif: NotificationAlert = {
      ...notif,
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false,
    };
    setNotifications((prev) => [newNotif, ...prev.slice(0, 4)]);
  };

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/v2/conversations');
      if (res.ok) {
        const data = await res.json();
        if (data.conversations) {
          setConversations(data.conversations);
          if (!activeConvId && data.conversations.length > 0) {
            setActiveConvId(data.conversations[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch conversations from API:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchActiveConversationDetails = async (convId: string) => {
    try {
      // 1. Get Conversation Messages & Details
      const res = await fetch(`/api/v2/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) setMessages(data.messages);
        if (data.timeline) setTimeline(data.timeline);
      }

      // 2. Get Internal Notes
      const notesRes = await fetch(`/api/v2/conversations/${convId}/notes`);
      if (notesRes.ok) {
        const notesData = await notesRes.json();
        if (notesData.notes) setInternalNotes(notesData.notes);
      }

      // 3. Get Tags
      const tagsRes = await fetch(`/api/v2/conversations/${convId}/tags`);
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        if (tagsData.tags) setTags(tagsData.tags);
      }

      // 4. Fetch AI Suggestions
      fetchAISuggestions(convId);

      // Reset panels
      setAiSummary(null);
      setDocChecklist(null);
    } catch (err) {
      console.warn('Failed to load conversation details:', err);
    }
  };

  const fetchAISuggestions = async (convId: string) => {
    setIsGeneratingSuggestions(true);
    try {
      const res = await fetch('/api/v2/ai/suggest-replies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: convId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result?.suggestedReplies) {
          setSuggestedReplies(data.result.suggestedReplies);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch AI suggested replies:', err);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  // Filter conversations by active tab and search query
  const filteredConversations = conversations.filter((c) => {
    // Search query check
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = c.customerName?.toLowerCase().includes(q);
      const matchPhone = c.contactNumber?.includes(q);
      const matchService = c.serviceCategory?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchService) return false;
    }

    // Tab Filter
    switch (activeTab) {
      case 'UNREAD':
        return c.unreadCount > 0;
      case 'ASSIGNED':
        return c.assignedExecutiveId === currentUserId;
      case 'WAITING':
        return c.state === 'PENDING_CUSTOMER' || c.unreadCount > 0;
      case 'AI_HANDLING':
        return c.assignedType === 'AI_AGENT';
      case 'HUMAN_HANDLING':
        return c.assignedType === 'HUMAN_EXECUTIVE' || c.assignedType === 'ROUND_ROBIN';
      case 'HOT_LEADS':
        return c.serviceCategory?.toUpperCase().includes('GST') || c.serviceCategory?.toUpperCase().includes('COMPANY');
      case 'EXISTING_CUSTOMERS':
        return !!c.customerId;
      default:
        return true;
    }
  });

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Executive Takeover / Return to AI handler
  const handleToggleTakeover = async () => {
    if (!activeConv) return;
    const targetType = activeConv.assignedType === 'AI_AGENT' ? 'HUMAN_EXECUTIVE' : 'AI_AGENT';

    try {
      const res = await fetch(`/api/v2/conversations/${activeConv.id}/takeover`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetAssignedType: targetType,
          executiveId: currentUserId,
          executiveName: currentUserName,
        }),
      });

      if (res.ok) {
        fetchConversations();
        if (activeConvId) fetchActiveConversationDetails(activeConvId);
      }
    } catch (err) {
      console.error('Failed to toggle takeover:', err);
    }
  };

  // Send Message / Internal Note submit
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || messageText;
    if (!text.trim() || !activeConvId) return;

    if (composerMode === 'INTERNAL_NOTE') {
      // Post Internal Private Note
      try {
        const res = await fetch(`/api/v2/conversations/${activeConvId}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            authorId: currentUserId,
            authorName: currentUserName,
            content: text,
          }),
        });
        if (res.ok) {
          setMessageText('');
          fetchActiveConversationDetails(activeConvId);
        }
      } catch (err) {
        console.error('Failed to post internal note:', err);
      }
    } else {
      // Send Outbound WhatsApp Message
      try {
        const res = await fetch(`/api/v2/conversations/${activeConvId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: currentUserId,
            senderName: currentUserName,
            content: text,
          }),
        });

        if (res.ok) {
          setMessageText('');
          fetchActiveConversationDetails(activeConvId);

          // If conversation is in AI mode, trigger auto-reply
          if (activeConv?.assignedType === 'AI_AGENT') {
            triggerAiAutoReply(activeConvId, text);
          }
        }
      } catch (err) {
        console.error('Failed to send outbound message:', err);
      }
    }
  };

  const triggerAiAutoReply = async (convId: string, userText: string) => {
    setIsAiReplying(true);
    try {
      await fetch('/api/v2/ai/auto-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          customerMessageText: userText,
        }),
      });
      fetchActiveConversationDetails(convId);
    } catch (err) {
      console.error('Failed to trigger AI auto reply:', err);
    } finally {
      setIsAiReplying(false);
    }
  };

  // AI Summarize Handler
  const handleGenerateSummary = async () => {
    if (!activeConvId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/v2/ai/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: activeConvId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.summary) {
          setAiSummary(data.summary.summary);
        }
      }
    } catch (err) {
      console.error('Failed to summarize conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Request Document Checklist
  const handleRequestDocuments = async () => {
    if (!activeConv) return;
    try {
      const res = await fetch('/api/v2/ai/request-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceCategory: activeConv.serviceCategory }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.documentChecklist) {
          setDocChecklist(data.documentChecklist);
        }
      }
    } catch (err) {
      console.error('Failed to generate document checklist:', err);
    }
  };

  // Add Tag
  const handleAddTag = async () => {
    if (!newTagInput.trim() || !activeConvId) return;
    const updated = [...tags, newTagInput.trim()];
    try {
      const res = await fetch(`/api/v2/conversations/${activeConvId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updated }),
      });
      if (res.ok) {
        setTags(updated);
        setNewTagInput('');
      }
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!activeConvId) return;
    const updated = tags.filter((t) => t !== tagToRemove);
    try {
      const res = await fetch(`/api/v2/conversations/${activeConvId}/tags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updated }),
      });
      if (res.ok) {
        setTags(updated);
      }
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden text-slate-100 font-sans">
      {/* Top Real-time Event Banners */}
      {notifications.length > 0 && (
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs space-x-2 animate-fade-in">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-emerald-400 font-bold uppercase tracking-wider text-[10px]">
              LIVE INGESTION ALERT
            </span>
            <span className="text-slate-300 font-medium">
              {notifications[0].title}: {notifications[0].message}
            </span>
          </div>
          <button
            onClick={() => setNotifications([])}
            className="text-slate-500 hover:text-slate-300 p-0.5 rounded cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace Layout (3 Column Grid) */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* ============================================================ */}
        {/* COLUMN 1: AI INBOX LIST (3 Cols)                             */}
        {/* ============================================================ */}
        <div className="md:col-span-3 border-r border-slate-800 bg-slate-950 flex flex-col h-full overflow-hidden">
          {/* Inbox Header & Search */}
          <div className="p-3.5 border-b border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Bot className="h-4 w-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-100 leading-none">AI Sales Inbox</h2>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {filteredConversations.length} Threads Active
                  </span>
                </div>
              </div>
              <button
                onClick={fetchConversations}
                title="Refresh Inbox"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search phone, name or service..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>

            {/* Filter Tabs Horizontal Scroll */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 scrollbar-none text-[10.5px]">
              {(
                [
                  { id: 'ALL', label: 'All' },
                  { id: 'UNREAD', label: 'Unread' },
                  { id: 'ASSIGNED', label: 'My Leads' },
                  { id: 'AI_HANDLING', label: '🤖 AI' },
                  { id: 'HUMAN_HANDLING', label: '👤 Human' },
                  { id: 'HOT_LEADS', label: '🔥 Hot' },
                  { id: 'EXISTING_CUSTOMERS', label: '🏢 Clients' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No active conversations matching your filters.
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const isSelected = conv.id === activeConvId;
                const isAi = conv.assignedType === 'AI_AGENT';

                return (
                  <div
                    key={conv.id}
                    onClick={() => setActiveConvId(conv.id)}
                    className={`p-3 cursor-pointer transition-colors flex items-start space-x-3 ${
                      isSelected
                        ? 'bg-slate-800/80 border-l-4 border-emerald-500'
                        : 'hover:bg-slate-900/60'
                    }`}
                  >
                    {/* Avatar Badge */}
                    <div className="relative shrink-0">
                      <div className="h-9 w-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 text-xs">
                        {conv.customerName.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-slate-950 flex items-center justify-center text-[8px] font-bold ${
                          isAi ? 'bg-indigo-600 text-white' : 'bg-emerald-600 text-white'
                        }`}
                        title={isAi ? 'AI Handling' : 'Human Executive Handling'}
                      >
                        {isAi ? 'AI' : 'H'}
                      </div>
                    </div>

                    {/* Content Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-slate-100 truncate">
                          {conv.customerName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono shrink-0">
                          {conv.updatedAt
                            ? new Date(conv.updatedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </span>
                      </div>

                      <div className="text-[11px] text-slate-400 font-mono mb-1 truncate">
                        +{conv.contactNumber}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-slate-800 text-emerald-400 font-mono font-semibold truncate max-w-[130px]">
                          {conv.serviceCategory || 'General Inquiry'}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="h-4 px-1.5 rounded-full bg-emerald-500 text-white text-[9px] font-black flex items-center justify-center shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================ */}
        {/* COLUMN 2: CHAT WINDOW & MESSAGES (6 Cols)                    */}
        {/* ============================================================ */}
        <div className="md:col-span-6 bg-slate-900 flex flex-col h-full border-r border-slate-800 overflow-hidden">
          {activeConv ? (
            <>
              {/* Active Conversation Top Header */}
              <div className="p-3 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm">
                    {activeConv.customerName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="text-xs font-bold text-slate-100">{activeConv.customerName}</h3>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {activeConv.channel}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      +{activeConv.contactNumber} • {activeConv.serviceCategory || 'General'}
                    </div>
                  </div>
                </div>

                {/* Header Action Controls */}
                <div className="flex items-center space-x-2">
                  {/* Executive Takeover Toggle */}
                  <button
                    onClick={handleToggleTakeover}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer ${
                      activeConv.assignedType === 'AI_AGENT'
                        ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md'
                    }`}
                  >
                    {activeConv.assignedType === 'AI_AGENT' ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Take Over (Human)</span>
                      </>
                    ) : (
                      <>
                        <Bot className="h-3.5 w-3.5" />
                        <span>Return to AI</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleGenerateSummary}
                    title="Generate AI Summary"
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center space-x-1 px-2.5"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span className="hidden sm:inline">AI Summary</span>
                  </button>
                </div>
              </div>

              {/* AI Summary Banner if generated */}
              {aiSummary && (
                <div className="p-3 bg-amber-950/40 border-b border-amber-800/50 text-xs text-amber-200 flex items-start justify-between animate-fade-in">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-amber-300 uppercase tracking-wider text-[10px] font-mono">
                        AI Executive Summary
                      </span>
                      <p className="leading-relaxed mt-0.5">{aiSummary}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAiSummary(null)}
                    className="text-amber-400 hover:text-amber-100 p-0.5 rounded cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {/* Document Checklist Panel if requested */}
              {docChecklist && (
                <div className="p-3 bg-indigo-950/40 border-b border-indigo-800/50 text-xs text-indigo-200 animate-fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 font-bold text-indigo-300">
                      <FileCheck className="h-4 w-4 text-indigo-400" />
                      <span className="uppercase font-mono text-[10px] tracking-wider">
                        Required Document Checklist ({activeConv.serviceCategory})
                      </span>
                    </div>
                    <button
                      onClick={() => setDocChecklist(null)}
                      className="text-indigo-400 hover:text-indigo-100 p-0.5 rounded cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-[11px] text-indigo-100">
                    {docChecklist.map((doc, i) => (
                      <li key={i}>{doc}</li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      const text = `Document Checklist for ${activeConv.serviceCategory}:\n${docChecklist.map((d, idx) => `${idx + 1}. ${d}`).join('\n')}`;
                      handleSendMessage(text);
                      setDocChecklist(null);
                    }}
                    className="mt-2 text-[10px] font-bold px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Send Checklist to Customer
                  </button>
                </div>
              )}

              {/* Message Thread Scroll Container */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-900/50">
                {messages.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">
                    No messages in this thread yet. Type a message below to start conversation.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isInbound = msg.direction === 'INBOUND';

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isInbound ? 'items-start' : 'items-end'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-md ${
                            isInbound
                              ? 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-tl-xs'
                              : 'bg-emerald-600 text-white rounded-tr-xs'
                          }`}
                        >
                          {/* Sender Label */}
                          <div
                            className={`text-[9px] font-mono font-bold mb-1 ${
                              isInbound ? 'text-slate-400' : 'text-emerald-200'
                            }`}
                          >
                            {msg.senderName || (isInbound ? 'Customer' : 'Executive')}
                          </div>

                          {/* Message Content */}
                          <p className="whitespace-pre-wrap">{msg.content}</p>

                          {/* Attachments Preview */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {msg.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="p-1.5 rounded-lg bg-black/20 border border-white/10 flex items-center space-x-2 text-[10px]"
                                >
                                  <Paperclip className="h-3 w-3 text-emerald-300 shrink-0" />
                                  <span className="truncate">{att.fileName}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Timestamp & Status */}
                          <div
                            className={`flex items-center justify-end space-x-1 mt-1 text-[9px] font-mono ${
                              isInbound ? 'text-slate-400' : 'text-emerald-200'
                            }`}
                          >
                            <span>
                              {msg.timestamp
                                ? new Date(msg.timestamp).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                            {!isInbound && (
                              <CheckCheck className="h-3 w-3 text-emerald-300" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Display Internal Notes in chat stream if any */}
                {internalNotes.map((note) => (
                  <div key={note.id} className="flex flex-col items-center my-2">
                    <div className="bg-amber-950/60 border border-amber-800/80 text-amber-200 rounded-xl p-2.5 max-w-[90%] text-xs shadow-md">
                      <div className="flex items-center space-x-1.5 font-bold text-amber-400 text-[10px] font-mono mb-1">
                        <Lock className="h-3 w-3" />
                        <span>INTERNAL NOTE BY {note.authorName.toUpperCase()}</span>
                      </div>
                      <p>{note.content}</p>
                    </div>
                  </div>
                ))}

                {/* AI Thinking / Generating state indicator */}
                {isAiReplying && (
                  <div className="flex items-center space-x-2 text-indigo-400 text-xs font-mono animate-pulse p-2 bg-indigo-950/30 rounded-xl border border-indigo-900/50">
                    <Bot className="h-4 w-4" />
                    <span>Gemini AI is analyzing customer query and generating auto-reply...</span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Replies Chips Bar */}
              <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400">
                  <span className="flex items-center space-x-1">
                    <Sparkles className="h-3 w-3 text-amber-400" />
                    <span>AI SUGGESTED QUICK REPLIES</span>
                  </span>
                  <button
                    onClick={() => fetchAISuggestions(activeConv.id)}
                    className="hover:text-slate-200 cursor-pointer"
                  >
                    Refresh
                  </button>
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  {isGeneratingSuggestions ? (
                    <span className="text-[10px] text-slate-500 font-mono animate-pulse">
                      Generating suggestions...
                    </span>
                  ) : suggestedReplies.length > 0 ? (
                    suggestedReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => setMessageText(reply)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] whitespace-nowrap transition-colors cursor-pointer truncate max-w-[280px]"
                        title={reply}
                      >
                        {reply}
                      </button>
                    ))
                  ) : (
                    <button
                      onClick={handleRequestDocuments}
                      className="px-2.5 py-1 rounded-lg bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-[11px] font-bold cursor-pointer"
                    >
                      📄 Request Document Checklist
                    </button>
                  )}
                </div>
              </div>

              {/* Message Composer Footer */}
              <div className="p-3 bg-slate-950 border-t border-slate-800 space-y-2">
                {/* Composer Mode Selector */}
                <div className="flex items-center space-x-2 text-[10px] font-mono">
                  <button
                    onClick={() => setComposerMode('PUBLIC')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                      composerMode === 'PUBLIC'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    WhatsApp Reply
                  </button>
                  <button
                    onClick={() => setComposerMode('INTERNAL_NOTE')}
                    className={`px-2.5 py-1 rounded-md font-bold transition-colors cursor-pointer ${
                      composerMode === 'INTERNAL_NOTE'
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-900 text-slate-400'
                    }`}
                  >
                    🔒 Internal Private Note
                  </button>
                </div>

                {/* Input Area */}
                <div className="flex items-end space-x-2">
                  <textarea
                    rows={2}
                    placeholder={
                      composerMode === 'INTERNAL_NOTE'
                        ? 'Type private internal note for team members...'
                        : 'Type customer WhatsApp reply...'
                    }
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className={`flex-1 bg-slate-900 border rounded-xl p-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none transition-colors ${
                      composerMode === 'INTERNAL_NOTE'
                        ? 'border-amber-700/80 focus:border-amber-500'
                        : 'border-slate-800 focus:border-emerald-500'
                    }`}
                  />

                  <button
                    onClick={() => handleSendMessage()}
                    disabled={!messageText.trim()}
                    className={`h-10 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center space-x-1.5 transition-all cursor-pointer disabled:opacity-40 ${
                      composerMode === 'INTERNAL_NOTE'
                        ? 'bg-amber-600 hover:bg-amber-500'
                        : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950'
                    }`}
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-xs p-8">
              <Bot className="h-12 w-12 text-slate-700 mb-3" />
              <p>Select a conversation thread from the left inbox panel to begin.</p>
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* COLUMN 3: CUSTOMER 360 LITE (3 Cols)                          */}
        {/* ============================================================ */}
        <div className="md:col-span-3 bg-slate-950 flex flex-col h-full overflow-y-auto divide-y divide-slate-800 text-xs">
          {activeConv ? (
            <>
              {/* Profile Header */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center space-x-2 text-slate-400 font-mono text-[10px] font-bold uppercase tracking-wider">
                  <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Customer 360 Intelligence</span>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-base">
                    {activeConv.customerName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100 text-sm leading-tight">
                      {activeConv.customerName}
                    </h4>
                    <span className="text-[10px] font-mono text-emerald-400">
                      Identity Matched (High Confidence)
                    </span>
                  </div>
                </div>
              </div>

              {/* Key Identifiers & Compliance Data */}
              <div className="p-3.5 space-y-2.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  Contact & Business Details
                </span>

                <div className="space-y-2 text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-[11px]">+{activeConv.contactNumber}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px]">{customer?.email || lead?.email || 'rahul@test.com'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="text-[11px]">{customer?.companyName || lead?.companyName || 'ABC Traders'}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-[11px] text-amber-400 font-semibold">
                      GSTIN: {customer?.gstin || lead?.gstin || '07ABCDE1234F1Z5'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <FileText className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-[11px] text-indigo-400 font-semibold">
                      PAN: {customer?.pan || lead?.pan || 'ABCDE1234F'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Opportunity & Lead Score Meter */}
              <div className="p-3.5 space-y-2.5">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  Lead Score & Deal Opportunity
                </span>

                {/* Score Gauge */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">AI Intent Score</span>
                    <span className="font-black text-emerald-400 font-mono text-xs">85 / 100</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[85%] rounded-full" />
                  </div>
                  <span className="text-[9.5px] text-slate-400 block pt-0.5">
                    High Purchase Intent • Service Requested: {activeConv.serviceCategory}
                  </span>
                </div>

                {/* Active Opportunity Card */}
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200">
                      {activeConv.serviceCategory} Deal
                    </span>
                    <span className="font-mono font-black text-emerald-400">₹8,500</span>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between">
                    <span>Stage: Discovery & Proposal</span>
                    <span className="text-emerald-400 font-bold">Assigned: {activeConv.assignedExecutiveName}</span>
                  </div>
                </div>
              </div>

              {/* Tags Editor */}
              <div className="p-3.5 space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  Conversation Tags
                </span>

                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800 text-[10px] flex items-center space-x-1"
                    >
                      <span>#{tag}</span>
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-rose-400 cursor-pointer"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center space-x-1 pt-1">
                  <input
                    type="text"
                    placeholder="Add tag..."
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-200 placeholder-slate-500 flex-1 focus:outline-none"
                  />
                  <button
                    onClick={handleAddTag}
                    className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Activity Timeline Stream */}
              <div className="p-3.5 space-y-2">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider block">
                  Activity Timeline Stream
                </span>

                <div className="space-y-2">
                  {timeline.length === 0 ? (
                    <span className="text-[10px] text-slate-500">No activity logged yet.</span>
                  ) : (
                    timeline.slice(-4).map((entry) => (
                      <div key={entry.id} className="text-[10.5px] border-l-2 border-emerald-500/60 pl-2 space-y-0.5">
                        <div className="flex items-center justify-between text-slate-400 font-mono text-[9px]">
                          <span>{entry.activityType}</span>
                          <span>
                            {entry.timestamp
                              ? new Date(entry.timestamp).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-tight">{entry.summary}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-slate-500">Select thread to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
}
