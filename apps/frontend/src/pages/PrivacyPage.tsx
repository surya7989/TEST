import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2, Mail, Phone } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';

export function PrivacyPage() {
  return (<div className="min-h-screen bg-[#F7F9FA] text-[#0F1E2E]">
      {/* Hero Header */}
      <div className="bg-[#0F1E2E] text-white py-12 sm:py-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Company' }, { label: 'Privacy Policy' }]} variant="dark" />
          
          <div className="max-w-3xl mt-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#147A7A]/30 text-white text-xs font-bold rounded-full mb-3 uppercase tracking-wider border border-[#147A7A]/50">
              <ShieldCheck className="w-3.5 h-3.5 text-[#147A7A]" />
              Privacy Act 1988 (Cth) & NDIS Quality Standards
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Privacy & Health Data Policy
            </h1>
            <p className="text-sm text-white/80 mt-3 leading-relaxed">
              Last updated: August 2026 &middot; Compliant with Australian Privacy Principles (APPs) and the NDIS Quality and Safeguards Commission.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 space-y-10">
        {/* Intro Card */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <h2 className="text-lg font-bold text-[#0F1E2E] flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#147A7A]" />
            1. Our Commitment to Your Privacy
          </h2>
          <p>
            AT Specialists Australia Pty Ltd (ABN 45 123 456 789) is committed to protecting the privacy, confidentiality, and security of personal, sensitive, and health information collected from our participants, carers, therapists, and customers.
          </p>
          <p>
            We adhere strictly to the <strong>Privacy Act 1988 (Cth)</strong>, the <strong>Australian Privacy Principles (APPs)</strong>, and the mandatory privacy provisions required of providers under the <strong>National Disability Insurance Scheme (NDIS) Quality and Safeguards Commission</strong>.
          </p>
        </div>

        {/* What Information We Collect */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <h2 className="text-lg font-bold text-[#0F1E2E] flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#147A7A]" />
            2. Information We Collect
          </h2>
          <p>To provide clinical assistive technology assessments, trial equipment dispatch, and process NDIS claims, we may collect:</p>
          <ul className="space-y-2 list-disc pl-5">
            <li><strong>Contact details:</strong> Name, delivery address, phone number, email address.</li>
            <li><strong>NDIS & Funding details:</strong> NDIS participant number, plan management agency name, funding category balances.</li>
            <li><strong>Clinical & Health data:</strong> Occupational Therapy assessment reports, seating measurements, mobility requirements, and equipment trial feedback.</li>
            <li><strong>Order & Transaction records:</strong> Invoices, payment confirmations, and delivery tracking signatures.</li>
          </ul>
        </div>

        {/* How We Use Your Information */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <h2 className="text-lg font-bold text-[#0F1E2E] flex items-center gap-2">
            <Eye className="w-5 h-5 text-[#147A7A]" />
            3. How We Use and Disclose Information
          </h2>
          <p>We use your information exclusively to:</p>
          <div className="space-y-2">
            {[
              'Prepare clinical justification quotes and AT assessment submissions for the NDIA or Plan Managers',
              'Dispatch, assemble, and configure assistive technology and hospital equipment at your residence',
              'Coordinate trial equipment with your treating Occupational Therapist or Physiotherapist',
              'Fulfil warranty, regular maintenance, and product safety recall obligations',
            ].map((pt, i) => (<div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#147A7A] flex-shrink-0 mt-0.5" />
                <span>{pt}</span>
              </div>))}
          </div>
          <p className="pt-2 text-gray-500 text-xs">
            We will <strong>never sell, lease, or rent</strong> your personal or health data to third-party marketing companies.
          </p>
        </div>

        {/* Data Security & Storage */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4 text-xs sm:text-sm text-gray-700 leading-relaxed">
          <h2 className="text-lg font-bold text-[#0F1E2E]">4. Data Storage & Cyber Security</h2>
          <p>
            All electronic participant records, quotes, and clinical attachments are stored on encrypted Australian servers compliant with Australian Government Information Security Manual (ISM) standards and SSL 256-bit encryption. Access is restricted strictly to authorized clinical and administrative personnel.
          </p>
        </div>

        {/* Contact Privacy Officer */}
        <div className="bg-[#F8FAFC] p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-4 text-xs sm:text-sm text-gray-700">
          <h2 className="text-lg font-bold text-[#0F1E2E]">5. Access, Corrections & Contact</h2>
          <p>
            You have the right to request access to any personal data held about you, or ask for corrections. To contact our Privacy Officer:
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-2 font-bold text-[#0F1E2E]">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-[#147A7A]" />
              <span>privacy@atspecialists.com.au</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#147A7A]" />
              <a href="tel:0494767409" className="hover:underline">0494 767 409 (Mon–Fri, 8:30am–5:00pm AEST)</a>
            </div>
          </div>
        </div>
      </div>
    </div>);
}

export default PrivacyPage;
