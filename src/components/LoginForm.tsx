/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { loginEmployee, updateEmployee, setSessionUser as setSessionUserInDB, getEmployeeById } from '../lib/db';
import { Employee } from '../types';
import { Shield, Key, Mail, Building2, ArrowRight, Eye, EyeOff, Lock, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import EFilinggLogo from './EFilinggLogo';

interface LoginFormProps {
  onLoginSuccess: (user: Employee) => void;
  syncStatus?: 'syncing' | 'connected' | 'error' | 'no_table' | 'idle';
}

export default function LoginForm({ onLoginSuccess, syncStatus = 'idle' }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // States for forced first-time password update
  const [firstTimeUser, setFirstTimeUser] = useState<Employee | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide email and password credentials.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Force pull absolute latest data from PostgreSQL VPS database on login submit to avoid old cached state
      const { pullFromPostgres } = await import('../lib/postgresSync');
      await pullFromPostgres();

      const result = loginEmployee(email, password);
      setIsLoading(false);
      if (typeof result === 'string') {
        setError(result);
      } else {
        // If password is not changed yet (isPasswordChanged is false/missing), trigger change password
        if (result.isPasswordChanged === false) {
          setFirstTimeUser(result);
        } else {
          onLoginSuccess(result);
        }
      }
    } catch (err: any) {
      setIsLoading(false);
      setError('Connection with corporate headquarters failed. Please verify your connection status.');
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangePasswordError(null);

    if (!newPassword || !confirmPassword) {
      setChangePasswordError('Please enter and confirm your brand new password.');
      return;
    }
    if (newPassword.length < 6) {
      setChangePasswordError('Password must be at least 6 characters long for security.');
      return;
    }
    if (newPassword === 'efilingg@123') {
      setChangePasswordError('Please specify a secure password different from the default "efilingg@123".');
      return;
    }
    if (newPassword !== confirmPassword) {
      setChangePasswordError('The specified password confirmation does not match the new password.');
      return;
    }

    if (firstTimeUser) {
      setIsLoading(true);
      try {
        // Fetch absolute freshest corporate records first to merge and avoid overwriting other users
        const { pullFromPostgres } = await import('../lib/postgresSync');
        await pullFromPostgres();

        // Save changes to localStorage database
        updateEmployee(firstTimeUser.id, {
          password: newPassword,
          isPasswordChanged: true
        }, firstTimeUser.id);

        // Ensure we force wait for pending PostgreSQL pushes to complete to ensure the password is fully pushed to PostgreSQL
        const { waitForPendingPushes } = await import('../lib/postgresSync');
        await waitForPendingPushes();

        // Save user session safely in localStorage
        setSessionUserInDB(firstTimeUser.id);

        const updatedUser = getEmployeeById(firstTimeUser.id);
        setIsLoading(false);
        if (updatedUser) {
          onLoginSuccess(updatedUser);
        } else {
          onLoginSuccess({
            ...firstTimeUser,
            password: newPassword,
            isPasswordChanged: true
          });
        }
      } catch (err: any) {
        setIsLoading(false);
        setChangePasswordError('Failed to change password. Connection failed.');
      }
    }
  };


  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Visual Left Panel */}
      <div className="hidden lg:grid w-1/2 bg-slate-900 border-r border-slate-800 text-white relative overflow-hidden items-center p-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.1),transparent_40%)]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        
        <div className="space-y-12 relative z-10 max-w-lg">
          <div className="flex items-center">
            <EFilinggLogo variant="dark" size="lg" className="-ml-6" />
          </div>

          <div className="space-y-6">
            <h1 className="text-4xl font-bold tracking-tight text-slate-100 sm:text-5xl">
              Professional Lead & Proposal Management
            </h1>
            <p className="text-lg text-slate-400 leading-relaxed">
              Supercharge your consultancy workflow. Seamlessly track customer filings, generate high-fidelity dynamic proposals, dispatch automatic WhatsApp reminders, and organize secure internal handoffs.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex items-start space-x-4">
              <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 mt-1">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-slate-200">Role-Based Gateways</h4>
                <p className="text-sm text-slate-400 mt-0.5">Separate access workflows for Master Admins and front-facing filing Associates.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-emerald-400 mt-1">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-medium text-slate-200">Automated Filing Inventory</h4>
                <p className="text-sm text-slate-400 mt-0.5">Pre-seeded Indian standard agency tariffs with custom quote revision locks.</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Powered by secure localized database engine</span>
            <span>V2.4.0</span>
          </div>
        </div>
      </div>

      {/* Login / Forced Change password Panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 sm:p-12 md:p-16">
        <div className="w-full max-w-md space-y-8">
          
          {/* FIRST TIME USER PASSWORD RESET ENVELOPE */}
          {firstTimeUser ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-3xl shadow-xl"
            >
              <div className="text-center space-y-2">
                <div className="h-12 w-12 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto">
                  <Lock className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-50">
                  Secure Your Account
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Hi <strong className="text-slate-800 dark:text-slate-200">{firstTimeUser.name}</strong>, this is your first login. For safety compliance, please change your default password "efilingg@123" to continue.
                </p>
              </div>

              {changePasswordError && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900 text-rose-650 dark:text-rose-450 text-xs font-semibold">
                  {changePasswordError}
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                {/* New Password */}
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-slate-500 block">
                    Choose New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter secure password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-550 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-slate-500 block">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Repeat secure password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-3.5 pr-11 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-slate-50 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-550 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setFirstTimeUser(null)}
                    className="w-1/3 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-650 dark:text-slate-350 font-bold rounded-xl text-xs transition-colors cursor-pointer text-center"
                  >
                    Go Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center space-x-1.5 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md cursor-pointer"
                  >
                    <span>Update & Sign In</span>
                    <CheckCircle className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          ) : (
            /* STANDARD INGRESS GATE */
            <div className="space-y-8">
              {/* Mobile logo header */}
              <div className="lg:hidden flex flex-col items-center text-center space-y-2">
                <EFilinggLogo variant="color" size="lg" className="mx-auto" />
                <div>
                  <p className="text-xs font-bold font-mono tracking-wide text-slate-500 dark:text-slate-400 uppercase mt-2">
                    Filing Lead & Proposal Management System
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-center lg:text-left">
                <h2 className="hidden lg:block text-3xl font-extrabold text-slate-900 dark:text-slate-50">
                  Authorized Portal Ingress
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Authorize securely with your workspace credentials.
                </p>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-650 dark:text-rose-400 text-sm font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    Corporate Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-600">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      placeholder="name@efilingg.com"
                      value={email}
                      disabled={isLoading || syncStatus === 'syncing'}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                      Password PIN
                    </label>
                    <span className="text-xs text-slate-400 dark:text-slate-500 text-[10px]">Defaults to 'efilingg@123' for recruits</span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-600">
                      <Key className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={password}
                      disabled={isLoading || syncStatus === 'syncing'}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-11 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-950 dark:text-slate-50 placeholder-slate-400 dark:placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:focus:ring-emerald-400 transition-all font-mono disabled:opacity-60"
                    />
                    <button
                      type="button"
                      disabled={isLoading || syncStatus === 'syncing'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-slate-600 hover:text-slate-650 disabled:opacity-40"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {syncStatus === 'syncing' ? (
                  <div className="w-full flex items-center justify-center space-x-2.5 py-3.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium text-xs border border-slate-155 dark:border-slate-800 shadow-inner">
                    <Loader2 className="h-4 w-4 text-emerald-650 dark:text-emerald-450 animate-spin" />
                    <span className="font-semibold tracking-wide">Synchronizing corporate workspace... Please wait...</span>
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-sm transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50 font-semibold"
                  >
                    {isLoading ? (
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Secure Authorized Workspace Access</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </form>


            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
