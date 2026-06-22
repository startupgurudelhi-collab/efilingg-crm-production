/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { getLeads, createProposal, getEmployeeById, getEmployees, getCustomServices } from '../lib/db';
import { Lead, Proposal, CustomService } from '../types';
import { ShieldCheck, Plus, Sparkles, HelpCircle, FileText, Check, DollarSign } from 'lucide-react';

interface ProposalBuilderProps {
  currentUserId: string;
  onRefreshData: () => void;
  onProposalCreated: (prop: Proposal) => void;
  onClose: () => void;
}

export default function ProposalBuilder({ currentUserId, onRefreshData, onProposalCreated, onClose }: ProposalBuilderProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  
  // Custom manual entry fields if not selecting existing client
  const [isManual, setIsManual] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientMobile, setClientMobile] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientBusiness, setClientBusiness] = useState('');

  // Service selection
  const [selectedService, setSelectedService] = useState('GST Registration');
  const [amount, setAmount] = useState(999);
  const [taxes, setTaxes] = useState(0); // Removed GST
  const [finalAmount, setFinalAmount] = useState(999);
  const [notes, setNotes] = useState('');

  const [dbServices, setDbServices] = useState<CustomService[]>([]);

  useEffect(() => {
    // Only show active leads belonging to the logged in user unless they are admin
    const allLeads = getLeads();
    const emp = getEmployeeById(currentUserId);
    const isAdmin = emp?.role === 'admin';
    const filteredLeads = isAdmin ? allLeads : allLeads.filter((l) => l.assignedTo === currentUserId);
    setLeads(filteredLeads);
    const svs = getCustomServices();
    setDbServices(svs);
    if (svs.length > 0) {
      setSelectedService(svs[0].name);
    }
  }, [currentUserId]);

  // Update price when service required options change
  useEffect(() => {
    const matchedSrv = dbServices.find((s) => s.name === selectedService);
    if (matchedSrv) {
      const basePrice = matchedSrv.price;
      setAmount(basePrice);
      setTaxes(0); // GST removed
      setFinalAmount(basePrice);
    }
  }, [selectedService, dbServices]);

  // Recalculate whenever amount is manually entered
  const handleAmountChange = (val: number) => {
    setAmount(val);
    setTaxes(0); // GST removed
    setFinalAmount(val);
  };

  const handleSelectLeadChange = (id: string) => {
    setSelectedLeadId(id);
    if (id) {
      const found = leads.find((l) => l.id === id);
      if (found) {
        setClientName(found.customerName);
        setClientMobile(found.mobile);
        setClientEmail(found.email);
        setClientBusiness(found.businessName);
        const exists = dbServices.some((s) => s.name === found.serviceRequired);
        if (exists) {
          setSelectedService(found.serviceRequired);
        }
      }
    }
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientMobile.trim()) {
      alert('Please fill client name and mobile number.');
      return;
    }

    const currentEmployee = getEmployeeById(currentUserId);

    const newProp = createProposal({
      leadId: !isManual && selectedLeadId ? selectedLeadId : undefined,
      clientName,
      clientEmail,
      clientMobile,
      clientBusiness,
      serviceRequired: selectedService,
      amount,
      taxes,
      finalAmount,
      status: 'sent',
      createdBy: currentUserId,
      createdByName: currentEmployee?.name || 'Authorized Member',
      notes
    }, currentUserId);

    onRefreshData();
    onProposalCreated(newProp);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-405 flex items-center justify-center">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-850 dark:text-slate-100">Professional Proposal Builder</h3>
          <p className="text-xs text-slate-500">Draft beautiful statutory quote sheets</p>
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-5">
        {/* Step 1: Select CRM Client OR enter Manual Details */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wide">
              Step 1: Client Enrollment Source
            </span>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsManual(false);
                  setSelectedLeadId('');
                }}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                  !isManual ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-400'
                }`}
              >
                CRM Leads
              </button>
              <button
                type="button"
                onClick={() => setIsManual(true)}
                className={`px-3 py-1.5 rounded-md cursor-pointer transition-all ${
                  isManual ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs' : 'text-slate-400'
                }`}
              >
                Manual Details
              </button>
            </div>
          </div>

          {!isManual ? (
            <div className="space-y-1">
              <label className="text-xs text-slate-450 font-bold">Select Active Lead Profile</label>
              <select
                value={selectedLeadId}
                onChange={(e) => handleSelectLeadChange(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Choose Existing CRM Client Profile --</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.customerName} - {l.serviceRequired} ({l.mobile})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-450 font-bold">Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="E.g. Kunal Singhal"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-450 font-bold">Mobile Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="E.g. 9812345678"
                  value={clientMobile}
                  onChange={(e) => setClientMobile(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-450 font-bold">Email Address</label>
                <input
                  type="email"
                  placeholder="E.g. client@entity.com"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-450 font-bold">Business / Entity Name</label>
                <input
                  type="text"
                  placeholder="E.g. Apex Retail Services"
                  value={clientBusiness}
                  onChange={(e) => setClientBusiness(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Select Service and pull tariffs */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wide block">
            Step 2: Service Selection & Government Tariffs
          </span>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-455 font-bold">Target Service</label>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                {dbServices.map((srv) => (
                  <option key={srv.id} value={srv.name}>
                    {srv.name} (Default: ₹{srv.price})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-455 font-bold">Professional Quote Base Fee (₹)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 font-mono text-xs">₹</span>
                <input
                  type="number"
                  placeholder="999"
                  value={amount}
                  onChange={(e) => handleAmountChange(Number(e.target.value))}
                  className="w-full pl-8 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic calculation banner */}
        <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900 rounded-2xl flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-xs text-slate-500 dark:text-slate-400">Professional quotation sheet calculations:</span>
            <div className="text-xs text-slate-400 dark:text-slate-500 font-mono">
              Professional Base Price: ₹{amount} (Proposals are generated with net professional fees and zero GST additions)
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-sans font-bold block">Final Total Quote</span>
            <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono">
              ₹{finalAmount}
            </span>
          </div>
        </div>

        {/* Step 3: Additional Notes / Custom terms */}
        <div className="space-y-1">
          <label className="text-xs text-slate-450 font-bold tracking-wide">Custom Proposal Footnotes (Optional)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="E.g. Special combo discount. Valid on dual director profiles."
            className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        {/* Actions buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Cancel Drafting
          </button>
          <button
            type="submit"
            className="flex items-center space-x-2 py-2.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-xs tracking-wide transition-all cursor-pointer shadow-lg shadow-emerald-500/10"
          >
            <Sparkles className="h-4 w-4" />
            <span>Draft & Preview PDF Proposal</span>
          </button>
        </div>
      </form>
    </div>
  );
}
