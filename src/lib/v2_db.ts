/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Isolated V2 Database & Storage Manager for CRM V.2 Implementation
import { getStorageString, setStorageString } from './db';
export interface V2Auditor {
  id: string;
  name: string;
  firmName: string;
  membershipNo: string;
  frnNo: string;
  address: string;
  panNumber: string;
  email: string;
}

export interface V2TrademarkAttorney {
  id: string;
  name: string;
  attorneyCode: string;
  email: string;
  address: string;
}

export interface V2GstClient {
  id: string;
  clientName: string;
  firmName?: string;
  clientType: 'PROPRIETOR' | 'PARTNERSHIP FIRM' | 'LLP' | 'PRIVATE LIMITED COMPANY' | 'TRUST' | 'SOCIETY' | 'SECTION 8 NGO';
  dateOfRegistration: string;
  clientEmail: string;
  clientMobile: string;
  clientAddress: string;
  clientState: string;
  gstin?: string;
  userId: string;
  password?: string;
  returnsMode: 'MONTHLY' | 'QUARTERLY';
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

export interface V2GstReturnStatus {
  id: string; // gstClientId_year_period
  gstClientId: string;
  year: string; // e.g. "2026", "2026-27"
  period: string; // e.g., "May 2026", "April-June 2026"
  gstr1: 'FILED' | 'NOT FILED' | 'PENDING WITH CLIENT' | 'TAX DUE';
  gstr3b: 'FILED' | 'NOT FILED' | 'PENDING WITH CLIENT' | 'TAX DUE';
  gstr9?: 'FILED' | 'NOT FILED' | 'PENDING WITH CLIENT' | 'TAX DUE';
  gstr1Date?: string;
  gstr3bDate?: string;
  gstr9Date?: string;
}

export interface V2McaDirector {
  name: string;
  dinNumber: string;
  dinStatus: 'ACTIVE' | 'DEACTIVATED';
  mcaId: string;
  mcaPassword?: string;
  email?: string;
  mobile?: string;
  dinKycStatus?: 'Pending' | 'Pending with CA' | 'Approved';
}

export interface V2McaClient {
  id: string;
  clientName: string;
  clientType: 'LLP' | 'PRIVATE LIMITED COMPANY' | 'SECTION 8 NGO';
  dateOfRegistration: string;
  clientEmail: string;
  clientMobile: string;
  clientAddress: string;
  clientState: string;
  directors: V2McaDirector[];
  incomeTaxId: string;
  incomeTaxPassword?: string;
  auditorFirmId?: string; // Links to V2Auditor
  isInc20aFiled?: boolean;
  isAdt1Filed?: boolean;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

export interface V2McaRocReturn {
  id: string; // mcaClientId_fy
  mcaClientId: string;
  financialYear: string; // e.g. "2025-26"
  form11Status?: 'FILED' | 'NOT FILED';
  form11Srn?: string;
  form8Status?: 'FILED' | 'NOT FILED';
  form8Srn?: string;
  balanceSheetStatus?: 'READY' | 'PENDING';
  itrStatus?: 'FILED' | 'NOT FILED' | 'PENDING';
  itrAckNo?: string;
  
  // For Pvt Ltd / Section 8
  dinKycStatus?: 'FILED' | 'NOT FILED' | 'PENDING';
  dinKycSrn?: string;
  adt1Status?: 'FILED' | 'NOT FILED' | 'PENDING';
  adt1Srn?: string;
  aoc4Status?: 'FILED' | 'NOT FILED' | 'PENDING';
  aoc4Srn?: string;
  mgt7Status?: 'FILED' | 'NOT FILED' | 'PENDING';
  mgt7Srn?: string;
  caName?: string;
}

export interface V2ItrClient {
  id: string;
  taxpayerName: string;
  taxpayerType: 'INDIVIDUAL' | 'LLP' | 'PRIVATE LIMITED' | 'TRUST & SOCIETY' | 'SECTION 8' | 'COMPANY' | 'FIRM' | 'HUF' | string;
  panNumber: string;
  typeOfItr: 'ITR-1' | 'ITR-2' | 'ITR-3' | 'ITR-4' | 'ITR-5' | 'ITR-6' | 'ITR-7';
  address: string;
  itPortalPassword?: string;
  isAuditApplicable: boolean;
  linkedMcaClientId?: string;
  linkedTrustId?: string;
  itrStatus: 'FILED' | 'NOT FILED' | 'PENDING FOR E-VERIFY' | 'PENDING FOR TAX AUDIT';
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  emailId?: string;
  mobileNumber?: string;
}

export interface V2TaxAuditClient {
  id: string; // Linked taxpayerId (V2ItrClient)
  clientName: string;
  taxpayerType: string;
  auditForm: '3CD/3CB' | '10B/10BB' | 'FORM 3CD' | string;
  status: 'FILED' | 'PENDING WITH CA' | 'NOT FILED' | 'E-VERIFY PENDING' | 'COMPLETED' | 'BALANCE SHEET PENDING' | 'FORM PENDING' | 'PENDING';
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
  username?: string;
  password?: string;
}

export interface V2TrustClient {
  id: string;
  entityName: string;
  typeOfEntity: 'Trust' | 'Society';
  address: string;
  authSignatory: string;
  emailId: string;
  mobileNumber: string;
  has12A80G: boolean;
  is12a80gExpired?: boolean;
  regDate12A80G?: string; // YYYY-MM-DD
  expiryDate12A80G?: string; // YYYY-MM-DD
  itPortalUsername: string;
  itPortalPassword?: string;
  complianceStatus: string; // 'Good' | 'Attention' | 'At Risk'
  healthScore: number; // 0 - 100
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

export interface V2DscClient {
  id: string;
  clientName: string;
  issueDate: string;
  expiryDate: string;
  issuerName: 'Prodigisgn' | 'PentaSign' | 'Sify';
  tokenName: 'Proxkey' | 'MToken';
  firmName: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

export interface V2OtherServiceClient {
  id: string;
  clientName: string;
  serviceAvailed: string; // manual or from presets (msme, iec, 12 & 80G, NGO Darpan, etc.)
  referredBy: string;
  dateOfRegistration: string;
  expiryDate?: string;
  address: string;
  emailId: string;
  mobileNumber: string;
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

export interface V2TrademarkClient {
  id: string;
  clientName: string;
  brandName: string;
  classNumber: string;
  applNo: string;
  stage: 'Applied' | 'Objected' | 'Hearing' | 'Approved';
  dateOfApply: string;
  attorneyId: string; // Links to V2TrademarkAttorney
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

export interface V2Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // Employee ID
  assignedToName: string;
  createdBy: string; // Employee ID
  createdByName: string;
  createdAt: string;
  dueDate: string;
  status: 'pending' | 'completed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  clientName?: string;
}

// Storage keys
const KEY_V2_AUDITORS = 'efilingg_crm_v2_auditors';
const KEY_V2_ATTORNEYS = 'efilingg_crm_v2_attorneys';
const KEY_V2_GST_CLIENTS = 'efilingg_crm_v2_gst_clients';
const KEY_V2_GST_RETURNS = 'efilingg_crm_v2_gst_returns';
const KEY_V2_MCA_CLIENTS = 'efilingg_crm_v2_mca_clients';
const KEY_V2_MCA_ROC_RETURNS = 'efilingg_crm_v2_mca_roc_returns';
const KEY_V2_ITR_CLIENTS = 'efilingg_crm_v2_itr_clients';
const KEY_V2_TRUST_CLIENTS = 'efilingg_crm_v2_trust_clients';
const KEY_V2_DSC_CLIENTS = 'efilingg_crm_v2_dsc_clients';
const KEY_V2_OTHER_SERVICES = 'efilingg_crm_v2_other_services';
const KEY_V2_TRADEMARKS = 'efilingg_crm_v2_trademarks';
const KEY_V2_TASKS = 'efilingg_crm_v2_tasks';

// Read / Write helpers
function getV2Items<T>(key: string, defaultVal: T[] = []): T[] {
  try {
    const val = getStorageString(key);
    return val ? JSON.parse(val) : defaultVal;
  } catch (e) {
    return defaultVal;
  }
}

function saveV2Items<T>(key: string, items: T[]) {
  try {
    setStorageString(key, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save to memory storage', e);
  }
}

// CA Auditor Master
export function getV2Auditors(): V2Auditor[] {
  return getV2Items<V2Auditor>(KEY_V2_AUDITORS, [
    {
      id: 'AUD-1',
      name: 'CA Alok Sharma',
      firmName: 'Sharma & Associates CPA',
      membershipNo: '084725',
      frnNo: '012975N',
      address: 'Preet Vihar, New Delhi - 110092',
      panNumber: 'AAKFS1823G',
      email: 'ca.alok@sharmaandco.in'
    },
    {
      id: 'AUD-2',
      name: 'CA Neha Goel',
      firmName: 'Neha Goel & Co.',
      membershipNo: '129487',
      frnNo: '008162C',
      address: 'Gomti Nagar, Lucknow, UP - 226010',
      panNumber: 'BBXPG4291K',
      email: 'audit@nehagoelcpa.com'
    }
  ]);
}
export function addV2Auditor(auditor: Omit<V2Auditor, 'id'>): V2Auditor {
  const list = getV2Auditors();
  const newItem: V2Auditor = {
    ...auditor,
    id: `AUD-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  };
  list.push(newItem);
  saveV2Items(KEY_V2_AUDITORS, list);
  return newItem;
}

// Trademark Attorney Master
export function getV2TrademarkAttorneys(): V2TrademarkAttorney[] {
  return getV2Items<V2TrademarkAttorney>(KEY_V2_ATTORNEYS, [
    {
      id: 'ATT-1',
      name: 'Advocate Rajesh Mehra',
      attorneyCode: 'DL-28491',
      email: 'rajesh@mehrachambers.com',
      address: 'Chamber 415, High Court of Delhi, New Delhi'
    },
    {
      id: 'ATT-2',
      name: 'Advocate Sneha Patel',
      attorneyCode: 'MH-19402',
      email: 'sneha@patentlawindia.com',
      address: 'Nariman Point, Mumbai, Maharashtra - 400021'
    }
  ]);
}
export function addV2TrademarkAttorney(att: Omit<V2TrademarkAttorney, 'id'>): V2TrademarkAttorney {
  const list = getV2TrademarkAttorneys();
  const newItem: V2TrademarkAttorney = {
    ...att,
    id: `ATT-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  };
  list.push(newItem);
  saveV2Items(KEY_V2_ATTORNEYS, list);
  return newItem;
}

// GST Clients
export function getV2GstClients(): V2GstClient[] {
  return getV2Items<V2GstClient>(KEY_V2_GST_CLIENTS, [
    {
       id: 'GST-CL-1',
       clientName: 'Aditya Gupta',
       firmName: 'Apex Retails Corp',
       clientType: 'PRIVATE LIMITED COMPANY',
       dateOfRegistration: '2026-01-15',
       clientEmail: 'compliance@apexretails.com',
       clientMobile: '9812492102',
       clientAddress: 'Plot 4, Sector 62, Noida, UP',
       clientState: 'Uttar Pradesh',
       gstin: '09AAACA4192G1ZX',
       userId: 'apex_retail',
       password: 'GstPassword@2026',
       returnsMode: 'MONTHLY',
       assignedEmployeeId: 'EMP-NEHA',
       assignedEmployeeName: 'Neha Sharma'
    },
    {
       id: 'GST-CL-2',
       clientName: 'Vikas Sharma',
       firmName: 'Vikas Traders',
       clientType: 'PROPRIETOR',
       dateOfRegistration: '2026-03-10',
       clientEmail: 'vikastraders99@gmail.com',
       clientMobile: '8102941029',
       clientAddress: 'Chawri Bazar, Delhi - 110006',
       clientState: 'Delhi',
       gstin: '07ABKPV8412F1Z9',
       userId: 'vikas_traders',
       password: 'Vikas@GST@123',
       returnsMode: 'QUARTERLY',
       assignedEmployeeId: 'EMP-RAMESH',
       assignedEmployeeName: 'Ramesh Kumar'
    }
  ]);
}
export function addV2GstClient(cl: Omit<V2GstClient, 'id'>): V2GstClient {
  const list = getV2GstClients();
  const newItem: V2GstClient = {
    ...cl,
    id: `GST-CL-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  };
  list.push(newItem);
  saveV2Items(KEY_V2_GST_CLIENTS, list);
  return newItem;
}

export function updateV2GstClient(updated: V2GstClient): void {
  const list = getV2GstClients();
  const idx = list.findIndex(item => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveV2Items(KEY_V2_GST_CLIENTS, list);
  }
}

// GST Returns status manager
export function getV2GstReturnStatuses(): V2GstReturnStatus[] {
  return getV2Items<V2GstReturnStatus>(KEY_V2_GST_RETURNS, [
    {
      id: 'GST-CL-1_2026_May 2026',
      gstClientId: 'GST-CL-1',
      year: '2026',
      period: 'May 2026',
      gstr1: 'FILED',
      gstr3b: 'FILED',
      gstr1Date: '2026-06-10',
      gstr3bDate: '2026-06-19'
    },
    {
      id: 'GST-CL-2_2026_May 2026',
      gstClientId: 'GST-CL-2',
      year: '2026',
      period: 'May 2026',
      gstr1: 'NOT FILED',
      gstr3b: 'PENDING WITH CLIENT'
    },
    {
      id: 'GST-CL-1_2026_June 2026',
      gstClientId: 'GST-CL-1',
      year: '2026',
      period: 'June 2026',
      gstr1: 'PENDING WITH CLIENT',
      gstr3b: 'NOT FILED'
    }
  ]);
}
export function saveV2GstReturnStatus(status: V2GstReturnStatus) {
  const list = getV2GstReturnStatuses();
  const idx = list.findIndex(item => item.id === status.id);
  if (idx !== -1) {
    list[idx] = status;
  } else {
    list.push(status);
  }
  saveV2Items(KEY_V2_GST_RETURNS, list);
}

// MCA Management
export function getV2McaClients(): V2McaClient[] {
  return getV2Items<V2McaClient>(KEY_V2_MCA_CLIENTS, [
    {
      id: 'MCA-CL-1',
      clientName: 'Innogeek Technologies Pvt Ltd',
      clientType: 'PRIVATE LIMITED COMPANY',
      dateOfRegistration: '2025-08-12',
      clientEmail: 'info@innogeektech.co.in',
      clientMobile: '9001284910',
      clientAddress: 'Sohna Road, Gurugram, Haryana - 122018',
      clientState: 'Haryana',
      incomeTaxId: 'AABC1923K',
      incomeTaxPassword: 'ITPassword@2026',
      auditorFirmId: 'AUD-1',
      isInc20aFiled: false,
      isAdt1Filed: true,
      assignedEmployeeId: 'EMP-NEHA',
      assignedEmployeeName: 'Neha Sharma',
      directors: [
        { name: 'Amit Singhal', dinNumber: '08412948', dinStatus: 'ACTIVE', mcaId: 'amit.mca', mcaPassword: 'Amit@123password', email: 'amit@innogeektech.co.in', mobile: '9001284910', dinKycStatus: 'Approved' },
        { name: 'Sonal Singhal', dinNumber: '09124485', dinStatus: 'ACTIVE', mcaId: 'sonal.mca', email: 'sonal@innogeektech.co.in', mobile: '9001284911', dinKycStatus: 'Pending' }
      ]
    },
    {
      id: 'MCA-CL-2',
      clientName: 'Nari Shakti Sewa Samiti Section 8 NGO',
      clientType: 'SECTION 8 NGO',
      dateOfRegistration: '2025-10-04',
      clientEmail: 'ngo.narishakti@outlook.com',
      clientMobile: '9211029410',
      clientAddress: 'Rajpur Road, Dehradun, Uttarakhand - 248001',
      clientState: 'Uttarakhand',
      incomeTaxId: 'AAACN4182L',
      incomeTaxPassword: 'NGO@AuditPass1',
      auditorFirmId: 'AUD-2',
      isInc20aFiled: false,
      isAdt1Filed: false,
      assignedEmployeeId: 'EMP-RAMESH',
      assignedEmployeeName: 'Ramesh Kumar',
      directors: [
        { name: 'Dr. Meena Semwal', dinNumber: '07129481', dinStatus: 'ACTIVE', mcaId: 'meena.ngo', email: 'meenal@outlook.com', mobile: '9211029410', dinKycStatus: 'Approved' },
        { name: 'Kiran Rawat', dinNumber: '07941204', dinStatus: 'ACTIVE', mcaId: 'kiran.ngo', email: 'kiran@outlook.com', mobile: '9211029412', dinKycStatus: 'Pending with CA' }
      ]
    },
    {
      id: 'MCA-CL-3',
      clientName: 'BluePeak Logistics LLP',
      clientType: 'LLP',
      dateOfRegistration: '2025-04-15',
      clientEmail: 'contact@bluepeaklogistics.in',
      clientMobile: '9811092810',
      clientAddress: 'Andheri East, Mumbai, Maharashtra - 400069',
      clientState: 'Maharashtra',
      incomeTaxId: 'AAFFB1928M',
      incomeTaxPassword: 'LLP@BluePeak99',
      auditorFirmId: 'AUD-1',
      isInc20aFiled: true,
      isAdt1Filed: true,
      assignedEmployeeId: 'EMP-NEHA',
      assignedEmployeeName: 'Neha Sharma',
      directors: [
        { name: 'Vikram Sethi', dinNumber: '08129401', dinStatus: 'ACTIVE', mcaId: 'vikram.llp', email: 'vikram@bluepeak.in', mobile: '9811092810', dinKycStatus: 'Approved' },
        { name: 'Rohan Mehra', dinNumber: '08401928', dinStatus: 'ACTIVE', mcaId: 'rohan.llp', email: 'rohan@bluepeak.in', mobile: '9811092811', dinKycStatus: 'Approved' }
      ]
    },
    {
      id: 'MCA-CL-4',
      clientName: 'Zenith Agro Foods Pvt Ltd',
      clientType: 'PRIVATE LIMITED COMPANY',
      dateOfRegistration: '2024-11-20',
      clientEmail: 'accounts@zenithagro.co.in',
      clientMobile: '9711029381',
      clientAddress: 'Sanand GIDC, Ahmedabad, Gujarat - 382110',
      clientState: 'Gujarat',
      incomeTaxId: 'AABCZ9921Q',
      incomeTaxPassword: 'Zenith@Pass@2026',
      auditorFirmId: 'AUD-2',
      isInc20aFiled: true,
      isAdt1Filed: true,
      assignedEmployeeId: 'EMP-RAMESH',
      assignedEmployeeName: 'Ramesh Kumar',
      directors: [
        { name: 'Nilesh Patel', dinNumber: '06819204', dinStatus: 'ACTIVE', mcaId: 'nilesh.zenith', email: 'nilesh@zenithagro.co.in', mobile: '9711029381', dinKycStatus: 'Pending' },
        { name: 'Bhavik Patel', dinNumber: '07192048', dinStatus: 'ACTIVE', mcaId: 'bhavik.zenith', email: 'bhavik@zenithagro.co.in', mobile: '9711029382', dinKycStatus: 'Pending with CA' }
      ]
    },
    {
      id: 'MCA-CL-5',
      clientName: 'GreenLeaf Solar Ventures LLP',
      clientType: 'LLP',
      dateOfRegistration: '2025-06-30',
      clientEmail: 'info@greenleafsolar.org',
      clientMobile: '9412093811',
      clientAddress: 'Banjara Hills, Hyderabad, Telangana - 500034',
      clientState: 'Telangana',
      incomeTaxId: 'AAFFG3819P',
      incomeTaxPassword: 'Green@SolarPass',
      auditorFirmId: 'AUD-1',
      isInc20aFiled: true,
      isAdt1Filed: true,
      directors: [
        { name: 'K. Venkat Rao', dinNumber: '09124019', dinStatus: 'ACTIVE', mcaId: 'venkat.solar', email: 'venkat@greenleafsolar.org', mobile: '9412093811', dinKycStatus: 'Approved' }
      ]
    },
    {
      id: 'MCA-CL-6',
      clientName: 'Gramin Shiksha Foundation Section 8',
      clientType: 'SECTION 8 NGO',
      dateOfRegistration: '2025-12-01',
      clientEmail: 'support@graminshiksha.org',
      clientMobile: '9650192841',
      clientAddress: 'Civil Lines, Jaipur, Rajasthan - 302006',
      clientState: 'Rajasthan',
      incomeTaxId: 'AAACG4819M',
      incomeTaxPassword: 'Gramin@Shiksha1',
      auditorFirmId: 'AUD-2',
      isInc20aFiled: false,
      isAdt1Filed: false,
      directors: [
        { name: 'Anita Sharma', dinNumber: '07491028', dinStatus: 'ACTIVE', mcaId: 'anita.ngo', email: 'anita@graminshiksha.org', mobile: '9650192841', dinKycStatus: 'Pending' }
      ]
    }
  ]);
}
export function addV2McaClient(cl: Omit<V2McaClient, 'id'>): V2McaClient {
  const list = getV2McaClients();
  const newItem: V2McaClient = {
    ...cl,
    id: `MCA-CL-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  };
  list.push(newItem);
  saveV2Items(KEY_V2_MCA_CLIENTS, list);
  
  // Forward to ITR automatically
  const itrType = newItem.clientType === 'LLP' ? 'ITR-5' : 'ITR-6';
  addV2ItrClient({
    taxpayerName: newItem.clientName,
    taxpayerType: newItem.clientType === 'LLP' ? 'LLP' : (newItem.clientType === 'SECTION 8 NGO' ? 'SECTION 8' : 'PRIVATE LIMITED'),
    panNumber: newItem.incomeTaxId,
    typeOfItr: itrType,
    address: newItem.clientAddress,
    itPortalPassword: newItem.incomeTaxPassword || '',
    isAuditApplicable: true,
    linkedMcaClientId: newItem.id,
    itrStatus: 'NOT FILED'
  });

  return newItem;
}

// ROC filings manager
export function getV2McaRocReturns(): V2McaRocReturn[] {
  return getV2Items<V2McaRocReturn>(KEY_V2_MCA_ROC_RETURNS, [
    {
      id: 'MCA-CL-1_2025-26',
      mcaClientId: 'MCA-CL-1',
      financialYear: '2025-26',
      dinKycStatus: 'FILED',
      dinKycSrn: 'T1982491',
      adt1Status: 'FILED',
      adt1Srn: 'A2091244',
      aoc4Status: 'PENDING',
      mgt7Status: 'PENDING',
      balanceSheetStatus: 'READY',
      itrStatus: 'PENDING',
      caName: 'CA Alok Sharma'
    },
    {
      id: 'MCA-CL-2_2025-26',
      mcaClientId: 'MCA-CL-2',
      financialYear: '2025-26',
      dinKycStatus: 'NOT FILED',
      adt1Status: 'FILED',
      adt1Srn: 'A8429104',
      aoc4Status: 'NOT FILED',
      mgt7Status: 'NOT FILED',
      balanceSheetStatus: 'PENDING',
      itrStatus: 'PENDING',
      caName: 'CA Neha Goel'
    },
    {
      id: 'MCA-CL-3_2025-26',
      mcaClientId: 'MCA-CL-3',
      financialYear: '2025-26',
      form11Status: 'FILED',
      form11Srn: 'F1194821',
      form8Status: 'NOT FILED',
      balanceSheetStatus: 'READY',
      itrStatus: 'PENDING',
      caName: 'CA Alok Sharma'
    },
    {
      id: 'MCA-CL-4_2025-26',
      mcaClientId: 'MCA-CL-4',
      financialYear: '2025-26',
      dinKycStatus: 'NOT FILED',
      adt1Status: 'FILED',
      adt1Srn: 'A7192048',
      aoc4Status: 'FILED',
      aoc4Srn: 'AOC49182',
      mgt7Status: 'FILED',
      mgt7Srn: 'MGT79182',
      balanceSheetStatus: 'READY',
      itrStatus: 'FILED',
      caName: 'CA Neha Goel'
    },
    {
      id: 'MCA-CL-5_2025-26',
      mcaClientId: 'MCA-CL-5',
      financialYear: '2025-26',
      form11Status: 'NOT FILED',
      form8Status: 'NOT FILED',
      balanceSheetStatus: 'PENDING',
      itrStatus: 'PENDING',
      caName: 'CA Alok Sharma'
    },
    {
      id: 'MCA-CL-6_2025-26',
      mcaClientId: 'MCA-CL-6',
      financialYear: '2025-26',
      dinKycStatus: 'NOT FILED',
      adt1Status: 'NOT FILED',
      aoc4Status: 'NOT FILED',
      mgt7Status: 'NOT FILED',
      balanceSheetStatus: 'PENDING',
      itrStatus: 'NOT FILED',
      caName: 'CA Neha Goel'
    }
  ]);
}
export function saveV2McaRocReturn(ret: V2McaRocReturn) {
  const list = getV2McaRocReturns();
  const idx = list.findIndex(r => r.id === ret.id);
  if (idx !== -1) {
    list[idx] = ret;
  } else {
    list.push(ret);
  }
  saveV2Items(KEY_V2_MCA_ROC_RETURNS, list);
}

// ITR Management
export function getV2ItrClients(): V2ItrClient[] {
  return getV2Items<V2ItrClient>(KEY_V2_ITR_CLIENTS, [
    {
      id: 'ITR-CL-1',
      taxpayerName: 'Ramesh Chandra Jha',
      taxpayerType: 'INDIVIDUAL',
      panNumber: 'BBMXJ1928D',
      typeOfItr: 'ITR-3',
      address: 'Vasant Kunj, Delhi - 110070',
      itPortalPassword: 'RameshPassword77',
      isAuditApplicable: true,
      itrStatus: 'PENDING FOR TAX AUDIT'
    },
    {
      id: 'ITR-CL-2',
      taxpayerName: 'Kajal Singhal',
      taxpayerType: 'INDIVIDUAL',
      panNumber: 'CHXPK4182E',
      typeOfItr: 'ITR-1',
      address: 'Shahdara, Delhi - 110032',
      itPortalPassword: 'Kajal@Portal@9',
      isAuditApplicable: false,
      itrStatus: 'FILED'
    }
  ]);
}
export function addV2ItrClient(cl: Omit<V2ItrClient, 'id'>): V2ItrClient {
  const list = getV2ItrClients();
  const newItem: V2ItrClient = {
    ...cl,
    id: `ITR-CL-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  };
  list.push(newItem);
  saveV2Items(KEY_V2_ITR_CLIENTS, list);
  return newItem;
}

export function updateV2ItrStatus(id: string, status: V2ItrClient['itrStatus']) {
  const list = getV2ItrClients();
  const idx = list.findIndex(c => c.id === id);
  if (idx !== -1) {
    list[idx].itrStatus = status;
    saveV2Items(KEY_V2_ITR_CLIENTS, list);
  }
}

// Tax Audit derived list
export function getV2TaxAuditClients(): V2TaxAuditClient[] {
  const itrClients = getV2ItrClients();
  const trustClients = getV2TrustClients();
  const overrides = getV2TaxAuditOverrides();
  
  const list: V2TaxAuditClient[] = [];

  // 1. From Individual/Business/MCA ITR
  itrClients.forEach(itr => {
    if (itr.isAuditApplicable) {
      let auditForm: string = 'Form 3CD';
      const entityTypeUpper = (itr.taxpayerType || '').toUpperCase();
      if (
        entityTypeUpper.includes('TRUST') ||
        entityTypeUpper.includes('SOCIETY') ||
        entityTypeUpper.includes('SECTION 8') ||
        entityTypeUpper.includes('NGO') ||
        itr.typeOfItr === 'ITR-7'
      ) {
        auditForm = 'Form 10B';
      } else {
        // Proprietor, Private Limited, LLP, Partnership Firm, Corporate
        auditForm = 'Form 3CD';
      }
      const override = overrides.find(o => o.clientId === itr.id);
      list.push({
        id: itr.id,
        clientName: itr.taxpayerName,
        taxpayerType: itr.taxpayerType,
        auditForm,
        status: override ? override.status : (itr.itrStatus === 'FILED' ? 'COMPLETED' : (itr.itrStatus === 'PENDING FOR TAX AUDIT' ? 'PENDING WITH CA' : 'PENDING')),
        assignedEmployeeId: override?.assignedEmployeeId || itr.assignedEmployeeId,
        assignedEmployeeName: override?.assignedEmployeeName || itr.assignedEmployeeName,
        username: itr.panNumber,
        password: itr.itPortalPassword
      });
    }
  });

  // 2. From Trust & Society (Active 12A & 80G entities always mandate Form 10B Tax Audit)
  trustClients.forEach(trust => {
    if (trust.has12A80G) {
      if (!list.some(item => item.clientName === trust.entityName)) {
        const trustAuditId = `TRUST-AUD-${trust.id}`;
        const override = overrides.find(o => o.clientId === trustAuditId);
        list.push({
          id: trustAuditId,
          clientName: trust.entityName,
          taxpayerType: trust.typeOfEntity === 'Society' ? 'SOCIETY (EXEMPT)' : 'TRUST & NGO',
          auditForm: 'Form 10B',
          status: override ? override.status : 'PENDING WITH CA',
          assignedEmployeeId: override?.assignedEmployeeId || trust.assignedEmployeeId,
          assignedEmployeeName: override?.assignedEmployeeName || trust.assignedEmployeeName,
          username: trust.itPortalUsername,
          password: trust.itPortalPassword
        });
      }
    }
  });

  return list;
}

// Trust & Societies
export function getV2TrustClients(): V2TrustClient[] {
  return getV2Items<V2TrustClient>(KEY_V2_TRUST_CLIENTS, [
    {
      id: 'TRUST-1',
      entityName: 'Prerna Education Foundation Trust',
      typeOfEntity: 'Trust',
      address: 'Sita Buldi, Nagpur, Maharashtra',
      authSignatory: 'Sandeep Deshpande',
      emailId: 'prerna.foundation@rediffmail.com',
      mobileNumber: '9512491204',
      has12A80G: true,
      is12a80gExpired: false,
      regDate12A80G: '2022-04-01',
      expiryDate12A80G: '2027-03-31',
      itPortalUsername: 'PRERNA_12A_80G',
      itPortalPassword: 'PrernaPassword@1',
      complianceStatus: 'Good',
      healthScore: 92
    },
    {
      id: 'TRUST-2',
      entityName: 'Gram Vikas Kalyan Samiti',
      typeOfEntity: 'Society',
      address: 'Aliganj, Lucknow, UP - 226024',
      authSignatory: 'Rajesh Mishra',
      emailId: 'gramvikas.samiti@org.in',
      mobileNumber: '7910249122',
      has12A80G: false,
      is12a80gExpired: false,
      itPortalUsername: 'GRAM_VIKAS',
      itPortalPassword: 'GramVKPassword',
      complianceStatus: 'Attention',
      healthScore: 68
    }
  ]);
}
export function addV2TrustClient(cl: Omit<V2TrustClient, 'id' | 'complianceStatus' | 'healthScore'>): V2TrustClient {
  const list = getV2TrustClients();
  const isExpired = cl.is12a80gExpired || (cl.expiryDate12A80G && new Date(cl.expiryDate12A80G) < new Date());
  const healthScore = cl.has12A80G ? (isExpired ? 70 : 95) : 75;
  const complianceStatus = healthScore >= 85 ? 'Good' : (healthScore >= 70 ? 'Attention' : 'At Risk');
  const newItem: V2TrustClient = {
    ...cl,
    is12a80gExpired: isExpired || false,
    id: `TRUST-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    healthScore,
    complianceStatus
  };
  list.push(newItem);
  saveV2Items(KEY_V2_TRUST_CLIENTS, list);
  
  // Auto forward to ITR & Tax Audit (Form 10B)
  if (cl.has12A80G) {
    addV2ItrClient({
      taxpayerName: newItem.entityName,
      taxpayerType: 'TRUST & SOCIETY',
      panNumber: 'AAAPT' + Math.floor(1000 + Math.random() * 9000) + 'A',
      typeOfItr: 'ITR-7',
      address: newItem.address,
      itPortalPassword: newItem.itPortalPassword || '',
      isAuditApplicable: true,
      linkedTrustId: newItem.id,
      itrStatus: 'PENDING FOR TAX AUDIT',
      assignedEmployeeId: newItem.assignedEmployeeId,
      assignedEmployeeName: newItem.assignedEmployeeName
    });
  }

  return newItem;
}

// Digital Signatures
export function getV2DscClients(): V2DscClient[] {
  return getV2Items<V2DscClient>(KEY_V2_DSC_CLIENTS, [
    {
      id: 'DSC-1',
      clientName: 'Amit Singhal',
      issueDate: '2025-06-12',
      expiryDate: '2027-06-12',
      issuerName: 'Prodigisgn',
      tokenName: 'Proxkey',
      firmName: 'Innogeek Technologies Pvt Ltd'
    },
    {
      id: 'DSC-2',
      clientName: 'Sandeep Deshpande',
      issueDate: '2024-11-20',
      expiryDate: '2026-11-20',
      issuerName: 'PentaSign',
      tokenName: 'MToken',
      firmName: 'Prerna Education Foundation Trust'
    }
  ]);
}
export function addV2DscClient(cl: Omit<V2DscClient, 'id'>): V2DscClient {
  const list = getV2DscClients();
  const newItem: V2DscClient = {
    ...cl,
    id: `DSC-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  };
  list.push(newItem);
  saveV2Items(KEY_V2_DSC_CLIENTS, list);
  return newItem;
}

// Other Services
export function getV2OtherServiceClients(): V2OtherServiceClient[] {
  return getV2Items<V2OtherServiceClient>(KEY_V2_OTHER_SERVICES, [
    {
      id: 'OTH-1',
      clientName: 'Sunrise Agro Ventures',
      serviceAvailed: 'msme',
      referredBy: 'Vijay Kumar',
      dateOfRegistration: '2026-05-15',
      expiryDate: '2031-05-15',
      address: 'Gajuwaka, Visakhapatnam, AP',
      emailId: 'sunriseagro@yahoo.com',
      mobileNumber: '9212049102'
    },
    {
      id: 'OTH-2',
      clientName: 'Blue Star Logistics',
      serviceAvailed: 'iec',
      referredBy: 'Advocate Rajesh Mehra',
      dateOfRegistration: '2026-06-01',
      address: 'Tughlakabad Extension, New Delhi',
      emailId: 'contact@bluestarlogistics.com',
      mobileNumber: '8124912049'
    }
  ]);
}
export function addV2OtherServiceClient(cl: Omit<V2OtherServiceClient, 'id'>): V2OtherServiceClient {
  const list = getV2OtherServiceClients();
  const newItem: V2OtherServiceClient = {
    ...cl,
    id: `OTH-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  };
  list.push(newItem);
  saveV2Items(KEY_V2_OTHER_SERVICES, list);
  return newItem;
}

// Trademark Management
export function getV2Trademarks(): V2TrademarkClient[] {
  return getV2Items<V2TrademarkClient>(KEY_V2_TRADEMARKS, [
    {
      id: 'TM-1',
      clientName: 'Apex Retails Corp',
      brandName: 'APEX BUY',
      classNumber: '35',
      applNo: '5841294',
      stage: 'Applied',
      dateOfApply: '2026-04-18',
      attorneyId: 'ATT-1'
    },
    {
      id: 'TM-2',
      clientName: 'Vikas Traders',
      brandName: 'VIKAS SPICES',
      classNumber: '30',
      applNo: '5912448',
      stage: 'Objected',
      dateOfApply: '2026-05-02',
      attorneyId: 'ATT-2'
    }
  ]);
}
export function addV2Trademark(cl: Omit<V2TrademarkClient, 'id'>): V2TrademarkClient {
  const list = getV2Trademarks();
  const newItem: V2TrademarkClient = {
    ...cl,
    id: `TM-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
  };
  list.push(newItem);
  saveV2Items(KEY_V2_TRADEMARKS, list);
  return newItem;
}

// Task management
export function getV2Tasks(): V2Task[] {
  return getV2Items<V2Task>(KEY_V2_TASKS, [
    {
      id: 'TSK-1',
      title: 'Review GSTR-1 Statuses for Apex Retails',
      description: 'Check if May 2026 GSTR-1 filing was finalized correctly with ARN number.',
      assignedTo: 'EMP-ADMIN',
      assignedToName: 'Master Admin',
      createdBy: 'EMP-ADMIN',
      createdByName: 'Master Admin',
      createdAt: '2026-06-11',
      dueDate: '2026-06-15',
      status: 'pending'
    },
    {
      id: 'TSK-2',
      title: 'Collect DSC Documents for directors of Innogeek',
      description: 'Request Aadhaar and PAN matching OTP registers immediately.',
      assignedTo: 'ALL',
      assignedToName: 'All Operations Associate',
      createdBy: 'EMP-ADMIN',
      createdByName: 'Master Admin',
      createdAt: '2026-06-12',
      dueDate: '2026-06-14',
      status: 'pending'
    }
  ]);
}
export function addV2Task(task: Omit<V2Task, 'id' | 'createdAt'>): V2Task {
  const list = getV2Tasks();
  const newItem: V2Task = {
    ...task,
    id: `TSK-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
    createdAt: new Date().toISOString().split('T')[0]
  };
  list.push(newItem);
  saveV2Items(KEY_V2_TASKS, list);
  return newItem;
}
export function completeV2Task(id: string) {
  const list = getV2Tasks();
  const idx = list.findIndex(t => t.id === id);
  if (idx !== -1) {
    list[idx].status = 'completed';
    saveV2Items(KEY_V2_TASKS, list);
  }
}
export function updateV2Task(updated: V2Task) {
  const list = getV2Tasks();
  const idx = list.findIndex(t => t.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveV2Items(KEY_V2_TASKS, list);
  }
}

// CSV Bulk Parser tool helpers
export function parseCSVData(csvText: string): string[][] {
  const lines = csvText.split('\n');
  return lines
    .map(line => {
      // Support basic comma and tab separator spacing from spreadsheet copy pastes
      const row: string[] = [];
      let currentField = '';
      let insideQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if ((char === ',' || char === '\t') && !insideQuotes) {
          row.push(currentField.trim());
          currentField = '';
        } else {
          currentField += char;
        }
      }
      row.push(currentField.trim());
      return row;
    })
    .filter(row => row.length > 0 && row.some(cell => cell !== ''));
}

export function exportToCSVFile(filename: string, headers: string[], rows: string[][]) {
  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(e => e.map(val => `"${(val || '').replace(/"/g, '""')}"`).join(","))].join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Inter-compatibility linkage to primary active employee bank
import { getEmployees } from './db';

export function getV1Employees() {
  return getEmployees().filter(emp => 
    emp.status === 'active' && 
    emp.department?.toLowerCase().trim() === 'operation management'
  );
}

export function updateV2McaClient(updated: V2McaClient): void {
  const list = getV2McaClients();
  const idx = list.findIndex(item => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveV2Items(KEY_V2_MCA_CLIENTS, list);
  }
}

export function updateV2ItrClient(updated: V2ItrClient): void {
  const list = getV2ItrClients();
  const idx = list.findIndex(item => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveV2Items(KEY_V2_ITR_CLIENTS, list);
  }
}

export function updateV2TrustClient(updated: V2TrustClient): void {
  const list = getV2TrustClients();
  const idx = list.findIndex(item => item.id === updated.id);
  if (idx !== -1) {
    const isExpired = updated.is12a80gExpired || (updated.expiryDate12A80G && new Date(updated.expiryDate12A80G) < new Date());
    const healthScore = updated.has12A80G ? (isExpired ? 70 : 95) : 75;
    const complianceStatus = healthScore >= 85 ? 'Good' : (healthScore >= 70 ? 'Attention' : 'At Risk');
    
    const clientToSave: V2TrustClient = {
      ...updated,
      is12a80gExpired: isExpired || false,
      healthScore,
      complianceStatus
    };
    list[idx] = clientToSave;
    saveV2Items(KEY_V2_TRUST_CLIENTS, list);

    // Sync to ITR / Tax Audit
    const itrList = getV2ItrClients();
    const existingItr = itrList.find(i => i.linkedTrustId === updated.id || i.taxpayerName === updated.entityName);
    if (existingItr) {
      existingItr.taxpayerName = updated.entityName;
      existingItr.isAuditApplicable = updated.has12A80G;
      existingItr.assignedEmployeeId = updated.assignedEmployeeId;
      existingItr.assignedEmployeeName = updated.assignedEmployeeName;
      saveV2Items(KEY_V2_ITR_CLIENTS, itrList);
    } else if (updated.has12A80G) {
      addV2ItrClient({
        taxpayerName: updated.entityName,
        taxpayerType: 'TRUST & SOCIETY',
        panNumber: 'AAAPT' + Math.floor(1000 + Math.random() * 9000) + 'A',
        typeOfItr: 'ITR-7',
        address: updated.address,
        itPortalPassword: updated.itPortalPassword || '',
        isAuditApplicable: true,
        linkedTrustId: updated.id,
        itrStatus: 'PENDING FOR TAX AUDIT',
        assignedEmployeeId: updated.assignedEmployeeId,
        assignedEmployeeName: updated.assignedEmployeeName
      });
    }
  }
}

export function updateV2DscClient(updated: V2DscClient): void {
  const list = getV2DscClients();
  const idx = list.findIndex(item => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveV2Items(KEY_V2_DSC_CLIENTS, list);
  }
}

export function updateV2OtherServiceClient(updated: V2OtherServiceClient): void {
  const list = getV2OtherServiceClients();
  const idx = list.findIndex(item => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveV2Items(KEY_V2_OTHER_SERVICES, list);
  }
}

export function updateV2TrademarkClient(updated: V2TrademarkClient): void {
  const list = getV2Trademarks();
  const idx = list.findIndex(item => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveV2Items(KEY_V2_TRADEMARKS, list);
  }
}

export function deleteV2ItrClient(id: string): void {
  const list = getV2ItrClients();
  const filtered = list.filter(item => item.id !== id);
  saveV2Items(KEY_V2_ITR_CLIENTS, filtered);
}

export function deleteV2GstClient(id: string): void {
  const list = getV2GstClients();
  const filtered = list.filter(item => item.id !== id);
  saveV2Items(KEY_V2_GST_CLIENTS, filtered);
}

export function deleteV2GstClients(ids: string[]): void {
  const list = getV2GstClients();
  const filtered = list.filter(item => !ids.includes(item.id));
  saveV2Items(KEY_V2_GST_CLIENTS, filtered);
}

export function deleteV2McaClient(id: string): void {
  const list = getV2McaClients();
  const filtered = list.filter(item => item.id !== id);
  saveV2Items(KEY_V2_MCA_CLIENTS, filtered);
}

export function deleteV2McaClients(ids: string[]): void {
  const list = getV2McaClients();
  const filtered = list.filter(item => !ids.includes(item.id));
  saveV2Items(KEY_V2_MCA_CLIENTS, filtered);
}

export function deleteV2TrustClient(id: string): void {
  const list = getV2TrustClients();
  const filtered = list.filter(item => item.id !== id);
  saveV2Items(KEY_V2_TRUST_CLIENTS, filtered);
}

export function deleteV2DscClient(id: string): void {
  const list = getV2DscClients();
  const filtered = list.filter(item => item.id !== id);
  saveV2Items(KEY_V2_DSC_CLIENTS, filtered);
}

export function deleteV2OtherServiceClient(id: string): void {
  const list = getV2OtherServiceClients();
  const filtered = list.filter(item => item.id !== id);
  saveV2Items(KEY_V2_OTHER_SERVICES, filtered);
}

export function updateV2Auditor(updated: V2Auditor): void {
  const list = getV2Auditors();
  const idx = list.findIndex(item => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveV2Items(KEY_V2_AUDITORS, list);
  }
}

export function deleteV2Auditor(id: string): void {
  const list = getV2Auditors();
  const filtered = list.filter(item => item.id !== id);
  saveV2Items(KEY_V2_AUDITORS, filtered);
}

export function updateV2TrademarkAttorney(updated: V2TrademarkAttorney): void {
  const list = getV2TrademarkAttorneys();
  const idx = list.findIndex(item => item.id === updated.id);
  if (idx !== -1) {
    list[idx] = updated;
    saveV2Items(KEY_V2_ATTORNEYS, list);
  }
}

export function deleteV2TrademarkAttorney(id: string): void {
  const list = getV2TrademarkAttorneys();
  const filtered = list.filter(item => item.id !== id);
  saveV2Items(KEY_V2_ATTORNEYS, filtered);
}

const KEY_V2_OTHER_SERVICES_CATEGORIES = 'efilingg_crm_v2_other_services_categories';

export function getV2OtherServiceCategories(): string[] {
  return getV2Items<string>(KEY_V2_OTHER_SERVICES_CATEGORIES, [
    'MSME Udyam Registration (Filing)',
    'Import Export Code (DGFT IEC)',
    'NITI Aayog NGO Darpan unique ID',
    'Exemption Certificate (12A/80G special filing)',
    'FSSAI Food License filing'
  ]);
}

export function addV2OtherServiceCategory(cat: string): void {
  const current = getV2OtherServiceCategories();
  if (!current.includes(cat)) {
    current.push(cat);
    saveV2Items(KEY_V2_OTHER_SERVICES_CATEGORIES, current);
  }
}

export function deleteV2OtherServiceCategory(cat: string): void {
  const current = getV2OtherServiceCategories();
  const filtered = current.filter(c => c !== cat);
  saveV2Items(KEY_V2_OTHER_SERVICES_CATEGORIES, filtered);
}

export interface V2TaxAuditOverride {
  clientId: string;
  status: 'PENDING' | 'COMPLETED' | 'PENDING WITH CA' | 'BALANCE SHEET PENDING' | 'FORM PENDING';
  assignedEmployeeId?: string;
  assignedEmployeeName?: string;
}

const KEY_V2_TAX_AUDIT_OVERRIDES = 'efilingg_crm_v2_tax_audit_overrides';

export function getV2TaxAuditOverrides(): V2TaxAuditOverride[] {
  return getV2Items<V2TaxAuditOverride>(KEY_V2_TAX_AUDIT_OVERRIDES, [
    {
      clientId: 'ITR-CL-1',
      status: 'PENDING WITH CA',
      assignedEmployeeId: 'EMP-NEHA',
      assignedEmployeeName: 'Neha Sharma'
    }
  ]);
}

export function saveV2TaxAuditOverride(clientId: string, status: string, empId?: string, empName?: string) {
  const list = getV2TaxAuditOverrides();
  const idx = list.findIndex(item => item.clientId === clientId);
  if (idx !== -1) {
    list[idx] = { clientId, status: status as any, assignedEmployeeId: empId, assignedEmployeeName: empName };
  } else {
    list.push({ clientId, status: status as any, assignedEmployeeId: empId, assignedEmployeeName: empName });
  }
  saveV2Items(KEY_V2_TAX_AUDIT_OVERRIDES, list);
}



