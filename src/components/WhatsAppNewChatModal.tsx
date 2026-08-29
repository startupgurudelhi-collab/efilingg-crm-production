import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  MessageSquare,
  Sparkles,
  Phone,
  User,
  Building,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Search,
  Layers,
} from 'lucide-react';
import { STANDARD_WHATSAPP_TEMPLATES } from '../lib/block1/whatsappTemplates';
import { getEmployees, getLeads } from '../lib/db';
import { getV2GstClients, getV2McaClients, getV2ItrClients } from '../lib/v2_db';

interface WhatsAppNewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatStarted: (conversationId: string) => void;
  currentUserId: string;
  currentUserName: string;
  initialPhone?: string;
  initialName?: string;
}

export default function WhatsAppNewChatModal({
  isOpen,
  onClose,
  onChatStarted,
  currentUserId,
  currentUserName,
  initialPhone = '',
  initialName = '',
}: WhatsAppNewChatModalProps) {
  const [activeMode, setActiveMode] = useState<'TEMPLATE' | 'DIRECT_TEXT'>('TEMPLATE');
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState(initialName);
  const [companyName, setCompanyName] = useState('');
  const [serviceCategory, setServiceCategory] = useState('General Consultation');

  // Contact quick-select search
  const [contactSearch, setContactSearch] = useState('');
  const [isSearchingContacts, setIsSearchingContacts] = useState(false);

  // Template State
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('hello_world');
  const [templateParams, setTemplateParams] = useState<Record<string, string>>({
    '1': '',
    '2': '',
    '3': '',
  });

  // Direct Text State
  const [directMessageText, setDirectMessageText] = useState('');

  // Status State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Pre-fill fields when modal opens with initial values
  useEffect(() => {
    if (isOpen) {
      if (initialPhone) setPhone(initialPhone);
      if (initialName) {
        setName(initialName);
        setTemplateParams((prev) => ({ ...prev, '1': initialName }));
      }
      setErrorMessage(null);
      setSuccessInfo(null);
    }
  }, [isOpen, initialPhone, initialName]);

  // Selected template object
  const selectedTemplate = STANDARD_WHATSAPP_TEMPLATES.find((t) => t.name === selectedTemplateName);

  // Available existing directory contacts
  const existingContacts = React.useMemo(() => {
    const list: Array<{ name: string; phone: string; type: 'EMPLOYEE' | 'CUSTOMER' | 'LEAD'; meta?: string }> = [];

    // Employees
    try {
      const emps = getEmployees();
      emps.forEach((e) => {
        if (e.mobile) list.push({ name: e.name, phone: e.mobile, type: 'EMPLOYEE', meta: e.designation || 'Staff' });
      });
    } catch {}

    // Clients / Customers
    try {
      const gstClients = getV2GstClients();
      gstClients.forEach((c: any) => {
        if (c.mobileNumber || c.phone) {
          list.push({
            name: c.clientName || c.tradeName,
            phone: c.mobileNumber || c.phone,
            type: 'CUSTOMER',
            meta: `GST Client (${c.state || 'Active'})`,
          });
        }
      });

      const mcaClients = getV2McaClients();
      mcaClients.forEach((c: any) => {
        if (c.contactMobile || c.mobile || c.phone) {
          list.push({
            name: c.companyName,
            phone: c.contactMobile || c.mobile || c.phone,
            type: 'CUSTOMER',
            meta: `MCA / ROC (${c.companyType || 'Corporate'})`,
          });
        }
      });
    } catch {}

    // Leads
    try {
      const leads = getLeads();
      leads.forEach((l) => {
        if (l.mobile) {
          list.push({
            name: l.customerName || l.businessName || 'Inquiry Lead',
            phone: l.mobile,
            type: 'LEAD',
            meta: l.serviceRequired || 'Lead Prospect',
          });
        }
      });
    } catch {}

    return list;
  }, []);

  const filteredContacts = React.useMemo(() => {
    if (!contactSearch.trim()) return [];
    const q = contactSearch.toLowerCase();
    return existingContacts.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.meta && c.meta.toLowerCase().includes(q))
    ).slice(0, 6);
  }, [existingContacts, contactSearch]);

  if (!isOpen) return null;

  // Build real-time preview of the template text
  const previewTemplateBody = () => {
    if (!selectedTemplate) return directMessageText || 'No message content entered.';
    let text = selectedTemplate.bodyText;
    if (templateParams['1']) text = text.replace(/\{\{1\}\}/g, templateParams['1']);
    if (templateParams['2']) text = text.replace(/\{\{2\}\}/g, templateParams['2']);
    if (templateParams['3']) text = text.replace(/\{\{3\}\}/g, templateParams['3']);
    return text;
  };

  const handleSelectContact = (c: { name: string; phone: string; meta?: string }) => {
    setName(c.name);
    setPhone(c.phone);
    if (c.meta) setCompanyName(c.meta);
    setTemplateParams((prev) => ({ ...prev, '1': c.name }));
    setIsSearchingContacts(false);
    setContactSearch('');
  };

  const handleStartChatAndSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Build template components if template mode is selected
      let templateComponents: any[] = [];
      if (activeMode === 'TEMPLATE' && selectedTemplate && selectedTemplate.parameterCount > 0) {
        const paramsArray = [];
        for (let i = 1; i <= selectedTemplate.parameterCount; i++) {
          const val = templateParams[String(i)] || selectedTemplate.sampleParameters[i - 1] || 'Valued User';
          paramsArray.push({ type: 'text', text: val });
        }
        templateComponents = [
          {
            type: 'body',
            parameters: paramsArray,
          },
        ];
      }

      const res = await fetch('/api/v2/conversations/start-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: name.trim() || `WhatsApp User (+${cleanPhone})`,
          companyName: companyName.trim() || undefined,
          serviceCategory,
          senderId: currentUserId || 'EMP-ADMIN',
          senderName: currentUserName || 'Sales Executive',
          messageType: activeMode,
          initialMessage: activeMode === 'DIRECT_TEXT' ? directMessageText : undefined,
          templateName: activeMode === 'TEMPLATE' ? selectedTemplateName : undefined,
          templateLanguage: activeMode === 'TEMPLATE' ? selectedTemplate?.language || 'en_US' : undefined,
          templateComponents: activeMode === 'TEMPLATE' ? templateComponents : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const errMsg = data.error || 'Failed to start WhatsApp conversation.';
        if (errMsg.includes('131047') || errMsg.includes('24-hour')) {
          setErrorMessage(
            '⚠️ Meta 24-Hour Policy: Direct message cannot be sent because contact has not replied recently. Please switch to "Approved Template Message" mode above.'
          );
          setActiveMode('TEMPLATE');
        } else {
          setErrorMessage(errMsg);
        }
        setIsSubmitting(false);
        return;
      }

      setSuccessInfo('WhatsApp conversation initiated successfully! Opening chat in inbox...');
      setTimeout(() => {
        onChatStarted(data.conversation.id);
        onClose();
      }, 750);
    } catch (err: any) {
      console.error('Error starting conversation:', err);
      setErrorMessage(err.message || 'Network error starting conversation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-[#00a884]/20 border border-[#00a884]/30 text-[#00a884] flex items-center justify-center">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Start New WhatsApp Chat</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-normal">
                  Meta Cloud API
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Initiate a fresh conversation or send an approved Meta template message
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleStartChatAndSend} className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Mode Switch Tabs */}
          <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveMode('TEMPLATE')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'TEMPLATE'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Approved Template (Recommended)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('DIRECT_TEXT')}
              className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'DIRECT_TEXT'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Direct Text (24h Active Only)</span>
            </button>
          </div>

          {/* Meta Policy Notice */}
          <div className="text-[11px] p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-400 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>
              {activeMode === 'TEMPLATE' ? (
                <>
                  <strong className="text-emerald-300">Guaranteed Delivery:</strong> Pre-approved Meta templates can be
                  sent to <em>any</em> WhatsApp phone number at any time to open or restart the 24-hour customer service window.
                </>
              ) : (
                <>
                  <strong className="text-amber-400">24-Hour Policy Notice:</strong> Free-form text messages will only be delivered if the recipient has messaged your WhatsApp business number within the last 24 hours.
                </>
              )}
            </span>
          </div>

          {/* Recipient Details Section */}
          <div className="space-y-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-emerald-400" />
                <span>Recipient Mobile & Details</span>
              </label>

              {/* Quick directory search toggle */}
              <div className="relative">
                <div className="flex items-center space-x-1">
                  <Search className="h-3 w-3 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search directory..."
                    value={contactSearch}
                    onChange={(e) => {
                      setContactSearch(e.target.value);
                      setIsSearchingContacts(true);
                    }}
                    className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-0.5 text-[10.5px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {isSearchingContacts && filteredContacts.length > 0 && (
                  <div className="absolute right-0 top-7 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-slate-800">
                    {filteredContacts.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectContact(c)}
                        className="w-full text-left p-2 hover:bg-slate-800 transition-colors flex items-center justify-between text-xs cursor-pointer"
                      >
                        <div>
                          <div className="font-bold text-slate-200">{c.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">+{c.phone}</div>
                        </div>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono">
                          {c.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10.5px] text-slate-400 mb-1 block">
                  Mobile Number <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">+91</span>
                  <input
                    type="text"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10.5px] text-slate-400 mb-1 block">Contact Name</label>
                <input
                  type="text"
                  placeholder="e.g., Rajesh Sharma"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setTemplateParams((prev) => ({ ...prev, '1': e.target.value }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-slate-400 mb-1 block">Company / Business (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Apex Legal LLP"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10.5px] text-slate-400 mb-1 block">Service Category</label>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="General Consultation">General Consultation</option>
                  <option value="GST Registration & Filing">GST Registration & Filing</option>
                  <option value="Income Tax Return (ITR)">Income Tax Return (ITR)</option>
                  <option value="Company Incorporation">Company Incorporation</option>
                  <option value="Trademark Registration">Trademark Registration</option>
                  <option value="Audit & Compliance">Audit & Compliance</option>
                </select>
              </div>
            </div>
          </div>

          {/* Template Configuration */}
          {activeMode === 'TEMPLATE' ? (
            <div className="space-y-3 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                <span>Select Approved WhatsApp Template</span>
              </label>

              {/* Template Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STANDARD_WHATSAPP_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.name}
                    type="button"
                    onClick={() => setSelectedTemplateName(tmpl.name)}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                      selectedTemplateName === tmpl.name
                        ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-200 font-mono">{tmpl.name}</span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
                            tmpl.category === 'UTILITY'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}
                        >
                          {tmpl.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">{tmpl.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              {/* Dynamic Parameter Inputs for Selected Template */}
              {selectedTemplate && selectedTemplate.parameterCount > 0 && (
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 mt-2">
                  <div className="text-[10.5px] font-bold text-slate-300 flex items-center gap-1">
                    <span>Template Variables:</span>
                    <span className="text-[9.5px] text-slate-500">
                      (Fill parameters mapped to &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;, etc.)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {Array.from({ length: selectedTemplate.parameterCount }, (_, i) => {
                      const paramIndex = String(i + 1);
                      const sample = selectedTemplate.sampleParameters[i] || `Value ${paramIndex}`;
                      return (
                        <div key={paramIndex}>
                          <label className="text-[10px] text-slate-400 block mb-0.5">
                            Variable &#123;&#123;{paramIndex}&#125;&#125;
                          </label>
                          <input
                            type="text"
                            placeholder={sample}
                            value={templateParams[paramIndex] || ''}
                            onChange={(e) =>
                              setTemplateParams((prev) => ({
                                ...prev,
                                [paramIndex]: e.target.value,
                              }))
                            }
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-medium"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* WhatsApp Chat Bubble Preview */}
              <div className="mt-3">
                <div className="text-[10.5px] font-bold text-slate-400 mb-1 flex items-center justify-between">
                  <span>WhatsApp Message Preview:</span>
                  <span className="text-[9.5px] text-emerald-400 font-mono">Template: {selectedTemplateName}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#efeae2] border border-slate-300 shadow-inner">
                  <div className="max-w-[85%] bg-white rounded-xl rounded-tl-none p-3 shadow-xs text-xs text-slate-900 relative">
                    <p className="whitespace-pre-wrap leading-relaxed">{previewTemplateBody()}</p>
                    <div className="mt-1.5 flex items-center justify-end space-x-1 text-[9px] text-slate-400">
                      <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Direct Session Text Input */
            <div className="space-y-2 bg-slate-950/50 p-3.5 rounded-xl border border-slate-800/80">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Send className="h-3.5 w-3.5 text-emerald-400" />
                <span>Direct WhatsApp Message Body</span>
              </label>

              <textarea
                rows={4}
                required={activeMode === 'DIRECT_TEXT'}
                placeholder="Type the message to send to this contact..."
                value={directMessageText}
                onChange={(e) => setDirectMessageText(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Feedback & Errors */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-tight">{errorMessage}</div>
            </div>
          )}

          {successInfo && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
              <div>{successInfo}</div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end space-x-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#00a884] hover:bg-[#008f70] transition-all cursor-pointer flex items-center space-x-2 shadow-lg disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{isSubmitting ? 'Dispatching via Meta Cloud API...' : 'Start Chat & Send'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
