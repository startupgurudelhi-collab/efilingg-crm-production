/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  V2Auditor, 
  V2TrademarkAttorney, 
  getV2Auditors, 
  addV2Auditor, 
  getV2TrademarkAttorneys, 
  addV2TrademarkAttorney 
} from '../../lib/v2_db';
import { UserCheck, ShieldCheck, Plus, Briefcase, Mail, MapPin, Award } from 'lucide-react';

export default function V2Masters() {
  const [activeTab, setActiveTab] = useState<'auditor' | 'attorney'>('auditor');
  const [auditors, setAuditors] = useState<V2Auditor[]>(getV2Auditors());
  const [attorneys, setAttorneys] = useState<V2TrademarkAttorney[]>(getV2TrademarkAttorneys());

  // Auditor form states
  const [auditName, setAuditName] = useState('');
  const [auditFirm, setAuditFirm] = useState('');
  const [auditMemNo, setAuditMemNo] = useState('');
  const [auditFrn, setAuditFrn] = useState('');
  const [auditAddress, setAuditAddress] = useState('');
  const [auditPan, setAuditPan] = useState('');
  const [auditEmail, setAuditEmail] = useState('');
  const [showAddAuditor, setShowAddAuditor] = useState(false);

  // Attorney form states
  const [attName, setAttName] = useState('');
  const [attCode, setAttCode] = useState('');
  const [attEmail, setAttEmail] = useState('');
  const [attAddress, setAttAddress] = useState('');
  const [showAddAttorney, setShowAddAttorney] = useState(false);

  const handleAddAuditor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditName || !auditFirm || !auditMemNo || !auditFrn || !auditEmail) {
      alert('Required auditor fields must be filled.');
      return;
    }
    const added = addV2Auditor({
      name: auditName,
      firmName: auditFirm,
      membershipNo: auditMemNo,
      frnNo: auditFrn,
      address: auditAddress || 'N/A',
      panNumber: auditPan || 'N/A',
      email: auditEmail
    });
    setAuditors([...auditors, added]);
    setShowAddAuditor(false);
    // Reset Form
    setAuditName('');
    setAuditFirm('');
    setAuditMemNo('');
    setAuditFrn('');
    setAuditAddress('');
    setAuditPan('');
    setAuditEmail('');
  };

  const handleAddAttorney = (e: React.FormEvent) => {
    e.preventDefault();
    if (!attName || !attCode || !attEmail) {
      alert('Required attorney fields must be filled.');
      return;
    }
    const added = addV2TrademarkAttorney({
      name: attName,
      attorneyCode: attCode,
      email: attEmail,
      address: attAddress || 'N/A'
    });
    setAttorneys([...attorneys, added]);
    setShowAddAttorney(false);
    // Reset Form
    setAttName('');
    setAttCode('');
    setAttEmail('');
    setAttAddress('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('auditor')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
            activeTab === 'auditor' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          🎓 CA Master / Auditor Registry
        </button>
        <button
          onClick={() => setActiveTab('attorney')}
          className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition ${
            activeTab === 'attorney' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
        >
          ⚖️ Trademark Attorney Master
        </button>
      </div>

      {activeTab === 'auditor' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm uppercase">CA / Auditor Master Records</h3>
              <p className="text-[10px] text-slate-400">Add and map Chartered Accountant firms for your private limited company and compliance audits.</p>
            </div>
            <button
              onClick={() => setShowAddAuditor(!showAddAuditor)}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Auditor
            </button>
          </div>

          {showAddAuditor && (
            <form onSubmit={handleAddAuditor} className="p-4 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl space-y-4">
              <h4 className="font-bold text-xs text-indigo-700 uppercase">Register Audit Professional</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">CA Name *</label>
                  <input type="text" required value={auditName} onChange={e => setAuditName(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Firm Name *</label>
                  <input type="text" required value={auditFirm} onChange={e => setAuditFirm(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Email ID *</label>
                  <input type="email" required value={auditEmail} onChange={e => setAuditEmail(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Membership No *</label>
                  <input type="text" required value={auditMemNo} onChange={e => setAuditMemNo(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">FRN Number *</label>
                  <input type="text" required value={auditFrn} onChange={e => setAuditFrn(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">PAN Number</label>
                  <input type="text" value={auditPan} onChange={e => setAuditPan(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl font-mono uppercase" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 text-xs text-slate-400">Office Address</label>
                <input type="text" value={auditAddress} onChange={e => setAuditAddress(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs" />
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setShowAddAuditor(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">Save CA</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {auditors.map(aud => (
              <div key={aud.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-start gap-3 shadow-2xs">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-650 shrink-0">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs">{aud.name}</h4>
                  <p className="text-[10px] font-bold text-indigo-650 uppercase tracking-widest">{aud.firmName}</p>
                  <div className="text-[10.5px] text-slate-400 dark:text-slate-350 flex flex-col space-y-0.5 font-mono">
                    <span>Membership: <span className="font-bold text-slate-650 dark:text-slate-200">{aud.membershipNo}</span></span>
                    <span>Firm Reg No: <span className="font-bold text-slate-650 dark:text-slate-200">{aud.frnNo}</span></span>
                    <span>PAN Number: <span className="font-bold text-slate-650 dark:text-slate-200">{aud.panNumber}</span></span>
                    <span className="flex items-center gap-1 mt-1 font-sans"><Mail className="h-3 w-3 shrink-0" /> {aud.email}</span>
                    <span className="flex items-center gap-1 font-sans"><MapPin className="h-3 w-3 shrink-0" /> {aud.address}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'attorney' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-extrabold text-slate-800 dark:text-slate-150 text-sm uppercase">Trademark Attorney master</h3>
              <p className="text-[10px] text-slate-400">Manage legal counselors and agents specialized in filings inside the IP India Trademark registers.</p>
            </div>
            <button
              onClick={() => setShowAddAttorney(!showAddAttorney)}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Attorney
            </button>
          </div>

          {showAddAttorney && (
            <form onSubmit={handleAddAttorney} className="p-4 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-2xl space-y-4">
              <h4 className="font-bold text-xs text-indigo-700 uppercase">Register Patent & Trademark Attorney</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Attorney Full Name *</label>
                  <input type="text" required value={attName} onChange={e => setAttName(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Attorney Code *</label>
                  <input type="text" required value={attCode} onChange={e => setAttCode(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl font-mono uppercase" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Corporate Email *</label>
                  <input type="email" required value={attEmail} onChange={e => setAttEmail(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 text-xs text-slate-400">Chambers / Address</label>
                <input type="text" value={attAddress} onChange={e => setAttAddress(e.target.value)} className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-xs" />
              </div>
              <div className="flex justify-end gap-2 text-xs">
                <button type="button" onClick={() => setShowAddAttorney(false)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold cursor-pointer">Save Attorney</button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attorneys.map(att => (
              <div key={att.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl flex items-start gap-3 shadow-2xs">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-955/15 text-amber-600 rounded-xl shrink-0">
                  <Award className="h-5 w-5" />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <h4 className="font-black text-slate-800 dark:text-slate-100 text-xs">{att.name}</h4>
                  <p className="text-[10px] font-mono font-bold text-amber-600">CODE: {att.attorneyCode}</p>
                  <div className="text-[10.5px] text-slate-400 dark:text-slate-350 flex flex-col space-y-0.5">
                    <span className="flex items-center gap-1 mt-1"><Mail className="h-3 w-3 shrink-0" /> {att.email}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3 shrink-0" /> {att.address}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
