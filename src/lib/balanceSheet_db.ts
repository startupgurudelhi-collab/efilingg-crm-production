/**
 * Balance Sheet Preparation Database & Calculations Engine
 * Specially designed for Indian Proprietorship entities
 */

import { getV2Auditors } from './v2_db';

export interface BalanceSheetAssetItem {
  id: string;
  particulars: string;
  wdvOpening: number;
  addition: number;
  ratePercent: number;
  total: number;
  depreciation: number;
  wdvClosing: number;
}

export interface BalanceSheetIndirectExpenseItem {
  id: string;
  name: string;
  amount: number;
}

export interface BalanceSheetOtherIncomeItem {
  id: string;
  name: string;
  amount: number;
}

export interface BalanceSheetCreditorItem {
  id: string;
  name: string;
  amount: number;
}

export interface BalanceSheetLoanItem {
  id: string;
  name: string;
  amount: number;
}

export interface BalanceSheetDebtorItem {
  id: string;
  name: string;
  amount: number;
}

export interface BalanceSheetLoanGivenItem {
  id: string;
  name: string;
  amount: number;
}

export interface BalanceSheetBankItem {
  id: string;
  name: string;
  amount: number;
}

export interface BalanceSheetCustomItem {
  id: string;
  name: string;
  amount: number;
}

export interface BalanceSheetLiabilityGroup {
  id: string;
  groupName: string;
  items: BalanceSheetCustomItem[];
}

export interface BalanceSheetRecord {
  id: string;
  firmName: string;
  proprietorName: string;
  unitAddress: string;
  financialYear: string;   // e.g. "2025-2026"
  assessmentYear: string;  // e.g. "2026-2027"
  yearEndedDate: string;   // e.g. "31st March, 2026"

  // CA Attestation Details
  caAuditorId?: string;
  caFirmName: string;
  caFirmType: string;      // e.g. "(Chartered Accountant)"
  caFrn: string;           // e.g. "042661N"
  caName: string;          // e.g. "CA SHAARIF LATEEF"
  caDesignation: string;   // e.g. "Proprietor"
  caMembershipNo: string;  // e.g. "578691"
  udin: string;            // e.g. "26578691AUSCCL3806"
  dateOfSigning: string;   // e.g. "17/08/2026"
  notesOnAccounts: string; // Standard CA compilation note

  // Previous Year & Carry-Forward Figures (Opening Balances & Sync)
  prevClosingStock?: number;       // Forwarded to Opening Stock in Trading Account
  prevCapitalBalance?: number;     // Forwarded to Opening Capital in Balance Sheet
  currentBankInterest?: number;    // Forwarded to Other Income in P&L Account
  currentYearTds?: number;         // Forwarded to Current Assets / TDS Receivable in Balance Sheet

  // Trading Account
  openingStock: number;
  purchases: number;
  directExpenses: number;
  customTradingDebits?: BalanceSheetCustomItem[];
  sales: number;
  closingStock: number;
  depositOrOtherCredit: number;
  customTradingCredits?: BalanceSheetCustomItem[];

  // Profit & Loss Account
  indirectExpenses: BalanceSheetIndirectExpenseItem[];
  otherIncomes: BalanceSheetOtherIncomeItem[];

  // Capital Account (Liabilities)
  openingCapital: number;
  additionDuringYear: number;
  drawings: number;

  // Current Liabilities & Groups (e.g. Unsecured Loans -> Credit Card Bill)
  creditors: BalanceSheetCreditorItem[];
  unsecuredLoans: BalanceSheetLoanItem[];
  otherLiabilities: { id: string; name: string; amount: number }[];
  liabilityGroups?: BalanceSheetLiabilityGroup[];

  // Current Assets & Cash
  debtors: BalanceSheetDebtorItem[];
  cashInHand: number;
  cashAtBank: number;
  bankAccounts: BalanceSheetBankItem[];
  loansGiven: BalanceSheetLoanGivenItem[];
  otherAssets: { id: string; name: string; amount: number }[];
  customCurrentAssets?: BalanceSheetCustomItem[];

  // Annexure A: Depreciation Schedule
  depreciationSchedule: BalanceSheetAssetItem[];

  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'EFILINGG_PROPRIETOR_BALANCE_SHEETS';

/**
 * Recalculates all dependent math fields:
 * - Annexure A: Total, Dep, Closing WDV
 * - Trading: Gross Profit C/d
 * - P&L: Total Dep, Net Profit
 * - Capital: Closing Capital
 * - Total Liabilities, Total Assets, Difference
 */
export function calculateBalanceSheetTotals(bs: BalanceSheetRecord) {
  // 1. Depreciation Schedule calculations
  const schedule = bs.depreciationSchedule.map(item => {
    const total = (Number(item.wdvOpening) || 0) + (Number(item.addition) || 0);
    const dep = Math.round(total * ((Number(item.ratePercent) || 0) / 100));
    const wdvClosing = total - dep;
    return {
      ...item,
      total,
      depreciation: dep,
      wdvClosing
    };
  });

  const totalDepreciation = schedule.reduce((sum, item) => sum + (Number(item.depreciation) || 0), 0);
  const totalClosingWDV = schedule.reduce((sum, item) => sum + (Number(item.wdvClosing) || 0), 0);

  // 2. Trading Account calculations
  const customTradingDebitTotal = (bs.customTradingDebits || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
  const customTradingCreditTotal = (bs.customTradingCredits || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const totalTradingCredit = (Number(bs.sales) || 0) + (Number(bs.closingStock) || 0) + (Number(bs.depositOrOtherCredit) || 0) + customTradingCreditTotal;
  const totalTradingDebitExclGP = (Number(bs.openingStock) || 0) + (Number(bs.purchases) || 0) + (Number(bs.directExpenses) || 0) + customTradingDebitTotal;
  const grossProfit = totalTradingCredit - totalTradingDebitExclGP;
  const tradingGrandTotal = Math.max(totalTradingCredit, totalTradingDebitExclGP + grossProfit);

  // 3. P&L Account calculations
  const totalIndirectExpensesWithoutDep = bs.indirectExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalIndirectExpenses = totalIndirectExpensesWithoutDep + totalDepreciation;
  const totalOtherIncome = bs.otherIncomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const totalPnLCredit = grossProfit + totalOtherIncome;
  const netProfit = totalPnLCredit - totalIndirectExpenses;
  const pnlGrandTotal = totalPnLCredit;

  // 4. Capital Account & Liabilities
  const netCapital = (Number(bs.openingCapital) || 0) + (Number(bs.additionDuringYear) || 0) + netProfit - (Number(bs.drawings) || 0);

  const totalCreditors = (bs.creditors || []).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
  const totalUnsecuredLoans = (bs.unsecuredLoans || []).reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
  const totalOtherLiabilities = (bs.otherLiabilities || []).reduce((sum, ol) => sum + (Number(ol.amount) || 0), 0);

  // Calculate liability groups sum if available, otherwise use creditors + unsecured + other
  let totalLiabilityGroups = 0;
  if (bs.liabilityGroups && bs.liabilityGroups.length > 0) {
    totalLiabilityGroups = bs.liabilityGroups.reduce((gSum, g) => 
      gSum + (g.items || []).reduce((iSum, it) => iSum + (Number(it.amount) || 0), 0), 0);
  } else {
    totalLiabilityGroups = totalCreditors + totalUnsecuredLoans + totalOtherLiabilities;
  }

  const totalLiabilities = netCapital + totalLiabilityGroups;

  // 5. Assets (Balance Sheet Assets)
  const fixedAssets = totalClosingWDV;
  const totalDebtors = (bs.debtors || []).reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const closingStockAsset = Number(bs.closingStock) || 0;
  const cashInHand = Number(bs.cashInHand) || 0;
  const cashAtBank = Number(bs.cashAtBank) || 0;
  const totalLoansGiven = (bs.loansGiven || []).reduce((sum, lg) => sum + (Number(lg.amount) || 0), 0);
  const totalOtherAssets = (bs.otherAssets || []).reduce((sum, oa) => sum + (Number(oa.amount) || 0), 0);
  const totalCustomCurrentAssets = (bs.customCurrentAssets || []).reduce((sum, ca) => sum + (Number(ca.amount) || 0), 0);

  const totalAssets = fixedAssets + totalDebtors + closingStockAsset + cashInHand + cashAtBank + totalLoansGiven + totalOtherAssets + totalCustomCurrentAssets;
  const difference = totalLiabilities - totalAssets;
  const isTallied = Math.abs(difference) < 0.01;

  return {
    schedule,
    totalDepreciation,
    totalClosingWDV,
    grossProfit,
    tradingGrandTotal,
    totalIndirectExpensesWithoutDep,
    totalIndirectExpenses,
    totalOtherIncome,
    netProfit,
    pnlGrandTotal,
    netCapital,
    totalCreditors,
    totalUnsecuredLoans,
    totalOtherLiabilities,
    totalLiabilityGroups,
    totalLiabilities,
    fixedAssets,
    totalDebtors,
    closingStockAsset,
    cashInHand,
    cashAtBank,
    totalLoansGiven,
    totalOtherAssets,
    totalCustomCurrentAssets,
    totalAssets,
    difference,
    isTallied
  };
}

/**
 * Ensures liability groups are always populated and synced for edit and print
 */
export function ensureLiabilityGroups(bs: BalanceSheetRecord): BalanceSheetLiabilityGroup[] {
  if (bs.liabilityGroups && bs.liabilityGroups.length > 0) {
    return bs.liabilityGroups;
  }
  const groups: BalanceSheetLiabilityGroup[] = [];
  if (bs.creditors && bs.creditors.length > 0) {
    groups.push({
      id: 'grp-creditors',
      groupName: 'Current Liabilities & Provisions',
      items: bs.creditors.map(c => ({ id: c.id, name: c.name, amount: c.amount }))
    });
  }
  if (bs.unsecuredLoans && bs.unsecuredLoans.length > 0) {
    groups.push({
      id: 'grp-unsecured',
      groupName: 'Unsecured Loans',
      items: bs.unsecuredLoans.map(l => ({ id: l.id, name: l.name, amount: l.amount }))
    });
  }
  if (bs.otherLiabilities && bs.otherLiabilities.length > 0) {
    groups.push({
      id: 'grp-other',
      groupName: 'Other Liabilities',
      items: bs.otherLiabilities.map(o => ({ id: o.id, name: o.name, amount: o.amount }))
    });
  }
  if (groups.length === 0) {
    groups.push(
      {
        id: 'grp-unsecured',
        groupName: 'Unsecured Loans',
        items: [
          { id: `item-cc-1`, name: 'Credit Card Bill', amount: 0 }
        ]
      },
      {
        id: 'grp-cl',
        groupName: 'Current Liabilities & Provisions',
        items: [
          { id: `item-sc-1`, name: 'Sundry Creditors', amount: 0 }
        ]
      }
    );
  }
  return groups;
}

/**
 * Creates the exact initial sample record from the user's uploaded PDF
 */
export function createSampleProprietorBalanceSheet(): BalanceSheetRecord {
  return {
    id: 'bs_sample_adil_food',
    firmName: 'ADIL AL LAZIZ FOOD & CO.',
    proprietorName: 'Adil Lateef',
    unitAddress: 'SHAHEEN BAGH ABUL FAZAL PART 2 NEW DELHI 110025',
    financialYear: '2025-2026',
    assessmentYear: '2026-2027',
    yearEndedDate: '31st March, 2026',

    // CA Attestation Details
    caAuditorId: '',
    caFirmName: 'SHAARIF AND ASSOCIATES',
    caFirmType: '(Chartered Accountant)',
    caFrn: '042661N',
    caName: 'CA SHAARIF LATEEF',
    caDesignation: 'Proprietor',
    caMembershipNo: '578691',
    udin: '26578691AUSCCL3806',
    dateOfSigning: '17/08/2026',
    notesOnAccounts: 'We have compiled Balance sheet and Profit loss A/c as per Documents and information provided to us by the assesse.',

    // Previous Year & Carry-Forward Figures
    prevClosingStock: 0,
    prevCapitalBalance: 664450,
    currentBankInterest: 4512,
    currentYearTds: 0,

    // Trading Account
    openingStock: 0,
    purchases: 6373691,
    directExpenses: 0,
    customTradingDebits: [],
    sales: 10722819,
    closingStock: 685000,
    depositOrOtherCredit: 0,
    customTradingCredits: [],

    // Profit & Loss Account
    indirectExpenses: [
      { id: 'exp-1', name: 'Salary & Wages', amount: 690400 },
      { id: 'exp-2', name: 'Cleaning Expense', amount: 248520 },
      { id: 'exp-3', name: 'Marketing & Advertisement Expenses', amount: 454200 },
      { id: 'exp-4', name: 'Transportation Expenses', amount: 385800 },
      { id: 'exp-5', name: 'Electricity & Water Charges', amount: 250580 },
      { id: 'exp-6', name: 'Repairs & Maintenance', amount: 465200 },
      { id: 'exp-7', name: 'Printing and Stationery', amount: 195200 },
      { id: 'exp-8', name: 'Shop Rent', amount: 580000 },
      { id: 'exp-9', name: 'Accounting Charges', amount: 10000 },
      { id: 'exp-10', name: 'Telephone & Mobile Exp.', amount: 13650 },
      { id: 'exp-11', name: 'Festival Celebration Exp', amount: 194690 },
      { id: 'exp-12', name: 'Staff Welfare', amount: 281500 },
      { id: 'exp-13', name: 'Miscellaneous Expenses', amount: 195740 }
    ],
    otherIncomes: [
      { id: 'inc-1', name: 'Interest Income', amount: 4512 }
    ],

    // Capital Account
    openingCapital: 664450,
    additionDuringYear: 0,
    drawings: 148500,

    // Current Liabilities & Groups
    creditors: [
      { id: 'c-1', name: 'Sundry Creditors', amount: 246500 }
    ],
    unsecuredLoans: [
      { id: 'l-1', name: 'Loan taken from family and Friends', amount: 315000 }
    ],
    otherLiabilities: [],
    liabilityGroups: [
      {
        id: 'grp-creditors',
        groupName: 'Current Liabilities & Provisions',
        items: [
          { id: 'c-1', name: 'Sundry Creditors', amount: 246500 }
        ]
      },
      {
        id: 'grp-unsecured',
        groupName: 'Unsecured Loans',
        items: [
          { id: 'l-1', name: 'Loan taken from family and Friends', amount: 315000 }
        ]
      }
    ],

    // Current Assets
    debtors: [
      { id: 'd-1', name: 'Sundry Debtors', amount: 547010 }
    ],
    cashInHand: 182000,
    cashAtBank: 148500,
    bankAccounts: [
      { id: 'b-1', name: 'Current A/c', amount: 148500 }
    ],
    loansGiven: [
      { id: 'lg-1', name: 'Loan given from family and Friends', amount: 588100 }
    ],
    otherAssets: [],
    customCurrentAssets: [],

    // Annexure A: Depreciation Schedule (Page 3 of user PDF)
    depreciationSchedule: [
      {
        id: 'asset-1',
        particulars: 'Furniture & Fixtures',
        wdvOpening: 0,
        addition: 40000,
        ratePercent: 10,
        total: 40000,
        depreciation: 4000,
        wdvClosing: 36000
      },
      {
        id: 'asset-2',
        particulars: 'Computer & Printer',
        wdvOpening: 0,
        addition: 0,
        ratePercent: 40,
        total: 0,
        depreciation: 0,
        wdvClosing: 0
      },
      {
        id: 'asset-3',
        particulars: 'SCOOTY',
        wdvOpening: 0,
        addition: 0,
        ratePercent: 15,
        total: 0,
        depreciation: 0,
        wdvClosing: 0
      },
      {
        id: 'asset-4',
        particulars: 'Mobile',
        wdvOpening: 0,
        addition: 0,
        ratePercent: 15,
        total: 0,
        depreciation: 0,
        wdvClosing: 0
      }
    ],

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Creates a blank new Proprietorship Balance Sheet with standard default items
 */
export function createBlankProprietorBalanceSheet(firmName: string, proprietorName: string, unitAddress: string): BalanceSheetRecord {
  // Try to pick first CA auditor if available
  const auditors = getV2Auditors();
  const ca = auditors.find(a => a.professionalType === 'CA') || auditors[0];

  return {
    id: `bs_${Date.now()}`,
    firmName: firmName.trim() || 'NEW PROPRIETORSHIP FIRM',
    proprietorName: proprietorName.trim() || 'Proprietor Name',
    unitAddress: unitAddress.trim() || 'Business Unit Address, Delhi - 110001',
    financialYear: '2025-2026',
    assessmentYear: '2026-2027',
    yearEndedDate: '31st March, 2026',

    caAuditorId: ca?.id || '',
    caFirmName: ca?.firmName || 'CHARTERED ACCOUNTANTS & CO.',
    caFirmType: '(Chartered Accountant)',
    caFrn: ca?.frnNo || '012345N',
    caName: ca ? `CA ${ca.name}` : 'CA AUTHORIZED AUDITOR',
    caDesignation: 'Proprietor',
    caMembershipNo: ca?.membershipNo || '500123',
    udin: '',
    dateOfSigning: new Date().toLocaleDateString('en-GB'),
    notesOnAccounts: 'We have compiled Balance sheet and Profit loss A/c as per Documents and information provided to us by the assesse.',

    // Previous Year & Carry-Forward Figures
    prevClosingStock: 0,
    prevCapitalBalance: 0,
    currentBankInterest: 0,
    currentYearTds: 0,

    openingStock: 0,
    purchases: 0,
    directExpenses: 0,
    sales: 0,
    closingStock: 0,
    depositOrOtherCredit: 0,

    indirectExpenses: [
      { id: 'exp-1', name: 'Salary & Wages', amount: 0 },
      { id: 'exp-2', name: 'Shop Rent', amount: 0 },
      { id: 'exp-3', name: 'Electricity & Water Charges', amount: 0 },
      { id: 'exp-4', name: 'Printing & Stationery', amount: 0 },
      { id: 'exp-5', name: 'Accounting Charges', amount: 0 },
      { id: 'exp-6', name: 'Telephone & Mobile Exp.', amount: 0 },
      { id: 'exp-7', name: 'Staff Welfare', amount: 0 },
      { id: 'exp-8', name: 'Miscellaneous Expenses', amount: 0 }
    ],
    otherIncomes: [
      { id: 'inc-1', name: 'Interest Income', amount: 0 }
    ],

    openingCapital: 0,
    additionDuringYear: 0,
    drawings: 0,

    creditors: [
      { id: 'c-1', name: 'Sundry Creditors', amount: 0 }
    ],
    unsecuredLoans: [
      { id: 'l-1', name: 'Loan taken from family and Friends', amount: 0 }
    ],
    otherLiabilities: [],

    debtors: [
      { id: 'd-1', name: 'Sundry Debtors', amount: 0 }
    ],
    cashInHand: 0,
    cashAtBank: 0,
    bankAccounts: [],
    loansGiven: [],
    otherAssets: [],

    depreciationSchedule: [
      {
        id: 'asset-1',
        particulars: 'Furniture & Fixtures',
        wdvOpening: 0,
        addition: 0,
        ratePercent: 10,
        total: 0,
        depreciation: 0,
        wdvClosing: 0
      },
      {
        id: 'asset-2',
        particulars: 'Computer & Printer',
        wdvOpening: 0,
        addition: 0,
        ratePercent: 40,
        total: 0,
        depreciation: 0,
        wdvClosing: 0
      },
      {
        id: 'asset-3',
        particulars: 'SCOOTY / Vehicle',
        wdvOpening: 0,
        addition: 0,
        ratePercent: 15,
        total: 0,
        depreciation: 0,
        wdvClosing: 0
      },
      {
        id: 'asset-4',
        particulars: 'Mobile Phone',
        wdvOpening: 0,
        addition: 0,
        ratePercent: 15,
        total: 0,
        depreciation: 0,
        wdvClosing: 0
      }
    ],

    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/**
 * Storage helpers
 */
export function getStoredBalanceSheets(): BalanceSheetRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed initial sample from user PDF
      const sample = createSampleProprietorBalanceSheet();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([sample]));
      return [sample];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      const sample = createSampleProprietorBalanceSheet();
      localStorage.setItem(STORAGE_KEY, JSON.stringify([sample]));
      return [sample];
    }
    return parsed;
  } catch (e) {
    console.error('Failed to load balance sheets from storage', e);
    return [createSampleProprietorBalanceSheet()];
  }
}

export function saveBalanceSheetRecord(bs: BalanceSheetRecord): void {
  const list = getStoredBalanceSheets();
  const idx = list.findIndex(item => item.id === bs.id);
  const toSave = {
    ...bs,
    updatedAt: new Date().toISOString()
  };

  if (idx !== -1) {
    list[idx] = toSave;
  } else {
    list.unshift(toSave);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save balance sheet', e);
  }
}

export function deleteBalanceSheetRecord(id: string): void {
  const list = getStoredBalanceSheets();
  const filtered = list.filter(item => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to delete balance sheet', e);
  }
}

export function duplicateBalanceSheetRecord(id: string): BalanceSheetRecord | null {
  const list = getStoredBalanceSheets();
  const found = list.find(item => item.id === id);
  if (!found) return null;

  const duplicated: BalanceSheetRecord = {
    ...JSON.parse(JSON.stringify(found)),
    id: `bs_${Date.now()}`,
    firmName: `${found.firmName} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  list.unshift(duplicated);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to duplicate balance sheet', e);
  }
  return duplicated;
}
