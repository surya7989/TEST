import React from 'react';
import { Headphones, Truck, Calendar } from 'lucide-react';
import { AustraliaIcon } from '@/components/common/Icons';

export function TrustStrip() {
  const items = [
    {
      icon: <AustraliaIcon className="w-5 h-4 text-[#147A7A]" />,
      title: 'Australian Owned',
      subtitle: 'Local support you can trust',
    },
    {
      customBadge: (<span className="inline-flex items-center justify-center w-full h-full rounded-full bg-[#147A7A] text-white text-[10.5px] font-black tracking-tight lowercase">
          ndis
        </span>),
      title: 'NDIS',
      subtitle: 'Provider of AT',
    },
    {
      icon: <Headphones className="w-4.5 h-4.5 text-[#147A7A]" />,
      title: 'Expert Advice',
      subtitle: 'Specialist guidance always',
    },
    {
      icon: <Truck className="w-4.5 h-4.5 text-[#147A7A]" />,
      title: 'Fast Delivery',
      subtitle: 'Australia-wide delivery',
    },
    {
      icon: <Calendar className="w-4.5 h-4.5 text-[#147A7A]" />,
      title: 'Hire Options',
      subtitle: 'Flexible hire solutions',
    },
  ];

  return (<section className="bg-white border-b border-gray-200">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 py-3.5 sm:py-4">
          {items.map((item, index) => (<div
              key={item.title}
              className={`flex items-center gap-2.5 sm:gap-3.5 px-2 sm:px-3 py-1.5 sm:py-2 ${
                index === 4 ? 'col-span-2 sm:col-span-1 justify-center sm:justify-start' : ''
              }`}
            >
              {/* Circular Icon Container */}
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#EAF5F4] flex items-center justify-center flex-shrink-0">
                {item.customBadge || item.icon}
              </div>

              {/* Text */}
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[11px] sm:text-[12px] md:text-[13px] font-bold text-[#0F1E2E] leading-tight truncate">
                  {item.title}
                </span>
                <span className="text-[9px] sm:text-[10px] md:text-[11px] text-gray-500 leading-tight mt-0.5 truncate">
                  {item.subtitle}
                </span>
              </div>
            </div>))}
        </div>
      </div>
    </section>);
}