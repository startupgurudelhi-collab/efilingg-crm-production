/**
 * AI Sales Agent - Module 4: FAQ Training
 * Efilingg CRM
 */

import React, { useState, useEffect } from 'react';
import { AiFaq, AiService } from '../../types/aiAgent';
import { AiAgentRepository } from '../../lib/aiAgent/db';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Briefcase,
  X,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

interface AiAgentFaqTrainingProps {
  currentUserId?: string;
  currentUserName?: string;
  onRefresh?: () => void;
}

export default function AiAgentFaqTraining({
  currentUserId = 'EMP-ADMIN',
  currentUserName = 'Master Admin',
  onRefresh,
}: AiAgentFaqTrainingProps) {
  const [faqs, setFaqs] = useState<AiFaq[]>([]);
  const [services, setServices] = useState<AiService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<AiFaq | null>(null);

  // Form Fields
  const [serviceId, setServiceId] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const loadData = () => {
    setFaqs(AiAgentRepository.getFaqs());
    setServices(AiAgentRepository.getServices());
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setEditingFaq(null);
    setServiceId(services.length > 0 ? services[0].id : '');
    setQuestion('');
    setAnswer('');
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (faq: AiFaq) => {
    setEditingFaq(faq);
    setServiceId(faq.service_id);
    setQuestion(faq.question);
    setAnswer(faq.answer);
    setIsActive(faq.active);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveFaq = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceId) {
      setFormError('Please select a service for this FAQ.');
      return;
    }
    if (!question.trim() || !answer.trim()) {
      setFormError('Question and Answer cannot be empty.');
      return;
    }

    if (editingFaq) {
      AiAgentRepository.updateFaq(
        editingFaq.id,
        {
          service_id: serviceId,
          question: question.trim(),
          answer: answer.trim(),
          active: isActive,
        },
        currentUserId,
        currentUserName
      );
    } else {
      AiAgentRepository.addFaq(
        {
          service_id: serviceId,
          question: question.trim(),
          answer: answer.trim(),
          active: isActive,
        },
        currentUserId,
        currentUserName
      );
    }

    setIsModalOpen(false);
    loadData();
    if (onRefresh) onRefresh();
  };

  const handleToggleActive = (faq: AiFaq) => {
    AiAgentRepository.updateFaq(
      faq.id,
      { active: !faq.active },
      currentUserId,
      currentUserName
    );
    loadData();
    if (onRefresh) onRefresh();
  };

  const handleDelete = (faq: AiFaq) => {
    if (confirm('Are you sure you want to delete this FAQ training item?')) {
      AiAgentRepository.deleteFaq(faq.id, currentUserId, currentUserName);
      loadData();
      if (onRefresh) onRefresh();
    }
  };

  const getServiceName = (id: string) => {
    const found = services.find((s) => s.id === id);
    return found ? found.service_name : id;
  };

  const filteredFaqs = faqs.filter((f) => {
    const matchesSearch =
      f.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesService =
      selectedServiceFilter === 'ALL' || f.service_id === selectedServiceFilter;
    return matchesSearch && matchesService;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <HelpCircle className="h-4 w-4 text-indigo-500" />
            <span>AI FAQ Training Module</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Train the AI agent with specific customer questions and official company answers.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-2 cursor-pointer transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add New FAQ</span>
        </button>
      </div>

      {/* Search & Service Filter Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search questions or answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <Filter className="h-4 w-4 text-slate-400 hidden sm:inline" />
          <span className="text-xs text-slate-400 font-bold hidden sm:inline">Filter by Service:</span>
          <select
            value={selectedServiceFilter}
            onChange={(e) => setSelectedServiceFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">All Services ({faqs.length})</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.service_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* FAQ Grid */}
      {filteredFaqs.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 text-xs">
          No trained FAQs found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:border-indigo-500/40 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
                    {getServiceName(faq.service_id)}
                  </span>
                  <button
                    onClick={() => handleToggleActive(faq)}
                    className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold flex items-center space-x-1 cursor-pointer transition-all ${
                      faq.active
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                    }`}
                  >
                    {faq.active ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    <span>{faq.active ? 'TRAINED & ACTIVE' : 'DISABLED'}</span>
                  </button>
                </div>

                <div className="text-sm font-extrabold text-slate-900 dark:text-white flex items-start space-x-2 pt-1">
                  <span className="text-indigo-500 font-black">Q:</span>
                  <span>{faq.question}</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed flex items-start space-x-2">
                  <span className="text-emerald-600 font-bold">A:</span>
                  <span>{faq.answer}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-1">
                <button
                  onClick={() => openEditModal(faq)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                  title="Edit FAQ"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(faq)}
                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-colors cursor-pointer"
                  title="Delete FAQ"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit FAQ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <HelpCircle className="h-4.5 w-4.5 text-indigo-500" />
                <span>{editingFaq ? 'Edit FAQ Training Item' : 'Add FAQ Training Item'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveFaq} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Service Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Associated Knowledge Base Service <span className="text-rose-500">*</span>
                </label>
                <select
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="" disabled>Select Service...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.service_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Question */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Customer Question <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Is GST registration mandatory for online sellers?"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Answer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  AI Trained Answer <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Exact official answer the AI agent should reply with..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Active Training Status
                </span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    isActive ? 'bg-indigo-600 text-white' : 'bg-slate-300 text-slate-700'
                  }`}
                >
                  {isActive ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  {editingFaq ? 'Update FAQ' : 'Train FAQ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
