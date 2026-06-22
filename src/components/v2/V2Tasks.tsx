/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  V2TrademarkClient, 
  V2Task, 
  getV2Trademarks, 
  addV2Trademark, 
  getV2Tasks, 
  addV2Task, 
  getV2TrademarkAttorneys, 
  getV1Employees 
} from '../../lib/v2_db';
import { 
  Calendar, CheckSquare, Shield, FileSymlink, Plus, User, FileText, Search, Clock, AlertTriangle, BadgeAlert 
} from 'lucide-react';

export default function V2Tasks() {
  const [subTab, setSubTab] = useState<'trademark' | 'tasks' | 'calendar'>('trademark');

  // Load masters & databases
  const [trademarks, setTrademarks] = useState<V2TrademarkClient[]>(getV2Trademarks());
  const [tasks, setTasks] = useState<V2Task[]>(getV2Tasks());
  
  const attorneys = getV2TrademarkAttorneys();
  const rawEmployees = getV1Employees();

  // Form states - Trademark
  const [showAddTm, setShowAddTm] = useState(false);
  const [tmClient, setTmClient] = useState('');
  const [tmBrand, setTmBrand] = useState('');
  const [tmClass, setTmClass] = useState('35');
  const [tmApplNo, setTmApplNo] = useState('');
  const [tmStage, setTmStage] = useState<V2TrademarkClient['stage']>('Applied');
  const [tmApplyDate, setTmApplyDate] = useState('2026-06-01');
  const [tmAttorneyId, setTmAttorneyId] = useState('');

  // Form states - Custom manual task
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskDueDate, setTaskDueDate] = useState('2026-06-30');

  // Calendar category selector
  const [selectedCalCategory, setSelectedCalCategory] = useState<'ALL' | 'GST' | 'ROC' | 'ITR'>('ALL');

  // Hardcoded compliance schedules based on pages 5-8 of PDF
  const complianceEvents = [
    { id: 1, title: 'Monthly GSTR-1 Filing', category: 'GST', dueDay: '11th of Next Month', desc: 'Outward supplies statement filing for normal taxpayers (Monthly mode).' },
    { id: 2, title: 'QRMP GSTR-1 (IFF) filing', category: 'GST', dueDay: '13th of Next Month', desc: 'Invoice Furnishing Facility (IFF) for quarterly return filers.' },
    { id: 3, title: 'Monthly GSTR-3B tax payment', category: 'GST', dueDay: '20th of Next Month', desc: 'Monthly summary returns and consolidated taxes clearance filing.' },
    { id: 4, title: 'QRMP GSTR-3B filing', category: 'GST', dueDay: '22nd or 24th of Next Quarter Month', desc: 'Consolidated summary return filing for quarterly taxpayers based on state.' },
    { id: 5, title: 'LLP Form 11 (Annual Return)', category: 'ROC', dueDay: '30th of May (Annual)', desc: 'Statutory filing of annual returns for Limited Liability Partnerships.' },
    { id: 6, title: 'LLP Form 8 (Statement of Accounts)', category: 'ROC', dueDay: '30th of October (Annual)', desc: 'Filing of accounts and solvency reports for LLPs.' },
    { id: 7, title: 'Company ADT-1 Auditor appt', category: 'ROC', dueDay: 'Within 15 days of AGM appointment', desc: 'Filing auditor appointment details to the registrar.' },
    { id: 8, title: 'Company AOC-4 (Financial statements)', category: 'ROC', dueDay: 'Within 30 days of AGM (Normally 29th Oct)', desc: 'Filing balances, profits, board reports with ROC.' },
    { id: 9, title: 'Company MGT-7/7A (Annual Return)', category: 'ROC', dueDay: 'Within 60 days of AGM (Normally 29th Nov)', desc: 'Corporate annual status records, shareholder rosters details.' },
    { id: 10, title: 'Director DIN KYC (DIR-3 KYC)', category: 'ROC', dueDay: '30th of September (Annual)', desc: 'Self-authentication of active directors contact files and passports.' },
    { id: 11, title: 'Individual non-audit ITR filing', category: 'ITR', dueDay: '31st of July (Annual)', desc: 'Filing of Form ITR-1, ITR-2, ITR-3, ITR-4 for non-audit individuals.' },
    { id: 12, title: 'Corporate & Audit ITR filing (ITR-6)', category: 'ITR', dueDay: '31st of October (Annual)', desc: 'Tax returns submission for companies or audit-applicable individuals.' }
  ];

  // Actions
  const handleCreateTrademark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tmClient || !tmBrand || !tmApplNo) {
      alert('Client Name, Brand Name, and Application Number are required.');
      return;
    }
    const added = addV2Trademark({
      clientName: tmClient,
      brandName: tmBrand,
      classNumber: tmClass,
      applNo: tmApplNo,
      stage: tmStage,
      dateOfApply: tmApplyDate,
      attorneyId: tmAttorneyId
    });
    setTrademarks([...trademarks, added]);
    setShowAddTm(false);
    // Reset Form
    setTmClient(''); setTmBrand(''); setTmApplNo(''); setTmAttorneyId('');
  };

  const handleUpdateTmStage = (id: string, newStage: V2TrademarkClient['stage']) => {
    const list = [...trademarks];
    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) {
      list[idx].stage = newStage;
      setTrademarks(list);
      // Save
      localStorage.setItem('efilingg_crm_v2_trademarks', JSON.stringify(list));
    }
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle || !taskAssignee) {
      alert('Task Title and Assignee are required.');
      return;
    }
    const selectedEmp = rawEmployees.find(e => e.id === taskAssignee);
    const added = addV2Task({
      title: taskTitle,
      description: taskDesc,
      assignedTo: taskAssignee,
      assignedToName: selectedEmp ? selectedEmp.name : 'Unknown Assignee',
      createdBy: 'ADMIN',
      createdByName: 'Master Admin',
      dueDate: taskDueDate,
      status: 'pending'
    });
    setTasks([...tasks, added]);
    setShowAddTask(false);
    // Reset Form
    setTaskTitle(''); setTaskDesc(''); setTaskAssignee('');
  };

  const handleUpdateTaskStatus = (id: string, newStatus: V2Task['status']) => {
    const list = [...tasks];
    const idx = list.findIndex(t => t.id === id);
    if (idx !== -1) {
      list[idx].status = newStatus;
      setTasks(list);
      // Save
      localStorage.setItem('efilingg_crm_v2_tasks', JSON.stringify(list));
    }
  };

  const getStageBadgeColor = (stage: V2TrademarkClient['stage']) => {
    switch (stage) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-250';
      case 'Objected':
        return 'bg-rose-50 text-rose-700 border-rose-250';
      case 'Hearing':
        return 'bg-amber-50 text-amber-700 border-amber-250';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const filteredCalendar = selectedCalCategory === 'ALL' 
    ? complianceEvents
    : complianceEvents.filter(e => e.category === selectedCalCategory);

  return (
    <div className="space-y-6 text-xs">
      
      {/* Top Selector Panel Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-3">
        <button onClick={() => setSubTab('trademark')} className={`px-4.5 py-2 font-bold uppercase rounded-xl transition ${subTab === 'trademark' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>🏷️ Trademark application logs</button>
        <button onClick={() => setSubTab('tasks')} className={`px-4.5 py-2 font-bold uppercase rounded-xl transition ${subTab === 'tasks' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>📋 Operational Task Queue</button>
        <button onClick={() => setSubTab('calendar')} className={`px-4.5 py-2 font-bold uppercase rounded-xl transition ${subTab === 'calendar' ? 'bg-indigo-600 text-white shadow-3xs' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>📅 Compliance Calendar Due-Dates</button>
      </div>

      {subTab === 'trademark' && (
        <div className="space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850 select-none">
            <div>
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] text-sm uppercase">Trademark Application Registrar</h3>
              <p className="text-[10px] text-slate-450 font-medium tracking-wide">Enter brand filings, class codes, certificate status hearings, and assign representing trademark counsels.</p>
            </div>
            <button onClick={() => setShowAddTm(true)} className="flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
              <Plus className="h-4 w-4" /> Create Trademark Case
            </button>
          </div>

          {showAddTm && (
            <form onSubmit={handleCreateTrademark} className="p-4 bg-white border border-slate-205 rounded-xl space-y-4">
              <h4 className="font-extrabold text-indigo-750 uppercase text-[10px]">Create Trademark case profile</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Client / applicant Name *</label>
                  <input type="text" required value={tmClient} onChange={e => setTmClient(e.target.value)} className="w-full p-2 bg-slate-55 border border-slate-200 rounded-xl" />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Brand Name *</label>
                  <input type="text" required value={tmBrand} onChange={e => setTmBrand(e.target.value)} className="w-full p-2 bg-slate-55 border border-slate-200 rounded-xl" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Class number (1-45) *</label>
                  <input type="text" required placeholder="e.g. 35" value={tmClass} onChange={e => setTmClass(e.target.value)} className="w-full p-2 bg-slate-55 border border-slate-200 rounded-xl font-mono" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Application Number *</label>
                  <input type="text" required placeholder="e.g. TM-1941294" value={tmApplNo} onChange={e => setTmApplNo(e.target.value)} className="w-full p-2 bg-slate-55 border border-slate-200 rounded-xl font-mono uppercase" />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-350">Application Stage *</label>
                  <select value={tmStage} onChange={e => setTmStage(e.target.value as any)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="Applied">Applied (Under process)</option>
                    <option value="Objected">Objected (Awaiting review response)</option>
                    <option value="Hearing">Hearing Scheduled (Active represent)</option>
                    <option value="Approved">Approved / Registered (Closed)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-350">Representing Trademark Attorney *</label>
                  <select value={tmAttorneyId} onChange={e => setTmAttorneyId(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="">-- No Attorney Linked --</option>
                    {attorneys.map(a => <option key={a.id} value={a.id}>{a.name} (Code: {a.attorneyCode})</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Submission Date</label>
                  <input type="date" value={tmApplyDate} onChange={e => setTmApplyDate(e.target.value)} className="w-full p-2 bg-slate-55 border border-slate-200 rounded-xl font-mono" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddTm(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer">Save IP Docket</button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-3xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-850 text-[10px]">
                  <th className="p-3 pl-5">Client / brand name</th>
                  <th className="p-3">Class IP Type</th>
                  <th className="p-3">Gov Application No</th>
                  <th className="p-3">Counsel / agent Link</th>
                  <th className="p-3">Status update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {trademarks.map(tm => {
                  const counsel = attorneys.find(a => a.id === tm.attorneyId);
                  return (
                    <tr key={tm.id} className="hover:bg-slate-50/50">
                      <td className="p-3 pl-5">
                        <div className="font-extrabold text-slate-850 dark:text-slate-101">{tm.brandName}</div>
                        <div className="text-[10px] text-slate-400 font-semibold uppercase font-sans">Applicant: {tm.clientName} • Applied: {tm.dateOfApply}</div>
                      </td>
                      <td className="p-3 font-bold text-indigo-650">Class {tm.classNumber}</td>
                      <td className="p-3 font-mono font-bold bg-slate-100 dark:bg-slate-850 w-fit rounded p-1 text-[11px] block mt-2 text-slate-700 dark:text-slate-200">{tm.applNo}</td>
                      <td className="p-3 font-semibold text-slate-650 dark:text-slate-200">{counsel ? `${counsel.name} (${counsel.attorneyCode})` : 'Unassigned'}</td>
                      <td className="p-3 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 border rounded-lg text-[9.5px] font-bold ${getStageBadgeColor(tm.stage)}`}>{tm.stage}</span>
                          <select value={tm.stage} onChange={e => handleUpdateTmStage(tm.id, e.target.value as any)} className="p-1 text-[9.5px] font-bold border border-slate-200 rounded-lg">
                            <option value="Applied">Applied</option>
                            <option value="Objected">Objected</option>
                            <option value="Hearing">Hearing</option>
                            <option value="Approved">Approved</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850 select-none">
            <div>
              <h3 className="font-extrabold text-[#111] dark:text-[#fff] text-sm uppercase">Custom Task Management Deck</h3>
              <p className="text-[10px] text-slate-450 font-medium">Record specific assignments under files, track due dates, set assignee coordinates, and check status workflow lists.</p>
            </div>
            <button onClick={() => setShowAddTask(true)} className="flex items-center gap-1 bg-indigo-650 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-xl cursor-pointer">
              <Plus className="h-4 w-4" /> Create Custom Task
            </button>
          </div>

          {showAddTask && (
            <form onSubmit={handleCreateTask} className="p-4 bg-white border border-slate-205 rounded-xl space-y-4">
              <h4 className="font-extrabold text-indigo-750 uppercase text-[10px]">Create operational ticket</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Task Title *</label>
                  <input type="text" required placeholder="e.g. Collect Audited Balance Sheets for Apex" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Operation Team Assignee *</label>
                  <select required value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold">
                    <option value="">-- Choose Employee --</option>
                    {rawEmployees.map((emp: any) => <option key={emp.id} value={emp.empName}>{emp.empName} ({emp.empRole})</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Filing / Task Due Date *</label>
                  <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono" />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Job Description / File Details</label>
                  <input type="text" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowAddTask(false)} className="px-3 py-1.5 bg-slate-100 rounded-xl cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-1.5 bg-indigo-600 text-white font-bold rounded-xl cursor-pointer font-bold">Launch Ticket</button>
              </div>
            </form>
          )}

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-3xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-100 dark:border-slate-850 text-[10px]">
                  <th className="p-3 pl-5">Ticket / custom task description</th>
                  <th className="p-3">Representative Assignee</th>
                  <th className="p-3">Due Target</th>
                  <th className="p-3">Operation Progress Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {tasks.map(tsk => (
                  <tr key={tsk.id} className="hover:bg-slate-50/50">
                    <td className="p-3 pl-5">
                      <div className="font-extrabold text-slate-850 dark:text-slate-100">{tsk.title}</div>
                      {tsk.description && <div className="text-[9.5px] text-slate-400 font-sans">{tsk.description}</div>}
                    </td>
                    <td className="p-3 font-semibold text-slate-650 dark:text-slate-200 flex items-center gap-1.5 mt-2">
                      <User className="h-3.5 w-3.5 text-indigo-650" />
                      <span>{tsk.assignedTo}</span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-550 flex items-center gap-1 mt-2.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {tsk.dueDate}
                    </td>
                    <td className="p-3">
                      <select value={tsk.status} onChange={e => handleUpdateTaskStatus(tsk.id, e.target.value as any)} className="p-1 font-bold border border-slate-200 rounded-lg text-[9.5px]">
                        <option value="PENDING">Pending (Operational Queue)</option>
                        <option value="IN_PROGRESS">In Progress Filing</option>
                        <option value="COMPLETED">Filing Completed (Approved)</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'calendar' && (
        <div className="space-y-4 font-sans">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-3xl border border-slate-100 dark:border-slate-850 select-none text-[11px]">
            <div>
              <h3 className="font-extrabold text-slate-805 dark:text-slate-150 uppercase text-xs">Statutory Compliance Calendar desk</h3>
              <p className="text-[10px] text-slate-400">Master tracker showing recurring due dates and regulatory timelines as specified across statutory GST, ROC, and ITR schedules.</p>
            </div>
            
            <div className="flex items-center gap-1 px-3 py-1 border border-slate-200 bg-white rounded-xl">
              <span className="font-bold uppercase text-[9.5px]">Filter Category:</span>
              <select value={selectedCalCategory} onChange={e => setSelectedCalCategory(e.target.value as any)} className="bg-transparent border-0 font-bold py-0.5 text-xs pr-2 focus:ring-0">
                <option value="ALL">Show All Compliances</option>
                <option value="GST">GST Exemption Filing Dates</option>
                <option value="ROC">ROC Corporate Filings Dates</option>
                <option value="ITR">Income Tax Slabs Dates</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCalendar.map(evt => (
              <div key={evt.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl flex items-start gap-3.5 shadow-3xs">
                <div className={`p-2.5 rounded-xl shrink-0 font-bold uppercase tracking-wider text-[10px] select-none text-center min-w-16 ${
                  evt.category === 'GST' ? 'bg-indigo-50 text-indigo-700' : evt.category === 'ROC' ? 'bg-purple-50 text-purple-700' : 'bg-pink-50 text-pink-700'
                }`}>
                  {evt.category}
                </div>
                <div className="space-y-1 font-sans">
                  <h4 className="font-extrabold text-slate-850 dark:text-slate-155 text-xs inline-flex items-center gap-1.5 leading-tight">{evt.title}</h4>
                  <p className="text-[10.5px] text-slate-400 font-medium leading-relaxed">{evt.desc}</p>
                  <div className="text-[10px] font-mono font-bold text-[#e53e3e] flex items-center gap-1.5 pt-0.5 select-none">
                    <Clock className="h-3.5 w-3.5" />
                    Due timeline: {evt.dueDay}
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
