import React from 'react';

interface EFilinggLogoProps {
  className?: string;
  variant?: 'light' | 'dark' | 'color';
  size?: 'sm' | 'md' | 'lg' | 'auto';
}

export default function EFilinggLogo({ className = '', variant = 'color', size = 'md' }: EFilinggLogoProps) {
  // Dimension definitions matching requested sizes
  const dims = {
    sm: { width: '110px', height: '40px' },
    md: { width: '185px', height: '62px' },
    lg: { width: '300px', height: '100px' },
    auto: { width: '100%', height: '100%' }
  }[size];

  // Proportional colors
  const textColor = variant === 'dark' ? '#FFFFFF' : '#0F172A';
  const subtextColor = variant === 'dark' ? '#E2E8F0' : '#1E293B';
  const goldColor1 = '#E5A93B'; // Gold base gradient
  const goldColor2 = '#C58F28'; // Gold shade 2
  const goldColor3 = '#FFE899'; // Sparkle highlight accent

  return (
    <div className={`flex items-center justify-center select-none ${className}`} style={{ width: dims.width, height: dims.height }}>
      <svg
        viewBox="0 0 500 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        <defs>
          {/* Gold Glitter Polish Gradients */}
          <linearGradient id="efGoldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={goldColor3} />
            <stop offset="30%" stopColor={goldColor1} />
            <stop offset="70%" stopColor={goldColor2} />
            <stop offset="100%" stopColor={goldColor1} />
          </linearGradient>
          
          <linearGradient id="goldSwooshGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={goldColor2} />
            <stop offset="30%" stopColor={goldColor1} />
            <stop offset="50%" stopColor={goldColor3} />
            <stop offset="70%" stopColor={goldColor1} />
            <stop offset="100%" stopColor={goldColor2} />
          </linearGradient>
        </defs>

        {/* 1. Golden Circle with Lowercase 'e' */}
        <g id="circle-e-logo">
          <circle cx="46" cy="62" r="32" fill="url(#efGoldGradient)" />
          <text
            x="46"
            y="73"
            textAnchor="middle"
            fontFamily="'Inter', 'Arial', sans-serif"
            fontWeight="900"
            fontSize="44"
            fill={variant === 'dark' ? '#0F172A' : '#FFFFFF'}
          >
            e
          </text>
        </g>

        {/* 2 & 4. Brand Fonts "Filin" and "gg.com" */}
        <g id="brand-text">
          <text
            x="96"
            y="76"
            fontFamily="'Inter', 'Arial', sans-serif"
            fontWeight="800"
            fontSize="54"
            letterSpacing="-1.5"
            fill={textColor}
          >
            Filin
          </text>
          
          <text
            x="242"
            y="76"
            fontFamily="'Inter', 'Arial', sans-serif"
            fontWeight="800"
            fontSize="54"
            letterSpacing="-1.5"
            fill={textColor}
          >
            gg.com
          </text>
        </g>

        {/* 3. Golden vertical arrow pointing up */}
        <g id="golden-arrow">
          <rect x="223" y="28" width="8" height="50" fill="url(#efGoldGradient)" rx="2" />
          <path
            d="M207 36 L227 12 L247 36 L237 36 L227 24 L217 36 Z"
            fill="url(#efGoldGradient)"
          />
        </g>

        {/* 5. Golden swept swoosh / arch curve line below */}
        <g id="golden-sweeping-curve">
          <path
            d="M10 102 Q227 128 490 102 Q227 110 10 102 Z"
            fill="url(#goldSwooshGrad)"
          />
          <path
            d="M217 114 L237 114 L227 126 Z"
            fill={textColor}
          />
        </g>

        {/* 6. "Compliance Made Easy" Subtext */}
        <text
          x="250"
          y="152"
          textAnchor="middle"
          fontFamily="'Inter', 'Arial', sans-serif"
          fontWeight="800"
          fontSize="24"
          letterSpacing="0.8"
          fill={subtextColor}
        >
          Compliance Made Easy
        </text>
      </svg>
    </div>
  );
}
