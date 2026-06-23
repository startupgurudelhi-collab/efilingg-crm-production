/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  getConversations, 
  getMessages, 
  addMessage, 
  editMessage, 
  deleteMessage, 
  markMessagesAsRead, 
  getAnnouncements, 
  addAnnouncement, 
  acknowledgeAnnouncement, 
  getChatTasks, 
  createChatTask, 
  toggleChatTaskStatus,
  getChatNotifications,
  markChatNotificationsRead,
  togglePinConversation,
  toggleArchiveConversation,
  getChatAuditLogs,
  createConversation,
  saveIncomingMessage
} from '../lib/chatDb';
import { getEmployees } from '../lib/db';
import { Employee } from '../types';
import { 
  ChatMessage, 
  ChatConversation, 
  ChatAnnouncement, 
  ChatTask, 
  ChatAttachment,
  ChatAuditLog
} from '../types/chat';
import { 
  MessageSquare, 
  Send, 
  Paperclip, 
  Mic, 
  Square, 
  Share2, 
  Search, 
  User, 
  Users, 
  Bell, 
  Pin, 
  Edit, 
  Trash2, 
  CheckCheck, 
  Check, 
  Plus, 
  Calendar, 
  Clipboard, 
  Bot, 
  X, 
  ChevronDown, 
  FolderOpen, 
  AlertCircle, 
  Sparkles,
  Info,
  Archive,
  Volume2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TeamConnectWidgetProps {
  currentUser: Employee;
  triggerRefreshParent?: () => void;
}

export default function TeamConnectWidget({ currentUser, triggerRefreshParent }: TeamConnectWidgetProps) {
  // Widget open/collapse state
  const [isOpen, setIsOpen] = useState(false);
  
  // Tab states: 'chats' | 'announcements' | 'tasks' | 'logs'
  const [activeWidgetTab, setActiveWidgetTab] = useState<'chats' | 'announcements' | 'tasks' | 'logs'>('chats');
  
  // Selection states
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConv, setActiveConv] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [announcements, setAnnouncements] = useState<ChatAnnouncement[]>([]);
  const [chatTasks, setChatTasks] = useState<ChatTask[]>([]);
  const [auditLogs, setAuditLogs] = useState<ChatAuditLog[]>([]);
  
  // Lists of users and online statuses
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({}); // key: user_id:conv_id
  
  // Input fields
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mentionSearch, setMentionSearch] = useState('');
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [showRightDetails, setShowRightDetails] = useState(false);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  
  // Task formulation pop-up inside chat
  const [makingTaskForMsg, setMakingTaskForMsg] = useState<ChatMessage | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('');
  
  // Policy announcements creation dialog for TL/Admins
  const [showPolicyBuilder, setShowPolicyBuilder] = useState(false);
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyContent, setPolicyContent] = useState('');
  
  // AI Smart search engine state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReply, setAiReply] = useState<string | null>(null);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<any>(null);

  // Real-time Chat Toasts state
  const [chatToasts, setChatToasts] = useState<{
    id: string;
    senderName: string;
    text: string;
    conversationId: string;
    createdAt: string;
  }[]>([]);
  
  // Ref elements
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const announcementFileInputRef = useRef<HTMLInputElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Filter conversations list
  const [convFilter, setConvFilter] = useState<'all' | 'direct' | 'group'>('all');

  // Load static data
  const reloadData = () => {
    const allEmps = getEmployees();
    setEmployees(allEmps);
    
    const list = getConversations(currentUser.id);
    setConversations(list);
    
    setAnnouncements(getAnnouncements());
    setChatTasks(getChatTasks());
    setAuditLogs(getChatAuditLogs());

    if (activeConv) {
      setMessages(getMessages(activeConv.id));
      markMessagesAsRead(activeConv.id, currentUser.id);
    }
  };

  // Initial loader & fast background database polling to retrieve other colleagues' messages
  useEffect(() => {
    reloadData();
    
    // When the chat widget is active/open, poll the PostgreSQL store every 3.5 seconds to sync messages instantly.
    // When minimized, poll every 15 seconds to update notification and unread counts badge cleanly.
    const pollIntervalMs = isOpen ? 3500 : 15000;
    let isFetching = false;

    const pullLatestLiveSync = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const { pullFromPostgres } = await import('../lib/postgresSync');
        const pulled = await pullFromPostgres();
        if (pulled) {
          reloadData();
        }
      } catch (err) {
        console.warn('[Team Connect Background Sync Error]', err);
      } finally {
        isFetching = false;
      }
    };

    // Trigger immediate pull on mount or state toggle
    pullLatestLiveSync();

    const syncInterval = setInterval(() => {
      pullLatestLiveSync();
    }, pollIntervalMs);

    return () => clearInterval(syncInterval);
  }, [currentUser.id, activeConv?.id, isOpen]);

  // Scroll to bottom when new messages show up
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeConv]);

  // --- WEBSOCKET CLIENT SYNC ---
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;
    
    const connectWS = () => {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[Team Connect WS] Integrated successfully.');
        // Authenticate client
        socket.send(JSON.stringify({
          type: 'init',
          userId: currentUser.id
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'online_users_list': {
              setOnlineUsers(data.onlineUsers || []);
              break;
            }
            case 'presence': {
              const { userId, status } = data;
              setOnlineUsers((prev) => {
                if (status === 'online') {
                  return Array.from(new Set([...prev, userId]));
                } else {
                  return prev.filter(id => id !== userId);
                }
              });
              break;
            }
            case 'typing': {
              const { userId, conversationId, isTyping } = data;
              setTypingUsers((prev) => ({
                ...prev,
                [`${userId}:${conversationId}`]: isTyping
              }));
              break;
            }
            case 'msg': {
              const { payload, participants } = data;
              
              // 1. Decisive fix: save incoming message locally on receiver's end to avoid loss on reloadData()
              saveIncomingMessage(payload, participants);

              // 2. Play a subtle compliance chime notification sound safely
              if (payload.senderId !== currentUser.id) {
                try {
                  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-120.wav');
                  audio.volume = 0.45;
                  audio.play().catch(() => {});
                } catch (audioErr) {}
              }

              // 3. Trigger screen Hud-styled toast alerts if panel is minimized or colleague is on another thread
              const isViewingCurrentlyObj = isOpen && activeConv && activeConv.id === payload.conversationId;
              if (payload.senderId !== currentUser.id && !isViewingCurrentlyObj) {
                const toastId = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
                const newToastObj = {
                  id: toastId,
                  senderName: payload.senderName,
                  text: payload.text,
                  conversationId: payload.conversationId,
                  createdAt: payload.createdAt
                };
                setChatToasts((prev) => [...prev, newToastObj]);
                
                // Dimiss toast automatically after 5.5 seconds
                setTimeout(() => {
                  setChatToasts((prev) => prev.filter((t) => t.id !== toastId));
                }, 5500);
              }

              // 4. Instantly append if looking at same thread
              if (activeConv && activeConv.id === payload.conversationId) {
                setMessages((prev) => {
                  if (prev.some(m => m.id === payload.id)) return prev;
                  return [...prev, payload];
                });
                markMessagesAsRead(payload.conversationId, currentUser.id);
              }
              reloadData(); // trigger standard state merge
              break;
            }
            case 'announcement': {
              reloadData();
              break;
            }
          }
        } catch (e) {
          console.error('[WS Sync client error]', e);
        }
      };

      socket.onclose = () => {
        console.warn('[WS] Closed. Retrying sync connection in 10s...');
        setTimeout(connectWS, 10000);
      };

      socket.onerror = (err) => {
        console.error('[WS] Connection error caught safely:', err);
      };
    };

    connectWS();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [activeConv?.id]);

  // Handle typing triggers
  const sendTypingStatus = (isTyping: boolean) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activeConv) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        userId: currentUser.id,
        userName: currentUser.name,
        conversationId: activeConv.id,
        isTyping,
        participants: activeConv.participants
      }));
    }
  };

  // Typing debounce timer
  let typingTimeout: any = null;
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setMessageInput(val);
    
    // Check mentions trigger
    const words = val.split(' ');
    const lastWord = words[words.length - 1];
    if (lastWord.startsWith('@')) {
      setShowMentionDropdown(true);
      setMentionSearch(lastWord.slice(1).toLowerCase());
    } else {
      setShowMentionDropdown(false);
    }

    sendTypingStatus(true);
    
    if (typingTimeout) clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
      sendTypingStatus(false);
    }, 2000);
  };

  // Handle selecting a mention
  const insertMention = (emp: Employee) => {
    const words = messageInput.split(' ');
    words.pop(); // remove the @ word
    words.push(`@${emp.name}`);
    setMessageInput(words.join(' ') + ' ');
    setShowMentionDropdown(false);
  };

  // --- MESSAGE ACTIONS ---
  const handleSendMessage = () => {
    if (!messageInput.trim() || !activeConv) return;
    
    // Identify mentions inside string
    const mentions: string[] = [];
    employees.forEach(emp => {
      if (messageInput.includes(`@${emp.name}`)) {
        mentions.push(emp.id);
      }
    });

    const newMsg = addMessage(
      activeConv.id,
      currentUser.id,
      currentUser.name,
      messageInput,
      [],
      mentions
    );

    // Broadcast message via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'msg',
        payload: newMsg,
        participants: activeConv.participants
      }));
    }

    setMessages(prev => [...prev, newMsg]);
    setMessageInput('');
    sendTypingStatus(false);
    reloadData();
  };

  // Edit Message inline
  const keyEdit = (id: string, text: string) => {
    setEditingMsgId(id);
    setEditInput(text);
  };

  const saveEdit = (msgId: string) => {
    if (!editInput.trim()) return;
    const ok = editMessage(msgId, currentUser.id, editInput);
    if (ok) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editInput, editedAt: new Date().toISOString() } : m));
      setEditingMsgId(null);
      setEditInput('');
      reloadData();
    }
  };

  // Delete message owned
  const keyDelete = (msgId: string) => {
    const ok = deleteMessage(msgId, currentUser.id);
    if (ok) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: '⚠️ This message was deleted.', deletedAt: new Date().toISOString(), attachments: [] } : m));
      reloadData();
    }
  };

  // --- AUDIO VOICE NOTES REGISTRATION ---
  const triggerVoiceRecord = async () => {
    if (isRecording) {
      // Stop recording
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        setIsRecording(false);
      }
    } else {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert to base64
          const reader = new FileReader();
          reader.readAsDataURL(audioBlob);
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            
            // Upload voice file to backend
            try {
              const res = await fetch('/api/chat/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  filename: `voice-${Date.now()}.webm`,
                  fileType: 'audio/webm',
                  base64Data: base64data
                })
              });
              const uploadRes = await res.json();
              
              if (activeConv && uploadRes.success) {
                const attachment: ChatAttachment = {
                  id: `att-${Date.now()}`,
                  name: '🎙️ Voice Note (Play)',
                  type: 'audio/webm',
                  size: audioBlob.size,
                  dataUrl: uploadRes.url
                };

                const msgText = '🎙️ Shared a voice recording.';
                const newMsg = addMessage(
                  activeConv.id,
                  currentUser.id,
                  currentUser.name,
                  msgText,
                  [attachment],
                  []
                );

                if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                  wsRef.current.send(JSON.stringify({
                    type: 'msg',
                    payload: newMsg,
                    participants: activeConv.participants
                  }));
                }

                setMessages(prev => [...prev, newMsg]);
                reloadData();
              }
            } catch (err) {
              console.error('Failed uploading voice payload:', err);
              alert('Could not persist voice note attachment.');
            }
          };

          // Stop all audio tracks to release microphone
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setVoiceDuration(0);
        recordingIntervalRef.current = setInterval(() => {
          setVoiceDuration(prev => prev + 1);
        }, 1000);
      } catch (err) {
        console.error('Microphone usage blocked:', err);
        alert('Active microphone permissions required to support Voice notes log.');
      }
    }
  };

  // --- ATTACHMENT SHARER ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64data = reader.result as string;

      try {
        const res = await fetch('/api/chat/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileType: file.type || 'application/octet-stream',
            base64Data: base64data
          })
        });
        const uploadRes = await res.json();

        if (uploadRes.success) {
          const attachment: ChatAttachment = {
            id: `att-${Date.now()}`,
            name: file.name,
            type: file.type || 'document',
            size: file.size,
            dataUrl: uploadRes.url
          };

          const newMsg = addMessage(
            activeConv.id,
            currentUser.id,
            currentUser.name,
            `📎 Attached Resource: ${file.name}`,
            [attachment],
            []
          );

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'msg',
              payload: newMsg,
              participants: activeConv.participants
            }));
          }

          setMessages(prev => [...prev, newMsg]);
          reloadData();
        }
      } catch (err) {
        console.error('Document upload failure:', err);
        alert('Could not attach resource file.');
      }
    };
  };

  // Pin / Archive Conversations
  const togglePin = (convId: string) => {
    togglePinConversation(convId, currentUser.id);
    reloadData();
  };

  const toggleArchive = (convId: string) => {
    toggleArchiveConversation(convId, currentUser.id);
    reloadData();
  };

  // --- MAKE TASK DIRECT FROM CHAT MESSAGE ---
  const requestTaskForm = (msg: ChatMessage) => {
    setMakingTaskForMsg(msg);
    setTaskTitle(msg.text.substr(0, 50));
    setTaskDueDate(new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]); // 2 days in future
  };

  const handleCreateTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!makingTaskForMsg || !taskTitle.trim() || !taskAssignee) return;

    createChatTask(
      taskTitle,
      makingTaskForMsg.id,
      makingTaskForMsg.conversationId,
      taskAssignee,
      currentUser.id,
      taskDueDate
    );

    alert('Task successfully formulated from chat discussion!');
    setMakingTaskForMsg(null);
    reloadData();
  };

  // --- SYSTEM POLICY MANAGER bulletins ---
  const savePolicyBulletin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyTitle.trim() || !policyContent.trim()) return;

    const ann = addAnnouncement(
      currentUser.id,
      currentUser.name,
      policyTitle,
      policyContent
    );

    // WebSocket warning to active clients
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'announcement',
        payload: ann
      }));
    }

    setPolicyTitle('');
    setPolicyContent('');
    setShowPolicyBuilder(false);
    reloadData();
    alert('Corporate regulatory alignment bulletin released.');
  };

  const acknowledgePolicy = (id: string) => {
    acknowledgeAnnouncement(id, currentUser.id);
    reloadData();
  };

  // --- GEMINI AI QUERY INTELLIGENCE SYSTEM INDEXES ---
  const queryGeminiAI = async () => {
    if (!queryVal.trim()) return;
    setAiLoading(true);
    setAiReply(null);

    try {
      const res = await fetch('/api/chat/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: queryVal,
          userId: currentUser.id,
          userName: currentUser.name
        })
      });
      const data = await res.json();
      if (data.success) {
        setAiReply(data.aiSummary || data.message);
      } else {
        setAiReply('Gemini controller offline. Searching local file sync details instead.');
      }
    } catch (e) {
      setAiReply('Corporate AI agent sleeping. Local sync indexing robust.');
    } finally {
      setAiLoading(false);
    }
  };

  const [queryVal, setQueryVal] = useState('');

  // Filtering matching items
  const filteredConversations = conversations.filter(c => {
    if (convFilter === 'direct' && c.isGroup) return false;
    if (convFilter === 'group' && !c.isGroup) return false;
    
    if (searchQuery.trim() !== '') {
      const lower = searchQuery.toLowerCase();
      const matchName = c.isGroup ? c.name?.toLowerCase().includes(lower) : false;
      const matchDesc = c.description?.toLowerCase().includes(lower);
      
      // search for other participant's name
      let matchPart = false;
      if (!c.isGroup) {
        const otherId = c.participants.find(p => p !== currentUser.id);
        const emp = employees.find(e => e.id === otherId);
        if (emp && emp.name.toLowerCase().includes(lower)) {
          matchPart = true;
        }
      }
      return matchName || matchDesc || matchPart;
    }
    return true;
  });

  // Sort: Pinned conversations at top, latest lastMessage date after
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    const pinA = a.pinnedBy?.includes(currentUser.id) ? 1 : 0;
    const pinB = b.pinnedBy?.includes(currentUser.id) ? 1 : 0;
    if (pinA !== pinB) return pinB - pinA;

    const dateA = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const dateB = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  // Start direct private chat with selected colleague
  const startConversationWithColleague = (colleagueId: string) => {
    const colleague = employees.find(e => e.id === colleagueId);
    if (!colleague) return;

    const chatInstance = createConversation(
      [currentUser.id, colleagueId],
      false,
      undefined,
      currentUser.id
    );

    setActiveConv(chatInstance);
    setSearchQuery('');
    reloadData();
  };

  // Helper formatting for voice record display
  const formatSecs = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Count global unread messages across all joined widgets
  const unreadCount = conversations.reduce((acc, c) => {
    const msgs = getMessages(c.id);
    const unreadMsgs = msgs.filter(m => m.senderId !== currentUser.id && !m.isReadBy.includes(currentUser.id));
    return acc + unreadMsgs.length;
  }, 0);

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden font-sans">
      
      {/* 1. COLLAPSED floating button launcher */}
      {!isOpen && (
        <motion.button
          onClick={() => {
            setIsOpen(true);
            reloadData();
          }}
          className="relative px-5 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800 text-white font-extrabold text-[12px] uppercase shadow-2xl flex items-center space-x-2 cursor-pointer grow-0 select-none tracking-widest border border-white/20 active:scale-95 transition-all outline-none"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          id="team-connect-launcher"
        >
          <MessageSquare className="h-5 w-5 shrink-0 animate-bounce" />
          <span>Team Connect</span>
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-1 bg-rose-500 text-white font-mono text-[9px] font-black h-5 w-5 rounded-full flex items-center justify-center animate-pulse border border-white">
              {unreadCount}
            </span>
          )}
        </motion.button>
      )}

      {/* 2. EXPANDED collaborative box workspace */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="w-[92vw] md:w-[680px] lg:w-[840px] h-[85vh] md:h-[580px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-w-full"
            initial={{ opacity: 0, scale: 0.85, y: 35 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 35 }}
          >
            {/* Main Widget Header */}
            <div className="p-4 px-5 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-center justify-between border-b border-white/5 shadow-md">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center text-white text-[12px] font-black">
                  💬
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wide leading-none">Internal Team Connect</h3>
                  <span className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-0.5 block">Secure Corporate Collaboration Desk</span>
                </div>
              </div>

              {/* Window Controls */}
              <div className="flex items-center space-x-2">
                {/* Global Unread Alerts indicator */}
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-mono font-black text-[9px] leading-none uppercase">
                    {unreadCount} Alerts Pending
                  </span>
                )}
                
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 px-1.5 bg-white/10 hover:bg-rose-600 text-white/85 hover:text-white rounded-lg transition-colors cursor-pointer text-xs font-bold"
                  title="Close Widget"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Sub-header navigation tabs */}
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-850 px-4 py-1.5">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setActiveWidgetTab('chats')}
                  className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                    activeWidgetTab === 'chats'
                      ? 'bg-slate-900 dark:bg-slate-800 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <Users className="h-3.5 w-3.5 shrink-0" />
                  <span>Rooms & Private Chats</span>
                </button>
                <button
                  onClick={() => setActiveWidgetTab('announcements')}
                  className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                    activeWidgetTab === 'announcements'
                      ? 'bg-slate-900 dark:bg-slate-800 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <Bell className="h-3.5 w-3.5 shrink-0" />
                  <span>Policy Bulletins ({announcements.length})</span>
                </button>
                <button
                  onClick={() => setActiveWidgetTab('tasks')}
                  className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                    activeWidgetTab === 'tasks'
                      ? 'bg-slate-900 dark:bg-slate-800 text-white'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
                  }`}
                >
                  <Clipboard className="h-3.5 w-3.5 shrink-0" />
                  <span>Linked Tasks ({chatTasks.filter(t => t.status === 'pending').length})</span>
                </button>
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => setActiveWidgetTab('logs')}
                    className={`px-3 py-1.5 rounded-xl text-[10.5px] font-black uppercase tracking-wider flex items-center space-x-1.5 ${
                      activeWidgetTab === 'logs'
                        ? 'bg-slate-900 dark:bg-slate-800 text-white'
                        : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900'
                    }`}
                  >
                    <span>Audit Logs</span>
                  </button>
                )}
              </div>
              <div className="text-[10px] font-mono font-bold text-slate-400 capitalize hidden sm:block">
                Colleague: {currentUser.name}
              </div>
            </div>

            {/* Tab view panels */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* ==========================================
                  TAB 1: ROOMS & CHATS (Standard WhatsApp style)
                  ========================================== */}
              {activeWidgetTab === 'chats' && (
                <>
                  {/* Left segment sidepanel */}
                  <div className="w-64 md:w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-950/20 shrink-0">
                    {/* Search bar inside chats tree */}
                    <div className="p-3 border-b border-slate-205 dark:border-slate-850">
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                          <Search className="h-3.5 w-3.5" />
                        </span>
                        <input
                          type="text"
                          placeholder="Search chat or colleague name..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Room Category filters */}
                    <div className="p-2 pb-0 flex items-center space-x-1">
                      <button
                        onClick={() => setConvFilter('all')}
                        className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          convFilter === 'all' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setConvFilter('direct')}
                        className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          convFilter === 'direct' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500'
                        }`}
                      >
                        Private
                      </button>
                      <button
                        onClick={() => setConvFilter('group')}
                        className={`flex-1 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                          convFilter === 'group' ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white' : 'text-slate-500'
                        }`}
                      >
                        Groups
                      </button>
                    </div>

                    {/* Lists scrollable container */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
                      
                      {/* Search dropdown list for launching a brand new teammate chat */}
                      {searchQuery.trim() !== '' && employees.length > 0 && (
                        <div className="bg-emerald-500/10 p-2 rounded-2xl border border-emerald-500/20 mb-3">
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600 block mb-1">Start New Direct Chat</span>
                          <div className="space-y-1">
                            {employees
                              .filter(emp => emp.id !== currentUser.id && emp.name.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map(emp => (
                                <button
                                  key={emp.id}
                                  onClick={() => startConversationWithColleague(emp.id)}
                                  className="w-full text-left p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs flex items-center justify-between"
                                >
                                  <div className="flex items-center space-x-2">
                                    <span className="h-6 w-6 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-350 rounded-full flex items-center justify-center text-[10px] font-bold">
                                      {emp.name.charAt(0)}
                                    </span>
                                    <div>
                                      <span className="font-extrabold text-slate-900 dark:text-white block">{emp.name}</span>
                                      <span className="text-[8px] text-slate-400 capitalize block">{emp.department} • {emp.role}</span>
                                    </div>
                                  </div>
                                  <Plus className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                </button>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Map active conversations list */}
                      {sortedConversations.length === 0 ? (
                        <div className="p-4 text-center text-slate-400 text-xs font-semibold">No discussions matching.</div>
                      ) : (
                        sortedConversations.map(conv => {
                          const isSelected = activeConv?.id === conv.id;
                          
                          // Resolve display details
                          let displayName = conv.name || 'Conversation';
                          let initials = '👥';
                          let subtitle = conv.description || 'Department squad';
                          let isOnline = false;

                          if (!conv.isGroup) {
                            const otherId = conv.participants.find(p => p !== currentUser.id) || '';
                            const colleague = employees.find(e => e.id === otherId);
                            if (colleague) {
                              displayName = colleague.name;
                              initials = colleague.name.charAt(0);
                              subtitle = `${colleague.designation || colleague.role}`;
                              isOnline = onlineUsers.includes(otherId);
                            }
                          } else {
                            initials = '⭐';
                          }

                          // Unread messages checks
                          const cMsgs = getMessages(conv.id);
                          const unreadCountForThisConv = cMsgs.filter(m => m.senderId !== currentUser.id && !m.isReadBy.includes(currentUser.id)).length;

                          return (
                            <div
                              key={conv.id}
                              className={`group relative p-2 px-3 rounded-2xl border transition-all text-left flex items-start justify-between cursor-pointer ${
                                isSelected
                                  ? 'bg-slate-900 border-slate-900 text-white dark:bg-slate-800 dark:border-slate-800'
                                  : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-100'
                              }`}
                              onClick={() => {
                                setActiveConv(conv);
                                setMessages(getMessages(conv.id));
                                markMessagesAsRead(conv.id, currentUser.id);
                              }}
                            >
                              <div className="flex items-start space-x-2.5 overflow-hidden">
                                <div className="relative shrink-0 mt-0.5">
                                  <div className={`h-8 w-8 rounded-full flex items-center justify-center font-extrabold text-xs capitalize ${
                                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-850 text-slate-800 dark:text-white'
                                  }`}>
                                    {initials}
                                  </div>
                                  {!conv.isGroup && isOnline && (
                                    <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-500 border border-white dark:border-slate-900" />
                                  )}
                                </div>
                                <div className="leading-tight overflow-hidden">
                                  <div className="flex items-center space-x-1 pb-0.5">
                                    <span className="font-extrabold text-[11.5px] leading-tight truncate block">{displayName}</span>
                                    {conv.pinnedBy?.includes(currentUser.id) && (
                                      <Pin className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                                    )}
                                  </div>
                                  <span className={`text-[9.5px] leading-none block truncate font-medium ${
                                    isSelected ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'
                                  }`}>
                                    {conv.lastMessage ? `${conv.lastMessage.senderName}: ${conv.lastMessage.text}` : subtitle}
                                  </span>
                                </div>
                              </div>

                              <div className="flex flex-col items-end justify-between shrink-0 h-7 text-[8px] font-mono leading-none">
                                {unreadCountForThisConv > 0 && (
                                  <span className="bg-rose-500 font-bold text-white h-4 min-w-4 px-1 rounded-full flex items-center justify-center">
                                    {unreadCountForThisConv}
                                  </span>
                                )}

                                {/* Context interactions */}
                                <div className="hidden group-hover:flex items-center space-x-1 pt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      togglePin(conv.id);
                                    }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                    title="Pin Conversation"
                                  >
                                    <Pin className="h-2.5 w-2.5 text-slate-400" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleArchive(conv.id);
                                    }}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md"
                                    title="Archive Conversation"
                                  >
                                    <Archive className="h-2.5 w-2.5 text-slate-400" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right Chat center Screen panel */}
                  <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950/40 relative">
                    {activeConv ? (
                      <>
                        {/* Conversation Header */}
                        <div className="p-3 px-4 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between">
                          <div className="text-left flex items-center space-x-2.5">
                            <div className="h-7 w-7 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-black text-xs text-slate-800 dark:text-white">
                              {activeConv.isGroup ? '⭐' : activeConv.name?.charAt(0) || '👤'}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-900 dark:text-white leading-none">
                                {activeConv.isGroup ? activeConv.name : (employees.find(e => e.id === activeConv.participants.find(p => p !== currentUser.id))?.name || 'Private Chat')}
                              </h4>
                              
                              {/* Online state / typing indicator */}
                              <div className="flex items-center space-x-1 mt-0.5 leading-none">
                                {activeConv.isGroup ? (
                                  <span className="text-[8px] font-mono text-slate-400 uppercase font-semibold">
                                    {activeConv.participants.length} Active Compliance Guards
                                  </span>
                                ) : (
                                  <>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                      onlineUsers.includes(activeConv.participants.find(p => p !== currentUser.id) || '') ? 'bg-emerald-500 animate-pulse' : 'bg-slate-350'
                                    }`} />
                                    <span className="text-[8.5px] font-mono text-slate-400 uppercase font-bold">
                                      {onlineUsers.includes(activeConv.participants.find(p => p !== currentUser.id) || '') ? 'Active Online' : 'Corporate Offline'}
                                    </span>
                                  </>
                                )}

                                {/* Typing logs */}
                                {activeConv.participants.some(pId => pId !== currentUser.id && typingUsers[`${pId}:${activeConv.id}`]) && (
                                  <span className="text-[8.5px] text-emerald-600 font-bold animate-pulse pl-1 italic">
                                    (Teammate is typing...)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {/* AI smart summarizer widget toggler */}
                            <button
                              onClick={() => {
                                setShowRightDetails(!showRightDetails);
                                setQueryVal(`Read recent chats inside ${activeConv.name || 'this room'} and summarize compliance points`);
                              }}
                              className="px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-emerald-500/10 to-indigo-500/10 hover:from-emerald-500/20 hover:to-indigo-500/20 border border-emerald-500/20 text-indigo-650 dark:text-indigo-400 rounded-lg flex items-center space-x-1 transition-all cursor-pointer"
                              title="Query Gemini Assistant"
                            >
                              <Bot className="h-3 w-3 animate-spin duration-3000 shrink-0 text-emerald-500" />
                              <span>AI Briefing</span>
                            </button>

                            <button
                              onClick={() => setShowRightDetails(!showRightDetails)}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                              title="Conversation Details"
                            >
                              <Info className="h-4 w-4 text-slate-400" />
                            </button>
                          </div>
                        </div>

                        {/* Messages logs wrapper */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 p-y-2 scrollbar-thin">
                          {messages.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-450 p-6 space-y-1">
                              <MessageSquare className="h-8 w-8 text-slate-300 animate-pulse" />
                              <span className="text-xs font-bold text-slate-500">Secure Corporate Briefing Ready</span>
                              <span className="text-[9.5px] text-slate-400 italic">No historical conversations saved in local Sync desk yet.</span>
                            </div>
                          ) : (
                            messages.map((m) => {
                              const isSelf = m.senderId === currentUser.id;
                              
                              return (
                                <div
                                  key={m.id}
                                  className={`flex flex-col max-w-[85%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
                                >
                                  {/* Sender name if not self or if group */}
                                  {!isSelf && (
                                    <span className="text-[8.5px] font-bold text-slate-400 pb-0.5 pl-1 uppercase tracking-wider">{m.senderName}</span>
                                  )}

                                  <div className={`group relative p-2.5 px-3.5 rounded-2xl border text-left shadow-xs flex flex-col space-y-1 ${
                                    isSelf
                                      ? 'bg-emerald-600 border-emerald-600 text-white rounded-tr-none'
                                      : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-850 text-slate-900 dark:text-slate-100 rounded-tl-none'
                                  }`}>
                                    
                                    {/* Edit context form */}
                                    {editingMsgId === m.id ? (
                                      <div className="flex items-center space-x-2.5 min-w-44 py-1">
                                        <input
                                          type="text"
                                          value={editInput}
                                          onChange={(e) => setEditInput(e.target.value)}
                                          className="w-full text-xs p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-lg border-0 focus:ring-1 focus:ring-emerald-500 text-slate-800"
                                        />
                                        <button
                                          onClick={() => saveEdit(m.id)}
                                          className="text-emerald-300 text-xs font-black p-1 block cursor-pointer uppercase hover:text-white"
                                        >
                                          Save
                                        </button>
                                        <button
                                          onClick={() => setEditingMsgId(null)}
                                          className="text-rose-300 text-xs font-black p-1 block cursor-pointer uppercase hover:text-white"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <>
                                        {/* Highlight mentions formatted */}
                                        <p className="text-[11.5px] leading-relaxed font-semibold break-all">
                                          {m.text.split(' ').map((word, i) => {
                                            if (word.startsWith('@')) {
                                              return (
                                                <span key={i} className="text-indigo-400 bg-indigo-500/15 p-1 py-0 rounded-md font-bold mr-1 inline-block">
                                                  {word}
                                                </span>
                                              );
                                            }
                                            return word + ' ';
                                          })}
                                        </p>

                                        {/* Render PDF/Zip/Document Attachments */}
                                        {m.attachments && m.attachments.length > 0 && (
                                          <div className="pt-1 space-y-1 shrink-0">
                                            {m.attachments.map((att) => {
                                              const isVoice = att.type?.includes('audio') || att.name.includes('Voice Note');
                                              
                                              return (
                                                <div 
                                                  key={att.id}
                                                  className={`p-2 rounded-xl border flex flex-col space-y-1.5 ${
                                                    isSelf ? 'bg-black/10 border-white/10 text-white' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
                                                  }`}
                                                >
                                                  <div className="flex items-center space-x-2">
                                                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                                                    <div className="leading-tight overflow-hidden">
                                                      <span className="text-[10px] font-bold block truncate max-w-44 leading-tight">{att.name}</span>
                                                      <span className="text-[8px] font-mono text-slate-400 block block uppercase">
                                                        {(att.size / 1024).toFixed(1)} KB
                                                      </span>
                                                    </div>
                                                  </div>

                                                  {/* Interactive components based on attachment types */}
                                                  {isVoice ? (
                                                    <audio src={att.dataUrl} controls className="w-full h-8 max-w-48 outline-none mt-1" />
                                                  ) : att.type?.startsWith('image') || att.name.match(/\.(png|jpg|jpeg|gif)$/i) ? (
                                                    <img src={att.dataUrl} referrerPolicy="no-referrer" alt="Uploaded Thumbnail" className="rounded-lg max-h-24 max-w-44 object-cover mt-1 border" />
                                                  ) : (
                                                    <a
                                                      href={att.dataUrl}
                                                      download={att.name}
                                                      className="text-center py-1 mt-1 shrink-0 block text-[9.5px] uppercase font-black tracking-wider bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg transition-all decoration-none"
                                                    >
                                                      Download Document
                                                    </a>
                                                  )}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Action Hover options widget */}
                                    {isSelf && !m.deletedAt && (
                                      <div className="absolute right-0 top-0 -translate-y-5 flex items-center space-x-1.5 bg-slate-800 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <button
                                          onClick={() => keyEdit(m.id, m.text)}
                                          className="p-1 hover:bg-slate-700 rounded-md text-slate-100"
                                          title="Edit Message"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </button>
                                        <button
                                          onClick={() => keyDelete(m.id)}
                                          className="p-1 hover:bg-rose-500 rounded-md text-red-305"
                                          title="Delete Message"
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </button>
                                      </div>
                                    )}

                                    {/* Task converter trigger for Leaders/Admin on messages */}
                                    {(currentUser.role === 'admin' || currentUser.role === 'team_leader') && !m.deletedAt && !m.linkedTaskId && (
                                      <button
                                        onClick={() => requestTaskForm(m)}
                                        className="absolute -left-12 top-1.5 p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-indigo-500 hover:text-white rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                        title="Assign CRM Task from message"
                                      >
                                        <Clipboard className="h-3.5 w-3.5 text-indigo-600" />
                                      </button>
                                    )}

                                    {/* Visual Task marker if message converted to task */}
                                    {m.linkedTaskId && (
                                      <div className="pt-1 shrink-0">
                                        <span className="p-1 px-2 text-[8px] font-mono leading-none font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-400 rounded-md inline-block border border-indigo-500/20">
                                          📅 Formulated CRM Task
                                        </span>
                                      </div>
                                    )}

                                  </div>

                                  {/* Meta delivery receipts & timestamp */}
                                  <div className="flex items-center space-x-1 py-0.5 font-mono text-[8.5px] text-slate-400">
                                    <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {isSelf && (
                                      <span>
                                        {m.isReadBy.length > 1 ? (
                                          <CheckCheck className="h-3 w-3 text-emerald-500 inline-block" />
                                        ) : (
                                          <Check className="h-3 w-3 inline-block" />
                                        )}
                                      </span>
                                    )}
                                  </div>

                                </div>
                              );
                            })
                          )}
                          <div ref={chatBottomRef} />
                        </div>

                        {/* Mentions helper drop panel */}
                        {showMentionDropdown && (
                          <div className="absolute left-6 bottom-16 w-56 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden z-25 text-left p-2 space-y-1">
                            <span className="text-[8.5px] font-black uppercase text-slate-400 block pl-2 pb-1">Mention Teammate</span>
                            {employees
                              .filter(emp => emp.id !== currentUser.id && emp.name.toLowerCase().includes(mentionSearch))
                              .map(emp => (
                                <button
                                  key={emp.id}
                                  onClick={() => insertMention(emp)}
                                  className="w-full p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs flex items-center space-x-2"
                                >
                                  <span className="h-5 w-5 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-bold text-[9px]">
                                    {emp.name.charAt(0)}
                                  </span>
                                  <span className="font-extrabold text-slate-700 dark:text-slate-200">{emp.name}</span>
                                </button>
                              ))}
                          </div>
                        )}

                        {/* Typing / Attachment panel */}
                        <div className="bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-slate-850 p-3 px-4 flex items-center space-x-2 shadow-inner">
                          
                          {/* File input handler hidden wrapper */}
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white rounded-xl shrink-0 cursor-pointer transition-colors"
                            title="Attach Document Document"
                          >
                            <Paperclip className="h-4.5 w-4.5" />
                          </button>

                          {/* Interactive Text input */}
                          <input
                            type="text"
                            placeholder="Type a corporate discussion... Use @ to tag users"
                            value={messageInput}
                            onChange={handleInputChange}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                            className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
                          />

                          {/* Voice Recorder triggers */}
                          <button
                            onClick={triggerVoiceRecord}
                            className={`p-2 shrink-0 rounded-xl cursor-pointer transition-all ${
                              isRecording
                                ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                                : 'bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 text-slate-500 hover:text-rose-500'
                            }`}
                            title={isRecording ? `Recording (${formatSecs(voiceDuration)}). Tap to submit` : 'Record Voice Memo'}
                          >
                            {isRecording ? <Square className="h-4.5 w-4.5 font-bold" /> : <Mic className="h-4.5 w-4.5" />}
                          </button>

                          {/* Submit message key */}
                          <button
                            onClick={handleSendMessage}
                            disabled={!messageInput.trim()}
                            className="p-2 bg-emerald-650 disabled:bg-slate-300 dark:disabled:bg-slate-800 hover:bg-emerald-600 text-white rounded-xl shrink-0 cursor-pointer transition-colors"
                          >
                            <Send className="h-4.5 w-4.5" />
                          </button>

                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-4">
                        <MessageSquare className="h-10 w-10 text-slate-300 mr-2" />
                        <div>
                          <h4 className="font-extrabold text-sm text-slate-700 dark:text-slate-200 uppercase tracking-wider leading-none">Internal Workspace Connected</h4>
                          <span className="text-xs text-slate-400 block pt-1 font-semibold">Select a Department group or click any employee to start private discussion chat.</span>
                        </div>
                      </div>
                    )}

                    {/* Shared sidebar parameters (Slide Drawer Details) */}
                    {activeConv && showRightDetails && (
                      <div className="absolute right-0 top-0 bottom-0 w-64 md:w-72 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col z-20 text-left">
                        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-b border-slate-205 dark:border-slate-850 flex items-center justify-between">
                          <h4 className="font-black text-xs uppercase tracking-wide">Discussion Details</h4>
                          <button onClick={() => setShowRightDetails(false)}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin text-xs">
                          
                          {/* Room overview settings */}
                          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-2">
                            <span className="text-[9px] uppercase tracking-widest font-mono text-indigo-600 block">Workspace Scope</span>
                            <span className="font-extrabold text-[11.5px] block">{activeConv.name || 'Direct Collaboration'}</span>
                            <span className="text-slate-500 font-semibold text-[10.5px] leading-relaxed block">
                              {activeConv.description || 'Secure communication under corporate policy constraints.'}
                            </span>
                          </div>

                          {/* Member List */}
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase tracking-widest font-mono text-slate-405 block">Group members</span>
                            <div className="space-y-1 max-h-32 overflow-y-auto scrollbar-none">
                              {activeConv.participants.map(pId => {
                                const emp = employees.find(e => e.id === pId);
                                if (!emp) return null;
                                return (
                                  <div key={pId} className="flex items-center justify-between p-1 bg-slate-50/50 dark:bg-slate-950/20 px-2 rounded-lg">
                                    <span className="font-bold text-[10.5px]">{emp.name}</span>
                                    <span className="text-[8px] font-mono capitalize text-slate-400">{emp.role}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Files version list (Shared documents list) */}
                          <div className="space-y-1.5 pt-2">
                            <span className="text-[9px] uppercase tracking-widest font-mono text-slate-405 block">Media & Shared Files</span>
                            <div className="space-y-1 max-h-28 overflow-y-auto scrollbar-none">
                              {messages
                                .filter(m => m.attachments && m.attachments.length > 0)
                                .flatMap(m => m.attachments || [])
                                .map((att, i) => (
                                  <a
                                    key={i}
                                    href={att.dataUrl}
                                    download={att.name}
                                    className="p-2 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 h-10 rounded-xl flex items-center space-x-2 border transition-colors outline-none decoration-none truncate block"
                                  >
                                    <Paperclip className="h-3 w-3 text-amber-500 shrink-0" />
                                    <span className="text-[10px] font-bold block truncate shrink">{att.name}</span>
                                  </a>
                                ))}
                            </div>
                          </div>

                          {/* Gemini intelligent summarizing panel */}
                          <div className="bg-indigo-500/5 dark:bg-indigo-950/20 p-3 rounded-2xl border border-indigo-500/10 space-y-2">
                            <div className="flex items-center space-x-1">
                              <Sparkles className="h-3 w-3 text-indigo-500 animate-pulse" />
                              <span className="text-[9px] uppercase font-black text-indigo-400">Ask Gemini AI Summarizer</span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <input
                                type="text"
                                value={queryVal}
                                onChange={(e) => setQueryVal(e.target.value)}
                                placeholder="E.g. Summarize discussions..."
                                className="w-full text-[10px] p-1.5 bg-white dark:bg-slate-900 border text-slate-80s font-semibold rounded-lg focus:outline-none"
                              />
                              <button
                                onClick={queryGeminiAI}
                                disabled={aiLoading || !queryVal.trim()}
                                className="py-1.5 px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[9px] cursor-pointer"
                              >
                                {aiLoading ? '...' : 'Ask'}
                              </button>
                            </div>

                            {aiReply && (
                              <div className="p-2 bg-white dark:bg-slate-950 rounded-lg text-[9px] font-semibold leading-relaxed border leading-normal select-text">
                                {aiReply}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    )}

                  </div>
                </>
              )}

              {/* ==========================================
                  TAB 2: REGULATORY POLICY BULLETINS & ANNOUNCEMENTS
                  ========================================== */}
              {activeWidgetTab === 'announcements' && (
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950/40">
                  
                  {/* Left Bulletins list */}
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 text-left scrollbar-thin">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight">System Regulatory briefings</h4>
                        <span className="text-[10px] block text-slate-400 mt-0.5 font-semibold">Master Admin & Team Leader Released Announcements</span>
                      </div>
                      
                      {/* TLR/Admin releasing dialog trigger */}
                      {(currentUser.role === 'admin' || currentUser.role === 'team_leader') && (
                        <button
                          onClick={() => setShowPolicyBuilder(true)}
                          className="py-1.5 px-3 bg-slate-900 text-white rounded-xl text-[10px] items-center space-x-1 text-xs font-black flex cursor-pointer uppercase"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Release Bulletin</span>
                        </button>
                      )}
                    </div>

                    {announcements.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">No policy announcements logged.</div>
                    ) : (
                      announcements.map((ann) => {
                        const isAcknowledged = ann.seenBy.includes(currentUser.id);
                        
                        return (
                          <div
                            key={ann.id}
                            className={`p-4 rounded-3xl border text-left flex flex-col space-y-3 shadow-xs ${
                              isAcknowledged ? 'bg-white dark:bg-slate-900 border-slate-150' : 'bg-emerald-500/10 border-emerald-500/20'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <h5 className="font-extrabold text-xs text-slate-900 dark:text-white pb-0.5">{ann.title}</h5>
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest font-semibold block leading-none">
                                  Released By: {ann.senderName} • {new Date(ann.createdAt).toLocaleDateString()}
                                </span>
                              </div>

                              {isAcknowledged ? (
                                <span className="p-1 px-2.5 rounded-full bg-slate-200 text-slate-505 text-[8.5px] uppercase font-mono font-bold leading-none">
                                  Read & Acknowledged
                                </span>
                              ) : (
                                <button
                                  onClick={() => acknowledgePolicy(ann.id)}
                                  className="py-1 px-3 bg-emerald-600 hover:bg-emerald-550 text-white text-[9.5px] font-black uppercase tracking-wider rounded-lg cursor-pointer"
                                >
                                  Acknowledge ✓
                                </button>
                              )}
                            </div>

                            <p className="text-[11px] leading-relaxed text-slate-705 dark:text-slate-350 font-semibold">{ann.content}</p>

                            {/* Seen By tracker tracking roster */}
                            <div className="pt-2 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between text-[8px] font-mono uppercase tracking-wider text-slate-400">
                              <span>Acknowledge Log: Seen By {ann.seenBy.length} Guards</span>
                              <div>
                                {employees
                                  .filter(emp => ann.seenBy.includes(emp.id))
                                  .map(e => e.name.charAt(0))
                                  .join(', ')}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bulletin builder Pop Dialog */}
                  {showPolicyBuilder && (
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-30">
                      <motion.form
                        onSubmit={savePolicyBulletin}
                        className="w-full max-w-md bg-white dark:bg-slate-900 p-6 rounded-3xl border shadow-2xl flex flex-col space-y-4 text-left"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <div className="flex items-center justify-between pb-2 border-b">
                          <h4 className="font-black text-xs uppercase uppercase tracking-wider flex items-center space-x-1">
                            <Bell className="h-4 w-4 text-indigo-505" />
                            <span>Release Regulatory Bulletin</span>
                          </h4>
                          <button type="button" onClick={() => setShowPolicyBuilder(false)}>
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="space-y-1 text-xs">
                          <label className="font-bold text-slate-700 dark:text-slate-300">Policy Bulletin Title *</label>
                          <input
                            type="text"
                            required
                            placeholder="E.g. Sunday shift allocation parameters MCA guidelines"
                            value={policyTitle}
                            onChange={(e) => setPolicyTitle(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1 text-xs">
                          <label className="font-bold text-slate-705 dark:text-slate-300">Detailed policy alignment statements *</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="State rules..."
                            value={policyContent}
                            onChange={(e) => setPolicyContent(e.target.value)}
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                        >
                          Broadcast to all branches and desktop logs
                        </button>
                      </motion.form>
                    </div>
                  )}

                </div>
              )}

              {/* ==========================================
                  TAB 3: ACTIVE LINKED TASKS LISTINGS
                  ========================================== */}
              {activeWidgetTab === 'tasks' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 text-left bg-slate-50 dark:bg-slate-950/40 scrollbar-thin">
                  <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-black uppercase tracking-tight">Active Team Tasks Logs</h4>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Mapped directly from chat conversations to prevent detail slips.</span>
                  </div>

                  {chatTasks.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No linked discussions mapped to CRM roles yet.</div>
                  ) : (
                    <div className="space-y-2">
                      {chatTasks.map((t) => (
                        <div
                          key={t.id}
                          className="p-3 bg-white dark:bg-slate-900 border border-slate-150 rounded-2xl flex items-center justify-between text-left"
                        >
                          <div className="space-y-0.5 max-w-md">
                            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black block leading-none">
                              Task ID: {t.id}
                            </span>
                            <span className="font-extrabold text-xs text-slate-800 dark:text-white leading-tight block">{t.title}</span>
                            <span className="text-[9px] font-semibold text-slate-405 block block uppercase">
                              Assignee: {t.assignedToName} • Due-Date: {t.dueDate}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              toggleChatTaskStatus(t.id, currentUser.id);
                              reloadData();
                            }}
                            className={`py-1.5 px-3 rounded-lg text-[9px] font-black uppercase cursor-pointer ${
                              t.status === 'completed'
                                ? 'bg-emerald-500 text-white'
                                : 'bg-amber-500 text-white animate-pulse'
                            }`}
                          >
                            {t.status.toUpperCase()}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ==========================================
                  TAB 4: SYSTEM AUDIT LOGS FOR ADMINISTRATOR
                  ========================================== */}
              {activeWidgetTab === 'logs' && currentUser.role === 'admin' && (
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 text-left bg-slate-50 dark:bg-slate-950/40 scrollbar-thin">
                  <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-black uppercase tracking-tight">Collaborative Workspace Auditing</h4>
                    <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">Read-only live tamper audit tracks synchronized with Hostinger VPS.</span>
                  </div>

                  <div className="p-3 bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-xs">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 text-slate-450 text-[9px] uppercase tracking-widest border-b">
                          <th className="p-2 pl-3">Colleague</th>
                          <th className="p-2">Trigger</th>
                          <th className="p-2">Target</th>
                          <th className="p-2 pr-3">Summary Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-650 font-medium">
                        {auditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/25">
                            <td className="p-2 pl-3 font-extrabold text-slate-800 dark:text-white capitalize leading-tight">
                              {log.userName}
                            </td>
                            <td className="p-2">
                              <span className="p-1 text-[8px] font-mono leading-none bg-slate-100 rounded text-slate-505 font-bold uppercase">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-2 font-mono text-[9px] text-slate-400">{log.targetId}</td>
                            <td className="p-2 text-[10.5px] font-semibold">{log.details}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Formulate task pop overlay dialogue inside widgets */}
            {makingTaskForMsg && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[40]">
                <form
                  onSubmit={handleCreateTaskSubmit}
                  className="w-full max-w-sm bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 shadow-2xl flex flex-col space-y-4 text-left"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                    <h5 className="font-black text-xs uppercase uppercase tracking-wider flex items-center space-x-1">
                      <Clipboard className="h-4 w-4 text-indigo-505" />
                      <span>Formulate Compliance Task</span>
                    </h5>
                    <button type="button" onClick={() => setMakingTaskForMsg(null)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-xl text-[10px] text-slate-500 font-semibold italic border max-h-16 overflow-y-auto">
                    "{makingTaskForMsg.text}"
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-705 dark:text-slate-300">Formualted Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="GST files correction..."
                      value={taskTitle}
                      onChange={(e) => setTaskTitle(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-705 dark:text-slate-300">Assign Duty Guard *</label>
                    <select
                      required
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                    >
                      <option value="">Choose Employee...</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.department || 'N/A'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 text-xs">
                    <label className="font-bold text-slate-705 dark:text-slate-300">Target Due Date *</label>
                    <input
                      type="date"
                      required
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer font-sans"
                  >
                    Formulate and issue to Employee
                  </button>
                </form>
              </div>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Floating HUD-style screen notifications overlay */}
      <div className="fixed top-6 right-6 z-[99999] max-w-sm w-[90vw] space-y-3 pointer-events-none">
        <AnimatePresence>
          {chatToasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 50, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.9, transition: { duration: 0.2 } }}
              className="bg-white dark:bg-slate-900 border border-emerald-500/35 dark:border-emerald-600/35 rounded-2xl shadow-2xl p-4 flex gap-3 pointer-events-auto cursor-pointer hover:shadow-emerald-500/10 hover:border-emerald-500/60 transition-all duration-300 relative overflow-hidden group"
              onClick={() => {
                // Direct jump to conversation thread!
                const targetConv = conversations.find(c => c.id === toast.conversationId);
                if (targetConv) {
                  setIsOpen(true);
                  setActiveWidgetTab('chats');
                  setActiveConv(targetConv);
                  setMessages(getMessages(targetConv.id));
                  markMessagesAsRead(targetConv.id, currentUser.id);
                }
                // Clear this toast
                setChatToasts((prev) => prev.filter((t) => t.id !== toast.id));
              }}
            >
              {/* Visual Accent Border */}
              <span className="absolute left-0 top-0 bottom-0 w-1.25 bg-emerald-500" />
              
              <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 rounded-xl max-h-10 self-start flex-shrink-0 flex items-center justify-center">
                <MessageSquare className="h-5 w-5 shrink-0" />
              </div>
              
              <div className="flex-1 min-w-0 pr-4">
                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-450 uppercase tracking-widest block pb-0.5">NEW CHAT MESSAGE</span>
                <h4 className="font-extrabold text-[12px] text-slate-900 dark:text-white truncate uppercase">{toast.senderName}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-snug">{toast.text}</p>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setChatToasts((prev) => prev.filter((t) => t.id !== toast.id));
                }}
                className="absolute right-3 top-3 p-1 text-slate-400 dark:text-slate-600 hover:text-rose-500 rounded-md transition-colors"
                title="Dismiss alert"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

    </div>
  );
}
