import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AustraliaIcon } from '@/components/common/Icons';

const heroSlides = [
  {
    heading: 'Better Equipment.',
    subheading: 'Better Independence.',
    description:
      'Specialist assistive technology and rehabilitation equipment to help people move, live and participate with confidence.',
    image: '/images/hero_wheelchair_family_1787635958075.jpg',
    badgeText: 'Australian Assistive Technology Specialists',
    badgeType: 'australia',
  },
  {
    heading: 'Hospital Grade Care Beds.',
    subheading: 'Engineered for Comfort.',
    description:
      '4-section electric profiling hospital beds, pressure-relief mattresses, and clinical transfer solutions for home care and rehabilitation.',
    image: '/images/hero_hospital_bed.jpg',
    badgeText: 'NDIS Assistive Technology Provider',
    badgeType: 'ndis',
  },
  {
    heading: 'Advanced Power Mobility.',
    subheading: 'Every Step Of The Way.',
    description:
      'Customized power wheelchairs, tilt-in-space seating, and clinical postural supports tailored by Australian occupational therapists.',
    image: '/images/hero_power_mobility.jpg',
    badgeText: 'Australia-Wide Clinical Equipment Support',
    badgeType: 'australia',
  },
  {
    heading: 'Flexible Equipment Hire.',
    subheading: 'When You Need It.',
    description:
      'Short and long-term hospital equipment hire solutions for recovery, post-surgery, clinical trials, and home transitions.',
    image: '/images/hero_equipment_hire.jpg',
    badgeText: 'Hassle-Free Direct Equipment Delivery & Setup',
    badgeType: 'ndis',
  },
];

export function Hero() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play carousel
  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const slide = heroSlides[currentSlide];

  return (<section className="relative bg-[#F4F6F8] overflow-hidden border-b border-gray-200 w-full group/hero">
      {/* Centered responsive container */}
      <div className="max-w-[1440px] 2xl:max-w-[1600px] mx-auto w-full relative min-h-[440px] lg:min-h-[490px] flex flex-col lg:flex-row items-stretch">
        {/* MOBILE & TABLET IMAGE (ORDER-1, visible < lg) */}
        <div className="w-full h-[220px] xs:h-[260px] sm:h-[320px] lg:hidden relative overflow-hidden bg-[#F4F6F8] flex-shrink-0">
          <img
            key={`mobile-${slide.image}`}
            src={slide.image}
            alt={slide.heading}
            width={800}
            height={320}
            ref={(el) => { if (el && currentSlide === 0) el.setAttribute('fetchpriority', 'high'); }}
            loading={currentSlide === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full h-full object-cover object-[70%_center] transition-all duration-700 animate-fade-in"
          />
          {/* Gentle bottom gradient fade into text background */}
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#F4F6F8] to-transparent pointer-events-none" />
        </div>

        {/* DESKTOP PANORAMIC IMAGE (visible lg+) with Progressive Seamless Gradient Mask */}
        <div className="hidden lg:block absolute inset-y-0 right-0 w-[58%] xl:w-[56%] overflow-hidden pointer-events-none select-none z-0">
          <img
            key={`desktop-${slide.image}`}
            src={slide.image}
            alt={slide.heading}
            width={800}
            height={490}
            ref={(el) => { if (el && currentSlide === 0) el.setAttribute('fetchpriority', 'high'); }}
            loading={currentSlide === 0 ? 'eager' : 'lazy'}
            decoding="async"
            className="w-full h-full object-cover object-right transition-all duration-700 animate-fade-in"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 8%, rgba(0,0,0,0.75) 22%, black 38%)',
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.15) 8%, rgba(0,0,0,0.75) 22%, black 38%)',
            }}
          />
          {/* Subtle multi-stop gradient overlay for perfectly smooth background blending */}
          <div 
            className="absolute inset-y-0 left-0 w-36 sm:w-48 lg:w-64 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, #F4F6F8 0%, rgba(244, 246, 248, 0.85) 35%, rgba(244, 246, 248, 0.3) 70%, transparent 100%)',
            }}
          />
        </div>

        {/* CONTENT COLUMN (Responsive across Mobile, Tablet, Desktop) */}
        <div className="relative z-10 w-full lg:w-[50%] xl:w-[48%] flex items-center pt-5 pb-12 sm:pt-6 sm:pb-14 lg:py-14 px-5 sm:px-8 lg:pl-12 lg:pr-8">
          <div className="w-full max-w-[560px]">
            {/* Main Headline */}
            <h1 className="text-[24px] xs:text-[28px] sm:text-[34px] lg:text-[42px] xl:text-[46px] font-black text-[#0F1E2E] leading-[1.14] tracking-tight mb-2.5 sm:mb-3">
              {slide.heading}
              <br />
              <span className="text-[#0F1E2E]">{slide.subheading}</span>
            </h1>

            {/* Subtitle */}
            <p className="text-[13px] sm:text-[14.5px] text-[#4A5568] leading-relaxed mb-5 sm:mb-6 max-w-[460px]">
              {slide.description}
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 sm:gap-3 mb-5 sm:mb-6">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center h-[44px] px-6 bg-[#0B1728] hover:bg-[#1A334E] text-white text-[13.5px] font-bold rounded-lg shadow-xs transition-all duration-150 text-center whitespace-nowrap"
              >
                Shop Equipment
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center h-[44px] px-6 bg-white border border-[#0B1728] text-[#0B1728] hover:bg-[#0B1728]/5 text-[13.5px] font-bold rounded-lg transition-all duration-150 text-center whitespace-nowrap"
              >
                Talk to a Specialist
              </Link>
            </div>

            {/* Bottom Badge */}
            <div className="flex items-center gap-2 text-[12px] text-gray-700 font-medium">
              {slide.badgeType === 'australia' ? (<span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#147A7A]/15 text-[#147A7A] flex-shrink-0">
                  <AustraliaIcon className="w-3.5 h-3 text-[#147A7A]" />
                </span>) : (<span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#147A7A]/20 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#147A7A]" />
                </span>)}
              <span className="truncate">{slide.badgeText}</span>
            </div>
          </div>
        </div>

        {/* CAROUSEL CONTROLS: Clean Dots Indicator */}
        <div className="flex items-center justify-center gap-2 pb-4 pt-2 lg:p-0 lg:absolute lg:bottom-4 lg:left-1/2 lg:-translate-x-1/2 z-20">
          {heroSlides.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                setCurrentSlide(index);
                setIsAutoPlaying(false);
              }}
              className={`rounded-full transition-all duration-300 cursor-pointer border-0 p-0 m-0 shrink-0 ${
                index === currentSlide
                  ? 'bg-[#147A7A] shadow-xs'
                  : 'bg-gray-300 hover:bg-gray-400'
              }`}
              style={{
                width: index === currentSlide ? '22px' : '8px',
                height: '8px',
                minWidth: index === currentSlide ? '22px' : '8px',
                minHeight: '8px',
                maxWidth: index === currentSlide ? '22px' : '8px',
                maxHeight: '8px',
                padding: 0,
                border: 'none',
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>);
}