import React, { useState, useEffect, useMemo } from 'react';
import { 
  BalanceSheetRecord, 
  calculateBalanceSheetTotals,
  saveBalanceSheetRecord,
  getStoredBalanceSheets,
  ensureLiabilityGroups,
  BalanceSheetAssetItem,
  BalanceSheetIndirectExpenseItem,
  BalanceSheetOtherIncomeItem,
  BalanceSheetCreditorItem,
  BalanceSheetLoanItem,
  BalanceSheetDebtorItem,
  BalanceSheetLoanGivenItem,
  BalanceSheetBankItem,
  BalanceSheetCustomItem,
  BalanceSheetLiabilityGroup
} from '../../lib/balanceSheet_db';
import { getV2Auditors, V2Auditor } from '../../lib/v2_db';
import { 
  Building2, User, MapPin, Calendar, Save, ArrowLeft, Eye, 
  Plus, Trash2, CheckCircle2, AlertTriangle, Calculator, 
  Receipt, Scale, Sparkles, HelpCircle, Layers, FolderPlus,
  ArrowRightLeft, ArrowRight, RefreshCw, Check, Info, History
} from 'lucide-react';

interface BalanceSheetEditorProps {
  initialData: BalanceSheetRecord;
  onSave: (savedRecord: BalanceSheetRecord) => void;
  onCancel: () => void;
  onPreview: (record: BalanceSheetRecord) => void;
}

export default function BalanceSheetEditor({ initialData, onSave, onCancel, onPreview }: BalanceSheetEditorProps) {
  const [formData, setFormData] = useState<BalanceSheetRecord>(() => {
    const data = { ...initialData };
    if (!data.customTradingDebits) data.customTradingDebits = [];
    if (!data.customTradingCredits) data.customTradingCredits = [];
    if (!data.customCurrentAssets) data.customCurrentAssets = [];
    if (!data.liabilityGroups || data.liabilityGroups.length === 0) {
      data.liabilityGroups = ensureLiabilityGroups(data);
    }
    // Prefill previous year figures & carry-forward values if not already set
    if (data.prevClosingStock === undefined) {
      data.prevClosingStock = data.openingStock || 0;
    }
    if (data.prevCapitalBalance === undefined) {
      data.prevCapitalBalance = data.openingCapital || 0;
    }
    if (data.currentBankInterest === undefined) {
      const existingInterest = (data.otherIncomes || []).find(i => i.name.toLowerCase().includes('interest'));
      data.currentBankInterest = existingInterest ? existingInterest.amount : 0;
    }
    if (data.currentYearTds === undefined) {
      const existingTds = (data.customCurrentAssets || []).find(a => a.name.toLowerCase().includes('tds'));
      data.currentYearTds = existingTds ? existingTds.amount : 0;
    }
    return data;
  });
  const [activeTab, setActiveTab] = useState<'profile' | 'carry_forward' | 'depreciation' | 'trading_pnl' | 'balancesheet'>('profile');
  const [auditors, setAuditors] = useState<V2Auditor[]>(() => getV2Auditors());

  // Stored balance sheets for previous year auto-fetch
  const storedSheets = useMemo(() => {
    return getStoredBalanceSheets().filter(s => s.id !== formData.id);
  }, [formData.id]);

  // Real-time calculations
  const totals = useMemo(() => calculateBalanceSheetTotals(formData), [formData]);

  // Handle Previous Closing Stock change & forward to Opening Stock in Trading A/c
  const handlePrevClosingStockChange = (val: number) => {
    setFormData(prev => ({
      ...prev,
      prevClosingStock: val,
      openingStock: val // Forwarded to Opening Stock
    }));
  };

  // Handle Previous Capital Balance change & forward to Opening Capital in Balance Sheet
  const handlePrevCapitalBalanceChange = (val: number) => {
    setFormData(prev => ({
      ...prev,
      prevCapitalBalance: val,
      openingCapital: val // Forwarded to Opening Capital
    }));
  };

  // Handle Current Bank Interest change & forward to Other Income in P&L
  const handleCurrentBankInterestChange = (val: number) => {
    setFormData(prev => {
      const existing = prev.otherIncomes || [];
      const hasBankInterest = existing.some(item => 
        item.name.toLowerCase().includes('interest')
      );
      let updatedIncomes: BalanceSheetOtherIncomeItem[];
      if (hasBankInterest) {
        updatedIncomes = existing.map(item => 
          item.name.toLowerCase().includes('interest') ? { ...item, amount: val } : item
        );
      } else {
        updatedIncomes = [...existing, { id: `inc-bank-interest-${Date.now()}`, name: 'Interest Income / Bank Interest', amount: val }];
      }
      return {
        ...prev,
        currentBankInterest: val,
        otherIncomes: updatedIncomes
      };
    });
  };

  // Handle Current Year TDS change & forward to Current Assets in Balance Sheet
  const handleCurrentYearTdsChange = (val: number) => {
    setFormData(prev => {
      const existing = prev.customCurrentAssets || [];
      const hasTds = existing.some(item => 
        item.name.toLowerCase().includes('tds')
      );
      let updatedAssets: BalanceSheetCustomItem[];
      if (hasTds) {
        updatedAssets = existing.map(item => 
          item.name.toLowerCase().includes('tds') ? { ...item, amount: val } : item
        );
      } else {
        updatedAssets = [...existing, { id: `asset-tds-${Date.now()}`, name: 'TDS Receivable (Current Year)', amount: val }];
      }
      return {
        ...prev,
        currentYearTds: val,
        customCurrentAssets: updatedAssets
      };
    });
  };

  // Helper to prefill figures from selected previous balance sheet
  const handleFetchFromPastRecord = (selectedId: string) => {
    const past = storedSheets.find(s => s.id === selectedId);
    if (!past) return;
    const pastTotals = calculateBalanceSheetTotals(past);
    const pastClosingStock = Number(past.closingStock) || 0;
    const pastClosingCapital = Number(pastTotals.netCapital) || Number(past.openingCapital) || 0;

    // Apply & forward immediately
    handlePrevClosingStockChange(pastClosingStock);
    handlePrevCapitalBalanceChange(pastClosingCapital);
  };

  // Re-apply and verify all 4 forwarded figures
  const handleReapplyAllForwarded = () => {
    const pStock = Number(formData.prevClosingStock) || 0;
    const pCap = Number(formData.prevCapitalBalance) || 0;
    const bInterest = Number(formData.currentBankInterest) || 0;
    const tds = Number(formData.currentYearTds) || 0;

    setFormData(prev => {
      // 1. Opening Stock
      const openingStock = pStock;
      // 2. Opening Capital
      const openingCapital = pCap;
      // 3. Other Income
      const otherIncomes = [...(prev.otherIncomes || [])];
      const incIdx = otherIncomes.findIndex(i => i.name.toLowerCase().includes('interest'));
      if (incIdx >= 0) {
        otherIncomes[incIdx] = { ...otherIncomes[incIdx], amount: bInterest };
      } else if (bInterest > 0) {
        otherIncomes.push({ id: `inc-bi-${Date.now()}`, name: 'Interest Income / Bank Interest', amount: bInterest });
      }
      // 4. Current Assets
      const customCurrentAssets = [...(prev.customCurrentAssets || [])];
      const assetIdx = customCurrentAssets.findIndex(a => a.name.toLowerCase().includes('tds'));
      if (assetIdx >= 0) {
        customCurrentAssets[assetIdx] = { ...customCurrentAssets[assetIdx], amount: tds };
      } else if (tds > 0) {
        customCurrentAssets.push({ id: `asset-tds-${Date.now()}`, name: 'TDS Receivable (Current Year)', amount: tds });
      }

      return {
        ...prev,
        openingStock,
        openingCapital,
        otherIncomes,
        customCurrentAssets
      };
    });
  };

  // When CA is selected from dropdown, prefill CA details
  const handleAuditorChange = (auditorId: string) => {
    if (!auditorId) {
      setFormData(prev => ({
        ...prev,
        caAuditorId: '',
      }));
      return;
    }
    const found = auditors.find(a => a.id === auditorId);
    if (found) {
      setFormData(prev => ({
        ...prev,
        caAuditorId: found.id,
        caFirmName: found.firmName || prev.caFirmName,
        caFirmType: '(Chartered Accountant)',
        caFrn: found.frnNo || prev.caFrn,
        caName: found.name ? `CA ${found.name}` : prev.caName,
        caDesignation: 'Proprietor',
        caMembershipNo: found.membershipNo || prev.caMembershipNo,
      }));
    }
  };

  const handleSave = () => {
    saveBalanceSheetRecord(formData);
    onSave(formData);
  };

  // Helper for Annexure A Depreciation Schedule changes
  const updateScheduleItem = (id: string, field: keyof BalanceSheetAssetItem, value: any) => {
    setFormData(prev => {
      const updatedSchedule = prev.depreciationSchedule.map(item => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        // Recalculate item math
        const total = (Number(field === 'wdvOpening' ? value : item.wdvOpening) || 0) + 
                      (Number(field === 'addition' ? value : item.addition) || 0);
        const rate = Number(field === 'ratePercent' ? value : item.ratePercent) || 0;
        const dep = Math.round(total * (rate / 100));
        const wdvClosing = total - dep;
        return {
          ...updated,
          total,
          depreciation: dep,
          wdvClosing
        };
      });
      return { ...prev, depreciationSchedule: updatedSchedule };
    });
  };

  const addScheduleItem = () => {
    const newItem: BalanceSheetAssetItem = {
      id: `asset-${Date.now()}`,
      particulars: 'New Office Equipment',
      wdvOpening: 0,
      addition: 0,
      ratePercent: 15,
      total: 0,
      depreciation: 0,
      wdvClosing: 0
    };
    setFormData(prev => ({
      ...prev,
      depreciationSchedule: [...prev.depreciationSchedule, newItem]
    }));
  };

  const removeScheduleItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      depreciationSchedule: prev.depreciationSchedule.filter(i => i.id !== id)
    }));
  };

  // Helper for Indirect Expenses
  const updateExpense = (id: string, field: 'name' | 'amount', value: any) => {
    setFormData(prev => ({
      ...prev,
      indirectExpenses: prev.indirectExpenses.map(exp => 
        exp.id === id ? { ...exp, [field]: field === 'amount' ? (Number(value) || 0) : value } : exp
      )
    }));
  };

  const addExpense = () => {
    const newExp: BalanceSheetIndirectExpenseItem = {
      id: `exp-${Date.now()}`,
      name: 'Other Operating Expense',
      amount: 0
    };
    setFormData(prev => ({
      ...prev,
      indirectExpenses: [...prev.indirectExpenses, newExp]
    }));
  };

  const removeExpense = (id: string) => {
    setFormData(prev => ({
      ...prev,
      indirectExpenses: prev.indirectExpenses.filter(e => e.id !== id)
    }));
  };

  // Helper for Custom Trading Debits
  const addTradingDebitItem = () => {
    const newItem: BalanceSheetCustomItem = {
      id: `td-${Date.now()}`,
      name: 'To Direct Wages & Freight',
      amount: 0
    };
    setFormData(prev => ({
      ...prev,
      customTradingDebits: [...(prev.customTradingDebits || []), newItem]
    }));
  };

  const updateTradingDebitItem = (id: string, field: 'name' | 'amount', value: any) => {
    setFormData(prev => ({
      ...prev,
      customTradingDebits: (prev.customTradingDebits || []).map(item => 
        item.id === id ? { ...item, [field]: field === 'amount' ? (Number(value) || 0) : value } : item
      )
    }));
  };

  const removeTradingDebitItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      customTradingDebits: (prev.customTradingDebits || []).filter(item => item.id !== id)
    }));
  };

  // Helper for Custom Trading Credits
  const addTradingCreditItem = () => {
    const newItem: BalanceSheetCustomItem = {
      id: `tc-${Date.now()}`,
      name: 'By Scrap / Other Sales',
      amount: 0
    };
    setFormData(prev => ({
      ...prev,
      customTradingCredits: [...(prev.customTradingCredits || []), newItem]
    }));
  };

  const updateTradingCreditItem = (id: string, field: 'name' | 'amount', value: any) => {
    setFormData(prev => ({
      ...prev,
      customTradingCredits: (prev.customTradingCredits || []).map(item => 
        item.id === id ? { ...item, [field]: field === 'amount' ? (Number(value) || 0) : value } : item
      )
    }));
  };

  const removeTradingCreditItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      customTradingCredits: (prev.customTradingCredits || []).filter(item => item.id !== id)
    }));
  };

  // Helper for Other Incomes (P&L Credits)
  const addOtherIncome = () => {
    const newInc: BalanceSheetOtherIncomeItem = {
      id: `inc-${Date.now()}`,
      name: 'Discount & Commission Received',
      amount: 0
    };
    setFormData(prev => ({
      ...prev,
      otherIncomes: [...prev.otherIncomes, newInc]
    }));
  };

  const updateOtherIncome = (id: string, field: 'name' | 'amount', value: any) => {
    setFormData(prev => ({
      ...prev,
      otherIncomes: prev.otherIncomes.map(inc =>
        inc.id === id ? { ...inc, [field]: field === 'amount' ? (Number(value) || 0) : value } : inc
      )
    }));
  };

  const removeOtherIncome = (id: string) => {
    setFormData(prev => ({
      ...prev,
      otherIncomes: prev.otherIncomes.filter(inc => inc.id !== id)
    }));
  };

  // Helpers for Liability Groups
  const addLiabilityGroup = (groupName = 'Unsecured Loans') => {
    const newGroup: BalanceSheetLiabilityGroup = {
      id: `grp-${Date.now()}`,
      groupName,
      items: [
        { id: `item-${Date.now()}`, name: groupName.toLowerCase().includes('loan') ? 'Credit Card Bill' : 'Sundry Creditors', amount: 0 }
      ]
    };
    setFormData(prev => ({
      ...prev,
      liabilityGroups: [...(prev.liabilityGroups || []), newGroup]
    }));
  };

  const updateLiabilityGroupName = (groupId: string, newName: string) => {
    setFormData(prev => ({
      ...prev,
      liabilityGroups: (prev.liabilityGroups || []).map(g => 
        g.id === groupId ? { ...g, groupName: newName } : g
      )
    }));
  };

  const removeLiabilityGroup = (groupId: string) => {
    setFormData(prev => ({
      ...prev,
      liabilityGroups: (prev.liabilityGroups || []).filter(g => g.id !== groupId)
    }));
  };

  const addLiabilityGroupItem = (groupId: string) => {
    const newItem: BalanceSheetCustomItem = {
      id: `liab-${Date.now()}`,
      name: 'New Liability Item',
      amount: 0
    };
    setFormData(prev => ({
      ...prev,
      liabilityGroups: (prev.liabilityGroups || []).map(g => 
        g.id === groupId ? { ...g, items: [...g.items, newItem] } : g
      )
    }));
  };

  const updateLiabilityGroupItem = (groupId: string, itemId: string, field: 'name' | 'amount', value: any) => {
    setFormData(prev => ({
      ...prev,
      liabilityGroups: (prev.liabilityGroups || []).map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map(item => 
            item.id === itemId ? { ...item, [field]: field === 'amount' ? (Number(value) || 0) : value } : item
          )
        };
      })
    }));
  };

  const removeLiabilityGroupItem = (groupId: string, itemId: string) => {
    setFormData(prev => ({
      ...prev,
      liabilityGroups: (prev.liabilityGroups || []).map(g => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.filter(item => item.id !== itemId)
        };
      })
    }));
  };

  // Helpers for Custom Current Assets
  const addCustomCurrentAsset = () => {
    const newItem: BalanceSheetCustomItem = {
      id: `asset-${Date.now()}`,
      name: 'Security Deposit / Advance',
      amount: 0
    };
    setFormData(prev => ({
      ...prev,
      customCurrentAssets: [...(prev.customCurrentAssets || []), newItem]
    }));
  };

  const updateCustomCurrentAsset = (id: string, field: 'name' | 'amount', value: any) => {
    setFormData(prev => ({
      ...prev,
      customCurrentAssets: (prev.customCurrentAssets || []).map(item => 
        item.id === id ? { ...item, [field]: field === 'amount' ? (Number(value) || 0) : value } : item
      )
    }));
  };

  const removeCustomCurrentAsset = (id: string) => {
    setFormData(prev => ({
      ...prev,
      customCurrentAssets: (prev.customCurrentAssets || []).filter(item => item.id !== id)
    }));
  };

  // Debtor helpers
  const addDebtorItem = () => {
    setFormData(prev => ({
      ...prev,
      debtors: [...prev.debtors, { id: `d-${Date.now()}`, name: 'New Trade Debtor', amount: 0 }]
    }));
  };

  const removeDebtorItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      debtors: prev.debtors.filter(d => d.id !== id)
    }));
  };

  // Loan given helpers
  const addLoanGivenItem = () => {
    setFormData(prev => ({
      ...prev,
      loansGiven: [...prev.loansGiven, { id: `lg-${Date.now()}`, name: 'Advance / Loan to Party', amount: 0 }]
    }));
  };

  const removeLoanGivenItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      loansGiven: prev.loansGiven.filter(lg => lg.id !== id)
    }));
  };

  // Quick balancing button to adjust difference into Sundry Debtors or Capital
  const balanceDifferenceTo = (target: 'debtors' | 'capital') => {
    const diff = totals.difference;
    if (Math.abs(diff) < 0.01) return;

    if (target === 'debtors') {
      // If Liabilities > Assets, diff > 0 => add diff to debtors
      // If Liabilities < Assets, diff < 0 => subtract diff from debtors
      setFormData(prev => {
        const currentDebtor = prev.debtors[0]?.amount || 0;
        const newAmt = Math.max(0, currentDebtor + diff);
        const updatedDebtors = prev.debtors.length > 0 
          ? prev.debtors.map((d, i) => i === 0 ? { ...d, amount: newAmt } : d)
          : [{ id: 'd-1', name: 'Sundry Debtors', amount: Math.max(0, diff) }];
        return { ...prev, debtors: updatedDebtors };
      });
    } else if (target === 'capital') {
      // If Assets > Liabilities, diff < 0 => add -diff to openingCapital
      setFormData(prev => ({
        ...prev,
        openingCapital: Math.max(0, prev.openingCapital - diff)
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                {formData.firmName || 'New Proprietorship Balance Sheet'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60">
                PROPRIETOR
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Editing Financial Year <span className="font-semibold text-slate-700 dark:text-slate-200">{formData.financialYear}</span> • All statements auto-calculate & tally
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onPreview(formData)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-2 cursor-pointer shadow-3xs"
          >
            <Eye className="h-4 w-4 text-slate-500" />
            <span>3-Page PDF Preview</span>
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>Save Balance Sheet</span>
          </button>
        </div>
      </div>

      {/* Live Financial Health & Tally Bar */}
      <div className={`p-4 rounded-2xl border transition-all flex flex-wrap items-center justify-between gap-4 ${
        totals.isTallied 
          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' 
          : 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${totals.isTallied ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
            {totals.isTallied ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
              {totals.isTallied ? 'Balance Sheet Tallied & Balanced' : 'Balance Sheet Out of Balance (Difference Detected)'}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Liabilities: <strong className="text-slate-800 dark:text-slate-200">₹{totals.totalLiabilities.toLocaleString('en-IN')}</strong> | 
              Assets: <strong className="text-slate-800 dark:text-slate-200">₹{totals.totalAssets.toLocaleString('en-IN')}</strong>
              {!totals.isTallied && (
                <span className="ml-2 font-bold text-rose-600 dark:text-rose-400">
                  (Diff: ₹{Math.abs(totals.difference).toLocaleString('en-IN')})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Summary Pill Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Gross Profit</span>
            <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
              ₹{totals.grossProfit.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Net Profit</span>
            <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
              ₹{totals.netProfit.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center">
            <span className="text-[9.5px] uppercase font-bold text-slate-400 block">Total Dep (Annex A)</span>
            <span className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
              ₹{totals.totalDepreciation.toLocaleString('en-IN')}
            </span>
          </div>

          {!totals.isTallied && (
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => balanceDifferenceTo('debtors')}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-3xs"
                title="Adjust difference into Sundry Debtors so Balance Sheet tallies instantly"
              >
                Auto-Tally to Debtors
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'profile'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>1. Client & CA Attestation</span>
        </button>

        <button
          onClick={() => setActiveTab('carry_forward')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'carry_forward'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <ArrowRightLeft className="h-4 w-4" />
          <span>2. Previous Year & Carry-Forward Figures</span>
          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-mono font-bold">
            Auto-Sync
          </span>
        </button>

        <button
          onClick={() => setActiveTab('depreciation')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'depreciation'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calculator className="h-4 w-4" />
          <span>3. Annexure A (Depreciation Schedule)</span>
          <span className="px-1.5 py-0.5 bg-white/20 rounded-md text-[10px] font-mono">
            {formData.depreciationSchedule.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('trading_pnl')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'trading_pnl'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>4. Trading & Profit & Loss A/c</span>
        </button>

        <button
          onClick={() => setActiveTab('balancesheet')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 shrink-0 ${
            activeTab === 'balancesheet'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Scale className="h-4 w-4" />
          <span>5. Balance Sheet (Capital & Assets)</span>
          {totals.isTallied ? (
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
          )}
        </button>
      </div>

      {/* =========================================================================
          TAB 1: CLIENT & CA ATTESTATION PROFILE
          ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Firm Setup */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              <span>Proprietorship Firm Details</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Name of Firm / Business *
                </label>
                <input
                  type="text"
                  value={formData.firmName}
                  onChange={e => setFormData({ ...formData, firmName: e.target.value.toUpperCase() })}
                  placeholder="e.g. ADIL AL LAZIZ FOOD & CO."
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Name of Proprietor *
                </label>
                <input
                  type="text"
                  value={formData.proprietorName}
                  onChange={e => setFormData({ ...formData, proprietorName: e.target.value })}
                  placeholder="e.g. Adil Lateef"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Address of the Unit / Factory / Shop *
                </label>
                <textarea
                  rows={2}
                  value={formData.unitAddress}
                  onChange={e => setFormData({ ...formData, unitAddress: e.target.value.toUpperCase() })}
                  placeholder="e.g. SHAHEEN BAGH ABUL FAZAL PART 2 NEW DELHI 110025"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs uppercase text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Financial Year
                  </label>
                  <input
                    type="text"
                    value={formData.financialYear}
                    onChange={e => setFormData({ ...formData, financialYear: e.target.value })}
                    placeholder="2025-2026"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Year Ended Date
                  </label>
                  <input
                    type="text"
                    value={formData.yearEndedDate}
                    onChange={e => setFormData({ ...formData, yearEndedDate: e.target.value })}
                    placeholder="31st March, 2026"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CA Attestation & UDIN Setup */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-500" />
                <span>CA Attestation & UDIN Details</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Prints on Bottom & Stamps</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Choose Appointed CA from Directory
                </label>
                <select
                  value={formData.caAuditorId || ''}
                  onChange={e => handleAuditorChange(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  <option value="">-- Or enter custom CA details below --</option>
                  {auditors.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.professionalType || 'CA'}) - {a.firmName} {a.frnNo ? `[FRN: ${a.frnNo}]` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    CA Firm Name
                  </label>
                  <input
                    type="text"
                    value={formData.caFirmName}
                    onChange={e => setFormData({ ...formData, caFirmName: e.target.value.toUpperCase() })}
                    placeholder="SHAARIF AND ASSOCIATES"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Firm Registration No (FRN)
                  </label>
                  <input
                    type="text"
                    value={formData.caFrn}
                    onChange={e => setFormData({ ...formData, caFrn: e.target.value.toUpperCase() })}
                    placeholder="042661N"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    CA Member Name
                  </label>
                  <input
                    type="text"
                    value={formData.caName}
                    onChange={e => setFormData({ ...formData, caName: e.target.value.toUpperCase() })}
                    placeholder="CA SHAARIF LATEEF"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Membership No.
                  </label>
                  <input
                    type="text"
                    value={formData.caMembershipNo}
                    onChange={e => setFormData({ ...formData, caMembershipNo: e.target.value })}
                    placeholder="578691"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    UDIN Number (18 Digits)
                  </label>
                  <input
                    type="text"
                    value={formData.udin}
                    onChange={e => setFormData({ ...formData, udin: e.target.value.toUpperCase() })}
                    placeholder="26578691AUSCCL3806"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold uppercase text-indigo-600 dark:text-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                    Date of Attestation
                  </label>
                  <input
                    type="text"
                    value={formData.dateOfSigning}
                    onChange={e => setFormData({ ...formData, dateOfSigning: e.target.value })}
                    placeholder="17/08/2026"
                    className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Notes on Accounts (Printed on Page 1 & 2)
                </label>
                <textarea
                  rows={2}
                  value={formData.notesOnAccounts}
                  onChange={e => setFormData({ ...formData, notesOnAccounts: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 2: PREVIOUS YEAR FIGURES & AUTO CARRY-FORWARD
          Prefilled previous figures with instant auto-forwarding:
          - Previous Year Stock -> Opening Stock in Trading Account
          - Previous Year Capital -> Opening Capital in Balance Sheet
          - Current Bank Interest -> Other Income in P&L
          - Current Year TDS -> Current Assets (TDS Receivable)
          ========================================================================= */}
      {activeTab === 'carry_forward' && (
        <div className="space-y-6">
          {/* Top Engine Banner & Quick Actions */}
          <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white rounded-3xl p-6 shadow-md border border-indigo-700/50 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-600/60 rounded-xl text-white">
                  <ArrowRightLeft className="h-5 w-5" />
                </span>
                <h3 className="text-base font-black tracking-wide uppercase">
                  Previous Year Figures & Auto Carry-Forward Engine
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-mono font-bold">
                  AUTO-FORWARD ACTIVE
                </span>
              </div>
              <p className="text-xs text-indigo-200 leading-relaxed">
                Enter or prefill prior year figures and statutory tax items. Any value entered here is automatically forwarded to its respective destination in the Trading Account, Profit & Loss Account, or Balance Sheet.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {storedSheets.length > 0 && (
                <div className="flex items-center gap-1.5 bg-white/10 px-3 py-2 rounded-xl border border-white/15">
                  <History className="h-4 w-4 text-indigo-300" />
                  <select
                    onChange={e => {
                      if (e.target.value) handleFetchFromPastRecord(e.target.value);
                    }}
                    defaultValue=""
                    className="bg-transparent text-xs text-white font-medium outline-none cursor-pointer"
                  >
                    <option value="" disabled className="text-slate-900">Auto-Fetch from Saved Balance Sheet...</option>
                    {storedSheets.map(s => (
                      <option key={s.id} value={s.id} className="text-slate-900">
                        {s.firmName} ({s.financialYear})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="button"
                onClick={handleReapplyAllForwarded}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                title="Re-push and sync all 4 values to their respective sections"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Re-Sync All Figures</span>
              </button>
            </div>
          </div>

          {/* 4 Interactive Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Previous Year Closing Stock */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-black">
                    01
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-100">
                      Previous Closing Stock
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Closing Inventory of Previous Financial Year
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Trading A/c
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Previous Closing Stock Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={formData.prevClosingStock ?? formData.openingStock ?? 0}
                    onChange={e => handlePrevClosingStockChange(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Forward Destination Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Forwarded Destination</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Trading A/c → <strong className="text-emerald-600 dark:text-emerald-400">To Opening Stock</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  ₹{(formData.openingStock || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Card 2: Previous Year Capital Balance */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-black">
                    02
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-100">
                      Previous Capital Balance
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Net Closing Proprietor Capital of Previous Year
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                  Balance Sheet
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Previous Capital Balance Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={formData.prevCapitalBalance ?? formData.openingCapital ?? 0}
                    onChange={e => handlePrevCapitalBalanceChange(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-white focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Forward Destination Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Forwarded Destination</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Balance Sheet → <strong className="text-emerald-600 dark:text-emerald-400">Opening Capital</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  ₹{(formData.openingCapital || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Card 3: Current Year Bank Interest */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-black">
                    03
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-100">
                      Current Bank Interest
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Savings / FD Interest received during the Financial Year
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                  P&L Other Income
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Current Bank Interest Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={formData.currentBankInterest ?? 0}
                    onChange={e => handleCurrentBankInterestChange(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-white focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Forward Destination Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Forwarded Destination</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      P&L Account → <strong className="text-emerald-600 dark:text-emerald-400">By Other Income (Bank Interest)</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  ₹{(formData.currentBankInterest || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Card 4: Current Year TDS */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-black">
                    04
                  </div>
                  <div>
                    <h4 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-100">
                      Current Year TDS (Tax Deducted at Source)
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      TDS as per 26AS / AIS for Current Assessment Year
                    </p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                  Current Assets
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[10.5px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Current Year TDS Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={formData.currentYearTds ?? 0}
                    onChange={e => handleCurrentYearTdsChange(Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm font-bold font-mono text-slate-900 dark:text-white focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Forward Destination Banner */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <ArrowRight className="h-4 w-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-[10.5px] uppercase font-bold text-slate-400 block">Forwarded Destination</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Balance Sheet Assets → <strong className="text-emerald-600 dark:text-emerald-400">TDS Receivable / Advance Tax</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  ₹{(formData.currentYearTds || 0).toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail & Forwarding Verification Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>Forwarding Verification & Ledger Sync Matrix</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Previous Stock → Opening Stock</div>
                <div className="text-sm font-mono font-bold text-slate-800 dark:text-white">
                  ₹{(formData.openingStock || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="h-3 w-3" /> Synced in Trading A/c
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Previous Capital → Opening Capital</div>
                <div className="text-sm font-mono font-bold text-slate-800 dark:text-white">
                  ₹{(formData.openingCapital || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="h-3 w-3" /> Synced in Balance Sheet
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Bank Interest → Other Income</div>
                <div className="text-sm font-mono font-bold text-slate-800 dark:text-white">
                  ₹{(formData.currentBankInterest || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="h-3 w-3" /> Synced in P&L Other Income
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                <div className="text-[10px] uppercase font-bold text-slate-400">Current TDS → Current Assets</div>
                <div className="text-sm font-mono font-bold text-slate-800 dark:text-white">
                  ₹{(formData.currentYearTds || 0).toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                  <Check className="h-3 w-3" /> Synced in Current Assets
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ANNEXURE A (DEPRECIATION SCHEDULE)
          ========================================================================= */}
      {activeTab === 'depreciation' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-amber-500" />
                <span>Annexure A: Depreciation Schedule (As per Income Tax Act)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Formula: Total = WDV Opening + Addition • Depreciation = Total × Rate% • Closing WDV = Total - Dep
              </p>
            </div>
            <button
              onClick={addScheduleItem}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Add Asset
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 dark:text-slate-400 uppercase text-[10px]">
                  <th className="p-2 w-8">#</th>
                  <th className="p-2 min-w-[200px]">Particulars (Asset Name)</th>
                  <th className="p-2 min-w-[130px] text-right">Opening WDV (₹)</th>
                  <th className="p-2 min-w-[130px] text-right">Addition (₹)</th>
                  <th className="p-2 min-w-[100px] text-center">Rate (%)</th>
                  <th className="p-2 min-w-[120px] text-right">Total (₹)</th>
                  <th className="p-2 min-w-[120px] text-right text-indigo-600 dark:text-indigo-400">Depreciation (₹)</th>
                  <th className="p-2 min-w-[130px] text-right text-emerald-600 dark:text-emerald-400">Closing WDV (₹)</th>
                  <th className="p-2 w-10 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {formData.depreciationSchedule.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                    <td className="p-2 font-mono text-slate-400">{idx + 1}</td>
                    <td className="p-2">
                      <input
                        type="text"
                        value={item.particulars}
                        onChange={e => updateScheduleItem(item.id, 'particulars', e.target.value)}
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        value={item.wdvOpening || ''}
                        onChange={e => updateScheduleItem(item.id, 'wdvOpening', Number(e.target.value))}
                        placeholder="0"
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-right"
                      />
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        value={item.addition || ''}
                        onChange={e => updateScheduleItem(item.id, 'addition', Number(e.target.value))}
                        placeholder="0"
                        className="w-full p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-right"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <select
                        value={item.ratePercent}
                        onChange={e => updateScheduleItem(item.id, 'ratePercent', Number(e.target.value))}
                        className="p-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-center cursor-pointer"
                      >
                        <option value={10}>10% (Furniture)</option>
                        <option value={15}>15% (Vehicle/Plant)</option>
                        <option value={40}>40% (Computers)</option>
                        <option value={60}>60% (Software/Tech)</option>
                        <option value={0}>0% (Nil)</option>
                      </select>
                    </td>
                    <td className="p-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                      ₹{item.total?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      ₹{item.depreciation?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      ₹{item.wdvClosing?.toLocaleString('en-IN') || 0}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => removeScheduleItem(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition"
                        title="Delete Asset"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}

                {/* Grand Total Row */}
                <tr className="bg-slate-50 dark:bg-slate-800/60 font-black text-xs">
                  <td className="p-2.5" colSpan={2}>
                    TOTAL (Round Off)
                  </td>
                  <td className="p-2.5 text-right font-mono">
                    ₹{totals.schedule.reduce((s, i) => s + (Number(i.wdvOpening) || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-right font-mono">
                    ₹{totals.schedule.reduce((s, i) => s + (Number(i.addition) || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-center text-slate-400">-</td>
                  <td className="p-2.5 text-right font-mono">
                    ₹{totals.schedule.reduce((s, i) => s + (Number(i.total) || 0), 0).toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-right font-mono text-indigo-600 dark:text-indigo-400 text-sm">
                    ₹{totals.totalDepreciation.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2.5 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                    ₹{totals.totalClosingWDV.toLocaleString('en-IN')}
                  </td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900 rounded-2xl text-xs text-indigo-900 dark:text-indigo-300 flex items-center justify-between">
            <span>
              ℹ️ <strong>Auto-Link Active:</strong> Total Depreciation (₹{totals.totalDepreciation.toLocaleString('en-IN')}) is already debited to Profit & Loss Account, and Net Closing WDV (₹{totals.totalClosingWDV.toLocaleString('en-IN')}) is placed under Fixed Assets on the Balance Sheet.
            </span>
            <button
              onClick={() => setActiveTab('trading_pnl')}
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition text-xs cursor-pointer shrink-0"
            >
              Next: Trading & P&L →
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: TRADING & PROFIT & LOSS ACCOUNT
          ========================================================================= */}
      {activeTab === 'trading_pnl' && (
        <div className="space-y-6">
          {/* 1. TRADING ACCOUNT CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-500" />
                <span>Trading Account (Gross Profit Computation)</span>
              </h3>
              <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800 rounded-xl text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                Gross Profit C/d: ₹{totals.grossProfit.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Debit Side: Direct Costs */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400">Debit (Costs & Stock)</h4>
                
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">To Opening Stock (₹)</label>
                  <input
                    type="number"
                    value={formData.openingStock || ''}
                    onChange={e => setFormData({ ...formData, openingStock: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">To Total Purchases (₹)</label>
                  <input
                    type="number"
                    value={formData.purchases || ''}
                    onChange={e => setFormData({ ...formData, purchases: Number(e.target.value) || 0 })}
                    placeholder="e.g. 6373691"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">To Direct / Manufacturing Exp (₹)</label>
                  <input
                    type="number"
                    value={formData.directExpenses || ''}
                    onChange={e => setFormData({ ...formData, directExpenses: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Additional Debit Items */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Additional Debit Items</span>
                    <button
                      type="button"
                      onClick={addTradingDebitItem}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Debit Item
                    </button>
                  </div>
                  {(formData.customTradingDebits || []).map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => updateTradingDebitItem(item.id, 'name', e.target.value)}
                        placeholder="e.g. To Wages / Freight"
                        className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                      />
                      <input
                        type="number"
                        value={item.amount || ''}
                        onChange={e => updateTradingDebitItem(item.id, 'amount', e.target.value)}
                        placeholder="0"
                        className="w-28 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => removeTradingDebitItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credit Side: Revenue & Closing Stock */}
              <div className="p-4 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-500 dark:text-slate-400">Credit (Sales & Stock)</h4>
                
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">By Total Sales Turnover (₹)</label>
                  <input
                    type="number"
                    value={formData.sales || ''}
                    onChange={e => setFormData({ ...formData, sales: Number(e.target.value) || 0 })}
                    placeholder="e.g. 10722819"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">By Closing Stock (₹)</label>
                  <input
                    type="number"
                    value={formData.closingStock || ''}
                    onChange={e => setFormData({ ...formData, closingStock: Number(e.target.value) || 0 })}
                    placeholder="e.g. 685000"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="text-[9.5px] text-slate-400">Auto-transfers to Balance Sheet Current Assets</span>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Deposit / Other Direct Credit (₹)</label>
                  <input
                    type="number"
                    value={formData.depositOrOtherCredit || ''}
                    onChange={e => setFormData({ ...formData, depositOrOtherCredit: Number(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Additional Credit Items */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Additional Credit Items</span>
                    <button
                      type="button"
                      onClick={addTradingCreditItem}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Credit Item
                    </button>
                  </div>
                  {(formData.customTradingCredits || []).map(item => (
                    <div key={item.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={item.name}
                        onChange={e => updateTradingCreditItem(item.id, 'name', e.target.value)}
                        placeholder="e.g. By Scrap Sales"
                        className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                      />
                      <input
                        type="number"
                        value={item.amount || ''}
                        onChange={e => updateTradingCreditItem(item.id, 'amount', e.target.value)}
                        placeholder="0"
                        className="w-28 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => removeTradingCreditItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 2. PROFIT & LOSS ACCOUNT CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-500" />
                  <span>Profit & Loss Account (Indirect Expenses & Net Profit)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Gross Profit B/d is ₹{totals.grossProfit.toLocaleString('en-IN')}
                </p>
              </div>

              <div className="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                Net Profit: ₹{totals.netProfit.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Indirect Expenses List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase text-slate-500">Indirect Expenses List</h4>
                  <button
                    onClick={addExpense}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Expense Line
                  </button>
                </div>

                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {formData.indirectExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={exp.name}
                        onChange={e => updateExpense(exp.id, 'name', e.target.value)}
                        placeholder="Expense Name"
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                      />
                      <input
                        type="number"
                        value={exp.amount || ''}
                        onChange={e => updateExpense(exp.id, 'amount', e.target.value)}
                        placeholder="0"
                        className="w-32 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                      />
                      <button
                        onClick={() => removeExpense(exp.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Auto-Linked Depreciation row */}
                  <div className="flex items-center gap-2 p-2 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/50 rounded-xl text-xs">
                    <span className="flex-1 font-bold text-amber-900 dark:text-amber-200">
                      To Depreciation (As per Annexure A)
                    </span>
                    <span className="font-mono font-bold text-amber-800 dark:text-amber-300">
                      ₹{totals.totalDepreciation.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Other Incomes & Summary */}
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-xs uppercase text-slate-500">Other Incomes (Credits)</h4>
                    <button
                      type="button"
                      onClick={addOtherIncome}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Income Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {formData.otherIncomes.map((inc) => (
                      <div key={inc.id} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={inc.name}
                          onChange={e => updateOtherIncome(inc.id, 'name', e.target.value)}
                          placeholder="Income source"
                          className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                        />
                        <input
                          type="number"
                          value={inc.amount || ''}
                          onChange={e => updateOtherIncome(inc.id, 'amount', e.target.value)}
                          placeholder="0"
                          className="w-32 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                        />
                        <button
                          type="button"
                          onClick={() => removeOtherIncome(inc.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Delete Income"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Calculation Summary Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Gross Profit B/d:</span>
                    <span className="font-mono font-semibold">₹{totals.grossProfit.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Total Other Income:</span>
                    <span className="font-mono font-semibold">₹{totals.totalOtherIncome.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Total Indirect Expenses (inc. Dep):</span>
                    <span className="font-mono font-semibold">₹{totals.totalIndirectExpenses.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-black text-sm text-emerald-600 dark:text-emerald-400">
                    <span>Net Profit Transferred to Capital:</span>
                    <span className="font-mono">₹{totals.netProfit.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setActiveTab('balancesheet')}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition text-xs cursor-pointer"
                  >
                    Next: Balance Sheet (Capital & Assets) →
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: BALANCE SHEET LIABILITIES & ASSETS
          ========================================================================= */}
      {activeTab === 'balancesheet' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LIABILITIES SIDE */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Scale className="h-4 w-4 text-indigo-500" />
                  <span>Liabilities & Capital</span>
                </h3>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  Total: ₹{totals.totalLiabilities.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Capital Account Calculation */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                <span className="font-bold text-xs uppercase text-slate-500 block">Proprietor Capital Account</span>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Opening Balance (₹)</label>
                    <input
                      type="number"
                      value={formData.openingCapital || ''}
                      onChange={e => setFormData({ ...formData, openingCapital: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Addition during year (₹)</label>
                    <input
                      type="number"
                      value={formData.additionDuringYear || ''}
                      onChange={e => setFormData({ ...formData, additionDuringYear: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                      Add: Net Profit (Auto from P&L)
                    </label>
                    <div className="w-full p-2 bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-mono font-bold text-emerald-700 dark:text-emerald-300">
                      ₹{totals.netProfit.toLocaleString('en-IN')}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-rose-500 block mb-1">Less: Drawings (₹)</label>
                    <input
                      type="number"
                      value={formData.drawings || ''}
                      onChange={e => setFormData({ ...formData, drawings: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-semibold text-rose-600 dark:text-rose-400"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between font-black text-xs text-slate-800 dark:text-slate-100">
                  <span>Closing Capital:</span>
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{totals.netCapital.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Liabilities Groups & Items (Unsecured Loans, Current Liabilities, etc.) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4">
                  <div>
                    <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-200 block">
                      Liabilities & Loans Groups
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Add groups (e.g. Unsecured Loans, Current Liabilities) and items under each group
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => addLiabilityGroup('Unsecured Loans')}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Liability Group
                  </button>
                </div>

                <div className="space-y-4">
                  {(formData.liabilityGroups || []).map((group) => {
                    const groupTotal = group.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
                    return (
                      <div key={group.id} className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 flex items-center gap-2">
                            <span className="text-[10px] uppercase font-black text-slate-500 bg-white dark:bg-slate-900 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800">
                              Group
                            </span>
                            <input
                              type="text"
                              value={group.groupName}
                              onChange={e => updateLiabilityGroupName(group.id, e.target.value)}
                              placeholder="e.g. Unsecured Loans / Current Liabilities"
                              className="flex-1 p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-100"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                              ₹{groupTotal.toLocaleString('en-IN')}
                            </span>
                            <button
                              type="button"
                              onClick={() => addLiabilityGroupItem(group.id)}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                              title="Add Item to this Group"
                            >
                              <Plus className="h-3 w-3" /> Add Item
                            </button>
                            <button
                              type="button"
                              onClick={() => removeLiabilityGroup(group.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete Group"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Group Items */}
                        <div className="space-y-2 pl-2 border-l-2 border-indigo-200 dark:border-indigo-800">
                          {group.items.map((item) => (
                            <div key={item.id} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={e => updateLiabilityGroupItem(group.id, item.id, 'name', e.target.value)}
                                placeholder="e.g. Credit Card Bill"
                                className="flex-1 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                              />
                              <input
                                type="number"
                                value={item.amount || ''}
                                onChange={e => updateLiabilityGroupItem(group.id, item.id, 'amount', e.target.value)}
                                placeholder="0"
                                className="w-32 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                              />
                              <button
                                type="button"
                                onClick={() => removeLiabilityGroupItem(group.id, item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ASSETS SIDE */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-500" />
                  <span>Assets & Properties</span>
                </h3>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                  Total: ₹{totals.totalAssets.toLocaleString('en-IN')}
                </span>
              </div>

              {/* Fixed Assets (Annexure A) */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs uppercase text-slate-700 dark:text-slate-200 block">
                    Fixed Assets (As per Annexure A)
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Auto-computed from Depreciation Schedule
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-mono font-black text-indigo-600 dark:text-indigo-400">
                    ₹{totals.fixedAssets.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Current Assets */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs uppercase text-slate-500 block">Current Assets</span>
                  <button
                    type="button"
                    onClick={addDebtorItem}
                    className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Debtor
                  </button>
                </div>

                {/* Sundry Debtors */}
                {formData.debtors.map((d) => (
                  <div key={d.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={d.name}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          debtors: prev.debtors.map(i => i.id === d.id ? { ...i, name: val } : i)
                        }));
                      }}
                      className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                    />
                    <input
                      type="number"
                      value={d.amount || ''}
                      onChange={e => {
                        const val = Number(e.target.value) || 0;
                        setFormData(prev => ({
                          ...prev,
                          debtors: prev.debtors.map(i => i.id === d.id ? { ...i, amount: val } : i)
                        }));
                      }}
                      className="w-32 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => removeDebtorItem(d.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                      title="Delete Debtor"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                {/* Closing Stock */}
                <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300">Closing Stock (From Trading)</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    ₹{totals.closingStockAsset.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Cash in Hand & Cash at Bank */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Cash in Hand (₹)</label>
                    <input
                      type="number"
                      value={formData.cashInHand || ''}
                      onChange={e => setFormData({ ...formData, cashInHand: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Cash at Bank (₹)</label>
                    <input
                      type="number"
                      value={formData.cashAtBank || ''}
                      onChange={e => setFormData({ ...formData, cashAtBank: Number(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                    />
                  </div>
                </div>

                {/* Loans Given */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Loans & Advances / Loans Given</span>
                    <button
                      type="button"
                      onClick={addLoanGivenItem}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Loan/Advance
                    </button>
                  </div>
                  {formData.loansGiven.map((lg) => (
                    <div key={lg.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={lg.name}
                        onChange={e => {
                          const val = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            loansGiven: prev.loansGiven.map(i => i.id === lg.id ? { ...i, name: val } : i)
                          }));
                        }}
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                      />
                      <input
                        type="number"
                        value={lg.amount || ''}
                        onChange={e => {
                          const val = Number(e.target.value) || 0;
                          setFormData(prev => ({
                            ...prev,
                            loansGiven: prev.loansGiven.map(i => i.id === lg.id ? { ...i, amount: val } : i)
                          }));
                        }}
                        className="w-32 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => removeLoanGivenItem(lg.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Loan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Custom Current Assets */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Other Current Assets / Deposits & Advances
                    </span>
                    <button
                      type="button"
                      onClick={addCustomCurrentAsset}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-3 w-3" /> Add Current Asset Item
                    </button>
                  </div>
                  {(formData.customCurrentAssets || []).map((ca) => (
                    <div key={ca.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={ca.name}
                        onChange={e => updateCustomCurrentAsset(ca.id, 'name', e.target.value)}
                        placeholder="e.g. Security Deposit / GST ITC Balance"
                        className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium"
                      />
                      <input
                        type="number"
                        value={ca.amount || ''}
                        onChange={e => updateCustomCurrentAsset(ca.id, 'amount', e.target.value)}
                        placeholder="0"
                        className="w-32 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono text-right font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => removeCustomCurrentAsset(ca.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
