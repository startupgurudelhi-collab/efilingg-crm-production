/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee, EmployeeRole } from '../types';
import { X, Save, User, Mail, Phone, MapPin, Briefcase, DollarSign, Award, Sliders } from 'lucide-react';

interface EditEmployeeModalProps {
  employee: Employee;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Employee>) => void;
}

export default function EditEmployeeModal({ employee, onClose, onSave }: EditEmployeeModalProps) {
  const [photo, setPhoto] = useState(employee.photo || '');
  const [name, setName] = useState(employee.name || '');
  const [email, setEmail] = useState(employee.email || '');
  const [mobile, setMobile] = useState(employee.mobile || '');
  const [role, setRole] = useState<EmployeeRole>(employee.role || 'employee');
  const [department, setDepartment] = useState<string>(employee.department || 'SALES & MARKETING');
  const [code, setCode] = useState(employee.employeeCode || '');
  const [designation, setDesignation] = useState(employee.designation || '');
  const [dateOfJoining, setDateOfJoining] = useState(employee.dateOfJoining || '');
  const [salary, setSalary] = useState<number | string>(employee.salary || '');
  const [allowances, setAllowances] = useState<number | string>(employee.allowances || '');
  const [otherFixedAllowance, setOtherFixedAllowance] = useState<number | string>(employee.otherFixedAllowance || '');
  const [incentivePerConversion, setIncentivePerConversion] = useState<number | string>(employee.incentivePerConversion || '');
  const [address, setAddress] = useState(employee.address || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !mobile.trim()) {
      alert('Required employee fields (Name, Email, Mobile) must be filled.');
      return;
    }

    onSave(employee.id, {
      name,
      email,
      mobile,
      role,
      department,
      employeeCode: code || employee.employeeCode,
      designation: designation || employee.designation,
      dateOfJoining: dateOfJoining || employee.dateOfJoining,
      salary: Number(salary) || 0,
      allowances: Number(allowances) || 0,
      otherFixedAllowance: Number(otherFixedAllowance) || 0,
      incentivePerConversion: Number(incentivePerConversion) || 0,
      photo,
      address
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs overflow-y-auto flex items-center justify-center p-4 font-sans">
      
      {/* DIALOG BODY */}
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 shadow-2xl rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
        
        {/* HEADER BAR */}
        <div className="p-5 px-6 border-b border-slate-100 dark:border-slate-850 bg-slate-50 dark:bg-slate-950 flex items-center justify-between shrink-0 select-none">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-xl">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                Edit Employee Credentials
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold font-mono">
                UPDATING INTERNAL ID & SALARY METRICS FOR: {employee.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-205 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg transition-all cursor-pointer"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* SCROLLABLE FORM */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          
          {/* PROFILE PHOTO EDIT SECTOR */}
          <div className="flex items-center space-x-4 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800">
            <div className="h-14 w-14 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex items-center justify-center font-bold font-mono text-[9px] text-slate-400 border border-slate-300 dark:border-slate-700 shrink-0">
              {photo ? (
                <img src={photo} alt="Avatar profile" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                'no pic'
              )}
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-[10px] uppercase font-extrabold text-slate-550 block">Update Employee Profile Photo Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setPhoto(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
                className="block w-full text-[10px] text-slate-500 file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-400 cursor-pointer"
              />
            </div>
          </div>

          {/* SECTION A: CARD CREDENTIALS */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800 pb-1">
              Personal & Work Coordinates
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Employee Full Name *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><User className="h-3.5 w-3.5" /></span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-100 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Primary Contacts *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><Phone className="h-3.5 w-3.5" /></span>
                  <input
                    type="tel"
                    required
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-100 font-medium font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">Corporate Email address *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400"><Mail className="h-3.5 w-3.5" /></span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-medium font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-500 block">Permanent/Residential Address (For Offer Letter letterhead) *</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400"><MapPin className="h-3.5 w-3.5" /></span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector 15-A, Noida, Gautam Budh Nagar, UP - 201301"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Designation Title</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400"><Briefcase className="h-3.5 w-3.5" /></span>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full pl-9 p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-855 dark:text-slate-101 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Employee Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-bold font-mono tracking-wide uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Date of Joining</label>
                <input
                  type="date"
                  value={dateOfJoining}
                  onChange={(e) => setDateOfJoining(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-955 border border-slate-202 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Workplace Authority Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as EmployeeRole)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-medium"
                >
                  <option value="employee">Filing Associate Desk (Employee Role)</option>
                  <option value="team_leader">Team Leader Management (Middle Tier)</option>
                  <option value="admin">Master Administrator Gateway (Admin Role)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-500 block">Workable Department</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-bold text-indigo-600 dark:text-indigo-400"
                >
                  <option value="SALES & MARKETING">SALES & MARKETING (V1 CRM)</option>
                  <option value="OPERATION MANAGEMENT">OPERATION MANAGEMENT (V2 ERP)</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION B: BANK & SALARY PAYSLIP SLABS */}
          <div className="space-y-3 pt-2">
            <h4 className="font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider text-[10px] border-b border-slate-100 dark:border-slate-800 pb-1">
              Monthly Remuneration Slabs
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1 col-span-1">
                <label className="font-bold text-slate-500 block">Basic Pay (₹)</label>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-mono text-center"
                />
              </div>

              <div className="space-y-1 col-span-1">
                <label className="font-bold text-slate-500 block">HRA/Travel (₹)</label>
                <input
                  type="number"
                  value={allowances}
                  onChange={(e) => setAllowances(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-mono text-center"
                />
              </div>

              <div className="space-y-1 col-span-1">
                <label className="font-bold text-slate-500 block">Fixed Allowances</label>
                <input
                  type="number"
                  value={otherFixedAllowance}
                  onChange={(e) => setOtherFixedAllowance(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-mono text-center"
                />
              </div>

              <div className="space-y-1 col-span-1">
                <label className="font-bold text-slate-500 block">Incentive (₹/Case)</label>
                <input
                  type="number"
                  value={incentivePerConversion}
                  onChange={(e) => setIncentivePerConversion(e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl text-slate-850 dark:text-slate-101 font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-650 dark:text-slate-300 rounded-xl cursor-pointer"
            >
              Cancel Edit
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 p-5 rounded-xl transition duration-150 shadow-md cursor-pointer text-xs"
            >
              <Save className="h-4.5 w-4.5" />
              <span>Update Credentials</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
