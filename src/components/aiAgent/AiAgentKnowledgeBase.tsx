/**
 * AI Sales Agent - Module 3: Knowledge Base (Services Management)
 * Efilingg CRM
 */

import React, { useState, useEffect } from 'react';
import { AiService } from '../../types/aiAgent';
import { AiAgentRepository } from '../../lib/aiAgent/db';
import {
  Briefcase,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Check,
  X,
  FileText,
  Tag,
  DollarSign,
  Clock,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface AiAgentKnowledgeBaseProps {
  currentUserId?: string;
  currentUserName?: string;
  onRefresh?: () => void;
}

export default function AiAgentKnowledgeBase({
  currentUserId = 'EMP-ADMIN',
  currentUserName = 'Master Admin',
  onRefresh,
}: AiAgentKnowledgeBaseProps) {
  const [services, setServices] = useState<AiService[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<AiService | null>(null);

  // Form Fields
  const [serviceName, setServiceName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<string | number>('');
  const [timeline, setTimeline] = useState('');
  const [reqDocsInput, setReqDocsInput] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  const loadServices = () => {
    const list = AiAgentRepository.getServices();
    setServices(list);
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openAddModal = () => {
    setEditingService(null);
    setServiceName('');
    setDescription('');
    setPrice('');
    setTimeline('');
    setReqDocsInput('');
    setIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (service: AiService) => {
    setEditingService(service);
    setServiceName(service.service_name);
    setDescription(service.description);
    setPrice(service.price);
    setTimeline(service.timeline);
    const docs = Array.isArray(service.required_documents)
      ? service.required_documents.join(', ')
      : service.required_documents || '';
    setReqDocsInput(docs);
    setIsActive(service.active);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSaveService = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim()) {
      setFormError('Service Name is required.');
      return;
    }

    const docsArray = reqDocsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingService) {
      AiAgentRepository.updateService(
        editingService.id,
        {
          service_name: serviceName.trim(),
          description: description.trim(),
          price: price ? Number(price) || price : 0,
          timeline: timeline.trim(),
          required_documents: docsArray,
          active: isActive,
        },
        currentUserId,
        currentUserName
      );
    } else {
      AiAgentRepository.addService(
        {
          service_name: serviceName.trim(),
          description: description.trim(),
          price: price ? Number(price) || price : 0,
          timeline: timeline.trim(),
          required_documents: docsArray,
          active: isActive,
        },
        currentUserId,
        currentUserName
      );
    }

    setIsModalOpen(false);
    loadServices();
    if (onRefresh) onRefresh();
  };

  const handleToggleActive = (service: AiService) => {
    AiAgentRepository.updateService(
      service.id,
      { active: !service.active },
      currentUserId,
      currentUserName
    );
    loadServices();
    if (onRefresh) onRefresh();
  };

  const handleDelete = (service: AiService) => {
    if (confirm(`Are you sure you want to delete service "${service.service_name}"?`)) {
      AiAgentRepository.deleteService(service.id, currentUserId, currentUserName);
      loadServices();
      if (onRefresh) onRefresh();
    }
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filterActive === 'ALL' || (filterActive === 'ACTIVE' ? s.active : !s.active);
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
            <Briefcase className="h-4 w-4 text-emerald-500" />
            <span>AI Knowledge Base (Services & Pricing)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Services trained in AI Agent knowledge base for WhatsApp automated customer consultation.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center space-x-2 cursor-pointer transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Add New Service</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search service name or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <span className="text-xs text-slate-400 font-bold hidden sm:inline">Filter Status:</span>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterActive(mode)}
                className={`px-3 py-1 rounded-lg text-[10.5px] font-bold uppercase transition-all cursor-pointer ${
                  filterActive === mode
                    ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Services Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredServices.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No services found matching your criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3.5 px-4">Service Name & Description</th>
                  <th className="py-3.5 px-4">Standard Price</th>
                  <th className="py-3.5 px-4">Timeline</th>
                  <th className="py-3.5 px-4">Required Documents</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {filteredServices.map((service) => {
                  const docs = Array.isArray(service.required_documents)
                    ? service.required_documents
                    : String(service.required_documents || '').split(',');

                  return (
                    <tr key={service.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Name & Desc */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-extrabold text-slate-900 dark:text-white text-sm">
                          {service.service_name}
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 mt-0.5">
                          {service.description || 'No description provided.'}
                        </p>
                      </td>

                      {/* Price */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                        {typeof service.price === 'number' ? `₹${service.price.toLocaleString('en-IN')}` : service.price || 'Free / Quote'}
                      </td>

                      {/* Timeline */}
                      <td className="py-4 px-4 text-slate-600 dark:text-slate-300">
                        <div className="flex items-center space-x-1 font-semibold text-xs">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>{service.timeline || 'N/A'}</span>
                        </div>
                      </td>

                      {/* Required Documents */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {docs.length === 0 || (docs.length === 1 && !docs[0]) ? (
                            <span className="text-slate-400 italic">None required</span>
                          ) : (
                            docs.map((doc, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-semibold"
                              >
                                {doc}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Active Status Toggle */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleToggleActive(service)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold flex items-center space-x-1 cursor-pointer transition-all ${
                            service.active
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 hover:bg-rose-500/20'
                          }`}
                        >
                          {service.active ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              <span>ACTIVE</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              <span>INACTIVE</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right space-x-1">
                        <button
                          onClick={() => openEditModal(service)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title="Edit Service"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(service)}
                          className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 transition-colors cursor-pointer"
                          title="Delete Service"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Service Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center space-x-2">
                <Briefcase className="h-4.5 w-4.5 text-emerald-500" />
                <span>{editingService ? 'Edit Knowledge Base Service' : 'Add New Knowledge Base Service'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveService} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Service Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., GST Registration, Trademark Filing"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Service Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Comprehensive service summary trained into AI agent..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Price & Timeline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Price (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g., 1499"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Turnaround Timeline
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 3 - 5 Working Days"
                    value={timeline}
                    onChange={(e) => setTimeline(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Required Documents */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Required Documents (Comma separated)
                </label>
                <input
                  type="text"
                  placeholder="PAN Card, Aadhaar Card, Passport Photo, Electricity Bill"
                  value={reqDocsInput}
                  onChange={(e) => setReqDocsInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Separate document items with commas for tag rendering.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Service Knowledge Active
                </span>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                    isActive ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-700'
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
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer transition-all"
                >
                  {editingService ? 'Update Service' : 'Create Service'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
