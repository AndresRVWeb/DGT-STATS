import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showSubtitle?: boolean;
  subtitle?: string;
  className?: string;
  collapsed?: boolean;
  theme?: 'dark' | 'light';
}

/**
 * ARV AutoMetrics Official Brand Logo
 * Minimalist, high-tech automotive and data analytics identity.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showSubtitle = true,
  subtitle = 'Observatorio Oficial DGT',
  className = '',
  collapsed = false,
  theme = 'dark',
}) => {
  // Dimensions based on size
  const iconDimensions = {
    sm: { box: 'w-7 h-7', svg: 28, rounded: 'rounded-lg' },
    md: { box: 'w-9 h-9', svg: 36, rounded: 'rounded-xl' },
    lg: { box: 'w-11 h-11', svg: 44, rounded: 'rounded-2xl' },
  }[size];

  const textSizes = {
    sm: { arv: 'text-xs', main: 'text-sm', sub: 'text-[10px]' },
    md: { arv: 'text-sm', main: 'text-base', sub: 'text-xs' },
    lg: { arv: 'text-base', main: 'text-lg', sub: 'text-xs' },
  }[size];

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Modern Minimalist Geometric Emblem */}
      <div
        className={`${iconDimensions.box} ${iconDimensions.rounded} shrink-0 relative flex items-center justify-center p-1 bg-gradient-to-b from-slate-800 to-slate-950 border border-slate-700/70 shadow-lg shadow-emerald-950/20 overflow-hidden group`}
        title="ARV AutoMetrics"
      >
        {/* Ambient subtle backglow */}
        <div className="absolute inset-0 bg-radial from-emerald-500/15 via-transparent to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

        <svg
          viewBox="0 0 36 36"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full relative z-10"
        >
          <defs>
            {/* Speed & Analytics Emerald-Cyan Gradient */}
            <linearGradient id="arv-speed" x1="4" y1="4" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="45%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>

            <linearGradient id="arv-accent" x1="10" y1="20" x2="26" y2="20" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#38BDF8" />
            </linearGradient>

            <filter id="arv-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#10B981" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Minimalist Geometric 'A-R-V' Convergence:
              - Left Apex Vector (A)
              - Dynamic Upper Loop & Acceleration Path (R)
              - Lower Velocity Chevron Base (V)
          */}

          {/* Ascending Highway / Chevron Track (Left Wing) */}
          <path
            d="M8 28.5L18 7.5L21 11.5L12.5 28.5H8Z"
            fill="url(#arv-speed)"
          />

          {/* Dynamic Right Arc / Telemetry Curve (R Loop & Track) */}
          <path
            d="M18 7.5L25.5 13C27.8 14.8 28.5 18 26.5 20.8C25.2 22.5 23 23.5 20.5 23.5H16.5L19 18.5H21C22.2 18.5 23.2 17.6 23.2 16.4C23.2 15.2 22.2 14.3 21 14.3H16L18 7.5Z"
            fill="url(#arv-speed)"
          />

          {/* Lower Dynamic Velocity Notch (V kick & leg) */}
          <path
            d="M19.5 23.5L27.5 28.5H22.5L17.5 23.5H19.5Z"
            fill="url(#arv-speed)"
            opacity="0.85"
          />

          {/* Center Precision Telemetry / Metrics Pulse */}
          <rect
            x="11"
            y="20.5"
            width="8"
            height="2.2"
            rx="1.1"
            fill="url(#arv-accent)"
            filter="url(#arv-glow)"
          />

          {/* Apex Telemetry Light Dot */}
          <circle cx="18" cy="7.5" r="1.5" fill="#34D399" />
        </svg>
      </div>

      {/* Brand Typographic Identity */}
      {!collapsed && (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 leading-none">
            {/* ARV Monogram Accent */}
            <span
              className={`font-display font-black tracking-tight ${textSizes.arv} bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent`}
            >
              ARV
            </span>

            {/* AutoMetrics Core Name */}
            <span
              className={`font-display font-bold tracking-tight ${textSizes.main} ${
                theme === 'dark' ? 'text-white' : 'text-slate-900'
              }`}
            >
              AutoMetrics
            </span>

            {/* Official Indicator Pill */}
            <span className="text-[10px] font-mono font-semibold px-1 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              DGT
            </span>
          </div>

          {showSubtitle && (
            <p
              className={`${textSizes.sub} truncate mt-1 ${
                theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
              }`}
            >
              {subtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
