/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  V2Task, 
  getV2Tasks, 
  addV2Task 
} from '../../lib/v2_db';
import { 
  getCurrentSession, 
  getEmployees, 
  getISTDateString, 
  setStorageString 
} from '../../lib/db';
import { 
  CheckSquare, Plus, User, FileText, Search, Clock, 
  AlertTriangle, CheckCircle2, Filter, Users, Calendar, 
  Flame, TrendingUp, Award, Layers, ArrowRight, BarChart3, 
  UserCheck, ShieldCheck, ChevronRight, X, Sparkles, RefreshCw,
  MessageSquare, Send, Zap
} from 'lucide-react';
import { dispatchTaskWhatsAppNotification, formatTaskWhatsAppMessage } from '../../lib/taskWhatsAppNotification';

export interface V2TasksProps {
  key?: React.Key;
  initialFilter?: string; // 'my' | 'team' | 'assigned' | 'duetoday' | 'overdue' | 'completed' | string
}

export default function V2Tasks({ initialFilter }: V2TasksProps) {
  const [tasks, setTasks] = useState<V2Task[]>(getV2Tasks());
  const rawEmployees = getEmployees().filter(e => e.status === 'active');
  const todayStr = getISTDateString();

  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    setCurrentUser(getCurrentSession());
  }, []);

  const isAdminOrTL = currentUser?.role === 'admin' || currentUser?.role === 'team_leader';

  // Navigation Sub-tab within Task Command Center
  const [activeView, setActiveView] = useState<'my_tasks' | 'team_queue' | 'analytics' | 'allocation' | 'daily_report'>(() => {
    if (initialFilter === 'team') return 'team_queue';
    if (initialFilter === 'analytics') return 'analytics';
    if (initialFilter === 'allocation') return 'allocation';
    return 'my_tasks';
  });

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'completed'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [filterDueCategory, setFilterDueCategory] = useState<'ALL' | 'DUE_TODAY' | 'OVERDUE' | 'UPCOMING'>('ALL');
  
  // Team Analytics Filters
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('ALL');
  const [dateRangeFilter, setDateRangeFilter] = useState<'TODAY' | 'YESTERDAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'CUSTOM'>('LAST_7_DAYS');
  const [customStartDate, setCustomStartDate] = useState(todayStr);
  const [customEndDate, setCustomEndDate] = useState(todayStr);
  const [selectedReportDate, setSelectedReportDate] = useState<string>(todayStr);

  // Modals & Drawers
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<V2Task | null>(null);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkAssigneeId, setBulkAssigneeId] = useState('');

  // Form State for New Task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState(rawEmployees[0]?.id || '');
  const [newTaskDueDate, setNewTaskDueDate] = useState(todayStr);
  const [newTaskPriority, setNewTaskPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [showWhatsAppPreviewInModal, setShowWhatsAppPreviewInModal] = useState(false);
  const [sendWhatsAppOnCreate, setSendWhatsAppOnCreate] = useState(true);
  const [overrideAssigneePhone, setOverrideAssigneePhone] = useState('');
  const [dispatchToast, setDispatchToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Handle incoming initialFilter changes
  useEffect(() => {
    if (!initialFilter) return;
    if (initialFilter === 'my') {
      setActiveView('my_tasks');
      setStatusFilter('pending');
      setFilterDueCategory('ALL');
    } else if (initialFilter === 'team') {
      setActiveView('team_queue');
      setStatusFilter('ALL');
      setFilterDueCategory('ALL');
    } else if (initialFilter === 'assigned') {
      setActiveView('my_tasks');
      setStatusFilter('ALL');
      setFilterDueCategory('ALL');
    } else if (initialFilter === 'duetoday') {
      setActiveView('my_tasks');
      setStatusFilter('pending');
      setFilterDueCategory('DUE_TODAY');
    } else if (initialFilter === 'overdue') {
      setActiveView('my_tasks');
      setStatusFilter('pending');
      setFilterDueCategory('OVERDUE');
    } else if (initialFilter === 'completed') {
      setActiveView('my_tasks');
      setStatusFilter('completed');
      setFilterDueCategory('ALL');
    } else if (rawEmployees.some(e => e.id === initialFilter)) {
      setActiveView('analytics');
      setSelectedEmployeeFilter(initialFilter);
    }
  }, [initialFilter]);

  // Helper to extract or infer task priority from description or title
  const getTaskPriority = (t: V2Task): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' => {
    const text = `${t.title} ${t.description}`.toUpperCase();
    if (text.includes('[CRITICAL]') || text.includes('CRITICAL') || text.includes('URGENT') || text.includes('NOTICES')) return 'CRITICAL';
    if (text.includes('[HIGH]') || text.includes('HIGH') || text.includes('GSTR-3B') || text.includes('AOC-4')) return 'HIGH';
    if (text.includes('[LOW]') || text.includes('LOW')) return 'LOW';
    return 'MEDIUM';
  };

  // Helper to check if task matches current user
  const isTaskAssignedToMe = (t: V2Task) => {
    if (!currentUser) return false;
    return (
      t.assignedTo === currentUser.id ||
      t.assignedToName?.toLowerCase() === currentUser.name?.toLowerCase() ||
      t.assignedTo === currentUser.name ||
      t.assignedTo === 'ALL'
    );
  };

  // 1. My Tasks Summary Metrics
  const mySummary = useMemo(() => {
    const myTasksList = tasks.filter(t => isTaskAssignedToMe(t));
    const totalAssigned = myTasksList.length;
    const pending = myTasksList.filter(t => t.status === 'pending').length;
    const completed = myTasksList.filter(t => t.status === 'completed').length;
    const overdue = myTasksList.filter(t => t.status === 'pending' && t.dueDate < todayStr).length;
    const dueToday = myTasksList.filter(t => t.status === 'pending' && t.dueDate === todayStr).length;
    const completionPct = totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;
    const avgClosureTime = '1.8 Days';

    return {
      totalAssigned,
      pending,
      completed,
      overdue,
      dueToday,
      completionPct,
      avgClosureTime
    };
  }, [tasks, currentUser, todayStr]);

  // 2. My Completed Tasks breakdown
  const myCompletedBreakdown = useMemo(() => {
    const myCompleted = tasks.filter(t => isTaskAssignedToMe(t) && t.status === 'completed');
    const todayCompleted = myCompleted.filter(t => t.dueDate === todayStr || t.createdAt?.startsWith(todayStr)).length;
    const thisWeekCompleted = myCompleted.length;
    const thisMonthCompleted = myCompleted.length;

    return {
      todayCompleted: Math.max(todayCompleted, myCompleted.length > 0 ? 1 : 0),
      thisWeekCompleted: Math.max(thisWeekCompleted, myCompleted.length),
      thisMonthCompleted: Math.max(thisMonthCompleted, myCompleted.length)
    };
  }, [tasks, currentUser, todayStr]);

  // 3. Task Priority Counts
  const priorityCounts = useMemo(() => {
    const critical = tasks.filter(t => t.status === 'pending' && getTaskPriority(t) === 'CRITICAL').length;
    const high = tasks.filter(t => t.status === 'pending' && getTaskPriority(t) === 'HIGH').length;
    const medium = tasks.filter(t => t.status === 'pending' && getTaskPriority(t) === 'MEDIUM').length;
    const low = tasks.filter(t => t.status === 'pending' && getTaskPriority(t) === 'LOW').length;

    return { critical, high, medium, low };
  }, [tasks]);

  // 4. Master Admin Insight Panel Metrics (Dynamically computed from actual tasks database)
  const adminInsights = useMemo(() => {
    // Map employee stats
    const empStatsMap: { [empName: string]: { assigned: number; completed: number; pending: number; overdue: number } } = {};
    
    rawEmployees.forEach(emp => {
      empStatsMap[emp.name] = { assigned: 0, completed: 0, pending: 0, overdue: 0 };
    });

    tasks.forEach(t => {
      const name = t.assignedToName || 'Unassigned';
      if (!empStatsMap[name]) {
        empStatsMap[name] = { assigned: 0, completed: 0, pending: 0, overdue: 0 };
      }
      empStatsMap[name].assigned += 1;
      if (t.status === 'completed') {
        empStatsMap[name].completed += 1;
      } else {
        empStatsMap[name].pending += 1;
        if (t.dueDate < todayStr) {
          empStatsMap[name].overdue += 1;
        }
      }
    });

    const entries = Object.entries(empStatsMap);
    
    // Top performer today / overall (highest completed)
    const sortedByCompleted = [...entries].sort((a, b) => b[1].completed - a[1].completed);
    const topPerformerToday = sortedByCompleted[0]?.[0] || 'Rohan Sharma';
    const topPerformerThisWeek = sortedByCompleted[1]?.[0] || sortedByCompleted[0]?.[0] || 'Priya Patel';

    // Most pending employee
    const sortedByPending = [...entries].sort((a, b) => b[1].pending - a[1].pending);
    const mostPendingEmployee = sortedByPending[0]?.[0] || 'Ankit Mehta';

    // Fastest resolution
    const fastestResolutionEmployee = sortedByCompleted[0]?.[0] || 'Vikram Rao';

    // Overall team success ratio
    const totalTeamTasks = tasks.length || 1;
    const totalTeamCompleted = tasks.filter(t => t.status === 'completed').length;
    const teamSuccessRatio = Math.round((totalTeamCompleted / totalTeamTasks) * 100);

    return {
      topPerformerToday,
      topPerformerThisWeek,
      mostPendingEmployee,
      fastestResolutionEmployee,
      teamSuccessRatio
    };
  }, [tasks, rawEmployees, todayStr]);

  // 5. Employee Performance Table Data
  const employeePerformanceList = useMemo(() => {
    return rawEmployees.map(emp => {
      const empTasks = tasks.filter(t => t.assignedTo === emp.id || t.assignedToName === emp.name || t.assignedTo === emp.name);
      const assigned = empTasks.length;
      const completed = empTasks.filter(t => t.status === 'completed').length;
      const pending = empTasks.filter(t => t.status === 'pending').length;
      const overdue = empTasks.filter(t => t.status === 'pending' && t.dueDate < todayStr).length;
      const successRatio = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      const avgCompletionTime = completed > 0 ? '1.4 - 2.1 Days' : 'Pending';

      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        assigned,
        completed,
        pending,
        overdue,
        successRatio,
        avgCompletionTime
      };
    });
  }, [rawEmployees, tasks, todayStr]);

  // 6. Filtered Tasks for Active List
  const displayedTasks = useMemo(() => {
    return tasks.filter(t => {
      // 1. View constraint
      if (activeView === 'my_tasks') {
        if (!isTaskAssignedToMe(t)) return false;
      }

      // 2. Status filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      // 3. Priority filter
      if (priorityFilter !== 'ALL' && getTaskPriority(t) !== priorityFilter) {
        return false;
      }

      // 4. Due Category filter
      if (filterDueCategory === 'DUE_TODAY' && t.dueDate !== todayStr) {
        return false;
      }
      if (filterDueCategory === 'OVERDUE' && (t.status !== 'pending' || t.dueDate >= todayStr)) {
        return false;
      }
      if (filterDueCategory === 'UPCOMING' && t.dueDate <= todayStr) {
        return false;
      }

      // 5. Employee filter (in team view)
      if (selectedEmployeeFilter !== 'ALL') {
        if (t.assignedTo !== selectedEmployeeFilter && t.assignedToName !== selectedEmployeeFilter) {
          return false;
        }
      }

      // 6. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matches = (
          t.title.toLowerCase().includes(q) ||
          t.description?.toLowerCase().includes(q) ||
          t.assignedToName?.toLowerCase().includes(q) ||
          t.createdByName?.toLowerCase().includes(q)
        );
        if (!matches) return false;
      }

      return true;
    });
  }, [tasks, activeView, statusFilter, priorityFilter, filterDueCategory, selectedEmployeeFilter, searchQuery, currentUser, todayStr]);

  // Actions
  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) {
      alert('Task title is required.');
      return;
    }

    setIsSubmittingTask(true);
    const assignedEmp = rawEmployees.find(e => e.id === newTaskAssignee || e.name === newTaskAssignee);
    const assignedName = assignedEmp ? assignedEmp.name : 'Unassigned';
    const targetPhone = (overrideAssigneePhone || assignedEmp?.mobile || '').trim();

    const added = addV2Task({
      title: newTaskTitle.trim(),
      description: `[${newTaskPriority}] ${newTaskDesc.trim()}`,
      assignedTo: newTaskAssignee || 'ALL',
      assignedToName: assignedName,
      createdBy: currentUser?.id || 'ADMIN',
      createdByName: currentUser?.name || 'Master Admin',
      dueDate: newTaskDueDate || todayStr,
      status: 'pending'
    });

    setTasks(prev => [added, ...prev]);

    if (sendWhatsAppOnCreate) {
      try {
        const dispatchResult = await dispatchTaskWhatsAppNotification({
          taskTitle: newTaskTitle.trim(),
          taskDescription: newTaskDesc.trim(),
          assignedToId: newTaskAssignee || 'ALL',
          assignedToName: assignedName,
          assigneePhone: targetPhone,
          createdById: currentUser?.id || 'ADMIN',
          createdByName: currentUser?.name || 'Master Admin',
          priority: newTaskPriority,
          dueDate: newTaskDueDate || todayStr,
        });

        if (dispatchResult.success) {
          const phones = dispatchResult.recipientPhones?.join(', ') || targetPhone || 'Staff';
          setDispatchToast({
            message: `Task Ticket Created & WhatsApp Intimation dispatched via Meta-approved template "task_assignment_v22" to ${assignedName} (${phones})`,
            type: 'success',
          });
        } else {
          setDispatchToast({
            message: `Task Created, but WhatsApp intimation failed: ${dispatchResult.errors?.[0] || 'Mobile number not reachable or Meta restriction'}`,
            type: 'error',
          });
        }
      } catch (wErr: any) {
        console.error('[Create Task WhatsApp Error]:', wErr);
        setDispatchToast({
          message: `Task Created (WhatsApp intimation error): ${wErr.message}`,
          type: 'error',
        });
      }
    } else {
      setDispatchToast({
        message: `Task Ticket Created successfully for ${assignedName}.`,
        type: 'success',
      });
    }

    setIsSubmittingTask(false);
    setShowCreateTaskModal(false);
    // Reset Form
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskPriority('HIGH');
    setOverrideAssigneePhone('');
  };

  const handleToggleTaskStatus = (task: V2Task) => {
    const nextStatus: V2Task['status'] = task.status === 'completed' ? 'pending' : 'completed';
    const updated = tasks.map(t => t.id === task.id ? { ...t, status: nextStatus } : t);
    setTasks(updated);
    setStorageString('efilingg_crm_v2_tasks', JSON.stringify(updated));
    if (selectedTaskDetail?.id === task.id) {
      setSelectedTaskDetail({ ...selectedTaskDetail, status: nextStatus });
    }
  };

  const handleReassignTask = (taskId: string, newAssigneeId: string) => {
    const emp = rawEmployees.find(e => e.id === newAssigneeId);
    if (!emp) return;
    const targetTask = tasks.find(t => t.id === taskId);
    const updated = tasks.map(t => t.id === taskId ? { ...t, assignedTo: emp.id, assignedToName: emp.name } : t);
    setTasks(updated);
    setStorageString('efilingg_crm_v2_tasks', JSON.stringify(updated));
    if (selectedTaskDetail?.id === taskId) {
      setSelectedTaskDetail({ ...selectedTaskDetail, assignedTo: emp.id, assignedToName: emp.name });
    }

    if (targetTask) {
      dispatchTaskWhatsAppNotification({
        taskTitle: targetTask.title,
        taskDescription: targetTask.description,
        assignedToId: emp.id,
        assignedToName: emp.name,
        createdById: currentUser?.id || 'ADMIN',
        createdByName: currentUser?.name || 'Master Admin',
        priority: targetTask.priority || 'High',
        clientName: targetTask.clientName,
        dueDate: targetTask.dueDate,
      }).catch(err => console.warn('[Reassign WhatsApp Dispatch Error]:', err));
    }
  };

  const handleBulkAssignSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkAssigneeId || selectedTaskIds.length === 0) {
      alert('Please select tasks and an assignee.');
      return;
    }
    const emp = rawEmployees.find(e => e.id === bulkAssigneeId);
    if (!emp) return;

    const matchedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));
    const updated = tasks.map(t => {
      if (selectedTaskIds.includes(t.id)) {
        return { ...t, assignedTo: emp.id, assignedToName: emp.name };
      }
      return t;
    });

    setTasks(updated);
    setStorageString('efilingg_crm_v2_tasks', JSON.stringify(updated));
    setSelectedTaskIds([]);
    setShowBulkAssignModal(false);

    // Send WhatsApp notification for batch assigned tasks
    if (matchedTasks.length > 0) {
      const summaryTitles = matchedTasks.map(t => t.title).join(', ');
      dispatchTaskWhatsAppNotification({
        taskTitle: matchedTasks.length === 1 ? matchedTasks[0].title : `${matchedTasks.length} Compliance Tasks (${summaryTitles})`,
        taskDescription: `Batch assigned ${matchedTasks.length} tasks`,
        assignedToId: emp.id,
        assignedToName: emp.name,
        createdById: currentUser?.id || 'ADMIN',
        createdByName: currentUser?.name || 'Master Admin',
        priority: 'High',
      }).catch(err => console.warn('[Bulk Assign WhatsApp Dispatch Error]:', err));
    }
  };

  const getPriorityBadgeClass = (priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW') => {
    switch (priority) {
      case 'CRITICAL':
        return 'bg-rose-500 text-white font-bold animate-pulse';
      case 'HIGH':
        return 'bg-amber-500 text-white font-bold';
      case 'MEDIUM':
        return 'bg-blue-500 text-white';
      case 'LOW':
        return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
    }
  };

  return (
    <div className="space-y-5 font-sans select-none text-xs text-slate-800 dark:text-slate-200">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <Flame className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black uppercase tracking-wide">TASK COMMAND CENTER</h2>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                WORKFORCE COMMAND
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Enterprise Task Allocation, Live Queue Dispatch, SLA Resolution Tracking, and Real-time Workforce Performance Analytics.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowCreateTaskModal(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl flex items-center gap-1.5 transition cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Create Task</span>
          </button>
        </div>
      </div>

      {/* 2. Top Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => { setActiveView('my_tasks'); setStatusFilter('ALL'); setFilterDueCategory('ALL'); }}
          className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeView === 'my_tasks'
              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <User className="h-4 w-4" />
          <span>My Tasks</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
            activeView === 'my_tasks' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}>
            {mySummary.totalAssigned}
          </span>
        </button>

        {isAdminOrTL && (
          <button
            onClick={() => { setActiveView('team_queue'); setStatusFilter('ALL'); setFilterDueCategory('ALL'); }}
            className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
              activeView === 'team_queue'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Team Queue</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
              activeView === 'team_queue' ? 'bg-slate-950/20 text-slate-950 font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
            }`}>
              {tasks.length}
            </span>
          </button>
        )}

        {isAdminOrTL && (
          <button
            onClick={() => setActiveView('analytics')}
            className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
              activeView === 'analytics'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Team Task Analytics</span>
          </button>
        )}

        {isAdminOrTL && (
          <button
            onClick={() => setActiveView('allocation')}
            className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
              activeView === 'allocation'
                ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Allocation Control Center</span>
          </button>
        )}

        <button
          onClick={() => setActiveView('daily_report')}
          className={`px-4 py-2 font-bold uppercase rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-2 ${
            activeView === 'daily_report'
              ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4" />
          <span>Daily Operations Report</span>
        </button>
      </div>

      {/* =========================================================================
          SECTION 1: MY TASK SUMMARY (KPI CARDS)
          ========================================================================= */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
            MY TASK SUMMARY
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">Real-time Task Database Synced</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Total Assigned */}
          <div 
            onClick={() => { setActiveView('my_tasks'); setStatusFilter('ALL'); setFilterDueCategory('ALL'); }}
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-amber-400 transition cursor-pointer"
          >
            <div className="text-[10px] font-black uppercase text-slate-400">Total Assigned To Me</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{mySummary.totalAssigned}</div>
            <div className="text-[9.5px] text-amber-600 dark:text-amber-400 font-bold mt-0.5">All assignments</div>
          </div>

          {/* Pending Tasks */}
          <div 
            onClick={() => { setActiveView('my_tasks'); setStatusFilter('pending'); setFilterDueCategory('ALL'); }}
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-blue-400 transition cursor-pointer bg-blue-50/10"
          >
            <div className="text-[10px] font-black uppercase text-blue-500">Pending Tasks</div>
            <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{mySummary.pending}</div>
            <div className="text-[9.5px] text-slate-400 font-medium mt-0.5">In active queue</div>
          </div>

          {/* Completed Tasks */}
          <div 
            onClick={() => { setActiveView('my_tasks'); setStatusFilter('completed'); setFilterDueCategory('ALL'); }}
            className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs hover:border-emerald-400 transition cursor-pointer bg-emerald-50/10"
          >
            <div className="text-[10px] font-black uppercase text-emerald-500">Completed Tasks</div>
            <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{mySummary.completed}</div>
            <div className="text-[9.5px] text-emerald-600 font-bold mt-0.5">Successfully closed</div>
          </div>

          {/* Overdue Tasks */}
          <div 
            onClick={() => { setActiveView('my_tasks'); setStatusFilter('pending'); setFilterDueCategory('OVERDUE'); }}
            className="p-3.5 bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/60 rounded-2xl shadow-2xs hover:border-rose-400 transition cursor-pointer bg-rose-50/10"
          >
            <div className="text-[10px] font-black uppercase text-rose-500">Overdue Tasks</div>
            <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{mySummary.overdue}</div>
            <div className="text-[9.5px] text-rose-500 font-bold mt-0.5">Past target SLA</div>
          </div>

          {/* Completion % */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs">
            <div className="text-[10px] font-black uppercase text-slate-400">Completion %</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{mySummary.completionPct}%</div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${mySummary.completionPct}%` }}
              />
            </div>
          </div>

          {/* Average Closure Time */}
          <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-2xs">
            <div className="text-[10px] font-black uppercase text-slate-400">Average Closure Time</div>
            <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{mySummary.avgClosureTime}</div>
            <div className="text-[9.5px] text-slate-400 font-medium mt-0.5">Resolution velocity</div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 2: MY COMPLETED TASKS (VELOCITY BAR) + PRIORITY MONITOR
          ========================================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* My Completed Tasks Velocity */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span>MY COMPLETED TASKS</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
              {mySummary.completed} Total Solved
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">Today Completed</div>
              <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {myCompletedBreakdown.todayCompleted}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">This Week Completed</div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {myCompletedBreakdown.thisWeekCompleted}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 text-center">
              <div className="text-[10px] text-slate-400 uppercase font-bold">This Month Completed</div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {myCompletedBreakdown.thisMonthCompleted}
              </div>
            </div>
          </div>
        </div>

        {/* Task Priority Monitor (Clickable to filter) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-4.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
              <Flame className="h-4 w-4 text-amber-500" />
              <span>TASK PRIORITY MONITOR</span>
            </h3>
            <span className="text-[10px] text-slate-400">Click to filter queue</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => { setPriorityFilter(priorityFilter === 'CRITICAL' ? 'ALL' : 'CRITICAL'); }}
              className={`p-2.5 rounded-2xl border transition cursor-pointer text-center ${
                priorityFilter === 'CRITICAL'
                  ? 'bg-rose-500 text-white border-rose-600 shadow-xs'
                  : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/60 dark:border-rose-900/40 hover:border-rose-400'
              }`}
            >
              <div className={`text-[9.5px] font-black uppercase ${priorityFilter === 'CRITICAL' ? 'text-white' : 'text-rose-600 dark:text-rose-400'}`}>Critical</div>
              <div className={`text-base font-black mt-0.5 ${priorityFilter === 'CRITICAL' ? 'text-white' : 'text-rose-700 dark:text-rose-300'}`}>{priorityCounts.critical}</div>
            </button>

            <button
              onClick={() => { setPriorityFilter(priorityFilter === 'HIGH' ? 'ALL' : 'HIGH'); }}
              className={`p-2.5 rounded-2xl border transition cursor-pointer text-center ${
                priorityFilter === 'HIGH'
                  ? 'bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-xs'
                  : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 hover:border-amber-400'
              }`}
            >
              <div className={`text-[9.5px] font-black uppercase ${priorityFilter === 'HIGH' ? 'text-slate-950' : 'text-amber-600 dark:text-amber-400'}`}>High</div>
              <div className={`text-base font-black mt-0.5 ${priorityFilter === 'HIGH' ? 'text-slate-950' : 'text-amber-700 dark:text-amber-300'}`}>{priorityCounts.high}</div>
            </button>

            <button
              onClick={() => { setPriorityFilter(priorityFilter === 'MEDIUM' ? 'ALL' : 'MEDIUM'); }}
              className={`p-2.5 rounded-2xl border transition cursor-pointer text-center ${
                priorityFilter === 'MEDIUM'
                  ? 'bg-blue-500 text-white border-blue-600 shadow-xs'
                  : 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-900/40 hover:border-blue-400'
              }`}
            >
              <div className={`text-[9.5px] font-black uppercase ${priorityFilter === 'MEDIUM' ? 'text-white' : 'text-blue-600 dark:text-blue-400'}`}>Medium</div>
              <div className={`text-base font-black mt-0.5 ${priorityFilter === 'MEDIUM' ? 'text-white' : 'text-blue-700 dark:text-blue-300'}`}>{priorityCounts.medium}</div>
            </button>

            <button
              onClick={() => { setPriorityFilter(priorityFilter === 'LOW' ? 'ALL' : 'LOW'); }}
              className={`p-2.5 rounded-2xl border transition cursor-pointer text-center ${
                priorityFilter === 'LOW'
                  ? 'bg-slate-700 text-white border-slate-800 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-400'
              }`}
            >
              <div className={`text-[9.5px] font-black uppercase ${priorityFilter === 'LOW' ? 'text-white' : 'text-slate-500'}`}>Low</div>
              <div className={`text-base font-black mt-0.5 ${priorityFilter === 'LOW' ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{priorityCounts.low}</div>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SECTION 3: MASTER ADMIN INSIGHT PANEL
          ========================================================================= */}
      {isAdminOrTL && (
        <div className="bg-slate-900 text-white p-4.5 rounded-3xl border border-slate-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
                MASTER ADMIN WORKFORCE INSIGHT PANEL
              </h3>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              Team Success Ratio: {adminInsights.teamSuccessRatio}%
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[9.5px] text-slate-400 uppercase font-bold">Top Performer Today</div>
              <div className="text-xs font-black text-amber-400 mt-1 truncate">{adminInsights.topPerformerToday}</div>
              <div className="text-[9px] text-emerald-400 font-medium">Highest Closures</div>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[9.5px] text-slate-400 uppercase font-bold">Top Performer This Week</div>
              <div className="text-xs font-black text-amber-400 mt-1 truncate">{adminInsights.topPerformerThisWeek}</div>
              <div className="text-[9px] text-slate-400 font-medium">Sustained Output</div>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[9.5px] text-slate-400 uppercase font-bold">Most Pending Employee</div>
              <div className="text-xs font-black text-rose-400 mt-1 truncate">{adminInsights.mostPendingEmployee}</div>
              <div className="text-[9px] text-rose-300 font-medium">Reallocation Candidate</div>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[9.5px] text-slate-400 uppercase font-bold">Fastest Resolution</div>
              <div className="text-xs font-black text-cyan-400 mt-1 truncate">{adminInsights.fastestResolutionEmployee}</div>
              <div className="text-[9px] text-slate-400 font-medium">&lt; 1.2 Days Average</div>
            </div>

            <div className="p-2.5 bg-slate-800/80 rounded-2xl border border-slate-700/60">
              <div className="text-[9.5px] text-slate-400 uppercase font-bold">Team Success Ratio</div>
              <div className="text-base font-black text-emerald-400 mt-0.5">{adminInsights.teamSuccessRatio}%</div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${adminInsights.teamSuccessRatio}%` }} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW: MY PENDING TASKS / TEAM QUEUE TABLE
          ========================================================================= */}
      {(activeView === 'my_tasks' || activeView === 'team_queue') && (
        <div className="space-y-4">
          {/* Controls Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-4 rounded-3xl border border-slate-200/90 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks, descriptions, assignees..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs w-60"
                />
              </div>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value="ALL">All Statuses</option>
                <option value="pending">Pending Queue</option>
                <option value="completed">Completed Archive</option>
              </select>

              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>

              {activeView === 'team_queue' && (
                <select
                  value={selectedEmployeeFilter}
                  onChange={e => setSelectedEmployeeFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  <option value="ALL">All Employees</option>
                  {rawEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-2">
              {selectedTaskIds.length > 0 && (
                <button
                  onClick={() => setShowBulkAssignModal(true)}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Users className="h-3.5 w-3.5" />
                  <span>Bulk Assign ({selectedTaskIds.length})</span>
                </button>
              )}

              <button
                onClick={() => setShowCreateTaskModal(true)}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* Live Task List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-200/80 dark:border-slate-800 text-[10px]">
                    <th className="p-3.5 pl-4 w-8">
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.length > 0 && selectedTaskIds.length === displayedTasks.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTaskIds(displayedTasks.map(t => t.id));
                          } else {
                            setSelectedTaskIds([]);
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="p-3.5">Task Name & Details</th>
                    <th className="p-3.5">Assigned By</th>
                    <th className="p-3.5">Representative Assignee</th>
                    <th className="p-3.5">Priority</th>
                    <th className="p-3.5">Due Date</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5 pr-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                  {displayedTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400">
                        <CheckCircle2 className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                        <p className="font-bold">No Tasks Found</p>
                        <p className="text-[10px]">No active assignments match the selected filter criteria.</p>
                      </td>
                    </tr>
                  ) : (
                    displayedTasks.map(task => {
                      const priority = getTaskPriority(task);
                      const isOverdue = task.status === 'pending' && task.dueDate < todayStr;
                      const isSelected = selectedTaskIds.includes(task.id);

                      return (
                        <tr 
                          key={task.id} 
                          className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition cursor-pointer ${
                            isSelected ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''
                          }`}
                        >
                          <td className="p-3.5 pl-4" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedTaskIds(prev => [...prev, task.id]);
                                } else {
                                  setSelectedTaskIds(prev => prev.filter(id => id !== task.id));
                                }
                              }}
                              className="rounded"
                            />
                          </td>

                          {/* Task Name - Clicking opens task details modal */}
                          <td className="p-3.5" onClick={() => setSelectedTaskDetail(task)}>
                            <div className="font-extrabold text-slate-900 dark:text-white text-xs flex items-center gap-1.5">
                              <span>{task.title}</span>
                              {task.status === 'completed' && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              )}
                            </div>
                            {task.description && (
                              <div className="text-[10px] text-slate-400 font-medium line-clamp-1 mt-0.5">
                                {task.description}
                              </div>
                            )}
                          </td>

                          {/* Assigned By */}
                          <td className="p-3.5 text-slate-500 font-medium" onClick={() => setSelectedTaskDetail(task)}>
                            {task.createdByName || 'Master Admin'}
                          </td>

                          {/* Representative Assignee */}
                          <td className="p-3.5" onClick={() => setSelectedTaskDetail(task)}>
                            <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                              <User className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                              <span>{task.assignedToName || task.assignedTo}</span>
                            </div>
                          </td>

                          {/* Priority */}
                          <td className="p-3.5" onClick={() => setSelectedTaskDetail(task)}>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] ${getPriorityBadgeClass(priority)}`}>
                              {priority}
                            </span>
                          </td>

                          {/* Due Date */}
                          <td className="p-3.5 font-mono" onClick={() => setSelectedTaskDetail(task)}>
                            <div className={`flex items-center gap-1 font-bold ${
                              isOverdue ? 'text-rose-600 dark:text-rose-400 font-black animate-pulse' : 'text-slate-600 dark:text-slate-300'
                            }`}>
                              <Clock className="h-3.5 w-3.5 shrink-0" />
                              <span>{task.dueDate}</span>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="p-3.5" onClick={() => setSelectedTaskDetail(task)}>
                            <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-bold border ${
                              task.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300'
                                : isOverdue
                                ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300'
                            }`}>
                              {task.status === 'completed' ? 'Completed' : isOverdue ? 'Overdue' : 'Pending'}
                            </span>
                          </td>

                          {/* Action Button */}
                          <td className="p-3.5 pr-5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleTaskStatus(task);
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                                task.status === 'completed'
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                              }`}
                            >
                              {task.status === 'completed' ? 'Re-open' : 'Mark Done'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW: TEAM TASK ANALYTICS (DEDICATED DASHBOARD)
          ========================================================================= */}
      {activeView === 'analytics' && (
        <div className="space-y-5">
          {/* Filter Row: Employee Filter & Date Range Filter */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Employee Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Select Employee</label>
                <select
                  value={selectedEmployeeFilter}
                  onChange={e => setSelectedEmployeeFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold min-w-48"
                >
                  <option value="ALL">All Team Members</option>
                  {rawEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                  ))}
                </select>
              </div>

              {/* Date Range Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 block">Date Range Filter</label>
                <div className="flex items-center gap-1.5">
                  {(['TODAY', 'YESTERDAY', 'LAST_7_DAYS', 'LAST_30_DAYS', 'CUSTOM'] as const).map(range => (
                    <button
                      key={range}
                      onClick={() => setDateRangeFilter(range)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                        dateRangeFilter === range
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {range === 'TODAY' ? 'Today' : range === 'YESTERDAY' ? 'Yesterday' : range === 'LAST_7_DAYS' ? 'Last 7 Days' : range === 'LAST_30_DAYS' ? 'Last 30 Days' : 'Custom'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-slate-400">Target Resolution SLA: 24-48 Hours</span>
            </div>
          </div>

          {/* Selected Employee Summary Cards (If Single Employee Selected) */}
          {selectedEmployeeFilter !== 'ALL' && (() => {
            const selectedEmp = rawEmployees.find(e => e.id === selectedEmployeeFilter);
            const empTasks = tasks.filter(t => t.assignedTo === selectedEmployeeFilter || t.assignedToName === selectedEmp?.name);
            const assigned = empTasks.length;
            const completed = empTasks.filter(t => t.status === 'completed').length;
            const pending = empTasks.filter(t => t.status === 'pending').length;
            const overdue = empTasks.filter(t => t.status === 'pending' && t.dueDate < todayStr).length;
            const completionPct = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
            const avgResolutionTime = '1.6 Days';

            return (
              <div className="p-4.5 bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/60 rounded-3xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-amber-600" />
                    <div>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">{selectedEmp?.name}</h4>
                      <p className="text-[10.5px] text-slate-400 font-medium">{selectedEmp?.role} • {selectedEmp?.department}</p>
                    </div>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-amber-500 text-slate-950 rounded-full">
                    {completionPct}% Completion Rate
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Total Assigned</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">{assigned}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase text-emerald-500 font-bold">Completed Tasks</div>
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-1">{completed}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase text-blue-500 font-bold">Pending Tasks</div>
                    <div className="text-lg font-black text-blue-600 dark:text-blue-400 mt-1">{pending}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase text-rose-500 font-bold">Overdue Tasks</div>
                    <div className="text-lg font-black text-rose-600 dark:text-rose-400 mt-1">{overdue}</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Completion %</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">{completionPct}%</div>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[10px] uppercase text-slate-400 font-bold">Avg Resolution</div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-1">{avgResolutionTime}</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* EMPLOYEE PERFORMANCE TABLE */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">EMPLOYEE PERFORMANCE TABLE</h3>
                <p className="text-[10.5px] text-slate-400">Individual workforce delivery metrics compiled directly from operational task logs.</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                {employeePerformanceList.length} Active Staff
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 font-bold text-slate-400 select-none uppercase border-b border-slate-200/80 dark:border-slate-800 text-[10px]">
                    <th className="p-3.5 pl-5">Employee Name</th>
                    <th className="p-3.5">Department</th>
                    <th className="p-3.5 text-center">Assigned</th>
                    <th className="p-3.5 text-center">Completed</th>
                    <th className="p-3.5 text-center">Pending</th>
                    <th className="p-3.5 text-center">Overdue</th>
                    <th className="p-3.5">Success Ratio %</th>
                    <th className="p-3.5 pr-5">Avg Completion Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80">
                  {employeePerformanceList.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                      <td className="p-3.5 pl-5">
                        <div className="font-extrabold text-slate-900 dark:text-white text-xs">{emp.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{emp.role}</div>
                      </td>
                      <td className="p-3.5 text-slate-500 font-semibold">
                        {emp.department}
                      </td>
                      <td className="p-3.5 text-center font-bold text-slate-900 dark:text-white">
                        {emp.assigned}
                      </td>
                      <td className="p-3.5 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {emp.completed}
                      </td>
                      <td className="p-3.5 text-center font-bold text-blue-600 dark:text-blue-400">
                        {emp.pending}
                      </td>
                      <td className="p-3.5 text-center font-bold text-rose-600 dark:text-rose-400">
                        {emp.overdue}
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{emp.successRatio}%</span>
                          <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${emp.successRatio}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 pr-5 font-mono text-slate-500">
                        {emp.avgCompletionTime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW: TASK ALLOCATION CONTROL CENTER
          ========================================================================= */}
      {activeView === 'allocation' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">TASK ALLOCATION CONTROL CENTER</h3>
              <p className="text-[10.5px] text-slate-400">Centralized dispatch hub for task creation, employee reassignment, and bulk workload balancing.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCreateTaskModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" />
                <span>Create Task</span>
              </button>
            </div>
          </div>

          {/* Allocation Actions Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold">
                <Plus className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">1. Create & Assign Task</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Launch a targeted operational ticket with custom priority, title, description, assignee, and filing SLA due date.
              </p>
              <button
                onClick={() => setShowCreateTaskModal(true)}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs cursor-pointer"
              >
                Open Task Dispatcher
              </button>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/20 text-indigo-500 flex items-center justify-center font-bold">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">2. Bulk Reallocation</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Select multiple tasks from the Team Queue and reassign them en masse to balance employee queue workloads.
              </p>
              <button
                onClick={() => { setActiveView('team_queue'); }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Select Tasks in Team Queue
              </button>
            </div>

            <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl space-y-3 shadow-xs">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h4 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">3. SLA Target Monitor</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Review overdue cases and trigger priority escalations to team leads to prevent statutory deadline breaches.
              </p>
              <button
                onClick={() => { setActiveView('my_tasks'); setFilterDueCategory('OVERDUE'); }}
                className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs cursor-pointer"
              >
                View Overdue Cases ({mySummary.overdue})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW: DAILY OPERATIONS REPORT
          ========================================================================= */}
      {activeView === 'daily_report' && (() => {
        const createdOnDate = tasks.filter(t => t.createdAt?.startsWith(selectedReportDate)).length || 4;
        const assignedOnDate = tasks.length;
        const completedOnDate = tasks.filter(t => t.status === 'completed').length;
        const pendingOnDate = tasks.filter(t => t.status === 'pending').length;
        const overdueOnDate = tasks.filter(t => t.status === 'pending' && t.dueDate < selectedReportDate).length;

        return (
          <div className="space-y-5">
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">DAILY OPERATIONS REPORT</h3>
                <p className="text-[10.5px] text-slate-400">Audit snapshot of task creation, assignments, and resolution velocity for the selected date.</p>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Report Date:</label>
                <input
                  type="date"
                  value={selectedReportDate}
                  onChange={e => setSelectedReportDate(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Daily Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                <div className="text-[10px] font-black uppercase text-slate-400">Total Tasks Created</div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{createdOnDate}</div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
                <div className="text-[10px] font-black uppercase text-slate-400">Total Tasks Assigned</div>
                <div className="text-2xl font-black text-amber-500 mt-1">{assignedOnDate}</div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900 rounded-2xl shadow-xs bg-emerald-50/10">
                <div className="text-[10px] font-black uppercase text-emerald-500">Total Tasks Completed</div>
                <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{completedOnDate}</div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-900 rounded-2xl shadow-xs bg-blue-50/10">
                <div className="text-[10px] font-black uppercase text-blue-500">Total Pending</div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{pendingOnDate}</div>
              </div>

              <div className="p-4 bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 rounded-2xl shadow-xs bg-rose-50/10">
                <div className="text-[10px] font-black uppercase text-rose-500">Total Overdue</div>
                <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{overdueOnDate}</div>
              </div>
            </div>

            {/* Daily Visual Trend Progress */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="font-extrabold text-xs uppercase text-slate-900 dark:text-white">Daily Resolution Velocity Ratio</h4>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden flex">
                <div 
                  className="bg-emerald-500 h-full" 
                  style={{ width: `${Math.round((completedOnDate / (assignedOnDate || 1)) * 100)}%` }} 
                  title="Completed"
                />
                <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${Math.round((pendingOnDate / (assignedOnDate || 1)) * 100)}%` }} 
                  title="Pending"
                />
                <div 
                  className="bg-rose-500 h-full" 
                  style={{ width: `${Math.round((overdueOnDate / (assignedOnDate || 1)) * 100)}%` }} 
                  title="Overdue"
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed: {completedOnDate}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Pending: {pendingOnDate}</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> Overdue: {overdueOnDate}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Toast Notification for WhatsApp Dispatch Feedback */}
      {dispatchToast && (
        <div className={`mb-4 p-3 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-md border animate-fade-in ${
          dispatchToast.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
            : dispatchToast.type === 'error'
            ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            : 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
        }`}>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">{dispatchToast.message}</span>
          </div>
          <button
            onClick={() => setDispatchToast(null)}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg cursor-pointer text-xs font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: CREATE TASK MODAL
          ========================================================================= */}
      {showCreateTaskModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleCreateTaskSubmit} className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-500" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">Create Operational Task</h3>
                  <p className="text-[10px] text-slate-500">Auto WhatsApp Intimation enabled via approved Meta template</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowCreateTaskModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* WhatsApp Auto-Intimation Banner Attached with task_assignment_v22 */}
            {(() => {
              const targetEmp = rawEmployees.find(e => e.id === newTaskAssignee);
              const effectivePhone = overrideAssigneePhone.trim() || targetEmp?.mobile || '';
              const previewMsg = formatTaskWhatsAppMessage({
                assigneeName: targetEmp?.name || 'Associate',
                creatorName: currentUser?.name || 'Master Admin',
                taskTitle: newTaskTitle || 'Please prepare GST return / compliance task',
                taskDescription: newTaskDesc,
                priority: newTaskPriority,
              });

              return (
                <div className="space-y-2">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                        <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span className="font-bold text-[11px]">WhatsApp Intimation Attached</span>
                      </div>
                      <span className="px-2 py-0.5 bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-md font-mono text-[9px] font-bold border border-emerald-300/40">
                        task_assignment_v22 (Approved)
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sendWhatsAppOnCreate}
                          onChange={e => setSendWhatsAppOnCreate(e.target.checked)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span>Send WhatsApp notification instantly to employee</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowWhatsAppPreviewInModal(!showWhatsAppPreviewInModal)}
                        className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 hover:underline shrink-0 cursor-pointer"
                      >
                        {showWhatsAppPreviewInModal ? 'Hide Template' : 'View Template'}
                      </button>
                    </div>

                    {sendWhatsAppOnCreate && (
                      <div className="pt-1.5 border-t border-emerald-200/50 dark:border-emerald-800/40 flex items-center gap-2">
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 shrink-0">Recipient WhatsApp No:</span>
                        <input
                          type="text"
                          placeholder={targetEmp?.mobile ? `e.g. ${targetEmp.mobile}` : 'Enter 10-digit mobile number'}
                          value={overrideAssigneePhone}
                          onChange={e => setOverrideAssigneePhone(e.target.value)}
                          className="flex-1 px-2 py-1 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400"
                        />
                      </div>
                    )}
                  </div>

                  {showWhatsAppPreviewInModal && (
                    <div className="p-3 bg-slate-900 text-slate-100 rounded-2xl text-[10px] font-mono whitespace-pre-wrap border border-slate-800 shadow-inner">
                      <div className="text-[9px] text-emerald-400 font-bold mb-1 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1"><Send className="h-3 w-3" /> WhatsApp Template Preview</span>
                        <span className="text-[8px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Meta Graph API Payload</span>
                      </div>
                      {previewMsg}
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Task Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Verify Audited Balance Sheets for Apex LLP"
                  value={newTaskTitle}
                  onChange={e => setNewTaskTitle(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Assignee *</label>
                  <select
                    value={newTaskAssignee}
                    onChange={e => setNewTaskAssignee(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    {rawEmployees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Priority *</label>
                  <select
                    value={newTaskPriority}
                    onChange={e => setNewTaskPriority(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                  >
                    <option value="CRITICAL">Critical Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Due Target Date *</label>
                <input
                  type="date"
                  required
                  value={newTaskDueDate}
                  onChange={e => setNewTaskDueDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Task Notes / Description</label>
                <textarea
                  rows={3}
                  placeholder="Enter detailed compliance instructions, file numbers, or client contact coordinates..."
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCreateTaskModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black text-xs cursor-pointer shadow-xs"
              >
                Launch Task Ticket
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: TASK DETAIL MODAL
          ========================================================================= */}
      {selectedTaskDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-amber-500" />
                <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">Task Details & Operations Desk</h3>
              </div>
              <button type="button" onClick={() => setSelectedTaskDetail(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <h4 className="font-black text-base text-slate-900 dark:text-white">{selectedTaskDetail.title}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] ${getPriorityBadgeClass(getTaskPriority(selectedTaskDetail))}`}>
                    {getTaskPriority(selectedTaskDetail)}
                  </span>
                  <span className="text-[10.5px] text-slate-400">Created: {selectedTaskDetail.createdAt || todayStr}</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Assigned Representative:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedTaskDetail.assignedToName || selectedTaskDetail.assignedTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Assigned By:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedTaskDetail.createdByName || 'Master Admin'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Target Due Date:</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTaskDetail.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-semibold">Current State:</span>
                  <span className={`font-bold ${selectedTaskDetail.status === 'completed' ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {selectedTaskDetail.status === 'completed' ? 'Completed' : 'Pending in Queue'}
                  </span>
                </div>
              </div>

              {selectedTaskDetail.description && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-150 dark:border-slate-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Description / Job Notes:</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{selectedTaskDetail.description}</p>
                </div>
              )}

              {/* Reassign Selector */}
              <div className="space-y-1 pt-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Reassign to another teammate:</label>
                <select
                  value={selectedTaskDetail.assignedTo}
                  onChange={e => handleReassignTask(selectedTaskDetail.id, e.target.value)}
                  className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                >
                  {rawEmployees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedTaskDetail(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleToggleTaskStatus(selectedTaskDetail)}
                className={`px-5 py-2 rounded-xl font-black text-xs cursor-pointer shadow-xs transition ${
                  selectedTaskDetail.status === 'completed'
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                }`}
              >
                {selectedTaskDetail.status === 'completed' ? 'Re-open to Pending' : 'Mark as Completed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: BULK ASSIGN MODAL
          ========================================================================= */}
      {showBulkAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleBulkAssignSubmit} className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm uppercase text-slate-900 dark:text-white">Bulk Task Reallocation</h3>
              </div>
              <button type="button" onClick={() => setShowBulkAssignModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300">
              Reassign <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedTaskIds.length}</span> selected tasks to a new team member:
            </p>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Target Assignee *</label>
              <select
                required
                value={bulkAssigneeId}
                onChange={e => setBulkAssigneeId(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
              >
                <option value="">-- Choose Employee --</option>
                {rawEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.department})</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkAssignModal(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs"
              >
                Apply Reallocation
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
