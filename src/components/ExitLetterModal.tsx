/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee, ResignationRequest } from '../types';
import { getEmployees, getOfferLetterTemplate } from '../lib/db';
import { X, FileDown, Printer, ShieldCheck, Sparkles, Building2, Phone, Mail, Globe, Award, CheckCircle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import EFilinggLogo from './EFilinggLogo';
import { patchModernColorsForHtml2Canvas } from '../lib/pdfSandboxHelper';

interface ExitLetterModalProps {
  resignation: ResignationRequest;
  onClose: () => void;
}

export default function ExitLetterModal({ resignation, onClose }: ExitLetterModalProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [offerTemplate, setOfferTemplate] = useState(getOfferLetterTemplate());

  useEffect(() => {
    // Look up employee
    const emps = getEmployees();
    const found = emps.find(e => e.id === resignation.employeeId);
    if (found) {
      setEmployee(found);
    }
  }, [resignation]);

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    
    // Apply sandbox fix for modern styles containing oklch / oklab colors which crash html2canvas's parser
    const restoreColors = patchModernColorsForHtml2Canvas();
    
    // Temporarily remove dark mode class from html/body roots so that nested elements with 'dark:' classes render strictly in light mode
    const htmlHadDark = document.documentElement.classList.contains('dark');
    const bodyHadDark = document.body.classList.contains('dark');
    if (htmlHadDark) document.documentElement.classList.remove('dark');
    if (bodyHadDark) document.body.classList.remove('dark');

    const pageElement = document.getElementById('exit-letter-page');
    if (!pageElement) {
      alert('Exit letter page element not found.');
      setIsExporting(false);
      return;
    }

    // Save original placement and styles
    const originalParent = pageElement.parentElement;
    const originalSibling = pageElement.nextSibling;
    const originalStyle = pageElement.getAttribute('style') || '';
    const originalClass = pageElement.className;

    // Create a temporary layout container at opacity 0.01 to ensure full browser lay-out paint without user flashing
    const tempContainer = document.createElement('div');
    tempContainer.id = 'pdf-render-temp-container';
    tempContainer.style.position = 'fixed';
    tempContainer.style.top = '0';
    tempContainer.style.left = '0';
    tempContainer.style.width = '794px';
    tempContainer.style.minWidth = '794px';
    tempContainer.style.maxWidth = '794px';
    tempContainer.style.height = '1123px';
    tempContainer.style.minHeight = '1123px';
    tempContainer.style.maxHeight = '1123px';
    tempContainer.style.overflow = 'hidden';
    tempContainer.style.zIndex = '999999';
    tempContainer.style.opacity = '0.01';
    tempContainer.style.background = '#ffffff';
    tempContainer.style.pointerEvents = 'none';
    document.body.appendChild(tempContainer);

    try {
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Format live page style to perfect corporate desktop A4 proportions
      pageElement.style.cssText = `
        width: 794px !important;
        min-width: 794px !important;
        max-width: 794px !important;
        height: 1123px !important;
        min-height: 1123px !important;
        max-height: 1123px !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 50px 55px !important;
        background-color: #ffffff !important;
        color: #0f172a !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        position: relative !important;
        transform: none !important;
      `;

      // Strip off modal padding and dark class and set standard print classes
      pageElement.className = pageElement.className
        .replace(/\b(p-\d+|md:p-\d+|min-h-\[.*?\]|max-w-\[.*?\])\b/g, '') + ' bg-white text-slate-900';
      pageElement.classList.remove('dark');
      pageElement.querySelectorAll('.dark').forEach((item) => item.classList.remove('dark'));

      // Move to our temporary layout parent to render perfectly at 794x1123
      tempContainer.appendChild(pageElement);

      // Allow microsecond render pass
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(pageElement, {
        scale: 2.2, // Retain high resolution and sharp text
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

      const fileName = `Relieving_Letter_${employee?.name ? employee.name.replace(/\s+/g, '_') : 'Employee'}.pdf`;
      pdf.save(fileName);

    } catch (err) {
      console.error('[ExitLetterModal] PDF compilation failure:', err);
      alert('Failed to compile Relieving Letter PDF. Please check connection and try again.');
    } finally {
      // Restore page element to original React tree placement and styles
      pageElement.setAttribute('style', originalStyle);
      pageElement.className = originalClass;
      if (originalSibling) {
        originalParent?.insertBefore(pageElement, originalSibling);
      } else {
        originalParent?.appendChild(pageElement);
      }

      // Cleanup
      tempContainer.remove();
      restoreColors();
      if (htmlHadDark) document.documentElement.classList.add('dark');
      if (bodyHadDark) document.body.classList.add('dark');
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!employee) {
    return (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl text-center space-y-2">
          <p className="text-slate-600 dark:text-slate-450 text-sm">Loading employee exit record...</p>
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-205 rounded-xl text-xs">Close</button>
        </div>
      </div>
    );
  }

  const todayStr = new Date(resignation.actedAt || Date.now()).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
      <div className="bg-slate-50 dark:bg-slate-950 w-full max-w-4xl rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 my-8">
        
        {/* Modal Controls Header */}
        <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2">
            <div className="bg-emerald-50 dark:bg-emerald-950/50 p-1.5 rounded-lg text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">Resignation Relieving Certificate</h4>
              <p className="text-xs text-slate-500">Official exit experience certificate for {employee.name}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 py-1.5 px-3.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className="flex items-center space-x-1.5 py-1.5 px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{isExporting ? 'Compiling PDF...' : 'Download PDF'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Outer scroll container for previewing letter */}
        <div className="flex-1 p-6 overflow-y-auto flex justify-center bg-slate-100 dark:bg-slate-900/50">
          
          {/* Printable page layout inside browser */}
          <div
            id="exit-letter-page"
            className="w-[210mm] min-h-[297mm] bg-white p-[20mm] text-slate-800 relative flex flex-col justify-between shadow-lg text-sm leading-relaxed"
            style={{
              boxSizing: 'border-box',
              fontFamily: 'Inter, system-ui, sans-serif'
            }}
          >
            {/* 1. Header Area with Logo & Company branding */}
            <div className="space-y-6">
              <div className="flex items-start justify-between pb-6 border-b border-slate-150">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-indigo-750">
                    <EFilinggLogo className="h-7 w-7 text-emerald-600" />
                    <span className="font-extrabold text-lg tracking-tight font-sans text-slate-900">
                      Filin<span className="text-emerald-600">Tgg</span>.com
                    </span>
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-emerald-600 pl-1">
                    {offerTemplate.tagline || 'COMPLIANCE MADE EASY'}
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-500 font-sans space-y-0.5">
                  <div className="font-bold text-slate-800 uppercase tracking-wider">{offerTemplate.companyName || 'INTEGRATED E-FILING SERVICES'}</div>
                  <div>Phone: {offerTemplate.contactNumber || '+91 9217666235'}</div>
                  <div>Email: {offerTemplate.email || 'support@efilingg.com'}</div>
                  <div>Web: {offerTemplate.website || 'www.efilingg.com'}</div>
                  <div className="max-w-[220px] ml-auto leading-normal whitespace-pre-line mt-1">{offerTemplate.officeAddress || 'Sector 15-A, Noida, UP - 201301'}</div>
                </div>
              </div>

              {/* Letter Metadata Info Row */}
              <div className="flex justify-between items-start text-xs text-slate-600">
                <div className="space-y-1">
                  <div><strong>Reference No:</strong> EFL/EX-{resignation.id}</div>
                  <div><strong>Date of Acceptance:</strong> {todayStr}</div>
                </div>
                <div className="text-right">
                  <strong>Status:</strong> Approved Exit Relieving
                </div>
              </div>

              {/* Relieving Certificate Title */}
              <div className="text-center my-6">
                <h2 className="text-base font-extrabold tracking-wider uppercase text-slate-900 border-b-2 border-slate-900 inline-block pb-1">
                  Relieving & Work Experience Certificate
                </h2>
              </div>

              {/* Employee Address Block */}
              <div className="space-y-1 text-xs text-slate-700">
                <div>To,</div>
                <div className="font-extrabold text-slate-900 text-sm">{employee.name}</div>
                <div><strong>Employee Code:</strong> {employee.employeeCode || 'EFL-MEMBER'}</div>
                <div><strong>Designation:</strong> {employee.designation || 'Specialist Officer'}</div>
                {employee.address && (
                  <div className="max-w-md text-slate-500 italic mt-1 leading-normal">
                    Address: {employee.address}
                  </div>
                )}
              </div>

              {/* Body Paragraphs */}
              <div className="space-y-4 text-xs text-slate-800 leading-relaxed text-justify mt-6">
                <p>
                  <strong>Dear {employee.name},</strong>
                </p>
                <p>
                  This is with reference to your formal resignation letter submitted on <strong>{new Date(resignation.submissionDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> from the position of <strong>{employee.designation || 'Compliance Associate'}</strong>.
                </p>
                <p>
                  We wish to inform you that your resignation has been accepted by the management, and you are officially relieved from all duties and service agreements with <strong>{offerTemplate.companyName || 'FilinTgg.com'}</strong> effective at the close of business hours on <strong>{new Date(resignation.requestedExitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                </p>
                <p>
                  During your tenure of employment from your date of joining <strong>{new Date(employee.dateOfJoining || employee.joinedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> to <strong>{new Date(resignation.requestedExitDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>, you have displayed standard professionalism, cooperation, and client service metrics in our <strong>{employee.department || 'Sales & Compliance'}</strong> department.
                </p>
                <p>
                  Your final settlements, including salaries, due operational incentives, and travel allowances, have been processed, audited, and cleared in full. No outstanding dues remain from either party. All client leads, directories, standard tariffs, or active proposals mapped under your authorized login credentials have been safely archived and migrated to active team members.
                </p>
                <p>
                  We express our sincere appreciation for your valuable contributions and standard compliance work during your association with the agency, and we wish you success and prosperity in all your future professional developments and personal endeavors.
                </p>
              </div>
            </div>

            {/* Bottom Signature Area */}
            <div className="pt-12 mt-12 border-t border-slate-100 flex justify-between items-end">
              <div className="text-[10px] text-slate-500">
                <span className="block font-bold text-slate-700">FilinTgg.com HR Portal</span>
                This is a digitally verified Release & Relieving Letter of compliance.
              </div>
              <div className="text-right space-y-4">
                <div className="h-10"></div> {/* Sign stamp slot */}
                <div className="text-xs">
                  <span className="block font-extrabold text-slate-900 border-t border-slate-300 pt-1">Authorized HR Signatory</span>
                  <span className="text-[10px] text-slate-500">{offerTemplate.signatoryName || 'Master Administrator'}</span>
                  <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-400">{offerTemplate.signatoryTitle || 'Director Operations'}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
