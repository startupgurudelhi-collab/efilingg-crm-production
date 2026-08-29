/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Employee, ALL_APP_MODULES } from '../types';
import { getEmployeeAccessibleModules } from '../lib/permissions';
import {
  getAttendances,
  getAttendanceMetricsForCycle,
  getLeads,
  getISTDateString
} from '../lib/db';
import {
  X, Save, User, Lock, MapPin, Mail, Phone, Briefcase,
  ShieldCheck, Camera, Check, AlertCircle, Eye, EyeOff,
  Layers, Calendar, Award, Sparkles, Building2, KeyRound,
  FileText, Download, Printer, DollarSign
} from 'lucide-react';
import OfferLetterModal from './OfferLetterModal';

interface EmployeeProfileSettingsModalProps {
  sessionUser: Employee;
  onClose: () => void;
  onUpdateSuccess: (updatedEmployee: Employee) => void;
}

export default function EmployeeProfileSettingsModal({
  sessionUser,
  onClose,
  onUpdateSuccess
}: EmployeeProfileSettingsModalProps) {
  // Editable state
  const [photo, setPhoto] = useState<string>(sessionUser.photo || '');
  const [address, setAddress] = useState<string>(sessionUser.address || '');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);

  // Offer Letter modal state
  const [showOfferLetterModal, setShowOfferLetterModal] = useState<boolean>(false);

  // Salary slip calculation state
  const currentMonthStr = getISTDateString().substring(0, 7); // "2026-08"
  const [selectedSlipMonth, setSelectedSlipMonth] = useState<string>(currentMonthStr);

  // Status & error states
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const accessibleModules = getEmployeeAccessibleModules(sessionUser);

  // Date of joining display & tenure calculation
  const joiningDate = sessionUser.dateOfJoining || sessionUser.joinedDate || '2026-06-01';
  const calculateTenure = (joinDateStr: string) => {
    try {
      const start = new Date(joinDateStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      if (months > 0) {
        return `${months} month${months > 1 ? 's' : ''} ${remainingDays} day${remainingDays !== 1 ? 's' : ''} (${diffDays} days)`;
      }
      return `${diffDays} days`;
    } catch {
      return 'Active Member';
    }
  };

  // Generate available months for salary slip
  const getRecentMonths = () => {
    const months = [];
    const curr = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const val = `${yr}-${mo}`;
      const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      months.push({ val, label });
    }
    return months;
  };

  const availableMonths = getRecentMonths();

  // Salary Slip Calculation
  const getSalarySlipData = (monthStr: string) => {
    const metrics = getAttendanceMetricsForCycle(sessionUser.id, monthStr);
    const activeDays = Math.max(0, 30 - metrics.deductionDays);
    const baseS = Number(sessionUser.salary) || 25000;
    const otherS = (sessionUser.otherFixedAllowance !== undefined && sessionUser.otherFixedAllowance !== null)
      ? Number(sessionUser.otherFixedAllowance)
      : (sessionUser.allowances !== undefined ? Number(sessionUser.allowances) : 1500);
    const ratioS = activeDays / 30;

    const eBasic = Math.round(baseS * ratioS);
    const eOther = Math.round(otherS * ratioS);

    const leads = getLeads();
    const approvedConvs = leads.filter(l =>
      l.assignedTo === sessionUser.id &&
      l.stage === 'Converted' &&
      l.incentiveStatus === 'approved' &&
      (l.incentiveApprovedAt ? l.incentiveApprovedAt.substring(0, 7) === monthStr : false)
    );
    const eIncentive = approvedConvs.reduce(
      (sum, l) => sum + (l.incentiveAmount !== undefined ? l.incentiveAmount : (Number(sessionUser.incentivePerConversion) || 500)),
      0
    );
    const totalGross = eBasic + eOther + eIncentive;

    return {
      metrics,
      activeDays,
      baseS,
      otherS,
      eBasic,
      eOther,
      approvedConvs,
      eIncentive,
      totalGross
    };
  };

  const slipData = getSalarySlipData(selectedSlipMonth);

  // Print Salary Slip
  const handlePrintSalarySlip = () => {
    const emp = sessionUser;
    const slipWindow = window.open('', '_blank');
    if (!slipWindow) return;

    let conversionLinesCode = '';
    if (slipData.approvedConvs.length > 0) {
      conversionLinesCode = `
        <div style="margin-top:20px; border-top:1.5px dashed #cbd5e1; padding-top:10px;">
          <span style="font-size:10px; font-weight:800; color:#64748b; letter-spacing:0.5px; text-transform:uppercase;">CREDITED CASE LEVEL COMMISSION LOGS</span>
          ${slipData.approvedConvs.map(l => `
            <div style="display:flex; justify-content:space-between; font-size:10.5px; padding:4px 0; border-bottom:0.5px solid #f1f5f9; color:#334155;">
              <span>Lead: <b>${l.customerName}</b> (${l.serviceRequired})</span>
              <span style="font-family:monospace; font-weight:bold; color:#16a34a;">+INR ${l.incentiveAmount || 500}</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    slipWindow.document.write(`
      <html>
        <head>
          <title>Salary Payslip - ${emp.name} (${selectedSlipMonth})</title>
          <style>
            body { background:#fff; font-family:'Segoe UI',system-ui,sans-serif; color:#0f172a; padding:40px; margin:0; }
            .slip-card { border:1px solid #e2e8f0; border-radius:20px; padding:30px; box-shadow:0 4px 6px -1px rgb(0,0,0,0.05); }
            .official-header { text-align:center; margin-bottom:20px; }
            .official-header h1 { margin:0; font-size:16px; font-weight:900; letter-spacing:1px; color:#1e1b4b; }
            .official-header h2 { margin:5px 0 0 0; font-size:9.5px; color:#64748b; word-spacing:1px; }
            .title-box { background:#f1f5f9; border-top:1.5px solid #334155; border-bottom:1.5px solid #334155; text-align:center; padding:8px; font-weight:900; font-size:11px; margin:25px 0; text-transform:uppercase; letter-spacing:2px; color:#1e293b; }
            .meta-section { display:grid; grid-template-columns:1fr 1fr; gap:20px; font-size:11px; margin-bottom:30px; background:#f8fafc; padding:15px; border-radius:12px; }
            .meta-item { display:flex; margin-bottom:5px; justify-content:space-between; }
            .meta-label { font-weight:bold; color: #475569; }
            .meta-val { color:#0f172a; font-weight:600; }
            .ledger-table { width:100%; border-collapse:collapse; font-size:11.5px; margin-top:20px; }
            .ledger-table th { background:#f8fafc; border:1px solid #cbd5e1; padding:10px; text-align:left; font-weight:900; color:#334155; text-transform:uppercase; font-size:9px; }
            .ledger-table td { border:1.5px solid #e2e8f0; padding:10px; }
            .ledger-table tr.total-row { font-weight:bold; background:#f1f5f9; font-size:12px; }
            .ledger-table tr.total-row td { border-top:2px solid #0f172a; color:#0f172a; }
            .footer-sig-block { margin-top:50px; display:flex; justify-content:space-between; font-size:10px; color:#64748b; }
            .sig-placeholder { text-align:center; width:180px; border-top:1px solid #94a3b8; margin-top:30px; padding-top:6px; color:#334155; font-weight:bold; }
            @media print { body { padding:0; } .slip-card { border:none; box-shadow:none; padding:0; } }
          </style>
        </head>
        <body onload="window.print();">
          <div class="slip-card">
            <div class="official-header">
              <h1>EFILINGG FINANCIAL SERVICES PRIVATE LIMITED</h1>
              <h2>REG BOARD HELPLINES: 011-45768289, 9217666839 | MAIL: efilingghelpdesk@gmail.com</h2>
            </div>
            <div class="title-box">OFFICIAL COMPLIANCE MONTHLY PAYROLL STATEMENT - ${selectedSlipMonth.toUpperCase()}</div>
            <div class="meta-section">
              <div>
                <div class="meta-item"><span class="meta-label">Employee Code:</span><span class="meta-val">${emp.employeeCode || emp.id}</span></div>
                <div class="meta-item"><span class="meta-label">Full Name:</span><span class="meta-val">${emp.name}</span></div>
                <div class="meta-item"><span class="meta-label">Designation:</span><span class="meta-val">${emp.designation || 'Compliance Officer'}</span></div>
                <div class="meta-item"><span class="meta-label">Date of Joining:</span><span class="meta-val">${joiningDate}</span></div>
              </div>
              <div>
                <div class="meta-item"><span class="meta-label">Payroll Period:</span><span class="meta-val" style="color:#4f46e5; font-weight:bold;">${selectedSlipMonth}</span></div>
                <div class="meta-item"><span class="meta-label">Attendance Days:</span><span class="meta-val">${slipData.activeDays} / 30 Days (Present: ${slipData.metrics.presentDays}, Paid Leave: ${slipData.metrics.paidLeaveDays}, Week Off: ${slipData.metrics.weekOffDays})</span></div>
                <div class="meta-item"><span class="meta-label">Salary Deductions (LOP):</span><span class="meta-val" style="color:#ef4444;">${slipData.metrics.deductionDays} Days</span></div>
                <div class="meta-item"><span class="meta-label">Remitted On Date:</span><span class="meta-val">${getISTDateString()}</span></div>
              </div>
            </div>
            <table class="ledger-table">
              <thead>
                <tr>
                  <th>Wages description</th>
                  <th style="text-align:right;">Fixed standard month slab</th>
                  <th style="text-align:right;">Actual earned wages</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Regular Basic Base Income</td>
                  <td style="text-align:right; font-family:monospace;">₹${slipData.baseS.toLocaleString()}</td>
                  <td style="text-align:right; font-family:monospace; font-weight:bold;">₹${slipData.eBasic.toLocaleString()}</td>
                </tr>
                <tr>
                  <td>Other General Allowances Slabs</td>
                  <td style="text-align:right; font-family:monospace;">₹${slipData.otherS.toLocaleString()}</td>
                  <td style="text-align:right; font-family:monospace; font-weight:bold;">₹${slipData.eOther.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color:#4f46e5; font-weight:bold;">Approved Conversion Commission Bonuses (${slipData.approvedConvs.length} cases)</td>
                  <td style="text-align:right; color:#94a3b8; font-style:italic;">Dynamic tally</td>
                  <td style="text-align:right; font-family:monospace; font-weight:bold; color:#16a34a;">+₹${slipData.eIncentive.toLocaleString()}</td>
                </tr>
                <tr class="total-row">
                  <td>SUM BRACKET GROSS MONTH WAGES:</td>
                  <td style="text-align:right; font-family:monospace;">₹${(slipData.baseS + slipData.otherS).toLocaleString()}</td>
                  <td style="text-align:right; font-family:monospace; color:#4f46e5; font-size:13px; font-weight:900;">₹${slipData.totalGross.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
            ${conversionLinesCode}
            <div class="footer-sig-block">
              <div>* Authenticated official statement generated via Employee Portal. Validated digitally.</div>
              <div class="sig-placeholder">Authorized Director Stamp Signatory<br/>EFILINGG FINANCIAL SERVICES PVT LTD</div>
            </div>
          </div>
        </body>
      </html>
    `);
    slipWindow.document.close();
  };

  // Handle Photo file upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setErrorMsg('Profile photo size should be under 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        setPhoto(event.target.result);
        setErrorMsg('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhoto('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // If changing password, validate password rules
    let updatedPassword = sessionUser.password;
    if (newPassword.trim() !== '' || currentPassword.trim() !== '') {
      if (currentPassword !== sessionUser.password) {
        setErrorMsg('Current password does not match. Please verify and retry.');
        return;
      }
      if (newPassword.length < 6) {
        setErrorMsg('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New password and confirmation do not match.');
        return;
      }
      updatedPassword = newPassword;
    }

    setIsSaving(true);

    try {
      // Create updated employee object
      const updatedRecord: Employee = {
        ...sessionUser,
        photo: photo.trim(),
        address: address.trim(),
        password: updatedPassword,
        isPasswordChanged: true,
        updatedAt: new Date().toISOString(),
        updatedBy: sessionUser.id
      };

      onUpdateSuccess(updatedRecord);
      setSuccessMsg('Profile settings and password successfully saved and updated!');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in font-sans">
        <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-4">
          
          {/* Header with gradient decoration */}
          <div className="relative px-5 sm:px-6 py-4 sm:py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xs">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                  Employee Account & Profile Settings
                </h3>
                <p className="text-xs text-emerald-100 font-medium">
                  Official Credentials, Joining Details, Offer Letter, Salary Slips & Password Management
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Close Settings"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Status Alerts */}
          {errorMsg && (
            <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <Check className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5 max-h-[78vh] overflow-y-auto">
            
            {/* Section 1: Profile Photo & Header Overview */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-5">
              {/* Avatar container */}
              <div className="relative group shrink-0">
                <div className="h-20 w-20 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-2xl shadow-md overflow-hidden border-2 border-white dark:border-slate-800">
                  {photo ? (
                    <img src={photo} alt={sessionUser.name} className="h-full w-full object-cover" />
                  ) : (
                    <span>{sessionUser.name.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <label
                  htmlFor="profile-photo-upload"
                  className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer transition-all border-2 border-white dark:border-slate-900"
                  title="Change Profile Photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <input
                    id="profile-photo-upload"
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Profile Summary & Photo Controls */}
              <div className="flex-1 text-center sm:text-left space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {sessionUser.name}
                  </h4>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 uppercase">
                    {sessionUser.role}
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                    {sessionUser.employeeCode || sessionUser.id}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {sessionUser.designation || 'Compliance Associate'} • {sessionUser.department || 'Operations'}
                </p>
                
                <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs">
                  <label
                    htmlFor="profile-photo-upload"
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-100 transition cursor-pointer text-[11px]"
                  >
                    Upload New Photo
                  </label>
                  {photo && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-900/40 font-bold text-[11px] hover:bg-rose-100 transition cursor-pointer"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: OFFICIAL CREDENTIALS & JOINING DETAILS */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                  <span>OFFICIAL CREDENTIALS & JOINING RECORD</span>
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-900/50">
                  Verified Employee Record
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-850/40 border border-slate-200 dark:border-slate-800">
                {/* Employee ID */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <ShieldCheck className="h-3 w-3 text-slate-400" />
                    <span>Employee Code / ID</span>
                  </label>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    {sessionUser.employeeCode || sessionUser.id}
                  </div>
                </div>

                {/* Joining Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-emerald-500" />
                    <span>Date of Joining</span>
                  </label>
                  <div className="p-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
                    <span>{joiningDate}</span>
                    <span className="text-[9.5px] font-normal text-emerald-700 dark:text-emerald-300">
                      {calculateTenure(joiningDate)}
                    </span>
                  </div>
                </div>

                {/* Registered Email */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Mail className="h-3 w-3 text-slate-400" />
                    <span>Registered Email</span>
                  </label>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-slate-200 truncate" title={sessionUser.email}>
                    {sessionUser.email}
                  </div>
                </div>

                {/* Registered Mobile */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Phone className="h-3 w-3 text-slate-400" />
                    <span>Official Mobile</span>
                  </label>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-800 dark:text-slate-200">
                    +91 {sessionUser.mobile}
                  </div>
                </div>

                {/* Department & Designation */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Briefcase className="h-3 w-3 text-slate-400" />
                    <span>Designation & Department</span>
                  </label>
                  <div className="p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                    {sessionUser.designation || 'Compliance Associate'} ({sessionUser.department || 'Operations'})
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: HR DOCUMENTS & DOWNLOADS (OFFER LETTER & SALARY SLIPS) */}
            <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/50 via-slate-50 to-emerald-50/30 dark:from-slate-850/60 dark:via-slate-900 dark:to-indigo-950/30 border border-indigo-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-600" />
                  <span>OFFICIAL HR DOCUMENTS & PAYSLIPS DOWNLOAD</span>
                </span>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-100/60 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                  Direct PDF Access
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* 1. Official Offer Letter Download Card */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 shadow-xs hover:border-indigo-300 transition-all">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className="h-7 w-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <Award className="h-4 w-4" />
                      </div>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                        Appointment / Offer Letter
                      </h5>
                    </div>
                    <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
                      Official Efilingg letterhead document outlining terms, designation, CTC compensation, and joining particulars.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowOfferLetterModal(true)}
                    className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Offer Letter (PDF)</span>
                  </button>
                </div>

                {/* 2. Monthly Salary Slip Download Card */}
                <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3 shadow-xs hover:border-emerald-300 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="h-7 w-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                          <DollarSign className="h-4 w-4" />
                        </div>
                        <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                          Monthly Salary Slip
                        </h5>
                      </div>
                      
                      {/* Month Selector */}
                      <select
                        value={selectedSlipMonth}
                        onChange={(e) => setSelectedSlipMonth(e.target.value)}
                        className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold text-slate-800 dark:text-slate-200 cursor-pointer outline-none"
                      >
                        {availableMonths.map((m) => (
                          <option key={m.val} value={m.val}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850/70 border border-slate-100 dark:border-slate-800 text-[10px] space-y-0.5">
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-500">Working Days:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{slipData.activeDays} / 30 Days</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-500">Net Gross Pay:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{slipData.totalGross.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePrintSalarySlip}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-xs cursor-pointer transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>Download / Print Salary Slip</span>
                  </button>
                </div>

              </div>
            </div>

            {/* Section 4: PERMITTED SERVICES & MODULES */}
            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-500" />
                <span>ASSIGNED SERVICES & MODULE PERMISSIONS</span>
              </span>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-850/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[10.5px] font-bold">
                    <span>⚡ Task Command Center</span>
                  </span>
                  {accessibleModules.map(modId => {
                    const info = ALL_APP_MODULES.find(m => m.id === modId);
                    return (
                      <span
                        key={modId}
                        className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-700 dark:text-emerald-300 text-[10.5px] font-bold"
                      >
                        <Check className="h-3 w-3 text-emerald-600" />
                        <span>{info?.label || modId.toUpperCase()}</span>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Section 5: EDITABLE COMMUNICATION ADDRESS */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-indigo-500" />
                <span>RESIDENTIAL / COMMUNICATION ADDRESS (EDITABLE)</span>
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your current residential / correspondence address..."
                className="w-full p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition"
              />
            </div>

            {/* Section 6: EDITABLE PASSWORD CHANGE */}
            <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-850/60 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-teal-500" />
                  <span>CHANGE ACCOUNT PASSWORD</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Leave blank if not changing</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Current Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Existing Password"
                      className="w-full p-2.5 pr-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showCurrentPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full p-2.5 pr-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type new password"
                    className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-900/20 transition cursor-pointer disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? 'Saving Updates...' : 'Save Profile Changes'}</span>
              </button>
            </div>

          </form>
        </div>
      </div>

      {/* Offer Letter Viewer Modal */}
      {showOfferLetterModal && (
        <OfferLetterModal
          employee={sessionUser}
          onClose={() => setShowOfferLetterModal(false)}
        />
      )}
    </>
  );
}
