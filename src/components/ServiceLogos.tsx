/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

// 1. GST (Goods & Services Tax) Official Tricolor Emblem Logo
export function GSTServiceLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        {/* Outer Hexagon Shield */}
        <path
          d="M50 4L90 26.5V73.5L50 96L10 73.5V26.5L50 4Z"
          fill="#0F172A"
          stroke="url(#gstBorderGrad)"
          strokeWidth="3"
        />
        {/* Tricolor Accent Rings */}
        <path d="M50 8L86 28.5V40H14V28.5L50 8Z" fill="#FF9933" fillOpacity="0.85" />
        <rect x="14" y="40" width="72" height="20" fill="#FFFFFF" fillOpacity="0.95" />
        <path d="M14 60H86V71.5L50 92L14 71.5V60Z" fill="#138808" fillOpacity="0.85" />
        
        {/* Center Ashoka Chakra Ring */}
        <circle cx="50" cy="50" r="8" stroke="#000080" strokeWidth="1.5" fill="none" opacity="0.3" />
        
        {/* GST Bold Lettering */}
        <text
          x="50"
          y="56"
          textAnchor="middle"
          fill="#0F172A"
          fontSize="20"
          fontWeight="900"
          fontFamily="system-ui, -apple-system, sans-serif"
          letterSpacing="1"
        >
          GST
        </text>

        <defs>
          <linearGradient id="gstBorderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF9933" />
            <stop offset="50%" stopColor="#CBD5E1" />
            <stop offset="100%" stopColor="#138808" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

// 2. Income Tax Department Official Seal Logo
export function IncomeTaxServiceLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        {/* Outer Circular Seal */}
        <circle cx="50" cy="50" r="46" fill="#0A2540" stroke="#F59E0B" strokeWidth="3" />
        <circle cx="50" cy="50" r="40" fill="#0D3B66" stroke="#38BDF8" strokeWidth="1" strokeDasharray="3 2" />
        
        {/* Scales of Justice & Rupee Symbol */}
        <path d="M50 18V72" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M30 32H70" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Left Pan */}
        <path d="M30 32L22 46H38L30 32Z" fill="#F59E0B" fillOpacity="0.4" stroke="#FDE047" strokeWidth="1.5" />
        {/* Right Pan */}
        <path d="M70 32L62 46H78L70 32Z" fill="#F59E0B" fillOpacity="0.4" stroke="#FDE047" strokeWidth="1.5" />
        
        {/* Base Pillar */}
        <path d="M38 72H62L58 78H42L38 72Z" fill="#FDE047" />
        
        {/* Income Tax Badge Text */}
        <rect x="20" y="56" width="60" height="15" rx="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="1" />
        <text
          x="50"
          y="67"
          textAnchor="middle"
          fill="#38BDF8"
          fontSize="9"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.5"
        >
          INCOME TAX
        </text>
      </svg>
    </div>
  );
}

// 3. Ministry of Corporate Affairs (MCA & ROC) Emblem Logo
export function MCAServiceLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        {/* Government Portal Shield */}
        <path
          d="M50 6C26 6 12 18 12 36C12 68 50 94 50 94C50 94 88 68 88 36C88 18 74 6 50 6Z"
          fill="#1E1B4B"
          stroke="#818CF8"
          strokeWidth="3"
        />
        
        {/* Corporate Pillars / Greek Pediment */}
        <path d="M26 40H74L50 24L26 40Z" fill="#6366F1" />
        <rect x="30" y="42" width="6" height="24" rx="1" fill="#C7D2FE" />
        <rect x="42" y="42" width="6" height="24" rx="1" fill="#C7D2FE" />
        <rect x="54" y="42" width="6" height="24" rx="1" fill="#C7D2FE" />
        <rect x="66" y="42" width="6" height="24" rx="1" fill="#C7D2FE" />
        <rect x="24" y="66" width="54" height="6" rx="1" fill="#818CF8" />

        {/* MCA Text Pill */}
        <rect x="26" y="74" width="48" height="13" rx="3" fill="#312E81" stroke="#A5B4FC" strokeWidth="1" />
        <text
          x="50"
          y="84"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="9"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="1"
        >
          MCA / ROC
        </text>
      </svg>
    </div>
  );
}

// 4. NGO & Trust (12A, 80G, CSR) Foundation Logo
export function NGOServiceLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        {/* Outer Circular Badge */}
        <circle cx="50" cy="50" r="46" fill="#064E3B" stroke="#34D399" strokeWidth="3" />
        <circle cx="50" cy="50" r="38" fill="#047857" fillOpacity="0.4" stroke="#6EE7B7" strokeWidth="1" strokeDasharray="2 2" />

        {/* Caring Hands & Heart / Sprout */}
        <path
          d="M50 24C44 16 32 18 30 28C28 38 48 54 50 56C52 54 72 38 70 28C68 18 56 16 50 24Z"
          fill="#F43F5E"
          stroke="#FFE4E6"
          strokeWidth="1.5"
        />

        {/* Supportive Foundation Hands */}
        <path
          d="M24 60C32 54 44 58 50 64C56 58 68 54 76 60C70 70 58 74 50 74C42 74 30 70 24 60Z"
          fill="#34D399"
        />

        {/* NGO Text Ribbon */}
        <rect x="22" y="68" width="56" height="15" rx="4" fill="#022C22" stroke="#6EE7B7" strokeWidth="1" />
        <text
          x="50"
          y="79"
          textAnchor="middle"
          fill="#6EE7B7"
          fontSize="9"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.8"
        >
          NGO & TRUST
        </text>
      </svg>
    </div>
  );
}

// 5. Digital Signature (DSC) Class 3 Token Logo
export function DSCServiceLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <circle cx="50" cy="50" r="46" fill="#1E293B" stroke="#06B6D4" strokeWidth="3" />
        
        {/* USB Token / Security Dongle */}
        <rect x="36" y="24" width="28" height="42" rx="6" fill="#0F172A" stroke="#22D3EE" strokeWidth="2" />
        <rect x="42" y="14" width="16" height="10" rx="2" fill="#94A3B8" stroke="#CBD5E1" strokeWidth="1.5" />
        <rect x="45" y="17" width="3" height="4" fill="#0F172A" />
        <rect x="52" y="17" width="3" height="4" fill="#0F172A" />

        {/* Cryptographic Key / Chip Motif */}
        <circle cx="50" cy="42" r="5" fill="#F59E0B" />
        <path d="M50 47V56M46 52H54" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />

        {/* DSC Token Text */}
        <rect x="22" y="70" width="56" height="15" rx="4" fill="#083344" stroke="#06B6D4" strokeWidth="1" />
        <text
          x="50"
          y="81"
          textAnchor="middle"
          fill="#22D3EE"
          fontSize="9"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.8"
        >
          CLASS 3 DSC
        </text>
      </svg>
    </div>
  );
}

// 6. Trademark & IP Registry Logo
export function TrademarkServiceLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <circle cx="50" cy="50" r="46" fill="#3B0764" stroke="#C084FC" strokeWidth="3" />
        <circle cx="50" cy="50" r="38" fill="#581C87" stroke="#E9D5FF" strokeWidth="1" />
        
        {/* Large ® Symbol */}
        <circle cx="50" cy="42" r="18" fill="none" stroke="#FDE047" strokeWidth="3" />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          fill="#FDE047"
          fontSize="22"
          fontWeight="900"
          fontFamily="Georgia, serif"
        >
          R
        </text>

        {/* Ribbon */}
        <rect x="18" y="68" width="64" height="15" rx="4" fill="#2E1065" stroke="#C084FC" strokeWidth="1" />
        <text
          x="50"
          y="79"
          textAnchor="middle"
          fill="#F5D0FE"
          fontSize="8.5"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.8"
        >
          TRADEMARK & IP
        </text>
      </svg>
    </div>
  );
}

// 7. Task Command Center Logo
export function TaskCommandLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <circle cx="50" cy="50" r="46" fill="#1E1B4B" stroke="#6366F1" strokeWidth="3" />
        
        {/* Clipboard & Checklist */}
        <rect x="30" y="22" width="40" height="50" rx="5" fill="#312E81" stroke="#818CF8" strokeWidth="2" />
        <rect x="42" y="16" width="16" height="8" rx="2" fill="#C7D2FE" />

        {/* Check items */}
        <path d="M38 34L42 38L50 30" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="54" y="32" width="10" height="3" rx="1.5" fill="#C7D2FE" />

        <path d="M38 46L42 50L50 42" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="54" y="44" width="10" height="3" rx="1.5" fill="#C7D2FE" />

        <path d="M38 58L42 62L50 54" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="54" y="56" width="10" height="3" rx="1.5" fill="#C7D2FE" />

        {/* Badge */}
        <rect x="18" y="72" width="64" height="14" rx="4" fill="#0F172A" stroke="#818CF8" strokeWidth="1" />
        <text
          x="50"
          y="82"
          textAnchor="middle"
          fill="#A5B4FC"
          fontSize="8"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.8"
        >
          TASK QUEUE
        </text>
      </svg>
    </div>
  );
}

// 8. Sales CRM & Leads Rocket Logo
export function SalesCRMLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <circle cx="50" cy="50" r="46" fill="#064E3B" stroke="#10B981" strokeWidth="3" />
        
        {/* Rocket Graphic */}
        <path
          d="M50 18C50 18 64 28 64 50L50 58L36 50C36 28 50 18 50 18Z"
          fill="#ECFDF5"
          stroke="#059669"
          strokeWidth="2"
        />
        <circle cx="50" cy="34" r="5" fill="#10B981" />
        {/* Flames */}
        <path d="M46 58L50 70L54 58H46Z" fill="#F59E0B" />
        <path d="M48 58L50 66L52 58H48Z" fill="#EF4444" />

        {/* Badge */}
        <rect x="18" y="72" width="64" height="14" rx="4" fill="#022C22" stroke="#10B981" strokeWidth="1" />
        <text
          x="50"
          y="82"
          textAnchor="middle"
          fill="#6EE7B7"
          fontSize="8.5"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.8"
        >
          SALES & LEADS
        </text>
      </svg>
    </div>
  );
}

// 9. Registration & License Logo
export function LicenseServiceLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <circle cx="50" cy="50" r="46" fill="#134E4A" stroke="#2DD4BF" strokeWidth="3" />
        
        {/* Certificate / License Document */}
        <rect x="28" y="22" width="44" height="52" rx="4" fill="#CCFBF1" stroke="#0D9488" strokeWidth="2" />
        <circle cx="50" cy="38" r="7" fill="#0D9488" />
        <path d="M46 52H54M38 58H62M38 64H56" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" />
        {/* Ribbon */}
        <path d="M46 45L42 55L46 53L50 55L46 45Z" fill="#F59E0B" />

        {/* Badge */}
        <rect x="16" y="72" width="68" height="14" rx="4" fill="#042F2E" stroke="#2DD4BF" strokeWidth="1" />
        <text
          x="50"
          y="82"
          textAnchor="middle"
          fill="#5EEAD4"
          fontSize="7.5"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.8"
        >
          LICENSES & REG
        </text>
      </svg>
    </div>
  );
}

// 10. Client Master Logo
export function ClientMasterLogo({ className = "h-14 w-14", size = 'md' }: LogoProps) {
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-md">
        <circle cx="50" cy="50" r="46" fill="#312E81" stroke="#818CF8" strokeWidth="3" />
        
        {/* Network of clients / Directory */}
        <circle cx="50" cy="34" r="8" fill="#E0E7FF" stroke="#4F46E5" strokeWidth="2" />
        <path d="M34 56C34 48 42 46 50 46C58 46 66 48 66 56V62H34V56Z" fill="#C7D2FE" stroke="#4F46E5" strokeWidth="1.5" />
        <circle cx="28" cy="40" r="5" fill="#A5B4FC" />
        <circle cx="72" cy="40" r="5" fill="#A5B4FC" />

        {/* Badge */}
        <rect x="16" y="72" width="68" height="14" rx="4" fill="#1E1B4B" stroke="#818CF8" strokeWidth="1" />
        <text
          x="50"
          y="82"
          textAnchor="middle"
          fill="#C7D2FE"
          fontSize="7.5"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.8"
        >
          CLIENT MASTER
        </text>
      </svg>
    </div>
  );
}
