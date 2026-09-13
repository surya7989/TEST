import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  Brain, 
  ArrowRight, 
  CheckCircle2, 
  Phone, 
  Download, 
  Calendar, 
  Clock, 
  Sparkles,
  Award,
  DollarSign,
  Briefcase
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { AustraliaIcon } from '@/components/common/Icons';

type TabType = 'overview' | 'guide' | 'plan-managed' | 'support-coordinators' | 'occupational-therapists';

export function NDISPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as TabType) || 'overview';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam && ['overview', 'guide', 'plan-managed', 'support-coordinators', 'occupational-therapists'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  const fundingLevels = [
    {
      level: 'Low-Cost AT (Under $1,500)',
      category: 'Core / Consumables & Daily Living',
      desc: 'Simple bathroom grab rails, shower chairs, transfer boards, manual walkers, and continence wear. Generally participants can purchase without a formal quote.',
      examples: 'Shower Chairs, Rollators, TENA Continence Wear, Overbed Tables',
      process: 'Instant checkout or direct invoice to Plan Manager.',
    },
    {
      level: 'Mid-Cost AT ($1,500 – $15,000)',
      category: 'Capital / Assistive Technology',
      desc: 'Hospital profiling beds, standard power wheelchairs, portable mobility scooters, mobile patient transfer hoists, and pressure mattresses.',
      examples: 'Electric Hospital Beds, Patient Hoists, Alternating Air Mattresses',
      process: 'written quote + brief OT endorsement letter.',
    },
    {
      level: 'High-Cost AT ($15,000+)',
      category: 'Capital AT / Complex Seating',
      desc: 'Complex powered tilt-in-space wheelchairs (QM-7), environmental control integrations, customized bariatric beds, and custom ceiling track systems.',
      examples: 'QM-7 Power Wheelchair, Custom Seating & Tilt Mechanisms',
      process: 'Full NDIA AT Assessment Report & trial justification submitted by OT.',
    },
  ];

  return (<div className="min-h-screen bg-[#F7F9FA] text-[#0F1E2E]">
      {/* 1. HERO BANNER */}
      <div className="bg-[#0F1E2E] text-white py-12 sm:py-20 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-[#147A7A]/25 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-[#E88D2A]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 relative z-10">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'NDIS Hub & Pathways' }]} variant="dark" />
          
          <div className="max-w-3xl mt-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#147A7A]/30 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-[#147A7A]/50 text-white shadow-sm">
              <AustraliaIcon className="w-4 h-3 text-[#147A7A]" />
              NDIS Provider
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
              Assistive Technology & Clinical Equipment for NDIS
            </h1>

            <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl font-normal">
              We empower participants, support coordinators, and occupational therapists with fast quoting, tailored equipment trials, and comprehensive clinical justification support.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/contact?type=ndis-quote"
                className="px-6 py-3.5 bg-[#E88D2A] hover:bg-[#D47C1E] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 cursor-pointer hover:scale-[1.02]"
              >
                <span>Request NDIS Quote</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#tabs-section"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Explore NDIS Pathways</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE TAB NAVIGATION */}
      <div id="tabs-section" className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto py-3 scrollbar-hide">
            {[
              { id: 'overview', label: 'NDIS Overview' },
              { id: 'guide', label: 'NDIS Equipment Guide' },
              { id: 'plan-managed', label: 'Plan & Self Managed' },
              { id: 'support-coordinators', label: 'Support Coordinators' },
              { id: 'occupational-therapists', label: 'Occupational Therapists' },
            ].map((tab) => (<button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as TabType)}
                className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-[#147A7A] text-white shadow-sm'
                    : 'bg-[#F8FAFC] text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {tab.label}
              </button>))}
          </div>
        </div>
      </div>

      {/* 3. TAB CONTENT SECTIONS */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-12 sm:py-16">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (<div className="space-y-12 animate-fade-in">
            {/* Core Services Grid */}
            <div>
              <div className="text-center max-w-2xl mx-auto mb-10">
                <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                  NDIS Support Services
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0F1E2E]">How We Support Your NDIS Journey</h2>
                <p className="text-gray-600 text-xs sm:text-sm mt-2">Dedicated clinical and administrative assistance across every phase.</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: ShieldCheck, title: 'NDIS Provider', desc: 'Direct billing to NDIA, Plan Managers, or Self-Managed reimbursement with tax receipts.' },
                  { icon: Users, title: 'In-Home Equipment Trials', desc: 'We deliver power wheelchairs, hospital beds, and hoists directly to your home for trial alongside your OT.' },
                  { icon: FileText, title: 'Fast Quote Turnaround', desc: 'Itemised clinical quotes with full NDIS AT line item codes and item codes delivered within 24 hours.' },
                  { icon: Brain, title: 'White-Glove Setup', desc: 'Certified technicians assemble, configure, and calibrate all equipment with full user and carer orientation.' },
                ].map((s, i) => (<div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm flex flex-col justify-between hover:border-[#147A7A]/40 transition-all">
                    <div>
                      <div className="w-12 h-12 rounded-xl bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center mb-4">
                        <s.icon className="w-6 h-6" />
                      </div>
                      <h3 className="text-base font-bold text-[#0F1E2E] mb-2">{s.title}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>))}
              </div>
            </div>

            {/* 4-Step Process */}
            <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 shadow-sm">
              <h2 className="text-2xl font-black text-[#0F1E2E] text-center mb-10">4 Steps to Receiving Your NDIS Equipment</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                {[
                  { step: '01', title: 'Consultation & Trial', desc: 'Connect with our team or schedule a home equipment trial with your Occupational Therapist.' },
                  { step: '02', title: 'Formal AT Quote', desc: 'We generate an itemised quote with all NDIS line item codes and justification data.' },
                  { step: '03', title: 'Funding Approval', desc: 'Your Plan Manager or the NDIA reviews and approves the quote against your plan funding.' },
                  { step: '04', title: 'Delivery & Setup', desc: 'Our technicians deliver, assemble, configure, and test the equipment at your home.' },
                ].map((st, idx) => (<div key={idx} className="bg-[#F8FAFC] p-6 rounded-2xl border border-gray-200 relative">
                    <span className="text-2xl font-black text-[#147A7A] block mb-2">{st.step}</span>
                    <h3 className="text-sm font-bold text-[#0F1E2E] mb-2">{st.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed">{st.desc}</p>
                  </div>))}
              </div>
            </div>
          </div>)}

        {/* TAB 2: NDIS EQUIPMENT GUIDE */}
        {activeTab === 'guide' && (<div className="space-y-10 animate-fade-in">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Clinical Funding Categories
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F1E2E]">NDIS Assistive Technology (AT) Levels</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                The NDIS classifies assistive technology based on cost, complexity, and risk level. Here is how your plan funding aligns with our catalog:
              </p>
            </div>

            <div className="grid gap-6">
              {fundingLevels.map((lvl, idx) => (<div key={idx} className="bg-white rounded-2xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-4 hover:border-[#147A7A]/40 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
                    <h3 className="text-lg font-black text-[#0F1E2E]">{lvl.level}</h3>
                    <span className="px-3 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full">{lvl.category}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">{lvl.desc}</p>
                  <div className="grid sm:grid-cols-2 gap-4 pt-2 text-xs">
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-gray-200">
                      <p className="font-bold text-[#0F1E2E] mb-1">Equipment Examples:</p>
                      <p className="text-gray-600">{lvl.examples}</p>
                    </div>
                    <div className="p-3 bg-[#F8FAFC] rounded-xl border border-gray-200">
                      <p className="font-bold text-[#0F1E2E] mb-1">Purchasing Process:</p>
                      <p className="text-[#147A7A] font-semibold">{lvl.process}</p>
                    </div>
                  </div>
                </div>))}
            </div>
          </div>)}

        {/* TAB 3: PLAN MANAGED & SELF MANAGED */}
        {activeTab === 'plan-managed' && (<div className="space-y-10 animate-fade-in">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Effortless Payment & Invoicing
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F1E2E]">Plan Managed & Self-Managed Participants</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                Whether your plan is managed by an agency or self-managed, we make ordering fast, transparent, and completely free of out-of-pocket delays.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Plan Managed Card */}
              <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-[#147A7A] flex items-center justify-center font-black">
                  PM
                </div>
                <h3 className="text-xl font-bold text-[#0F1E2E]">Plan-Managed Participants</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  No out-of-pocket payments. We invoice your Plan Management company directly (e.g. Plan Partners, NDSP, MyPlanManager, Core, etc.).
                </p>
                <div className="space-y-2.5 pt-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#147A7A] flex-shrink-0" />
                    <span>Select items and provide your Plan Manager's invoice email</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#147A7A] flex-shrink-0" />
                    <span>We email an NDIS invoice directly to them</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#147A7A] flex-shrink-0" />
                    <span>Equipment is dispatched immediately upon approval</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <Link to="/checkout" className="inline-flex items-center gap-2 text-xs font-bold text-[#147A7A] hover:underline">
                    Order via Plan Manager Invoicing <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Self Managed Card */}
              <div className="bg-white rounded-3xl border border-gray-200 p-6 sm:p-8 shadow-sm space-y-5">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#E88D2A] flex items-center justify-center font-black">
                  SM
                </div>
                <h3 className="text-xl font-bold text-[#0F1E2E]">Self-Managed Participants</h3>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                  Pay securely with card, bank transfer, or request an itemised invoice first to claim payment through the myplace participant portal.
                </p>
                <div className="space-y-2.5 pt-2 text-xs text-gray-700">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#E88D2A] flex-shrink-0" />
                    <span>Order directly or generate a pro-forma quote</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#E88D2A] flex-shrink-0" />
                    <span>Receive full GST-compliant NDIS tax invoice</span>
                  </div>
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#E88D2A] flex-shrink-0" />
                    <span>Lodge claim easily on the myplace portal for instant reimbursement</span>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <Link to="/shop" className="inline-flex items-center gap-2 text-xs font-bold text-[#E88D2A] hover:underline">
                    Browse & Purchase Instantly <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>)}

        {/* TAB 4: SUPPORT COORDINATORS */}
        {activeTab === 'support-coordinators' && (<div className="space-y-10 animate-fade-in">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Dedicated Coordinator Hub
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F1E2E]">Support Coordinator Priority Portal</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                We know your time is valuable. Our dedicated coordinator liaison team ensures lightning-fast quote turnarounds and keeps you updated at every step.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { title: '2-Hour Quote Guarantee', desc: 'Need a fast quote for an upcoming plan review or urgent discharge? We turn around standard AT quotes within 2 hours.' },
                { title: 'Dedicated NDIS Case Officer', desc: 'Work directly with an assigned coordinator specialist who manages all participant orders and delivery schedules.' },
                { title: 'Trial Fleet Coordination', desc: 'We take care of scheduling home trials directly with the treating OT and participant, keeping you in the loop.' },
              ].map((c, i) => (<div key={i} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center font-bold">
                    {i + 1}
                  </div>
                  <h3 className="text-base font-bold text-[#0F1E2E]">{c.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{c.desc}</p>
                </div>))}
            </div>

            <div className="bg-[#0F1E2E] text-white p-8 rounded-3xl text-center max-w-3xl mx-auto space-y-4">
              <h3 className="text-xl font-bold">Need an Urgent Quote for a Participant?</h3>
              <p className="text-xs text-white/80 max-w-md mx-auto">
                Email our coordinator desk directly at <span className="text-[#E88D2A] font-bold">quotes@atspecialists.com.au</span> or submit via our online portal.
              </p>
              <Link
                to="/contact?type=coordinator-quote"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs transition-all"
              >
                Submit Coordinator Request
              </Link>
            </div>
          </div>)}

        {/* TAB 5: OCCUPATIONAL THERAPISTS */}
        {activeTab === 'occupational-therapists' && (<div className="space-y-10 animate-fade-in">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider mb-2">
                Allied Health Clinical Portal
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0F1E2E]">For Occupational Therapists & Assessors</h2>
              <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
                Partner with our certified Assistive Technology Professionals (ATPs) for joint assessments, pressure mapping, custom seating adjustments, and complex AT justification data.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-3xl border border-gray-200 p-8 shadow-sm space-y-4">
                <h3 className="text-lg font-bold text-[#0F1E2E]">What We Provide to Treating Therapists</h3>
                <div className="space-y-3 text-xs text-gray-700">
                  {[
                    'Extensive home trial fleet with wheelchairs, beds, hoists, and seating systems',
                    'On-site ATP technician to adjust seating angles, backrests, and joystick profiles during trial',
                    'Detailed CAD specification sheets and pressure mapping data for your AT report',
                    'Post-delivery joint handover to ensure optimal client positioning and safety',
                  ].map((p, i) => (<div key={i} className="flex items-start gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#147A7A] flex-shrink-0 mt-0.5" />
                      <span>{p}</span>
                    </div>))}
                </div>
              </div>

              <div className="bg-[#F8FAFC] rounded-3xl border border-gray-200 p-8 shadow-sm space-y-5 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#0F1E2E] mb-2">Book an In-Home Equipment Trial</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Simply submit your client's dimensions, mobility goals, and preferred equipment models. We will dispatch the trial unit and coordinate with your appointment schedule.
                  </p>
                </div>
                <Link
                  to="/contact?type=ot-trial"
                  className="w-full py-3 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Equipment Trial with Client</span>
                </Link>
              </div>
            </div>
          </div>)}
      </div>
    </div>);
}

export default NDISPage;