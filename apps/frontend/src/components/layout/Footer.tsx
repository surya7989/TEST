import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import { AustraliaIcon, ATLogo } from '@/components/common/Icons';

const footerLinks = {
  shop: [
    { label: 'Mobility', href: '/shop/mobility' },
    { label: 'Wheelchairs', href: '/shop/wheelchairs' },
    { label: 'Seating & Positioning', href: '/shop/seating-positioning' },
    { label: 'Daily Living', href: '/shop/daily-living' },
    { label: 'Bathroom & Toilet', href: '/shop/bathroom-toilet' },
    { label: 'Patient Handling', href: '/shop/patient-handling' },
    { label: 'Bedroom', href: '/shop/bedroom' },
    { label: 'Pressure Care', href: '/shop/pressure-care' },
    { label: 'Rehabilitation', href: '/shop/rehabilitation' },
    { label: 'Hire Equipment', href: '/hire' },
  ],
  support: [
    { label: 'For Family Carers', href: '/for-carers' },
    { label: 'Contact Us', href: '/contact' },
    { label: 'Help & FAQs', href: '/faqs' },
    { label: 'Delivery Information', href: '/delivery' },
    { label: 'Returns & Trials', href: '/returns' },
    { label: 'Talk to a Specialist', href: '/contact?type=specialist' },
  ],
  ndis: [
    { label: 'NDIS Equipment Guide', href: '/ndis?tab=guide' },
    { label: 'Plan & Self Managed', href: '/ndis?tab=plan-managed' },
    { label: 'Support Coordinators', href: '/ndis?tab=support-coordinators' },
    { label: 'Occupational Therapists', href: '/ndis?tab=occupational-therapists' },
  ],
  company: [
    { label: 'About AT Specialists', href: '/about' },
    { label: 'Guides & Resources', href: '/resources' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

export function Footer() {
  return (<footer className="bg-[#0B1728] text-white border-t border-[#152538]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Logo & Contact */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1 pb-4 border-b border-white/10 lg:border-b-0 lg:pb-0">
            <Link to="/" className="inline-block mb-4 group">
              <ATLogo variant="dark" size="md" showTagline={true} />
            </Link>
            <div className="space-y-2 text-[12px] sm:text-[13px] text-white/70">
              <p className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#147A7A]" />
                Level 2, 88 Holmes Road, Moonee Ponds VIC 3039
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#147A7A]" />
                <a href="tel:0494767409" className="hover:text-white transition-colors">
                  0494 767 409
                </a>
              </p>
              <p className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#147A7A]" />
                <a href="mailto:info@atspecialists.com.au" className="hover:text-white transition-colors truncate">
                  info@atspecialists.com.au
                </a>
              </p>
            </div>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-[12px] sm:text-[13px] font-bold text-[#2DD4BF] uppercase tracking-wider mb-3 sm:mb-4">Shop</h4>
            <ul className="space-y-2">
              {footerLinks.shop.slice(0, 7).map((link) => (<li key={link.label}>
                  <Link to={link.href} className="text-[12px] sm:text-[13px] text-white/65 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-[12px] sm:text-[13px] font-bold text-[#2DD4BF] uppercase tracking-wider mb-3 sm:mb-4">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (<li key={link.label}>
                  <Link to={link.href} className="text-[12px] sm:text-[13px] text-white/65 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>))}
            </ul>
          </div>

          {/* NDIS */}
          <div>
            <h4 className="text-[12px] sm:text-[13px] font-bold text-[#2DD4BF] uppercase tracking-wider mb-3 sm:mb-4">NDIS</h4>
            <ul className="space-y-2">
              {footerLinks.ndis.map((link) => (<li key={link.label}>
                  <Link to={link.href} className="text-[12px] sm:text-[13px] text-white/65 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-[12px] sm:text-[13px] font-bold text-[#2DD4BF] uppercase tracking-wider mb-3 sm:mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (<li key={link.label}>
                  <Link to={link.href} className="text-[12px] sm:text-[13px] text-white/65 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>))}
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-8 sm:mt-10 pt-5 sm:pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <p className="text-[11px] sm:text-[12px] text-white/50 text-center sm:text-left">&copy; 2026 AT Specialists Australia. All rights reserved.</p>
          <p className="text-[11px] sm:text-[12px] text-white/70 flex items-center gap-1.5 font-medium">
            <AustraliaIcon className="h-3.5 w-4 text-[#147A7A]" />
            Australian Owned & Operated
          </p>
        </div>
      </div>
    </footer>);
}
