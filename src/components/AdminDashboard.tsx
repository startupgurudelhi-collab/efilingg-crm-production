/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  getEmployees,
  getLeads,
  getFollowUps,
  getProposals,
  getActivityLogs,
  createEmployee,
  updateEmployee,
  getCurrentSession,
  getPayrollMonths,
  getCurrentPayrollMonth,
  matchDateToMonth,
  getISTDateString,
  getISTTimeString,
  getRelativeISTDateString,
  saveLeads,
  saveLogs,
  getHistoricalPayrolls,
  addHistoricalPayroll,
  getAttendances,
  saveAttendances,
  getAttendanceAudits,
  getTLMappings,
  saveTLMappings,
  updateTLMapping,
  getTLAssignedEmployeeIds,
  updateAttendanceManually,
  runAttendanceAutoJobs,
  getAttendanceMetricsForCycle,
  calculateSalaryForCycle,
  getCycleDateRangeForMonth,
  getLeaveRequests,
  updateLeaveRequestStatus,
  getTransfers,
  transferLead,
  employeePunchIn,
  employeePunchOut,
  getResignationRequests,
  updateResignationStatus,
  transferEmployeeLeadsAndProposals,
  saveEmployees,
  saveResignationRequests
} from '../lib/db';
import { Employee, Lead, FollowUp, Proposal, ActivityLog, LeadStage, EmployeeRole, TeamLeaderMapping, LeaveRequest, HistoricalPayroll, ResignationRequest } from '../types';
import ServicesManager from './ServicesManager';
import ProposalTemplateEditor from './ProposalTemplateEditor';
import {
  Users,
  Briefcase,
  TrendingUp,
  LineChart,
  Grid,
  Plus,
  RefreshCw,
  Search,
  Filter,
  Trash2,
  CheckCircle,
  XCircle,
  Database,
  ArrowRight,
  Shield,
  HelpCircle,
  CheckCircle2,
  UserCheck,
  AlertCircle,
  FileSpreadsheet,
  Calendar,
  Clock,
  ExternalLink,
  PhoneCall,
  Printer,
  X,
  ArrowRightLeft
} from 'lucide-react';
import ImportExportWizard from './ImportExportWizard';
import OfferLetterTemplateEditor from './OfferLetterTemplateEditor';
import OfferLetterModal from './OfferLetterModal';
import EditEmployeeModal from './EditEmployeeModal';
import ExitLetterModal from './ExitLetterModal';

interface AdminDashboardProps {
  currentUserId: string;
  onRefreshData: () => void;
  triggerRefresh: number;
  onTriggerLeadDetail: (id: string | null) => void;
  onTriggerProposalPreview: (prop: Proposal) => void;
}

export default function AdminDashboard({
  currentUserId,
  onRefreshData,
  triggerRefresh,
  onTriggerLeadDetail,
  onTriggerProposalPreview
}: AdminDashboardProps) {
  // DB States
  const [rawEmployees, setEmployees] = useState<Employee[]>([]);
  const [rawLeads, setLeads] = useState<Lead[]>([]);
  const [rawFollowups, setFollowups] = useState<FollowUp[]>([]);
  const [rawProposals, setProposals] = useState<Proposal[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  // Local Views Tab
  const [viewTab, setViewTab] = useState<'analytics' | 'employees' | 'leads' | 'proposals' | 'logs' | 'backup' | 'services' | 'templates' | 'payroll'>('analytics');

  // Search & Filter leads state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterEmployee, setFilterEmployee] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'INTRESTED' | 'FOLLOWUP PENDING' | 'FINAL DISPOSED' | 'CONVERTED'>('ALL');

  // Add employee Form States
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [empPhoto, setEmpPhoto] = useState<string>('');
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empMobile, setEmpMobile] = useState('');
  const [empRole, setEmpRole] = useState<EmployeeRole>('employee');
  const [empDepartment, setEmpDepartment] = useState<string>('SALES & MARKETING');
  const [empCode, setEmpCode] = useState('');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empDateOfJoining, setEmpDateOfJoining] = useState('');
  const [empSalary, setEmpSalary] = useState<number | string>('');
  const [empAllowances, setEmpAllowances] = useState<number | string>('');
  const [empOtherFixedAllowance, setEmpOtherFixedAllowance] = useState<number | string>('');
  const [empIncentivePerConversion, setEmpIncentivePerConversion] = useState<number | string>('');
  const [empAddress, setEmpAddress] = useState('');

  // Editing state trackers
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showOfferLetterEmp, setShowOfferLetterEmp] = useState<Employee | null>(null);
  const [templatesSubTab, setTemplatesSubTab] = useState<'proposal' | 'offer'>('proposal');
  const [payrollSubTab, setPayrollSubTab] = useState<'calc' | 'history' | 'attendance' | 'leaves'>('calc');
  const [employeesSubTab, setEmployeesSubTab] = useState<'directory' | 'exits' | 'transfers'>('directory');
  const [rawResignations, setRawResignations] = useState<ResignationRequest[]>([]);
  const [selectedResignationForLetter, setSelectedResignationForLetter] = useState<ResignationRequest | null>(null);
  
  // Bulk transfer form states
  const [transferFromEmpId, setTransferFromEmpId] = useState('');
  const [transferToEmpId, setTransferToEmpId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferStatusMsg, setTransferStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [overrideStatus, setOverrideStatus] = useState<'Present' | 'Absent' | 'Week Off' | 'Paid Leave'>('Present');
  const [selectedCalendarEmployee, setSelectedCalendarEmployee] = useState<Employee | null>(null);

  const [tempDays, setTempDays] = useState<Record<string, number>>({});
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState<string>(getCurrentPayrollMonth());
  const [activeSlipEmployee, setActiveSlipEmployee] = useState<Employee | null>(null);

  // Auditor panel states for tracking caller activity Day-wise
  const [auditEmployeeId, setAuditEmployeeId] = useState<string>('');
  const [auditSegment, setAuditSegment] = useState<'pending' | 'overdue' | 'completed' | 'all' | 'yesterday_pending' | 'today_pending' | 'yesterday_completed' | 'today_completed' | 'custom_date'>('all');
  const [auditCustomDate, setAuditCustomDate] = useState<string>(getISTDateString());
  const [auditSearch, setAuditSearch] = useState<string>('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<'ALL' | 'INTRESTED' | 'FOLLOWUP PENDING' | 'FINAL DISPOSED' | 'CONVERTED'>('ALL');

  // Team Leader - Employee Mapping Panel states
  const [tlMappings, setTlMappings] = useState<TeamLeaderMapping[]>([]);
  const [selectedTlId, setSelectedTlId] = useState<string>('');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);

  // Re-transfer states for Shared Leads
  const [reTransferringLeadId, setReTransferringLeadId] = useState<string | null>(null);
  const [reTransferTargetId, setReTransferTargetId] = useState<string>('');
  const [reTransferReason, setReTransferReason] = useState<string>('');
  const [reTransferError, setReTransferError] = useState<string>('');
  const [reTransferSuccess, setReTransferSuccess] = useState<boolean>(false);
  const [visibleLeadsCount, setVisibleLeadsCount] = useState<number>(10);
  const [leaveApprovalType, setLeaveApprovalType] = useState<Record<string, 'paid' | 'unpaid'>>({});

  // Team Leader Self Attendance states
  const [tlSelectedPeriod, setTlSelectedPeriod] = useState<string>(() => getCurrentPayrollMonth());
  const [tlActiveEditDate, setTlActiveEditDate] = useState<string | null>(null);
  const [tlEditStatus, setTlEditStatus] = useState<'Present' | 'Absent' | 'Week Off' | 'Paid Leave'>('Present');
  const [tlEditCheckIn, setTlEditCheckIn] = useState('09:30');
  const [tlEditCheckOut, setTlEditCheckOut] = useState('18:30');
  const [tlEditDeduct, setTlEditDeduct] = useState(false);
  const [tlEditReason, setTlEditReason] = useState('');
  const [showAllAudits, setShowAllAudits] = useState<boolean>(false);
  const [showAllFilteredAuditedLeads, setShowAllFilteredAuditedLeads] = useState<boolean>(false);

  const loggedInUser = rawEmployees.find(e => e.id === currentUserId) || getEmployees().find(e => e.id === currentUserId);
  const userRole = loggedInUser?.role || 'admin';
  const isTeamLeader = userRole === 'team_leader';
  
  const assignedEmployeeIds = isTeamLeader ? getTLAssignedEmployeeIds(currentUserId) : [];

  const selfIds: string[] = [currentUserId.toLowerCase().trim()];
  if (loggedInUser) {
    if (loggedInUser.email) selfIds.push(loggedInUser.email.toLowerCase().trim());
    if (loggedInUser.name) selfIds.push(loggedInUser.name.toLowerCase().trim());
    if (loggedInUser.email?.toLowerCase().trim() === 'neha2026@efilingg.com' || loggedInUser.id === 'EMP-YBVHL' || loggedInUser.id === 'EMP-NEHA2026') {
      selfIds.push('emp-neha2026');
      selfIds.push('emp-ybvhl');
    }
  }
  
  const employees = isTeamLeader 
    ? rawEmployees.filter(e => assignedEmployeeIds.includes(e.id) || e.id === currentUserId)
    : rawEmployees;

  const leads = isTeamLeader
    ? rawLeads.filter(l => {
        if (!l.assignedTo) return false;
        const normalizedAssigned = l.assignedTo.toLowerCase().trim();
        if (selfIds.includes(normalizedAssigned)) return true;
        if (assignedEmployeeIds.includes(l.assignedTo)) return true;
        const assignedEmployee = rawEmployees.find(e => 
          e.id.toLowerCase().trim() === normalizedAssigned ||
          (e.email && e.email.toLowerCase().trim() === normalizedAssigned) ||
          (e.name && e.name.toLowerCase().trim() === normalizedAssigned)
        );
        if (assignedEmployee) {
          if (assignedEmployeeIds.includes(assignedEmployee.id) || selfIds.includes(assignedEmployee.id.toLowerCase())) {
            return true;
          }
        }
        return false;
      })
    : rawLeads;

  const followups = isTeamLeader
    ? rawFollowups.filter(f => {
        if (!f.assignedTo) return false;
        const normalizedAssigned = f.assignedTo.toLowerCase().trim();
        if (selfIds.includes(normalizedAssigned)) return true;
        if (assignedEmployeeIds.includes(f.assignedTo)) return true;
        const assignedEmployee = rawEmployees.find(e => 
          e.id.toLowerCase().trim() === normalizedAssigned ||
          (e.email && e.email.toLowerCase().trim() === normalizedAssigned) ||
          (e.name && e.name.toLowerCase().trim() === normalizedAssigned)
        );
        if (assignedEmployee) {
          if (assignedEmployeeIds.includes(assignedEmployee.id) || selfIds.includes(assignedEmployee.id.toLowerCase())) {
            return true;
          }
        }
        return false;
      })
    : rawFollowups;

  const proposals = isTeamLeader
    ? rawProposals.filter(p => {
        if (!p.employeeId) return false;
        const normalizedEmployee = p.employeeId.toLowerCase().trim();
        if (selfIds.includes(normalizedEmployee)) return true;
        if (assignedEmployeeIds.includes(p.employeeId)) return true;
        const pEmployee = rawEmployees.find(e => 
          e.id.toLowerCase().trim() === normalizedEmployee ||
          (e.email && e.email.toLowerCase().trim() === normalizedEmployee) ||
          (e.name && e.name.toLowerCase().trim() === normalizedEmployee)
        );
        if (pEmployee) {
          if (assignedEmployeeIds.includes(pEmployee.id) || selfIds.includes(pEmployee.id.toLowerCase())) {
            return true;
          }
        }
        return false;
      })
    : rawProposals;

  useEffect(() => {
    // Sync default temporary days for the ACTIVE monthly payroll period
    const daysMap: Record<string, number> = {};
    employees.forEach(e => {
      if (e.monthlyAttendance && e.monthlyAttendance[selectedPayrollMonth] !== undefined) {
        daysMap[e.id] = e.monthlyAttendance[selectedPayrollMonth];
      } else {
        // Fallback dynamically: calculate real active days based on actual attendance records (30 - LOP deductionDays)
        const metrics = getAttendanceMetricsForCycle(e.id, selectedPayrollMonth);
        const calculatedDays = Math.max(0, 30 - metrics.deductionDays);
        daysMap[e.id] = calculatedDays;
      }
    });
    setTempDays(daysMap);
  }, [employees, selectedPayrollMonth]);

  useEffect(() => {
    setEmployees(getEmployees());
    setLeads(getLeads());
    setFollowups(getFollowUps());
    setProposals(getProposals());
    setLogs(getActivityLogs());
    setTlMappings(getTLMappings());
    setLeaves(getLeaveRequests());
    setRawResignations(getResignationRequests());
  }, [triggerRefresh]);

  useEffect(() => {
    setShowAllFilteredAuditedLeads(false);
  }, [auditEmployeeId, auditSegment, auditCategoryFilter]);

  // TL Self Attendance calculations
  const tlTodayStr = getISTDateString();
  const tlCurrentTimeStr = getISTTimeString();
  const tlSelfEmployee = loggedInUser || { id: currentUserId, name: 'Team Leader', role: 'team_leader' as const };
  const tlTodayRecord = rawEmployees.length > 0 ? getAttendances().find(r => r.employeeId === tlSelfEmployee.id && r.date === tlTodayStr) : undefined;
  
  const tlMetrics = getAttendanceMetricsForCycle(tlSelfEmployee.id, tlSelectedPeriod);
  const tlCycleRange = getCycleDateRangeForMonth(tlSelectedPeriod);
  
  const tlCycleDates: string[] = [];
  if (tlCycleRange) {
    let curr = new Date(tlCycleRange.start);
    const end = new Date(tlCycleRange.end);
    while (curr <= end) {
      const yr = curr.getFullYear();
      const mo = String(curr.getMonth() + 1).padStart(2, '0');
      const dy = String(curr.getDate()).padStart(2, '0');
      tlCycleDates.push(`${yr}-${mo}-${dy}`);
      curr.setDate(curr.getDate() + 1);
    }
  }

  const getTlSelfDateStatusDetails = (dateStr: string) => {
    const selfId = tlSelfEmployee.id;
    const record = getAttendances().find(r => r.employeeId === selfId && r.date === dateStr);
    if (record) {
      return {
        status: record.status, 
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        deductSalary: record.deductSalary,
        reason: record.bySystem ? 'Closed automatically by system' : record.modifiedBy ? `Overridden: ${record.reasonForChange || ''}` : 'Punched via Client Terminal',
        modifiedBy: record.modifiedBy,
        reasonForChange: record.reasonForChange
      };
    }

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(yr, m, d);
      if (dateObj.getDay() === 0) {
        return { status: 'Week Off' as const, reason: 'Sunday Routine Week Off' };
      }
    }

    const leavesList = getLeaveRequests().filter(l => l.employeeId === selfId && l.status === 'approved');
    const leaveReq = leavesList.find(l => dateStr >= l.startDate && dateStr <= l.endDate);
    if (leaveReq) {
      const isPaid = leaveReq.leaveType !== 'unpaid';
      return {
        status: isPaid ? ('Paid Leave' as const) : ('Absent' as const),
        reason: `Approved Leave (${leaveReq.leaveType}): ${leaveReq.reason || ''}`
      };
    }

    if (dateStr < tlTodayStr) {
      const joiningDate = tlSelfEmployee.dateOfJoining || tlSelfEmployee.joinedDate || '';
      if (joiningDate && dateStr < joiningDate) {
        return { status: 'Inactive' as const, reason: 'Prior to Joining' };
      }
      return { status: 'Absent' as const, reason: 'Unmarked LOP Absence' };
    } else if (dateStr === tlTodayStr) {
      return { status: 'Pending' as const, reason: 'Duty Session Status' };
    } else {
      return { status: 'Future' as const, reason: 'Upcoming Calendar Date' };
    }
  };

  const handleTlInPunch = () => {
    try {
      const rec = employeePunchIn(tlSelfEmployee.id);
      onRefreshData();
      alert(`Shift Session started! Adjusted compensated check-in: ${rec.checkIn}`);
    } catch (err: any) {
      alert("Verification Error: " + err.message);
    }
  };

  const handleTlOutPunch = () => {
    try {
      const rec = employeePunchOut(tlSelfEmployee.id);
      onRefreshData();
      alert(`Shift Session ended! Registered checkout: ${rec.checkOut}`);
    } catch (err: any) {
      alert("Verification Error: " + err.message);
    }
  };

  const handleTlEditClick = (dateStr: string) => {
    if (dateStr > tlTodayStr) {
      alert("Error: Attendance Calendar for future dates is completely locked. You cannot mark absent, present, leave, etc. for future dates.");
      return;
    }
    const d = getTlSelfDateStatusDetails(dateStr);
    setTlActiveEditDate(dateStr);
    setTlEditStatus((d.status === 'Future' || d.status === 'Inactive' || d.status === 'Pending') ? 'Present' : d.status as any);
    setTlEditCheckIn(d.checkIn || '09:30');
    setTlEditCheckOut(d.checkOut || '18:30');
    setTlEditDeduct(d.deductSalary !== undefined ? d.deductSalary : (d.status === 'Absent'));
    setTlEditReason(d.reasonForChange || '');
  };

  const handleTlSaveEdit = () => {
    if (!tlActiveEditDate) return;
    if (tlActiveEditDate > tlTodayStr) {
      alert("Error: Correcting attendance for future dates is completely locked. You cannot assign future date attendance status.");
      return;
    }
    if (!tlEditReason.trim()) {
      alert("Please provide an adjustment justification reason.");
      return;
    }

    const selfId = tlSelfEmployee.id;
    const records = getAttendances();
    let record = records.find(r => r.employeeId === selfId && r.date === tlActiveEditDate);
    
    if (!record) {
      const newId = `ATT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      record = {
        id: newId,
        employeeId: selfId,
        date: tlActiveEditDate,
        checkIn: '',
        checkOut: '',
        status: 'Absent',
        deductSalary: true
      };
      records.push(record);
      saveAttendances(records);
    }

    const updates: any = { status: tlEditStatus, deductSalary: tlEditDeduct };
    if (tlEditStatus === 'Present') {
      updates.checkIn = tlEditCheckIn;
      updates.checkOut = tlEditCheckOut;
      if (updates.checkIn && updates.checkOut) {
        const [inH, inM] = updates.checkIn.split(':').map(Number);
        const [outH, outM] = updates.checkOut.split(':').map(Number);
        updates.totalHours = parseFloat(((outH + outM / 60) - (inH + inM / 60)).toFixed(2));
      }
    } else {
      updates.checkIn = '';
      updates.checkOut = '';
      updates.totalHours = 0;
    }

    updateAttendanceManually(
      record.id,
      updates,
      currentUserId,
      tlEditReason
    );
    
    onRefreshData();
    setTlActiveEditDate(null);
    alert(`Attendance for ${tlActiveEditDate} adjusted successfully without requiring further master approval.`);
  };

  // Compute Master Analytics
  const totalEmployees = employees.length;
  const activeEmployeesCount = employees.filter((e) => e.status === 'active').length;
  
  const totalLeads = leads.length;
  const activeLeadsCount = leads.filter((l) => l.stage !== 'Converted' && l.stage !== 'Closed Lost' && l.stage !== 'Not Interested').length;
  const convertedLeadsCount = leads.filter((l) => l.stage === 'Converted').length;
  
  const conversionRate = totalLeads ? Math.round((convertedLeadsCount / totalLeads) * 100) : 0;

  // Revenue generated - Sum of accepted proposals
  const convertedProposalSum = proposals
    .filter((p) => p.status === 'accepted' || p.status === 'sent') // include sent since we want current backlog value
    .reduce((sum, current) => sum + current.finalAmount, 0);

  // Compute Employee Leaderboard
  const leaderBoard = employees
    .filter((emp) => emp.role === 'employee' && emp.status === 'active')
    .map((emp) => {
      const empLeads = leads.filter((l) => l.assignedTo === emp.id);
      const convertedCount = empLeads.filter((l) => l.stage === 'Converted').length;
      const proposalsSent = proposals.filter((p) => p.createdBy === emp.id).length;
      const followupsDone = followups.filter((f) => f.createdBy === emp.id && f.status === 'completed').length;
      const rate = empLeads.length ? Math.round((convertedCount / empLeads.length) * 100) : 0;
      
      return {
        ...emp,
        leadsCreated: empLeads.length,
        converted: convertedCount,
        conversionRate: rate,
        proposalsSent,
        followupsDone
      };
    })
    .sort((a, b) => b.leadsCreated - a.leadsCreated);

  // Lead Conversion Funnel math
  const funnelStages: { label: string; count: number }[] = [
    { label: 'New Lead', count: leads.filter((l) => l.stage === 'New Lead').length },
    { label: 'Contacted', count: leads.filter((l) => l.stage === 'Contacted').length },
    { label: 'Interested / Negotiation', count: leads.filter((l) => l.stage === 'Interested' || l.stage === 'Negotiation').length },
    { label: 'Proposal Sent', count: leads.filter((l) => l.stage === 'Proposal Sent').length },
    { label: 'Converted 🎉', count: convertedLeadsCount }
  ];

  // Lead Sources computation
  const sourceAnalytics: Record<string, number> = {};
  leads.forEach((l) => {
    sourceAnalytics[l.leadSource] = (sourceAnalytics[l.leadSource] || 0) + 1;
  });

  const handleSaveTLMapping = (teamLeaderId: string, employeeIds: string[]) => {
    if (!teamLeaderId) {
      alert('Select a valid Team Leader to apply mapping.');
      return;
    }
    updateTLMapping(teamLeaderId, employeeIds);
    setTlMappings(getTLMappings());
    onRefreshData();
    alert('Team Leader mapping updated successfully!');
  };

  const handleUpdateLeaveRequest = (leaveId: string, status: 'approved' | 'rejected', paymentType?: 'paid' | 'unpaid') => {
    updateLeaveRequestStatus(leaveId, status, currentUserId, paymentType);
    setLeaves(getLeaveRequests());
    onRefreshData();
    alert(`Leave request has been ${status}!`);
  };

  const handleManualAttendanceCorrection = (
    employeeId: string, 
    date: string, 
    status: 'Present' | 'Absent' | 'Week Off' | 'Paid Leave', 
    reason: string, 
    deductSalary: boolean,
    checkIn?: string,
    checkOut?: string
  ) => {
    const todayStrFull = getISTDateString();
    if (date > todayStrFull) {
      alert("Error: Correcting attendance for future dates is completely locked. You cannot assign future date attendance status.");
      return;
    }
    if (!reason.trim()) {
      alert("A justification reason is required for manual attendance correction.");
      return;
    }
    const emp = rawEmployees.find(e => e.id === employeeId);
    if (!emp) return;

    // Find if record exists
    const records = getAttendances();
    let record = records.find(r => r.employeeId === employeeId && r.date === date);
    
    if (!record) {
      // Create new record first
      const newId = `ATT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const newRec = {
        id: newId,
        employeeId,
        date,
        checkIn: checkIn || '',
        checkOut: checkOut || '',
        status: 'Absent' as const,
        deductSalary: true,
      };
      records.push(newRec);
      saveAttendances(records);
      record = newRec;
    }

    const updates: any = { status, deductSalary };
    if (status === 'Present') {
      updates.checkIn = checkIn || '09:30';
      updates.checkOut = checkOut || '18:30';
      // Calculate totalHours
      if (updates.checkIn && updates.checkOut) {
        const [inH, inM] = updates.checkIn.split(':').map(Number);
        const [outH, outM] = updates.checkOut.split(':').map(Number);
        updates.totalHours = parseFloat(((outH + outM / 60) - (inH + inM / 60)).toFixed(2));
      }
    } else {
      updates.checkIn = '';
      updates.checkOut = '';
      updates.totalHours = 0;
    }

    updateAttendanceManually(
      record.id,
      updates,
      currentUserId,
      reason
    );
    onRefreshData();
    alert("Attendance correction applied and audited successfully!");
  };

  const handleAddHistoricalEntry = (entry: Omit<HistoricalPayroll, 'id' | 'createdAt'>) => {
    addHistoricalPayroll(entry);
    onRefreshData();
    alert("Historical payroll entry added successfully!");
  };

  const handleCreateEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim() || !empMobile.trim()) {
      alert('Provide all employee fields.');
      return;
    }

    // Prevent duplicate emails for active employees
    const allEmps = getEmployees();
    const isEmailTaken = allEmps.some(emp => emp.email.toLowerCase().trim() === empEmail.trim().toLowerCase() && emp.status === 'active');
    if (isEmailTaken) {
      alert(`An active employee with the email "${empEmail.trim()}" already exists! Please use a unique email to avoid data sync issues.`);
      return;
    }

    createEmployee({
      name: empName,
      email: empEmail,
      mobile: empMobile,
      role: empRole,
      department: empDepartment,
      status: 'active',
      employeeCode: empCode.trim() || `EFL-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      designation: empDesignation.trim() || (empRole === 'admin' ? 'Managing Director' : 'Compliance Associate'),
      dateOfJoining: empDateOfJoining || new Date().toISOString().split('T')[0],
      salary: Number(empSalary) || 25000,
      allowances: Number(empAllowances) || 3500,
      otherFixedAllowance: Number(empOtherFixedAllowance) || 1500,
      incentivePerConversion: Number(empIncentivePerConversion) || 500,
      attendanceDays: 26,
      photo: empPhoto,
      password: 'efilingg@123',
      isPasswordChanged: false,
      address: empAddress
    }, currentUserId);

    // Reset Form
    setEmpName('');
    setEmpEmail('');
    setEmpMobile('');
    setEmpRole('employee');
    setEmpDepartment('SALES & MARKETING');
    setEmpCode('');
    setEmpDesignation('');
    setEmpDateOfJoining('');
    setEmpSalary('');
    setEmpAllowances('');
    setEmpOtherFixedAllowance('');
    setEmpIncentivePerConversion('');
    setEmpPhoto('');
    setEmpAddress('');
    setShowAddEmp(false);
    
    // Refresh
    onRefreshData();
  };

  const handleToggleEmployeeStatus = (empId: string, currentStatus: 'active' | 'disabled') => {
    const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
    updateEmployee(empId, { status: newStatus }, currentUserId);
    onRefreshData();
  };

  const handleEditEmployeeSave = (empId: string, updates: Partial<Employee>) => {
    if (updates.email) {
      const allEmps = getEmployees();
      const isEmailTaken = allEmps.some(emp => 
        emp.id !== empId && 
        emp.email.toLowerCase().trim() === updates.email!.trim().toLowerCase() && 
        emp.status === 'active'
      );
      if (isEmailTaken) {
        alert(`An active employee with the email "${updates.email.trim()}" already exists! Please use a unique email.`);
        return;
      }
    }
    updateEmployee(empId, updates, currentUserId);
    setEditingEmployee(null);
    onRefreshData();
  };

  const handleApproveIncentive = (leadId: string, customAmt?: number) => {
    const allLeads = getLeads();
    const lIndex = allLeads.findIndex(l => l.id === leadId);
    if (lIndex !== -1) {
      const matchLead = allLeads[lIndex];
      allLeads[lIndex].incentiveStatus = 'approved';
      allLeads[lIndex].incentiveApprovedAt = new Date().toISOString();
      allLeads[lIndex].incentiveApprovedBy = currentUserId;
      if (customAmt !== undefined) {
        allLeads[lIndex].incentiveAmount = customAmt;
      }
      saveLeads(allLeads);
      
      // Log audit
      const logsList = getActivityLogs();
      const currentSession = getCurrentSession();
      logsList.unshift({
        id: `LOG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        userId: currentUserId,
        userName: currentSession?.name || 'Administrator',
        userRole: 'admin',
        action: 'Incentive Approved ✔',
        details: `Approved commission payout incentive amounting to ₹${allLeads[lIndex].incentiveAmount || 500} for converted account lead of ${matchLead.customerName} (ID: ${matchLead.id}).`,
        timestamp: new Date().toISOString()
      });
      saveLogs(logsList);
      onRefreshData();
    }
  };

  const handleRejectIncentive = (leadId: string) => {
    const allLeads = getLeads();
    const lIndex = allLeads.findIndex(l => l.id === leadId);
    if (lIndex !== -1) {
      const matchLead = allLeads[lIndex];
      allLeads[lIndex].incentiveStatus = 'rejected';
      saveLeads(allLeads);
      
      // Log audit
      const logsList = getActivityLogs();
      const currentSession = getCurrentSession();
      logsList.unshift({
        id: `LOG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        userId: currentUserId,
        userName: currentSession?.name || 'Administrator',
        userRole: 'admin',
        action: 'Incentive Disallowed ✘',
        details: `Disallowed/rejected conversion commission incentive for lead of ${matchLead.customerName} (ID: ${matchLead.id}).`,
        timestamp: new Date().toISOString()
      });
      saveLogs(logsList);
      onRefreshData();
    }
  };

  const handleUpdateAttendance = (empId: string, daysPresented: number) => {
    const targetEmployee = employees.find(e => e.id === empId);
    const currentMonthlyAttendance = targetEmployee?.monthlyAttendance || {};
    const updatedMonthlyAttendance = {
      ...currentMonthlyAttendance,
      [selectedPayrollMonth]: daysPresented
    };

    updateEmployee(
      empId, 
      { 
        attendanceDays: daysPresented, 
        monthlyAttendance: updatedMonthlyAttendance 
      }, 
      currentUserId
    );
    
    // Log audit
    const logsList = getActivityLogs();
    const currentSession = getCurrentSession();
    logsList.unshift({
      id: `LOG-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      userId: currentUserId,
      userName: currentSession?.name || 'Administrator',
      userRole: 'admin',
      action: 'Attendance Updated 🗓',
      details: `Updated manual office registered attendance for Staff ID: ${empId} to ${daysPresented} working days.`,
      timestamp: new Date().toISOString()
    });
    saveLogs(logsList);
    
    alert(`Attendance locks set to ${daysPresented} Days for Employee ID: ${empId}.`);
    onRefreshData();
  };

  // Shared Leads (received by current user)
  const tlAllTransfers = getTransfers();
  const tlSharedLeads = leads.filter(l => 
    l.assignedTo === currentUserId && tlAllTransfers.some(t => t.leadId === l.id && t.transferredTo === currentUserId)
  );

  const getTLTransferDetails = (leadId: string) => {
    const transfersForLead = tlAllTransfers.filter(t => t.leadId === leadId && t.transferredTo === currentUserId);
    if (transfersForLead.length === 0) return null;
    const sorted = [...transfersForLead].sort((a, b) => new Date(b.transferredAt).getTime() - new Date(a.transferredAt).getTime());
    return sorted[0];
  };

  const handleTLReTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reTransferringLeadId || !reTransferTargetId || !reTransferReason.trim()) {
      setReTransferError('Please select a recipient and enter a reason.');
      return;
    }
    const success = transferLead(reTransferringLeadId, currentUserId, reTransferTargetId, reTransferReason);
    if (success) {
      setReTransferSuccess(true);
      setTimeout(() => {
        setReTransferringLeadId(null);
        setReTransferTargetId('');
        setReTransferReason('');
        setReTransferSuccess(false);
        setReTransferError('');
        onRefreshData();
      }, 1500);
    } else {
      setReTransferError('Transfer failed. Please check your inputs.');
    }
  };

  // Filter leads based on admin choices
  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      l.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.mobile.includes(searchQuery) ||
      l.businessName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStage = filterStage ? l.stage === filterStage : true;
    const matchesService = filterService ? l.serviceRequired === filterService : true;
    const matchesEmployee = filterEmployee ? l.assignedTo === filterEmployee : true;

    let matchesDate = true;
    const leadDateOnly = l.creationDate ? l.creationDate.split('T')[0] : '';
    if (startDate) {
      matchesDate = matchesDate && leadDateOnly >= startDate;
    }
    if (endDate) {
      matchesDate = matchesDate && leadDateOnly <= endDate;
    }

    let matchesCategory = true;
    if (categoryFilter === 'INTRESTED') {
      matchesCategory = l.stage !== 'Not Interested';
    } else if (categoryFilter === 'FOLLOWUP PENDING') {
      matchesCategory = l.stage === 'Follow-Up Pending';
    } else if (categoryFilter === 'FINAL DISPOSED') {
      matchesCategory = l.stage === 'Not Interested';
    } else if (categoryFilter === 'CONVERTED') {
      matchesCategory = l.stage === 'Converted';
    }

    return matchesSearch && matchesStage && matchesService && matchesEmployee && matchesDate && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Upper Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-150 dark:border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="h-8 w-8 bg-slate-100 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-800 dark:text-slate-100">
            <Shield className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">
              {isTeamLeader ? 'Team Leader Control Unit' : 'Master Admin Control Unit'}
            </h2>
            <p className="text-[10px] text-slate-450">
              {isTeamLeader ? `Assigned employees tracking and compliance supervision` : 'Complete enterprise analytics and reassignment capability'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto select-none">
          <button
            onClick={() => setViewTab('analytics')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl ${
              viewTab === 'analytics' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-slate-505 hover:bg-slate-50'
            }`}
          >
            Dashboard Analytics
          </button>
          <button
            onClick={() => setViewTab('employees')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl ${
              viewTab === 'employees' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-slate-505 hover:bg-slate-50'
            }`}
          >
            Manage Employees ({totalEmployees})
          </button>
          <button
            onClick={() => setViewTab('leads')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl ${
              viewTab === 'leads' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-slate-505 hover:bg-slate-50'
            }`}
          >
            All Leads ({totalLeads})
          </button>
          <button
            onClick={() => setViewTab('proposals')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl ${
              viewTab === 'proposals' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-slate-505 hover:bg-slate-50'
            }`}
          >
            Proposals ({proposals.length})
          </button>
          {!isTeamLeader && (
            <button
              onClick={() => setViewTab('logs')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl ${
                viewTab === 'logs' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-slate-505 hover:bg-slate-50'
              }`}
            >
              Security Audit Logs
            </button>
          )}
          {!isTeamLeader && (
            <button
              onClick={() => setViewTab('backup')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl ${
                viewTab === 'backup' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-slate-505 hover:bg-slate-50'
              }`}
            >
              Imports & Recovery
            </button>
          )}
          <button
            onClick={() => setViewTab('services')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap ${
              viewTab === 'services' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-slate-505 hover:bg-slate-50'
            }`}
          >
            Services Catalog
          </button>
          {!isTeamLeader && (
            <button
              onClick={() => setViewTab('templates')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap ${
                viewTab === 'templates' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-slate-505 hover:bg-slate-50'
              }`}
            >
              Proposal Designer
            </button>
          )}
          <button
            onClick={() => setViewTab('payroll')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap ring-1 ring-emerald-500/30 ${
              viewTab === 'payroll' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-slate-950 pr-5'
            }`}
          >
            Payroll & Approvals 💰
          </button>
          {isTeamLeader && (
            <button
              onClick={() => setViewTab('my_attendance')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl whitespace-nowrap ring-1 ring-amber-500/30 ${
                viewTab === 'my_attendance' ? 'bg-slate-900 dark:bg-slate-105 text-white' : 'text-amber-600 hover:bg-amber-50/50 dark:hover:bg-slate-950 pr-5'
              }`}
            >
              My Punch & Calendar ⏱️
            </button>
          )}
        </div>
      </div>

      {/* ==============================================================
          TAB: ANALYTICS DASHBOARD
          ============================================================== */}
      {viewTab === 'analytics' && (
        <div className="space-y-6">
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Teams Force</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{totalEmployees}</span>
                <span className="text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-600 px-2.5 py-0.5 rounded-full font-bold">
                  {activeEmployeesCount} Active
                </span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Filing Accounts Portfolio</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{totalLeads}</span>
                <span className="text-xs text-slate-400">
                  {activeLeadsCount} operations lock
                </span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Operations Conversion</span>
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-black text-slate-900 dark:text-slate-100">{conversionRate}%</span>
                <span className="text-xs text-emerald-500 font-bold">
                  {convertedLeadsCount} Converted
                </span>
              </div>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-xs space-y-1 bg-gradient-to-tr from-emerald-500/5 to-transparent">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Backlog Quote Valuations</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 dark:text-slate-100">₹{convertedProposalSum.toLocaleString()}</span>
                <span className="text-[9px] uppercase tracking-wider font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                  Estimate
                </span>
              </div>
            </div>

          </div>

          {/* Visual Charts Section built hand-coded for standard iframe scalability */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Conversion Funnel visually rendered */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Lead Conversion Funnel Flow</h3>
              <div className="space-y-3 pt-2">
                {funnelStages.map((fn, idx) => {
                  // Percentage width calculation
                  const maxLeads = totalLeads || 1;
                  const ratio = Math.max(12, Math.round((fn.count / maxLeads) * 100));
                  return (
                    <div key={idx} className="space-y-1 text-xs">
                      <div className="flex items-center justify-between text-slate-650 dark:text-slate-350 font-semibold text-[11px]">
                        <span>{fn.label}</span>
                        <span>{fn.count} Leads</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-850 h-3 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 dark:bg-emerald-450 h-full rounded-full transition-all"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lead Sources breakdown */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Inbound Distribution sources</h3>
              <div className="max-h-60 overflow-y-auto space-y-3 pt-2 pr-1">
                {Object.keys(sourceAnalytics).length === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-8">No source records verified.</div>
                ) : (
                  Object.entries(sourceAnalytics).map(([source, count], idx) => {
                    const ratio = totalLeads ? Math.round((count / totalLeads) * 105) : 0;
                    return (
                      <div key={idx} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 dark:border-slate-850">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">{source}</span>
                        <div className="flex items-center space-x-2 font-mono">
                          <span className="h-1.5 w-8 bg-emerald-100 dark:bg-emerald-900 flex rounded-full overflow-hidden shrink-0">
                            <span className="bg-emerald-500 h-full" style={{ width: `${ratio}%` }} />
                          </span>
                          <span className="font-bold text-slate-950 dark:text-white">{count}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Leadership Leaderboard Ranking */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Executive Leaderboard Ranking</h3>
              <div className="space-y-3.5 pt-2 max-h-60 overflow-y-auto pr-1">
                {leaderBoard.slice(0, 4).map((emp, idx) => (
                  <div key={emp.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2.5">
                      <div className="h-6.5 w-6.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg flex items-center justify-center font-black text-[10px]">
                        #{idx + 1}
                      </div>
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-850 dark:text-slate-200">{emp.name}</span>
                        <p className="text-[10px] text-slate-450 truncate w-24">Conv: {emp.converted} | rate: {emp.conversionRate}%</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white font-mono">{emp.leadsCreated}</span>
                      <p className="text-[9px] uppercase tracking-wide text-slate-400 font-bold">Total leads</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Quick Active Leads checklist with assignments details */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Associate Pipeline Overview</h3>
              <span className="text-[10px] font-mono text-slate-400 uppercase">Live state monitoring</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {leaderBoard.map((emp) => (
                <div key={emp.id} className="p-4 rounded-xl border border-slate-100 dark:border-slate-850 bg-slate-500/5 space-y-3">
                  <div className="flex items-center space-x-2 pb-2 border-b border-slate-150/50 dark:border-slate-800">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-xs text-slate-850 dark:text-slate-200">{emp.name}</span>
                  </div>
                  <div className="grid grid-cols-3 text-center gap-1">
                    <div className="space-y-0.5">
                      <span className="font-black text-xs text-slate-900 dark:text-white font-mono">{emp.leadsCreated}</span>
                      <p className="text-[9px] text-slate-400">Leads</p>
                    </div>
                    <div className="space-y-0.5 border-x border-slate-150 dark:border-slate-850">
                      <span className="font-black text-xs text-slate-900 dark:text-white font-mono">{emp.converted}</span>
                      <p className="text-[9px] text-slate-400">Conv.</p>
                    </div>
                    <div className="space-y-0.5">
                      <span className="font-black text-xs text-slate-900 dark:text-white font-mono">{emp.conversionRate}%</span>
                      <p className="text-[9px] text-slate-400">Rate</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* ==============================================================
          TAB: REGISTER MANAGEMENT (EMPLOYEES)
          ============================================================== */}
      {viewTab === 'employees' && (
        <div className="space-y-6">
          {/* Sub-tabs menu for Employees Section */}
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-150 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setEmployeesSubTab('directory')}
              className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                employeesSubTab === 'directory'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Associate Directory
            </button>
            <button
              type="button"
              onClick={() => setEmployeesSubTab('exits')}
              className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                employeesSubTab === 'exits'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span>Exits & Resignations</span>
              {rawResignations.filter(r => r.status === 'pending').length > 0 && (
                <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                  {rawResignations.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setEmployeesSubTab('transfers')}
              className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                employeesSubTab === 'transfers'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              Bulk Lead Transfer Hub
            </button>
          </div>

          {employeesSubTab === 'directory' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 font-sans">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Associate & Manager Directories</h3>
                  <p className="text-xs text-slate-500">Manage internal corporate structure logins</p>
                </div>
            <button
              onClick={() => setShowAddEmp(true)}
              className="flex items-center space-x-1 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Employee</span>
            </button>
          </div>

          {/* Add Employee popup Form */}
          {showAddEmp && (
            <form onSubmit={handleCreateEmployeeSubmit} className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl space-y-4">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide block">
                Enroll Corporate Resource
              </span>

              {/* Photo Upload Attachment block */}
              <div className="flex items-center space-x-4 p-3 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-810 rounded-2xl">
                <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-205 dark:border-slate-730 overflow-hidden flex items-center justify-center font-mono font-bold text-[10px] text-slate-400 shrink-0">
                  {empPhoto ? (
                    <img src={empPhoto} alt="Upload preview" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    'No Pic'
                  )}
                </div>
                <div className="space-y-1 flex-1">
                  <label className="text-[10px] uppercase font-extrabold text-slate-500 block">Employee Profile Photo (Required for ID Card)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEmpPhoto(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="block w-full text-[11px] text-slate-505 dark:text-slate-400 file:mr-3 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-950 dark:file:text-indigo-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Employee Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Vijay Kumar"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={empMobile}
                    onChange={(e) => setEmpMobile(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Corporate Email (Serve as Login ID) *</label>
                  <input
                    type="email"
                    required
                    placeholder="vijay@efilingg.com"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Candidate Permanent Address *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Flat 302, Sector 15-A, Noida, UP - 201301"
                    value={empAddress}
                    onChange={(e) => setEmpAddress(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Employee Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EFL-1025"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Designation *</label>
                  <input
                    type="text"
                    placeholder="e.g. Senior Compliance Lead"
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Date of Joining</label>
                  <input
                    type="date"
                    value={empDateOfJoining}
                    onChange={(e) => setEmpDateOfJoining(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Workspace Authority Role</label>
                  <select
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value as EmployeeRole)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                  >
                    <option value="employee">Filing Associate Desk (Employee Role)</option>
                    <option value="team_leader">Team Leader Management (Middle Tier)</option>
                    <option value="admin">Master Administrator Gateway (Admin Role)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-indigo-650">Workable Department</label>
                  <select
                    value={empDepartment}
                    onChange={(e) => setEmpDepartment(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-slate-800 rounded-xl text-xs text-indigo-700 dark:text-indigo-400 font-bold"
                  >
                    <option value="SALES & MARKETING">SALES & MARKETING</option>
                    <option value="OPERATION MANAGEMENT">OPERATION MANAGEMENT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Monthly Basic Salary (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 28000"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">HRA/Travelling Allowances (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 3500"
                    value={empAllowances}
                    onChange={(e) => setEmpAllowances(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Other Fixed Allowances (₹)</label>
                  <input
                    type="number"
                    placeholder="e.g. 1500"
                    value={empOtherFixedAllowance}
                    onChange={(e) => setEmpOtherFixedAllowance(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Conversion Sale Incentive (₹ / Conversion)</label>
                  <input
                    type="number"
                    placeholder="e.g. 500"
                    value={empIncentivePerConversion}
                    onChange={(e) => setEmpIncentivePerConversion(e.target.value)}
                    className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-slate-400">Defaults: Password generated is name + '123' (e.g. vijay123).</span>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEmp(false)}
                    className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-555 text-white font-bold text-xs rounded-lg cursor-pointer"
                  >
                    Launch Account
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Table display */}
          <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-b border-slate-100 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="p-4 px-5">Name & Code</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Email Login</th>
                  <th className="p-4">Payroll / Month Structure</th>
                  <th className="p-4">Authorization</th>
                  <th className="p-4">Registry Date</th>
                  <th className="p-4 text-center">Actions & Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950 transition-colors">
                    <td className="p-4 px-5 space-y-0.5">
                      <div className="flex items-center space-x-3">
                        <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-140 dark:border-slate-730 overflow-hidden flex items-center justify-center font-mono font-bold text-slate-600 dark:text-slate-300 shrink-0 select-none">
                          {emp.photo ? (
                            <img src={emp.photo} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            emp.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-850 dark:text-slate-150">{emp.name}</span>
                          <span className="text-[10px] text-indigo-650 dark:text-indigo-400 font-semibold">{emp.designation || 'Specialist Officer'}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1.5 font-mono text-[9px] pl-12">
                        <span className={`px-1.5 py-0.5 rounded-sm capitalize ${
                          emp.role === 'admin' ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950' : 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950'
                        }`}>
                          {emp.role}
                        </span>
                        <span className="text-slate-400">Code: {emp.employeeCode || 'EFG-REC'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-650 dark:text-slate-350">{emp.mobile}</td>
                    <td className="p-4 text-slate-650 dark:text-slate-350 font-mono">{emp.email}</td>
                    <td className="p-4 space-y-0.5">
                      <div className="text-slate-800 dark:text-slate-100 font-medium">
                        Basic: <span className="font-bold">₹{(Number(emp.salary) || 25000).toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Allow: ₹{((Number(emp.allowances) || 0) + (Number(emp.otherFixedAllowance) || 0)).toLocaleString()}
                      </div>
                    </td>
                    <td className="p-4">
                      {emp.id === 'EMP-ADMIN' ? (
                        <span className="font-bold text-emerald-600">Core Protected</span>
                      ) : (
                        <div className="flex items-center space-x-1.5">
                          <span className={`h-2 w-2 rounded-full ${emp.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          <span className="capitalize">{emp.status}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono text-slate-455">{emp.dateOfJoining || emp.joinedDate}</td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingEmployee(emp)}
                          className="text-[10px] font-bold py-1 px-2.5 bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setShowOfferLetterEmp(emp)}
                          className="text-[10px] font-bold py-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-305 rounded-lg cursor-pointer transition-colors"
                        >
                          Offer Letter
                        </button>
                        {emp.id !== 'EMP-ADMIN' && (
                          <button
                            onClick={() => handleToggleEmployeeStatus(emp.id, emp.status)}
                            className={`text-[10px] font-bold py-1 px-2.5 rounded-lg cursor-pointer transition-colors ${
                              emp.status === 'active'
                                ? 'bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-955'
                                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-955'
                            }`}
                          >
                            {emp.status === 'active' ? 'Deactivate' : 'Re-activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* TEAM LEADER TO EMPLOYEE MAPPING SCHEMAS (Only for Admin role) */}
          {!isTeamLeader && rawEmployees.some(e => e.role === 'team_leader') && (
            <div className="p-6 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-wider font-mono">
                  Team Leader Mapping Hub 🎯
                </h3>
                <p className="text-xs text-slate-400">Map compliant filing associates and sales representatives to dedicated team managers</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Selector sector */}
                <div className="space-y-3.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase text-slate-500">1. Select Team Leader</label>
                    <select
                      value={selectedTlId}
                      onChange={(e) => {
                        const tlId = e.target.value;
                        setSelectedTlId(tlId);
                        // Prepopulate currently assigned employees
                        if (tlId) {
                          setSelectedEmployeeIds(getTLAssignedEmployeeIds(tlId));
                        } else {
                          setSelectedEmployeeIds([]);
                        }
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-205 dark:bg-slate-950 dark:border-slate-850 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 cursor-pointer"
                    >
                      <option value="">-- Choose Team Leader --</option>
                      {rawEmployees.filter(e => e.role === 'team_leader').map(tl => (
                        <option key={tl.id} value={tl.id}>
                          {tl.name} ({tl.employeeCode || tl.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedTlId && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-extrabold uppercase text-slate-500 leading-tight block">
                        2. Toggle Staff Assign (Multiple select checkbox)
                      </span>
                      <div className="max-h-48 overflow-y-auto border border-slate-205 dark:border-slate-850 rounded-xl divide-y divide-slate-105 dark:divide-slate-850">
                        {rawEmployees.filter(e => e.role === 'employee').map(emp => {
                          const isChecked = selectedEmployeeIds.includes(emp.id);
                          return (
                            <label key={emp.id} className="flex items-center space-x-3 p-2.5 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== emp.id));
                                  } else {
                                    setSelectedEmployeeIds([...selectedEmployeeIds, emp.id]);
                                  }
                                }}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 font-mono"
                              />
                              <div className="flex flex-col">
                                <span className="font-bold text-xs text-slate-850 dark:text-slate-150">{emp.name}</span>
                                <span className="text-[10px] text-slate-400">{emp.designation || 'Compliance Associate'} ({emp.id})</span>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSaveTLMapping(selectedTlId, selectedEmployeeIds)}
                        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer shadow-md transition-all uppercase"
                      >
                        Apply Associate Mappings
                      </button>
                    </div>
                  )}
                </div>

                {/* Overview list sector */}
                <div className="space-y-3.5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 p-5 rounded-2xl">
                  <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Existing Active Maps</span>
                  <div className="space-y-3 max-h-72 overflow-y-auto">
                    {rawEmployees.filter(e => e.role === 'team_leader').map(tl => {
                      const mappedIds = getTLAssignedEmployeeIds(tl.id);
                      const mappedStaff = rawEmployees.filter(e => mappedIds.includes(e.id));
                      return (
                        <div key={tl.id} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-xs text-indigo-700 dark:text-indigo-400">{tl.name} ({tl.employeeCode || tl.id})</span>
                            <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-205 text-slate-655 uppercase">{mappedIds.length} Members</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {mappedStaff.length > 0 ? mappedStaff.map(s => (
                              <span key={s.id} className="text-[9px] font-semibold bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-300">
                                {s.name}
                              </span>
                            )) : (
                              <span className="text-[10px] text-slate-405 italic">No associates mapped yet</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==============================================================
              SECTION: DYNAMIC CALLER ACTIVITY & FOLLOW-UP PERFORMANCE AUDITOR
              ============================================================== */}
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="font-extrabold text-xs text-indigo-650 dark:text-indigo-400 uppercase tracking-widest flex items-center space-x-1.5 font-mono">
                  <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
                  <span>Dynamic Caller Follow-Up Activity Auditor</span>
                </h3>
                <p className="text-xs text-slate-500">Track employee's daily contact lists, pending ratios, and live client responses</p>
              </div>

              {/* Selector for Employee for Audit */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase font-mono">Auditing Associate:</span>
                  <select
                    value={auditEmployeeId}
                    onChange={(e) => {
                      setAuditEmployeeId(e.target.value);
                      setAuditSegment('all');
                    }}
                    className="p-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-850 dark:text-slate-100 cursor-pointer focus:outline-none"
                  >
                    <option value="">-- Click to Select Associate --</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employeeCode || emp.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {auditEmployeeId ? (() => {
              const selectedEmployee = employees.find(e => e.id === auditEmployeeId);
              
              // Get all leads and follow-ups relative to the audited employee
              const auditedLeads = leads.filter(l => l.assignedTo === auditEmployeeId);
              const auditedLeadIds = auditedLeads.map(l => l.id);
              const auditedFollowupsAll = followups.filter(f => auditedLeadIds.includes(f.leadId));

              const today = getISTDateString();
              const yesterday = getRelativeISTDateString(-1);

              // Compute Metrics for counts
              const countYesterdayPending = auditedFollowupsAll.filter(f => f.status !== 'completed' && f.followUpDate === yesterday).length;
              const countTodayPending = auditedFollowupsAll.filter(f => f.status !== 'completed' && f.followUpDate === today).length;
              const countYesterdayCompleted = auditedFollowupsAll.filter(f => f.status === 'completed' && f.followUpDate === yesterday).length;
              const countTodayCompleted = auditedFollowupsAll.filter(f => f.status === 'completed' && f.followUpDate === today).length;

              const totalFollowupPending = auditedLeads.filter((l) => l.stage === 'Follow-Up Pending').length;
              const totalInterested = auditedLeads.filter((l) => l.stage !== 'Not Interested').length;
              const totalFinalDisposed = auditedLeads.filter((l) => l.stage === 'Not Interested').length;
              const totalConvertedLeads = auditedLeads.filter((l) => l.stage === 'Converted').length;

              // First filter all leads by category filter so badge counts are perfectly aligned with the clicking!
              const getCategoryFilteredLeads = () => {
                return auditedLeads.filter(lead => {
                  if (auditCategoryFilter === 'FOLLOWUP PENDING') {
                    return lead.stage === 'Follow-Up Pending';
                  } else if (auditCategoryFilter === 'INTRESTED') {
                    return lead.stage !== 'Not Interested';
                  } else if (auditCategoryFilter === 'FINAL DISPOSED') {
                    return lead.stage === 'Not Interested';
                  } else if (auditCategoryFilter === 'CONVERTED') {
                    return lead.stage === 'Converted';
                  }
                  return true;
                });
              };

              const doesLeadMatchSegment = (leadId: string, segment: string) => {
                const leadFollowups = followups.filter(f => f.leadId === leadId);
                
                if (segment === 'all') return true;
                
                if (segment === 'yesterday_pending') {
                  return leadFollowups.some(f => f.status !== 'completed' && f.followUpDate === yesterday);
                }
                if (segment === 'today_pending') {
                  return leadFollowups.some(f => f.status !== 'completed' && f.followUpDate === today);
                }
                if (segment === 'yesterday_completed') {
                  return leadFollowups.some(f => f.status === 'completed' && f.followUpDate === yesterday);
                }
                if (segment === 'today_completed') {
                  return leadFollowups.some(f => f.status === 'completed' && f.followUpDate === today);
                }
                if (segment === 'pending') {
                  return leadFollowups.some(f => f.status === 'pending' && f.followUpDate >= today);
                }
                if (segment === 'overdue') {
                  return leadFollowups.some(f => f.status === 'overdue' || (f.status === 'pending' && f.followUpDate < today));
                }
                if (segment === 'completed') {
                  return leadFollowups.some(f => f.status === 'completed');
                }
                if (segment === 'custom_date') {
                  return leadFollowups.some(f => f.followUpDate === auditCustomDate);
                }
                return true;
              };

              const matchSearch = (lead: Lead) => {
                if (!auditSearch.trim()) return true;
                const q = auditSearch.toLowerCase();
                return (
                  lead.customerName.toLowerCase().includes(q) ||
                  lead.businessName?.toLowerCase().includes(q) ||
                  lead.mobile.includes(q)
                );
              };

              const filteredAuditedLeads = getCategoryFilteredLeads().filter(lead => {
                return doesLeadMatchSegment(lead.id, auditSegment) && matchSearch(lead);
              });

              const displayedAuditedLeads = showAllFilteredAuditedLeads ? filteredAuditedLeads : filteredAuditedLeads.slice(0, 10);

              return (
                <div className="space-y-6">
                  
                  {/* Performance stats row for the employee */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    {/* Yesterday Pending */}
                    <div 
                      onClick={() => setAuditSegment('yesterday_pending')}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                        auditSegment === 'yesterday_pending'
                          ? 'bg-rose-50 dark:bg-rose-955/20 border-rose-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-rose-350'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[9.5px] uppercase font-black text-slate-400 font-mono tracking-wider block">Yesterday Pending</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">कल का पेंडिंग Leads</span>
                        </div>
                        <span className="text-2xl font-black font-mono text-rose-600 dark:text-rose-450">{countYesterdayPending}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-slate-455">
                        <span>Date: {yesterday}</span>
                        {auditSegment === 'yesterday_pending' && <span className="text-rose-600 font-bold uppercase text-[8px]">Active</span>}
                      </div>
                      <div className="absolute top-0 left-0 h-1 w-full bg-rose-500" />
                    </div>

                    {/* Yesterday Completed */}
                    <div 
                      onClick={() => setAuditSegment('yesterday_completed')}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                        auditSegment === 'yesterday_completed'
                          ? 'bg-sky-50 dark:bg-sky-955/20 border-sky-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-sky-350'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[9.5px] uppercase font-black text-slate-400 font-mono tracking-wider block">Yesterday Contacted</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">कल किया कांटेक्ट (Done)</span>
                        </div>
                        <span className="text-2xl font-black font-mono text-sky-650 dark:text-sky-400">{countYesterdayCompleted}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-slate-455">
                        <span>Date: {yesterday}</span>
                        {auditSegment === 'yesterday_completed' && <span className="text-sky-655 font-bold uppercase text-[8px]">Active</span>}
                      </div>
                      <div className="absolute top-0 left-0 h-1 w-full bg-sky-500" />
                    </div>

                    {/* Today Pending */}
                    <div 
                      onClick={() => setAuditSegment('today_pending')}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                        auditSegment === 'today_pending'
                          ? 'bg-amber-50 dark:bg-amber-955/20 border-amber-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-amber-300'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[9.5px] uppercase font-black text-slate-400 font-mono tracking-wider block">Today Pending</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">आज का पेंडिंग Leads</span>
                        </div>
                        <span className="text-2xl font-black font-mono text-amber-605 dark:text-amber-400">{countTodayPending}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-slate-455">
                        <span>Date: {today}</span>
                        {auditSegment === 'today_pending' && <span className="text-amber-605 font-bold uppercase text-[8px]">Active</span>}
                      </div>
                      <div className="absolute top-0 left-0 h-1 w-full bg-amber-500" />
                    </div>

                    {/* Today Completed */}
                    <div 
                      onClick={() => setAuditSegment('today_completed')}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                        auditSegment === 'today_completed'
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 shadow-xs'
                          : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-emerald-355'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[9.5px] uppercase font-black text-slate-400 font-mono tracking-wider block">Today Contacted</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">आज किया कांटेक्ट (Done)</span>
                        </div>
                        <span className="text-2xl font-black font-mono text-emerald-600 dark:text-emerald-450">{countTodayCompleted}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[9px] font-mono text-slate-455">
                        <span>Date: {today}</span>
                        {auditSegment === 'today_completed' && <span className="text-emerald-600 font-bold uppercase text-[8px]">Active</span>}
                      </div>
                      <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500" />
                    </div>

                  </div>

                  {/* New Custom Stage & Pendency Boxes for Audited Caller */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Follow-Up Pending Box (Full Content in Red) */}
                    <div 
                      onClick={() => {
                        const nextVal = auditCategoryFilter === 'FOLLOWUP PENDING' ? 'ALL' : 'FOLLOWUP PENDING';
                        setAuditCategoryFilter(nextVal);
                        if (nextVal !== 'ALL') {
                          setAuditSegment('all');
                        }
                      }}
                      className={`p-4 rounded-2xl shadow-xs space-y-1.5 cursor-pointer transition-all select-none border-2 ${
                        auditCategoryFilter === 'FOLLOWUP PENDING'
                          ? 'bg-rose-100 dark:bg-rose-955/40 border-red-600 text-rose-750 dark:text-rose-300 ring-2 ring-red-500/20'
                          : 'bg-rose-50/80 dark:bg-rose-955/20 border-red-500 text-rose-600 dark:text-rose-400 hover:scale-[1.01]'
                      }`}
                    >
                      <span className="text-[10px] font-black font-mono block uppercase tracking-wider text-rose-650 dark:text-rose-455">Follow-Up Pending alert</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-2xl font-black">{totalFollowupPending}</span>
                        <span className="text-[11px] font-bold">Total Followups Pending is {totalFollowupPending}</span>
                      </div>
                    </div>

                    {/* Interested Card */}
                    <div 
                      onClick={() => {
                        const nextVal = auditCategoryFilter === 'INTRESTED' ? 'ALL' : 'INTRESTED';
                        setAuditCategoryFilter(nextVal);
                        if (nextVal !== 'ALL') {
                          setAuditSegment('all');
                        }
                      }}
                      className={`p-4 rounded-2xl shadow-xs space-y-1.5 cursor-pointer transition-all select-none border-2 ${
                        auditCategoryFilter === 'INTRESTED'
                          ? 'bg-indigo-50 dark:bg-slate-800 border-indigo-600 text-indigo-700 dark:text-slate-100 ring-2 ring-indigo-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-indigo-400 hover:scale-[1.01]'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase tracking-wider">Interested pipeline</span>
                      <div className="flex items-baseline justify-between select-none">
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalInterested}</span>
                        <span className="text-xs text-indigo-500 font-medium">Stages except Not Interested</span>
                      </div>
                    </div>

                    {/* Final Disposed Card */}
                    <div 
                      onClick={() => {
                        const nextVal = auditCategoryFilter === 'FINAL DISPOSED' ? 'ALL' : 'FINAL DISPOSED';
                        setAuditCategoryFilter(nextVal);
                        if (nextVal !== 'ALL') {
                          setAuditSegment('all');
                        }
                      }}
                      className={`p-4 rounded-2xl shadow-xs space-y-1.5 cursor-pointer transition-all select-none border-2 ${
                        auditCategoryFilter === 'FINAL DISPOSED'
                          ? 'bg-slate-100 dark:bg-slate-800 border-slate-600 text-slate-900 dark:text-slate-100 ring-2 ring-slate-500/20'
                          : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-815 hover:border-slate-400 hover:scale-[1.01]'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-400 font-mono block uppercase tracking-wider">Final Disposed pipeline</span>
                      <div className="flex items-baseline justify-between select-none font-sans">
                        <span className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalFinalDisposed}</span>
                        <span className="text-xs text-rose-500 font-medium">Stage is Not Interested</span>
                      </div>
                    </div>
                  </div>

                  {/* Search, Filter Tabs and Dates selector toolbar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl space-y-3.5 shadow-xs">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-indigo-750 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2.5 py-1 rounded-md">
                          🔒 Auditing: {selectedEmployee?.name}
                        </span>
                        <span className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">
                          Total Leads: {auditedLeads.length}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        
                        {/* Dynamic Custom Datepicker Selector */}
                        <div className="flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl px-2.5 py-1 text-slate-900 dark:text-slate-105">
                          <span className="text-[9.5px] uppercase font-bold text-slate-405 font-mono mr-1">Date Lookup:</span>
                          <input
                            type="date"
                            value={auditCustomDate}
                            onChange={(e) => {
                              setAuditCustomDate(e.target.value);
                              setAuditSegment('custom_date');
                            }}
                            className="bg-transparent border-none text-xs font-mono font-bold focus:outline-none"
                          />
                        </div>

                        {/* Category Dropdown Selector for Auditor */}
                        <div className="flex items-center space-x-1.5 bg-slate-50 dark:bg-slate-955 border border-slate-205 dark:border-slate-850 rounded-xl px-2.5 py-1">
                          <span className="text-[9.5px] font-bold text-slate-405 uppercase tracking-wider font-mono">Category:</span>
                          <select
                            value={auditCategoryFilter}
                            onChange={(e) => {
                              const nextVal = e.target.value as any;
                              setAuditCategoryFilter(nextVal);
                              if (nextVal !== 'ALL') {
                                setAuditSegment('all');
                              }
                            }}
                            className="bg-transparent border-none text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                          >
                            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="ALL">🌟 ALL ({auditedLeads.length})</option>
                            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="INTRESTED">👍 INTRESTED ({auditedLeads.filter(l => l.stage !== 'Not Interested').length})</option>
                            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="FOLLOWUP PENDING">📞 FOLLOWUP PENDING ({auditedLeads.filter(l => l.stage === 'Follow-Up Pending').length})</option>
                            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="FINAL DISPOSED">🗑️ FINAL DISPOSED ({auditedLeads.filter(l => l.stage === 'Not Interested').length})</option>
                            <option className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100" value="CONVERTED">🎉 CONVERTED ({auditedLeads.filter(l => l.stage === 'Converted').length})</option>
                          </select>
                        </div>

                        <div className="relative w-full sm:w-60">
                          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-455 pointer-events-none">
                            <Search className="h-3.5 w-3.5" />
                          </span>
                          <input
                            type="text"
                            placeholder="Filter customer name..."
                            value={auditSearch}
                            onChange={(e) => setAuditSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-850 rounded-xl text-xs text-slate-700 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
                          />
                        </div>
                      </div>

                    </div>

                    {/* Segment Filter Nav */}
                    <div className="flex flex-wrap items-center gap-1 border-t border-slate-100 dark:border-slate-850 pt-2.5">
                      {[
                        { id: 'all', label: 'All Scheduled' },
                        { id: 'pending', label: 'Upcoming Pendings' },
                        { id: 'overdue', label: 'Overdue Calls' },
                        { id: 'completed', label: 'Logs completed' },
                        { id: 'custom_date', label: `On Date: ${auditCustomDate === today ? 'Today' : auditCustomDate === yesterday ? 'Yesterday' : auditCustomDate}` }
                      ].map(subTab => (
                        <button
                          key={subTab.id}
                          onClick={() => setAuditSegment(subTab.id as any)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0 cursor-pointer ${
                            auditSegment === subTab.id
                              ? 'bg-indigo-600 text-white shadow-xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-500 dark:bg-slate-955 dark:hover:bg-slate-805'
                          }`}
                        >
                          <span>{subTab.label}</span>
                          <span className="ml-1.5 font-mono text-[9px] bg-slate-200/55 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1 py-0.5 rounded">
                            {
                              getCategoryFilteredLeads().filter(lead => doesLeadMatchSegment(lead.id, subTab.id) && matchSearch(lead)).length
                            }
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Detailed Leads & Follow-up table for Selected Segment */}
                  {filteredAuditedLeads.length > 0 ? (
                    <>
                      <div className="overflow-hidden border border-slate-150 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 font-bold border-b border-slate-150 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[9.5px] font-mono">
                            <th className="p-3.5 px-4">Client Particulars</th>
                            <th className="p-3.5">Schedule Target</th>
                            <th className="p-3.5">Goal Remarks</th>
                            <th className="p-3.5">Outcome Logged</th>
                            <th className="p-3.5">Status Check</th>
                            <th className="p-3.5 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-105 dark:divide-slate-850 font-sans">
                          {displayedAuditedLeads.map(lead => {
                            const leadFollowups = followups.filter(f => f.leadId === lead.id);

                            // Find the most appropriate active follow-up to show
                            let activeFollowup = leadFollowups.find(f => {
                              if (auditSegment === 'yesterday_pending') {
                                return f.status !== 'completed' && f.followUpDate === yesterday;
                              }
                              if (auditSegment === 'today_pending') {
                                return f.status !== 'completed' && f.followUpDate === today;
                              }
                              if (auditSegment === 'yesterday_completed') {
                                return f.status === 'completed' && f.followUpDate === yesterday;
                              }
                              if (auditSegment === 'today_completed') {
                                return f.status === 'completed' && f.followUpDate === today;
                              }
                              if (auditSegment === 'pending') {
                                return f.status === 'pending' && f.followUpDate >= today;
                              }
                              if (auditSegment === 'overdue') {
                                return f.status === 'overdue' || (f.status === 'pending' && f.followUpDate < today);
                              }
                              if (auditSegment === 'completed') {
                                return f.status === 'completed';
                              }
                              if (auditSegment === 'custom_date') {
                                return f.followUpDate === auditCustomDate;
                              }
                              return false;
                            });

                            if (!activeFollowup && leadFollowups.length > 0) {
                              activeFollowup = [...leadFollowups].sort((a, b) => {
                                return new Date(`${b.followUpDate}T${b.followUpTime || '12:00'}`).getTime() - new Date(`${a.followUpDate}T${a.followUpTime || '12:00'}`).getTime();
                              })[0];
                            }

                            const isOverdue = activeFollowup ? (activeFollowup.status === 'overdue' || (activeFollowup.status === 'pending' && activeFollowup.followUpDate < today)) : false;

                            return (
                              <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950 transition-colors">
                                <td className="p-3.5 px-4 space-y-0.5">
                                  <div className="font-bold text-slate-805 dark:text-slate-150 flex items-center space-x-1.5">
                                    <span>{lead.customerName}</span>
                                    {lead.businessName && <span className="text-[10px] text-slate-450 font-sans">({lead.businessName})</span>}
                                  </div>
                                  <div className="text-[10px] text-indigo-650 dark:text-indigo-400 font-bold">
                                    Service: {lead.serviceRequired}
                                  </div>
                                  <span className="text-[9px] font-mono bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded font-black max-w-max inline-block uppercase mt-0.5">
                                    Stage: {lead.stage}
                                  </span>
                                </td>
                                <td className="p-3.5 font-mono space-y-0.5">
                                  {activeFollowup ? (
                                    <>
                                      <div className="font-bold text-slate-705 dark:text-slate-300 flex items-center">
                                        <Calendar className="h-3 w-3 mr-1 text-slate-405 shrink-0" />
                                        <span>{activeFollowup.followUpDate}</span>
                                      </div>
                                      <div className="text-[10px] text-slate-400 flex items-center">
                                        <Clock className="h-3 w-3 mr-1 text-slate-405 shrink-0" />
                                        <span>{activeFollowup.followUpTime || '12:00'}</span>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="font-bold text-slate-400 flex items-center">
                                        <Calendar className="h-3 w-3 mr-1 text-slate-350 shrink-0" />
                                        <span>{lead.creationDate}</span>
                                      </div>
                                      <div className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">
                                        (Created Date)
                                      </div>
                                    </>
                                  )}
                                </td>
                                <td className="p-3.5 text-slate-655 dark:text-slate-350 max-w-xs truncate" title={activeFollowup?.remarks || lead.notes}>
                                  {activeFollowup ? (activeFollowup.remarks || 'No notes defined.') : (lead.notes || 'No registration notes.')}
                                </td>
                                <td className="p-3.5 max-w-xs">
                                  {activeFollowup ? (
                                    activeFollowup.status === 'completed' ? (
                                      <div className="p-2 bg-emerald-500/5 border border-emerald-500/15 rounded-lg text-emerald-700 dark:text-emerald-400 italic font-mono text-[10px]">
                                        {activeFollowup.customerResponse || 'Completed with empty comments.'}
                                      </div>
                                    ) : (
                                      <span className="text-amber-600 font-mono text-[10px] font-bold">Awaiting Contact Log...</span>
                                    )
                                  ) : (
                                    <span className="text-slate-400 font-mono text-[10px]">No follow-up logged yet</span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  {activeFollowup ? (
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded-lg font-mono inline-flex items-center space-x-1 ${
                                      isOverdue 
                                        ? 'bg-rose-50 text-rose-600 dark:bg-rose-955/20' 
                                        : activeFollowup.status === 'completed'
                                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'
                                          : 'bg-amber-50 text-amber-600 dark:bg-amber-955/15'
                                    }`}>
                                      {isOverdue ? '⚠️ OVERDUE CALL' : activeFollowup.status.toUpperCase()}
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 text-[9px] font-extrabold rounded-lg inline-flex items-center space-x-1 bg-slate-100 text-slate-500 dark:bg-slate-300 dark:text-slate-700">
                                      NO SCHEDULE
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 text-center">
                                  <div className="flex items-center justify-center space-x-1">
                                    <a 
                                      href={`tel:${lead.mobile}`}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-655 rounded-lg transition-all"
                                      title="Call customer contact number"
                                    >
                                      <PhoneCall className="h-3.5 w-3.5 text-indigo-505" />
                                    </a>
                                    <button 
                                      onClick={() => onTriggerLeadDetail(lead.id)}
                                      className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-lg cursor-pointer transition-all"
                                      title="Open full Lead particulars details"
                                    >
                                      <ExternalLink className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {filteredAuditedLeads.length > 10 && (
                      <div className="flex justify-center pt-3 pb-1">
                        <button
                          type="button"
                          onClick={() => setShowAllFilteredAuditedLeads(!showAllFilteredAuditedLeads)}
                          className="px-5 py-2.5 bg-indigo-50 hover:bg-slate-800 text-indigo-700 dark:bg-slate-950 dark:hover:bg-slate-850 dark:text-slate-350 font-extrabold rounded-xl text-[10.5px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ring-1 ring-indigo-500/10"
                        >
                          {showAllFilteredAuditedLeads ? 'Show Less Leads ⬆️' : `View More Leads (${filteredAuditedLeads.length - 10} items) ⬇️`}
                        </button>
                      </div>
                    )}
                  </>
                  ) : (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-805 rounded-2xl space-y-2">
                      <Calendar className="h-7 w-7 text-slate-300 mx-auto" />
                      <h5 className="font-extrabold uppercase text-xs text-slate-750 dark:text-slate-200 tracking-wider">No Leads Found</h5>
                      <p className="text-[10px] text-slate-400">No leads match the selected segment or category filter for this associate.</p>
                    </div>
                  )}

                </div>
              );
            })() : (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-150 dark:border-slate-800 rounded-xl space-y-2">
                <Users className="h-10 w-10 text-indigo-505 mx-auto animate-pulse" />
                <h4 className="font-extrabold uppercase text-xs text-slate-700 dark:text-slate-300 tracking-wider">Associate Data Selection Locked</h4>
                <p className="text-[10px] text-slate-450 max-w-sm mx-auto">Please choose an active compliance associate from the dropdown selection box to audit their interactive daily activity sheets.</p>
              </div>
            )}
            </div>
          </div>
        )}

          {employeesSubTab === 'exits' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Exits & Resignation Approvals</h3>
                  <p className="text-xs text-slate-500">View resignation schedules, approve relief requests, or log involuntary terminations.</p>
                </div>
              </div>

              {/* Grid: Pending Actions & Manual logger */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1 & 2: Resignation Requests & Records */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Resignation Submissions Listing */}
                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                        Resignation & Relieving Filings
                      </h4>
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full">
                        {rawResignations.length} total
                      </span>
                    </div>

                    {rawResignations.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                        <AlertCircle className="h-6 w-6 text-slate-300 mx-auto animate-bounce" />
                        <h5 className="font-bold text-xs text-slate-700 dark:text-slate-200 uppercase tracking-wide">No Filings Logged</h5>
                        <p className="text-[10px] text-slate-450">There are no employee resignations or relieving requests recorded in the system.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {rawResignations.map((req) => {
                          const emp = rawEmployees.find(e => e.id === req.employeeId);
                          return (
                            <div key={req.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-xl space-y-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="h-9 w-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold font-mono text-xs">
                                    {emp?.name.charAt(0).toUpperCase() || 'E'}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                                      {emp?.name || req.employeeId}
                                    </div>
                                    <div className="text-[10px] text-slate-450">
                                      Role: <span className="capitalize">{emp?.role || 'Associate'}</span> • ID: {req.employeeId}
                                    </div>
                                  </div>
                                </div>
                                <span className={`text-[9px] uppercase font-mono px-2 py-0.5 rounded-md font-bold ${
                                  req.status === 'pending'
                                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-305'
                                    : req.status === 'approved'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-305'
                                    : 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
                                }`}>
                                  {req.status}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-[11px] bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Resign Filed At</span>
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                                    {new Date(req.submissionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Requested Exit Date</span>
                                  <span className="font-semibold text-rose-600 dark:text-rose-455">
                                    {new Date(req.requestedExitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                </div>
                                <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-850">
                                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Reason of Exit / resignation</span>
                                  <p className="text-slate-700 dark:text-slate-300 italic text-[10.5px]">
                                    "{req.reason || 'No specific reason offered.'}"
                                  </p>
                                </div>
                              </div>

                              {/* Approvals Feedback */}
                              {req.status === 'pending' ? (
                                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-205 dark:border-slate-800">
                                  <div className="flex-1 max-w-xs">
                                    <input
                                      type="text"
                                      id={`reject-reason-${req.id}`}
                                      placeholder="Rejection reason, if any..."
                                      className="w-full text-[10.5px] p-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-850 rounded-lg text-slate-800 dark:text-slate-100"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const inputEl = document.getElementById(`reject-reason-${req.id}`) as HTMLInputElement;
                                      const reasonText = inputEl?.value || 'Resignation rejected by HR Management';
                                      const updated = updateResignationStatus(req.id, 'rejected', currentUserId, loggedInUser?.name || 'Administrator', reasonText);
                                      if (updated) {
                                        setRawResignations(getResignationRequests());
                                        setEmployees(getEmployees());
                                        onRefreshData();
                                      }
                                    }}
                                    className="px-3 py-1.5 hover:bg-rose-50 text-rose-600 dark:hover:bg-rose-955 font-bold text-[10px] rounded-lg border border-rose-200 dark:border-rose-900 cursor-pointer"
                                  >
                                    Decline
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = updateResignationStatus(req.id, 'approved', currentUserId, loggedInUser?.name || 'Administrator');
                                      if (updated) {
                                        setRawResignations(getResignationRequests());
                                        setEmployees(getEmployees());
                                        onRefreshData();
                                      }
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg cursor-pointer"
                                  >
                                    Accept & Relieve
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between text-[10.5px] pt-2 border-t border-slate-200 dark:border-slate-800 text-slate-500">
                                  <div>
                                    {req.status === 'approved' ? (
                                      <span>
                                        Approved by <strong>{req.approvedByName || 'HR Operations'}</strong> on {req.actedAt ? new Date(req.actedAt).toLocaleDateString('en-IN') : 'N/A'}
                                      </span>
                                    ) : (
                                      <span className="text-rose-500">
                                        Declined: <em>"{req.rejectionReason}"</em> (by {req.approvedByName || 'HR Operations'})
                                      </span>
                                    )}
                                  </div>
                                  {req.status === 'approved' && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedResignationForLetter(req)}
                                      className="py-1 px-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:hover:bg-indigo-900 dark:text-indigo-305 font-bold text-[10px] cursor-pointer"
                                    >
                                      relieving letter pdf
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 3: Manual Exit Process Form */}
                <div className="space-y-6">
                  <div className="p-5 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-4">
                    <div>
                      <h4 className="font-extrabold uppercase text-[10.5px] text-slate-500 tracking-wider font-sans">Log Manual/Forced Exit</h4>
                      <p className="text-[10px] text-slate-400">Log an involuntary termination, immediate relief, or offboard associates manually.</p>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const empId = (form.elements.namedItem('manualEmpId') as HTMLSelectElement).value;
                        const dateStr = (form.elements.namedItem('manualExitDate') as HTMLInputElement).value;
                        const reasonStr = (form.elements.namedItem('manualExitReason') as HTMLTextAreaElement).value;
                        const statusType = (form.elements.namedItem('manualExitType') as HTMLSelectElement).value;

                        if (!empId || !dateStr || !reasonStr.trim()) {
                          alert('Please supply all required personnel fields.');
                          return;
                        }

                        // Create formal resignation request directly in approved state
                        const targetEmp = rawEmployees.find(e => e.id === empId);
                        const requests = getResignationRequests();
                        const newReq: ResignationRequest = {
                          id: `R-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
                          employeeId: empId,
                          employeeName: targetEmp?.name || empId,
                          reason: reasonStr,
                          requestedExitDate: dateStr,
                          submissionDate: new Date().toISOString(),
                          status: 'approved',
                          approvedBy: currentUserId,
                          approvedByName: loggedInUser?.name || 'Administrator',
                          actedAt: new Date().toISOString()
                        };
                        requests.push(newReq);
                        
                        // Save requests
                        saveResignationRequests(requests);

                        // Hard disable the employee
                        const emps = getEmployees();
                        const empIdx = emps.findIndex(em => em.id === empId);
                        if (empIdx !== -1) {
                          emps[empIdx].status = 'disabled';
                          emps[empIdx].exitDate = dateStr;
                          emps[empIdx].exitReason = reasonStr;
                          emps[empIdx].exitStatus = statusType as any;
                          saveEmployees(emps);
                        }

                        alert(`Employee manual offboarding filed successfully. Standard Relieving letter generated.`);
                        form.reset();
                        setRawResignations(getResignationRequests());
                        setEmployees(getEmployees());
                        onRefreshData();
                      }}
                      className="space-y-4 font-sans text-xs"
                    >
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Select Employee *</label>
                        <select
                          name="manualEmpId"
                          required
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                        >
                          <option value="">-- Choose active associate --</option>
                          {rawEmployees.filter(e => e.status === 'active' && e.id !== 'EMP-ADMIN').map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.id})</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-400">Exit / Relieving Category</label>
                        <select
                          name="manualExitType"
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-bold"
                        >
                          <option value="resigned">Voluntary Resigned (Resigned)</option>
                          <option value="terminated">Involuntary Relieved (Terminated)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Effective Date *</label>
                        <input
                          type="date"
                          name="manualExitDate"
                          required
                          defaultValue={getISTDateString()}
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] uppercase font-bold text-slate-500">Description / Reason *</label>
                        <textarea
                          name="manualExitReason"
                          required
                          rows={3}
                          placeholder="Provide the reason of Exit or resignation. This description will format natively into relieving Experience PDF..."
                          className="w-full p-2 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
                      >
                        Force Complete Offboarding
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            </div>
          )}

          {employeesSubTab === 'transfers' && (
            <div className="space-y-6">
              <div className="pb-4 border-b border-slate-100 dark:border-slate-800 font-sans">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Client Leads Data Transfer Gateway</h3>
                <p className="text-xs text-slate-500">Select an employee (retired, resigned, or active) to hand off and transfer all of their active lead registries and proposals to another teammate.</p>
              </div>

              <div className="max-w-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl p-6 space-y-6">
                
                {transferStatusMsg && (
                  <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 font-semibold ${
                    transferStatusMsg.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                  }`}>
                    <CheckCircle className="h-4 w-4 shrink-0" />
                    <span>{transferStatusMsg.text}</span>
                  </div>
                )}

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!transferFromEmpId || !transferToEmpId || !transferReason.trim()) {
                      setTransferStatusMsg({ type: 'error', text: 'Please fill out all fields.' });
                      return;
                    }
                    if (transferFromEmpId === transferToEmpId) {
                      setTransferStatusMsg({ type: 'error', text: 'Cannot transfer data to the same employee. Choose a distinct colleague.' });
                      return;
                    }

                    const res = transferEmployeeLeadsAndProposals(transferFromEmpId, transferToEmpId, transferReason);
                    if (res.success) {
                      setTransferStatusMsg({
                        type: 'success',
                        text: `Handoff completed! Transferred ${res.leadsTransferred} active leads and ${res.proposalsTransferred} proposals successfully. Target representative is now authorized.`
                      });
                      setTransferReason('');
                      onRefreshData();
                    } else {
                      setTransferStatusMsg({ type: 'error', text: res.message || 'Handoff tool crashed. Contact system root admin.' });
                    }
                  }}
                  className="space-y-4 font-sans text-xs"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-extrabold text-rose-50 block">Transfer Source (From Employee) *</label>
                      <select
                        value={transferFromEmpId}
                        onChange={(e) => setTransferFromEmpId(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-medium"
                      >
                        <option value="">-- Select Source Associate --</option>
                        {rawEmployees.map(e => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.id}) {e.status === 'disabled' ? '[DISABLED / RESIGNED]' : '[ACTIVE]'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-extrabold text-emerald-600 block">Transfer Target (To New Employee) *</label>
                      <select
                        value={transferToEmpId}
                        onChange={(e) => setTransferToEmpId(e.target.value)}
                        required
                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100 font-bold"
                      >
                        <option value="">-- Select Active Target Associate --</option>
                        {rawEmployees.filter(e => e.status === 'active').map(e => (
                          <option key={e.id} value={e.id}>
                            {e.name} ({e.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-slate-500">Handoff Authorization Reason *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Employee resigned. Transferring operational directories for business continuity."
                      value={transferReason}
                      onChange={(e) => setTransferReason(e.target.value)}
                      className="w-full p-2.5 bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
                    />
                  </div>

                  <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl space-y-1 text-[11px] text-indigo-700 dark:text-indigo-400">
                    <span className="font-extrabold uppercase tracking-wider text-[9px] block">⚠️ Data Integrity Operations Notice:</span>
                    <p className="leading-relaxed font-sans">
                      Executing this will run a standard transaction over database keys to repopulate all associated lead sheets. Planners, diaries, and proposals will migrate safely under the target associate's account. This action cannot be undone. Leads will have a badge highlighting they were transferred from the original owner.
                    </p>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl tracking-wide uppercase transition-all cursor-pointer font-sans"
                  >
                    Execute Handoff & Transfer Data
                  </button>
                </form>
              </div>
            </div>
          )}

          </div>
        )}

      {/* ==============================================================
          TAB: LEADS ADVANCED RE-ASSIGNMENT REVIEW
          ============================================================== */}
      {viewTab === 'leads' && (
        <div className="space-y-6">
          {/* Advanced filter header */}
          <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-72">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Search matching clients, mobiles, entities..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto text-xs font-semibold">
              {/* Date Filters block */}
              <div className="flex items-center space-x-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 p-1 rounded-lg">
                <span className="text-[9px] uppercase font-bold text-slate-400">From</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-[10px] focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
                />
                <span className="text-[9px] uppercase font-bold text-slate-400">To</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-[10px] focus:outline-none text-slate-800 dark:text-slate-100 font-mono"
                />
                {(startDate || endDate) && (
                  <button
                    onClick={() => { setStartDate(''); setEndDate(''); }}
                    className="text-[9px] text-rose-500 hover:underline font-bold px-1"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">CATEGORY:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 border border-slate-200 dark:border-slate-750 rounded-lg text-[10px] font-extrabold text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">🌟 ALL ({leads.length})</option>
                  <option value="INTRESTED">👍 INTRESTED ({leads.filter(l => l.stage !== 'Not Interested').length})</option>
                  <option value="FOLLOWUP PENDING">📞 FOLLOWUP PENDING ({leads.filter(l => l.stage === 'Follow-Up Pending').length})</option>
                  <option value="FINAL DISPOSED">🗑️ FINAL DISPOSED ({leads.filter(l => l.stage === 'Not Interested').length})</option>
                  <option value="CONVERTED">🎉 CONVERTED ({leads.filter(l => l.stage === 'Converted').length})</option>
                </select>
              </div>

              <select
                value={filterStage}
                onChange={(e) => setFilterStage(e.target.value)}
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg text-[11px]"
              >
                <option value="">-- Stages --</option>
                {leads.map((l) => l.stage).filter((v, i, a) => a.indexOf(v) === i).map((stg) => (
                  <option key={stg} value={stg}>{stg}</option>
                ))}
              </select>

              <select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg text-[11px]"
              >
                <option value="">-- Services --</option>
                {leads.map((l) => l.serviceRequired).filter((v, i, a) => a.indexOf(v) === i).map((srv) => (
                  <option key={srv} value={srv}>{srv}</option>
                ))}
              </select>

              <select
                value={filterEmployee}
                onChange={(e) => setFilterEmployee(e.target.value)}
                className="p-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg text-[11px]"
              >
                <option value="">-- Assignment --</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>

              {/* Create Lead Button */}
              <button
                type="button"
                onClick={() => onTriggerLeadDetail(null)}
                className="flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shrink-0 cursor-pointer active:scale-95 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Create Lead</span>
              </button>

              {/* Excel Lead Export button */}
              <button
                type="button"
                onClick={() => {
                  const headers = ['Client Name', 'Mobile Number', 'Email', 'Company', 'Service Required', 'Lead Source', 'Stage', 'Creation Date'];
                  const rows = filteredLeads.map(l => [
                    l.customerName.replace(/"/g, '""'),
                    l.mobile.replace(/"/g, '""'),
                    l.email.replace(/"/g, '""'),
                    (l.businessName || '').replace(/"/g, '""'),
                    l.serviceRequired.replace(/"/g, '""'),
                    l.leadSource.replace(/"/g, '""'),
                    l.stage.replace(/"/g, '""'),
                    l.creationDate
                  ]);

                  const csvLineContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(val => `"${val}"`).join(','))
                  ].join('\n');
                  
                  const blob = new Blob([csvLineContent], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.setAttribute("href", url);
                  link.setAttribute("download", `efilingg_leads_admin_${new Date().toISOString().split('T')[0]}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="flex items-center space-x-1 py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shrink-0 cursor-pointer active:scale-95"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export ({filteredLeads.length})</span>
              </button>
            </div>
          </div>

          {/* Shared LEAD Box Section */}
          <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-dashed border-indigo-200 dark:border-indigo-900/40 space-y-4">
            <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100 font-mono">
                  Shared LEAD
                </h4>
              </div>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
                {tlSharedLeads.length} Shared Leads
              </span>
            </div>

            {tlSharedLeads.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2 text-center">
                No leads have been received via share/transfer to your personal Desk.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tlSharedLeads.map((l) => {
                  const transferDetails = getTLTransferDetails(l.id);
                  const isRetransferringThis = reTransferringLeadId === l.id;

                  return (
                    <div 
                      key={l.id} 
                      className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-150 dark:border-slate-800 shadow-xs space-y-3 relative"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                            {l.customerName}
                          </span>
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-505 dark:text-slate-400 px-1.5 py-0.5 rounded-sm font-mono">
                            ID: {l.id}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                          <p><span className="font-semibold text-slate-700 dark:text-slate-350">Mobile:</span> {l.mobile}</p>
                          <p><span className="font-semibold text-slate-700 dark:text-slate-350">Service Required:</span> {l.serviceRequired}</p>
                          {l.businessName && <p><span className="font-semibold text-slate-700 dark:text-slate-350">Business:</span> {l.businessName}</p>}
                        </div>
                      </div>

                      {transferDetails && (
                        <div className="p-2.5 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-950/40 rounded-xl text-[11px] space-y-1">
                          <p className="text-indigo-700 dark:text-indigo-300 font-bold">
                            🤝 Shared by: <span className="font-extrabold">{transferDetails.transferredFromName}</span>
                          </p>
                          <p className="text-slate-600 dark:text-slate-400">
                            <span className="font-semibold text-slate-700 dark:text-slate-350">Reason:</span> "{transferDetails.reason}"
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono text-right">
                            {new Date(transferDetails.transferredAt).toLocaleString()}
                          </p>
                        </div>
                      )}

                      {/* Power to re-transfer */}
                      {!isRetransferringThis ? (
                        <button
                          type="button"
                          onClick={() => {
                            setReTransferringLeadId(l.id);
                            setReTransferTargetId('');
                            setReTransferReason('');
                            setReTransferError('');
                            setReTransferSuccess(false);
                          }}
                          className="w-full mt-2 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-xs rounded-xl cursor-pointer transition-all flex items-center justify-center space-x-1.5"
                        >
                          <ArrowRightLeft className="h-3.5 w-3.5" />
                          <span>Re-Transfer Lead</span>
                        </button>
                      ) : (
                        <form onSubmit={handleTLReTransferSubmit} className="mt-3 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                          <h5 className="text-[11px] font-black uppercase text-indigo-600 tracking-wider font-mono">
                            Re-Transfer Setup
                          </h5>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400">
                              Select Recipient Employee *
                            </label>
                            <select
                              required
                              value={reTransferTargetId}
                              onChange={(e) => setReTransferTargetId(e.target.value)}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-905 dark:text-slate-105"
                            >
                              <option value="">-- Choose corporate recipient --</option>
                              {rawEmployees
                                .filter((e) => e.id !== currentUserId && e.status === 'active')
                                .map((e) => (
                                  <option key={e.id} value={e.id}>
                                    {e.name} ({e.role})
                                  </option>
                                ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-600 dark:text-slate-400 block">
                              Reason for Re-Transfer *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="E.g. Assigning to priority agent for follow-up closure."
                              value={reTransferReason}
                              onChange={(e) => setReTransferReason(e.target.value)}
                              className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl text-xs text-slate-905 dark:text-slate-105 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          {reTransferError && (
                            <p className="text-[10px] text-rose-500 font-bold bg-rose-50 p-1.5 rounded-lg">
                              ⚠️ {reTransferError}
                            </p>
                          )}

                          {reTransferSuccess && (
                            <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 p-1.5 rounded-lg">
                              ✓ Re-Transferred successfully!
                            </p>
                          )}

                          <div className="flex items-center space-x-2 pt-1 justify-end">
                            <button
                              type="button"
                              onClick={() => setReTransferringLeadId(null)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              className="px-3.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-505 rounded-lg cursor-pointer"
                            >
                              Transfer
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Table leads list */}
          <div className="max-h-[480px] overflow-y-auto overflow-x-auto border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-505 uppercase tracking-wider text-[10px]">
                  <th className="p-4 px-5">Lead & Contact</th>
                  <th className="p-4">Requirement</th>
                  <th className="p-4">Lead Source</th>
                  <th className="p-4">Filing Stage</th>
                  <th className="p-4">Assigned Broker</th>
                  <th className="p-4 text-center">Filing Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-sans">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-450 text-xs">
                      No active customer records matching selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.slice(0, visibleLeadsCount).map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950 transition-colors">
                      <td className="p-4 px-5 space-y-0.5">
                        <span className="font-bold text-slate-900 dark:text-slate-150">{l.customerName}</span>
                        <div className="flex items-center space-x-1.5 text-[10px] text-slate-450 dark:text-slate-500 font-mono">
                          <span>{l.mobile}</span>
                          <span>•</span>
                          <span>ID: {l.id}</span>
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-slate-800 dark:text-slate-250 truncate w-32">{l.serviceRequired}</td>
                      <td className="p-4 text-slate-650 dark:text-slate-400">{l.leadSource}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] tracking-wide ${
                          l.stage === 'Converted'
                            ? 'bg-emerald-50 text-emerald-650 dark:bg-emerald-950'
                            : l.stage === 'New Lead'
                            ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950'
                            : 'bg-amber-50 text-amber-650 dark:bg-amber-950'
                        }`}>
                          {l.stage}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-semibold text-slate-800 dark:text-slate-250 font-sans">
                          {employees.find((e) => e.id === l.assignedTo)?.name || l.assignedTo}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => onTriggerLeadDetail(l.id)}
                          className="py-1 px-3.5 bg-slate-900 border border-slate-210 text-white rounded-lg cursor-pointer hover:bg-slate-805"
                        >
                          Details & Actions
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredLeads.length > visibleLeadsCount && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => setVisibleLeadsCount(999999)}
                className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-505 dark:bg-indigo-700 dark:hover:bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all active:scale-95 cursor-pointer uppercase tracking-wider font-sans whitespace-nowrap"
              >
                View More Leads (+{filteredLeads.length - visibleLeadsCount} more)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ==============================================================
          TAB: PROPOSALS PREVIEWS
          ============================================================== */}
      {viewTab === 'proposals' && (
        <div className="space-y-4">
          <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">Dispatched Quotes History</h3>
          <p className="text-xs text-slate-500 pb-2">Review quote allocations and pricing histories.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {proposals.length === 0 ? (
              <div className="p-8 text-center text-slate-450 text-xs md:col-span-2">
                No corporate proposals dispatched yet. Build a proposal template anytime.
              </div>
            ) : (
              proposals.map((p) => (
                <div key={p.id} className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col justify-between hover:border-emerald-500/25 transition-colors">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wide font-mono text-emerald-600 font-extrabold">Proposal #{p.id}</span>
                      <span className="font-mono text-xs font-black text-slate-900 dark:text-white">₹{p.finalAmount}</span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="font-bold text-sm text-slate-800 dark:text-slate-150">{p.clientName}</span>
                      <p className="text-xs text-slate-505 dark:text-slate-400">{p.serviceRequired}</p>
                    </div>

                    <p className="text-[11px] text-slate-400">Created by: {p.createdByName} on {new Date(p.createdAt).toLocaleDateString()}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-100 dark:border-slate-850/40 flex items-center justify-between mt-4">
                    <span className="text-[10px] font-bold text-emerald-505 capitalize">{p.status} Status</span>
                    <button
                      onClick={() => onTriggerProposalPreview(p)}
                      className="text-xs font-bold text-emerald-600 hover:underline flex items-center space-x-1"
                    >
                      <span>Launch Premium PDF Viewer</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB: SYSTEM Logs
          ============================================================== */}
      {viewTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100">Live Infrastructure Activity Trail</h3>
              <p className="text-xs text-slate-500">Security monitoring audit feeds</p>
            </div>
            <button
              onClick={onRefreshData}
              className="text-xs text-slate-505 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Refresh feed</span>
            </button>
          </div>

          <div className="p-4 bg-slate-950 text-emerald-400 font-mono text-xs rounded-2xl border border-slate-850 max-h-96 overflow-y-auto space-y-3.5 select-text shadow-inner">
            {logs.length === 0 ? (
              <div className="text-center text-slate-600 py-12">No activity audit trail recordings today.</div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="space-y-1.5 border-b border-slate-800/20 pb-3">
                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                    <span>{log.id} • {new Date(log.timestamp).toLocaleString()}</span>
                    <span className="text-emerald-500/50 uppercase">[{log.userRole}]</span>
                  </div>
                  <p className="text-amber-300 font-bold">{log.action}</p>
                  <p className="text-xs text-slate-300 leading-relaxed font-sans">{log.details}</p>
                  <p className="text-[10px] text-slate-500 text-right">Signed: {log.userName}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==============================================================
          TAB: DISASTER STORAGE INDEX
          ============================================================== */}
      {viewTab === 'backup' && (
        <ImportExportWizard currentUserId={currentUserId} onRefreshData={onRefreshData} />
      )}

      {viewTab === 'services' && (
        <ServicesManager 
          currentUserId={currentUserId} 
          currentUserRole="admin" 
          onRefreshData={onRefreshData} 
        />
      )}

      {viewTab === 'templates' && (
        <div className="space-y-6">
          {/* Sub Tab toggle controls for template design */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl w-fit border border-slate-200/50">
            <button
              onClick={() => setTemplatesSubTab('proposal')}
              className={`flex items-center space-x-2 py-2 px-5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                templatesSubTab === 'proposal'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Design Master Proposal Template</span>
            </button>
            <button
              onClick={() => setTemplatesSubTab('offer')}
              className={`flex items-center space-x-2 py-2 px-5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                templatesSubTab === 'offer'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <span>Design Master Offer Letter Template</span>
            </button>
          </div>

          {templatesSubTab === 'proposal' ? (
            <ProposalTemplateEditor 
              currentUserId={currentUserId} 
              onRefreshData={onRefreshData} 
            />
          ) : (
            <OfferLetterTemplateEditor 
              currentUserId={currentUserId} 
              onRefreshData={onRefreshData} 
            />
          )}
        </div>
      )}

      {/* ==============================================================
          TAB: PAYROLL & INCENTIVE APPROVALS
          ============================================================== */}
      {viewTab === 'payroll' && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Section 1: PENDING INCENTIVE APPROVALS WORKFLOW */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                  Lead Conversion Incentive Approval Pipeline
                </h3>
                <p className="text-xs text-slate-400 font-semibold">Verify employee conversion claims to release payroll credit</p>
              </div>
              <span className="text-[10px] bg-rose-50 dark:bg-rose-950 text-rose-600 px-3 py-1 rounded-full font-bold">
                {leads.filter(l => l.stage === 'Converted' && l.incentiveStatus === 'pending_approval').length} Pending Audits
              </span>
            </div>

            {leads.some(l => l.stage === 'Converted' && l.incentiveStatus === 'pending_approval') ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {leads.filter(l => l.stage === 'Converted' && l.incentiveStatus === 'pending_approval').map(l => {
                  const representative = employees.find(e => e.id === l.assignedTo);
                  const standardIncentive = representative ? (Number(representative.incentivePerConversion) || 500) : 500;
                  return (
                    <div key={l.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3 shadow-xs">
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[9px] text-slate-400">LEAD ID #{l.id}</span>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs truncate max-w-[170px]">{l.customerName}</h4>
                          <p className="text-[10px] text-slate-500 font-semibold">{l.businessName || 'Tax Consultancy Client'}</p>
                        </div>
                        <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-650 px-2.5 py-0.5 rounded-md font-bold">
                          Incentive Pending
                        </span>
                      </div>

                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl space-y-1.5 border border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-550">
                        <div className="flex justify-between">
                          <span>Converted Service:</span>
                          <span className="text-slate-900 dark:text-slate-200">{l.serviceRequired}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Lead Source channel:</span>
                          <span className="text-slate-800 dark:text-slate-300 font-mono">{l.leadSource}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-50 dark:border-slate-850 pt-1.5">
                          <span>Representative Staff:</span>
                          <span className="text-indigo-600 font-bold">{representative ? representative.name : 'Unknown Employee'}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div>
                          <span className="text-[9px] text-slate-400 block font-bold">BONUS RATE</span>
                          <span className="font-mono font-black text-xs text-slate-800 dark:text-slate-200">
                            ₹{(l.incentiveAmount !== undefined ? l.incentiveAmount : standardIncentive).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex space-x-1.5 text-xs">
                          <button
                            type="button"
                            onClick={() => handleRejectIncentive(l.id)}
                            className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 text-rose-600 font-bold hover:text-rose-700 rounded-lg cursor-pointer transition-colors"
                          >
                            Disallow
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveIncentive(l.id, l.incentiveAmount)}
                            className="p-1 px-3 bg-emerald-600 hover:bg-emerald-555 text-white font-bold rounded-lg cursor-pointer transition-colors"
                          >
                            Approve ✔
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 bg-slate-[50]/10 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400 font-bold font-mono">No conversion bonuses awaiting confirmation/approval in the queue.</p>
                <p className="text-[10px] text-slate-450 mt-1">Conversions claimed by associates will reflect here for audits instantly.</p>
              </div>
            )}
          </div>

          {/* Section 2: ATTENDANCE LEDGER, PRINT SLIPS & COMPLIANCE HUD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-101 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
            
            {/* Header with Sub-tabs Selector */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 pb-4 border-b border-slate-101 dark:border-slate-800">
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-slate-850 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                  Staff Wages, Attendance & Compliance Engine
                </h3>
                <p className="text-xs text-slate-450">Track working patterns, review self-marked grace punch actions, clear leaves, and calculate payroll</p>
              </div>

              {/* Inner Subtabs Row */}
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 dark:bg-slate-950 p-1 rounded-2xl border border-slate-200/50 dark:border-slate-850 select-none">
                <button
                  type="button"
                  onClick={() => setPayrollSubTab('calc')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                    payrollSubTab === 'calc'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Calculators Slabs
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollSubTab('history')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                    payrollSubTab === 'history'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Database className="h-4 w-4" />
                  Historical Ledger
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollSubTab('attendance')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                    payrollSubTab === 'attendance'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <Calendar className="h-4 w-4" />
                  Calendar & Audits
                </button>
                <button
                  type="button"
                  onClick={() => setPayrollSubTab('leaves')}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center gap-1.5 ${
                    payrollSubTab === 'leaves'
                      ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  <UserCheck className="h-4 w-4" />
                  Leave Approvals
                  {leaves.filter(l => l.status === 'pending').length > 0 && (
                    <span className="bg-rose-500 text-white rounded-full text-[9px] h-4 w-4 flex items-center justify-center font-bold">
                      {leaves.filter(l => l.status === 'pending').length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Calculations Sub-tab */}
            {payrollSubTab === 'calc' && (
              <div className="space-y-4 animate-fade-in text-xs font-sans">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2">
                  <div className="text-xs text-slate-500 font-semibold">
                    Cycle Range: <span className="text-indigo-600 font-mono font-bold">20th of Prev Month to 20th of Current Month</span> (Delhi, India Time Basis)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 font-mono">Month:</span>
                    <select
                      value={selectedPayrollMonth}
                      onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                      className="p-1 px-2.5 bg-indigo-50 dark:bg-slate-950 border border-indigo-200 dark:border-slate-805 rounded-xl text-xs font-bold text-indigo-700 dark:text-slate-205 focus:outline-none cursor-pointer"
                    >
                      {getPayrollMonths().map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-950/20">
                  <table className="w-full text-left text-xs border-collapse divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950 text-slate-505 text-[10px] uppercase font-bold tracking-wider font-mono">
                        <th className="p-4 px-5">Employee Name & Code</th>
                        <th className="p-4 text-center">Structure Slabs (Salary / Allowances)</th>
                        <th className="p-4 text-center">Cycle Attendance Ratios</th>
                        <th className="p-4 text-right">LOP Deduction</th>
                        <th className="p-4 text-right">Incentives (Approved conversions)</th>
                        <th className="p-4 text-right">Net Remuneration</th>
                        <th className="p-4 text-center">Operations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {employees.map(emp => {
                        // Dynamically calculate actual conversions bonus
                        const approvedConversions = leads.filter(l => 
                          l.assignedTo === emp.id && 
                          l.stage === 'Converted' && 
                          l.incentiveStatus === 'approved' &&
                          (l.incentiveApprovedAt ? matchDateToMonth(l.incentiveApprovedAt) === selectedPayrollMonth : false)
                        );
                        const incentivesEarned = approvedConversions.reduce((sum, l) => sum + (l.incentiveAmount !== undefined ? l.incentiveAmount : (Number(emp.incentivePerConversion) || 500)), 0);
                        
                        const calc = calculateSalaryForCycle(emp, selectedPayrollMonth, incentivesEarned);
                        const basic = Number(emp.salary) || 25000;
                        const allowances = (emp.otherFixedAllowance !== undefined && emp.otherFixedAllowance !== null) 
                          ? Number(emp.otherFixedAllowance) 
                          : 1500;

                        return (
                          <tr key={emp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                            <td className="p-4 px-5">
                              <div className="flex items-center space-x-3">
                                <div className="h-8.5 w-8.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden flex items-center justify-center font-bold text-slate-800 dark:text-slate-103 shrink-0">
                                  {emp.photo ? (
                                    <img src={emp.photo} alt={emp.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    emp.name.charAt(0).toUpperCase()
                                  )}
                                </div>
                                <div className="space-y-0.5">
                                  <span className="font-bold text-slate-850 dark:text-slate-100 block">{emp.name}</span>
                                  <span className="text-[10px] text-slate-400 font-semibold font-mono">{emp.employeeCode} • {emp.role.toUpperCase()}</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-center font-mono">
                              <div className="font-bold text-slate-800 dark:text-slate-200">₹{basic.toLocaleString()}</div>
                              <div className="text-[9px] text-slate-400">Allow: ₹{allowances.toLocaleString()}</div>
                            </td>
                            <td className="p-4 text-center">
                              <div className="space-y-1">
                                <div className="font-semibold text-slate-700 dark:text-slate-300">
                                  Present: <span className="font-bold text-emerald-600 font-mono">{calc.presentDays}d</span> | Sick/Paid: <span className="text-indigo-650 font-mono">{calc.paidLeaves}d</span>
                                </div>
                                <div className="text-[9px] text-slate-400">
                                  Offs: {calc.weekOffs}d | Absent (LOP): <span className="text-rose-500 font-bold">{calc.absentDays}d</span>
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono font-bold text-rose-500">
                              -₹{calc.deduction.toLocaleString()}
                            </td>
                            <td className="p-4 text-right font-mono text-emerald-600 font-bold">
                              +₹{calc.incentiveAmount.toLocaleString()}
                              <span className="text-[9px] text-slate-400 block font-normal font-sans">({approvedConversions.length} cases)</span>
                            </td>
                            <td className="p-4 text-right font-mono font-extrabold text-indigo-650 dark:text-indigo-400">
                              ₹{calc.netSalary.toLocaleString()}
                            </td>
                            <td className="p-4 text-center space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setActiveSlipEmployee(emp)}
                                className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-205 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 font-bold rounded-lg cursor-pointer transition-all"
                              >
                                View / PDF
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleAddHistoricalEntry({
                                    employeeId: emp.id,
                                    employeeName: emp.name,
                                    period: calc.period,
                                    workingDays: 30,
                                    presentDays: calc.presentDays,
                                    weekOffs: calc.weekOffs,
                                    paidLeaves: calc.paidLeaves,
                                    absents: calc.absentDays,
                                    fixedSalary: calc.fixedSalary,
                                    fixedAllowance: calc.fixedAllowance,
                                    incentiveAmount: calc.incentiveAmount,
                                    bonus: 0,
                                    deduction: calc.deduction,
                                    netSalary: calc.netSalary,
                                    remarks: `Auto calculated for cycle ${selectedPayrollMonth}`
                                  });
                                }}
                                className="px-2.5 py-1 text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer transition-all"
                              >
                                Lock Salary Log
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Historical Sub-tab */}
            {payrollSubTab === 'history' && (
              <div className="space-y-6 animate-fade-in text-xs font-sans">
                
                {/* Form to manual add compliance record logs */}
                <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-4">
                  <h4 className="font-extrabold text-indigo-650 dark:text-indigo-400 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                    Record Past Historical Salary Record manually (Legacy Support)
                  </h4>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      
                      const selectedEmp = employees.find(emp => emp.id === String(formData.get('historicalEmp')));
                      if (!selectedEmp) {
                        alert("Select a valid employee");
                        return;
                      }

                      handleAddHistoricalEntry({
                        employeeId: selectedEmp.id,
                        employeeName: selectedEmp.name,
                        period: String(formData.get('period')),
                        workingDays: Number(formData.get('workingDays') || 30),
                        presentDays: Number(formData.get('presentDays') || 0),
                        weekOffs: Number(formData.get('weekOffs') || 0),
                        paidLeaves: Number(formData.get('paidLeaves') || 0),
                        absents: Number(formData.get('absents') || 0),
                        fixedSalary: Number(formData.get('baseSalary') || 0),
                        fixedAllowance: Number(formData.get('allowance') || 0),
                        incentiveAmount: Number(formData.get('incentives') || 0),
                        bonus: Number(formData.get('bonus') || 0),
                        deduction: Number(formData.get('deduction') || 0),
                        netSalary: Number(formData.get('netSalary') || 0),
                        remarks: String(formData.get('remarks') || 'Legacy record bypass')
                      });
                      form.reset();
                    }}
                    className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[10.5px] font-semibold text-slate-655"
                  >
                    <div className="space-y-1">
                      <label className="text-slate-450 uppercase text-[9px] font-bold block">Select Employee *</label>
                      <select name="historicalEmp" required className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeCode})</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-450 uppercase text-[9px] font-bold block">Period Month *</label>
                      <input name="period" required defaultValue={`${selectedPayrollMonth}`} className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-450 uppercase text-[9px] font-bold block">Total Working Days</label>
                      <input type="number" name="workingDays" defaultValue="30" className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-450 uppercase text-[9px] font-bold block">Base Salary Structure</label>
                      <input type="number" name="baseSalary" defaultValue="25000" className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-450 uppercase text-[9px] font-bold block">Allowances Sum</label>
                      <input type="number" name="allowance" defaultValue="5000" className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-450 uppercase text-[9px] font-bold block">Incentives / commissions</label>
                      <input type="number" name="incentives" defaultValue="0" className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-450 uppercase text-[9px] font-bold block">Gross Deductions (₹)</label>
                      <input type="number" name="deduction" defaultValue="0" className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-rose-500 font-bold" />
                    </div>

                    <div className="space-y-1">
                      <label className="text-slate-450 uppercase text-[9px] font-bold block">NET REMUNERATION paid (₹) *</label>
                      <input type="number" name="netSalary" defaultValue="30000" required className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-indigo-650 font-bold" />
                    </div>

                    <input type="hidden" name="presentDays" value="30" />
                    <input type="hidden" name="weekOffs" value="0" />
                    <input type="hidden" name="paidLeaves" value="0" />
                    <input type="hidden" name="absents" value="0" />
                    <input type="hidden" name="bonus" value="0" />

                    <div className="col-span-2 space-y-1">
                      <label className="text-slate-450 uppercase text-[9px] font-bold block">Audit Remarks</label>
                      <input name="remarks" defaultValue="Legacy compliance historical statement entry" className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg" />
                    </div>

                    <div className="col-span-2 flex items-end">
                      <button type="submit" className="w-full p-2 font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all cursor-pointer">
                        + Save Historical Entry Audit
                      </button>
                    </div>
                  </form>
                </div>

                {/* Spreadsheet View of Past Records */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-slate-500 uppercase tracking-wide text-[10px] border-b pb-1.5">
                    Saved Historical Payroll Statements Ledgers
                  </h4>
                  {getHistoricalPayrolls().length === 0 ? (
                    <div className="text-center py-6 text-slate-400 font-mono border border-dashed rounded-xl">
                      No historical payroll logs saved inside digital workspace ledger.
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-101 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                      <table className="w-full text-left text-xs border-collapse divide-y divide-slate-100 dark:divide-slate-805">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-950 text-slate-455 text-[9px] uppercase font-bold tracking-wider font-mono">
                            <th className="p-3">ID Log</th>
                            <th className="p-3">Staff Particular</th>
                            <th className="p-3">Wages Cycle Period</th>
                            <th className="p-3 text-right">Base / Allowance</th>
                            <th className="p-3 text-right">Incentive</th>
                            <th className="p-3 text-right">LOP Deduction</th>
                            <th className="p-3 text-right">Wages Paid</th>
                            <th className="p-3">Audit remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                          {getHistoricalPayrolls().map(entry => (
                            <tr key={entry.id} className="hover:bg-slate-50/20">
                              <td className="p-3 font-mono font-bold text-slate-400">{entry.id}</td>
                              <td className="p-3 font-bold text-slate-850 dark:text-slate-100">{entry.employeeName}</td>
                              <td className="p-3 text-indigo-650 font-mono">{entry.period}</td>
                              <td className="p-3 text-right font-mono">₹{entry.fixedSalary.toLocaleString()} <span className="text-[9px] text-slate-400">/ +₹{entry.fixedAllowance.toLocaleString()}</span></td>
                              <td className="p-3 text-right font-mono text-emerald-600 font-bold">+₹{entry.incentiveAmount.toLocaleString()}</td>
                              <td className="p-3 text-right font-mono text-rose-500">-₹{entry.deduction.toLocaleString()}</td>
                              <td className="p-3 text-right font-mono text-indigo-700 font-black">₹{entry.netSalary.toLocaleString()}</td>
                              <td className="p-3 text-slate-400 italic text-[10px]">{entry.remarks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Attendance Corrections Sub-tab */}
            {payrollSubTab === 'attendance' && (
              <div className="space-y-6 animate-fade-in text-xs font-sans">
                
                {/* Form Section: Core Correction Override Action */}
                <div className="bg-amber-50/20 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/40 p-5 rounded-2xl space-y-4">
                  <div className="flex items-center space-x-2 text-amber-700">
                    <span className="p-1.5 bg-amber-100 rounded-lg"><Clock className="h-4 w-4" /></span>
                    <div>
                      <h4 className="font-extrabold text-[11px] uppercase tracking-wide">Manual Attendance Adjustment Hub</h4>
                      <p className="text-[10px] text-slate-500 font-semibold">Changes made here are permanently audited for regulatory payroll audits.</p>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const form = e.currentTarget;
                      const formData = new FormData(form);
                      
                      const empId = String(formData.get('employeeId'));
                      const date = String(formData.get('date'));
                      const status = String(formData.get('status')) as any;
                      const deductSalary = formData.get('deductSalary') === 'true';
                      const reason = String(formData.get('reason'));
                      const checkIn = String(formData.get('checkIn') || '');
                      const checkOut = String(formData.get('checkOut') || '');

                      handleManualAttendanceCorrection(empId, date, status, reason, deductSalary, checkIn, checkOut);
                      form.reset();
                      setOverrideStatus('Present');
                    }}
                    className="grid grid-cols-2 md:grid-cols-6 gap-3 text-[10px] font-semibold text-slate-550"
                  >
                    <div className="space-y-1">
                      <label className="block text-slate-500 uppercase tracking-wide">Associate Employee *</label>
                      <select name="employeeId" required className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg text-xs">
                        {employees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-slate-500 uppercase tracking-wide">Adjustment Date *</label>
                      <input type="date" name="date" required className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg font-mono text-xs" />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-slate-500 uppercase tracking-wide">Manual Override Status *</label>
                      <select 
                        name="status" 
                        value={overrideStatus}
                        onChange={(e) => setOverrideStatus(e.target.value as any)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg text-xs"
                      >
                        <option value="Present">Present (Checked In)</option>
                        <option value="Absent">Absent (Not present)</option>
                        <option value="Paid Leave">Paid Leave (Approved)</option>
                        <option value="Week Off">Week Off / Sunday</option>
                      </select>
                    </div>

                    {overrideStatus === 'Present' ? (
                      <>
                        <div className="space-y-1">
                          <label className="block text-indigo-600 font-bold uppercase tracking-wide">In Time (Check-In) *</label>
                          <input type="time" name="checkIn" defaultValue="09:30" required className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg font-mono text-xs" />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-indigo-600 font-bold uppercase tracking-wide">Out Time (Check-Out) *</label>
                          <input type="time" name="checkOut" defaultValue="18:30" required className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg font-mono text-xs" />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="space-y-1 col-span-2">
                          <label className="block text-slate-500 uppercase tracking-wide">Salary deduction (LOP)?</label>
                          <select name="deductSalary" className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-805 rounded-lg text-xs">
                            <option value="false">No (Calculate as working pay)</option>
                            <option value="true">Yes (Deduct daily wage rate due to LOP)</option>
                          </select>
                        </div>
                      </>
                    )}

                    <div className="flex items-end">
                      <button type="submit" className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg transition-colors cursor-pointer text-xs">
                        Override & log
                      </button>
                    </div>

                    <div className="col-span-2 md:col-span-6 space-y-1">
                      <label className="block text-slate-500 uppercase tracking-wide">Adjustment Justification / Audit Reason Statement *</label>
                      <input name="reason" placeholder="e.g. Employee forgot to punch out due to late filing compliance rush..." required className="w-full p-2 bg-white dark:bg-slate-905 border border-slate-202 dark:border-slate-805 rounded-lg text-xs" />
                    </div>
                  </form>
                </div>

                {/* Staff Attendance Calendar Directory for View and Modification */}
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 gap-2">
                    <div className="flex items-center space-x-2 text-indigo-650">
                      <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-lg"><Calendar className="h-4 w-4 text-indigo-600" /></span>
                      <div>
                        <h4 className="font-extrabold text-[11px] uppercase tracking-wide text-slate-800 dark:text-slate-100">📅 Staff Attendance Calendar Directory</h4>
                        <p className="text-[10px] text-slate-500 font-semibold">Select an associate below to view their daily calendar details, print report or perform direct calendar modifications.</p>
                      </div>
                    </div>
                    {/* Period selection dropdown */}
                    <div className="flex items-center space-x-2 shrink-0">
                      <label className="text-[10px] uppercase font-bold text-slate-400">Selected Cycle:</label>
                      <select
                        value={selectedPayrollMonth}
                        onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                        className="p-1.5 bg-slate-50 border rounded-lg text-xs font-mono font-bold"
                      >
                        {getPayrollMonths().map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {employees.map(emp => {
                      const range = getCycleDateRangeForMonth(selectedPayrollMonth);
                      const metrics = getAttendanceMetricsForCycle(emp.id, selectedPayrollMonth);
                      return (
                        <div key={emp.id} className="p-3.5 bg-slate-50 dark:bg-slate-950/50 border border-slate-150 dark:border-slate-850 rounded-2xl flex flex-col justify-between hover:border-indigo-300 transition-all space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-extrabold text-[12px] text-slate-900 dark:text-slate-100">{emp.name}</div>
                              <div className="text-[9.5px] font-mono text-slate-400 uppercase font-bold tracking-wide mt-0.5">{emp.employeeCode || 'EFG-REC-001'} • {emp.designation || 'Specialist'}</div>
                            </div>
                            <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wide">
                              {emp.role}
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9px] font-black border-t border-b border-slate-100 dark:border-slate-800 py-1.5 my-1 bg-white dark:bg-slate-900 rounded-lg">
                            <div className="text-emerald-700">
                              <span className="block text-[8px] text-slate-400 uppercase font-sans font-extrabold">Pres</span>
                              <span>{metrics.presentDays}d</span>
                            </div>
                            <div className="text-rose-650">
                              <span className="block text-[8px] text-slate-400 uppercase font-sans font-extrabold">Abs</span>
                              <span>{metrics.absentDays}d</span>
                            </div>
                            <div className="text-blue-655">
                              <span className="block text-[8px] text-slate-400 uppercase font-sans font-extrabold">W/Off</span>
                              <span>{metrics.weekOffDays}d</span>
                            </div>
                            <div className="text-amber-700">
                              <span className="block text-[8px] text-slate-400 uppercase font-sans font-extrabold">PaidLv</span>
                              <span>{metrics.paidLeaveDays}d</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedCalendarEmployee(emp)}
                            className="w-full mt-1 py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10.5px] rounded-xl flex items-center justify-center space-x-1.5 cursor-pointer hover:shadow-xs active:scale-95 transition-all"
                          >
                            <Calendar className="h-3.5 w-3.5 shrink-0" />
                            <span>Calendar View / Edit</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit logs listing */}
                <div className="space-y-4">
                  <h4 className="font-extrabold text-slate-500 uppercase tracking-wide text-[10px] border-b pb-1.5 flex items-center justify-between">
                    <span>Attendance Correction Compliance Audit Trails Logs</span>
                    <span className="text-[9px] bg-slate-100 font-mono px-2 py-0.5 rounded text-slate-500">Live feed</span>
                  </h4>
                  {getAttendanceAudits().length === 0 ? (
                    <div className="text-center py-6 text-slate-400 font-mono border border-dashed rounded-xl">
                      No correction audit events recorded in database yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                        <table className="w-full text-left text-xs border-collapse divide-y divide-slate-100 dark:divide-slate-800">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-slate-950 text-slate-455 text-[9px] uppercase font-bold tracking-wider font-mono">
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Staff Particular</th>
                              <th className="p-2.5">Adjustment changed field</th>
                              <th className="p-2.5 text-center">Previous status</th>
                              <th className="p-2.5 text-center">New audited status</th>
                              <th className="p-2.5">Auditor metadata</th>
                              <th className="p-2.5">Adjustment Compliance justification</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium font-sans">
                            {(() => {
                              const sortedAudits = [...getAttendanceAudits()].sort((a, b) => {
                                return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
                              });
                              const displayedAudits = showAllAudits ? sortedAudits : sortedAudits.slice(0, 5);
                              return displayedAudits.map(audit => (
                                <tr key={audit.id} className="hover:bg-slate-50/30">
                                  <td className="p-2.5 font-mono text-[9px] text-indigo-655">{audit.date}</td>
                                  <td className="p-2.5 font-bold text-slate-800 dark:text-slate-100">{audit.employeeName}</td>
                                  <td className="p-2.5 text-slate-500 font-mono text-[10px]">{audit.field}</td>
                                  <td className="p-2.5 text-center"><span className="bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">{audit.oldValue}</span></td>
                                  <td className="p-2.5 text-center"><span className="bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">{audit.newValue}</span></td>
                                  <td className="p-2.5 text-slate-450 text-[10px]">{audit.modifiedByName} at <span className="font-mono text-[9px]">{audit.timestamp.slice(0, 10)}</span></td>
                                  <td className="p-2.5 italic text-[10px] text-amber-700/90">{audit.reason}</td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>

                      {getAttendanceAudits().length > 5 && (
                        <div className="flex justify-center pt-1 pb-1">
                          <button
                            type="button"
                            onClick={() => setShowAllAudits(!showAllAudits)}
                            className="px-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-slate-950 dark:hover:bg-slate-850 dark:text-slate-350 font-extrabold rounded-xl text-[10.5px] uppercase tracking-wider transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ring-1 ring-indigo-500/10"
                          >
                            {showAllAudits ? 'Show Less Audits ⬆️' : `View More Audits (${getAttendanceAudits().length - 5} items) ⬇️`}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* Leave Approvals pipeline Sub-tab */}
            {payrollSubTab === 'leaves' && (
              <div className="space-y-4 animate-fade-in text-xs font-sans">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="font-extrabold text-slate-500 uppercase tracking-wide text-[10px]">
                    Internal Leave Request Pipeline
                  </h4>
                  <span className="text-[9.5px] text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-955 px-2.5 py-0.5 rounded-full font-mono">
                    {leaves.length} Total Registered solicitude logs
                  </span>
                </div>

                {leaves.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50/40 dark:bg-slate-950/20 border border-dashed text-slate-400 font-mono rounded-xl">
                    No active leave requests filed by associates.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {leaves.map((l) => {
                      const daysCount = Math.round((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / (1000 * 3600 * 24)) + 1;
                      
                      // Calculate previous leaves taken dynamically from attendance calendar
                      const empAttendances = getAttendances().filter(a => a.employeeId === l.employeeId);
                      
                      // Filter down ONLY to actual approved leave records (and exclude auto-LOP elements)
                      const approvedLeavesAttendances = empAttendances.filter(a => 
                        a.status === 'Paid Leave' || (a.status === 'Absent' && a.reasonForChange && a.reasonForChange.includes('Approved Leave request'))
                      );

                      // Categorize by "This Month" vs "All-Time Approved"
                      const leaveMonth = matchDateToMonth(l.startDate);
                      const leavesThisMonth = approvedLeavesAttendances.filter(a => matchDateToMonth(a.date) === leaveMonth);
                      
                      const thisMonthPaid = leavesThisMonth.filter(a => a.status === 'Paid Leave').length;
                      const thisMonthUnpaid = leavesThisMonth.filter(a => a.status === 'Absent').length;
                      const totalThisMonth = thisMonthPaid + thisMonthUnpaid;

                      const allTimePaid = approvedLeavesAttendances.filter(a => a.status === 'Paid Leave').length;
                      const allTimeUnpaid = approvedLeavesAttendances.filter(a => a.status === 'Absent').length;
                      const totalAllTime = allTimePaid + allTimeUnpaid;

                      const selectedMode = leaveApprovalType[l.id] || (l.leaveType === 'unpaid' ? 'unpaid' : 'paid');

                      return (
                        <div key={l.id} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-850 rounded-2xl relative space-y-3 flex flex-col justify-between shadow-xs hover:shadow-sm transition-shadow">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <span className="font-extrabold text-[10.5px] text-indigo-750 uppercase tracking-wide">{l.employeeName}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                                l.status === 'pending'
                                  ? 'bg-amber-50 text-amber-600 animate-pulse'
                                  : l.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-rose-50 text-rose-600'
                              }`}>
                                {l.status.toUpperCase()}
                              </span>
                            </div>

                            <p className="text-[10px] font-semibold text-slate-550 italic bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-805 rounded-xl p-2.5 shadow-xs">
                              &ldquo;{l.reason}&rdquo;
                            </p>

                            <div className="space-y-1 text-[10px] font-semibold text-slate-500">
                              <div className="flex justify-between">
                                <span>Leave Type:</span>
                                <span className="text-slate-800 dark:text-slate-200 capitalize font-bold">{l.leaveType}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Period Range:</span>
                                <span className="font-mono text-slate-800 font-semibold">{l.startDate} to {l.endDate}</span>
                              </div>
                              <div className="flex justify-between">
                                  <span>Duration:</span>
                                  <span className="bg-slate-200/50 dark:bg-slate-800 text-slate-700 font-bold font-mono px-1.5 py-0.2 rounded">{daysCount} days</span>
                              </div>

                              {/* Previous leaves taken section */}
                              <div className="flex flex-col gap-1 pt-1.5 mt-1.5 border-t border-dashed border-slate-200 dark:border-slate-800 text-[9.5px]">
                                <span className="text-slate-400 uppercase font-bold text-[8px] tracking-wider">Attendance Calendar Summary:</span>
                                
                                <div className="space-y-1">
                                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300">
                                    <span>This Month ({leaveMonth}):</span>
                                    <span>{totalThisMonth} days</span>
                                  </div>
                                  <div className="flex justify-between text-slate-400 text-[8.5px] font-mono leading-none pl-1">
                                    <span>• Paid: {thisMonthPaid}</span>
                                    <span>• Unpaid: {thisMonthUnpaid}</span>
                                  </div>

                                  <div className="flex justify-between font-bold text-slate-700 dark:text-slate-300 pt-0.5">
                                    <span>All-Time Approved:</span>
                                    <span>{totalAllTime} days</span>
                                  </div>
                                  <div className="flex justify-between text-slate-400 text-[8.5px] font-mono leading-none pl-1">
                                    <span>• Paid: {allTimePaid}</span>
                                    <span>• Unpaid: {allTimeUnpaid}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {l.status === 'approved' && (
                            <div className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 text-emerald-600/10 p-1.5 rounded-xl text-center">
                              Approved as: <span className="uppercase">{l.paymentType || (l.leaveType === 'unpaid' ? 'unpaid' : 'paid')} Leave</span>
                            </div>
                          )}

                          {l.status === 'pending' && (
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-805">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Leave Billing Mode:</label>
                                <select
                                  value={selectedMode}
                                  onChange={(e) => setLeaveApprovalType({ ...leaveApprovalType, [l.id]: e.target.value as 'paid' | 'unpaid' })}
                                  className="w-full text-[11px] p-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg font-bold text-slate-750 dark:text-slate-300 cursor-pointer pointer-events-auto"
                                >
                                  <option value="paid">Paid (No Deduction)</option>
                                  <option value="unpaid">Unpaid (Salary Deduct)</option>
                                </select>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateLeaveRequest(l.id, 'rejected')}
                                  className="w-1/2 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg cursor-pointer text-xs"
                                >
                                  Disallow
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateLeaveRequest(l.id, 'approved', selectedMode)}
                                  className="w-1/2 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-xs flex items-center justify-center gap-1"
                                >
                                  Approve {selectedMode === 'paid' ? 'Paid' : 'Unpaid'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Monthly Slip Preview Overlay Modal */}
          {activeSlipEmployee && (
            <div className="fixed inset-0 bg-slate-[950]/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-xs font-sans">
              <div className="bg-white text-slate-900 p-6 rounded-3xl w-full max-w-2xl border border-slate-200 shadow-2xl relative space-y-6">
                
                <div className="flex justify-between items-start border-b border-slate-150 pb-4">
                  <div>
                    <h2 className="text-indigo-650 font-black tracking-widest text-[9px] uppercase font-mono">EFILINGG SYSTEM COMPILER</h2>
                    <span className="font-extrabold text-[14px]">Wages Remittance Slip Generator</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSlipEmployee(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                  >
                    Close Dialog
                  </button>
                </div>

                <div className="border border-slate-200 p-5 rounded-2xl bg-slate-50 space-y-5 text-[11px] leading-relaxed">
                  <div className="text-center font-serif border-b border-slate-200 pb-3">
                    <h3 className="font-black text-xs text-slate-900">EFILINGG FINANCIAL SERVICES PRIVATE LIMITED</h3>
                    <p className="text-[9px] text-slate-500 lowercase mt-0.5">direct board helplines: 011-45768289, 9217666839 | info: efilingghelpdesk@gmail.com</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 font-semibold text-slate-600">
                    <div className="space-y-1">
                      <div>Employee Code ID: <span className="text-slate-905">{activeSlipEmployee.employeeCode}</span></div>
                      <div>Staff Associate: <span className="text-slate-905 font-bold">{activeSlipEmployee.name}</span></div>
                      <div>Primary Designation Area: <span className="text-slate-905">{activeSlipEmployee.designation || 'Compliance Representative'}</span></div>
                    </div>
                    <div className="space-y-1">
                      <div>Payroll Period Month: <span className="text-indigo-600 font-bold">{selectedPayrollMonth}</span></div>
                      <div>Corporate Mail Address: <span className="text-slate-905 font-mono">{activeSlipEmployee.email}</span></div>
                      <div>Days Presence locked: <span className="text-slate-905 font-bold">{tempDays[activeSlipEmployee.id] !== undefined ? tempDays[activeSlipEmployee.id] : Math.max(0, 30 - getAttendanceMetricsForCycle(activeSlipEmployee.id, selectedPayrollMonth).deductionDays)} / 30 Days</span></div>
                    </div>
                  </div>

                  {(() => {
                    const baseS = Number(activeSlipEmployee.salary) || 25000;
                    const otherS = (activeSlipEmployee.otherFixedAllowance !== undefined && activeSlipEmployee.otherFixedAllowance !== null) 
                      ? Number(activeSlipEmployee.otherFixedAllowance) 
                      : 1500;
                    const activeDays = tempDays[activeSlipEmployee.id] !== undefined 
                      ? tempDays[activeSlipEmployee.id] 
                      : Math.max(0, 30 - getAttendanceMetricsForCycle(activeSlipEmployee.id, selectedPayrollMonth).deductionDays);
                    
                    const ratioS = activeDays / 30;
                    const eBasic = Math.round(baseS * ratioS);
                    const eOther = Math.round(otherS * ratioS);
                    
                    const approvedConvs = leads.filter(l => 
                      l.assignedTo === activeSlipEmployee.id && 
                      l.stage === 'Converted' && 
                      l.incentiveStatus === 'approved' &&
                      (l.incentiveApprovedAt ? matchDateToMonth(l.incentiveApprovedAt) === selectedPayrollMonth : false)
                    );
                    const eIncentive = approvedConvs.reduce((sum, l) => sum + (l.incentiveAmount !== undefined ? l.incentiveAmount : (Number(activeSlipEmployee.incentivePerConversion) || 500)), 0);
                    
                    const totalSalarySum = eBasic + eOther + eIncentive;

                    return (
                      <div className="space-y-3.5 pt-2">
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="grid grid-cols-3 bg-slate-100 p-2 font-bold text-slate-655 border-b border-slate-200">
                            <span>Wages Component</span>
                            <span className="text-center">Fixed Rate Monthly Slab</span>
                            <span className="text-right">Pro-Rata Actual Earned</span>
                          </div>
                          <div className="divide-y divide-slate-150 px-2.5">
                            <div className="grid grid-cols-3 py-2 font-medium">
                              <span>Regular Basic Base Salary</span>
                              <span className="text-center font-mono">₹{baseS.toLocaleString()}</span>
                              <span className="text-right font-mono font-bold">₹{eBasic.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-3 py-2 font-medium">
                              <span>Other Fixed allowances</span>
                              <span className="text-center font-mono">₹{otherS.toLocaleString()}</span>
                              <span className="text-right font-mono font-bold">₹{eOther.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-3 py-2 font-medium text-indigo-700">
                              <span>Approved Conversion incentives ({approvedConvs.length} cases)</span>
                              <span className="text-center italic text-slate-400">Dynamic</span>
                              <span className="text-right font-mono font-extrabold text-emerald-600">+₹{eIncentive.toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-3 py-2.5 bg-slate-100/60 font-black border-t border-slate-250 text-slate-900">
                              <span>NET REMUNERATION SCALE:</span>
                              <span className="text-center italic text-slate-400 font-semibold">ProRata Ratio: {Math.round(ratioS*100)}%</span>
                              <span className="text-right font-mono text-indigo-650">₹{totalSalarySum.toLocaleString()}</span>
                            </div>
                          </div>
                        </div>

                        {approvedConvs.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Audit conversion bonuses:</span>
                            <div className="max-h-24 overflow-y-auto pr-1 text-[9.5px] space-y-1.5">
                              {approvedConvs.map(l => (
                                <div key={l.id} className="p-1.5 bg-slate-100/50 rounded-lg flex justify-between">
                                  <span>Client Case: <span className="font-bold">{l.customerName}</span> ({l.serviceRequired})</span>
                                  <span className="font-mono text-emerald-600 font-bold">+₹{(l.incentiveAmount !== undefined ? l.incentiveAmount : 500).toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="flex justify-between text-[8px] text-slate-450 border-t border-slate-200 pt-3 select-none">
                          <span>* Statement invoice generated under cryptographic authorization profile *</span>
                          <span>Authorized Signatory Stamp Area • EFS LTD</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="flex justify-end gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setActiveSlipEmployee(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl cursor-pointer"
                  >
                    Close Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const emp = activeSlipEmployee;
                      const activeDays = tempDays[emp.id] !== undefined 
                        ? tempDays[emp.id] 
                        : Math.max(0, 30 - getAttendanceMetricsForCycle(emp.id, selectedPayrollMonth).deductionDays);
                      const baseS = Number(emp.salary) || 25000;
                      const otherS = (emp.otherFixedAllowance !== undefined && emp.otherFixedAllowance !== null) 
                        ? Number(emp.otherFixedAllowance) 
                        : 1500;
                      const ratioS = activeDays / 30;
                      
                      const eBasic = Math.round(baseS * ratioS);
                      const eOther = Math.round(otherS * ratioS);
                      
                      const approvedConvs = leads.filter(l => 
                        l.assignedTo === emp.id && 
                        l.stage === 'Converted' && 
                        l.incentiveStatus === 'approved' &&
                        (l.incentiveApprovedAt ? matchDateToMonth(l.incentiveApprovedAt) === selectedPayrollMonth : false)
                      );
                      const eIncentive = approvedConvs.reduce((sum, l) => sum + (l.incentiveAmount !== undefined ? l.incentiveAmount : (Number(emp.incentivePerConversion) || 500)), 0);
                      const totalSalarySum = eBasic + eOther + eIncentive;

                      const slipWindow = window.open('', '_blank');
                      if (!slipWindow) return;

                      let conversionLinesCode = '';
                      if (approvedConvs.length > 0) {
                        conversionLinesCode = `
                          <div style="margin-top:20px; border-top:1.5px dashed #cbd5e1; padding-top:10px;">
                            <span style="font-[10px]; font-weight:800; color:#64748b; tracking-wider:0.5px; text-transform:uppercase;">CREDITED CASE LEVEL COMMISSION LOGS</span>
                            ${approvedConvs.map(l => `
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
                            <title>Wages Payslip - ${emp.name}</title>
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
                          <body onload="window.print(); window.close();">
                            <div class="slip-card">
                              <div class="official-header">
                                <h1>EFILINGG FINANCIAL SERVICES PRIVATE LIMITED</h1>
                                <h2>REG BOARD HELPLINES: 011-45768289, 9217666839 | MAIL: efilingghelpdesk@gmail.com</h2>
                              </div>
                              <div class="title-box">OFFICIAL COMPLIANCE MONTHLY PAYROLL STATEMENT - ${selectedPayrollMonth.toUpperCase()}</div>
                              <div class="meta-section">
                                <div>
                                  <div class="meta-item"><span class="meta-label">Employee Code:</span><span class="meta-val">${emp.employeeCode}</span></div>
                                  <div class="meta-item"><span class="meta-label">Full Name:</span><span class="meta-val">${emp.name}</span></div>
                                  <div class="meta-item"><span class="meta-label">Designation:</span><span class="meta-val">${emp.designation || 'Compliance Officer'}</span></div>
                                </div>
                                <div>
                                  <div class="meta-item"><span class="meta-label">Payroll Period:</span><span class="meta-val" style="color:#4f46e5; font-weight:bold;">${selectedPayrollMonth}</span></div>
                                  <div class="meta-item"><span class="meta-label">Attendance Locking:</span><span class="meta-val">${activeDays} / 30 Days</span></div>
                                  <div class="meta-item"><span class="meta-label">Remitted On Date:</span><span class="meta-val">${new Date().toISOString().split('T')[0]}</span></div>
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
                                    <td style="text-align:right; font-family:monospace;">₹${baseS.toLocaleString()}</td>
                                    <td style="text-align:right; font-family:monospace; font-weight:bold;">₹${eBasic.toLocaleString()}</td>
                                  </tr>
                                  <tr>
                                    <td>Other General allowances Slabs</td>
                                    <td style="text-align:right; font-family:monospace;">₹${otherS.toLocaleString()}</td>
                                    <td style="text-align:right; font-family:monospace; font-weight:bold;">₹${eOther.toLocaleString()}</td>
                                  </tr>
                                  <tr>
                                    <td style="color:#4f46e5; font-weight:bold;">Approved Conversion commission bonuses (${approvedConvs.length} cases)</td>
                                    <td style="text-align:right; color:#94a3b8; font-style:italic;">Dynamic tally</td>
                                    <td style="text-align:right; font-family:monospace; font-weight:bold; color:#16a34a;">+₹${eIncentive.toLocaleString()}</td>
                                  </tr>
                                  <tr class="total-row">
                                    <td>SUM BRACKET GROSS MONTH WAGES:</td>
                                    <td style="text-align:right; font-family:monospace;">₹${(baseS+otherS).toLocaleString()}</td>
                                    <td style="text-align:right; font-family:monospace; color:#4f46e5; font-size:13px; font-weight:900;">₹${totalSalarySum.toLocaleString()}</td>
                                  </tr>
                                </tbody>
                              </table>
                              \${conversionLinesCode}
                              <div class="footer-sig-block">
                                <div>* Authenticated statement printed by Master Admin. Validated digitally.</div>
                                <div class="sig-placeholder">Authorized Director Stamp Signatory<br/>EFILINGG FINANCIAL SERVICES PVT LTD</div>
                              </div>
                            </div>
                          </body>
                        </html>
                      `);
                      slipWindow.document.close();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-555 text-white rounded-xl shadow-md cursor-pointer"
                  >
                    Print Payslip Statement PDF
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      )}

      {viewTab === 'my_attendance' && isTeamLeader && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl relative overflow-hidden bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950">
            <div className="absolute right-0 top-0 h-40 w-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="space-y-2 max-w-2xl relative z-10">
              <span className="text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 font-bold px-2.5 py-1 rounded-full tracking-wider">
                My Attendance Control Workspace
              </span>
              <h2 className="text-xl font-black uppercase tracking-tight text-white">
                Personal Shift Duty terminal
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                As a Team Leader, you are strictly required to punch in and punch out for daily active duties on your terminal. However, you can manually override and edit your historical attendance calendar here directly at any time. Changes take effect instantly without requiring further Master Admin approval.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Punch Card */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-850 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center space-x-2 border-b border-slate-100 dark:border-slate-805 pb-3">
                <Clock className="h-5 w-5 text-indigo-505" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                  Today's Punch Terminal
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-bold">Duty Date:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {tlTodayStr}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-bold">Current System Time:</span>
                  <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                    {tlCurrentTimeStr}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-450 font-bold">Current Duty Status:</span>
                  <span>
                    {tlTodayRecord?.checkIn ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md font-bold">
                        {tlTodayRecord?.checkOut ? 'Duty Session Completed' : 'Active Duty Session'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-md font-bold">
                        Awaiting Check-In
                      </span>
                    )}
                  </span>
                </div>

                {tlTodayRecord?.checkIn && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-950 border rounded-xl text-xs space-y-1 font-mono text-slate-505">
                    <div className="flex justify-between">
                      <span>✓ In-Punch Registered:</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{tlTodayRecord.checkIn}</span>
                    </div>
                    {tlTodayRecord.checkOut && (
                      <div className="flex justify-between">
                        <span>✓ Out-Punch Registered:</span>
                        <span className="font-bold text-slate-705 dark:text-slate-300">{tlTodayRecord.checkOut}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Auto Absent Caution */}
                {((tlTodayRecord?.status === 'Absent' && tlTodayRecord?.bySystem) || (tlCurrentTimeStr >= '11:00' && !tlTodayRecord?.checkIn)) && (
                  <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/30 text-rose-650 dark:text-rose-455 rounded-xl space-y-1 text-[10.5px]">
                    <span className="font-bold block">⚠️ Present punch window (before 11:30 AM) missed.</span>
                    <p className="leading-tight font-medium">
                      Automatically registered as ABSENT. However, you can write a justification override below to correct it yourself instantly!
                    </p>
                  </div>
                )}

                {/* Row of Punch Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleTlInPunch}
                    disabled={!!tlTodayRecord?.checkIn || tlCurrentTimeStr >= '11:30' || (tlTodayRecord?.status === 'Absent' && tlTodayRecord?.bySystem)}
                    className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                      tlTodayRecord?.checkIn
                        ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                        : tlCurrentTimeStr >= '11:30' || (tlTodayRecord?.status === 'Absent' && tlTodayRecord?.bySystem)
                        ? 'bg-slate-55 border border-slate-200 text-slate-350 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-xs hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <Clock className="h-4.5 w-4.5 shrink-0" />
                    <span>In (Punch)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTlOutPunch}
                    disabled={!tlTodayRecord?.checkIn || !!tlTodayRecord?.checkOut || tlCurrentTimeStr >= '18:30' || (tlTodayRecord?.status === 'Absent' && tlTodayRecord?.bySystem)}
                    className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all ${
                      tlTodayRecord?.checkOut
                        ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                        : (!tlTodayRecord?.checkIn || tlCurrentTimeStr >= '18:30' || (tlTodayRecord?.status === 'Absent' && tlTodayRecord?.bySystem))
                        ? 'bg-slate-55 border border-slate-100 text-slate-355 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-750 text-white cursor-pointer hover:shadow-xs hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                  >
                    <Clock className="h-4.5 w-4.5 shrink-0" />
                    <span>Out (Punch)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Calculations & Month Selection */}
            <div className="p-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-805 pb-3">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-indigo-505" />
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                    Tally & Period Selector
                  </h3>
                </div>
                <select
                  value={tlSelectedPeriod}
                  onChange={(e) => {
                    setTlSelectedPeriod(e.target.value);
                    setTlActiveEditDate(null);
                  }}
                  className="p-1 px-2 text-xs font-bold border rounded-lg bg-slate-50 dark:bg-slate-950 dark:border-slate-850 text-slate-700 dark:text-slate-305 cursor-pointer"
                >
                  {getPayrollMonths().map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100/30 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Present Days</span>
                  <span className="block text-xl font-black text-emerald-600 font-mono mt-0.5">
                    {tlMetrics.presentDays} Days
                  </span>
                </div>
                <div className="p-3 bg-rose-50/40 dark:bg-rose-950/10 border border-rose-100/30 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Absent (LOP)</span>
                  <span className="block text-xl font-black text-rose-600 font-mono mt-0.5">
                    {tlMetrics.absentDays} Days
                  </span>
                </div>
                <div className="p-3 bg-amber-50/40 dark:bg-amber-950/10 border border-amber-100/30 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-455 tracking-wider">Paid Leaves</span>
                  <span className="block text-xl font-black text-amber-500 font-mono mt-0.5">
                    {tlMetrics.paidLeaveDays} Days
                  </span>
                </div>
                <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/10 border border-indigo-100/30 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-450 tracking-wider">Week Offs</span>
                  <span className="block text-xl font-black text-indigo-500 font-mono mt-0.5">
                    {tlMetrics.weekOffDays} Days
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Inline Edit form */}
          {tlActiveEditDate && (
            <div className="p-5 bg-amber-50/30 dark:bg-slate-950/40 border border-amber-250 dark:border-amber-900 rounded-2xl space-y-4 animate-fade-in text-xs font-semibold">
              <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
                <span className="font-extrabold text-amber-805 dark:text-amber-400 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                  ✍️ Direct Adjustment Worksheet: {tlActiveEditDate}
                </span>
                <button 
                  onClick={() => setTlActiveEditDate(null)}
                  className="text-slate-450 hover:text-rose-600 text-[11px] font-bold cursor-pointer transition-colors"
                >
                  Cancel Direct Edit
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-450 uppercase tracking-wide text-[9px] font-bold">Override Status *</label>
                  <select
                    value={tlEditStatus}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setTlEditStatus(val);
                      if (val === 'Absent') {
                        setTlEditDeduct(true);
                      } else {
                        setTlEditDeduct(false);
                      }
                    }}
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold shadow-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Present">Present (Shift Duty)</option>
                    <option value="Absent">Absent (LOP)</option>
                    <option value="Paid Leave">Paid Leave / Approved</option>
                    <option value="Week Off">Week Off / Sunday</option>
                  </select>
                </div>

                {tlEditStatus === 'Present' ? (
                  <>
                    <div className="space-y-1">
                      <label className="block text-indigo-650 dark:text-indigo-400 font-bold uppercase tracking-wide text-[9px] font-bold">Duty In Time (HH:MM) *</label>
                      <input 
                        type="time" 
                        value={tlEditCheckIn} 
                        onChange={(e) => setTlEditCheckIn(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-mono text-xs shadow-xs focus:ring-1 focus:ring-indigo-550" 
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-indigo-655 dark:text-indigo-400 font-bold uppercase tracking-wide text-[9px] font-bold">Duty Out Time (HH:MM) *</label>
                      <input 
                        type="time" 
                        value={tlEditCheckOut} 
                        onChange={(e) => setTlEditCheckOut(e.target.value)}
                        className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl font-mono text-xs shadow-xs focus:ring-1 focus:ring-indigo-550" 
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1">
                    <label className="block text-slate-450 uppercase tracking-wide text-[9px] font-bold">Deduct Salary (LOP)?</label>
                    <select 
                      value={String(tlEditDeduct)} 
                      onChange={(e) => setTlEditDeduct(e.target.value === 'true')}
                      className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold shadow-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="false">No Deduction (Working Pay)</option>
                      <option value="true">Yes Deduction (Unpaid Absence)</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="block text-slate-450 uppercase tracking-wide text-[9px] font-bold">Direct Adjustment Reason *</label>
                  <input 
                    type="text"
                    value={tlEditReason}
                    onChange={(e) => setTlEditReason(e.target.value)}
                    placeholder="Provide professional reason..."
                    className="w-full p-2.5 bg-white dark:bg-slate-900 border rounded-xl text-xs font-bold shadow-xs focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button 
                  type="button" 
                  onClick={handleTlSaveEdit}
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl cursor-pointer text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
                >
                  Save Direct Adjustment ✍
                </button>
              </div>
            </div>
          )}

          {/* Interactive Calendar Register Map */}
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-855 rounded-3xl shadow-xs space-y-4 font-sans">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-805 pb-3">
              <div>
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 uppercase tracking-wider font-mono">
                  Calendar Register Map
                </h3>
                <p className="text-[10px] text-slate-450 mt-0.5">
                  Selected period: <strong className="text-indigo-600">{tlCycleRange?.start} to {tlCycleRange?.end}</strong>. Click any historical card below to adjust status directly without master authorization.
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2 text-[8px] font-black tracking-wide uppercase font-mono">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-emerald-500" /> Present</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-sky-500" /> Week Off</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-amber-500" /> Paid Leave</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded bg-rose-500" /> Absent (LOP)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3.5 pt-2">
              {tlCycleDates.map(dateStr => {
                const d = getTlSelfDateStatusDetails(dateStr);
                
                // formatDateLabel manually
                const parts = dateStr.split('-');
                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const shortMonth = parts.length === 3 ? monthNames[parseInt(parts[1], 10) - 1] : '';
                const dayNum = parts.length === 3 ? parts[2] : '0';
                
                const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(dayNum, 10));
                const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dateObj.getDay()];

                const isFuture = dateStr > tlTodayStr;
                
                let cardBg = "bg-slate-50 dark:bg-slate-950 border-slate-205 cursor-pointer";
                let tagColor = "bg-slate-100 text-slate-500";
                
                if (isFuture) {
                  cardBg = "bg-slate-100/40 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed";
                  tagColor = "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
                } else if (d.status === 'Present') {
                  cardBg = "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-250 cursor-pointer";
                  tagColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-905 dark:text-emerald-305";
                } else if (d.status === 'Week Off') {
                  cardBg = "bg-sky-50/40 dark:bg-sky-955/15 border-sky-200 cursor-pointer";
                  tagColor = "bg-sky-100 text-sky-800 dark:bg-sky-955 dark:text-sky-305";
                } else if (d.status === 'Paid Leave') {
                  cardBg = "bg-amber-50/40 dark:bg-amber-955/15 border-amber-250 cursor-pointer";
                  tagColor = "bg-amber-100 text-amber-800 dark:bg-amber-905 dark:text-amber-305";
                } else if (d.status === 'Absent') {
                  cardBg = "bg-rose-50/40 dark:bg-rose-955/10 border-rose-250 cursor-pointer";
                  tagColor = "bg-rose-100 text-rose-805 dark:bg-rose-955 dark:text-rose-305";
                } else {
                  cardBg = "bg-slate-100/70 dark:bg-slate-900/40 border-slate-205";
                  tagColor = "bg-slate-200 text-slate-600";
                }

                return (
                  <div 
                    key={dateStr}
                    onClick={() => {
                      if (isFuture) {
                        alert("Attendance Calendar Lock: Future dates are completely locked for editing. You cannot mark absent, present, leave, etc. for future dates.");
                        return;
                      }
                      handleTlEditClick(dateStr);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 h-26 text-[10.5px] font-semibold transition-all ${isFuture ? '' : 'hover:shadow-xs group hover:scale-[1.02] active:scale-95'} ${cardBg} ${tlActiveEditDate === dateStr ? 'ring-2 ring-amber-500' : ''}`}
                    title={isFuture ? "Attendance editing locked for future dates" : "Click to adjust this day's attendance directly"}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <span className="block text-[8px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">{shortMonth} {dayName}</span>
                        <span className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">{dayNum}</span>
                      </div>
                      <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded tracking-wide ${tagColor}`}>
                        {isFuture ? 'Locked 🔒' : d.status === 'Present' ? 'Present' : d.status === 'Absent' ? 'Absent' : d.status === 'Paid Leave' ? 'Paid Leave' : d.status === 'Week Off' ? 'Week Off' : d.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {isFuture ? (
                        <span className="text-slate-400 font-sans block italic text-[9px]">Future locked</span>
                      ) : d.status === 'Present' ? (
                        <>
                          <div className="text-emerald-700 dark:text-emerald-400 flex items-center justify-between font-mono text-[9px]">
                            <span>In: {d.checkIn || '09:30'}</span>
                          </div>
                          <div className="text-emerald-700 dark:text-emerald-400 flex items-center justify-between font-mono text-[9px]">
                            <span>Out: {d.checkOut || '-'}</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-slate-450 italic font-medium leading-tight line-clamp-2">
                          {d.reason}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {editingEmployee && (
        <EditEmployeeModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
          onSave={handleEditEmployeeSave}
        />
      )}

      {showOfferLetterEmp && (
        <OfferLetterModal
          employee={showOfferLetterEmp}
          onClose={() => setShowOfferLetterEmp(null)}
        />
      )}

      {selectedResignationForLetter && (
        <ExitLetterModal
          resignation={selectedResignationForLetter}
          onClose={() => setSelectedResignationForLetter(null)}
        />
      )}

      {selectedCalendarEmployee && (
        <AdminTLAttendanceCalendarModal
          employee={selectedCalendarEmployee}
          selectedPeriod={selectedPayrollMonth}
          currentUserId={currentUserId}
          onClose={() => setSelectedCalendarEmployee(null)}
          onRefresh={onRefreshData}
        />
      )}

    </div>
  );
}

function AdminTLAttendanceCalendarModal({
  employee,
  selectedPeriod,
  currentUserId,
  onClose,
  onRefresh
}: {
  employee: Employee;
  selectedPeriod: string;
  currentUserId: string;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [activeEditDate, setActiveEditDate] = useState<string | null>(null);
  
  // local form fields
  const [editStatus, setEditStatus] = useState<'Present' | 'Absent' | 'Week Off' | 'Paid Leave'>('Present');
  const [editCheckIn, setEditCheckIn] = useState('09:30');
  const [editCheckOut, setEditCheckOut] = useState('18:30');
  const [editDeduct, setEditDeduct] = useState(false);
  const [editReason, setEditReason] = useState('');

  const attendances = getAttendances();
  const todayStr = getISTDateString();
  const joiningDate = employee.dateOfJoining || employee.joinedDate || '';

  const cycleRange = getCycleDateRangeForMonth(selectedPeriod);
  
  // Generate dates
  const cycleDates: string[] = [];
  if (cycleRange) {
    let curr = new Date(cycleRange.start);
    const end = new Date(cycleRange.end);
    while (curr <= end) {
      const yr = curr.getFullYear();
      const mo = String(curr.getMonth() + 1).padStart(2, '0');
      const dy = String(curr.getDate()).padStart(2, '0');
      cycleDates.push(`${yr}-${mo}-${dy}`);
      curr.setDate(curr.getDate() + 1);
    }
  }

  const getDateStatusDetails = (dateStr: string) => {
    const record = attendances.find(r => r.employeeId === employee.id && r.date === dateStr);
    if (record) {
      return {
        status: record.status, 
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        deductSalary: record.deductSalary,
        reason: record.bySystem ? 'Closed automatically by system' : record.modifiedBy ? `Overridden: ${record.reasonForChange || ''}` : 'Punched via Client Terminal',
        modifiedBy: record.modifiedBy,
        reasonForChange: record.reasonForChange
      };
    }

    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dateObj = new Date(yr, m, d);
      if (dateObj.getDay() === 0) {
        return { status: 'Week Off' as const, reason: 'Sunday Routine Week Off' };
      }
    }

    const leaves = getLeaveRequests().filter(l => l.employeeId === employee.id && l.status === 'approved');
    const leaveReq = leaves.find(l => dateStr >= l.startDate && dateStr <= l.endDate);
    if (leaveReq) {
      const isPaid = leaveReq.leaveType !== 'unpaid';
      return {
        status: isPaid ? ('Paid Leave' as const) : ('Absent' as const),
        reason: `Approved Leave (${leaveReq.leaveType}): ${leaveReq.reason || ''}`
      };
    }

    if (dateStr < todayStr) {
      if (joiningDate && dateStr < joiningDate) {
        return { status: 'Inactive' as const, reason: 'Prior to Joining' };
      }
      return { status: 'Absent' as const, reason: 'Unmarked LOP Absence' };
    } else if (dateStr === todayStr) {
      return { status: 'Pending' as const, reason: 'Duty Session Status' };
    } else {
      return { status: 'Future' as const, reason: 'Upcoming Calendar Date' };
    }
  };

  const handleEditClick = (dateStr: string) => {
    if (dateStr > todayStr) {
      alert("Error: Attendance Calendar for future dates is completely locked. You cannot mark absent, present, leave, etc. for future dates.");
      return;
    }
    const d = getDateStatusDetails(dateStr);
    setActiveEditDate(dateStr);
    setEditStatus((d.status === 'Future' || d.status === 'Inactive' || d.status === 'Pending') ? 'Present' : d.status as any);
    setEditCheckIn(d.checkIn || '09:30');
    setEditCheckOut(d.checkOut || '18:30');
    setEditDeduct(d.deductSalary !== undefined ? d.deductSalary : (d.status === 'Absent'));
    setEditReason(d.reasonForChange || '');
  };

  const handleSaveEdit = () => {
    if (!activeEditDate) return;
    if (activeEditDate > todayStr) {
      alert("Error: Correcting attendance for future dates is completely locked. You cannot assign future date attendance status.");
      return;
    }
    if (!editReason.trim()) {
      alert("Please provide an adjustment justification reason.");
      return;
    }

    // Save changes
    const records = getAttendances();
    let record = records.find(r => r.employeeId === employee.id && r.date === activeEditDate);
    
    if (!record) {
      const newId = `ATT-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      record = {
        id: newId,
        employeeId: employee.id,
        date: activeEditDate,
        checkIn: '',
        checkOut: '',
        status: 'Absent',
        deductSalary: true
      };
      records.push(record);
      saveAttendances(records);
    }

    const updates: any = { status: editStatus, deductSalary: editDeduct };
    if (editStatus === 'Present') {
      updates.checkIn = editCheckIn;
      updates.checkOut = editCheckOut;
      if (updates.checkIn && updates.checkOut) {
        const [inH, inM] = updates.checkIn.split(':').map(Number);
        const [outH, outM] = updates.checkOut.split(':').map(Number);
        updates.totalHours = parseFloat(((outH + outM / 60) - (inH + inM / 60)).toFixed(2));
      }
    } else {
      updates.checkIn = '';
      updates.checkOut = '';
      updates.totalHours = 0;
    }

    updateAttendanceManually(
      record.id,
      updates,
      currentUserId,
      editReason
    );
    
    onRefresh();
    setActiveEditDate(null);
    alert(`Attendance for ${activeEditDate} modified successfully and logged in audit trails.`);
  };

  const handlePrintCalendar = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const metrics = getAttendanceMetricsForCycle(employee.id, selectedPeriod);
    
    let daysHtml = '';
    cycleDates.forEach(dateStr => {
      const details = getDateStatusDetails(dateStr);
      const parts = dateStr.split('-');
      const dayNum = parts[2];
      const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(dayNum, 10));
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dateObj.getDay()];

      let statusColor = "color: #475569;";
      if (details.status === 'Present') statusColor = "color: #10b981; font-weight: bold;";
      else if (details.status === 'Absent') statusColor = "color: #ef4444; font-weight: bold;";
      else if (details.status === 'Paid Leave') statusColor = "color: #f59e0b; font-weight: bold;";
      else if (details.status === 'Week Off') statusColor = "color: #3b82f6;";

      daysHtml += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${dateStr} (${dayName})</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; ${statusColor}">${details.status}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${details.checkIn || '-'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${details.checkOut || '-'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; font-style: italic; color: #64748b;">${details.reason || '-'}</td>
        </tr>
      `;
    });

    const content = `
      <html>
        <head>
          <title>${employee.name} - Attendance Register</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 30px; color: #1e293b; line-height: 1.5; }
            .header { border-bottom: 3px double #cbd5e1; padding-bottom: 20px; margin-bottom: 25px; }
            .title { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #1e3a8a; }
            .grid-meta { display: grid; grid-template-cols: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 13px; }
            .meta-item { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
            .summary-box { background: #f1f5f9; padding: 15px; border-radius: 10px; font-weight: bold; font-size: 14px; margin-bottom: 25px; border-left: 5px solid #4f46e5; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th { text-align: left; background: #0f172a; color: white; padding: 12px; font-weight: bold; text-transform: uppercase; }
            .footer { margin-top: 50px; border-top: 1px solid #cbd5e1; padding-top: 20px; text-align: center; font-size: 11px; color: #64748b; }
            .sig-area { display: flex; justify-content: space-between; margin-top: 60px; font-weight: bold; font-size: 13px; }
          </style>
        </head>
        <body onload="window.print();">
          <div class="header">
            <div class="title">Official Attendance Register Calendar</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 5px;">Compliance Registry System Document • ${selectedPeriod}</div>
          </div>
          
          <div class="grid-meta">
            <div class="meta-item">
              <strong>Employee Name:</strong> <span style="text-transform: uppercase; font-weight: bold;">${employee.name}</span><br>
              <strong>Employee Code:</strong> ${employee.employeeCode || 'EFG-REC-001'}<br>
              <strong>Designation:</strong> ${employee.designation || 'Filing Specialist'}<br>
              <strong>Date of Joining:</strong> ${joiningDate || '2026-06-01'}
            </div>
            <div class="meta-item">
              <strong>Calculated Cycle Period:</strong> <span style="font-family: monospace;">${cycleRange.start}</span> to <span style="font-family: monospace;">${cycleRange.end}</span><br>
              <strong>Audit StateCode:</strong> COMPLIANT_IST_METRIC<br>
              <strong>Registered Email:</strong> ${employee.email}
            </div>
          </div>

          <div class="summary-box">
            TALLY METRICS FOR CYCLE: 
            Present: <span style="color: #10b981;">${metrics.presentDays} Days</span> | 
            Absent (LOP): <span style="color: #ef4444;">${metrics.absentDays} Days</span> | 
            Paid Leaves: <span style="color: #f59e0b;">${metrics.paidLeaveDays} Days</span> | 
            Week Offs: <span style="color: #3b82f6;">${metrics.weekOffDays} Days</span>
          </div>

          <table>
            <thead>
              <tr>
                <th>Date / Day</th>
                <th>Status</th>
                <th>In Punch</th>
                <th>Out Punch</th>
                <th>Compliance Remarks & Audit Notes</th>
              </tr>
            </thead>
            <tbody>
              ${daysHtml}
            </tbody>
          </table>

          <div class="sig-area">
            <div>
              <p style="margin-bottom: 50px; font-style: italic;">Verified by:</p>
              <div style="border-top: 1px solid #1e293b; width: 220px; padding-top: 6px;">Team Leader / Auditor Signatory</div>
            </div>
            <div style="text-align: right;">
              <p style="margin-bottom: 50px; font-style: italic;">Authorized Stamp:</p>
              <div style="border-top: 1px solid #1e293b; width: 220px; padding-top: 6px; display: inline-block;">General HR Director (EFILINGG)</div>
            </div>
          </div>

          <div class="footer">
            Generated securely via Administration Portal. Digital audit trail is active. Access Logged: admin session @ IST.
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
  };

  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split('-');
    if (parts.length !== 3) return { dayNum: 1, monthStr: '', dayName: '' };
    const day = parseInt(parts[2], 10);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthStr = months[parseInt(parts[1], 10) - 1];
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, day);
    const daysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayName = daysShort[dateObj.getDay()];
    return { dayNum: day, monthStr, dayName };
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto w-full text-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full border border-slate-150 dark:border-slate-850 shadow-2xl p-6 space-y-6 max-h-[92vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-150 dark:border-slate-800 pb-4 gap-4">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block tracking-wider font-mono">Administrative Portal</span>
            <h2 className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">{employee.name}'s Attendance File</h2>
            <p className="text-[11px] text-slate-500">
              Interactive Register Directory for period: <strong className="text-indigo-600 font-mono">{cycleRange.start} to {cycleRange.end}</strong>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintCalendar}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5 shrink-0" />
              <span>Print/Download PDF</span>
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400 hover:text-slate-600 font-bold cursor-pointer border dark:border-slate-800"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 flex flex-wrap gap-2.5 items-center text-[10px] font-bold">
          <span className="text-slate-400 uppercase tracking-wider text-[8.5px] font-mono shrink-0">Click any card to modify attendance for that day:</span>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-emerald-500" />
            <span className="text-slate-600 dark:text-slate-300">Present</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-blue-500" />
            <span className="text-slate-600 dark:text-slate-300">Week Off</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-amber-500" />
            <span className="text-slate-600 dark:text-slate-300">Paid Leave</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 rounded bg-rose-500" />
            <span className="text-slate-600 dark:text-slate-300">Absent (LOP)</span>
          </div>
        </div>

        {/* Inline edit container */}
        {activeEditDate && (
          <div className="p-4 bg-amber-50/30 dark:bg-slate-950/40 border border-amber-250 dark:border-amber-900 rounded-2xl space-y-3 animate-fade-in">
            <div className="flex items-center justify-between border-b border-amber-200/50 pb-2">
              <span className="font-bold text-amber-805 dark:text-amber-400">Revising Day: {activeEditDate}</span>
              <button 
                onClick={() => setActiveEditDate(null)}
                className="text-slate-400 hover:text-slate-650 text-[11px] font-bold cursor-pointer"
              >
                Cancel Edit
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-[10px] font-semibold text-slate-550">
              <div className="space-y-1">
                <label className="block text-slate-500 uppercase tracking-wide">Status Override *</label>
                <select
                  value={editStatus}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setEditStatus(val);
                    if (val === 'Absent') {
                      setEditDeduct(true);
                    } else {
                      setEditDeduct(false);
                    }
                  }}
                  className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                >
                  <option value="Present">Present (Checked In)</option>
                  <option value="Absent">Absent (Not present)</option>
                  <option value="Paid Leave">Paid Leave (Approved)</option>
                  <option value="Week Off">Week Off / Sunday</option>
                </select>
              </div>

              {editStatus === 'Present' ? (
                <>
                  <div className="space-y-1">
                    <label className="block text-indigo-650 font-bold uppercase tracking-wide">In Time (HH:MM) *</label>
                    <input 
                      type="time" 
                      value={editCheckIn} 
                      onChange={(e) => setEditCheckIn(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-mono text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-indigo-650 font-bold uppercase tracking-wide">Out Time (HH:MM) *</label>
                    <input 
                      type="time" 
                      value={editCheckOut} 
                      onChange={(e) => setEditCheckOut(e.target.value)}
                      className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg font-mono text-xs" 
                    />
                  </div>
                </>
              ) : (
                <div className="space-y-1 col-span-2">
                  <label className="block text-slate-500 uppercase tracking-wide">Salary deduction (LOP)?</label>
                  <select 
                    value={String(editDeduct)} 
                    onChange={(e) => setEditDeduct(e.target.value === 'true')}
                    className="w-full p-2 bg-white dark:bg-slate-900 border rounded-lg text-xs"
                  >
                    <option value="false">No (Calculate as working pay)</option>
                    <option value="true">Yes (Deduct daily wage rate)</option>
                  </select>
                </div>
              )}

              <div className="col-span-2 md:col-span-1 flex items-end">
                <button 
                  type="button" 
                  onClick={handleSaveEdit}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg cursor-pointer text-xs uppercase"
                >
                  Save Revision
                </button>
              </div>

              <div className="col-span-2 md:col-span-5 space-y-1">
                <label className="block text-slate-500 uppercase tracking-wide">Auditable Compliance Reason Statement *</label>
                <input 
                  value={editReason} 
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Employee requested backup validation, approved in writing by leader..." 
                  className="w-full p-2 bg-white dark:bg-slate-905 border rounded-lg text-xs" 
                />
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-3">
          {cycleDates.map(dateStr => {
            const d = getDateStatusDetails(dateStr);
            const lbl = formatDateLabel(dateStr);
            const isFuture = dateStr > todayStr;
            
            let cardBg = "bg-slate-50 dark:bg-slate-950 border-slate-205 cursor-pointer";
            let tagColor = "bg-slate-100 text-slate-500";
            
            if (isFuture) {
              cardBg = "bg-slate-100/40 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed";
              tagColor = "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-500";
            } else if (d.status === 'Present') {
              cardBg = "bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-250 cursor-pointer";
              tagColor = "bg-emerald-100 text-emerald-800 dark:bg-emerald-905 dark:text-emerald-305";
            } else if (d.status === 'Week Off') {
              cardBg = "bg-blue-50/40 dark:bg-blue-950/10 border-blue-200 cursor-pointer";
              tagColor = "bg-blue-105 text-blue-800 dark:bg-blue-905 dark:text-blue-305";
            } else if (d.status === 'Paid Leave') {
              cardBg = "bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 cursor-pointer";
              tagColor = "bg-amber-100 text-amber-800 dark:bg-amber-905 dark:text-amber-305";
            } else if (d.status === 'Absent') {
              cardBg = "bg-rose-50/40 dark:bg-rose-950/10 border-rose-220 cursor-pointer";
              tagColor = "bg-rose-100 text-rose-800 dark:bg-rose-905 dark:text-rose-300";
            } else if (d.status === 'Future') {
              cardBg = "bg-white dark:bg-slate-900 border-dashed border-slate-200 dark:border-slate-800 opacity-60 cursor-pointer";
              tagColor = "bg-slate-100 text-slate-400";
            }

            return (
              <div 
                key={dateStr}
                onClick={() => {
                  if (isFuture) {
                    alert("Attendance Calendar Lock: Future dates are completely locked for editing. You cannot mark absent, present, leave, etc. for future dates.");
                    return;
                  }
                  handleEditClick(dateStr);
                }}
                className={`p-3 rounded-2xl border flex flex-col justify-between space-y-2 h-26 text-[10.5px] font-semibold transition-all ${isFuture ? '' : 'hover:shadow-xs group hover:scale-[1.02] active:scale-95'} ${cardBg} ${activeEditDate === dateStr ? 'ring-2 ring-amber-500' : ''}`}
                title={isFuture ? "Attendance editing locked for future dates" : "Click to override/modify attendance for this day"}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <span className="font-bold text-[9px] text-slate-400 block">{lbl.dayName}</span>
                    <span className="text-lg font-black text-slate-900 dark:text-slate-100 leading-none">{lbl.dayNum}</span>
                  </div>
                  <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded tracking-wide ${tagColor}`}>
                    {isFuture ? 'Locked 🔒' : d.status === 'Present' ? 'Present' : d.status === 'Absent' ? 'Absent' : d.status === 'Paid Leave' ? 'Paid Leave' : d.status === 'Week Off' ? 'Week Off' : d.status}
                  </span>
                </div>

                <div className="space-y-0.5 text-[8.5px] font-mono border-t border-slate-100 dark:border-slate-800/40 pt-1.5 leading-none">
                  {isFuture ? (
                    <span className="text-slate-400 font-sans block italic">Editing disabled</span>
                  ) : d.status === 'Present' ? (
                    <>
                      <div className="text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
                        <span>In:</span>
                        <span className="font-bold">{d.checkIn || '-'}</span>
                      </div>
                      <div className="text-slate-450 flex items-center justify-between">
                        <span>Out:</span>
                        <span className="font-bold">{d.checkOut || '-'}</span>
                      </div>
                    </>
                  ) : (
                    <span className="text-slate-400 font-sans leading-tight block truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                      {d.reason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-indigo-50/30 border border-indigo-100/40 rounded-xl text-indigo-750 dark:text-indigo-400 text-[10px] font-semibold flex items-center gap-2">
          <span>ℹ️</span>
          <p>
            Audit logging records all administrative modifications on-the-fly. Daily changes made during adjustments will reflect immediately on the corresponding Associate terminal logs.
          </p>
        </div>

      </div>
    </div>
  );
}
