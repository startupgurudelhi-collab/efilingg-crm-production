/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { getOfferLetterTemplate } from '../lib/db';
import { X, FileDown, Printer, ShieldCheck, Sparkles, Building2, Phone, Mail, Globe, Award } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import EFilinggLogo from './EFilinggLogo';
import { patchModernColorsForHtml2Canvas } from '../lib/pdfSandboxHelper';

interface OfferLetterModalProps {
  employee: Employee;
  onClose: () => void;
}

export default function OfferLetterModal({ employee, onClose }: OfferLetterModalProps) {
  const [template, setTemplate] = useState(getOfferLetterTemplate());
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Reload template to guarantee fresh edits are pulled
    setTemplate(getOfferLetterTemplate());
  }, [employee]);

  const replacePlaceholders = (text: string) => {
    if (!text) return '';
    const basicPay = employee.salary || 0;
    const hraAllowances = employee.allowances || 0;
    const otherFixed = employee.otherFixedAllowance || 0;
    const incentives = employee.incentivePerConversion || 0;
    const totalSalary = basicPay + hraAllowances + otherFixed;

    return text
      .replace(/\[Candidate Name\]/g, employee.name || 'Rahul Sharma')
      .replace(/\[Designation\]/g, employee.designation || 'Compliance Associate')
      .replace(/\[Joining Date\]/g, employee.dateOfJoining || employee.joinedDate || '2026-06-15')
      .replace(/\[Basic Pay\]/g, `₹${basicPay.toLocaleString('en-IN')}`)
      .replace(/\[Allowances\]/g, `₹${hraAllowances.toLocaleString('en-IN')}`)
      .replace(/\[Other Fixed Allowances\]/g, `₹${otherFixed.toLocaleString('en-IN')}`)
      .replace(/\[Incentive\]/g, `₹${incentives.toLocaleString('en-IN')}`)
      .replace(/\[Total Salary\]/g, `₹${totalSalary.toLocaleString('en-IN')}`);
  };

  const handleDownloadPdf = async () => {
    setIsExporting(true);
    
    // Apply sandbox fix for modern styles containing oklch / oklab colors which crash html2canvas's parser
    const restoreColors = patchModernColorsForHtml2Canvas();
    
    // Temporarily remove dark mode class from html/body roots so that nested elements with 'dark:' classes render strictly in light mode
    const htmlHadDark = document.documentElement.classList.contains('dark');
    const bodyHadDark = document.body.classList.contains('dark');
    if (htmlHadDark) document.documentElement.classList.remove('dark');
    if (bodyHadDark) document.body.classList.remove('dark');

    const page1 = document.getElementById('offer-page-1');
    const page2 = document.getElementById('offer-page-2');
    if (!page1 || !page2) {
      alert('Offer letter pages not found.');
      setIsExporting(false);
      return;
    }

    // Save original placement and styles
    const originalParent1 = page1.parentElement;
    const originalSibling1 = page1.nextSibling;
    const originalStyle1 = page1.getAttribute('style') || '';
    const originalClass1 = page1.className;

    const originalParent2 = page2.parentElement;
    const originalSibling2 = page2.nextSibling;
    const originalStyle2 = page2.getAttribute('style') || '';
    const originalClass2 = page2.className;

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

      const pages = [page1, page2];
      for (let i = 0; i < pages.length; i++) {
        const livePage = pages[i];

        // Format live page style to perfect corporate desktop A4 proportions
        livePage.style.cssText = `
          width: 794px !important;
          min-width: 794px !important;
          max-width: 794px !important;
          height: 1123px !important;
          min-height: 1123px !important;
          max-height: 1123px !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          padding: 42px 48px !important;
          background-color: #ffffff !important;
          color: #0f172a !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          position: relative !important;
          transform: none !important;
        `;

        // Strip off modal padding and dark class and set standard print classes
        livePage.className = livePage.className
          .replace(/\b(p-\d+|md:p-\d+|min-h-\[.*?\]|max-w-\[.*?\])\b/g, '') + ' bg-white text-slate-900';
        livePage.classList.remove('dark');
        livePage.querySelectorAll('.dark').forEach((item) => item.classList.remove('dark'));

        // Move to our temporary layout parent to render perfectly at 794x1123
        tempContainer.appendChild(livePage);

        // Allow microsecond render pass
        await new Promise((resolve) => setTimeout(resolve, 80));

        const canvas = await html2canvas(livePage, {
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
        if (i > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

        // Remove from temporary container immediately to make room for next page or restoring
        tempContainer.removeChild(livePage);
      }

      const safeName = employee.name.trim().replace(/\s+/g, '_');
      pdf.save(`Offer_Letter_${safeName}_EFilingg.pdf`);
    } catch (err) {
      console.error('Failed to export high density PDF offer letter:', err);
      alert('We encountered an error rendering the PDF. Try downloading again.');
    } finally {
      // Restore CSS rules and global getComputedStyle modifications
      restoreColors();

      // 100% Guaranteed recovery of DOM elements back to their modal preview slots
      if (page1 && originalParent1) {
        page1.setAttribute('style', originalStyle1);
        page1.className = originalClass1;
        if (originalSibling1) {
          originalParent1.insertBefore(page1, originalSibling1);
        } else {
          originalParent1.appendChild(page1);
        }
      }

      if (page2 && originalParent2) {
        page2.setAttribute('style', originalStyle2);
        page2.className = originalClass2;
        if (originalSibling2) {
          originalParent2.insertBefore(page2, originalSibling2);
        } else {
          originalParent2.appendChild(page2);
        }
      }

      // Cleanup our helper container
      if (tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }

      // Restore dark mode state
      if (htmlHadDark) document.documentElement.classList.add('dark');
      if (bodyHadDark) document.body.classList.add('dark');
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    const printContent = document.getElementById('printable-offer-letter-document')?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Offer Letter - ${employee.name}</title>
            <style>
              body {
                font-family: 'Inter', sans-serif;
                margin: 0;
                padding: 20px;
                color: #1e293b;
                background: #ffffff;
              }
              .page {
                width: 210mm;
                min-height: 297mm;
                padding: 20mm;
                margin: 0 auto 15px auto;
                box-sizing: border-box;
                background: white;
                position: relative;
              }
              .page-break {
                page-break-after: always;
                border-bottom: 2px dashed #94a3b8;
                margin: 30px 0;
                text-align: center;
              }
              @media print {
                body { padding: 0; }
                .page { margin: 0; border: none; box-shadow: none; }
                .page-break { page-break-after: always; border: none; }
              }
            </style>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                window.close();
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 overflow-y-auto flex items-center justify-center p-0 sm:p-6 font-sans backdrop-blur-xs">
      
      {/* DIALOG BOX */}
      <div className="w-full max-w-4xl bg-slate-100 dark:bg-slate-900 shadow-2xl rounded-none sm:rounded-3xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-screen overflow-hidden">
        
        {/* HEADER CONTROLS */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between pointer-events-auto shrink-0 select-none">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-200">
              Interactive Employee Offer Letter Panel
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-1 px-3 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print Letter</span>
            </button>

            <button
              disabled={isExporting}
              onClick={handleDownloadPdf}
              className={`p-1 px-3 hover:scale-[1.02] text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer ${
                isExporting 
                  ? 'bg-slate-800 text-slate-400' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              <FileDown className="h-3.5 w-3.5" />
              <span>{isExporting ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* COMPACT INFOBAR */}
        <div className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-850 p-3 px-6 flex items-center justify-between text-xs font-semibold leading-none shrink-0 text-slate-500">
          <span className="flex items-center gap-1.5 text-indigo-650 dark:text-indigo-400">
            <ShieldCheck className="h-4 w-4 font-bold" /> Signed by NOMAAN RIZVI (CEO)
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            CANDIDATE ID: {employee.employeeCode || employee.id}
          </span>
        </div>

        {/* LIVE LETTER CONTENT AREA */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-200 dark:bg-slate-950 shadow-inner">
          
          <div 
            id="printable-offer-letter-document" 
            className="text-slate-800 shadow-md border border-slate-300 mx-auto max-w-[210mm] font-serif leading-relaxed text-[11px] select-all relative space-y-6 bg-slate-100 dark:bg-slate-900"
          >
               {/* PAGE 1: GREETING & POSITIONS OUTLINE */}
            <div id="offer-page-1" className="min-h-[297mm] flex flex-col justify-between p-8 md:p-14 bg-white">
              <div>
                {/* Header Letterhead - Corporate Letter Pad Style */}
                <div className="flex flex-row justify-between items-center border-b-2 border-indigo-900 pb-3 mb-2 font-sans text-slate-900">
                  <div className="flex items-center gap-3">
                    <EFilinggLogo size="sm" variant="color" className="scale-110 origin-left" />
                  </div>
                  <div className="text-right space-y-0.5 uppercase tracking-wider text-slate-800">
                    <h1 className="text-[11px] font-black tracking-tight text-indigo-950">
                      {template.companyName}
                    </h1>
                    <p className="text-[7.5px] font-extrabold text-indigo-650 uppercase tracking-normal">
                      CIN: U43299DL2026PTC465499
                    </p>
                    <p className="text-[7.2px] font-semibold text-slate-450 normal-case leading-none">
                      Regd. Off: D-561, Pocket 11, DDA Janta Flats, Jasola, New Delhi 110025, India
                    </p>
                    <div className="flex flex-row items-center justify-end gap-x-2 text-[7.5px] font-bold tracking-normal normal-case pt-0.5 text-slate-500">
                      <span className="flex items-center gap-0.5"><Phone className="h-2 w-2 text-indigo-700" /> {template.contactNumber}</span>
                      <span className="flex items-center gap-0.5"><Mail className="h-2 w-2 text-indigo-700" /> {template.email}</span>
                      <span className="flex items-center gap-0.5"><Globe className="h-2 w-2 text-indigo-700" /> {template.website}</span>
                    </div>
                  </div>
                </div>

                {/* Offer Letter Big Heading Title */}
                <div className="text-center my-4">
                  <h2 className="text-sm font-black font-sans uppercase tracking-[2px] text-slate-900 border-b border-slate-900 pb-1 inline-block">
                    {template.subject}
                  </h2>
                </div>

                {/* Candidate & Date Block details */}
                <div className="space-y-2 my-4 font-sans text-[9.5px] text-slate-600 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <p className="flex justify-between">
                    <span className="font-bold text-slate-400">Date:</span>
                    <span className="font-bold text-slate-850">{new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: '2-digit' })}</span>
                  </p>
                  <div>
                    <span className="font-bold text-slate-400 block">To,</span>
                    <span className="font-black text-slate-900 text-[10.5px] block">{employee.name}</span>
                    <span className="italic block text-slate-500 font-semibold text-[9px] leading-snug">
                      {employee.address || 'Delhi Head Office, Connaught Place, New Delhi'}
                    </span>
                  </div>
                  <p className="border-t border-slate-200/60 pt-1.5 font-medium">
                    <span className="font-bold text-slate-800">Subject:</span> Appointment Offer of Employment as <span className="font-extrabold text-indigo-650">{employee.designation || 'Compliance Associate'}</span>
                  </p>
                </div>

                {/* Salutation Greeting Line */}
                <p className="font-sans font-bold text-slate-900 mb-3 text-[10px]">
                  {replacePlaceholders(template.salutationLine)}
                </p>

                {/* Main Offer Paragraphs block */}
                <div className="space-y-2.5 text-justify font-sans text-[10px] text-slate-750 leading-relaxed font-semibold">
                  <p className="leading-relaxed">
                    {replacePlaceholders(template.bodyParagraph1)}
                  </p>
                  <p className="leading-relaxed">
                    {replacePlaceholders(template.bodyParagraph2)}
                  </p>
                  <p className="leading-relaxed">
                    {replacePlaceholders(template.bodyParagraph3)}
                  </p>
                  <p className="leading-relaxed">
                    {replacePlaceholders(template.bodyParagraph4)}
                  </p>
                  <p className="whitespace-pre-line leading-relaxed">
                    {replacePlaceholders(template.bodyParagraph5)}
                  </p>
                </div>

                {/* SALARY SCHEDULE SUB-COMPILATION */}
                <div className="mt-3.5 p-2.5 bg-indigo-50/20 border border-indigo-100 rounded-xl font-sans shrink-0">
                  <h4 className="text-[9.5px] font-black text-indigo-950 uppercase tracking-wide border-b border-indigo-100/60 pb-1.5 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1"><Award className="h-3 w-3 text-indigo-600" /> SCHEDULE A — COMPENSATION STRUCTURE</span>
                    <span className="text-[8px] text-slate-400 normal-case font-bold">All figures in INR (₹)</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[8.5px] font-semibold text-slate-600">
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span>Basic Salary (Base Pay):</span>
                      <span className="font-extrabold text-slate-900">₹{(employee.salary || 0).toLocaleString('en-IN')} / month</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span>Travel & House Rent Allowance:</span>
                      <span className="font-extrabold text-slate-900">₹{(employee.allowances || 0).toLocaleString('en-IN')} / month</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span>Other Fixed Special Benefits:</span>
                      <span className="font-extrabold text-slate-900">₹{(employee.otherFixedAllowance || 0).toLocaleString('en-IN')} / month</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-0.5">
                      <span>Performance File Incentive:</span>
                      <span className="font-extrabold text-indigo-650">₹{(employee.incentivePerConversion || 0).toLocaleString('en-IN')} / Conversion</span>
                    </div>
                    <div className="flex justify-between col-span-2 pt-1 font-black text-indigo-950 text-[9.5px] border-t border-indigo-100/60">
                      <span>Total Gross Salary (Monthly base CTC):</span>
                      <span>₹{((employee.salary || 0) + (employee.allowances || 0) + (employee.otherFixedAllowance || 0)).toLocaleString('en-IN')} / Month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* CEO SIGN OFF BLOCK & DYNAMIC STAMPS AT LEAF BOTTOM */}
              <div className="border-t border-slate-150 pt-3 flex justify-between items-end font-sans shrink-0">
                <div>
                  <p className="text-[9px] text-slate-450 leading-relaxed">{template.closingHeading}</p>
                  <p className="font-bold text-slate-800 text-[9.5px] mb-6">{template.senderText}</p>
                  
                  {/* SIGNATURE & ROUND EMBOSSED STAMP COHESION */}
                  <div className="relative h-15 w-52">
                    {/* Vector Cursive Sign of CEO Nomaan Rizvi */}
                    <div className="absolute left-1 top-0 pointer-events-none z-10 select-none">
                      <svg width="150" height="38" viewBox="0 0 150 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11 23C26 8 36 3 46 13C56 23 31 33 61 18C91 3 111 28 131 13C136 10 141 20 146 23" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M26 13C41 18 61 3 71 10" stroke="#1e40af" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M51 33C81 30 111 31 136 28" stroke="#1c3d5a" strokeWidth="1" strokeDasharray="3 3"/>
                      </svg>
                      <span className="text-[7.5px] text-blue-700 font-mono -mt-1 block font-bold italic text-center">Digitally signed by Nomaan Rizvi</span>
                    </div>

                    {/* Red Corporate seal matching logo and user attachment of Efilingg.com */}
                    <div className="absolute left-28 -top-14 pointer-events-none opacity-90 select-none z-0 scale-90">
                      <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* Outer stamp rings */}
                        <circle cx="60" cy="60" r="54" stroke="#B91C1C" strokeWidth="2.5" />
                        <circle cx="60" cy="60" r="50" stroke="#B91C1C" strokeWidth="0.8" />
                        <circle cx="60" cy="60" r="38" stroke="#B91C1C" strokeWidth="0.8" />
                        
                        {/* Safe Curved Text Top using individual rotated characters to support html2canvas & avoid crashes */}
                        { "EFILINGG FINANCIAL SERVICES PVT LTD".split("").map((char, index, arr) => {
                          const angle = -210 + (index * 240) / (arr.length - 1);
                          const rad = (angle * Math.PI) / 180;
                          const rx = 60 + 44 * Math.cos(rad);
                          const ry = 60 + 44 * Math.sin(rad);
                          return (
                            <text
                              key={`t-${index}`}
                              x={rx}
                              y={ry}
                              fill="#B91C1C"
                              fontSize="5.2"
                              fontWeight="900"
                              fontFamily="Inter, Arial, sans-serif"
                              textAnchor="middle"
                              transform={`rotate(${angle + 90}, ${rx}, ${ry})`}
                            >
                              {char}
                            </text>
                          );
                        })}
                        
                        {/* Safe Curved Text Bottom: ★ Delhi ★ */}
                        { "★ DELHI ★".split("").map((char, index, arr) => {
                          const angle = 45 + (index * 90) / (arr.length - 1);
                          const rad = (angle * Math.PI) / 180;
                          const rx = 60 + 44 * Math.cos(rad);
                          const ry = 60 + 44 * Math.sin(rad);
                          return (
                            <text
                              key={`b-${index}`}
                              x={rx}
                              y={ry}
                              fill="#B91C1C"
                              fontSize="6.5"
                              fontWeight="900"
                              fontFamily="Inter, Arial, sans-serif"
                              textAnchor="middle"
                              transform={`rotate(${angle - 90}, ${rx}, ${ry})`}
                            >
                              {char}
                            </text>
                          );
                        })}
                        
                        {/* Inner Colored Logo elements as seen on attached stamp image */}
                        {/* 1. Gold Circle with Lowercase 'e' (mini) */}
                        <circle cx="32" cy="51" r="4.5" fill="#E5A93B" />
                        <text x="32" y="54.5" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="9" fill="#FFFFFF">e</text>
                        
                        {/* 2. Brand text (mini): Filin and gg.com */}
                        <text x="38" y="54" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="7.5" fill="#0D1321" letterSpacing="-0.2">Filin</text>
                        <text x="66" y="54" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="7.5" fill="#0D1321" letterSpacing="-0.2">gg.com</text>
                        
                        {/* 3. Mini Golden Vertical Arrow */}
                        <rect x="62.5" y="44" width="1.2" height="10" fill="#E5A93B" rx="0.4" />
                        <path d="M60 45 L63.1 41.5 L66.2 45 Z" fill="#E5A93B" />
                        
                        {/* 4. Mini Golden Sweeping Curve Below */}
                        <path d="M25 57.5 Q60 62 95 57.5 Q60 59.2 25 57.5 Z" fill="#E5A93B" />
                        
                        {/* 5. Under-logo "Compliance Made Easy" mini text */}
                        <text x="60" y="66" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="900" fontSize="3.5" fill="#1E293B" letterSpacing="0.1">Compliance Made Easy</text>
                      </svg>
                    </div>
                  </div>

                  <p className="font-extrabold text-slate-900 text-[10px]">{template.signatoryName}</p>
                  <p className="text-[8.5px] text-slate-500 uppercase tracking-wider font-extrabold">{template.signatoryTitle}</p>
                </div>

                <div className="text-right text-[9px] text-slate-400 font-sans font-medium">
                  <span>Page 1 of 2</span>
                </div>
              </div>

            </div>

            {/* PAGE BREAK (FOR MULTI-PAGE ALIGNED FEEL) */}
            <div className="page-break" />

            {/* PAGE 2: CONDITIONS OF EMPLOYMENT */}
            <div id="offer-page-2" className="min-h-[297mm] flex flex-col justify-between p-8 md:p-14 pt-8 bg-white">
              <div>
                {/* Simplified header on Page 2 */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 font-sans text-slate-900">
                  <span className="text-[8px] font-black text-slate-450 uppercase">{template.companyName}</span>
                  <span className="text-[8px] text-indigo-650 font-extrabold tracking-wide font-sans">TERMS & CONDITIONS OF EMPLOYMENT</span>
                </div>

                {/* Rendering complete dynamic legal terms */}
                <div className="space-y-2.5 text-justify font-sans text-[8.5px] leading-normal text-slate-650 pl-1">
                  {template.termsAndConditions.map((term, tIdx) => (
                    <div key={tIdx} className="space-y-px">
                      <span className="font-black text-[8.5px] text-slate-900 block font-sans">
                        {tIdx + 1}. {term.includes(':') ? term.split(':')[0] : 'DECLARATION CLAUSE'}
                      </span>
                      <p className="pl-3.5 text-slate-650 text-justify leading-snug font-medium">
                        {term.includes(':') ? term.split(':').slice(1).join(':').trim() : term}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Complete signoff accept block */}
                <div className="mt-5 p-3.5 border border-slate-200/70 rounded-xl bg-slate-50/70 font-sans space-y-2 text-[9px] leading-relaxed">
                  <p className="font-black uppercase text-slate-905 border-b border-slate-200 pb-1 font-sans tracking-wide text-[8.5px]">
                    Employee Acceptance Confirmation
                  </p>
                  <p className="italic text-slate-600 font-medium">
                    I, <span className="underline font-bold px-1 text-indigo-700">{employee.name}</span>, have read, understood, and accepted the terms and conditions mentioned in this Offer Letter and agree to abide by the policies of EFILINGG Financial Services Pvt. Ltd.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-6 pt-2 text-slate-700 font-semibold text-[9px]">
                    <div className="border-t border-slate-200 pt-1.5 font-sans">
                      <p className="font-bold text-slate-900">Employee Signature</p>
                      <p className="text-[8px] text-slate-400 font-medium">Sign manually inside portal copy</p>
                    </div>
                    <div className="border-t border-slate-200 pt-1.5 font-sans">
                      <p className="font-bold text-slate-900">Candidate Name</p>
                      <p className="text-[8px] text-slate-650 font-medium">{employee.name}</p>
                    </div>
                    <div className="border-t border-slate-200 pt-1.5 text-sans">
                      <p className="font-bold text-slate-900">Execution Date</p>
                      <p className="text-[8px] text-slate-450 font-medium font-mono">____ / ____ / 2026</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Page 2 Footer block */}
              <div className="pt-3 border-t border-slate-100 flex justify-between items-center font-sans shrink-0">
                <span className="text-[8.5px] text-slate-400 font-bold">EFILINGG Financial Services Pvt. Ltd. • HR Desk</span>
                <span className="text-[8.5px] text-slate-400 font-bold font-sans">Page 2 of 2</span>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
