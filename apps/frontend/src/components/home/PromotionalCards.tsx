import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { NdisPurpleLogo } from '@/components/common/Icons';

export function PromotionalCards() {
  return (<section className="py-6 sm:py-8 bg-white border-b border-gray-200">
      <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 2xl:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {/* CARD 1: HIRE EQUIPMENT */}
          <div className="relative bg-[#E9F2F7] rounded-2xl overflow-hidden p-5 sm:p-7 flex flex-col justify-between min-h-[200px] sm:min-h-[220px] border border-[#D5E4ED]">
            <div className="max-w-[64%] sm:max-w-[62%] z-10">
              <h3 className="text-[16px] sm:text-[19px] font-extrabold text-[#0F1E2E] leading-tight mb-2">
                Need equipment temporarily?
              </h3>
              <p className="text-[12px] sm:text-[13px] text-[#4A5568] leading-relaxed mb-4 sm:mb-5">
                Flexible equipment hire for recovery, rehabilitation and short-term needs.
              </p>
              <Link
                to="/hire"
                className="inline-flex items-center gap-1.5 h-[36px] sm:h-[38px] px-3.5 sm:px-4 bg-[#147A7A] hover:bg-[#106262] text-white text-[12px] sm:text-[12.5px] font-bold rounded-lg shadow-xs transition-all whitespace-nowrap"
              >
                <span>Explore Hire Equipment</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Right Mobility Scooter Image */}
            <div className="flex absolute right-1 sm:right-2 bottom-2 sm:bottom-0 sm:top-0 w-[36%] sm:w-[42%] h-[130px] sm:h-auto items-center justify-center pointer-events-none">
              <img
                src="/images/promo_hire_scooter.jpg"
                alt="Mobility Scooter Hire Fleet"
                className="w-full h-full object-contain mix-blend-multiply"
              />
            </div>
          </div>

          {/* CARD 2: NDIS PARTICIPANTS */}
          <div className="relative bg-[#FFF2E8] rounded-2xl overflow-hidden p-5 sm:p-7 flex flex-col justify-between min-h-[200px] sm:min-h-[220px] border border-[#FDE5D2]">
            <div className="max-w-[64%] sm:max-w-[60%] z-10">
              <h3 className="text-[16px] sm:text-[19px] font-extrabold text-[#0F1E2E] leading-tight mb-2">
                Assistive Technology for NDIS Participants
              </h3>
              <p className="text-[12px] sm:text-[13px] text-[#4A5568] leading-relaxed mb-4 sm:mb-5">
                We help participants, families and support professionals find practical equipment.
              </p>
              <Link
                to="/ndis"
                className="inline-flex items-center gap-1.5 h-[36px] sm:h-[38px] px-3.5 sm:px-4 bg-[#E88D2A] hover:bg-[#D47C1E] text-white text-[12px] sm:text-[12.5px] font-bold rounded-lg shadow-xs transition-all whitespace-nowrap"
              >
                <span>Explore NDIS Equipment</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Right Photo with Circular NDIS badge */}
            <div className="flex absolute right-0 bottom-0 top-0 w-[36%] sm:w-[42%] items-center justify-end pointer-events-none">
              <div className="relative w-full h-full flex items-center justify-end overflow-hidden">
                <img
                  src="/images/promo_ndis_family.jpg"
                  alt="NDIS Assistive Technology Family"
                  className="w-full h-full object-cover object-center rounded-l-xl opacity-90 sm:opacity-100"
                />
                {/* Overlapping NDIS Purple Logo Badge */}
                <div className="absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 z-10 filter drop-shadow-md scale-75 sm:scale-100">
                  <NdisPurpleLogo className="w-11 h-11" />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 3: TALK TO AN AT SPECIALIST */}
          <div className="relative bg-[#EBF3F8] rounded-2xl overflow-hidden p-5 sm:p-7 flex flex-col justify-between min-h-[200px] sm:min-h-[220px] border border-[#D7E6F0]">
            <div className="max-w-[64%] sm:max-w-[60%] z-10">
              <h3 className="text-[16px] sm:text-[19px] font-extrabold text-[#0F1E2E] leading-tight mb-2">
                Talk to an AT Specialist
              </h3>
              <p className="text-[12px] sm:text-[13px] text-[#4A5568] leading-relaxed mb-4 sm:mb-5">
                Our specialists are here to help you find the right equipment.
              </p>
              <Link
                to="/contact"
                className="inline-flex items-center gap-1.5 h-[36px] sm:h-[38px] px-3.5 sm:px-4 bg-white border border-[#147A7A] text-[#147A7A] hover:bg-[#147A7A]/5 text-[12px] sm:text-[12.5px] font-bold rounded-lg shadow-xs transition-all whitespace-nowrap"
              >
                <span>Get Expert Advice</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Right Specialist Portrait with Headset */}
            <div className="flex absolute right-0 bottom-0 top-0 w-[35%] sm:w-[40%] items-center justify-end pointer-events-none">
              <img
                src="/images/promo_specialist.jpg"
                alt="AT Specialist Customer Support"
                className="w-full h-full object-cover object-top rounded-l-xl opacity-90 sm:opacity-100"
              />
            </div>
          </div>
        </div>
      </div>
    </section>);
}

export default PromotionalCards;