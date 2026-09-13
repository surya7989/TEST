import React from 'react';
import { Link } from 'react-router-dom';
import { Phone } from 'lucide-react';
import { AustraliaIcon } from '@/components/common/Icons';

export function UtilityBar() {
  return (<div className="hidden md:block bg-[#0B1728] text-white border-b border-white/10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 h-[34px] flex items-center justify-between">
        {/* LEFT - Key Info */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Australian Owned */}
          <span className="flex items-center gap-1.5 text-white/90 font-medium text-[11px]">
            <AustraliaIcon className="h-3.5 w-3.5 text-white flex-shrink-0" />
            <span>Australian Owned &amp; Operated</span>
          </span>

          {/* NDIS Provider */}
          <span className="flex items-center gap-1.5 text-white/90 font-medium text-[11px]">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-[#147A7A] text-[7.5px] font-bold text-white leading-none flex-shrink-0">
              ✓
            </span>
            <span>NDIS Provider</span>
          </span>

          {/* Talk to a Specialist */}
          <a
            href="tel:0494767409"
            className="hidden md:flex items-center gap-1.5 text-white/90 hover:text-white transition-colors font-medium text-[11px]"
          >
            <Phone className="h-3 w-3 flex-shrink-0 text-white/80" />
            <span>Talk to a Specialist <strong className="text-white font-semibold ml-1">0494 767 409</strong></span>
          </a>
        </div>

        {/* RIGHT - Contact links */}
        <div className="flex items-center gap-4 sm:gap-6">
          <a
            href="tel:0494767409"
            className="text-white hover:text-[#2DD4BF] transition-colors font-bold text-[11px] md:hidden flex items-center gap-1"
          >
            <Phone className="h-3 w-3 text-[#2DD4BF]" />
            <span>0494 767 409</span>
          </a>
          <Link
            to="/help"
            className="text-white/85 hover:text-white transition-colors font-medium text-[11px]"
          >
            Help &amp; Advice
          </Link>
          <Link
            to="/contact"
            className="text-white/85 hover:text-white transition-colors font-medium text-[11px]"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </div>);
}