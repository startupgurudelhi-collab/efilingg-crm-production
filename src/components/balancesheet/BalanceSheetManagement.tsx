import React, { useState, useMemo } from 'react';
import { 
  BalanceSheetRecord, 
  getStoredBalanceSheets, 
  saveBalanceSheetRecord, 
  deleteBalanceSheetRecord, 
  duplicateBalanceSheetRecord,
  createBlankProprietorBalanceSheet,
  createSampleProprietorBalanceSheet,
  calculateBalanceSheetTotals
} from '../../lib/balanceSheet_db';
import BalanceSheetEditor from './BalanceSheetEditor';
import BalanceSheetPdfPreview from './BalanceSheetPdfPreview';
import { 
  Building2, Plus, Search, Filter, Printer, Edit2, Copy, 
  Trash2, Eye, CheckCircle2, AlertTriangle, FileSpreadsheet, 
  Calculator, Sparkles, BookOpen, User, MapPin, X
} from 'lucide-react';

export default function BalanceSheetManagement() {
  const [balanceSheets, setBalanceSheets] = useState<BalanceSheetRecord[]>(() => getStoredBalanceSheets());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFyFilter, setSelectedFyFilter] = useState('ALL');

  // View modes
  const [activeMode, setActiveMode] = useState<'list' | 'edit' | 'preview'>('list');
  const [activeRecord, setActiveRecord] = useState<BalanceSheetRecord | null>(null);

  // New Client Onboarding Modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newFirmName, setNewFirmName] = useState('');
  const [newProprietorName, setNewProprietorName] = useState('');
  const [newUnitAddress, setNewUnitAddress] = useState('');

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const refreshList = () => {
    setBalanceSheets(getStoredBalanceSheets());
  };

  const handleStartNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirmName.trim()) return;

    const newRecord = createBlankProprietorBalanceSheet(
      newFirmName,
      newProprietorName,
      newUnitAddress
    );
    saveBalanceSheetRecord(newRecord);
    refreshList();
    setNewFirmName('');
    setNewProprietorName('');
    setNewUnitAddress('');
    setShowNewModal(false);

    // Open directly in editor
    setActiveRecord(newRecord);
    setActiveMode('edit');
  };

  const handleLoadSample = () => {
    const sample = createSampleProprietorBalanceSheet();
    saveBalanceSheetRecord(sample);
    refreshList();
    setActiveRecord(sample);
    setActiveMode('preview');
  };

  const handleEdit = (record: BalanceSheetRecord) => {
    setActiveRecord(record);
    setActiveMode('edit');
  };

  const handlePreview = (record: BalanceSheetRecord) => {
    setActiveRecord(record);
    setActiveMode('preview');
  };

  const handleDuplicate = (id: string) => {
    const dup = duplicateBalanceSheetRecord(id);
    if (dup) {
      refreshList();
      setActiveRecord(dup);
      setActiveMode('edit');
    }
  };

  const handleDelete = (id: string) => {
    deleteBalanceSheetRecord(id);
    refreshList();
    setDeleteConfirmId(null);
  };

  // Filtered balance sheets
  const filteredList = useMemo(() => {
    return balanceSheets.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || 
        item.firmName.toLowerCase().includes(q) ||
        item.proprietorName.toLowerCase().includes(q) ||
        (item.unitAddress && item.unitAddress.toLowerCase().includes(q)) ||
        (item.udin && item.udin.toLowerCase().includes(q));

      const matchFy = selectedFyFilter === 'ALL' || item.financialYear === selectedFyFilter;
      return matchQuery && matchFy;
    });
  }, [balanceSheets, searchQuery, selectedFyFilter]);

  // High-level statistics
  const stats = useMemo(() => {
    let totalSales = 0;
    let totalAssets = 0;
    let talliedCount = 0;

    balanceSheets.forEach(bs => {
      const t = calculateBalanceSheetTotals(bs);
      totalSales += Number(bs.sales) || 0;
      totalAssets += t.totalAssets;
      if (t.isTallied) talliedCount++;
    });

    return {
      count: balanceSheets.length,
      totalSales,
      totalAssets,
      talliedCount
    };
  }, [balanceSheets]);

  // If in Preview Mode
  if (activeMode === 'preview' && activeRecord) {
    return (
      <BalanceSheetPdfPreview
        data={activeRecord}
        onBack={() => {
          refreshList();
          setActiveMode('list');
        }}
        onEdit={() => setActiveMode('edit')}
      />
    );
  }

  // If in Edit Mode
  if (activeMode === 'edit' && activeRecord) {
    return (
      <BalanceSheetEditor
        initialData={activeRecord}
        onSave={(saved) => {
          refreshList();
          setActiveRecord(saved);
          setActiveMode('list');
        }}
        onCancel={() => {
          refreshList();
          setActiveMode('list');
        }}
        onPreview={(record) => {
          setActiveRecord(record);
          setActiveMode('preview');
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>Balance Sheet Preparation</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60">
                  PROPRIETORSHIP
                </span>
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trading, Profit & Loss, Balance Sheet & Annexure A Depreciation with 3-Page Authentic CA PDF Print
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleLoadSample}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 cursor-pointer shadow-3xs"
            title="Load sample from uploaded PDF (Adil Al Laziz Food & Co.)"
          >
            <Sparkles className="h-4 w-4 text-indigo-500" />
            <span>Load Sample (Adil Al Laziz)</span>
          </button>
          <button
            onClick={() => setShowNewModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>New Balance Sheet</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Balance Sheets</span>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {stats.count}
          </div>
          <span className="text-[10.5px] text-slate-500">Proprietorship Clients</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Tally Status</span>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-5 w-5" />
            <span>{stats.talliedCount} / {stats.count}</span>
          </div>
          <span className="text-[10.5px] text-slate-500">100% Balanced</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Turnover</span>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 font-mono">
            ₹{(stats.totalSales / 100000).toFixed(1)}L
          </div>
          <span className="text-[10.5px] text-slate-500">Aggregated Sales</span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-3xs">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Asset Capital</span>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1 font-mono">
            ₹{(stats.totalAssets / 100000).toFixed(1)}L
          </div>
          <span className="text-[10.5px] text-slate-500">Fixed & Current Assets</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 shadow-3xs flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by firm name, proprietor, address, or UDIN..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <select
            value={selectedFyFilter}
            onChange={e => setSelectedFyFilter(e.target.value)}
            className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
          >
            <option value="ALL">All Financial Years</option>
            <option value="2025-2026">FY 2025-26</option>
            <option value="2024-2025">FY 2024-25</option>
            <option value="2023-2024">FY 2023-24</option>
          </select>
        </div>
      </div>

      {/* Balance Sheets Portfolio Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                <th className="p-3.5">Firm & Proprietor</th>
                <th className="p-3.5">Financial Year</th>
                <th className="p-3.5 text-right">Turnover (Sales)</th>
                <th className="p-3.5 text-right">Net Profit</th>
                <th className="p-3.5 text-right">Total Assets</th>
                <th className="p-3.5 text-center">Tally Status</th>
                <th className="p-3.5">CA & UDIN</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No balance sheet found matching your search. Click <strong>"+ New Balance Sheet"</strong> to prepare one.
                  </td>
                </tr>
              ) : (
                filteredList.map((bs) => {
                  const t = calculateBalanceSheetTotals(bs);
                  return (
                    <tr key={bs.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900 dark:text-white uppercase">
                          {bs.firmName}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <User className="h-3 w-3 text-slate-400" />
                          <span>{bs.proprietorName}</span>
                        </div>
                        {bs.unitAddress && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[240px] flex items-center gap-1 mt-0.5">
                            <MapPin className="h-2.5 w-2.5 shrink-0" />
                            <span className="truncate">{bs.unitAddress}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-md font-mono text-[10.5px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/50">
                          FY {bs.financialYear}
                        </span>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Ended {bs.yearEndedDate}
                        </div>
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                        ₹{(Number(bs.sales) || 0).toLocaleString('en-IN')}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{t.netProfit.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3.5 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        ₹{t.totalAssets.toLocaleString('en-IN')}
                      </td>

                      <td className="p-3.5 text-center">
                        {t.isTallied ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
                            <CheckCircle2 className="h-3 w-3" /> Balanced
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/60">
                            <AlertTriangle className="h-3 w-3" /> Diff: ₹{Math.abs(t.difference).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 text-[11px]">
                          {bs.caName || bs.caFirmName}
                        </div>
                        {bs.udin ? (
                          <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                            UDIN: {bs.udin}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">UDIN Pending</div>
                        )}
                      </td>

                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handlePreview(bs)}
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-lg transition"
                            title="Print / View 3-Page CA PDF"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEdit(bs)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition"
                            title="Edit Figures & Statements"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(bs.id)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition"
                            title="Duplicate Balance Sheet"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(bs.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Client Balance Sheet Setup */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowNewModal(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Client & Business Unit Setup
                </h3>
                <p className="text-xs text-slate-500">
                  Step 1: Basic details before starting Balance Sheet preparation
                </p>
              </div>
            </div>

            <form onSubmit={handleStartNew} className="space-y-4">
              <div>
                <label className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Name of Firm / Business *
                </label>
                <input
                  type="text"
                  required
                  value={newFirmName}
                  onChange={e => setNewFirmName(e.target.value)}
                  placeholder="e.g. ADIL AL LAZIZ FOOD & CO."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Name of Proprietor *
                </label>
                <input
                  type="text"
                  required
                  value={newProprietorName}
                  onChange={e => setNewProprietorName(e.target.value)}
                  placeholder="e.g. Adil Lateef"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Address of the Unit / Shop / Office *
                </label>
                <textarea
                  rows={2}
                  required
                  value={newUnitAddress}
                  onChange={e => setNewUnitAddress(e.target.value)}
                  placeholder="e.g. SHAHEEN BAGH ABUL FAZAL PART 2 NEW DELHI 110025"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>Start Preparation</span>
                  <span>→</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 relative">
            <h3 className="text-base font-black text-slate-900 dark:text-white mb-2">
              Delete Balance Sheet Record?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              Are you sure you want to delete this compiled balance sheet? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
