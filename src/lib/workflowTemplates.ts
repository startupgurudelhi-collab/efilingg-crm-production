/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getStorageString, setStorageString } from './db';

export type WorkOrderStageStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export interface WorkOrderStageChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface WorkflowTemplateStage {
  id: string; // e.g. "stage-plc-1"
  name: string; // e.g. "KYC Collection & Class 3 DSC Verification"
  sequence: number; // 1, 2, 3...
  expectedDurationDays: number; // e.g. 2
  dependencies: string[]; // IDs of stages that must complete before this one starts
  description: string;
  checklist?: string[]; // list of action items / required checks
  department?: string;
  mandatoryDocuments?: string[];
}

export interface WorkflowTemplate {
  id: string; // e.g. "tmpl_pvt_ltd_reg"
  serviceName: string; // e.g. "Private Limited Registration"
  serviceCode: string; // e.g. "PLC"
  department: string; // e.g. "MCA & Corporate Legal"
  category: string; // e.g. "Company Incorporation"
  description: string;
  totalExpectedDurationDays: number;
  stages: WorkflowTemplateStage[];
  isSystemDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkOrderStage {
  id: string; // Instance stage ID, e.g. "wos-1"
  templateStageId: string; // Link to template stage
  name: string;
  sequence: number;
  expectedDurationDays: number;
  dependencies: string[]; // Template stage IDs or instance IDs that must complete first
  description: string;
  status: WorkOrderStageStatus;
  startDate?: string;
  dueDate?: string;
  completedDate?: string;
  completedBy?: {
    id: string;
    name: string;
    role?: string;
  };
  checklist: WorkOrderStageChecklistItem[];
  mandatoryDocuments?: string[];
  notes?: string;
}

const STORAGE_KEY_WORKFLOW_TEMPLATES = 'efilingg_crm_workflow_templates';

/**
 * Built-in default workflow templates for standard business services
 */
export function getBuiltInWorkflowTemplates(): WorkflowTemplate[] {
  return [
    // 1. Private Limited Registration
    {
      id: 'tmpl_pvt_ltd_reg',
      serviceName: 'Private Limited Registration',
      serviceCode: 'PLC',
      department: 'MCA & Corporate Legal',
      category: 'Company Incorporation',
      description: 'End-to-end statutory incorporation of a Private Limited Company under Companies Act 2013, including RUN name reservation, SPICe+ Part A & B, MOA/AOA, PAN, TAN & EPFO/ESIC registrations.',
      totalExpectedDurationDays: 10,
      isSystemDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stages: [
        {
          id: 'stage_plc_1',
          name: 'KYC Collection & Class 3 DSC Verification',
          sequence: 1,
          expectedDurationDays: 2,
          dependencies: [],
          description: 'Obtain self-attested PAN, Aadhaar/Passport, bank utility bills from all proposed directors/shareholders and issue Class 3 cryptographic digital signatures.',
          checklist: [
            'Identity proof (PAN card) verified against ITD database',
            'Address proof (Passport/Voter ID/Driving License/Electricity bill < 2 mos) collected',
            'Passport-size photographs collected for all directors',
            'Class 3 Digital Signature Certificate (DSC) video e-KYC completed & token verified'
          ],
          mandatoryDocuments: ['PAN Card', 'Aadhaar Card', 'Bank Statement / Electricity Bill', 'Director Photos']
        },
        {
          id: 'stage_plc_2',
          name: 'Name Reservation (RUN / SPICe+ Part A)',
          sequence: 2,
          expectedDurationDays: 2,
          dependencies: ['stage_plc_1'],
          description: 'Perform trademark search and MCA database duplicate checking; draft significance of names and file SPICe+ Part A for official Central Registration Centre (CRC) approval.',
          checklist: [
            'Comprehensive trademark similarity check on IP India portal Class 1-45',
            'MCA company master data duplicate search completed',
            'File SPICe+ Part A with two proposed distinct names and primary business objects',
            'CRC Name Approval SRN generated and approval letter archived'
          ],
          mandatoryDocuments: ['Name Reservation Application', 'Object Clause Brief']
        },
        {
          id: 'stage_plc_3',
          name: 'Drafting MOA, AOA & Statutory Declarations',
          sequence: 3,
          expectedDurationDays: 2,
          dependencies: ['stage_plc_2'],
          description: 'Draft Memorandum of Association (MOA) and Articles of Association (AOA) tailored to business objects; prepare director consents (DIR-2) and INC-9 declarations.',
          checklist: [
            'Draft electronic MOA (e-MOA Form INC-33) with specific object clauses',
            'Draft electronic AOA (e-AOA Form INC-34) with shareholding rights',
            'Obtain signed Form DIR-2 consent from all proposed directors',
            'Prepare Form INC-9 self-declaration of non-conviction signed via DSC',
            'Registered office NOC and utility bill verification completed'
          ],
          mandatoryDocuments: ['e-MOA (INC-33)', 'e-AOA (INC-34)', 'DIR-2 Consent', 'INC-9 Affidavit', 'Office NOC']
        },
        {
          id: 'stage_plc_4',
          name: 'SPICe+ Part B, PAN, TAN & AGILE-PRO-S Filing',
          sequence: 4,
          expectedDurationDays: 3,
          dependencies: ['stage_plc_3'],
          description: 'Upload consolidated SPICe+ Part B with all linked forms on MCA portal, make statutory filing fee & stamp duty payment, and track ROC scrutiny.',
          checklist: [
            'Affix all director and professional (CA/CS/CWA) DSCs to PDF bundle',
            'AGILE-PRO-S form completed for GST, EPFO, ESIC and Profession Tax',
            'Upload forms to MCA V3 portal and generate Challan',
            'Pay MCA statutory filing fee and state stamp duty online',
            'Scrutinize CRC resubmission remarks if any raised and re-file promptly'
          ],
          mandatoryDocuments: ['Consolidated SPICe+ Part B', 'AGILE-PRO-S Form', 'Payment Challan']
        },
        {
          id: 'stage_plc_5',
          name: 'Certificate of Incorporation (COI) & Bank A/C Setup',
          sequence: 5,
          expectedDurationDays: 1,
          dependencies: ['stage_plc_4'],
          description: 'Receive Certificate of Incorporation with CIN, PAN & TAN allotment from Registrar of Companies; initiate zero-balance corporate bank account opening.',
          checklist: [
            'Download official Certificate of Incorporation (Form INC-11) bearing CIN',
            'Archive e-PAN and e-TAN allotment certificates',
            'Prepare First Board Resolution for Corporate Current Account opening',
            'Deliver incorporation docket and corporate master kit to client'
          ],
          mandatoryDocuments: ['Certificate of Incorporation', 'e-PAN Card', 'e-TAN Allotment Letter']
        }
      ]
    },

    // 2. GST Registration
    {
      id: 'tmpl_gst_reg',
      serviceName: 'GST Registration',
      serviceCode: 'GST',
      department: 'GST Department',
      category: 'Tax Registration',
      description: 'New GSTIN application on GST Common Portal under CGST/SGST Act, including TRN generation, Form GST REG-01 drafting, Aadhaar biometric verification and ARN tracking.',
      totalExpectedDurationDays: 7,
      isSystemDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stages: [
        {
          id: 'stage_gst_1',
          name: 'Document Gathering & Principal Place Verification',
          sequence: 1,
          expectedDurationDays: 1,
          dependencies: [],
          description: 'Collect and validate ownership proofs, electricity bill, rent agreement/NOC, authorized signatory identity documents and bank cancelled cheque/statement.',
          checklist: [
            'PAN card and Aadhaar of primary proprietor/partners/directors validated',
            'Electricity bill / Property tax receipt (< 2 months old) verified for business premises',
            'Rent agreement on non-judicial stamp paper with landlord NOC obtained',
            'Bank account proof (Cancelled cheque / first page of passbook) checked'
          ],
          mandatoryDocuments: ['PAN Card', 'Premises Proof', 'Rent Agreement & NOC', 'Bank Proof']
        },
        {
          id: 'stage_gst_2',
          name: 'TRN Generation & Form GST REG-01 Filing',
          sequence: 2,
          expectedDurationDays: 2,
          dependencies: ['stage_gst_1'],
          description: 'Generate Temporary Reference Number (TRN) on GST portal; fill business constitution, goods/services HSN/SAC codes, and submit Form REG-01.',
          checklist: [
            'Part-A TRN generated with mobile & email OTP validation',
            'Trade name, constitution of business, and reason for registration entered',
            'Top 5 HSN / SAC codes of goods and services configured',
            'Authorized signatory appointed with letter of authorization',
            'Form GST REG-01 uploaded and verified via DSC/EVC'
          ],
          mandatoryDocuments: ['Letter of Authorization', 'Form GST REG-01 XML/PDF']
        },
        {
          id: 'stage_gst_3',
          name: 'Aadhaar Authentication & Biometric Verification',
          sequence: 3,
          expectedDurationDays: 1,
          dependencies: ['stage_gst_2'],
          description: 'Trigger UIDAI Aadhaar authentication link to authorized signatories or coordinate biometric e-KYC at nearest GST Seva Kendra (GSK).',
          checklist: [
            'Aadhaar authentication link dispatched to registered mobile/email',
            'Promoters/partners successfully complete OTP-based UIDAI authentication',
            'Confirmation of successful authentication reflected on GST portal tracking'
          ],
          mandatoryDocuments: ['Aadhaar E-KYC Confirmation Receipt']
        },
        {
          id: 'stage_gst_4',
          name: 'ARN Tracking & Tax Officer Query Resolution',
          sequence: 4,
          expectedDurationDays: 2,
          dependencies: ['stage_gst_3'],
          description: 'Track Application Reference Number (ARN); actively monitor tax officer scrutiny and draft clarification response (Form GST REG-04) if notice (REG-03) is issued.',
          checklist: [
            'ARN status monitored daily on gst.gov.in portal',
            'Officer verification note scrutinised for jurisdiction jurisdictional doubts',
            'Submit Form GST REG-04 clarification with supplemental documentation if queried'
          ],
          mandatoryDocuments: ['ARN Acknowledgment', 'Clarification Response Form REG-04 (if applicable)']
        },
        {
          id: 'stage_gst_5',
          name: 'GSTIN Issuance & Registration Certificate Docket',
          sequence: 5,
          expectedDurationDays: 1,
          dependencies: ['stage_gst_4'],
          description: 'Download Form GST REG-06 Registration Certificate with Annexures A & B; configure first-time username/password on portal and deliver compliance guide.',
          checklist: [
            'Download official GST Registration Certificate (Form GST REG-06)',
            'Verify all business addresses and authorized personnel on Annexure A & B',
            'First-time login completed on GST Portal and master password securely stored',
            'Deliver Welcome Docket with monthly GSTR-1 and GSTR-3B compliance calendar to client'
          ],
          mandatoryDocuments: ['GST Certificate (REG-06)', 'Compliance Calendar']
        }
      ]
    },

    // 3. Trademark Registration
    {
      id: 'tmpl_trademark_reg',
      serviceName: 'Trademark Registration',
      serviceCode: 'TM',
      department: 'Intellectual Property (IP)',
      category: 'Intellectual Property',
      description: 'Comprehensive trademark protection under Trade Marks Act 1999, including public search, Class 1-45 classification, Form TM-A electronic filing, examination scrutiny and certificate issuance.',
      totalExpectedDurationDays: 14,
      isSystemDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stages: [
        {
          id: 'stage_tm_1',
          name: 'Comprehensive Trademark Search & Class Selection',
          sequence: 1,
          expectedDurationDays: 1,
          dependencies: [],
          description: 'Conduct phonetic, visual, and conceptual trademark search across IP India online database to ensure no conflicting prior marks exist.',
          checklist: [
            'Search wordmark on IP India Public Search across identical and associated Nice classes',
            'Device mark / logo similarity search with Vienna Codification guidelines',
            'Prepare TM Availability & Risk Assessment Report with percentage clearance',
            'Client confirmation received on preferred class and mark representation'
          ],
          mandatoryDocuments: ['Trademark Search Report', 'Logo / Wordmark Art File']
        },
        {
          id: 'stage_tm_2',
          name: 'Power of Attorney (TM-48) & User Affidavit Drafting',
          sequence: 2,
          expectedDurationDays: 2,
          dependencies: ['stage_tm_1'],
          description: 'Draft Power of Attorney Form TM-48 on non-judicial stamp paper; prepare User Affidavit proving continuous commercial prior use if mark is already in use.',
          checklist: [
            'Draft Form TM-48 Authorisation of Agent on requisite value stamp paper',
            'Draft User Affidavit (Form TM-A user date claim) with earliest invoice/domain proof',
            'Affidavit notarized and client digital signature affixed',
            'MSME / Udyam certificate obtained for 50% statutory fee concession (if eligible)'
          ],
          mandatoryDocuments: ['Executed Form TM-48', 'Notarized User Affidavit', 'MSME / Startup Certificate']
        },
        {
          id: 'stage_tm_3',
          name: 'Form TM-A Electronic Filing & Government Fee Receipt',
          sequence: 3,
          expectedDurationDays: 2,
          dependencies: ['stage_tm_2'],
          description: 'Submit electronic application Form TM-A on IP India portal, pay government filing fee via Bharatkosh, and generate application number for TM symbol use.',
          checklist: [
            'Form TM-A uploaded with description of goods/services conforming to Nice Classification',
            'Pay official statutory fees online via payment gateway',
            'Download Form TM-A acknowledgment receipt containing Application Number',
            'Notify client of right to officially append the ™ symbol'
          ],
          mandatoryDocuments: ['Form TM-A Application', 'Statutory Fee Challan Receipt']
        },
        {
          id: 'stage_tm_4',
          name: 'Examination Report Scrutiny & Reply Drafting',
          sequence: 4,
          expectedDurationDays: 7,
          dependencies: ['stage_tm_3'],
          description: 'Track application through Vienna Codification and Examination stage; scrutinize Examination Report (under Section 9 or 11) and submit formal written response.',
          checklist: [
            'Track status: Marked for Exam -> Examination Report Issued',
            'Review examiner grounds (Absolute vs Relative grounds of refusal)',
            'Draft legal reply citing judicial precedents, distinctive character, and prior use',
            'Submit formal written response on IP India portal within 30-day statutory timeline'
          ],
          mandatoryDocuments: ['Examination Report', 'Formal Written Reply Under Rule 33']
        },
        {
          id: 'stage_tm_5',
          name: 'Journal Publication & Registration Certificate Docket',
          sequence: 5,
          expectedDurationDays: 2,
          dependencies: ['stage_tm_4'],
          description: 'Monitor publication in Trade Marks Journal, track 4-month third-party opposition window, and download final Registered Trademark Certificate (®).',
          checklist: [
            'Verify publication details in weekly Trade Marks Journal',
            'Monitor 120-day public opposition window for any third-party notice of opposition',
            'Download digital Trademark Registration Certificate bearing Trade Marks Registrar seal',
            'Client handed over 10-year validity protection docket and renewal timeline'
          ],
          mandatoryDocuments: ['Trade Marks Journal Entry', 'Trademark Registration Certificate']
        }
      ]
    },

    // 4. FSSAI Registration
    {
      id: 'tmpl_fssai_reg',
      serviceName: 'FSSAI Registration',
      serviceCode: 'LIC',
      department: 'Licensing & Registrations',
      category: 'Food Safety Licensing',
      description: 'FoSCoS food safety compliance under Food Safety and Standards Act 2006, encompassing Basic Registration, State License or Central License based on production capacity/turnover.',
      totalExpectedDurationDays: 8,
      isSystemDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stages: [
        {
          id: 'stage_fssai_1',
          name: 'Food Business Categorization & Eligibility Audit',
          sequence: 1,
          expectedDurationDays: 1,
          dependencies: [],
          description: 'Audit food handling activities, annual turnover, and production capacity to determine whether Basic Registration (Form A) or State/Central License (Form B) is required.',
          checklist: [
            'Annual turnover and installed machinery capacity evaluated',
            'Identify exact Kind of Business (KoB) e.g. Manufacturer, Wholesaler, Cloud Kitchen, Retailer',
            'Select standardized FSSAI food product categories (01-18)',
            'Prepare Food Safety Management System (FSMS) declaration plan'
          ],
          mandatoryDocuments: ['Premises Electricity Bill / Lease', 'Photo ID of Food Business Operator', 'FSMS Declaration']
        },
        {
          id: 'stage_fssai_2',
          name: 'FoSCoS Portal Drafting (Form A / Form B)',
          sequence: 2,
          expectedDurationDays: 2,
          dependencies: ['stage_fssai_1'],
          description: 'Create user account on Food Safety Compliance System (FoSCoS) portal; draft Form A / B with premises layout, equipment list, and water test report.',
          checklist: [
            'FoSCoS business profile registered and mapped to designated district jurisdiction',
            'Upload kitchen / unit blueprint layout with dimensional measurements (for licenses)',
            'Upload list of machinery and equipment with horsepower / capacities',
            'Attach potable water test report from NABL-accredited lab (for manufacturing)',
            'Draft nomination of Food Safety Supervisor (FoSTaC certificate)'
          ],
          mandatoryDocuments: ['Form A / Form B Draft', 'Equipment List', 'Premises Blueprint', 'Water Test Report']
        },
        {
          id: 'stage_fssai_3',
          name: 'Treasury Challan Payment & Officer Scrutiny',
          sequence: 3,
          expectedDurationDays: 3,
          dependencies: ['stage_fssai_2'],
          description: 'Pay statutory treasury fee based on license validity (1-5 years), obtain Application Reference Number (ARN), and resolve any inspection queries.',
          checklist: [
            'Statutory government fee calculated and paid online via portal payment gateway',
            '17-digit FoSCoS Application Reference Number generated',
            'Track scrutiny by Designated Officer (DO) / Food Safety Officer (FSO)',
            'Submit query response within 30 days if revision or clarification requested'
          ],
          mandatoryDocuments: ['Government Fee Receipt', 'FoSCoS ARN Acknowledgment']
        },
        {
          id: 'stage_fssai_4',
          name: 'FSSAI License Issuance & QR Display Compliance',
          sequence: 4,
          expectedDurationDays: 2,
          dependencies: ['stage_fssai_3'],
          description: 'Download 14-digit FSSAI Registration / License certificate with QR code; generate standardized Food Safety Display Board (FSDB) for mandatory commercial display.',
          checklist: [
            'Download 14-digit FSSAI Certificate with authorized QR code and digital signature',
            'Generate color-coded Food Safety Display Board (FSDB) tailored to business KoB',
            'Verify license expiry date in renewal tracker database',
            'Deliver compliance guide on food sample testing and annual return Form D-1 filing'
          ],
          mandatoryDocuments: ['FSSAI 14-Digit Certificate', 'Food Safety Display Board (FSDB)']
        }
      ]
    },

    // 5. Income Tax Return
    {
      id: 'tmpl_itr_filing',
      serviceName: 'Income Tax Return',
      serviceCode: 'ITR',
      department: 'Income Tax & Audit',
      category: 'Tax Compliance',
      description: 'Annual computation of total income, Form 26AS/AIS/TIS reconciliation, Chapter VI-A deductions optimization, electronic filing of ITR-1 to ITR-7, and Aadhaar OTP e-verification.',
      totalExpectedDurationDays: 5,
      isSystemDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stages: [
        {
          id: 'stage_itr_1',
          name: 'Financial Data Gathering & AIS/TIS/26AS Reconciliation',
          sequence: 1,
          expectedDurationDays: 1,
          dependencies: [],
          description: 'Gather Form 16, interest certificates, profit and loss statements, and reconcile with Annual Information Statement (AIS), TIS and Form 26AS tax credits.',
          checklist: [
            'Download and cross-verify Form 26AS for TDS/TCS tax deduction credits',
            'Extract Annual Information Statement (AIS) and Taxpayer Information Summary (TIS)',
            'Gather bank account interest certificates and dividend statements',
            'Collect capital gains statements from mutual funds / demat brokers'
          ],
          mandatoryDocuments: ['Form 16 / 16A', 'Form 26AS', 'AIS & TIS Summary', 'Bank Statements']
        },
        {
          id: 'stage_itr_2',
          name: 'Computation of Total Income & Tax Optimization',
          sequence: 2,
          expectedDurationDays: 2,
          dependencies: ['stage_itr_1'],
          description: 'Compute income across all heads: Salary, House Property, Business/Profession, Capital Gains, and Other Sources; evaluate Old vs New Tax Regime.',
          checklist: [
            'Classify income under applicable 5 heads of income',
            'Apply allowable deductions under Chapter VI-A (80C, 80D, 80G, 80CCD)',
            'Perform comparative tax computation between Old Regime vs New Section 115BAC Regime',
            'Compute interest liabilities under Sections 234A, 234B, and 234C',
            'Generate net tax payable / refund due statement'
          ],
          mandatoryDocuments: ['Computation of Total Income Sheet', 'Tax Regime Comparison Matrix']
        },
        {
          id: 'stage_itr_3',
          name: 'Client Review & Tax Liability Authorization',
          sequence: 3,
          expectedDurationDays: 1,
          dependencies: ['stage_itr_2'],
          description: 'Share comprehensive computation statement with client for validation; collect confirmation on tax liability or self-assessment tax challan payment.',
          checklist: [
            'Draft computation report delivered to client with summary sheet',
            'Generate ITNS 280 Self-Assessment Tax challan if tax payable balance exists',
            'Verify challan payment BSR code, date and challan sequence number on portal',
            'Obtain explicit written approval / confirmation from client to proceed with e-filing'
          ],
          mandatoryDocuments: ['Approved Computation Sheet', 'Self-Assessment Tax Challan (if applicable)']
        },
        {
          id: 'stage_itr_4',
          name: 'Electronic Filing on Income Tax Portal & E-Verification',
          sequence: 4,
          expectedDurationDays: 1,
          dependencies: ['stage_itr_3'],
          description: 'Generate JSON / XML schema, upload on Income Tax e-filing 2.0 portal, obtain Acknowledgement Number, and complete Aadhaar OTP / Netbanking e-verification.',
          checklist: [
            'Generate schema-compliant ITR JSON for appropriate form (ITR-1 through ITR-7)',
            'Upload JSON to incometax.gov.in and clear schema validation errors',
            'Obtain 15-digit ITR Acknowledgement Number',
            'Complete instant e-verification via Aadhaar OTP / DSC / Net Banking',
            'Download and deliver ITR-V Acknowledgement and final computation to client'
          ],
          mandatoryDocuments: ['ITR-V Acknowledgement', 'Final Computation Docket']
        }
      ]
    },

    // 6. Accounting Services
    {
      id: 'tmpl_accounting_services',
      serviceName: 'Accounting Services',
      serviceCode: 'ACC',
      department: 'Accounts & Financial Services',
      category: 'Bookkeeping & Reporting',
      description: 'End-to-end periodic accounting and monthly financial closing, including purchase/sales voucher posting, bank reconciliation statement (BRS), statutory tax deductions, and MIS reporting.',
      totalExpectedDurationDays: 30,
      isSystemDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stages: [
        {
          id: 'stage_acc_1',
          name: 'Monthly Primary Document Collection & Chart of Accounts Setup',
          sequence: 1,
          expectedDurationDays: 5,
          dependencies: [],
          description: 'Onboard sales invoices, vendor expense bills, bank statements, credit card logs, and cash vouchers; configure standardized Chart of Accounts.',
          checklist: [
            'Sales register and outbound tax invoices collected',
            'Vendor purchase bills and expense payment vouchers gathered',
            'Monthly bank statements (CSV/PDF) extracted for all operational accounts',
            'Chart of Accounts groups and cost centers structured in Tally / Zoho Books'
          ],
          mandatoryDocuments: ['Sales Register', 'Vendor Bills Folder', 'Bank Statements']
        },
        {
          id: 'stage_acc_2',
          name: 'Ledger Posting & Expense Categorization',
          sequence: 2,
          expectedDurationDays: 10,
          dependencies: ['stage_acc_1'],
          description: 'Enter purchase, sales, receipt, and payment vouchers into accounting software with proper tax bifurcation (CGST/SGST/IGST/TDS).',
          checklist: [
            'Sales invoices booked with customer ledgers and GST rates',
            'Vendor bills posted with appropriate expense ledgers and Input Tax Credit (ITC) tags',
            'Depreciation and monthly amortization entries booked',
            'Petty cash register verified and journal entries passed'
          ],
          mandatoryDocuments: ['Accounting Journal Entries Log']
        },
        {
          id: 'stage_acc_3',
          name: 'Bank Reconciliation Statement (BRS) & Payment Matching',
          sequence: 3,
          expectedDurationDays: 5,
          dependencies: ['stage_acc_2'],
          description: 'Perform Bank Reconciliation Statement (BRS) matching book balances with bank statement balances; investigate and clear discrepancies.',
          checklist: [
            'Match bank debits and credits against ledger transactions',
            'Identify unpresented cheques, pending direct debits, or banking fees',
            'Adjust bank charges, interest credits, and payment gateway settlement fees',
            'Zero variance achieved between reconciled book balance and bank closing balance'
          ],
          mandatoryDocuments: ['Bank Reconciliation Statement (BRS)']
        },
        {
          id: 'stage_acc_4',
          name: 'Statutory Deductions & Tax Audit Compliance Check',
          sequence: 4,
          expectedDurationDays: 5,
          dependencies: ['stage_acc_3'],
          description: 'Review monthly withholding taxes (TDS under 194C, 194J, 194I, etc.), reconcile GST Input Tax Credit against GSTR-2B, and check PF/ESI liabilities.',
          checklist: [
            'TDS liability calculated by Section and prepared for Challan Form 281 payment',
            'GSTR-2B ITC matched against purchase register to flag missing vendor filings',
            'Advance tax instalments and statutory liabilities summarized',
            'Professional tax and payroll deductions cross-checked'
          ],
          mandatoryDocuments: ['TDS Calculation Sheet', 'GSTR-2B vs Books Reconciliation']
        },
        {
          id: 'stage_acc_5',
          name: 'Trial Balance, P&L, Balance Sheet & Management MIS',
          sequence: 5,
          expectedDurationDays: 5,
          dependencies: ['stage_acc_4'],
          description: 'Finalize Trial Balance, draft monthly Profit & Loss Account and Balance Sheet; compile executive Management Information System (MIS) dashboard report.',
          checklist: [
            'Debit and credit balances balanced in Trial Balance',
            'Monthly Profit & Loss Account generated with gross and net margin ratios',
            'Balance Sheet assets and liabilities verified with ledger schedules',
            'Executive MIS report compiled (Cash flow summary, debtor aging, KPI analysis)',
            'Deliver monthly accounting binder and management sign-off'
          ],
          mandatoryDocuments: ['Trial Balance', 'Profit & Loss Statement', 'Balance Sheet', 'Executive MIS Report']
        }
      ]
    },

    // 7. LLP Registration
    {
      id: 'tmpl_llp_reg',
      serviceName: 'LLP Registration & Agreement',
      serviceCode: 'LLP',
      department: 'MCA & Corporate Legal',
      category: 'Company Incorporation',
      description: 'Registration of Limited Liability Partnership under LLP Act 2008, including RUN-LLP name reservation, FiLLiP incorporation filing, drafting and filing Form 3 LLP Agreement.',
      totalExpectedDurationDays: 12,
      isSystemDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stages: [
        {
          id: 'stage_llp_1',
          name: 'Partner KYC & Digital Signature Certificates',
          sequence: 1,
          expectedDurationDays: 2,
          dependencies: [],
          description: 'Collect PAN, Aadhaar/Passport, address proofs of all designated partners and procure Class 3 Digital Signature Certificates.',
          checklist: [
            'Partner identity and address proofs validated',
            'Designated Partners identified (at least 2, one Indian resident)',
            'Class 3 DSC tokens procured and registered on MCA portal'
          ],
          mandatoryDocuments: ['Partner PANs', 'Address Proofs', 'Partner Photos']
        },
        {
          id: 'stage_llp_2',
          name: 'Name Reservation (RUN-LLP)',
          sequence: 2,
          expectedDurationDays: 2,
          dependencies: ['stage_llp_1'],
          description: 'File RUN-LLP application on MCA portal with two proposed names and business activity description.',
          checklist: [
            'Trademark conflict check completed',
            'MCA database similarity search executed',
            'File RUN-LLP web form and obtain Name Approval Letter'
          ],
          mandatoryDocuments: ['Name Approval Letter']
        },
        {
          id: 'stage_llp_3',
          name: 'FiLLiP Incorporation Form Submission',
          sequence: 3,
          expectedDurationDays: 4,
          dependencies: ['stage_llp_2'],
          description: 'File FiLLiP form for LLP incorporation along with consent of partners, registered office proof, and subscriber sheet.',
          checklist: [
            'Form FiLLiP prepared with partner contribution details',
            'Registered office NOC and utility bill attached',
            'Consent to act as designated partner (Form 9) prepared',
            'Upload form with DSCs and pay statutory fees'
          ],
          mandatoryDocuments: ['FiLLiP Application', 'Office NOC', 'Form 9 Consents']
        },
        {
          id: 'stage_llp_4',
          name: 'Certificate of Incorporation (COI) & PAN/TAN Allotment',
          sequence: 4,
          expectedDurationDays: 1,
          dependencies: ['stage_llp_3'],
          description: 'Obtain Certificate of Incorporation bearing LLPIN, and download e-PAN and e-TAN from MCA.',
          checklist: [
            'Download Certificate of Incorporation with LLPIN from CRC',
            'Verify e-PAN and e-TAN details',
            'Initiate corporate bank account opening'
          ],
          mandatoryDocuments: ['Certificate of Incorporation', 'e-PAN Card']
        },
        {
          id: 'stage_llp_5',
          name: 'LLP Agreement Drafting, Stamping & Form 3 Filing',
          sequence: 5,
          expectedDurationDays: 3,
          dependencies: ['stage_llp_4'],
          description: 'Draft comprehensive LLP Agreement, print on appropriate state non-judicial stamp paper, notarize, and file Form 3 within 30 days of incorporation.',
          checklist: [
            'Draft LLP Agreement specifying capital contribution, profit ratios, and rights',
            'Pay stamp duty and execute agreement before notary',
            'File Form 3 on MCA portal with executed agreement attached',
            'Obtain Form 3 approval acknowledgment from ROC'
          ],
          mandatoryDocuments: ['Stamped LLP Agreement', 'Form 3 Filing Receipt']
        }
      ]
    },

    // 8. MCA Annual Compliance
    {
      id: 'tmpl_mca_annual_filing',
      serviceName: 'MCA Annual Compliance & ROC Filing',
      serviceCode: 'MCA',
      department: 'MCA & Corporate Legal',
      category: 'Corporate Legal Compliance',
      description: 'Statutory yearly corporate filings under Companies Act 2013, including Director KYC (DIR-3 KYC), Financial Statements (AOC-4), and Annual Return (MGT-7/7A).',
      totalExpectedDurationDays: 15,
      isSystemDefault: true,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      stages: [
        {
          id: 'stage_mca_1',
          name: 'Annual Director KYC (DIR-3 KYC / Web KYC)',
          sequence: 1,
          expectedDurationDays: 3,
          dependencies: [],
          description: 'Verify Director Identification Numbers (DINs), complete mobile/email OTP authentication on MCA V3, and ensure active DIN status.',
          checklist: [
            'List all active DIN holders and verify previous year filings',
            'Trigger OTP authentication for web-based DIR-3 KYC',
            'Upload e-Form DIR-3 KYC with DSC and passport copy for changes/first-time filers'
          ],
          mandatoryDocuments: ['Director PAN & Passport Copy', 'DIR-3 KYC Challan']
        },
        {
          id: 'stage_mca_2',
          name: 'Audited Financial Statements & Board Report Review',
          sequence: 2,
          expectedDurationDays: 4,
          dependencies: ['stage_mca_1'],
          description: 'Review statutory auditor report, balance sheet, profit and loss, notes to accounts, and draft Board\'s Report with statutory disclosures.',
          checklist: [
            'Audited Financial Statements collected with Independent Auditor Report',
            'Draft Board of Directors Report under Section 134',
            'Annual General Meeting (AGM) notice and minutes prepared'
          ],
          mandatoryDocuments: ['Audited Balance Sheet & P&L', 'Independent Auditor Report', 'Board Report']
        },
        {
          id: 'stage_mca_3',
          name: 'Form AOC-4 Financial Statements Filing',
          sequence: 3,
          expectedDurationDays: 4,
          dependencies: ['stage_mca_2'],
          description: 'Prepare and upload Form AOC-4 / AOC-4 XBRL with all statutory attachments on MCA V3 portal.',
          checklist: [
            'Form AOC-4 XML / Web Form generated',
            'Attach signed balance sheet, P&L, auditor report, and director report',
            'Affix Director and practicing CA/CS digital signatures',
            'Pay MCA statutory fee and archive Challan'
          ],
          mandatoryDocuments: ['Form AOC-4 PDF', 'Filing Challan']
        },
        {
          id: 'stage_mca_4',
          name: 'Form MGT-7 / MGT-7A Annual Return Filing',
          sequence: 4,
          expectedDurationDays: 4,
          dependencies: ['stage_mca_3'],
          description: 'Prepare Annual Return Form MGT-7 (for standard companies) or MGT-7A (for small companies/OPCs) with shareholding pattern and director meetings.',
          checklist: [
            'Extract shareholding pattern, transfers, and indebtedness details',
            'Document board meetings and attendance records',
            'Upload Form MGT-7 / 7A with practicing CS certification where applicable',
            'Download final acknowledgment SRN and update corporate records'
          ],
          mandatoryDocuments: ['Form MGT-7 / 7A', 'Filing Challan', 'List of Shareholders']
        }
      ]
    }
  ];
}

/**
 * Retrieves all workflow templates from storage or initializes defaults.
 */
export function getWorkflowTemplates(): WorkflowTemplate[] {
  const raw = getStorageString(STORAGE_KEY_WORKFLOW_TEMPLATES);
  if (!raw) {
    const defaults = getBuiltInWorkflowTemplates();
    setStorageString(STORAGE_KEY_WORKFLOW_TEMPLATES, JSON.stringify(defaults));
    return defaults;
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Failed to parse workflow templates from storage:', err);
  }

  const defaults = getBuiltInWorkflowTemplates();
  setStorageString(STORAGE_KEY_WORKFLOW_TEMPLATES, JSON.stringify(defaults));
  return defaults;
}

/**
 * Saves workflow templates to persistent storage.
 */
export function saveWorkflowTemplates(templates: WorkflowTemplate[]): void {
  setStorageString(STORAGE_KEY_WORKFLOW_TEMPLATES, JSON.stringify(templates));
}

/**
 * Retrieves a workflow template by ID.
 */
export function getWorkflowTemplateById(templateId: string): WorkflowTemplate | undefined {
  const templates = getWorkflowTemplates();
  return templates.find(t => t.id === templateId);
}

/**
 * Finds the most relevant workflow template for a given service name or service code.
 */
export function getWorkflowTemplateForService(serviceNameOrCode: string, fallbackCode?: string): WorkflowTemplate | undefined {
  if (!serviceNameOrCode && !fallbackCode) return undefined;
  const templates = getWorkflowTemplates();
  const search = (serviceNameOrCode || '').toLowerCase().trim();
  const fallback = (fallbackCode || '').toLowerCase().trim();

  // 1. Exact match on service code
  const byCode = templates.find(
    t => t.serviceCode.toLowerCase() === search || (fallback && t.serviceCode.toLowerCase() === fallback)
  );
  if (byCode) return byCode;

  // 2. Exact match on service name
  const byExactName = templates.find(t => t.serviceName.toLowerCase() === search);
  if (byExactName) return byExactName;

  // 3. Partial / substring match on service name
  const bySub = templates.find(t =>
    search.includes(t.serviceName.toLowerCase()) ||
    t.serviceName.toLowerCase().includes(search)
  );
  if (bySub) return bySub;

  // 4. Keyword fuzzy mapping
  if (search.includes('pvt') || search.includes('private') || search.includes('incorporation') || search.includes('company')) {
    return templates.find(t => t.serviceCode === 'PLC');
  }
  if (search.includes('gst')) {
    return templates.find(t => t.serviceCode === 'GST');
  }
  if (search.includes('trademark') || search.includes('tm') || search.includes('brand') || search.includes('ip')) {
    return templates.find(t => t.serviceCode === 'TM');
  }
  if (search.includes('fssai') || search.includes('food')) {
    return templates.find(t => t.serviceCode === 'LIC');
  }
  if (search.includes('itr') || search.includes('income tax') || search.includes('tax return')) {
    return templates.find(t => t.serviceCode === 'ITR');
  }
  if (search.includes('account') || search.includes('bookkeeping') || search.includes('audit')) {
    return templates.find(t => t.serviceCode === 'ACC');
  }
  if (search.includes('llp')) {
    return templates.find(t => t.serviceCode === 'LLP');
  }
  if (search.includes('mca') || search.includes('roc')) {
    return templates.find(t => t.serviceCode === 'MCA');
  }

  return templates[0];
}

/**
 * Instantiates fresh WorkOrderStage array from a template, setting sequence,
 * dependencies, checklist items, and initial pending/in_progress statuses.
 */
export function instantiateStagesFromTemplate(
  template: WorkflowTemplate,
  startDateStr?: string
): WorkOrderStage[] {
  if (!template || !Array.isArray(template.stages)) return [];

  const baseDate = startDateStr ? new Date(startDateStr) : new Date();

  let accumulatedDays = 0;

  return template.stages
    .sort((a, b) => a.sequence - b.sequence)
    .map((tmplStage, idx) => {
      // Calculate stage target dates
      const stageStart = new Date(baseDate);
      stageStart.setDate(stageStart.getDate() + accumulatedDays);

      accumulatedDays += tmplStage.expectedDurationDays || 1;

      const stageDue = new Date(baseDate);
      stageDue.setDate(stageDue.getDate() + accumulatedDays);

      // Checklists
      const checklistItems: WorkOrderStageChecklistItem[] = (tmplStage.checklist || []).map((item, cIdx) => ({
        id: `chk-${tmplStage.id}-${cIdx + 1}`,
        title: item,
        completed: false
      }));

      // If stage has no dependencies, it can start immediately (pending or in_progress for stage 1)
      const isFirst = idx === 0;

      return {
        id: `wos-${Date.now().toString(36)}-${idx + 1}`,
        templateStageId: tmplStage.id,
        name: tmplStage.name,
        sequence: tmplStage.sequence,
        expectedDurationDays: tmplStage.expectedDurationDays || 1,
        dependencies: [...(tmplStage.dependencies || [])],
        description: tmplStage.description || '',
        status: isFirst ? 'in_progress' : 'pending',
        startDate: stageStart.toISOString().split('T')[0],
        dueDate: stageDue.toISOString().split('T')[0],
        checklist: checklistItems,
        mandatoryDocuments: tmplStage.mandatoryDocuments ? [...tmplStage.mandatoryDocuments] : []
      };
    });
}

/**
 * Checks if a specific stage is currently blocked by unmet dependencies.
 * Returns an object with { blocked: boolean, blockingStages: string[] }
 */
export function checkStageDependencyStatus(
  stage: WorkOrderStage,
  allStages: WorkOrderStage[]
): {
  isBlocked: boolean;
  unmetDependencies: { id: string; name: string; sequence: number }[];
} {
  if (!stage.dependencies || stage.dependencies.length === 0) {
    return { isBlocked: false, unmetDependencies: [] };
  }

  const unmet: { id: string; name: string; sequence: number }[] = [];

  for (const depId of stage.dependencies) {
    // Find dependency either by templateStageId or instance id or sequence
    const found = allStages.find(
      s => s.templateStageId === depId || s.id === depId || `stage_${s.sequence}` === depId
    );

    if (found && found.status !== 'completed' && found.status !== 'skipped') {
      unmet.push({
        id: found.id,
        name: found.name,
        sequence: found.sequence
      });
    }
  }

  return {
    isBlocked: unmet.length > 0,
    unmetDependencies: unmet
  };
}

/**
 * Calculates total expected duration from an array of stages
 */
export function calculateStagesTotalDuration(stages: { expectedDurationDays: number }[]): number {
  if (!stages || !stages.length) return 0;
  return stages.reduce((sum, s) => sum + (s.expectedDurationDays || 0), 0);
}

/**
 * Creates a new custom workflow template
 */
export function createWorkflowTemplate(
  payload: Omit<WorkflowTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isSystemDefault'>
): WorkflowTemplate {
  const templates = getWorkflowTemplates();
  const id = `tmpl_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  const now = new Date().toISOString();

  // Normalize stages sequence
  const sortedStages = [...payload.stages].sort((a, b) => a.sequence - b.sequence);
  const totalDays = calculateStagesTotalDuration(sortedStages);

  const newTemplate: WorkflowTemplate = {
    id,
    serviceName: payload.serviceName.trim(),
    serviceCode: payload.serviceCode.trim().toUpperCase() || 'SVC',
    department: payload.department,
    category: payload.category || 'General Services',
    description: payload.description.trim(),
    totalExpectedDurationDays: totalDays || payload.totalExpectedDurationDays || 7,
    stages: sortedStages,
    isSystemDefault: false,
    createdAt: now,
    updatedAt: now
  };

  templates.push(newTemplate);
  saveWorkflowTemplates(templates);
  return newTemplate;
}

/**
 * Updates an existing workflow template
 */
export function updateWorkflowTemplate(
  templateId: string,
  updates: Partial<Omit<WorkflowTemplate, 'id' | 'createdAt'>>
): boolean {
  const templates = getWorkflowTemplates();
  const idx = templates.findIndex(t => t.id === templateId);
  if (idx === -1) return false;

  const current = templates[idx];
  const now = new Date().toISOString();

  let stages = updates.stages ? [...updates.stages].sort((a, b) => a.sequence - b.sequence) : current.stages;
  let totalDuration = updates.totalExpectedDurationDays || calculateStagesTotalDuration(stages);

  templates[idx] = {
    ...current,
    ...updates,
    stages,
    totalExpectedDurationDays: totalDuration,
    updatedAt: now
  };

  saveWorkflowTemplates(templates);
  return true;
}

/**
 * Deletes a custom workflow template. Cannot delete system default templates.
 */
export function deleteWorkflowTemplate(templateId: string): { success: boolean; message?: string } {
  const templates = getWorkflowTemplates();
  const target = templates.find(t => t.id === templateId);

  if (!target) {
    return { success: false, message: 'Template not found.' };
  }

  if (target.isSystemDefault) {
    return { success: false, message: 'System default templates cannot be deleted. You can edit their stages or create a custom version.' };
  }

  const filtered = templates.filter(t => t.id !== templateId);
  saveWorkflowTemplates(filtered);
  return { success: true };
}

/**
 * Resets templates back to official system defaults.
 */
export function resetWorkflowTemplatesToDefault(): WorkflowTemplate[] {
  const defaults = getBuiltInWorkflowTemplates();
  saveWorkflowTemplates(defaults);
  return defaults;
}

export const BUILT_IN_WORKFLOW_TEMPLATES = getBuiltInWorkflowTemplates();

