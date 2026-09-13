import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  Award, 
  Heart, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  Star,
  Sparkles
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AustraliaIcon } from '@/components/common/Icons';

export function AboutPage() {
  const stats = [
    { label: 'Years of Clinical Excellence', value: '15+' },
    { label: 'NDIS Participants Supported', value: '18,500+' },
    { label: 'Global Clinical Brands', value: '100+' },
    { label: 'Client Satisfaction Rate', value: '99.4%' },
  ];

  const values = [
    {
      icon: Heart,
      title: 'Person-Centred Care',
      desc: 'We listen first. Every individual has unique physiological goals, daily environments, and lifestyle aspirations that shape their ideal equipment solution.',
    },
    {
      icon: Award,
      title: 'Clinical Rigour',
      desc: 'Our equipment catalog is rigorously evaluated by registered Occupational Therapists and Physiotherapists for safety, biomechanical support, and long-term durability.',
    },
    {
      icon: ShieldCheck,
      title: 'NDIS Quality & Safeguards',
      desc: 'As a trusted NDIS Provider, we adhere strictly to Australian national standards, ensuring transparent pricing and ethical clinical justifications.',
    },
    {
      icon: Building2,
      title: 'End-to-End Support',
      desc: 'From initial home trials and clinical justification reports to white-glove setup, custom adjustments, and ongoing warranty servicing.',
    },
  ];

  const locations = [
    { city: 'Moonee Ponds (HQ & Showroom)', address: 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039', phone: '0494 767 409' },
    { city: 'Sydney Clinical Centre', address: '120 George Street, Parramatta NSW 2150', phone: '0494 767 409' },
    { city: 'Brisbane Assessment Hub', address: '88 Creek Street, Brisbane QLD 4000', phone: '0494 767 409' },
    { city: 'Perth Logistics & Trials', address: '22 St Georges Terrace, Perth WA 6000', phone: '0494 767 409' },
  ];

  return (<div className="min-h-screen bg-[#F7F9FA] text-[#0F1E2E]">
      {/* 1. HERO HEADER */}
      <div className="bg-[#0F1E2E] text-white py-12 sm:py-20 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-[#147A7A]/20 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-[#E88D2A]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 relative z-10">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Company' }, { label: 'About AT Specialists' }]} variant="dark" />
          
          <div className="max-w-3xl mt-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#147A7A]/30 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-[#147A7A]/50 text-white shadow-sm">
              <AustraliaIcon className="w-4 h-3 text-[#147A7A]" />
              Australia's Dedicated Assistive Technology Provider
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
              Empowering Independence Through Clinical Technology
            </h1>

            <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl font-normal">
              AT Specialists Australia was established to bridge the vital connection between clinical assessment and dependable assistive technology. We supply, configure, and maintain medical equipment that transforms lives across Australia.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/team"
                className="px-6 py-3.5 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 group cursor-pointer"
              >
                <span>Meet Our Clinical Team</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/ndis"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Explore NDIS Services</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STATS BAR */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-8 sm:py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            {stats.map((s, idx) => (<div key={idx} className="p-4 rounded-2xl bg-[#F8FAFC] border border-gray-100">
                <p className="text-2xl sm:text-4xl font-black text-[#147A7A] tracking-tight">{s.value}</p>
                <p className="text-xs sm:text-sm text-gray-600 font-semibold mt-1">{s.label}</p>
              </div>))}
          </div>
        </div>
      </section>

      {/* 3. OUR STORY & CLINICAL MISSION */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-14 sm:py-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <div className="space-y-6">
            <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider">
              Our Clinical Heritage
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F1E2E] leading-tight">
              Founded by Allied Health Professionals for Everyday Australians
            </h2>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              Navigating complex assistive technology funding and finding the exact right piece of mobility, seating, or pressure care equipment can often feel daunting. AT Specialists was created by Occupational Therapists and Rehabilitation Engineers who saw the need for a truly clinical-first equipment supplier.
            </p>
            <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
              We partner directly with participants, support coordinators, occupational therapists, and hospitals to ensure that every prescription delivers tangible daily independence, comfort, and safety.
            </p>

            <div className="space-y-3 pt-2">
              {[
                'NDIS Provider across all States and Territories',
                'Comprehensive equipment trials in-home or at our clinical showrooms',
                'Fully itemised clinical justification quotes prepared within 24 hours',
                'Experienced field technicians for white-glove setup and custom tuning',
              ].map((point, i) => (<div key={i} className="flex items-center gap-2.5 text-xs sm:text-sm font-semibold text-gray-800">
                  <CheckCircle2 className="w-4 h-4 text-[#147A7A] flex-shrink-0" />
                  <span>{point}</span>
                </div>))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-200 aspect-[4/3] bg-gray-100">
              <img
                src="/images/cat_seating_power_1787636023808.jpg"
                alt="AT Specialists Showroom and Seating Assessment"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-6 -left-6 bg-white p-5 rounded-2xl shadow-xl border border-gray-200 max-w-xs hidden sm:block">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#147A7A]/10 flex items-center justify-center text-[#147A7A]">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#0F1E2E]">Certified ATP & OT Staff</p>
                  <p className="text-[11px] text-gray-500">Registered with AHPRA & ARATA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CORE VALUES */}
      <section className="bg-white border-y border-gray-200 py-14 sm:py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider mb-2">
              Our Principles
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F1E2E]">
              What Sets AT Specialists Apart
            </h2>
            <p className="text-gray-600 text-xs sm:text-sm mt-2">
              Our clinical and technical framework is engineered around reliability, dignity, and participant outcomes.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v, i) => (<div key={i} className="bg-[#F8FAFC] rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between hover:border-[#147A7A]/40 hover:shadow-md transition-all">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center mb-4">
                    <v.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F1E2E] mb-2">{v.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{v.desc}</p>
                </div>
              </div>))}
          </div>
        </div>
      </section>

      {/* 5. NATIONWIDE SHOWROOMS & HUBS */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-14 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider mb-2">
            Nationwide Presence
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-[#0F1E2E]">
            Our Assessment Centres & Showrooms
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-2">
            Visit our fully equipped clinical assessment centres or arrange an in-home trial across metropolitan and regional Australia.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {locations.map((loc, idx) => (<div key={idx} className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-[#147A7A] font-bold text-sm">
                <MapPin className="w-4 h-4" />
                <span>{loc.city}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{loc.address}</p>
              <div className="pt-2 border-t border-gray-100 flex items-center gap-2 text-xs font-bold text-[#0F1E2E]">
                <Phone className="w-3.5 h-3.5 text-[#147A7A]" />
                <a href={`tel:${loc.phone.replace(/\s+/g, '')}`} className="hover:text-[#147A7A] hover:underline">
                  {loc.phone}
                </a>
              </div>
            </div>))}
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="bg-[#0F1E2E] text-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            Ready to Discuss Your Assistive Technology Needs?
          </h2>
          <p className="text-xs sm:text-sm text-white/80 max-w-xl mx-auto leading-relaxed">
            Our clinical team is on hand to answer questions, coordinate equipment trials, and prepare fast NDIS quotes for participants and therapists.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <Link
              to="/contact"
              className="px-6 py-3.5 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              Contact Our Specialists
            </Link>
            <Link
              to="/ndis"
              className="px-6 py-3.5 bg-[#E88D2A] hover:bg-[#D47C1E] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
            >
              Request NDIS Quote
            </Link>
          </div>
        </div>
      </section>
    </div>);
}

export default AboutPage;
