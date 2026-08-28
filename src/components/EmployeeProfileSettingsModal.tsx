/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Employee, ALL_APP_MODULES } from '../types';
import { getEmployeeAccessibleModules } from '../lib/permissions';
import {
  X, Save, User, Lock, MapPin, Mail, Phone, Briefcase,
  ShieldCheck, Camera, Check, AlertCircle, Eye, EyeOff,
  Layers, Calendar, Award, Sparkles, Building2, KeyRound
} from 'lucide-react';

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

  // Status & error states
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const accessibleModules = getEmployeeAccessibleModules(sessionUser);

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
      setSuccessMsg('Profile settings successfully saved and updated!');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        
        {/* Header with gradient decoration */}
        <div className="relative px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
              <User className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight leading-tight">
                My Profile & Account Settings
              </h3>
              <p className="text-xs text-emerald-100 font-medium">
                Manage your avatar photo, password, and communication address
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
            title="Close Profile Settings"
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
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
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

          {/* Section 2: STRICTLY READ-ONLY / LOCKED EMPLOYEE CREDENTIALS */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-amber-500" />
                <span>OFFICIAL CREDENTIALS (READ-ONLY • ADMIN MANAGED)</span>
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                🔒 Non-Editable
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-slate-100/70 dark:bg-slate-850/40 border border-slate-200 dark:border-slate-800">
              {/* Employee ID */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3 text-slate-400" />
                  <span>Employee ID / Code</span>
                </label>
                <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  {sessionUser.employeeCode || sessionUser.id}
                </div>
              </div>

              {/* Registered Email */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span>Registered Email ID</span>
                </label>
                <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 truncate" title={sessionUser.email}>
                  {sessionUser.email}
                </div>
              </div>

              {/* Registered Mobile */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>Official Mobile Number</span>
                </label>
                <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                  +91 {sessionUser.mobile}
                </div>
              </div>

              {/* Department & Designation */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                  <Briefcase className="h-3 w-3 text-slate-400" />
                  <span>Department & Designation</span>
                </label>
                <div className="p-2 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                  {sessionUser.designation || 'Associate'} ({sessionUser.department || 'Operations'})
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: PERMITTED SERVICES & MODULES BADGES */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-emerald-500" />
              <span>ASSIGNED SERVICES & MODULE PERMISSIONS</span>
            </span>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850/40 border border-slate-200/80 dark:border-slate-800 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-400/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold">
                  <span>⚡ Task Manager (Always Active)</span>
                </span>
                {accessibleModules.map(modId => {
                  const info = ALL_APP_MODULES.find(m => m.id === modId);
                  return (
                    <span
                      key={modId}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-400/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold"
                    >
                      <Check className="h-3 w-3 text-emerald-600" />
                      <span>{info?.label || modId.toUpperCase()}</span>
                    </span>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400">
                These modules are configured by Master Admin. Only statutory operations and desks for these assigned modules will appear in your workspace.
              </p>
            </div>
          </div>

          {/* Section 4: EDITABLE COMMUNICATION ADDRESS */}
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
              className="w-full p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 outline-none transition"
            />
            <p className="text-[10px] text-slate-400">
              You can update your correspondence address whenever you relocate.
            </p>
          </div>

          {/* Section 5: EDITABLE PASSWORD CHANGE */}
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
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
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
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
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
  );
}
