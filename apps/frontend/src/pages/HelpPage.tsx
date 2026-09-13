import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Truck, RotateCcw, Phone, Mail, FileText, ChevronDown, ChevronUp, Shield, CheckCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

const faqs = [
  {
    category: 'NDIS & Funding',
    questions: [
      {
        q: 'How does purchasing assistive technology through the NDIS work?',
        a: 'If you have an NDIS plan with Core or Capital (Assistive Technology) funding, you can purchase directly or request an equipment quote. For items under $1,500 (Low Cost AT), participants can often purchase directly. For higher value items, our team prepares formal quotes for your Plan Manager or the NDIA.',
      },
      {
        q: 'Can you provide equipment quotes for my NDIS Plan Manager?',
        a: 'Yes! Simply add your items to the cart or contact us, and our team will generate an itemised NDIS Quote with product codes and pricing that you or your Support Coordinator can submit directly to your Plan Manager.',
      },
      {
        q: 'Do you work with Occupational Therapists for trials and assessments?',
        a: 'Absolutely. We regularly coordinate home trials and clinical assessments alongside Occupational Therapists and Physiotherapists across Australia.',
      },
    ],
  },
  {
    category: 'Delivery & Setup',
    questions: [
      {
        q: 'How long does delivery take?',
        a: 'Standard stocked equipment ships within 1–2 business days, with metro deliveries arriving in 2–4 business days and regional areas taking 4–7 business days. Custom-configured power wheelchairs and beds have dedicated clinical delivery timelines.',
      },
      {
        q: 'Do you offer delivery and home setup / installation?',
        a: 'Yes, we provide White-Glove delivery service for complex equipment (such as adjustable hospital beds, patient hoists, and powered mobility). Our technicians deliver, unbox, assemble, test, and provide basic user orientation.',
      },
    ],
  },
  {
    category: 'Equipment Hire & Trials',
    questions: [
      {
        q: 'What is the minimum hire period?',
        a: 'Our flexible hire periods start from 2 weeks and can be extended on a weekly or monthly basis. If you decide to purchase the equipment after hiring, a portion of your hire fees can be credited toward the purchase price.',
      },
      {
        q: 'What happens when my hire period ends?',
        a: 'We will contact you prior to the end date to arrange either a hassle-free courier collection from your home or a seamless hire extension.',
      },
    ],
  },
];

export function HelpPage() {
  const [openFaq, setOpenFaq] = useState<string | null>('How does purchasing assistive technology through the NDIS work?');

  const toggleFaq = (q: string) => {
    setOpenFaq((prev) => (prev === q ? null : q));
  };

  return (<div className="min-h-screen bg-[#F7F9FA] py-8 sm:py-10">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Help & Advice' }]} />

        {/* Hero Banner */}
        <div className="bg-[#0B1728] text-white rounded-3xl p-6 sm:p-8 lg:p-12 mt-6 mb-10 sm:mb-12 relative overflow-hidden">
          <div className="max-w-2xl z-10 relative">
            <span className="inline-flex items-center gap-1.5 text-[11px] sm:text-[12px] font-bold text-[#147A7A] bg-[#147A7A]/20 px-3 py-1 rounded-full uppercase tracking-wider mb-4">
              Support & Clinical Guidance
            </span>
            <h1 className="text-[26px] sm:text-[32px] lg:text-[40px] font-extrabold text-white leading-tight mb-4">
              How can we assist you today?
            </h1>
            <p className="text-[13px] sm:text-[15px] text-white/80 leading-relaxed mb-5 sm:mb-6">
              Find answers regarding NDIS funding, equipment selection, Australia-wide delivery, and trial arrangements.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="tel:0494767409"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-[13px] sm:text-[13.5px] font-bold rounded-lg transition-all"
              >
                <Phone className="h-4 w-4" />
                Call 0494 767 409
              </a>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-[13px] sm:text-[13.5px] font-bold rounded-lg border border-white/20 transition-all"
              >
                <Mail className="h-4 w-4" />
                Submit Enquiry
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-10 sm:mb-12">
          {[
            { icon: Shield, title: 'NDIS Guides', desc: 'Understanding AT levels, quotes, and funding approvals.', to: '/ndis' },
            { icon: Truck, title: 'Delivery Info', desc: 'Australia-wide shipping, tracking, and setup services.', to: '/help#delivery' },
            { icon: RotateCcw, title: 'Hire Options', desc: 'Short and long-term rental for hospital discharge & recovery.', to: '/hire' },
            { icon: HelpCircle, title: 'Talk to an OT', desc: 'Clinical consultations and product trial bookings.', to: '/contact?type=specialist' },
          ].map((item) => (<Link
              key={item.title}
              to={item.to}
              className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm hover:shadow-md hover:border-[#147A7A]/40 transition-all group"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <item.icon className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="text-[14px] sm:text-[16px] font-bold text-[#0F1E2E] mb-1.5 group-hover:text-[#147A7A] transition-colors">
                {item.title}
              </h3>
              <p className="text-[12px] sm:text-[13px] text-gray-500 leading-relaxed">
                {item.desc}
              </p>
            </Link>))}
        </div>

        {/* FAQs */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-8 lg:p-10 shadow-sm mb-10 sm:mb-12">
          <h2 className="text-[20px] sm:text-[24px] font-extrabold text-[#0F1E2E] mb-6 sm:mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6 sm:space-y-8">
            {faqs.map((category) => (<div key={category.category}>
                <h3 className="text-[13px] sm:text-[15px] font-bold text-[#147A7A] uppercase tracking-wider mb-3 sm:mb-4">
                  {category.category}
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  {category.questions.map((faq) => {
                    const isOpen = openFaq === faq.q;
                    return (<div
                        key={faq.q}
                        className="border border-gray-200 rounded-xl overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => toggleFaq(faq.q)}
                          className="w-full px-4 sm:px-5 py-3 sm:py-4 text-left flex items-center justify-between gap-4 bg-white hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-[13px] sm:text-[14.5px] font-bold text-[#0F1E2E]">
                            {faq.q}
                          </span>
                          {isOpen ? (<ChevronUp className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-[#147A7A] flex-shrink-0" />) : (<ChevronDown className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-gray-400 flex-shrink-0" />)}
                        </button>
                        {isOpen && (<div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-1 text-[12.5px] sm:text-[13.5px] text-gray-600 leading-relaxed border-t border-gray-100 bg-[#FBFDFD]">
                            {faq.a}
                          </div>)}
                      </div>);
                  })}
                </div>
              </div>))}
          </div>
        </div>
      </div>
    </div>);
}
