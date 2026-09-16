import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { patchModernColorsForHtml2Canvas } from '../../lib/pdfSandboxHelper';
import { 
  BalanceSheetRecord, 
  calculateBalanceSheetTotals,
  saveBalanceSheetRecord 
} from '../../lib/balanceSheet_db';
import { getV2Auditors, V2Auditor } from '../../lib/v2_db';
import { 
  Printer, ArrowLeft, CheckCircle2, AlertTriangle, ShieldCheck, 
  Check, X, FileText, Image as ImageIcon, Calendar, Edit3,
  Download, Loader2, ExternalLink
} from 'lucide-react';

interface BalanceSheetPdfPreviewProps {
  data: BalanceSheetRecord;
  onBack?: () => void;
  onEdit?: () => void;
}

// Indian Rupee currency formatter without symbol (for ledger columns)
function formatAmount(val: number | undefined | null): string {
  if (val === undefined || val === null || isNaN(val)) return '0.00';
  return Number(val).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export default function BalanceSheetPdfPreview({ data, onBack, onEdit }: BalanceSheetPdfPreviewProps) {
  const printContainerRef = useRef<HTMLDivElement>(null);
  const totals = calculateBalanceSheetTotals(data);

  // CA Auditors from CA Master
  const allAuditors = getV2Auditors();
  const initialCa = allAuditors.find(a => a.id === data.caAuditorId) ||
                    allAuditors.find(a => a.name.toLowerCase().includes(data.caName?.toLowerCase() || '')) ||
                    allAuditors[0];

  // Print & PDF Download States
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printWithCaStamp, setPrintWithCaStamp] = useState(true);
  const [printWithUdin, setPrintWithUdin] = useState(true);
  const [selectedAuditorId, setSelectedAuditorId] = useState(initialCa?.id || '');
  const [udinNo, setUdinNo] = useState(data.udin || '26578691AUSCCL3806');
  const [udinDate, setUdinDate] = useState(data.dateOfSigning || new Date().toLocaleDateString('en-GB'));
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState('');
  const [downloadSuccessMsg, setDownloadSuccessMsg] = useState('');

  const currentAuditor: V2Auditor | undefined = allAuditors.find(a => a.id === selectedAuditorId) || initialCa;

  // Persists UDIN and CA attestation data to current balance sheet record
  const syncAttestationData = () => {
    data.udin = printWithUdin ? udinNo : '';
    data.dateOfSigning = udinDate;
    if (currentAuditor) {
      data.caAuditorId = currentAuditor.id;
      data.caFirmName = currentAuditor.firmName || data.caFirmName;
      data.caName = currentAuditor.name || data.caName;
      data.caMembershipNo = currentAuditor.membershipNo || data.caMembershipNo;
      data.caFrn = currentAuditor.frnNo || data.caFrn;
    }
    if (data.id) {
      try {
        saveBalanceSheetRecord(data);
      } catch (e) {
        console.error('Failed to save updated balance sheet UDIN', e);
      }
    }
  };

  // Direct High-Resolution Multi-Page PDF Download (jsPDF + html2canvas + modern color patcher)
  const handleDownloadPdf = async () => {
    syncAttestationData();
    setIsGeneratingPdf(true);
    setShowPrintModal(false);
    setDownloadProgress('Preparing high-definition pages...');

    let unpatchColors: (() => void) | null = null;
    let tempContainer: HTMLElement | null = null;

    try {
      if (!printContainerRef.current) {
        throw new Error('Document container not found');
      }

      // Collect all 3 sheet pages (Page 1: Trading/P&L, Page 2: Balance Sheet, Page 3: Annexure A)
      const pages = printContainerRef.current.querySelectorAll<HTMLElement>('.sheet-page');
      if (!pages || pages.length === 0) {
        throw new Error('No pages found to export');
      }

      // 1. Monkeypatch modern CSS colors (OKLCH/OKLAB) to standard RGB for html2canvas
      unpatchColors = patchModernColorsForHtml2Canvas();

      // 2. Create isolated sandbox container at standard desktop A4 width (794px = 210mm at 96 DPI)
      tempContainer = document.createElement('div');
      tempContainer.id = 'balancesheet-render-sandbox';
      tempContainer.style.position = 'fixed';
      tempContainer.style.top = '0';
      tempContainer.style.left = '-9999px';
      tempContainer.style.width = '794px';
      tempContainer.style.minWidth = '794px';
      tempContainer.style.maxWidth = '794px';
      tempContainer.style.backgroundColor = '#ffffff';
      tempContainer.style.zIndex = '-9999';
      tempContainer.style.pointerEvents = 'none';
      tempContainer.style.fontFamily = "'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif";
      document.body.appendChild(tempContainer);

      const fontEnforceStyle = document.createElement('style');
      fontEnforceStyle.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Tinos:ital,wght@0,400;0,700;1,400;1,700&display=swap');
        #balancesheet-render-sandbox,
        #balancesheet-render-sandbox * {
          font-family: 'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif !important;
          -webkit-font-smoothing: antialiased !important;
          -moz-osx-font-smoothing: grayscale !important;
          text-rendering: geometricPrecision !important;
          color: #000000 !important;
          -webkit-text-stroke: 0.12px #000000;
        }
      `;
      tempContainer.appendChild(fontEnforceStyle);

      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageLabels = [
        'Page 1 (Trading & Profit & Loss A/c)',
        'Page 2 (Balance Sheet)',
        'Page 3 (Annexure A - Depreciation Chart)'
      ];

      for (let i = 0; i < pages.length; i++) {
        setDownloadProgress(`Rendering ${pageLabels[i] || `Page ${i + 1}`} in High-Definition...`);

        // Clone page into sandbox container to guarantee exact desktop A4 width and zero squishing
        const clonedPage = pages[i].cloneNode(true) as HTMLElement;
        clonedPage.style.width = '794px';
        clonedPage.style.minWidth = '794px';
        clonedPage.style.maxWidth = '794px';
        clonedPage.style.boxSizing = 'border-box';
        clonedPage.style.margin = '0';
        clonedPage.style.padding = '26px 34px';
        clonedPage.style.backgroundColor = '#ffffff';
        clonedPage.style.boxShadow = 'none';
        clonedPage.style.border = 'none';
        clonedPage.style.fontFamily = "'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif";

        tempContainer.innerHTML = '';
        tempContainer.appendChild(fontEnforceStyle);
        tempContainer.appendChild(clonedPage);

        // Ensure fonts are fully loaded
        try {
          if (document.fonts) {
            await document.fonts.ready;
          }
        } catch {
          // ignore font loading issues if any
        }

        // Allow microtask DOM layout settling
        await new Promise((resolve) => setTimeout(resolve, 80));

        if (i > 0) {
          pdf.addPage('a4', 'portrait');
        }

        // Render page with html2canvas at scale 3.5 (~336 DPI) for razor sharp text without compression blur
        const canvas = await html2canvas(clonedPage, {
          scale: 3.5,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
        });

        // Use lossless PNG instead of lossy JPEG to completely eliminate text compression artifacts
        const imgData = canvas.toDataURL('image/png');
        const pdfWidthMm = 210;
        const pdfHeightMm = 297;
        const imgHeightMm = (canvas.height * pdfWidthMm) / canvas.width;

        if (imgHeightMm > pdfHeightMm) {
          // If page height slightly exceeds 297mm, scale proportionally to fit A4 page
          const ratio = pdfHeightMm / imgHeightMm;
          const scaledWidth = pdfWidthMm * ratio;
          const offsetX = (pdfWidthMm - scaledWidth) / 2;
          pdf.addImage(imgData, 'PNG', offsetX, 0, scaledWidth, pdfHeightMm, undefined, 'SLOW');
        } else {
          pdf.addImage(imgData, 'PNG', 0, 0, pdfWidthMm, imgHeightMm, undefined, 'SLOW');
        }
      }

      setDownloadProgress('Saving PDF file...');
      const cleanFirm = (data.firmName || 'Proprietorship').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanFy = (data.financialYear || '2025-26').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `${cleanFirm}_Balance_Sheet_${cleanFy}.pdf`;

      pdf.save(fileName);
      setDownloadSuccessMsg(`Downloaded: ${fileName}`);
      setTimeout(() => setDownloadSuccessMsg(''), 5000);
    } catch (err) {
      console.error('PDF generation error:', err);
      // Fallback: open print window with full styling
      handleOpenPrintWindow();
    } finally {
      if (tempContainer && tempContainer.parentNode) {
        tempContainer.parentNode.removeChild(tempContainer);
      }
      if (unpatchColors) {
        unpatchColors();
      }
      setIsGeneratingPdf(false);
      setDownloadProgress('');
    }
  };

  // Open standalone clean print window (Injects ALL application stylesheets & print rules for 100% exact match)
  const handleOpenPrintWindow = () => {
    syncAttestationData();
    setShowPrintModal(false);

    if (!printContainerRef.current) {
      window.print();
      return;
    }

    try {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        // Collect all existing stylesheets & style tags from the current document
        const existingStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
          .map((el) => el.outerHTML)
          .join('\n');

        printWindow.document.open();
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8" />
              <title>${data.firmName || 'Balance Sheet'} - FY ${data.financialYear || ''}</title>
              ${existingStyles}
              <style>
                @page {
                  size: A4 portrait;
                  margin: 0;
                }
                html, body {
                  margin: 0 !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                  font-family: 'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif !important;
                  color: #000000 !important;
                  width: 210mm !important;
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                .no-print, nav, header, button {
                  display: none !important;
                }
                .printable-document,
                .sheet-page,
                .sheet-page * {
                  font-family: 'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif !important;
                }
                .printable-document {
                  display: block !important;
                  width: 210mm !important;
                  margin: 0 auto !important;
                  padding: 0 !important;
                  background: #ffffff !important;
                }
                .sheet-page {
                  display: block !important;
                  width: 210mm !important;
                  max-width: 210mm !important;
                  box-sizing: border-box !important;
                  margin: 0 auto !important;
                  padding: 8mm 10mm !important;
                  page-break-after: always !important;
                  break-after: page !important;
                  background: #ffffff !important;
                  border: none !important;
                  box-shadow: none !important;
                }
                .sheet-page:last-child {
                  page-break-after: auto !important;
                  break-after: auto !important;
                }
                table {
                  width: 100% !important;
                  border-collapse: collapse !important;
                  table-layout: fixed !important;
                }
                .header-container {
                  text-align: center !important;
                }
                .signature-container {
                  display: flex !important;
                  justify-content: space-between !important;
                  align-items: flex-end !important;
                  width: 100% !important;
                }
                .proprietor-signature {
                  text-align: right !important;
                }
              </style>
            </head>
            <body>
              ${printContainerRef.current.innerHTML}
              <script>
                window.onload = function() {
                  window.focus();
                  setTimeout(function() {
                    window.print();
                  }, 350);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } catch (e) {
      console.warn('Fallback print:', e);
      window.print();
    }
  };

  // Handles proceeding with print after configuration
  const handleProceedPrint = () => {
    syncAttestationData();
    setShowPrintModal(false);
    setTimeout(() => {
      handleOpenPrintWindow();
    }, 150);
  };

  // Realistic CA Round Stamp component with complete inline styling (immune to CSS dropouts)
  const renderCaStamp = () => {
    // If stamp printing is disabled, preserve the exact physical space for manual rubber stamp on paper!
    if (!printWithCaStamp) {
      return (
        <div 
          className="ca-stamp-space-placeholder select-none"
          style={{
            width: '138px',
            height: '138px',
            minWidth: '138px',
            minHeight: '138px',
            maxWidth: '138px',
            maxHeight: '138px',
            margin: '4px 0',
            display: 'block',
            boxSizing: 'border-box'
          }}
          aria-hidden="true"
        />
      );
    }

    // 1. If auditor has an uploaded stamp image in CA Master, use it (standard ~36mm physical stamp size)!
    if (currentAuditor?.stampUrl) {
      return (
        <div style={{ margin: '4px 0', padding: '2px 0', userSelect: 'none' }}>
          <img 
            src={currentAuditor.stampUrl} 
            alt="Official CA Stamp" 
            style={{ 
              width: '138px', 
              height: '138px', 
              minWidth: '138px',
              minHeight: '138px',
              maxWidth: '138px',
              maxHeight: '138px',
              objectFit: 'contain', 
              mixBlendMode: 'multiply' 
            }} 
          />
        </div>
      );
    }

    // 2. Otherwise render authentic round CA seal with their details at physical rubber stamp size (~36.5mm / 138px)
    const caFirm = currentAuditor?.firmName || data.caFirmName || 'CHARTERED ACCOUNTANT';
    const caMem = currentAuditor?.membershipNo || data.caMembershipNo || '578691';
    const caFrn = currentAuditor?.frnNo || data.caFrn || '012345N';

    return (
      <div 
        className="ca-round-seal select-none"
        style={{
          width: '138px',
          height: '138px',
          minWidth: '138px',
          minHeight: '138px',
          maxWidth: '138px',
          maxHeight: '138px',
          borderRadius: '50%',
          border: '2.5px dashed #1e3a8a',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '6px',
          textAlign: 'center',
          userSelect: 'none',
          transform: 'rotate(-5deg)',
          WebkitTransform: 'rotate(-5deg)',
          margin: '4px 0',
          backgroundColor: 'rgba(239, 246, 255, 0.45)',
          position: 'relative',
          boxSizing: 'border-box',
          fontFamily: "'Times New Roman', Times, Georgia, serif"
        }}
      >
        <div 
          style={{
            position: 'absolute',
            top: '5px',
            left: '5px',
            right: '5px',
            bottom: '5px',
            borderRadius: '50%',
            border: '1.2px solid rgba(30, 58, 138, 0.7)',
            pointerEvents: 'none',
            boxSizing: 'border-box'
          }}
        />
        <span 
          style={{
            fontSize: '9.5px',
            fontWeight: '900',
            textTransform: 'uppercase',
            color: '#172554',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
            padding: '0 6px',
            display: 'block'
          }}
        >
          {caFirm}
        </span>
        <div 
          style={{
            height: '2px',
            width: '42px',
            backgroundColor: 'rgba(30, 58, 138, 0.5)',
            margin: '3px auto'
          }}
        />
        <span 
          style={{
            fontSize: '8.5px',
            fontWeight: 'bold',
            color: '#172554',
            lineHeight: 1.15,
            display: 'block'
          }}
        >
          M.No: {caMem}
        </span>
        <span 
          style={{
            fontSize: '8px',
            fontWeight: '600',
            color: '#1e3a8a',
            lineHeight: 1.15,
            display: 'block'
          }}
        >
          New Delhi
        </span>
        <span 
          style={{
            fontSize: '8px',
            fontWeight: '800',
            color: '#172554',
            textTransform: 'uppercase',
            fontFamily: 'monospace',
            display: 'block'
          }}
        >
          FRN: {caFrn}
        </span>
      </div>
    );
  };

  // =========================================================================
  // ROW DATA PREPARATION FOR CONTINUOUS 4-COLUMN LEDGER (PAGE 1)
  // =========================================================================
  
  // 1. Trading Account Rows
  const tradingDebit: { text: string; amount: string; bold?: boolean; italic?: boolean }[] = [
    { text: 'To Opening Stock', amount: formatAmount(data.openingStock) },
    { text: 'To Purchase', amount: formatAmount(data.purchases) }
  ];
  if (Number(data.directExpenses) > 0) {
    tradingDebit.push({ text: 'To Direct Expenses', amount: formatAmount(data.directExpenses) });
  }
  (data.customTradingDebits || []).forEach(item => {
    if (item.name && (Number(item.amount) > 0 || item.name.trim())) {
      tradingDebit.push({ 
        text: item.name.trim().toLowerCase().startsWith('to ') ? item.name : `To ${item.name}`, 
        amount: formatAmount(item.amount) 
      });
    }
  });
  tradingDebit.push({ text: 'To Gross Profit C/d', amount: formatAmount(totals.grossProfit), bold: true, italic: true });

  const tradingCredit: { text: string; amount: string; bold?: boolean; italic?: boolean }[] = [
    { text: 'By Sales', amount: formatAmount(data.sales) },
    { text: 'By Closing Stock', amount: formatAmount(data.closingStock) }
  ];
  if (Number(data.depositOrOtherCredit) > 0) {
    tradingCredit.push({ text: 'Deposit', amount: formatAmount(data.depositOrOtherCredit) });
  }
  (data.customTradingCredits || []).forEach(item => {
    if (item.name && (Number(item.amount) > 0 || item.name.trim())) {
      tradingCredit.push({ 
        text: item.name.trim().toLowerCase().startsWith('by ') ? item.name : `By ${item.name}`, 
        amount: formatAmount(item.amount) 
      });
    }
  });

  const maxTradingRows = Math.max(tradingDebit.length, tradingCredit.length);

  // 2. Profit & Loss Account Rows
  const pnlDebit: { text: string; amount?: string; isHeader?: boolean; bold?: boolean; italic?: boolean }[] = [
    { text: 'Indirect Expenses', isHeader: true },
    ...data.indirectExpenses.map(exp => ({
      text: exp.name.trim().toLowerCase().startsWith('to ') ? exp.name : `To ${exp.name}`,
      amount: formatAmount(exp.amount)
    })),
    { text: 'To Depreciation', amount: formatAmount(totals.totalDepreciation) },
    { text: 'To Net Profit', amount: formatAmount(totals.netProfit), bold: true, italic: true }
  ];

  const pnlCredit: { text: string; amount?: string; bold?: boolean; italic?: boolean }[] = [
    { text: 'By Gross Profit B/d', amount: formatAmount(totals.grossProfit), bold: true, italic: true },
    ...data.otherIncomes.map(inc => ({
      text: inc.name.trim().toLowerCase().startsWith('by ') ? inc.name : `By ${inc.name}`,
      amount: formatAmount(inc.amount)
    }))
  ];

  const maxPnlRows = Math.max(pnlDebit.length, pnlCredit.length);

  // =========================================================================
  // ROW DATA PREPARATION FOR CONTINUOUS 5-COLUMN BALANCE SHEET (PAGE 2)
  // =========================================================================
  const liabItems: {
    text: string;
    innerAmount?: string;
    outerAmount?: string;
    isHeader?: boolean;
    bold?: boolean;
    italic?: boolean;
    indent?: boolean;
    underlineInner?: boolean;
  }[] = [];

  // Capital Account
  liabItems.push({ text: 'Capital Account', isHeader: true });
  liabItems.push({ text: 'Opening Balance', innerAmount: formatAmount(data.openingCapital), indent: true });
  liabItems.push({ text: 'Addition During the Year', innerAmount: formatAmount(data.additionDuringYear), indent: true });
  liabItems.push({ text: 'Add: Net Profit', innerAmount: formatAmount(totals.netProfit), indent: true, bold: true });
  liabItems.push({ 
    text: 'Less: Drawing', 
    innerAmount: formatAmount(data.drawings), 
    outerAmount: formatAmount(totals.netCapital), 
    indent: true, 
    bold: true, 
    underlineInner: true 
  });

  // Dynamic Liability Groups (e.g. Unsecured Loans, Current Liabilities, Secured Loans, Bank OD)
  if (data.liabilityGroups && data.liabilityGroups.length > 0) {
    data.liabilityGroups.forEach(group => {
      if (!group.groupName && group.items.length === 0) return;
      liabItems.push({ text: group.groupName || 'Current Liabilities', isHeader: true });
      const groupTotal = group.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
      group.items.forEach((item, idx) => {
        const isLast = idx === group.items.length - 1;
        liabItems.push({
          text: item.name,
          innerAmount: formatAmount(item.amount),
          outerAmount: isLast ? formatAmount(groupTotal) : '',
          indent: true
        });
      });
    });
  } else {
    // Legacy fallback
    liabItems.push({ text: 'Current Liabilities & Provision', isHeader: true });
    const hasOtherLiab = (data.otherLiabilities && data.otherLiabilities.length > 0);
    data.creditors.forEach((c, idx) => {
      const isLast = idx === data.creditors.length - 1 && !hasOtherLiab;
      liabItems.push({
        text: c.name,
        innerAmount: formatAmount(c.amount),
        outerAmount: isLast ? formatAmount(totals.totalCreditors) : '',
        indent: true
      });
    });
    if (hasOtherLiab) {
      data.otherLiabilities.forEach((ol, idx) => {
        const isLast = idx === data.otherLiabilities.length - 1;
        liabItems.push({
          text: ol.name,
          innerAmount: formatAmount(ol.amount),
          outerAmount: isLast ? formatAmount(totals.totalCreditors + totals.totalOtherLiabilities) : '',
          indent: true
        });
      });
    }

    liabItems.push({ text: 'Unsecured Loans', isHeader: true });
    data.unsecuredLoans.forEach((l, idx) => {
      const isLast = idx === data.unsecuredLoans.length - 1;
      liabItems.push({
        text: l.name,
        innerAmount: formatAmount(l.amount),
        outerAmount: isLast ? formatAmount(totals.totalUnsecuredLoans) : '',
        indent: true
      });
    });
  }

  // Assets Side items
  const assetItems: {
    text: string;
    outerAmount?: string;
    isHeader?: boolean;
    bold?: boolean;
    italic?: boolean;
    indent?: boolean;
    subIndent?: boolean;
  }[] = [];

  // Fixed Assets
  assetItems.push({ text: 'Fixed Assets', isHeader: true });
  assetItems.push({ text: 'As per Annexure A', outerAmount: formatAmount(totals.fixedAssets), indent: true, bold: true });

  // Current Assets
  assetItems.push({ text: 'Current Assets', isHeader: true });
  data.debtors.forEach(d => {
    assetItems.push({ text: d.name, outerAmount: formatAmount(d.amount), indent: true });
  });
  assetItems.push({ text: 'Closing Stock', outerAmount: formatAmount(data.closingStock), indent: true, bold: true });

  // Cash & Bank Balance
  assetItems.push({ text: 'Cash & Bank Balance', isHeader: true });
  assetItems.push({ text: 'Cash in Hand', outerAmount: formatAmount(data.cashInHand), indent: true });
  assetItems.push({ text: 'Cash at Bank', outerAmount: formatAmount(data.cashAtBank), indent: true });
  data.bankAccounts.forEach(b => {
    assetItems.push({ text: `↳ ${b.name}`, outerAmount: formatAmount(b.amount), subIndent: true, italic: true });
  });

  // Loans Given
  if (data.loansGiven && data.loansGiven.length > 0) {
    assetItems.push({ text: 'Loans & Advances / Given', isHeader: true });
    data.loansGiven.forEach(lg => {
      assetItems.push({ text: lg.name, outerAmount: formatAmount(lg.amount), indent: true });
    });
  }

  // Custom Current Assets / Deposits & Advances
  (data.customCurrentAssets || []).forEach(ca => {
    assetItems.push({ text: ca.name, outerAmount: formatAmount(ca.amount), indent: true });
  });

  (data.otherAssets || []).forEach(oa => {
    assetItems.push({ text: oa.name, outerAmount: formatAmount(oa.amount), indent: true });
  });

  const maxBsRows = Math.max(liabItems.length, assetItems.length);

  return (
    <div className="space-y-6" style={{ fontFamily: "'Times New Roman', Times, Georgia, serif" }}>
      {/* Top Action Toolbar (Hidden during Print) */}
      <div className="no-print p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-xs flex flex-wrap items-center justify-between gap-4 font-sans">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl transition cursor-pointer"
              title="Go back to list"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
                {data.firmName || 'Untitled Proprietorship'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60">
                FY {data.financialYear || '2025-26'}
              </span>
              {totals.isTallied ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/60 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Tally Matched
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/60 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Diff: ₹{Math.abs(totals.difference).toLocaleString('en-IN')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Proprietor: <span className="font-semibold text-slate-700 dark:text-slate-300">{data.proprietorName}</span> • Font: Times New Roman • Compact Ledger Layout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Options Toggles in Toolbar */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={printWithCaStamp}
                onChange={e => setPrintWithCaStamp(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>CA Stamp</span>
            </label>
            <div className="h-3 w-[1px] bg-slate-300 dark:bg-slate-600" />
            <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={printWithUdin}
                onChange={e => setPrintWithUdin(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span>UDIN</span>
            </label>
          </div>

          {onEdit && (
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
            >
              <Edit3 className="h-3.5 w-3.5" />
              <span>Edit Figures</span>
            </button>
          )}

          {/* Action 1: Direct Vector Print to Paper / Save as Vector PDF */}
          <button
            onClick={handleProceedPrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            title="Direct print to physical printer or save as vector PDF with 100% sharp text (Zero blur)"
          >
            <Printer className="h-4 w-4" />
            <span>Print to Paper (Vector)</span>
          </button>

          {/* Action 2: Direct Ultra-HD PDF Download */}
          <button
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold rounded-xl text-xs transition flex items-center gap-2 shadow-sm cursor-pointer"
            title="Download 350+ DPI High-Definition PDF with Times New Roman typography"
          >
            {isGeneratingPdf ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                <span>Download PDF</span>
              </>
            )}
          </button>

          {/* Action 3: CA Stamp & Print Options Modal */}
          <button
            onClick={() => setShowPrintModal(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Configure CA stamp and UDIN options"
          >
            <ShieldCheck className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span>Print Options</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          PRINT OPTIONS MODAL (Shows when Print is clicked)
          ========================================================================= */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 rounded-xl">
                  <Printer className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    Print & Attestation Options (प्रिंट सेटिंग्स)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Choose whether to include CA Stamp, UDIN No., and attestation dates.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPrintModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              
              {/* Option 1: Print with CA Stamp */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={printWithCaStamp}
                      onChange={e => setPrintWithCaStamp(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                        Print with CA Stamp (सीए स्टैम्प लगाएं)
                      </span>
                      <span className="text-[10.5px] text-slate-500">
                        Automatically places CA stamp from CA profile / CA Master
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${printWithCaStamp ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    {printWithCaStamp ? 'Enabled' : 'Disabled'}
                  </span>
                </label>

                {printWithCaStamp && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold uppercase text-slate-500">
                        Select CA Auditor Profile (from CA Master)
                      </label>
                      <select
                        value={selectedAuditorId}
                        onChange={e => setSelectedAuditorId(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
                      >
                        {allAuditors.map(aud => (
                          <option key={aud.id} value={aud.id}>
                            {aud.name} - {aud.firmName} (M.No: {aud.membershipNo})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Stamp Preview Card */}
                    <div className="flex items-center gap-3 p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                      {currentAuditor?.stampUrl ? (
                        <div className="w-12 h-12 rounded-lg border border-indigo-200 p-0.5 flex items-center justify-center shrink-0">
                          <img src={currentAuditor.stampUrl} alt="Stamp Preview" className="max-w-full max-h-full object-contain" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg border border-dashed border-slate-300 flex items-center justify-center shrink-0 text-[9px] font-bold text-blue-900 text-center leading-tight">
                          Round Seal
                        </div>
                      )}
                      <div className="leading-tight">
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                          {currentAuditor?.stampUrl ? '✅ Custom Uploaded CA Stamp' : 'ℹ️ Default Round CA Seal'}
                        </span>
                        <p className="text-[10px] text-slate-500">
                          {currentAuditor?.stampUrl 
                            ? 'Using digital stamp uploaded in CA Master.' 
                            : 'Upload a custom seal image in CA Master anytime to replace the default.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Option 2: Print with UDIN No. */}
              <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={printWithUdin}
                      onChange={e => setPrintWithUdin(e.target.checked)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white block">
                        Print with UDIN No. (UDIN नंबर दर्ज करें)
                      </span>
                      <span className="text-[10.5px] text-slate-500">
                        Include ICAI Unique Document Identification Number
                      </span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${printWithUdin ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'}`}>
                    {printWithUdin ? 'Enabled' : 'Disabled'}
                  </span>
                </label>

                {printWithUdin && (
                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold uppercase text-slate-500 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        Enter UDIN Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 26578691AUSCCL3806"
                        value={udinNo}
                        onChange={e => setUdinNo(e.target.value.toUpperCase().trim())}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold text-slate-800 dark:text-slate-100 tracking-wider uppercase"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] font-bold uppercase text-slate-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date of UDIN / Signing
                      </label>
                      <input
                        type="text"
                        placeholder="DD/MM/YYYY"
                        value={udinDate}
                        onChange={e => setUdinDate(e.target.value)}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Print Tip Note */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-[10.5px] text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Printing Tip:</strong> In the browser print dialog, set Margins to <strong>None / Minimum</strong> and ensure <strong>Background Graphics</strong> is checked for crisp borders.
                </p>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-700 dark:text-slate-300 rounded-xl font-bold cursor-pointer"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleProceedPrint}
                  className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 rounded-xl font-bold cursor-pointer flex items-center gap-1.5 border border-indigo-200/60"
                  title="Save as 100% Vector PDF with zero blur at any zoom level"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / Save as Vector PDF</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold cursor-pointer shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                  title="Direct 300 DPI Ultra-HD PDF download (Lossless PNG)"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Ultra-HD PDF</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Generation Progress Indicator Overlay */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Generating PDF Document...
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                {downloadProgress || 'Rendering 3-Page Financial Statements...'}
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div className="bg-emerald-500 h-1.5 rounded-full animate-pulse w-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Download Success Notification Toast */}
      {downloadSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-3 font-sans">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{downloadSuccessMsg}</span>
        </div>
      )}

      {/* =========================================================================
          PRINTABLE CONTAINER (3 PAGES REPLICA)
          Font set strictly to Times New Roman with continuous rows & borders
          A4 width (210mm), dynamic height without fixed empty stretching
          ========================================================================= */}
      <div 
        ref={printContainerRef} 
        className="printable-document space-y-6 print:space-y-0 text-black bg-slate-100 dark:bg-slate-950 p-2 md:p-6 print:p-0 print:bg-white"
        style={{ fontFamily: "'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif" }}
      >

        {/* -----------------------------------------------------------------------
            PAGE 1: TRADING, PROFIT & LOSS ACCOUNT
            No gap between table and Notes on Accounts
            ----------------------------------------------------------------------- */}
        <div 
          className="sheet-page bg-white shadow-md print:shadow-none mx-auto p-5 sm:p-7 print:p-0 border border-slate-200 print:border-none max-w-[210mm] w-full block print:break-after-page"
          style={{ 
            width: '210mm', 
            maxWidth: '210mm', 
            boxSizing: 'border-box',
            fontFamily: "'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif"
          }}
        >
          {/* Page 1 Header */}
          <div 
            className="header-container text-center space-y-0.5 pb-1.5 border-b-2 border-black"
            style={{ textAlign: 'center', width: '100%' }}
          >
            <h1 
              className="text-xl md:text-2xl font-bold uppercase underline tracking-wider"
              style={{ textAlign: 'center', margin: '0 auto' }}
            >
              {data.firmName || 'ADIL AL LAZIZ FOOD & CO.'}
            </h1>
            <h2 
              className="text-[16px] md:text-[17px] font-bold italic"
              style={{ textAlign: 'center', margin: '0 auto' }}
            >
              Trading, Profit & Loss Account
            </h2>
            <p 
              className="text-[13.5px] md:text-[14.5px] font-semibold italic underline"
              style={{ textAlign: 'center', margin: '0 auto' }}
            >
              for the Year Ended as on {data.yearEndedDate || '31st March, 2026'}
            </p>
          </div>

          {/* Trading & P&L Combined Standard Ledger Table */}
          <table 
            className="w-full border-collapse border border-black text-[12.5px] md:text-[13px] mt-2 tabular-nums"
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
          >
            <colgroup>
              <col style={{ width: '36%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '36%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr className="font-bold italic bg-slate-50/50 print:bg-transparent">
                <th className="border-b border-r border-black p-1 text-left font-bold align-top">Particulars</th>
                <th className="border-b border-r border-black p-1 text-right font-bold align-top">Amount</th>
                <th className="border-b border-r border-black p-1 text-left font-bold align-top">Particulars</th>
                <th className="border-b border-black p-1 text-right font-bold align-top">Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* 1. TRADING ACCOUNT ROWS (No horizontal lines between items, exact row-by-row alignment) */}
              {Array.from({ length: maxTradingRows }).map((_, i) => {
                const debit = tradingDebit[i];
                const credit = tradingCredit[i];
                return (
                  <tr key={`trading-${i}`}>
                    <td className={`border-r border-black px-2 py-0.5 text-left align-top leading-normal ${debit?.bold ? 'font-bold' : ''} ${debit?.italic ? 'italic' : ''}`}>
                      {debit?.text || ''}
                    </td>
                    <td className={`border-r border-black px-2 py-0.5 text-right whitespace-nowrap align-top leading-normal ${debit?.bold ? 'font-bold' : ''}`}>
                      {debit?.amount || ''}
                    </td>
                    <td className={`border-r border-black px-2 py-0.5 text-left align-top leading-normal ${credit?.bold ? 'font-bold' : ''} ${credit?.italic ? 'italic' : ''}`}>
                      {credit?.text || ''}
                    </td>
                    <td className={`px-2 py-0.5 text-right whitespace-nowrap align-top leading-normal ${credit?.bold ? 'font-bold' : ''}`}>
                      {credit?.amount || ''}
                    </td>
                  </tr>
                );
              })}

              {/* Trading Account Subtotal (Clean Accounting Single Top, Double Bottom) */}
              <tr className="font-bold text-[12.5px]">
                <td className="border-t border-b border-r border-black px-2 py-1 text-left italic align-middle">Total</td>
                <td className="border-t border-b border-r border-black px-2 py-1 text-right whitespace-nowrap align-middle">
                  {formatAmount(totals.tradingGrandTotal)}
                </td>
                <td className="border-t border-b border-r border-black px-2 py-1 text-left italic align-middle">Total</td>
                <td className="border-t border-b border-black px-2 py-1 text-right whitespace-nowrap align-middle">
                  {formatAmount(totals.tradingGrandTotal)}
                </td>
              </tr>
              <tr className="h-[2px] leading-[2px]">
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
              </tr>

              {/* 2. PROFIT & LOSS ACCOUNT ROWS (Directly below Trading Account) */}
              {Array.from({ length: maxPnlRows }).map((_, i) => {
                const debit = pnlDebit[i];
                const credit = pnlCredit[i];
                return (
                  <tr key={`pnl-${i}`}>
                    <td className={`border-r border-black px-2 py-0.5 text-left align-top leading-normal ${debit?.isHeader ? 'font-bold underline italic pb-0.5' : ''} ${debit?.bold ? 'font-bold' : ''} ${debit?.italic ? 'italic' : ''}`}>
                      {debit?.text || ''}
                    </td>
                    <td className={`border-r border-black px-2 py-0.5 text-right whitespace-nowrap align-top leading-normal ${debit?.bold ? 'font-bold' : ''}`}>
                      {debit?.amount || ''}
                    </td>
                    <td className={`border-r border-black px-2 py-0.5 text-left align-top leading-normal ${credit?.bold ? 'font-bold' : ''} ${credit?.italic ? 'italic' : ''}`}>
                      {credit?.text || ''}
                    </td>
                    <td className={`px-2 py-0.5 text-right whitespace-nowrap align-top leading-normal ${credit?.bold ? 'font-bold' : ''}`}>
                      {credit?.amount || ''}
                    </td>
                  </tr>
                );
              })}

              {/* P&L Account Final Grand Total (Clean Accounting Single Top, Double Bottom) */}
              <tr className="font-bold text-[12.5px]">
                <td className="border-t border-b border-r border-black px-2 py-1 text-left italic align-middle">Total</td>
                <td className="border-t border-b border-r border-black px-2 py-1 text-right whitespace-nowrap align-middle">
                  {formatAmount(totals.pnlGrandTotal)}
                </td>
                <td className="border-t border-b border-r border-black px-2 py-1 text-left italic align-middle">Total</td>
                <td className="border-t border-b border-black px-2 py-1 text-right whitespace-nowrap align-middle">
                  {formatAmount(totals.pnlGrandTotal)}
                </td>
              </tr>
              <tr className="h-[2px] leading-[2px]">
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
              </tr>
            </tbody>
          </table>

          {/* Page 1 Bottom: Notes on Accounts & Signatures (Starts directly under the table with NO gap) */}
          <div className="mt-1 pt-1">
            <div className="space-y-0.5 mb-1.5">
              <span className="font-bold underline italic text-[12.5px] block">Notes on Accounts</span>
              <p className="text-[12px] italic leading-tight text-black">
                {data.notesOnAccounts || 'We have compiled Balance sheet and Profit loss A/c as per Documents and information provided to us by the assesse.'}
              </p>
            </div>

            <div 
              className="signature-container flex justify-between items-end pt-1 text-xs"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}
            >
              {/* Left Side: CA Attestation & Stamp */}
              <div className="space-y-0.5 leading-tight" style={{ textAlign: 'left' }}>
                <div className="font-bold uppercase tracking-wider text-[13px]">
                  {currentAuditor?.firmName || data.caFirmName || 'SHAARIF AND ASSOCIATES'}
                </div>
                <div className="italic text-[12px]">
                  {data.caFirmType || '(Chartered Accountant)'}
                </div>
                {(currentAuditor?.frnNo || data.caFrn) && (
                  <div className="text-[12px]">FRN: {currentAuditor?.frnNo || data.caFrn}</div>
                )}

                {/* Stamp */}
                {renderCaStamp()}

                <div className="font-bold uppercase text-[12px]">
                  {currentAuditor?.name ? `CA ${currentAuditor.name.replace(/^CA\s+/i, '')}` : (data.caName || 'CA SHAARIF LATEEF')}
                </div>
                <div className="text-[12px]">{data.caDesignation || 'Proprietor'}</div>
                <div className="text-[12px]">
                  Membership No: {currentAuditor?.membershipNo || data.caMembershipNo || '578691'}
                </div>
                {printWithUdin && udinNo && (
                  <div className="font-bold text-[12px] pt-0.5">
                    UDIN: {udinNo}
                  </div>
                )}
                <div className="text-[12px]">
                  Date: {udinDate || data.dateOfSigning || new Date().toLocaleDateString('en-GB')}
                </div>
              </div>

              {/* Right Side: Proprietor Signature */}
              <div 
                className="proprietor-signature text-right space-y-5 pb-1"
                style={{ textAlign: 'right', minWidth: '220px' }}
              >
                <div className="font-bold uppercase text-[13.5px]">
                  For: {data.firmName || 'ADIL AL LAZIZ FOOD & CO.'}
                </div>
                <div className="italic text-[13px]">
                  (Proprietor)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            PAGE 2: BALANCE SHEET AS AT 31ST MARCH
            No gap between table and Notes on Accounts
            ----------------------------------------------------------------------- */}
        <div 
          className="sheet-page bg-white shadow-md print:shadow-none mx-auto p-5 sm:p-7 print:p-0 border border-slate-200 print:border-none max-w-[210mm] w-full block print:break-after-page"
          style={{ 
            width: '210mm', 
            maxWidth: '210mm', 
            boxSizing: 'border-box',
            fontFamily: "'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif"
          }}
        >
          {/* Page 2 Header */}
          <div 
            className="header-container text-center space-y-0.5 pb-1.5 border-b-2 border-black"
            style={{ textAlign: 'center', width: '100%' }}
          >
            <h1 
              className="text-xl md:text-2xl font-bold uppercase underline tracking-wider"
              style={{ textAlign: 'center', margin: '0 auto' }}
            >
              {data.firmName || 'ADIL AL LAZIZ FOOD & CO.'}
            </h1>
            <p 
              className="text-[13.5px] md:text-[14.5px] font-bold uppercase underline"
              style={{ textAlign: 'center', margin: '0 auto' }}
            >
              ADD: {data.unitAddress || 'SHAHEEN BAGH ABUL FAZAL PART 2 NEW DELHI 110025'}
            </p>
            <h2 
              className="text-[16px] md:text-[17px] font-bold italic pt-0.5"
              style={{ textAlign: 'center', margin: '0 auto' }}
            >
              Balance Sheet as at {data.yearEndedDate || '31st March 2026'}
            </h2>
          </div>

          {/* Balance Sheet T-Shape Table (5 Continuous Columns) */}
          <table 
            className="w-full border-collapse border border-black text-[12.5px] md:text-[13px] mt-2 tabular-nums"
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
          >
            <colgroup>
              <col style={{ width: '32%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr className="font-bold italic bg-slate-50/50 print:bg-transparent">
                <th className="border-b border-r border-black p-1 text-left font-bold align-top">Liabilities</th>
                <th className="border-b border-r border-black p-1 text-right font-bold align-top">Amount</th>
                <th className="border-b border-r border-black p-1 text-right font-bold align-top">Amount</th>
                <th className="border-b border-r border-black p-1 text-left font-bold align-top">Assets</th>
                <th className="border-b border-black p-1 text-right font-bold align-top">Amount</th>
              </tr>
            </thead>
            <tbody>
              {/* Balance Sheet Items (No horizontal lines between items, align-top for precise row matching) */}
              {Array.from({ length: maxBsRows }).map((_, i) => {
                const liab = liabItems[i];
                const asset = assetItems[i];
                return (
                  <tr key={`bs-${i}`}>
                    <td className={`border-r border-black px-2 py-0.5 text-left align-top leading-normal ${liab?.isHeader ? 'font-bold underline italic pb-0.5' : ''} ${liab?.indent ? 'pl-3' : ''} ${liab?.bold ? 'font-bold' : ''}`}>
                      {liab?.text || ''}
                    </td>
                    <td className={`border-r border-black px-2 py-0.5 text-right whitespace-nowrap align-top leading-normal ${liab?.underlineInner ? 'border-b border-black font-bold' : ''}`}>
                      {liab?.innerAmount || ''}
                    </td>
                    <td className={`border-r border-black px-2 py-0.5 text-right whitespace-nowrap align-top leading-normal ${liab?.bold ? 'font-bold' : ''}`}>
                      {liab?.outerAmount || ''}
                    </td>
                    <td className={`border-r border-black px-2 py-0.5 text-left align-top leading-normal ${asset?.isHeader ? 'font-bold underline italic pb-0.5' : ''} ${asset?.indent ? 'pl-3' : ''} ${asset?.subIndent ? 'pl-5 text-[11.5px] italic' : ''} ${asset?.bold ? 'font-bold' : ''}`}>
                      {asset?.text || ''}
                    </td>
                    <td className={`px-2 py-0.5 text-right whitespace-nowrap align-top leading-normal ${asset?.bold ? 'font-bold' : ''} ${asset?.subIndent ? 'text-[11.5px]' : ''}`}>
                      {asset?.outerAmount || ''}
                    </td>
                  </tr>
                );
              })}

              {/* Balance Sheet Grand Total Row (Clean Accounting Single Top, Double Bottom) */}
              <tr className="font-bold text-[12.5px]">
                <td className="border-t border-b border-r border-black px-2 py-1 italic align-middle" colSpan={2}>Total Liabilities</td>
                <td className="border-t border-b border-r border-black px-2 py-1 text-right whitespace-nowrap align-middle">
                  {formatAmount(totals.totalLiabilities)}
                </td>
                <td className="border-t border-b border-r border-black px-2 py-1 italic align-middle">Total Assets</td>
                <td className="border-t border-b border-black px-2 py-1 text-right whitespace-nowrap align-middle">
                  {formatAmount(totals.totalAssets)}
                </td>
              </tr>
              <tr className="h-[2px] leading-[2px]">
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]" colSpan={2}>&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
              </tr>
            </tbody>
          </table>

          {/* Page 2 Bottom: Notes on Accounts & Signatures (Starts directly under the table) */}
          <div className="mt-1 pt-1">
            <div className="space-y-0.5 mb-1.5">
              <span className="font-bold underline italic text-[12.5px] block">Notes on Accounts</span>
              <p className="text-[12px] italic leading-tight text-black">
                {data.notesOnAccounts || 'We have compiled Balance sheet and Profit loss A/c as per Documents and information provided to us by the assesse.'}
              </p>
            </div>

            <div 
              className="signature-container flex justify-between items-end pt-1 text-xs"
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}
            >
              {/* Left Side: CA Attestation & Stamp */}
              <div className="space-y-0.5 leading-tight" style={{ textAlign: 'left' }}>
                <div className="font-bold uppercase tracking-wider text-[13px]">
                  {currentAuditor?.firmName || data.caFirmName || 'SHAARIF AND ASSOCIATES'}
                </div>
                <div className="italic text-[12px]">
                  {data.caFirmType || '(Chartered Accountant)'}
                </div>
                {(currentAuditor?.frnNo || data.caFrn) && (
                  <div className="text-[12px]">FRN: {currentAuditor?.frnNo || data.caFrn}</div>
                )}

                {/* Stamp */}
                {renderCaStamp()}

                <div className="font-bold uppercase text-[12px]">
                  {currentAuditor?.name ? `CA ${currentAuditor.name.replace(/^CA\s+/i, '')}` : (data.caName || 'CA SHAARIF LATEEF')}
                </div>
                <div className="text-[12px]">{data.caDesignation || 'Proprietor'}</div>
                <div className="text-[12px]">
                  Membership No: {currentAuditor?.membershipNo || data.caMembershipNo || '578691'}
                </div>
                {printWithUdin && udinNo && (
                  <div className="font-bold text-[12px] pt-0.5">
                    UDIN: {udinNo}
                  </div>
                )}
                <div className="text-[12px]">
                  Date: {udinDate || data.dateOfSigning || new Date().toLocaleDateString('en-GB')}
                </div>
              </div>

              {/* Right Side: Proprietor Signature */}
              <div 
                className="proprietor-signature text-right space-y-5 pb-1"
                style={{ textAlign: 'right', minWidth: '220px' }}
              >
                <div className="font-bold uppercase text-[13.5px]">
                  For: {data.firmName || 'ADIL AL LAZIZ FOOD & CO.'}
                </div>
                <div className="italic text-[13px]">
                  (Proprietor)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* -----------------------------------------------------------------------
            PAGE 3: ANNEXURE A (DEPRECIATION SCHEDULE)
            No gap between table and Notes / Attestation
            ----------------------------------------------------------------------- */}
        <div 
          className="sheet-page bg-white shadow-md print:shadow-none mx-auto p-5 sm:p-7 print:p-0 border border-slate-200 print:border-none max-w-[210mm] w-full block"
          style={{ 
            width: '210mm', 
            maxWidth: '210mm', 
            boxSizing: 'border-box',
            fontFamily: "'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif"
          }}
        >
          {/* Page 3 Header */}
          <div className="border border-black p-1 inline-block font-bold text-[13.5px] mb-1.5">
            Annexure A (Depreciation Chart)
          </div>

          {/* Depreciation Table */}
          <table 
            className="w-full border-collapse border border-black text-[12.5px] md:text-[13px] tabular-nums"
            style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}
          >
            <thead>
              <tr className="font-bold bg-slate-50/50 print:bg-transparent text-center">
                <th className="border-b border-r border-black p-1 w-[7%] align-middle">Sr. No</th>
                <th className="border-b border-r border-black p-1 text-left w-[33%] align-middle">Particulars</th>
                <th className="border-b border-r border-black p-1 w-[12%] align-middle">WDV as on 01-04-{data.financialYear ? data.financialYear.split('-')[0] : '2025'}</th>
                <th className="border-b border-r border-black p-1 w-[10%] align-middle">Addition</th>
                <th className="border-b border-r border-black p-1 w-[8%] align-middle">Rate (%)</th>
                <th className="border-b border-r border-black p-1 w-[10%] align-middle">Total</th>
                <th className="border-b border-r border-black p-1 w-[10%] align-middle">Dep</th>
                <th className="border-b border-black p-1 w-[10%] align-middle">WDV as on {data.yearEndedDate || '31-03-2026'}</th>
              </tr>
            </thead>
            <tbody>
              {totals.schedule.map((item, idx) => (
                <tr key={item.id} className="text-center text-[12.5px]">
                  <td className="border-r border-black px-1.5 py-0.5 align-middle leading-normal">{idx + 1}</td>
                  <td className="border-r border-black px-2 py-0.5 text-left font-medium align-middle leading-normal">{item.particulars}</td>
                  <td className="border-r border-black px-1.5 py-0.5 text-right align-middle leading-normal">{item.wdvOpening || 0}</td>
                  <td className="border-r border-black px-1.5 py-0.5 text-right align-middle leading-normal">{item.addition || 0}</td>
                  <td className="border-r border-black px-1.5 py-0.5 text-center align-middle leading-normal">{item.ratePercent}</td>
                  <td className="border-r border-black px-1.5 py-0.5 text-right align-middle leading-normal">{item.total || 0}</td>
                  <td className="border-r border-black px-1.5 py-0.5 text-right font-bold align-middle leading-normal">{item.depreciation || 0}</td>
                  <td className="px-1.5 py-0.5 text-right font-bold align-middle leading-normal">{item.wdvClosing || 0}</td>
                </tr>
              ))}

              {/* Total Row (Clean Accounting Single Top, Double Bottom) */}
              <tr className="font-bold text-[12.5px] text-center">
                <td className="border-t border-b border-r border-black px-1.5 py-1 align-middle" colSpan={2}>
                  <span>TOTAL (Round Off)</span>
                </td>
                <td className="border-t border-b border-r border-black px-1.5 py-1 text-right align-middle">
                  {totals.schedule.reduce((sum, i) => sum + (Number(i.wdvOpening) || 0), 0)}
                </td>
                <td className="border-t border-b border-r border-black px-1.5 py-1 text-right align-middle">
                  {totals.schedule.reduce((sum, i) => sum + (Number(i.addition) || 0), 0)}
                </td>
                <td className="border-t border-b border-r border-black px-1.5 py-1 align-middle"></td>
                <td className="border-t border-b border-r border-black px-1.5 py-1 text-right align-middle">
                  {totals.schedule.reduce((sum, i) => sum + (Number(i.total) || 0), 0)}
                </td>
                <td className="border-t border-b border-r border-black px-1.5 py-1 text-right font-black align-middle">
                  {totals.totalDepreciation}
                </td>
                <td className="border-t border-b border-black px-1.5 py-1 text-right font-black align-middle">
                  {totals.totalClosingWDV}
                </td>
              </tr>
              <tr className="h-[2px] leading-[2px]">
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]" colSpan={2}>&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-r border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
                <td className="border-b border-black p-0 h-[2px] leading-[2px] text-[1px]">&nbsp;</td>
              </tr>
            </tbody>
          </table>

          {/* Note on Rate percentages */}
          <div className="mt-2 text-[11.5px] italic space-y-0.5">
            <p>* Rates applied in accordance with Income Tax Act, 1961 (Furniture: 10%, Computers/Printers: 40%, Vehicles: 15%, Mobile/Electronics: 15%).</p>
            <p>* Depreciation of ₹{totals.totalDepreciation.toLocaleString('en-IN')} has been debited to Profit & Loss Account.</p>
            <p>* Net WDV of ₹{totals.totalClosingWDV.toLocaleString('en-IN')} is reflected under Fixed Assets in the Balance Sheet.</p>
          </div>

          {/* Page 3 Bottom: Stamp & Attestation (Directly below table and note) */}
          <div 
            className="mt-2 pt-2 border-t border-black flex justify-between items-end"
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', width: '100%' }}
          >
            <div>
              {renderCaStamp()}
            </div>
            <div 
              className="text-right text-xs space-y-0.5"
              style={{ textAlign: 'right', minWidth: '220px' }}
            >
              <div className="font-bold uppercase text-[13px]">
                {currentAuditor?.firmName || data.caFirmName || 'SHAARIF AND ASSOCIATES'}
              </div>
              <div className="italic text-[12px]">
                {data.caFirmType || '(Chartered Accountant)'}
              </div>
              {(currentAuditor?.frnNo || data.caFrn) && (
                <div className="text-[12px]">FRN: {currentAuditor?.frnNo || data.caFrn}</div>
              )}
              {printWithUdin && udinNo && (
                <div className="font-bold text-[12px]">UDIN: {udinNo}</div>
              )}
              <div className="text-[12px]">
                Dated: {udinDate || data.dateOfSigning || new Date().toLocaleDateString('en-GB')}
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Global CSS for Clean 3-Page Printing & Times New Roman Typography */}
      <style>{`
        .printable-document,
        .printable-document *,
        .sheet-page,
        .sheet-page * {
          font-family: 'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif !important;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body, .printable-document, .sheet-page, .sheet-page * {
            background-color: #ffffff !important;
            font-family: 'Times New Roman', Times, 'Tinos', 'Nimbus Roman No9 L', 'Liberation Serif', FreeSerif, serif !important;
            color: #000000 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            text-rendering: geometricPrecision !important;
            -webkit-font-smoothing: antialiased !important;
            -webkit-text-stroke: 0.1px #000000;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .printable-document {
            background-color: transparent !important;
            padding: 0 !important;
            margin: 0 auto !important;
            width: 210mm !important;
          }
          .sheet-page {
            box-shadow: none !important;
            border: none !important;
            margin: 0 auto !important;
            padding: 8mm 10mm !important;
            width: 210mm !important;
            max-width: 210mm !important;
            page-break-after: always !important;
            break-after: page !important;
            box-sizing: border-box !important;
            background: #ffffff !important;
          }
          .sheet-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          table {
            border-collapse: collapse !important;
            width: 100% !important;
            table-layout: fixed !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
