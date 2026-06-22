/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Proposal } from '../types';
import { getProposalTemplate, getCustomServices } from '../lib/db';
import { X, ShieldCheck, Mail, MapPin, Phone, Building2, Globe, FileDown, Eye } from 'lucide-react';
import EFilinggLogo from './EFilinggLogo';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { patchModernColorsForHtml2Canvas } from '../lib/pdfSandboxHelper';

interface ProposalPdfProps {
  proposal: Proposal;
  onClose: () => void;
}

export default function ProposalPdf({ proposal, onClose }: ProposalPdfProps) {
  // Load dynamic template configurations and the catalog of services
  const template = getProposalTemplate();
  const services = getCustomServices();
  const [isDownloading, setIsDownloading] = useState(false);

  // Find standard operational definitions for current service required
  const srv = services.find((s) => s.name === proposal.serviceRequired);
  
  const pricingData = {
    price: proposal.amount,
    timeline: srv?.timeline || '5 - 7 Working Days',
    scope: srv?.scope && srv.scope.length > 0 ? srv.scope : [
      'Document gathering & compliance verification search',
      'Filing of Application in legal statutory government portals',
      'Replying to clarifications or queries raised by portal officers',
      'Generation of statutory certificate of Incorporation'
    ],
    deliverables: srv?.deliverables && srv.deliverables.length > 0 ? srv.deliverables : [
      'Official Certified Registration Certificate',
      'Official login credentials & credentials guide'
    ]
  };

  const generateFallbackPdf = (doc: jsPDF) => {
    const template = getProposalTemplate();
    const companyName = template.companyName || 'EFILINGG FINANCIAL SERVICES PRIVATE LIMITED';

    // ==================== PAGE 1: COVER PAGE, ABOUT US & TRUST ====================
    // Header
    doc.setFillColor(229, 169, 59); // gold
    doc.circle(26, 24, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('e', 24.6, 27.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Filingg.com', 33, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(115, 115, 115);
    doc.text('Compliance Made Easy', 33, 30);

    doc.setFillColor(229, 169, 59);
    doc.rect(73, 21, 1.6, 9, 'F');
    doc.triangle(71.5, 22, 76.1, 22, 73.8, 19, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('ADVISORY PROPOSAL', 190, 25, { align: 'right' });

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 34, 190, 34);

    // Main Title Block of Page 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text('BUSINESS COMPLIANCE PROPOSAL', 20, 46);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(15, 23, 42); // slate-950
    const titleLines = doc.splitTextToSize(proposal.serviceRequired, 170);
    doc.text(titleLines, 20, 56);
    const titleHeight = titleLines.length * 8;

    // Small amber line directly under service title
    doc.setFillColor(245, 158, 11); // Amber-500
    doc.roundedRect(20, 56 + titleHeight - 1, 24, 1.2, 0.6, 0.6, 'F');
    const blockYStart = 56 + titleHeight + 7;

    // Client & Center Hub Box (Grid Side-by-Side cols)
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.roundedRect(20, blockYStart, 170, 38, 4, 4, 'FD');

    // Separator vertical line
    doc.setDrawColor(226, 232, 240);
    doc.line(105, blockYStart + 4, 105, blockYStart + 34);

    // Column 1 Client details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('PREPARED FOR CLIENT:', 25, blockYStart + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(proposal.clientName.toUpperCase(), 25, blockYStart + 14);

    let clinetBusinessYShift = 0;
    if (proposal.clientBusiness) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(proposal.clientBusiness, 25, blockYStart + 19.5);
      clinetBusinessYShift = 5;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Email: ${proposal.clientEmail}`, 25, blockYStart + 20 + clinetBusinessYShift);
    doc.text(`Mobile: ${proposal.clientMobile}`, 25, blockYStart + 25 + clinetBusinessYShift);

    // Column 2 Hub Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('ISSUED BY COMPLIANCE HUB:', 110, blockYStart + 8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const companyLines = doc.splitTextToSize(companyName, 75);
    doc.text(companyLines, 110, blockYStart + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text(`Proposal ID: #${proposal.id}`, 110, blockYStart + 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Date: ${new Date(proposal.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}`, 110, blockYStart + 29);
    doc.text(`Valid Till: ${new Date(proposal.validUntil).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}`, 110, blockYStart + 34);

    // About Practice Section
    const aboutYStart = blockYStart + 43;
    doc.setFillColor(245, 158, 11); // Amber-500
    doc.circle(21.5, aboutYStart + 5.5, 1.2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(template.aboutHeading || 'About Our Practice', 25, aboutYStart + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const aboutLines = doc.splitTextToSize(template.aboutText || 'eFilingg is a premier corporate compliance agency supporting growth startups and established business groups with registry, legal structures, licensing, tax files, and secretarial mandates.', 170);
    doc.text(aboutLines, 20, aboutYStart + 14);
    const aboutHeight = aboutLines.length * 4.5;

    // Experience Stats Row
    const statsYStart = aboutYStart + 14 + aboutHeight + 4;
    if (template.experienceStats && template.experienceStats.length > 0) {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.roundedRect(20, statsYStart, 170, 17, 3, 3, 'FD');

      let colWidth = 170 / template.experienceStats.length;
      template.experienceStats.forEach((stat, idx) => {
        let colX = 20 + (idx * colWidth);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(stat.value, colX + colWidth/2, statsYStart + 6.5, { align: 'center' });

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(stat.label.toUpperCase(), colX + colWidth/2, statsYStart + 11.5, { align: 'center' });

        if (idx < template.experienceStats.length - 1) {
          doc.setDrawColor(226, 232, 240);
          doc.line(colX + colWidth, statsYStart + 3, colX + colWidth, statsYStart + 14);
        }
      });
    }
    const statsHeight = (template.experienceStats && template.experienceStats.length > 0) ? 22 : 0;

    // Customer Reviews
    const reviewsYStart = statsYStart + statsHeight + 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('TRUSTED CUSTOMER FEEDBACK REVIEWS', 20, reviewsYStart + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(245, 158, 11);
    doc.text('★★★★★', 190, reviewsYStart + 5, { align: 'right' });

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, reviewsYStart + 8, 190, reviewsYStart + 8);

    let reviewY = reviewsYStart + 13;
    if (template.testimonials && template.testimonials.length > 0) {
      const t1 = template.testimonials[0];
      const t2 = template.testimonials[1];

      if (t1) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(245, 158, 11); // Amber
        doc.setLineWidth(1.0);
        doc.roundedRect(20, reviewY, 82, 28, 2, 2, 'F');
        doc.line(20, reviewY, 20, reviewY + 28);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const t1Lines = doc.splitTextToSize(`"${t1.text}"`, 74);
        doc.text(t1Lines, 24, reviewY + 5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(t1.name, 24, reviewY + 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(t1.company, 24, reviewY + 24);
      }

      if (t2) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(245, 158, 11); // Amber
        doc.setLineWidth(1.0);
        doc.roundedRect(108, reviewY, 82, 28, 2, 2, 'F');
        doc.line(108, reviewY, 108, reviewY + 28);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        const t2Lines = doc.splitTextToSize(`"${t2.text}"`, 74);
        doc.text(t2Lines, 112, reviewY + 5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(15, 23, 42);
        doc.text(t2.name, 112, reviewY + 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text(t2.company, 112, reviewY + 24);
      }
    }

    // Footer Signature Page 1
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(template.logoText || 'eFilingg', 20, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(template.website || 'efilingg.com', 20, 286);
    doc.text('Page 1 of 3', 190, 286, { align: 'right' });


    // ==================== PAGE 2: SERVICE DETAILS & PRICING (QUOTATION) ====================
    doc.addPage();
    // Header
    doc.setFillColor(229, 169, 59); // gold
    doc.circle(26, 24, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('e', 24.6, 27.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Filingg.com', 33, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(115, 115, 115);
    doc.text('Compliance Made Easy', 33, 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('FILING TARIFF & SCOPE', 190, 25, { align: 'right' });

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 34, 190, 34);

    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text('CHAPTER 02', 20, 44);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text('Specific Scope & Commercial Quotation', 20, 50);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 53, 40, 53);

    // Core Compliance Mandate Banner
    doc.setFillColor(254, 243, 199); // Amber-100
    doc.setDrawColor(252, 211, 77); // Amber-200
    doc.setLineWidth(0.5);
    doc.roundedRect(20, 58, 170, 16, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text('CORE COMPLIANCE MANDATE:', 25, 63.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(proposal.serviceRequired, 25, 69.5);

    // Scope & Deliverables side-by-side
    // Column 1: Scope
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.roundedRect(20, 79, 82, 58, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('SCOPE OF GOVERNMENT TASKS', 25, 85);

    let scopeY = 91;
    pricingData.scope.slice(0, 4).forEach((item) => {
      doc.setFillColor(245, 158, 11); // Amber dot bullets
      doc.circle(26, scopeY - 0.9, 1.2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const sLines = doc.splitTextToSize(item, 70);
      doc.text(sLines, 30, scopeY);
      scopeY += (sLines.length * 3.5) + 1.2;
    });

    // Column 2: Deliverables
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(108, 79, 82, 58, 3, 3, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('OFFICIAL DELIVERABLES', 113, 85);

    let delivY = 91;
    pricingData.deliverables.slice(0, 4).forEach((item) => {
      doc.setDrawColor(16, 185, 129); // emerald-500
      doc.setFillColor(209, 250, 229); // emerald-100
      doc.setLineWidth(0.5);
      doc.circle(115, delivY - 1, 1.6, 'FD');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text('v', 114.1, delivY - 0.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const dLines = doc.splitTextToSize(item, 68);
      doc.text(dLines, 120, delivY);
      delivY += (dLines.length * 3.5) + 1.2;
    });

    // Document requested & speed metadata
    let docsY = 143;
    if (srv?.documentsRequired && srv.documentsRequired.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('DOCUMENTS REQUESTED:', 20, docsY);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      let docItemY = docsY + 5;
      srv.documentsRequired.slice(0, 4).forEach((d) => {
        doc.setFillColor(148, 163, 184);
        doc.circle(22, docItemY - 0.8, 0.8, 'F');
        doc.text(d, 25, docItemY);
        docItemY += 4.5;
      });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('CLIENT REQUIREMENTS:', 20, docsY);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text('No custom onboarding files requested.', 20, docsY + 5);
    }

    // Completion Speed right pill
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(241, 245, 249);
    doc.roundedRect(108, docsY - 4, 82, 11, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('COMPLETION SPEED:', 112, docsY + 2.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(pricingData.timeline, 184, docsY + 2.5, { align: 'right' });

    // Included Add-ons badge pills
    let addonsY = docsY + 11;
    if (srv?.packagesIncluded && srv.packagesIncluded.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text('INCLUDED ADD-ONS:', 108, addonsY);

      let badgeX = 108;
      const maxX = 190;
      srv.packagesIncluded.forEach((pkg) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        const textWidth = doc.getTextWidth(pkg);
        
        if (badgeX + textWidth + 4.5 > maxX) {
          badgeX = 108;
          addonsY += 6;
        }

        doc.setFillColor(254, 243, 199); // Amber-100
        doc.setDrawColor(252, 211, 77); // Amber-200
        doc.setLineWidth(0.3);
        
        doc.roundedRect(badgeX, addonsY + 2, textWidth + 4.5, 4.5, 1, 1, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(180, 83, 9); // Amber-700
        doc.text(pkg, badgeX + 2.2, addonsY + 5.1);
        badgeX += textWidth + 6;
      });
    }

    // Inclusions Breakdown table
    let tableY = 186;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text('Fee & Tariff Inclusions Breakdown:', 20, tableY);
    tableY += 5;

    // Header strip
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, tableY, 170, 7.5, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('COMPLIANCE COMPONENT', 24, tableY + 5);
    doc.text('FEE & TARIFF', 186, tableY + 5, { align: 'right' });
    tableY += 7.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);

    if (srv?.priceBreakup && srv.priceBreakup.length > 0) {
      srv.priceBreakup.forEach((item) => {
        tableY += 1.2;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(item.name, 24, tableY + 4.5);
        
        const discountAmt = item.discount || 0;
        const netPrice = item.amount - discountAmt;
        
        if (discountAmt > 0) {
          // If there is a discount, print standard in gray, savings, and final net price
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(148, 163, 184);
          doc.text(`Std: INR ${item.amount.toLocaleString()}`, 115, tableY + 4.5);
          
          doc.setTextColor(16, 185, 129); // emerald-550
          doc.text(`Save INR ${discountAmt.toLocaleString()}`, 150, tableY + 4.5);
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42); // slate-900
          doc.text(`INR ${netPrice.toLocaleString()}/-`, 186, tableY + 4.5, { align: 'right' });
        } else {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text(`INR ${item.amount.toLocaleString()}/-`, 186, tableY + 4.5, { align: 'right' });
        }
        tableY += 4.5;

        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.line(20, tableY + 1.2, 190, tableY + 1.2);
        tableY += 1.2;
      });
    } else {
      tableY += 1.2;
      doc.text('All-inclusive Standard Professional Filing Fee Bundle', 24, tableY + 4.5);
      doc.text(`INR ${proposal.amount.toLocaleString()}/-`, 186, tableY + 4.5, { align: 'right' });
      tableY += 4.5;

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(20, tableY + 1.2, 190, tableY + 1.2);
      tableY += 1.2;
    }

    // Grand total Professional bar
    tableY += 2;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, tableY, 170, 9, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Net Total Professional Fee (All-inclusive)', 24, tableY + 5.8);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text(`INR ${proposal.amount.toLocaleString()}/-`, 186, tableY + 5.8, { align: 'right' });

    // Footer Page 2
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(template.logoText || 'eFilingg', 20, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(template.website || 'efilingg.com', 20, 286);
    doc.text('Page 2 of 3', 190, 286, { align: 'right' });


    // ==================== PAGE 3: PROCESS FLOW, TERMS, AND HUB CONTACT ====================
    doc.addPage();
    // Header
    doc.setFillColor(229, 169, 59); // gold
    doc.circle(26, 24, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text('e', 24.6, 27.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Filingg.com', 33, 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(115, 115, 115);
    doc.text('Compliance Made Easy', 33, 30);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text('ENGAGEMENT & COMPLIANCE', 190, 25, { align: 'right' });

    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(20, 34, 190, 34);

    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // Amber-700
    doc.text('CHAPTER 03', 20, 44);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text('Filing Workflow & Standard Terms', 20, 50);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(20, 53, 40, 53);

    // Workflow stage Grid columns (5 boxes)
    let stageY = 59;
    if (template.processFlowStages) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('PROPOSED SEQUENCE OF PROFESSIONAL ACTIONS:', 20, stageY);
      stageY += 4.5;

      let colWidth = 32;
      let gap = 2.5;
      template.processFlowStages.slice(0, 5).forEach((stg, idx) => {
        let colX = 20 + (idx * (colWidth + gap));
        
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.5);
        doc.roundedRect(colX, stageY, colWidth, 31, 2, 2, 'FD');

        // Stage title badge label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 83, 9); // Amber-700
        doc.text(`Stage 0${idx+1}`, colX + colWidth/2, stageY + 4.5, { align: 'center' });

        // Stage visual title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        const tLines = doc.splitTextToSize(stg.title, colWidth - 4);
        doc.text(tLines, colX + colWidth/2, stageY + 10, { align: 'center' });

        // Stage Description
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        const dLines = doc.splitTextToSize(stg.desc, colWidth - 5);
        doc.text(dLines, colX + colWidth/2, stageY + 16, { align: 'center' });
      });
      stageY += 31;
    }

    // Terms list block
    stageY += 5;
    if (template.termsAndConditions) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text('ADVISORY TERMS & CONDITIONS OF ENGAGEMENT:', 20, stageY);
      stageY += 5.5;

      template.termsAndConditions.slice(0, 6).forEach((term, idx) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(180, 83, 9); // Amber
        doc.text(`${idx + 1}.`, 20, stageY);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        const tLines = doc.splitTextToSize(term, 160);
        doc.text(tLines, 25, stageY);
        stageY += (tLines.length * 3.5) + 0.6;
      });
    }

    // Dark majestic Contact card bottom
    let contactY = 220;
    doc.setFillColor(15, 23, 42); // slate-900 / dark slate
    doc.roundedRect(20, contactY, 170, 48, 4, 4, 'F');

    // Logo within card
    doc.setFillColor(229, 169, 59); // gold
    doc.circle(32, contactY + 9, 4.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('e', 30.8, contactY + 12.3);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('Filingg.com', 40, contactY + 12.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text('LEGAL & REGISTRY HUB', 30, contactY + 18.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(template.companyName || 'EFILINGG FINANCIAL SERVICES PRIVATE LIMITED', 30, contactY + 26);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(245, 158, 11); // Amber
    const splitAddress = doc.splitTextToSize(`Office Address: ${template.officeAddress}`, 155);
    doc.text(splitAddress, 30, contactY + 31.5);

    // Support lists
    doc.setDrawColor(71, 85, 105); // slate-600 separator line
    doc.setLineWidth(0.4);
    doc.line(116, contactY + 4, 116, contactY + 21);

    // Col 1: Digital Portal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Digital Portal', 121, contactY + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(226, 232, 240);
    doc.text(template.website || 'efilingg.com', 121, contactY + 12.5);
    doc.text(template.supportEmail || 'support@efilingg.com', 121, contactY + 16.5);

    // Col 2: Assistance
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text('Assistance', 156, contactY + 8);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(226, 232, 240);
    doc.text(template.supportPhone1 || '', 156, contactY + 12.5);
    doc.text(template.supportPhone2 || '', 156, contactY + 16.5);

    // Footer Page 3
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(template.logoText || 'eFilingg', 20, 282);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(template.website || 'efilingg.com', 20, 286);
    doc.text('Page 3 of 3', 190, 286, { align: 'right' });
  };

  const handleDownloadPdf = async () => {
    setIsDownloading(true);
    
    // Apply sandbox fix for modern styles containing oklch / oklab colors which crash html2canvas's parser
    const restoreColors = patchModernColorsForHtml2Canvas();
    
    // Temporarily remove dark mode class from html/body roots so that nested elements with 'dark:' classes render strictly in light mode
    const htmlHadDark = document.documentElement.classList.contains('dark');
    const bodyHadDark = document.body.classList.contains('dark');
    if (htmlHadDark) document.documentElement.classList.remove('dark');
    if (bodyHadDark) document.body.classList.remove('dark');

    // Convert live class node list to a static offline array
    const rawElements = document.getElementsByClassName('proposal-page-element');
    const elements = Array.from(rawElements) as HTMLElement[];
    if (!elements || elements.length === 0) {
      alert('Proposal pages not found.');
      setIsDownloading(false);
      return;
    }

    // Save original placement and styles
    const elementPlacements = elements.map(el => {
      return {
        element: el,
        parent: el.parentElement,
        sibling: el.nextSibling,
        style: el.getAttribute('style') || '',
        class: el.className
      };
    });

    // Create a temporary layout container at opacity 0.01 to ensure full browser lay-out paint without user flashing
    const tempContainer = document.createElement('div');
    tempContainer.id = 'proposal-render-temp-container';
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
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let i = 0; i < elements.length; i++) {
        const livePage = elements[i];

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
          padding: 40px !important;
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
          doc.addPage();
        }
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

        // Remove from temporary container immediately to make room for next page or restoring
        tempContainer.removeChild(livePage);
      }

      const fileName = `${template.logoText || 'eF'}_Proposal_${proposal.id}_${proposal.clientName.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);
    } catch (error) {
      console.error('Error generating high density PDF:', error);
      alert('We encountered an error rendering the PDF. Try downloading again.');
    } finally {
      // Restore CSS rules and global getComputedStyle modifications
      restoreColors();

      // Restore all elements exactly to their original DOM positions & classes
      elementPlacements.forEach(placement => {
        if (placement.element && placement.parent) {
          placement.element.setAttribute('style', placement.style);
          placement.element.className = placement.class;
          if (placement.sibling) {
            placement.parent.insertBefore(placement.element, placement.sibling);
          } else {
            placement.parent.appendChild(placement.element);
          }
        }
      });

      // Cleanup our helper container
      if (tempContainer.parentNode) {
        document.body.removeChild(tempContainer);
      }

      // Restore dark mode state
      if (htmlHadDark) document.documentElement.classList.add('dark');
      if (bodyHadDark) document.body.classList.add('dark');
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-500/60 dark:bg-slate-950/85 overflow-y-auto flex justify-center p-0 md:p-6 printable-proposal-overlay">
      
      {/* Container holding PDF view and controls */}
      <div className="w-full max-w-5xl bg-slate-200 dark:bg-slate-900 border border-slate-350 dark:border-slate-800 rounded-none md:rounded-3xl shadow-2xl flex flex-col printable-proposal-card md:my-4">
        
        {/* Printable Control bar */}
        <div className="p-4 px-6 border-b border-slate-300 dark:border-slate-800 bg-slate-900 flex items-center justify-between sticky top-0 z-30 text-white md:rounded-t-3xl border-none">
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="font-bold text-sm text-slate-100">
              eFilingg Proposal Workspace
            </h3>
          </div>
          <div className="flex items-center space-x-3 text-slate-900">
            <button
              onClick={handleDownloadPdf}
              disabled={isDownloading}
              className={`flex items-center space-x-2 py-2.5 px-5 rounded-xl text-white font-bold text-xs cursor-pointer transition-all shadow-md active:scale-95 border-none ${
                isDownloading ? 'bg-indigo-700 opacity-85 cursor-not-allowed' : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-amber-500/15'
              }`}
            >
              {isDownloading ? (
                <>
                  <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent animate-spin rounded-full pointer-events-none" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="h-4 w-4 text-white" />
                  <span>Download Proposal PDF</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl cursor-pointer transition-colors border-none"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>
        </div>

        {/* PDF Doc Area with A4-scaled live elements */}
        <div className="p-4 py-8 md:p-12 flex-1 space-y-12 select-text overflow-y-auto bg-slate-300 dark:bg-slate-950 max-h-[85vh] text-slate-900 print:text-black printable-proposal-doc">
          
          {/* ==================== PAGE 1: COVER PAGE, ABOUT & CUSTOMER REVIEWS ==================== */}
          <div className="proposal-page-element w-[794px] h-[1123px] mx-auto bg-white text-slate-900 flex flex-col justify-between border-4 border-slate-950 p-10 relative overflow-hidden shadow-md shrink-0">
            <div className="space-y-6">
              {/* Page Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <EFilinggLogo variant="color" size="lg" className="-ml-6" />
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">
                  Advisory Proposal
                </span>
              </div>

              {/* Service required title */}
              <div className="space-y-2 mt-4">
                <span className="text-[10px] font-extrabold tracking-widest text-amber-600 uppercase font-mono block">
                  BUSINESS COMPLIANCE PROPOSAL
                </span>
                <h1 className="text-3xl font-black tracking-tight text-slate-950 leading-tight">
                  {proposal.serviceRequired}
                </h1>
                <div className="h-1.5 w-24 bg-amber-500 rounded-full" />
              </div>

              {/* Partner and Client metadata */}
              <div className="grid grid-cols-2 gap-6 bg-slate-50 border border-slate-200/60 rounded-2xl p-5 mt-4">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-black text-slate-400 font-mono tracking-wider block">PREPARED FOR CLIENT:</span>
                  <p className="text-xs font-black text-slate-900 uppercase leading-snug">{proposal.clientName}</p>
                  {proposal.clientBusiness && (
                    <p className="text-[11px] font-bold text-slate-650 leading-tight">{proposal.clientBusiness}</p>
                  )}
                  <p className="text-[10px] text-slate-500 font-medium font-mono">{proposal.clientEmail}</p>
                  <p className="text-[10px] text-slate-500 font-medium font-mono">{proposal.clientMobile}</p>
                </div>

                <div className="space-y-1 text-right border-l border-slate-200 pl-6">
                  <span className="text-[9px] uppercase font-black text-slate-400 font-mono tracking-wider block">ISSUED BY COMPLIANCE HUB:</span>
                  <p className="text-xs font-black text-slate-900 uppercase leading-snug">{template.companyName || 'EFILINGG FINANCIAL SERVICES PRIVATE LIMITED'}</p>
                  <p className="text-[10px] text-amber-605 font-mono font-bold mt-1">Proposal ID: #{proposal.id}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Date: {new Date(proposal.createdAt).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Valid Till: {new Date(proposal.validUntil).toLocaleDateString([], { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>

              {/* About eFilingg Section */}
              <div className="space-y-3 mt-6">
                <div className="flex items-center space-x-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider font-sans">{template.aboutHeading || 'About Our Corporate Practice'}</h2>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                  {template.aboutText || 'eFilingg is a premier corporate compliance agency supporting growth startups and established business groups with registry, legal structures, licensing, tax files, and secretarial mandates.'}
                </p>

                {/* Experience Stats */}
                {template.experienceStats && template.experienceStats.length > 0 && (
                  <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-slate-50/50 rounded-xl border border-slate-100">
                    {template.experienceStats.map((stat, sIdx) => (
                      <div key={sIdx} className="text-center space-y-0.5 border-r border-slate-150 last:border-r-0">
                        <span className="text-sm font-black text-slate-900 font-mono block">{stat.value}</span>
                        <p className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Reviews/Feedback Section - Bottom of Page 1 */}
            <div className="space-y-3 pt-4 border-t border-slate-200 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 font-black">Trusted Customer Feedback Reviews</span>
                <div className="flex space-x-1">
                  {[1,2,3,4,5].map(i => <span key={i} className="text-amber-500 text-[10px]">★</span>)}
                </div>
              </div>
              
              {template.testimonials && template.testimonials.length > 0 && (
                <div className="grid grid-cols-2 gap-4">
                  {template.testimonials.slice(0, 2).map((r, i) => (
                    <div key={i} className="text-[10px] font-medium leading-relaxed italic text-slate-500 border-l-2 border-amber-500 pl-3.5 space-y-1 bg-slate-50/40 p-2.5 rounded-r-xl">
                      <p className="line-clamp-3">"{r.text}"</p>
                      <span className="font-extrabold text-slate-800 not-italic block text-[9px] mt-1">
                        {r.name} <span className="text-slate-400 font-normal">— {r.company}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Small tiny page number bottom right */}
              <div className="flex justify-between items-center pt-2 text-[9px] text-slate-400 font-mono border-t border-slate-100 mt-1">
                <span>{template.website}</span>
                <span>Page 1 of 3</span>
              </div>
            </div>
          </div>

          {/* ==================== PAGE 2: SERVICE DETAILS & PRICING (QUOTATION) ==================== */}
          <div className="proposal-page-element w-[794px] h-[1123px] mx-auto bg-white text-slate-900 flex flex-col justify-between p-10 shadow-md border border-slate-150 shrink-0">
            <div className="space-y-6">
              {/* Page Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <EFilinggLogo variant="color" size="md" className="-ml-6" />
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">
                  Filing Tariff & Scope
                </span>
              </div>

              {/* Section Title */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest font-mono">CHAPTER 02</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight font-sans">Specific Scope & Commercial Quotation</h2>
                <div className="h-0.5 w-16 bg-slate-200" />
              </div>

              {/* Selected service required banner */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
                <span className="text-[9px] font-extrabold font-mono text-amber-700 uppercase tracking-widest block">Core Compliance Mandate:</span>
                <span className="text-sm font-extrabold text-slate-900 leading-tight block">{proposal.serviceRequired}</span>
              </div>

              {/* Scope & Deliverables Grid */}
              <div className="grid grid-cols-2 gap-6 mt-2">
                {/* Scope Block */}
                <div className="space-y-2.5 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                  <span className="text-[9.5px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Scope of Government Tasks</span>
                  <div className="space-y-2">
                    {pricingData.scope.map((s, idx) => (
                      <div key={idx} className="flex items-start space-x-1.5 text-xs text-slate-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                        <span className="font-medium text-[11px] leading-normal">{s}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deliverables Block */}
                <div className="space-y-2.5 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                  <span className="text-[9.5px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Official Deliverables</span>
                  <div className="space-y-2">
                    {pricingData.deliverables.map((d, idx) => (
                      <div key={idx} className="flex items-start space-x-1.5 text-xs text-slate-600">
                        <div className="h-3.5 w-[14px] bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-[9px] mt-0.5 shrink-0 border border-emerald-100">
                          ✓
                        </div>
                        <span className="font-medium text-[11px] leading-normal">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Documents Required and package inclusions listed cards */}
              <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 mt-2">
                {srv?.documentsRequired && srv.documentsRequired.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[9.5px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Documents Requested:</span>
                    <div className="grid grid-cols-1 gap-1 pl-1.5 text-[10px] text-slate-500 font-semibold leading-normal">
                      {srv.documentsRequired.map((doc, dIdx) => (
                        <div key={dIdx} className="flex items-center space-x-1.5">
                          <div className="h-1 w-1 rounded-full bg-slate-400 shrink-0" />
                          <span>{doc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-[9.5px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Client Requirements:</span>
                    <p className="text-[10px] text-slate-400 italic leading-relaxed">No custom onboarding documents required for selected category.</p>
                  </div>
                )}

                {/* Package inclusions / speed timeline */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between bg-slate-50 px-3.5 py-2.5 border border-slate-100 rounded-lg">
                    <span className="text-[9.5px] font-bold uppercase font-mono text-slate-400">Completion Speed:</span>
                    <span className="text-[11px] font-extrabold text-slate-900">{pricingData.timeline}</span>
                  </div>

                  {srv?.packagesIncluded && srv.packagesIncluded.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9.5px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Included Add-ons:</span>
                      <div className="flex flex-wrap gap-1">
                        {srv.packagesIncluded.map((pkg, idx) => (
                          <span key={idx} className="px-2 py-0.5 bg-amber-500/10 text-amber-800 font-bold text-[9px] rounded-md">
                            {pkg}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing details - Bottom of Page 2 */}
            <div className="space-y-4 pt-4 border-t-2 border-slate-900 mt-auto">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-xs text-slate-900 uppercase font-mono tracking-widest">Pricing & Statutory Fee Breakdown</h3>
                <span className="text-[9px] text-slate-400 font-mono">Local Cur. (INR)</span>
              </div>

              <div className="grid grid-cols-2 gap-8 items-end">
                <div className="text-[10px] text-slate-400 font-sans italic leading-normal">
                  *All official filing fees, professional service charges, and GST are bundled transparently within the net professional fee quoted. No additional out-of-pocket overheads.
                </div>
                
                <div className="space-y-1.5 font-mono text-xs text-right">
                  {srv?.priceBreakup && srv.priceBreakup.length > 0 ? (
                    <>
                      {srv.priceBreakup.map((item, bIdx) => {
                        const discountAmt = item.discount || 0;
                        const netPrice = item.amount - discountAmt;
                        return (
                          <div key={bIdx} className="flex flex-col py-1 border-b border-dashed border-slate-250">
                            <div className="flex items-center justify-between text-slate-700">
                              <span className="font-semibold">{item.name}</span>
                              <span>₹{netPrice.toLocaleString()}</span>
                            </div>
                            {discountAmt > 0 && (
                              <div className="flex items-center justify-between text-[10px] text-emerald-600 font-mono">
                                <span>Std: ₹{item.amount.toLocaleString()}</span>
                                <span>Save ₹{discountAmt.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      
                      {srv.priceBreakup.some(b => (b.discount || 0) > 0) && (
                        <div className="flex items-center justify-between text-emerald-600 text-[10px] font-bold py-1 bg-emerald-50/40 dark:bg-emerald-950/10 px-1 rounded font-mono">
                          <span>YOUR TOTAL SAVING</span>
                          <span>₹{srv.priceBreakup.reduce((sum, item) => sum + (item.discount || 0), 0).toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-slate-900 text-sm font-black py-1 pt-2 border-t border-slate-300">
                        <span>Net Quoted Fee</span>
                        <span>₹{proposal.amount.toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between text-slate-900 text-sm font-black py-1 border-t border-slate-300 pt-2">
                      <span>Total Professional Net Fee</span>
                      <span>₹{proposal.amount.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* page number footer */}
              <div className="flex justify-between items-center pt-2 text-[9px] text-slate-400 font-mono border-t border-slate-100">
                <span>Commercial Inclusions</span>
                <span>Page 2 of 3</span>
              </div>
            </div>
          </div>

          {/* ==================== PAGE 3: PROCESS FLOW, TERMS, AND HUB CONTACT ==================== */}
          <div className="proposal-page-element w-[794px] h-[1123px] mx-auto bg-white text-slate-900 flex flex-col justify-between p-10 shadow-md border border-slate-150 shrink-0">
            <div className="space-y-6">
              {/* Page Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3">
                <EFilinggLogo variant="color" size="md" className="-ml-6" />
                <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest uppercase">
                  Engagement & Compliance
                </span>
              </div>

              {/* Section Title */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest font-mono">CHAPTER 03</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight font-sans">Workflow Execution & Terms</h2>
                <div className="h-0.5 w-16 bg-slate-200" />
              </div>

              {/* Process Flow stages in compact 5 step process block */}
              {template.processFlowStages && (
                <div className="space-y-3 mt-4">
                  <span className="text-[9.5px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Filing Execution Steps:</span>
                  <div className="grid grid-cols-5 gap-2 pt-1 text-slate-800">
                    {template.processFlowStages.slice(0, 5).map((stg, sIdx) => (
                      <div key={sIdx} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-1 text-center relative overflow-hidden">
                        <span className="font-extrabold text-xs text-amber-600 block">Stage 0{sIdx+1}</span>
                        <span className="text-[10px] font-bold text-slate-900 block truncate leading-tight" title={stg.title}>{stg.title}</span>
                        <p className="text-[8.5px] text-slate-400 leading-normal line-clamp-3">{stg.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Terms & Conditions list */}
              {template.termsAndConditions && (
                <div className="space-y-2.5 pt-4 border-t border-slate-100 mt-2">
                  <h3 className="font-extrabold text-xs uppercase font-mono text-slate-400 tracking-wider">Terms & Conditions of business engagement</h3>
                  <div className="space-y-1.5 text-[10px] text-slate-500 leading-relaxed font-sans pl-1.5">
                    {template.termsAndConditions.slice(0, 6).map((term, tIdx) => (
                      <p key={tIdx} className="flex items-start space-x-1.5">
                        <span className="font-mono font-bold text-amber-600 shrink-0">{tIdx+1}.</span>
                        <span>{term}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Block - Hub Contact details inside beautiful card */}
            <div className="space-y-4 pt-4 border-t border-slate-150 mt-auto">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 bg-slate-950 text-white rounded-2xl relative overflow-hidden">
                {/* Decorative gradient block */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />

                <div className="col-span-1 space-y-1 flex flex-col justify-center">
                  <EFilinggLogo variant="dark" size="sm" className="-ml-3" />
                  <p className="text-[8px] text-slate-400 font-mono tracking-wider leading-tight">LEGAL & REGISTRY HUB</p>
                </div>

                <div className="col-span-3 grid grid-cols-3 gap-3 text-[9px] text-slate-350">
                  <div className="space-y-1 border-r border-slate-800 pr-2">
                    <div className="flex items-center space-x-1">
                      <Globe className="h-2.5 w-2.5 text-amber-400" />
                      <p className="font-bold text-white text-[9.5px]">Digital Portal</p>
                    </div>
                    <p className="break-all font-mono text-[8px] mt-0.5">{template.website}</p>
                    <p className="break-all font-mono text-[8px]">{template.supportEmail}</p>
                  </div>

                  <div className="space-y-1 border-r border-slate-800 pr-2">
                    <div className="flex items-center space-x-1">
                      <Phone className="h-2.5 w-2.5 text-amber-400" />
                      <p className="font-bold text-white text-[9.5px]">Assistance</p>
                    </div>
                    <p className="font-mono text-[8px] mt-0.5">{template.supportPhone1}</p>
                    <p className="font-mono text-[8px]">{template.supportPhone2}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-2.5 w-2.5 text-amber-400" />
                      <p className="font-bold text-white text-[9.5px]">Headquarters</p>
                    </div>
                    <p className="leading-tight text-[8px] text-slate-400 mt-0.5">{template.officeAddress}</p>
                  </div>
                </div>
              </div>

              {/* page number footer */}
              <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono border-t border-slate-100 pt-2 mt-1">
                <span>Official Legal Mandates</span>
                <span>Page 3 of 3</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
