import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Award, 
  CheckCircle2, 
  ArrowRight, 
  Phone, 
  Mail, 
  GraduationCap, 
  HeartHandshake, 
  Calendar,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export function TeamPage() {
  const teamMembers = [
    {
      name: 'Sarah Jenkins',
      role: 'Senior Occupational Therapist & Clinical Lead',
      credentials: 'B.App.Sc (Occupational Therapy), AHPRA Registered',
      specialty: 'Complex Seating, Powered Mobility & Paediatric Posture',
      bio: 'With over 14 years of clinical experience across hospital rehabilitation and community NDIS settings, Sarah leads our clinical assessment and seating prescription team.',
      image: '/images/products/team_sarah.jpg',
      fallbackColor: '#147A7A',
      initials: 'SJ',
    },
    {
      name: 'Mark Callahan',
      role: 'Rehabilitation Engineer & ATP',
      credentials: 'B.Eng (Mechatronics), Assistive Technology Professional (ATP)',
      specialty: 'Power Tilt, Custom Scissor Lifts & Environmental Controls',
      bio: 'Mark specializes in custom electronic programming for QM-7 and Permobil power chairs, chin controls, switch access systems, and vehicle mounting systems.',
      image: '/images/products/team_mark.jpg',
      fallbackColor: '#0F1E2E',
      initials: 'MC',
    },
    {
      name: 'Dr. Priya Patel',
      role: 'Clinical Nurse Consultant & Continence Specialist',
      credentials: 'RN, MN (Clinical Nursing), Continence Advisory Certified',
      specialty: 'Continence Care, Skin Integrity & Pressure Sore Prevention',
      bio: 'Priya provides expert consultations for family carers and care facilities, advising on optimal TENA continence wear, barrier creams, and alternating pressure air mattresses.',
      image: '/images/products/team_priya.jpg',
      fallbackColor: '#E88D2A',
      initials: 'PP',
    },
    {
      name: 'David Nguyen',
      role: 'Senior Physiotherapist & Ergonomics Lead',
      credentials: 'B.Physio (Hons), Australian Physiotherapy Association (APA)',
      specialty: 'Patient Hoisting, Standing Frames & Active Gait Trainers',
      bio: 'David collaborates directly with treating therapists to conduct ceiling hoist, mobile lifter, and walking frame evaluations to maximize participant mobility.',
      image: '/images/products/team_david.jpg',
      fallbackColor: '#0E7490',
      initials: 'DN',
    },
    {
      name: 'Emma Thompson',
      role: 'NDIS Clinical Funding & OT Coordinator',
      credentials: 'Grad.Cert (Disability Practice), NDIS Assessor',
      specialty: 'AT Justification Reports, Capital Quotes & Plan Review Support',
      bio: 'Emma ensures seamless coordination between Occupational Therapists, Support Coordinators, and Plan Managers to achieve rapid quote approvals without delays.',
      image: '/images/products/team_emma.jpg',
      fallbackColor: '#5D2B77',
      initials: 'ET',
    },
    {
      name: 'Liam O’Connor',
      role: 'Head Field Technician & Custom Fitter',
      credentials: 'Cert IV Assistive Technology Technical Service',
      specialty: 'White-Glove Home Assembly, Calibration & Annual Servicing',
      bio: 'Liam oversees our nationwide technician fleet, ensuring hospital beds, power chairs, and bathroom aids are delivered, calibrated, and safely oriented for participants.',
      image: '/images/products/team_liam.jpg',
      fallbackColor: '#166534',
      initials: 'LO',
    },
  ];

  return (<div className="min-h-screen bg-[#F7F9FA] text-[#0F1E2E]">
      {/* 1. HERO BANNER */}
      <div className="bg-[#0F1E2E] text-white py-12 sm:py-20 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-[#147A7A]/20 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 relative z-10">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Company' }, { label: 'Our Clinical Team' }]} variant="dark" />
          
          <div className="max-w-3xl mt-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#147A7A]/30 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-[#147A7A]/50 text-white shadow-sm">
              <Award className="w-3.5 h-3.5 text-[#E88D2A]" />
              AHPRA & ARATA Registered Clinical Specialists
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
              Meet Our Clinical & Assistive Technology Team
            </h1>

            <p className="mt-4 text-sm sm:text-base text-white/85 leading-relaxed max-w-2xl font-normal">
              Our multidisciplinary team includes Occupational Therapists, Rehabilitation Engineers, Physiotherapists, and Certified Assistive Technology Professionals dedicated to delivering person-centred outcomes.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to="/contact?type=consultation"
                className="px-6 py-3.5 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 group cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Clinical Consultation / Trial</span>
              </Link>
              <Link
                to="/ndis"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>OT & Clinician Resources</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 2. TEAM MEMBERS GRID */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-14 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider mb-2">
            Clinical Leadership
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F1E2E]">
            Expertise You Can Trust
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-2">
            Every equipment recommendation is backed by thorough clinical evaluation and real-world biomechanical expertise.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {teamMembers.map((member, idx) => (<div
              key={idx}
              className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-xl hover:border-[#147A7A]/50 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Header Banner & Initials Avatar */}
                <div className="bg-gradient-to-r from-[#0F1E2E] to-[#14283C] p-6 flex items-center gap-4 text-white">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-md border-2 border-white/20 flex-shrink-0"
                    style={{ backgroundColor: member.fallbackColor }}
                  >
                    {member.initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold leading-snug">{member.name}</h3>
                    <p className="text-xs text-[#E88D2A] font-semibold mt-0.5">{member.role}</p>
                  </div>
                </div>

                {/* Details Body */}
                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      <GraduationCap className="w-3.5 h-3.5 text-[#147A7A]" />
                      <span>Credentials</span>
                    </div>
                    <p className="text-xs text-gray-700 font-semibold">{member.credentials}</p>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                      <Award className="w-3.5 h-3.5 text-[#E88D2A]" />
                      <span>Clinical Focus</span>
                    </div>
                    <p className="text-xs text-[#147A7A] font-bold">{member.specialty}</p>
                  </div>

                  <p className="text-xs text-gray-600 leading-relaxed pt-2 border-t border-gray-100">
                    {member.bio}
                  </p>
                </div>
              </div>

              {/* Consultation Button */}
              <div className="p-6 pt-0">
                <Link
                  to={`/contact?specialist=${encodeURIComponent(member.name)}`}
                  className="w-full py-2.5 px-4 rounded-xl border-2 border-[#147A7A] text-[#147A7A] hover:bg-[#147A7A] hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all group/btn shadow-sm"
                >
                  <span>Request Joint Assessment</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>))}
        </div>
      </section>

      {/* 3. HOW WE PARTNER WITH ALLIED HEALTH */}
      <section className="bg-white border-y border-gray-200 py-14 sm:py-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div className="space-y-6">
              <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-xs font-bold rounded-full uppercase tracking-wider">
                Allied Health Partnerships
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0F1E2E]">
                Empowering Community Occupational Therapists & Physiotherapists
              </h2>
              <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                We believe the best client outcomes occur when suppliers and therapists work collaboratively. Our clinical team assists with equipment trials, pressure mapping sessions, custom joystick programming, and preparation of complex Assistive Technology Assessment Reports for the NDIA.
              </p>

              <div className="space-y-3">
                {[
                  'Joint in-home trials with our ATPs bringing equipment directly to your client',
                  'Rapid clinical quotes with NDIS AT line item codes',
                  'Access to our comprehensive trial equipment fleet across all capital cities',
                  'Post-delivery handover and pressure re-evaluation support',
                ].map((item, i) => (<div key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-gray-800 font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-[#147A7A] flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>))}
              </div>

              <div className="pt-2">
                <Link
                  to="/ndis?tab=occupational-therapists"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all cursor-pointer"
                >
                  <span>Therapist Portal & Trial Booking</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="bg-[#F8FAFC] rounded-3xl border border-gray-200 p-8 space-y-6">
              <h3 className="text-lg font-bold text-[#0F1E2E]">Clinical Consultation Checklist</h3>
              <div className="space-y-4 text-xs text-gray-600">
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <p className="font-bold text-[#0F1E2E] mb-1">1. Referral & Client Goals</p>
                  <p>Send client dimensions, diagnosis, mobility goals, and home access considerations.</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <p className="font-bold text-[#0F1E2E] mb-1">2. Equipment Trial Dispatch</p>
                  <p>We deliver the calibrated power wheelchair, bed, or commode to the participant's residence.</p>
                </div>
                <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <p className="font-bold text-[#0F1E2E] mb-1">3. Justification Report & Quotation</p>
                  <p>We supply detailed specifications, CAD drawings, and trial outcome data for the NDIS submission.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>);
}

export default TeamPage;
