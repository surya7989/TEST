import React, { useState } from 'react';
import { Phone, Mail, MapPin, Clock, Send, Headphones, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useAdminStore } from '@/store/adminStore';
import { submitInquiry as apiSubmitInquiry } from '@/lib/api';

const enquiryTypes = [
  { value: 'general', label: 'General Enquiry' },
  { value: 'product', label: 'Product Enquiry' },
  { value: 'hire', label: 'Equipment Hire' },
  { value: 'ndis', label: 'NDIS Quote / Support' },
  { value: 'trial', label: 'Equipment Home Trial' },
  { value: 'quote', label: 'Request a Quote' },
  { value: 'support', label: 'Product Support / Repairs' },
];

export function ContactPage() {
  const { addInquiry } = useAdminStore();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    enquiryType: 'general',
    equipmentInterest: '',
    ndisNumber: '',
    planManager: '',
    message: '',
    preferredContact: 'phone' as 'phone' | 'email' | 'any',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        enquiryType: formData.enquiryType,
        ndisNumber: formData.ndisNumber.trim() || undefined,
        subject: `Customer Enquiry: ${formData.enquiryType} - ${formData.name.trim()}`,
        message: `${formData.message.trim()}${formData.equipmentInterest ? `\n[Equipment Interest: ${formData.equipmentInterest}]` : ''}${formData.planManager ? `\n[Plan Manager: ${formData.planManager}]` : ''}`,
      };

      await apiSubmitInquiry(payload);

      addInquiry({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        enquiryType: formData.enquiryType,
        ndisNumber: formData.ndisNumber.trim() || undefined,
        planManager: formData.planManager.trim() || undefined,
        message: payload.message,
        preferredContact: formData.preferredContact,
      });

      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit enquiry. Please call us directly at 0494 767 409.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (<div className="min-h-screen bg-[#F7F9FA]">
      {/* Hero */}
      <div className="bg-[#0B1728] text-white">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-10 sm:py-14 lg:py-20">
          <Breadcrumbs items={[{ label: 'Home', path: '/' }, { label: 'Contact', path: '/contact' }]} />
          <h1 className="text-[26px] sm:text-[32px] lg:text-[40px] font-black text-white leading-tight mt-4">
            Talk to an AT Specialist
          </h1>
          <p className="text-[13px] sm:text-[15px] text-white/80 mt-3 max-w-2xl leading-relaxed">
            Our team of occupational therapists and assistive technology specialists is here to help you find the right equipment for your needs.
          </p>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-8 sm:py-12">
        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Contact Form */}
          <main className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 lg:p-8 shadow-sm">
              {submitted ? (<div className="text-center py-8 sm:py-12">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-5">
                    <Send className="h-7 w-7 sm:h-8 sm:w-8" />
                  </div>
                  <h2 className="text-[20px] sm:text-[22px] font-bold text-[#0F1E2E] mb-3">Enquiry Received</h2>
                  <p className="text-[13px] sm:text-[14px] text-gray-600 max-w-md mx-auto mb-6">
                    Thank you for contacting AT Specialists. One of our clinical team members will respond within one business day.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="px-5 sm:px-6 py-2.5 border-2 border-[#147A7A] text-[#147A7A] hover:bg-[#147A7A]/5 text-[13px] sm:text-[14px] font-bold rounded-lg transition-all cursor-pointer"
                  >
                    Send Another Enquiry
                  </button>
                </div>) : (<form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                  {errorMsg && (<div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{errorMsg}</span>
                    </div>)}

                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-5">
                    <div>
                      <label className="block text-[11.5px] sm:text-[12.5px] font-semibold text-gray-700 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value })}
                        placeholder="e.g. Eleanor Vance"
                        autoComplete="name"
                        className="w-full h-[40px] sm:h-[42px] px-3.5 border border-gray-300 rounded-lg text-[12.5px] sm:text-[13.5px] outline-none focus:border-[#147A7A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11.5px] sm:text-[12.5px] font-semibold text-gray-700 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value })}
                        placeholder="e.g. eleanor@example.com.au"
                        autoComplete="email"
                        className="w-full h-[40px] sm:h-[42px] px-3.5 border border-gray-300 rounded-lg text-[12.5px] sm:text-[13.5px] outline-none focus:border-[#147A7A]"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-5">
                    <div>
                      <label className="block text-[11.5px] sm:text-[12.5px] font-semibold text-gray-700 mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value })}
                        placeholder="e.g. 0400 000 000"
                        autoComplete="tel"
                        className="w-full h-[40px] sm:h-[42px] px-3.5 border border-gray-300 rounded-lg text-[12.5px] sm:text-[13.5px] outline-none focus:border-[#147A7A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11.5px] sm:text-[12.5px] font-semibold text-gray-700 mb-1">Enquiry Type</label>
                      <select
                        value={formData.enquiryType}
                        onChange={(e) => setFormData({...formData, enquiryType: e.target.value })}
                        className="w-full h-[40px] sm:h-[42px] px-3.5 border border-gray-300 rounded-lg text-[12.5px] sm:text-[13.5px] outline-none bg-white focus:border-[#147A7A]"
                      >
                        {enquiryTypes.map((t) => (<option key={t.value} value={t.value}>{t.label}</option>))}
                      </select>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-5">
                    <div>
                      <label className="block text-[11.5px] sm:text-[12.5px] font-semibold text-gray-700 mb-1">NDIS Number (Optional)</label>
                      <input
                        type="text"
                        value={formData.ndisNumber}
                        onChange={(e) => setFormData({...formData, ndisNumber: e.target.value })}
                        placeholder="e.g. 430 000 000"
                        className="w-full h-[40px] sm:h-[42px] px-3.5 border border-gray-300 rounded-lg text-[12.5px] sm:text-[13.5px] outline-none focus:border-[#147A7A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11.5px] sm:text-[12.5px] font-semibold text-gray-700 mb-1">Equipment Interest (Optional)</label>
                      <input
                        type="text"
                        value={formData.equipmentInterest}
                        onChange={(e) => setFormData({...formData, equipmentInterest: e.target.value })}
                        placeholder="e.g. Power Wheelchair, Hospital Bed"
                        className="w-full h-[40px] sm:h-[42px] px-3.5 border border-gray-300 rounded-lg text-[12.5px] sm:text-[13.5px] outline-none focus:border-[#147A7A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11.5px] sm:text-[12.5px] font-semibold text-gray-700 mb-1">How can we help? *</label>
                    <textarea
                      required
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value })}
                      placeholder="Please describe your requirements, funding situation, or questions..."
                      className="w-full p-3.5 border border-gray-300 rounded-lg text-[12.5px] sm:text-[13.5px] outline-none focus:border-[#147A7A]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-8 py-3.5 bg-[#147A7A] hover:bg-[#0E5C5C] text-white font-bold rounded-xl text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? 'Sending Enquiry...' : 'Submit Enquiry'}</span>
                  </button>
                </form>)}
            </div>
          </main>

          {/* Right Sidebar Details */}
          <aside className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
              <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">Clinic & Contact Details</h2>

              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-[#147A7A] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block font-semibold text-gray-800">Phone Support</span>
                    <a href="tel:0494767409" className="text-gray-600 hover:text-[#147A7A]">0494 767 409</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-[#147A7A] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block font-semibold text-gray-800">Email Inquiries</span>
                    <a href="mailto:admin@atspecialists.com.au" className="text-gray-600 hover:text-[#147A7A]">admin@atspecialists.com.au</a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#147A7A] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block font-semibold text-gray-800">Head Office</span>
                    <span className="text-gray-600">Level 2, 88 Holmes Road, Moonee Ponds VIC 3039</span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-[#147A7A] mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="block font-semibold text-gray-800">Operating Hours</span>
                    <span className="text-gray-600">Monday &ndash; Friday: 8:30 AM &ndash; 5:30 PM AEST</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-teal-50/70 border border-teal-200/80 rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2 text-[#147A7A] font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>NDIS Provider</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">
                We work with Plan Managers, Support Coordinators, and NDIA-managed participants across Australia.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>);
}

export default ContactPage;