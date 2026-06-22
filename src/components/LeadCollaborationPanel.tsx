/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  getLeadConversation, 
  getMessages, 
  addMessage, 
  editMessage, 
  deleteMessage,
  markMessagesAsRead
} from '../lib/chatDb';
import { getEmployees } from '../lib/db';
import { ChatMessage, ChatConversation, ChatAttachment } from '../types/chat';
import { Send, Paperclip, MessageSquare, Edit, Trash2, Check, CheckCheck, Trash } from 'lucide-react';

interface LeadCollaborationPanelProps {
  leadId: string;
  customerName: string;
  currentUserId: string;
}

export default function LeadCollaborationPanel({ leadId, customerName, currentUserId }: LeadCollaborationPanelProps) {
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  
  const employees = getEmployees();
  const currentUser = employees.find(e => e.id === currentUserId);
  const currentUserName = currentUser?.name || 'Teammate';
  
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load and refresh messages block
  const handleLoad = () => {
    const conv = getLeadConversation(leadId, customerName, currentUserId);
    setConversation(conv);
    
    const list = getMessages(conv.id);
    setMessages(list);
    markMessagesAsRead(conv.id, currentUserId);
  };

  useEffect(() => {
    handleLoad();
    
    // Auto sync refresh polling rate
    const interval = setInterval(() => {
      handleLoad();
    }, 4000);

    return () => clearInterval(interval);
  }, [leadId]);

  // Scroll downwards helper
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!messageInput.trim() || !conversation) return;

    const newMsg = addMessage(
      conversation.id,
      currentUserId,
      currentUserName,
      messageInput,
      [],
      []
    );

    setMessages(prev => [...prev, newMsg]);
    setMessageInput('');
    handleLoad();
  };

  // Attach Document
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !conversation) return;

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
            conversation.id,
            currentUserId,
            currentUserName,
            `📎 Attached Resource: ${file.name}`,
            [attachment],
            []
          );

          setMessages(prev => [...prev, newMsg]);
          handleLoad();
        }
      } catch (err) {
        console.error('Document upload failure:', err);
        alert('Could not upload attached file.');
      }
    };
  };

  // Inline modifications
  const saveEditValue = (msgId: string) => {
    if (!editInput.trim()) return;
    const ok = editMessage(msgId, currentUserId, editInput);
    if (ok) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: editInput, editedAt: new Date().toISOString() } : m));
      setEditingMsgId(null);
      setEditInput('');
    }
  };

  const deleteMsgValue = (msgId: string) => {
    const ok = deleteMessage(msgId, currentUserId);
    if (ok) {
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, text: '⚠️ This message was deleted.', deletedAt: new Date().toISOString(), attachments: [] } : m));
    }
  };

  return (
    <div className="flex-1 flex flex-col h-[400px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden font-sans">
      
      {/* Collaboration Scope Head Info */}
      <div className="p-3 bg-white dark:bg-slate-900 border-b border-slate-150 dark:border-slate-850 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="h-6 w-6 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center font-black text-[10px] text-slate-800">
            💬
          </div>
          <div>
            <h5 className="font-extrabold text-[11px] text-slate-900 dark:text-white leading-none">
              Dedicated Team Briefing
            </h5>
            <span className="text-[8.5px] font-mono text-slate-400 block block uppercase mt-0.5 font-bold">
              Discussing: {customerName} • Lead #{leadId}
            </span>
          </div>
        </div>
        <span className="p-1 px-2.5 rounded-full bg-indigo-500/10 text-indigo-505 dark:text-indigo-400 text-[8.5px] uppercase font-mono font-bold leading-none border border-indigo-500/15">
          Sync Connected
        </span>
      </div>

      {/* Discussion List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 p-y-2 scrollbar-thin text-left">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 p-6 space-y-1.5">
            <MessageSquare className="h-7 w-7 text-slate-300 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Briefing Chamber Empty</span>
            <span className="text-[9px] text-slate-400 block text-center max-w-xs">
              Align with Sales, compliance agents or accounts desk. State follow-up instructions here.
            </span>
          </div>
        ) : (
          messages.map((m) => {
            const isSelf = m.senderId === currentUserId;
            
            return (
              <div
                key={m.id}
                className={`flex flex-col max-w-[85%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                {!isSelf && (
                  <span className="text-[8px] font-bold text-slate-400 pb-0.5 pl-1 uppercase tracking-wider">
                    {m.senderName}
                  </span>
                )}

                <div className={`group relative p-2.5 px-3 rounded-2xl border text-left flex flex-col space-y-1 ${
                  isSelf
                    ? 'bg-slate-900 border-slate-900 text-white rounded-tr-none'
                    : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-850 text-slate-900 dark:text-slate-100 rounded-tl-none'
                }`}>
                  
                  {editingMsgId === m.id ? (
                    <div className="flex items-center space-x-2 min-w-44 py-1">
                      <input
                        type="text"
                        value={editInput}
                        onChange={(e) => setEditInput(e.target.value)}
                        className="w-full text-[10.5px] p-1 bg-slate-100 dark:bg-slate-850 text-slate-900 dark:text-white rounded-lg border-0 text-slate-800 focus:ring-1"
                      />
                      <button
                        onClick={() => saveEditValue(m.id)}
                        className="text-emerald-300 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setEditingMsgId(null)}
                        className="text-rose-300 text-[10px] font-bold uppercase cursor-pointer"
                      >
                        Esc
                      </button>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10.5px] font-medium leading-relaxed break-all">
                        {m.text}
                      </p>

                      {/* Display attachments */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="pt-1 space-y-1">
                          {m.attachments.map((att) => (
                            <div 
                              key={att.id}
                              className={`p-1.5 rounded-lg border text-[9px] flex items-center justify-between space-x-2 ${
                                isSelf ? 'bg-black/10 border-white/5' : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white'
                              }`}
                            >
                              <span className="truncate max-w-28 block font-bold">{att.name}</span>
                              <a
                                href={att.dataUrl}
                                download={att.name}
                                className="px-1.5 py-0.5 bg-indigo-500 text-white font-bold rounded hover:bg-indigo-650 decoration-none"
                              >
                                Get
                              </a>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}

                  {/* Self-only modify triggers on hover */}
                  {isSelf && !m.deletedAt && (
                    <div className="absolute right-0 top-0 -translate-y-4 flex items-center space-x-1.5 bg-slate-800 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 scale-90">
                      <button
                        onClick={() => {
                          setEditingMsgId(m.id);
                          setEditInput(m.text);
                        }}
                        className="p-1 hover:bg-slate-700 rounded text-slate-100"
                        title="Edit Message"
                      >
                        <Edit className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => deleteMsgValue(m.id)}
                        className="p-1 hover:bg-rose-500 rounded text-red-305"
                        title="Delete Message"
                      >
                        <Trash className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  )}

                </div>

                {/* Date delivery receipt */}
                <div className="flex items-center space-x-1 py-0.5 font-mono text-[8.5px] text-slate-400">
                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {isSelf && (
                    <span>
                      {m.isReadBy.length > 1 ? (
                        <CheckCheck className="h-2.5 w-2.5 text-emerald-500 inline-block" />
                      ) : (
                        <Check className="h-2.5 w-2.5 inline-block" />
                      )}
                    </span>
                  )}
                </div>

              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      {/* Inputs box */}
      <div className="bg-white dark:bg-slate-900 border-t border-slate-150 p-2.5 flex items-center space-x-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg cursor-pointer transition"
          title="Share attachment document"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <input
          type="text"
          placeholder="Brief instructions to staff..."
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          className="flex-1 p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
        />

        <button
          onClick={handleSendMessage}
          disabled={!messageInput.trim()}
          className="p-1.5 bg-slate-900 disabled:bg-slate-300 dark:disabled:bg-slate-800 hover:bg-slate-850 text-white rounded-lg cursor-pointer transition"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

    </div>
  );
}
