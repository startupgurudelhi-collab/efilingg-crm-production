import React from 'react';

export function BusinessOperationsIllustration({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="opGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="opGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#059669" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="opGradCard" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Background Soft Glow */}
      <circle cx="140" cy="90" r="70" fill="url(#opGrad1)" filter="blur(20px)" opacity="0.3" />

      {/* Main Base Workflow Platform */}
      <rect x="35" y="40" width="210" height="110" rx="16" fill="url(#opGradCard)" stroke="#334155" strokeWidth="1.5" />
      
      {/* Top Header Bar inside card */}
      <rect x="35" y="40" width="210" height="24" rx="16" fill="#1E293B" />
      <circle cx="50" cy="52" r="3.5" fill="#EF4444" />
      <circle cx="62" cy="52" r="3.5" fill="#F59E0B" />
      <circle cx="74" cy="52" r="3.5" fill="#10B981" />
      <rect x="95" y="48" width="80" height="8" rx="4" fill="#334155" />

      {/* Workflow Process Blocks */}
      {/* Step 1: GST */}
      <g transform="translate(50, 75)">
        <rect width="46" height="50" rx="8" fill="#1E293B" stroke="#6366F1" strokeWidth="1.5" />
        <rect x="8" y="10" width="30" height="4" rx="2" fill="#818CF8" />
        <rect x="8" y="18" width="22" height="3" rx="1.5" fill="#94A3B8" />
        <circle cx="23" cy="35" r="7" fill="#6366F1" fillOpacity="0.2" />
        <path d="M19 35L22 38L27 33" stroke="#818CF8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Connector 1 */}
      <path d="M96 100H117" stroke="#6366F1" strokeWidth="2" strokeDasharray="3 3" />
      <polygon points="116,97 121,100 116,103" fill="#6366F1" />

      {/* Step 2: ITR / MCA */}
      <g transform="translate(122, 75)">
        <rect width="46" height="50" rx="8" fill="#1E293B" stroke="#10B981" strokeWidth="1.5" />
        <rect x="8" y="10" width="30" height="4" rx="2" fill="#34D399" />
        <rect x="8" y="18" width="22" height="3" rx="1.5" fill="#94A3B8" />
        <circle cx="23" cy="35" r="7" fill="#10B981" fillOpacity="0.2" />
        <path d="M19 35L22 38L27 33" stroke="#34D399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Connector 2 */}
      <path d="M168 100H189" stroke="#10B981" strokeWidth="2" strokeDasharray="3 3" />
      <polygon points="188,97 193,100 188,103" fill="#10B981" />

      {/* Step 3: Verified Client Delivery */}
      <g transform="translate(194, 75)">
        <rect width="40" height="50" rx="8" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
        <circle cx="20" cy="22" r="10" fill="#F59E0B" fillOpacity="0.2" />
        <path d="M15 22L19 26L25 18" stroke="#FBBF24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="6" y="38" width="28" height="4" rx="2" fill="#F59E0B" fillOpacity="0.6" />
      </g>

      {/* Floating Badge */}
      <g transform="translate(180, 20)">
        <rect width="75" height="24" rx="12" fill="#10B981" />
        <text x="37" y="16" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
          100% FILED
        </text>
      </g>
    </svg>
  );
}

export function TeamCollaborationIllustration({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="teamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#EC4899" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id="cardGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#0F172A" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* Ambient Glow */}
      <circle cx="140" cy="90" r="65" fill="url(#teamGrad)" filter="blur(22px)" opacity="0.25" />

      {/* Central Hub */}
      <circle cx="140" cy="90" r="32" fill="url(#cardGradDark)" stroke="#8B5CF6" strokeWidth="2" />
      <circle cx="140" cy="82" r="10" fill="#A78BFA" />
      <path d="M125 106C125 98 132 96 140 96C148 96 155 98 155 106" fill="#8B5CF6" />

      {/* Connecting Network Strands */}
      <line x1="140" y1="58" x2="140" y2="35" stroke="#8B5CF6" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="168" y1="76" x2="210" y2="55" stroke="#EC4899" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="168" y1="104" x2="215" y2="125" stroke="#10B981" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="112" y1="104" x2="65" y2="125" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="112" y1="76" x2="70" y2="55" stroke="#3B82F6" strokeWidth="1.5" strokeDasharray="3 3" />

      {/* Node 1: Top (Team Leader) */}
      <g transform="translate(122, 14)">
        <rect width="36" height="24" rx="12" fill="#1E293B" stroke="#8B5CF6" strokeWidth="1.5" />
        <circle cx="18" cy="12" r="6" fill="#C4B5FD" />
      </g>

      {/* Node 2: Top Right (Sales Exec) */}
      <g transform="translate(205, 42)">
        <circle cx="16" cy="16" r="16" fill="#1E293B" stroke="#EC4899" strokeWidth="1.5" />
        <circle cx="16" cy="12" r="5" fill="#F472B6" />
        <path d="M9 25C9 21 12 20 16 20C20 20 23 21 23 25" fill="#EC4899" />
      </g>

      {/* Node 3: Bottom Right (Ops Exec) */}
      <g transform="translate(210, 112)">
        <circle cx="16" cy="16" r="16" fill="#1E293B" stroke="#10B981" strokeWidth="1.5" />
        <circle cx="16" cy="12" r="5" fill="#34D399" />
        <path d="M9 25C9 21 12 20 16 20C20 20 23 21 23 25" fill="#10B981" />
      </g>

      {/* Node 4: Bottom Left (Attendance / Payroll) */}
      <g transform="translate(42, 112)">
        <circle cx="16" cy="16" r="16" fill="#1E293B" stroke="#F59E0B" strokeWidth="1.5" />
        <circle cx="16" cy="12" r="5" fill="#FBBF24" />
        <path d="M9 25C9 21 12 20 16 20C20 20 23 21 23 25" fill="#F59E0B" />
      </g>

      {/* Node 5: Top Left (Compliance) */}
      <g transform="translate(45, 42)">
        <circle cx="16" cy="16" r="16" fill="#1E293B" stroke="#3B82F6" strokeWidth="1.5" />
        <circle cx="16" cy="12" r="5" fill="#60A5FA" />
        <path d="M9 25C9 21 12 20 16 20C20 20 23 21 23 25" fill="#3B82F6" />
      </g>

      {/* Live Badge */}
      <g transform="translate(95, 142)">
        <rect width="90" height="22" rx="11" fill="#8B5CF6" fillOpacity="0.2" stroke="#8B5CF6" strokeWidth="1" />
        <circle cx="108" cy="153" r="3" fill="#10B981" />
        <text x="145" y="156" fill="#C4B5FD" fontSize="8.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
          REALTIME SYNC
        </text>
      </g>
    </svg>
  );
}

export function AnalyticsIllustration({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="barGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#1D4ED8" />
        </linearGradient>
        <linearGradient id="barGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
      </defs>

      {/* Card Base */}
      <rect x="25" y="25" width="230" height="135" rx="14" fill="#0F172A" stroke="#334155" strokeWidth="1.5" />

      {/* Grid Lines */}
      <line x1="45" y1="60" x2="235" y2="60" stroke="#1E293B" strokeWidth="1" />
      <line x1="45" y1="90" x2="235" y2="90" stroke="#1E293B" strokeWidth="1" />
      <line x1="45" y1="120" x2="235" y2="120" stroke="#1E293B" strokeWidth="1" />

      {/* Bars */}
      <rect x="55" y="85" width="16" height="45" rx="3" fill="url(#barGrad1)" />
      <rect x="90" y="70" width="16" height="60" rx="3" fill="url(#barGrad1)" />
      <rect x="125" y="55" width="16" height="75" rx="3" fill="url(#barGrad1)" />
      <rect x="160" y="45" width="16" height="85" rx="3" fill="url(#barGrad2)" />
      <rect x="195" y="38" width="16" height="92" rx="3" fill="url(#barGrad2)" />

      {/* Area Gradient under curve */}
      <path d="M63 80 Q 98 65, 133 50 T 203 35 L 203 130 L 63 130 Z" fill="url(#chartGrad)" />

      {/* Spline Trendline */}
      <path d="M63 80 Q 98 65, 133 50 T 203 35" stroke="#34D399" strokeWidth="3" strokeLinecap="round" />
      
      {/* Target Dot */}
      <circle cx="203" cy="35" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />

      {/* Metric Badge */}
      <g transform="translate(155, 10)">
        <rect width="85" height="22" rx="6" fill="#10B981" />
        <text x="42" y="15" fill="white" fontSize="9" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
          +38.4% GROWTH
        </text>
      </g>
    </svg>
  );
}

export function ComplianceSecurityIllustration({ className = "w-full h-full" }: { className?: string }) {
  return (
    <svg viewBox="0 0 280 180" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="secGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#1E40AF" stopOpacity="0.2" />
        </linearGradient>
      </defs>

      {/* Ambient Glow */}
      <circle cx="140" cy="90" r="60" fill="url(#secGrad)" filter="blur(25px)" opacity="0.3" />

      {/* Central Shield */}
      <path
        d="M140 30L190 52V98C190 128 168 152 140 162C112 152 90 128 90 98V52L140 30Z"
        fill="#0F172A"
        stroke="#3B82F6"
        strokeWidth="2.5"
      />

      {/* Inner Shield Layer */}
      <path
        d="M140 42L178 58V95C178 118 162 138 140 146C118 138 102 118 102 95V58L140 42Z"
        fill="#1E293B"
        stroke="#60A5FA"
        strokeWidth="1.5"
        strokeOpacity="0.6"
      />

      {/* Checkmark in Center */}
      <circle cx="140" cy="92" r="20" fill="#3B82F6" fillOpacity="0.2" />
      <path d="M128 92L136 100L152 84" stroke="#60A5FA" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Orbiting Security Indicators */}
      {/* 1. OCC Verified */}
      <g transform="translate(35, 60)">
        <rect width="50" height="24" rx="12" fill="#1E293B" stroke="#10B981" strokeWidth="1.5" />
        <text x="25" y="16" fill="#34D399" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
          OCC vN
        </text>
      </g>

      {/* 2. SHA-256 Snapshots */}
      <g transform="translate(195, 60)">
        <rect width="55" height="24" rx="12" fill="#1E293B" stroke="#8B5CF6" strokeWidth="1.5" />
        <text x="27" y="16" fill="#C4B5FD" fontSize="8" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
          SHA-256
        </text>
      </g>

      {/* 3. Zero Data Loss */}
      <g transform="translate(100, 155)">
        <rect width="80" height="20" rx="10" fill="#1E293B" stroke="#3B82F6" strokeWidth="1" />
        <text x="40" y="14" fill="#93C5FD" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
          ZERO DATA LOSS
        </text>
      </g>
    </svg>
  );
}
