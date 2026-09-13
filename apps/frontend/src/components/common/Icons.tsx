import React from 'react';
import logoHeaderImg from '@/assets/logo-header.png';

/**
 * Australia continent outline SVG
 */
export function AustraliaIcon({ className = 'w-4 h-4', fill = 'currentColor' }: { className?: string; fill?: string }) {
  return (<svg viewBox="0 0 100 80" className={className} fill={fill}>
      {/* Accurate simplified Australian mainland + Tasmania silhouette */}
      <path d="M22,18 C28,14 36,12 45,15 C48,16 50,13 54,12 C57,11 62,14 65,18 C67,21 72,21 75,24 C80,29 86,33 87,41 C88,48 83,54 80,60 C75,67 67,69 60,68 C54,67 48,70 41,69 C34,68 28,66 22,60 C17,54 13,46 14,38 C15,30 17,23 22,18 Z M68,74 C70,74 72,76 72,78 C72,80 69,81 67,80 C65,79 66,75 68,74 Z" />
    </svg>);
}

/**
 * NDIS circular badge
 */
export function NdisBadgeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (<svg viewBox="0 0 100 100" className={className} fill="none">
      <circle cx="50" cy="50" r="48" fill="#147A7A" />
      <text
        x="50"
        y="58"
        fill="white"
        fontSize="32"
        fontWeight="800"
        textAnchor="middle"
        fontFamily="sans-serif"
        letterSpacing="-1"
      >
        ndis
      </text>
    </svg>);
}

/**
 * NDIS Round Logo for promo card (Purple brand color)
 */
export function NdisPurpleLogo({ className = 'w-12 h-12' }: { className?: string }) {
  return (<div className={`rounded-full bg-[#5D2B77] flex items-center justify-center shadow-sm text-white font-extrabold text-[15px] tracking-tight ${className}`}>
      ndis
    </div>);
}

/**
 * AT Specialist Australia Brand Logo
 */
export function ATLogo({
  className = '',
  variant = 'full',
  size = 'md',
  showTagline = true,
}: {
  className?: string;
  variant?: 'full' | 'badge' | 'dark' | 'simple';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
}) {
  const sizeMap = {
    sm: { img: 'h-8 sm:h-9', badge: 'h-9 w-9 sm:h-10 sm:w-10', title: 'text-[16px] sm:text-[17px]', sub: 'text-[7.5px] sm:text-[8px]' },
    md: { img: 'h-9 xs:h-10 sm:h-12 md:h-[50px]', badge: 'h-12 w-12 sm:h-14 sm:w-14', title: 'text-[20px] sm:text-[24px]', sub: 'text-[9px] sm:text-[10px]' },
    lg: { img: 'h-13 sm:h-16', badge: 'h-16 w-16 sm:h-18 sm:w-18', title: 'text-[25px] sm:text-[30px]', sub: 'text-[11px]' },
    xl: { img: 'h-18 sm:h-24', badge: 'h-20 w-20 sm:h-28 sm:w-28', title: 'text-[28px] sm:text-[36px]', sub: 'text-[12px]' },
  };

  const s = sizeMap[size] || sizeMap.md;

  if (variant === 'badge') {
    return (<div className={`relative inline-flex items-center justify-center select-none ${className}`}>
        <img
          src="/images/logo.png"
          alt="AT Specialist Australia"
          className={`${s.badge} object-contain rounded-full drop-shadow-sm`}
        />
      </div>);
  }

  // Footer dark variant - Circular emblem + styled light typography (completely preserved!)
  if (variant === 'dark') {
    return (<div className={`flex items-center gap-3 select-none ${className}`}>
        <img
          src="/images/logo.png"
          alt="AT Specialist Australia"
          className={`${s.badge} object-contain rounded-full bg-white/5 p-0.5 ring-1 ring-white/20 drop-shadow-md flex-shrink-0`}
        />
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 leading-none">
            <span className={`${s.title} font-black text-white tracking-tight`}>
              AT
            </span>
            <span className={`${s.title} font-extrabold text-[#2DD4BF] tracking-wider uppercase`}>
              SPECIALIST
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="h-[1px] w-3 bg-[#2DD4BF]/60" />
            <span className={`${s.sub} font-extrabold text-[#2DD4BF] tracking-[0.2em] uppercase`}>
              AUSTRALIA
            </span>
            <div className="h-[1px] w-3 bg-[#2DD4BF]/60" />
          </div>
          {showTagline && (<span className="text-[7.5px] italic text-gray-400 mt-0.5 hidden xs:block">
              Better Mobility. Greater Independence. Better Living.
            </span>)}
        </div>
      </div>);
  }

  // Top header default 'full' variant - 100% transparent, rock-solid stable, NO jumping!
  return (<div className={`inline-flex items-center select-none bg-transparent ${className}`}>
      <img
        src={logoHeaderImg}
        alt="AT Specialist Australia - Better Mobility. Greater Independence. Better Living."
        width={210}
        height={52}
        className={`${s.img} w-auto object-contain bg-transparent border-0 shadow-none outline-none block select-none pointer-events-none`}
        loading="eager"
        decoding="sync"
      />
    </div>);
}

