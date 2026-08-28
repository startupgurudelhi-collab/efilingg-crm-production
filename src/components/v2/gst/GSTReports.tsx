/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { V2GstClient, V2GstReturnStatus, exportToCSVFile } from '../../../lib/v2_db';
import { Employee } from '../../../types';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, Download, Printer, Filter, Calendar, 
  Users, CheckCircle2, Clock, BarChart3, ChevronRight, FileText
} from 'lucide-react';

interface GSTReportsProps {
  clients: V2GstClient[];
  returns: V2GstReturnStatus[];
  employees: Employee[];
  selectedMonth: string;
}

export default function GSTReports({
  clients,
  returns,
  employees,
  selectedMonth
}: GSTReportsProps) {
  const [reportType, setReportType] = useState<'MONTHLY' | 'QUARTERLY' | 'EMPLOYEE' | 'CLIENT'>('MONTHLY');
  const [reportPeriod, setReportPeriod] = useState(selectedMonth);

  const availableMonths = [
    'May 2026', 'June 2026', 'July 2026', 'August 2026', 
    'September 2026', 'October 2026', 'November 2026', 'December 2026'
  ];

  const availableQuarters = [
    'April-June 2026', 
    'July-September 2026', 
    'October-December 2026', 
    'January-March 2027'
  ];

  // 1. Monthly Report Data
  const monthlyReportData = useMemo(() => {
    const monthlyClients = clients.filter(c => c.returnsMode === 'MONTHLY');
    return monthlyClients.map(c => {
      const ret = returns.find(r => r.gstClientId === c.id && r.period === reportPeriod);
      return {
        clientName: c.clientName,
        firmName: c.firmName || '',
        gstin: c.gstin || 'N/A',
        assignedOfficer: c.assignedEmployeeName || 'Unassigned',
        period: reportPeriod,
        gstr1: ret?.gstr1 || 'NOT FILED',
        gstr1Date: ret?.gstr1Date || '-',
        gstr3b: ret?.gstr3b || 'NOT FILED',
        gstr3bDate: ret?.gstr3bDate || '-',
        isFullyCompliant: ret?.gstr1 === 'FILED' && ret?.gstr3b === 'FILED'
      };
    });
  }, [clients, returns, reportPeriod]);

  // 2. Quarterly Report Data
  const quarterlyReportData = useMemo(() => {
    const quarterlyClients = clients.filter(c => c.returnsMode === 'QUARTERLY');
    return quarterlyClients.map(c => {
      const ret = returns.find(r => r.gstClientId === c.id && r.period === (reportPeriod.includes('April') || reportPeriod.includes('July') ? reportPeriod : 'April-June 2026'));
      const isFiled = ret?.gstr1 === 'FILED' && ret?.gstr3b === 'FILED';
      return {
        clientName: c.clientName,
        firmName: c.firmName || '',
        gstin: c.gstin || 'N/A',
        assignedOfficer: c.assignedEmployeeName || 'Unassigned',
        quarter: reportPeriod.includes('April') || reportPeriod.includes('July') ? reportPeriod : 'April-June 2026',
        qrmpStatus: isFiled ? 'FILED' : 'PENDING'
      };
    });
  }, [clients, returns, reportPeriod]);

  // 3. Employee Performance Report Data
  const employeeReportData = useMemo(() => {
    return employees.map(emp => {
      const empClients = clients.filter(c => c.assignedEmployeeId === emp.id && c.returnsMode === 'MONTHLY');
      const totalClients = empClients.length;

      let gstr1Filed = 0;
      let gstr3bFiled = 0;

      empClients.forEach(cl => {
        const ret = returns.find(r => r.gstClientId === cl.id && r.period === reportPeriod);
        if (ret?.gstr1 === 'FILED') gstr1Filed++;
        if (ret?.gstr3b === 'FILED') gstr3bFiled++;
      });

      const totalRequired = totalClients * 2;
      const totalFiled = gstr1Filed + gstr3bFiled;
      const pendingReturns = totalRequired - totalFiled;
      const successRate = totalRequired > 0 ? Math.round((totalFiled / totalRequired) * 100) : 100;

      return {
        employeeName: emp.name,
        employeeCode: emp.employeeCode || 'EMP',
        role: emp.role,
        totalClients,
        gstr1Filed,
        gstr3bFiled,
        pendingReturns,
        successRate
      };
    });
  }, [employees, clients, returns, reportPeriod]);

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (reportType === 'MONTHLY') {
      const wsData = [
        ['GST Monthly Return Compliance Report', '', '', '', '', '', '', ''],
        ['Period:', reportPeriod, '', '', '', '', '', ''],
        ['Generated Date:', new Date().toLocaleDateString(), '', '', '', '', '', ''],
        [],
        ['Client Name', 'Firm Name', 'GSTIN', 'Assigned Officer', 'Period', 'GSTR-1 Status', 'GSTR-1 Date', 'GSTR-3B Status', 'GSTR-3B Date']
      ];
      monthlyReportData.forEach(row => {
        wsData.push([
          row.clientName, row.firmName, row.gstin, row.assignedOfficer,
          row.period, row.gstr1, row.gstr1Date, row.gstr3b, row.gstr3bDate
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Monthly Returns');
      XLSX.writeFile(wb, `GST_Monthly_Report_${reportPeriod.replace(' ', '_')}.xlsx`);
    } else if (reportType === 'QUARTERLY') {
      const wsData = [
        ['GST Quarterly QRMP Compliance Report', '', '', '', ''],
        ['Quarter:', reportPeriod, '', '', ''],
        ['Generated Date:', new Date().toLocaleDateString(), '', '', ''],
        [],
        ['Client Name', 'Firm Name', 'GSTIN', 'Assigned Officer', 'Quarter', 'QRMP Status']
      ];
      quarterlyReportData.forEach(row => {
        wsData.push([row.clientName, row.firmName, row.gstin, row.assignedOfficer, row.quarter, row.qrmpStatus]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Quarterly Returns');
      XLSX.writeFile(wb, `GST_Quarterly_Report_${reportPeriod.replace(' ', '_')}.xlsx`);
    } else if (reportType === 'EMPLOYEE') {
      const wsData = [
        ['GST Employee Performance Audit Report', '', '', '', '', '', ''],
        ['Period:', reportPeriod, '', '', '', '', ''],
        ['Generated Date:', new Date().toLocaleDateString(), '', '', '', '', ''],
        [],
        ['Officer Name', 'Code', 'Total Clients', 'GSTR-1 Filed', 'GSTR-3B Filed', 'Pending Returns', 'Success Rate %']
      ];
      employeeReportData.forEach(row => {
        wsData.push([
          row.employeeName, row.employeeCode, String(row.totalClients),
          String(row.gstr1Filed), String(row.gstr3bFiled), String(row.pendingReturns), `${row.successRate}%`
        ]);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Officer Performance');
      XLSX.writeFile(wb, `GST_Employee_Report_${reportPeriod.replace(' ', '_')}.xlsx`);
    } else {
      // Client Wise Multi-Period Report
      const wsData = [
        ['GST Client Multi-Period Audit Ledger', '', '', '', '', ''],
        ['Generated Date:', new Date().toLocaleDateString(), '', '', '', ''],
        [],
        ['Client Name', 'Firm Name', 'GSTIN', 'Return Mode', 'Assigned Officer', 'Status']
      ];
      clients.forEach(c => {
        wsData.push([c.clientName, c.firmName || '', c.gstin || '', c.returnsMode, c.assignedEmployeeName || 'Unassigned', 'ACTIVE']);
      });
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Clients Master');
      XLSX.writeFile(wb, `GST_Client_Wise_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (reportType === 'MONTHLY') {
      const headers = ['Client Name', 'Firm Name', 'GSTIN', 'Assigned Officer', 'Period', 'GSTR-1 Status', 'GSTR-1 Date', 'GSTR-3B Status', 'GSTR-3B Date'];
      const rows = monthlyReportData.map(r => [r.clientName, r.firmName, r.gstin, r.assignedOfficer, r.period, r.gstr1, r.gstr1Date, r.gstr3b, r.gstr3bDate]);
      exportToCSVFile(`GST_Monthly_Report_${reportPeriod.replace(' ', '_')}.csv`, headers, rows);
    } else if (reportType === 'QUARTERLY') {
      const headers = ['Client Name', 'Firm Name', 'GSTIN', 'Assigned Officer', 'Quarter', 'QRMP Status'];
      const rows = quarterlyReportData.map(r => [r.clientName, r.firmName, r.gstin, r.assignedOfficer, r.quarter, r.qrmpStatus]);
      exportToCSVFile(`GST_Quarterly_Report_${reportPeriod.replace(' ', '_')}.csv`, headers, rows);
    } else if (reportType === 'EMPLOYEE') {
      const headers = ['Officer Name', 'Code', 'Total Clients', 'GSTR-1 Filed', 'GSTR-3B Filed', 'Pending Returns', 'Success Rate %'];
      const rows = employeeReportData.map(r => [
        r.employeeName,
        r.employeeCode,
        String(r.totalClients),
        String(r.gstr1Filed),
        String(r.gstr3bFiled),
        String(r.pendingReturns),
        `${r.successRate}%`
      ]);
      exportToCSVFile(`GST_Employee_Report_${reportPeriod.replace(' ', '_')}.csv`, headers, rows);
    } else {
      const headers = ['Client Name', 'Firm Name', 'GSTIN', 'Return Mode', 'Assigned Officer'];
      const rows = clients.map(c => [c.clientName, c.firmName || '', c.gstin || '', c.returnsMode, c.assignedEmployeeName || 'Unassigned']);
      exportToCSVFile(`GST_Clients_Report_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }
  };

  // Browser Print / Save PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100">
                GST Enterprise Reports Center
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                Audit & Compliance
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Export high-fidelity compliance reports in Excel (.xlsx), CSV, and PDF print formats.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-2 rounded-xl transition cursor-pointer shadow-xs"
            >
              <FileSpreadsheet className="h-4 w-4" /> Export Excel (.xlsx)
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            >
              <Download className="h-4 w-4 text-slate-500" /> Export CSV
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition cursor-pointer"
            >
              <Printer className="h-4 w-4 text-slate-500" /> Print / PDF
            </button>
          </div>
        </div>

        {/* Report Sub-Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <button
            onClick={() => setReportType('MONTHLY')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              reportType === 'MONTHLY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Monthly Filing Report
          </button>
          <button
            onClick={() => setReportType('QUARTERLY')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              reportType === 'QUARTERLY'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Quarterly Filing Report
          </button>
          <button
            onClick={() => setReportType('EMPLOYEE')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              reportType === 'EMPLOYEE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Employee-Wise Audit Report
          </button>
          <button
            onClick={() => setReportType('CLIENT')}
            className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
              reportType === 'CLIENT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Client Portfolio Master
          </button>

          {/* Period selector for Monthly/Quarterly */}
          {(reportType === 'MONTHLY' || reportType === 'EMPLOYEE') && (
            <div className="ml-auto flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold">Period:</span>
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === 'QUARTERLY' && (
            <div className="ml-auto flex items-center gap-1.5 text-xs">
              <span className="text-slate-400 font-bold">Quarter:</span>
              <select
                value={reportPeriod}
                onChange={(e) => setReportPeriod(e.target.value)}
                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
              >
                {availableQuarters.map(q => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report Table Display */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {reportType === 'MONTHLY' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3.5">Client & Firm</th>
                  <th className="py-3 px-3.5">GSTIN</th>
                  <th className="py-3 px-3.5">Assigned Officer</th>
                  <th className="py-3 px-3.5 text-center">GSTR-1 Status</th>
                  <th className="py-3 px-3.5 text-center">GSTR-3B Status</th>
                  <th className="py-3 px-3.5 text-right pr-4">Compliance Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {monthlyReportData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{row.clientName}</div>
                      <div className="text-[11px] text-slate-400">{row.firmName}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700 dark:text-slate-300 font-bold">{row.gstin}</td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">{row.assignedOfficer}</td>
                    <td className="py-3 px-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                        row.gstr1 === 'FILED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                      }`}>
                        {row.gstr1} {row.gstr1Date !== '-' ? `(${row.gstr1Date})` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                        row.gstr3b === 'FILED' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {row.gstr3b} {row.gstr3bDate !== '-' ? `(${row.gstr3bDate})` : ''}
                      </span>
                    </td>
                    <td className="py-3 px-3.5 text-right pr-4">
                      <span className={`font-black text-xs ${row.isFullyCompliant ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {row.isFullyCompliant ? 'COMPLIANT' : 'PENDING'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'QUARTERLY' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3.5">Client & Firm</th>
                  <th className="py-3 px-3.5">GSTIN</th>
                  <th className="py-3 px-3.5">Assigned Officer</th>
                  <th className="py-3 px-3.5">Quarter</th>
                  <th className="py-3 px-3.5 text-right pr-4">QRMP Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {quarterReportDataView(quarterlyReportData)}
              </tbody>
            </table>
          )}

          {reportType === 'EMPLOYEE' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3.5">Officer Name</th>
                  <th className="py-3 px-3.5 text-center">Total Assigned</th>
                  <th className="py-3 px-3.5 text-center">GSTR-1 Filed</th>
                  <th className="py-3 px-3.5 text-center">GSTR-3B Filed</th>
                  <th className="py-3 px-3.5 text-center">Pending Returns</th>
                  <th className="py-3 px-3.5 text-right pr-4">Success Rate %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {employeeReportData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{row.employeeName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{row.employeeCode}</div>
                    </td>
                    <td className="py-3 px-3.5 text-center font-bold text-slate-700 dark:text-slate-300">{row.totalClients}</td>
                    <td className="py-3 px-3.5 text-center text-emerald-600 font-bold">{row.gstr1Filed}</td>
                    <td className="py-3 px-3.5 text-center text-blue-600 font-bold">{row.gstr3bFiled}</td>
                    <td className="py-3 px-3.5 text-center text-amber-600 font-bold">{row.pendingReturns}</td>
                    <td className="py-3 px-3.5 text-right pr-4">
                      <span className={`font-black text-xs ${row.successRate >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {row.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'CLIENT' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200/80 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3.5">Client & Firm</th>
                  <th className="py-3 px-3.5">GSTIN</th>
                  <th className="py-3 px-3.5">Structure</th>
                  <th className="py-3 px-3.5">Return Mode</th>
                  <th className="py-3 px-3.5">Contact</th>
                  <th className="py-3 px-3.5 text-right pr-4">Assigned Officer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {clients.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition">
                    <td className="py-3 px-3.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{c.clientName}</div>
                      <div className="text-[11px] text-slate-400">{c.firmName}</div>
                    </td>
                    <td className="py-3 px-3.5 font-mono text-slate-700 dark:text-slate-300 font-bold">{c.gstin || 'N/A'}</td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">{c.clientType}</td>
                    <td className="py-3 px-3.5">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">{c.returnsMode}</span>
                    </td>
                    <td className="py-3 px-3.5 text-slate-600 dark:text-slate-400">{c.clientMobile}</td>
                    <td className="py-3 px-3.5 text-right pr-4 font-bold text-slate-700 dark:text-slate-300">
                      {c.assignedEmployeeName || 'Unassigned'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

function quarterReportDataView(data: any[]) {
  return data.map((row, i) => (
    <tr key={i} className="hover:bg-slate-50/70 dark:hover:bg-slate-850/40 transition">
      <td className="py-3 px-3.5">
        <div className="font-bold text-slate-900 dark:text-slate-100">{row.clientName}</div>
        <div className="text-[11px] text-slate-400">{row.firmName}</div>
      </td>
      <td className="py-3 px-3.5 font-mono text-slate-700 dark:text-slate-300 font-bold">{row.gstin}</td>
      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300">{row.assignedOfficer}</td>
      <td className="py-3 px-3.5 font-bold text-slate-700 dark:text-slate-300">{row.quarter}</td>
      <td className="py-3 px-3.5 text-right pr-4">
        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black ${
          row.qrmpStatus === 'FILED' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
        }`}>
          {row.qrmpStatus}
        </span>
      </td>
    </tr>
  ));
}
