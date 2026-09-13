import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import { sendTemplateSampleEmail, dispatchTemplateEmail } from '@/lib/api';
import logoHeaderImg from '@/assets/logo-header.png';
import {
  Mail,
  Server,
  Send,
  Check,
  RotateCcw,
  Sparkles,
  Smartphone,
  Monitor,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  FileText,
  Copy,
  Layers,
  ChevronRight,
  RefreshCw,
  ExternalLink,
  ShoppingBag,
  Calendar,
  Building2,
  MessageSquare,
  Paperclip,
  Truck,
  Palette,
  Eye,
  Sliders,
  CheckCircle,
  UserCheck,
  Headphones,
} from 'lucide-react';

interface CagefsEmailTemplate {
  id: string;
  name: string;
  category: string;
  icon: React.ElementType;
  pdfAttachmentName: string | null;
  adminSubject: string;
  receiverSubject: string;
  adminBadge: string;
  receiverBadge: string;
  trigger: string;
  adminSummary: string;
  receiverSummary: string;
  renderAdminBody: () => React.ReactNode;
  renderReceiverBody: () => React.ReactNode;
}

export function AdminEmails() {
  const { orders, customers, invoiceSettings, updateInvoiceSettings } = useAdminStore();

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('order');
  const [previewRecipient, setPreviewRecipient] = useState<'receiver' | 'admin'>('receiver');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Clinic & Header Settings synced with store
  const [emailConfig, setEmailConfig] = useState({
    clinicName: invoiceSettings?.companyName || 'AT Specialists Australia',
    address: invoiceSettings?.address || (invoiceSettings?.addressLine1 ? `${invoiceSettings.addressLine1}, ${invoiceSettings.addressLine2 || ''}`.trim() : 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039'),
    phone: invoiceSettings?.phone || '0494 767 409',
    abn: invoiceSettings?.abn || '48 123 456 789',
    website: invoiceSettings?.website || 'atspecialists.com.au',
    email: invoiceSettings?.email || 'payments@atspecialists.com.au',
    brandColor: invoiceSettings?.brandColor || '#147A7A',
    footerText:
      'Confidentiality Notice: This medical and assistive technology communication is confidential and intended solely for the recipient. If received in error, please notify sender immediately.',
  });
  const [brandingSaved, setBrandingSaved] = useState(false);

  useEffect(() => {
    if (invoiceSettings) {
      setEmailConfig((prev) => ({
        ...prev,
        clinicName: invoiceSettings.companyName || prev.clinicName,
        address: invoiceSettings.address || (invoiceSettings.addressLine1 ? `${invoiceSettings.addressLine1}, ${invoiceSettings.addressLine2 || ''}`.trim() : prev.address),
        phone: invoiceSettings.phone || prev.phone,
        abn: invoiceSettings.abn || prev.abn,
        website: invoiceSettings.website || prev.website,
        email: invoiceSettings.email || prev.email,
        brandColor: invoiceSettings.brandColor || prev.brandColor,
      }));
    }
  }, [invoiceSettings]);

  const handleSaveBranding = () => {
    updateInvoiceSettings({
      companyName: emailConfig.clinicName,
      address: emailConfig.address,
      phone: emailConfig.phone,
      abn: emailConfig.abn,
      website: emailConfig.website,
      email: emailConfig.email,
      brandColor: emailConfig.brandColor,
    });
    setBrandingSaved(true);
    setTimeout(() => setBrandingSaved(false), 2500);
  };

  const [sampleRecipientEmail, setSampleRecipientEmail] = useState('payments@atspecialists.com.au');
  const [isSendingSample, setIsSendingSample] = useState(false);
  const [sampleResult, setSampleResult] = useState<{ success: boolean; message: string } | null>(null);

  // 6 Complete Cagefs Templates
  const templates: CagefsEmailTemplate[] = [
    {
      id: 'order',
      name: 'Order Confirmation & Tax Invoice',
      category: 'E-Commerce & Clinic Store',
      icon: ShoppingBag,
      pdfAttachmentName: 'Tax-Invoice-INV-2026-10001.pdf',
      adminSubject: '[New Order Alert] #INV/2026/10001 — Sarah Jenkins ($1,280.00 AUD)',
      receiverSubject: 'Order Confirmation & Tax Invoice #INV/2026/10001 — AT Specialists Australia',
      adminBadge: 'Fulfillment & Logistics Required',
      receiverBadge: 'Order Confirmed & Invoiced',
      trigger: 'Automated dispatch on shopping cart checkout or order placement.',
      adminSummary: 'Notifies staff of equipment purchased, customer contact, and delivery address.',
      receiverSummary: 'Provides customer with itemized tax invoice, GST breakdown, ANZ/CBA bank transfer details, and attached PDF.',
      renderAdminBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📦 New Equipment Order Received
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                Pending Dispatch
              </span>
            </div>
            <div style={{ color: '#475569', fontSize: '12.5px' }}>
              Order <strong>INV/2026/10001</strong> placed by <strong>Sarah Jenkins</strong>. Please verify payment and dispatch items.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Customer Information</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>Sarah Jenkins</div>
              <div style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>Phone: 0412 345 678</div>
              <div style={{ color: '#147A7A', fontSize: '12px' }}>Email: s.jenkins@example.com.au</div>
            </div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Shipping Address</div>
              <div style={{ color: '#0f172a', fontSize: '12.5px', lineHeight: 1.5 }}>42 Victoria Parade, Fitzroy VIC 3065 Australia</div>
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '18px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Item Description</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, width: '50px' }}>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, width: '90px' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Air-Cell Pressure Relief Cushion</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Code: EQ-104 &bull; High-Risk Pressure Care</div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#475569' }}>1</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#0f172a' }}>$480.00</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Ultralight Folding Transport Wheelchair</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Code: EQ-102 &bull; 18 Inch Wide</div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#475569' }}>1</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontWeight: 700, color: '#0f172a' }}>$800.00</td>
                </tr>
              </tbody>
            </table>
            <div style={{ background: '#ffffff', padding: '12px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Subtotal (Excl. GST):</span><span>$1,163.64 AUD</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>GST (10% Included):</span><span>$116.36 AUD</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', fontWeight: 800, color: '#0f172a', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}><span>Total Order Value:</span><span>$1,280.00 AUD</span></div>
            </div>
          </div>
        </div>),
      renderReceiverBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ✓ Order Confirmed &bull; Invoice #INV/2026/10001
            </div>
            <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
              Thank you for your order, Sarah!
            </h2>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
              We have received your assistive technology order. Your printable Tax Invoice is attached to this email.
            </p>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', marginBottom: '18px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700 }}>Item Description</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 700, width: '50px' }}>Qty</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, width: '90px' }}>Price</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Air-Cell Pressure Relief Cushion</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Code: EQ-104 &bull; High-Risk Pressure Care</div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>1</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>$480.00</td>
                </tr>
                <tr>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a' }}>Ultralight Folding Transport Wheelchair</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>Code: EQ-102 &bull; 18 Inch Wide</div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>1</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', borderBottom: '1px solid #f1f5f9', fontWeight: 700 }}>$800.00</td>
                </tr>
              </tbody>
            </table>
            <div style={{ background: '#ffffff', padding: '12px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>Subtotal (Excl. GST):</span><span>$1,163.64 AUD</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}><span>GST (10% Included):</span><span>$116.36 AUD</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14.5px', fontWeight: 800, color: '#0f172a', marginTop: '4px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}><span>Grand Total:</span><span>$1,280.00 AUD</span></div>
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px', marginBottom: '18px', background: '#f8fafc' }}>
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', marginBottom: '8px' }}>
              Direct Bank Transfer (EFT) Details:
            </div>
            <table style={{ width: '100%', fontSize: '12px', color: '#334155', lineHeight: 1.6 }}>
              <tbody>
                <tr><td><strong>Account Name:</strong> {invoiceSettings?.accountName || 'AT Specialists Australia Pty Ltd'}</td><td><strong>Bank:</strong> {invoiceSettings?.bankName || 'Commonwealth Bank of Australia (CBA)'}</td></tr>
                <tr><td><strong>BSB:</strong> {invoiceSettings?.bsb || '063-000'}</td><td><strong>Account Number:</strong> {invoiceSettings?.accountNumber || '1088 4422'}</td></tr>
                <tr><td colSpan={2}><strong>Payment Reference:</strong> <code>INV/2026/10001</code></td></tr>
              </tbody>
            </table>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#ffffff', fontSize: '12px', color: '#475569' }}>
            <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px' }}>Shipping To:</strong>
            Sarah Jenkins &bull; 42 Victoria Parade, Fitzroy VIC 3065 &bull; Phone: 0412 345 678
          </div>
        </div>),
    },
    {
      id: 'referral',
      name: 'NDIS Clinical Referral & Intake',
      category: 'NDIS Services & Clinical Triage',
      icon: ShieldCheck,
      pdfAttachmentName: 'NDIS-Clinical-Referral-Intake.pdf',
      adminSubject: '[New NDIS Referral Alert] Johnathan Miller — Ref #REF-9021',
      receiverSubject: 'NDIS Referral Intake Confirmed #REF-9021 — AT Specialists Australia',
      adminBadge: 'Clinical Triage Required',
      receiverBadge: 'NDIS Referral Registered',
      trigger: 'Automated dispatch on NDIS referral or therapy intake submission.',
      adminSummary: 'Alerts clinical team of participant profile, funding manager, diagnosis, and goals.',
      receiverSummary: 'Provides participant and Plan Manager with intake confirmation, 3-step timeline, and attached intake PDF.',
      renderAdminBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#147A7A', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📋 New NDIS Participant Referral
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#147A7A', background: '#ccfbf1', padding: '2px 8px', borderRadius: '4px' }}>
                Plan-Managed
              </span>
            </div>
            <div style={{ color: '#475569', fontSize: '12.5px' }}>
              Participant <strong>Johnathan Miller</strong> (NDIS # <strong>430 892 119</strong>) has been registered for assistive tech assessment.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '18px' }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Participant Profile</div>
              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '13.5px' }}>Johnathan Miller</div>
              <div style={{ color: '#475569', fontSize: '12px', marginTop: '2px' }}>DOB: 14/05/1988</div>
              <div style={{ color: '#475569', fontSize: '12px' }}>Phone: 0491 570 123</div>
              <div style={{ color: '#475569', fontSize: '12px' }}>Location: Doncaster East VIC 3109</div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#ffffff' }}>
              <div style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '6px' }}>Service Requirements</div>
              <div style={{ color: '#0f172a', fontSize: '12.5px', lineHeight: 1.5 }}>
                <strong>Category:</strong> Complex Powered Mobility Trial<br />
                <strong>Delivery Mode:</strong> In-Home Clinical Trial<br />
                <strong>Plan Manager:</strong> MyPlan Care Melbourne<br />
                <strong>Invoicing:</strong> invoices@myplancare.com.au
              </div>
            </div>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px 14px', background: '#ffffff', marginBottom: '18px', fontSize: '12.5px' }}>
            <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>Diagnosis &amp; Referral Goals:</div>
            <div style={{ color: '#475569' }}>
              <strong>Diagnosis:</strong> Spinal Cord Injury (T4 Complete) &bull; <strong>Goals:</strong> High-end seating assessment and trial of power wheelchair with standing function.
            </div>
          </div>
        </div>),
      renderReceiverBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#147A7A', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ✓ Intake Registered &bull; Reference #REF-9021
            </div>
            <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
              Referral Received — AT Specialists Australia
            </h2>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
              Dear <strong>Johnathan Miller / Support Coordinator</strong>, thank you for submitting a referral for assistive technology solutions.
            </p>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px', background: '#ffffff', marginBottom: '18px' }}>
            <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '13.5px', marginBottom: '12px' }}>
              What Happens Next? (3-Step Clinical Journey)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px', color: '#334155' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ background: '#ccfbf1', color: '#147A7A', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>1</div>
                <div><strong>Clinical Triage (Within 24 Hours):</strong> Our Senior Occupational Therapist reviews funding allocation and equipment specifications.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ background: '#ccfbf1', color: '#147A7A', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>2</div>
                <div><strong>Initial Contact &amp; Trial Booking:</strong> We contact you or your OT to schedule an in-home trial.</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <div style={{ background: '#ccfbf1', color: '#147A7A', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, flexShrink: 0 }}>3</div>
                <div><strong>Equipment Delivery &amp; Setup:</strong> Certified technicians deliver, calibrate, and orient user on the trial device.</div>
              </div>
            </div>
          </div>
        </div>),
    },
    {
      id: 'aged_care',
      name: 'Support at Home / Aged Care Referral',
      category: 'Aged Care Packages (HCP / CHSP)',
      icon: Building2,
      pdfAttachmentName: 'Support-At-Home-Intake.pdf',
      adminSubject: '[Aged Care Referral Alert] Margaret Henderson — Ref #HCP-4029 (Level 3)',
      receiverSubject: 'Support at Home Referral Confirmation #HCP-4029 — AT Specialists Australia',
      adminBadge: 'Aged Care Triage Required',
      receiverBadge: 'Support at Home Registered',
      trigger: 'Automated dispatch on Support at Home package referral submission.',
      adminSummary: 'Details package provider, HCP level (1-4), Care Coordinator contacts, and clinical mobility requirements.',
      receiverSummary: 'Provides Care Coordinator and client with confirmation, billing details, and attached A4 intake PDF.',
      renderAdminBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🏠 Support at Home Package Referral
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#92400e', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>
                HCP Level 3 Approved
              </span>
            </div>
            <div style={{ color: '#475569', fontSize: '12.5px' }}>
              Client <strong>Margaret Henderson</strong> has been referred for hospital bed and mobility walker provision under Home Care Package Level 3.
            </div>
          </div>
        </div>),
      renderReceiverBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#d97706', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ✓ Aged Care Intake Confirmed &bull; Ref #HCP-4029
            </div>
            <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
              Support at Home Referral Confirmed
            </h2>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
              Dear <strong>Care Coordinator / Margaret Henderson</strong>, we confirm receipt of the clinical referral.
            </p>
          </div>
        </div>),
    },
    {
      id: 'hire',
      name: 'Equipment Rental & Hire Agreement',
      category: 'Equipment Rental & Logistics',
      icon: Truck,
      pdfAttachmentName: 'Equipment-Hire-Agreement.pdf',
      adminSubject: '[Hire Agreement Alert] #HIRE-2026-8812 — David Chen ($220.00/month)',
      receiverSubject: 'Equipment Hire Agreement & Schedule #HIRE-2026-8812 — AT Specialists Australia',
      adminBadge: 'Hire Dispatch Required',
      receiverBadge: 'Hire Agreement Active',
      trigger: 'Automated dispatch on short/long term equipment rental booking.',
      adminSummary: 'Alerts logistics team of hired asset SKU, start/end dates, deposit bond, and delivery address.',
      receiverSummary: 'Provides hirer with hire terms, weekly billing schedule, bond refund conditions, and setup guides.',
      renderAdminBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                🚚 New Equipment Rental Scheduled
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#0369a1', background: '#e0f2fe', padding: '2px 8px', borderRadius: '4px' }}>
                4-Week Initial Hire
              </span>
            </div>
            <div style={{ color: '#475569', fontSize: '12.5px' }}>
              Rental Agreement <strong>HIRE-2026-8812</strong> active for <strong>David Chen</strong>.
            </div>
          </div>
        </div>),
      renderReceiverBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0284c7', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ✓ Hire Agreement Confirmed &bull; Ref #HIRE-2026-8812
            </div>
            <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
              Equipment Hire Agreement &bull; David Chen
            </h2>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
              Your equipment rental has been scheduled for delivery. Full hire terms and schedule attached.
            </p>
          </div>
        </div>),
    },
    {
      id: 'booking',
      name: 'Clinical Assessment & Trial Booking',
      category: 'Clinical Consultations & Scheduling',
      icon: Calendar,
      pdfAttachmentName: 'Booking-Confirmation-Summary.pdf',
      adminSubject: '[Assessment Booking Alert] Robert Evans — Ref #BKG-7719 (Power Wheelchair Trial)',
      receiverSubject: 'Appointment Request Received #BKG-7719 — AT Specialists Australia',
      adminBadge: 'Scheduling Required',
      receiverBadge: 'Booking Request Registered',
      trigger: 'Automated dispatch on website appointment or product trial booking.',
      adminSummary: 'Alerts scheduling staff with client contact details, requested service, and preferred trial date.',
      receiverSummary: 'Provides client with booking receipt, showroom/in-home trial details, and preparation guidelines.',
      renderAdminBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', marginBottom: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📅 New Trial Booking Request
              </span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#be185d', background: '#fce7f3', padding: '2px 8px', borderRadius: '4px' }}>
                In-Home OT Trial
              </span>
            </div>
            <div style={{ color: '#475569', fontSize: '12.5px' }}>
              Client <strong>Robert Evans</strong> has requested an assessment for 12/09/2026.
            </div>
          </div>
        </div>),
      renderReceiverBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#db2777', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ✓ Booking Request Registered &bull; Ref #BKG-7719
            </div>
            <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
              Equipment Trial Request Received!
            </h2>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
              We have received your trial booking request. A specialist clinician will call you to confirm appointment details.
            </p>
          </div>
        </div>),
    },
    {
      id: 'contact',
      name: 'General Patient & OT Inquiry',
      category: 'Website Inquiries & Contact Form',
      icon: MessageSquare,
      pdfAttachmentName: null,
      adminSubject: '[Inquiry Alert] Emily Watson — Pressure Care Support',
      receiverSubject: 'We have received your message — AT Specialists Australia',
      adminBadge: 'Customer Support Required',
      receiverBadge: 'Inquiry Acknowledged',
      trigger: 'Automated dispatch on contact form submission.',
      adminSummary: 'Alerts customer service team with sender contact details, subject, and message body.',
      receiverSummary: 'Provides inquirer with an automated confirmation and response time SLA (within 4 business hours).',
      renderAdminBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '14px 16px', marginBottom: '18px' }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>
              💬 New Website Consultation Inquiry
            </div>
            <div style={{ color: '#475569', fontSize: '12.5px' }}>
              From: <strong>Emily Watson</strong> (e.watson@melbournehealth.org.au) &bull; Phone: 0433 112 233
            </div>
          </div>
        </div>),
      renderReceiverBody: () => (<div style={{ color: '#1e293b', fontSize: '13px', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '18px', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
            <h2 style={{ color: '#0f172a', fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0' }}>
              Thank you for contacting AT Specialists Australia
            </h2>
            <p style={{ color: '#475569', fontSize: '13px', margin: 0 }}>
              We have received your inquiry. One of our Assistive Technology Consultants will respond within 4 business hours.
            </p>
          </div>
        </div>),
    },
  ];

  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];

  const handleSendSampleEmail = async (sendBoth = false) => {
    if (!sampleRecipientEmail || !sampleRecipientEmail.includes('@')) {
      setSampleResult({ success: false, message: 'Please enter a valid recipient email address' });
      return;
    }
    setIsSendingSample(true);
    setSampleResult(null);
    try {
      const res = await dispatchTemplateEmail({
        templateId: selectedTemplateId,
        recipientEmail: sampleRecipientEmail,
        customerName: 'Sarah Jenkins',
        customerPhone: '0412 345 678',
        shippingAddress: '42 Victoria Parade, Fitzroy VIC 3065 Australia',
        sendCustomerCopy: sendBoth || previewRecipient === 'receiver',
        sendAdminCopy: sendBoth || previewRecipient === 'admin',
        adminEmail: sampleRecipientEmail,
        customSettings: {
          companyName: emailConfig.clinicName,
          addressLine1: emailConfig.address,
          phone: emailConfig.phone,
          abn: emailConfig.abn,
          email: emailConfig.email,
          website: emailConfig.website,
        },
      });
      setIsSendingSample(false);
      setSampleResult({
        success: true,
        message: res.message || `template '${activeTemplate.name}' dispatched to ${sampleRecipientEmail} with attached PDF (${res.filename || 'PDF Attached'})!`,
      });
      setTimeout(() => setSampleResult(null), 8000);
    } catch (err: any) {
      setIsSendingSample(false);
      setSampleResult({ success: false, message: err.message || 'Failed to dispatch template' });
    }
  };

  return (<div className="space-y-6 pb-20 animate-fade-in font-sans text-slate-700">
      
      {/* 1. TOP HEADER & NAVIGATION */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#147A7A] uppercase tracking-wider">Email Studio</span>
            <span className="text-slate-300">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">Responsive HTML Email Engine</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-0.5">Email Templates &amp; Mail Dispatch</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Preview transactional emails, NDIS referrals, order tax receipts, and clinical alerts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {templates.length} System Templates Active
          </span>

          <Link
            to="/at/settings?tab=email"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
          >
            <Server className="w-3.5 h-3.5 text-[#147A7A]" />
            <span>SMTP Credentials in Settings →</span>
          </Link>
        </div>
      </div>

      {/* 1.5 PROMINENT SIDE-BY-SIDE STUDIO LINK */}
      <div className="bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#147A7A] text-white flex items-center justify-center shrink-0 shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">Side-by-Side Email &amp; Invoice Studio</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              View the responsive email template and attached A4 tax invoice side-by-side with 1-click dispatch.
            </p>
          </div>
        </div>
        <Link
          to="/at/invoices"
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#147A7A] hover:bg-[#106262] rounded-xl shadow-xs transition-colors shrink-0"
        >
          <span>Open Side-by-Side Studio →</span>
        </Link>
      </div>

      {/* 2. TAB CONTENT: TEMPLATES STUDIO */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: TEMPLATES SELECTOR & CONFIG (4 COLS) */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Template List */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block px-1">
                Select Email Template
              </span>
              <div className="space-y-1.5">
                {templates.map((tmpl) => {
                  const Icon = tmpl.icon;
                  const isSelected = selectedTemplateId === tmpl.id;
                  return (<button
                      key={tmpl.id}
                      type="button"
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`w-full flex items-start gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#147A7A] bg-teal-50/50 shadow-2xs ring-1 ring-[#147A7A]/30'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${isSelected ? 'bg-[#147A7A] text-white' : 'bg-slate-100 text-slate-600'}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 truncate">{tmpl.name}</span>
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">{tmpl.category}</span>
                      </div>
                    </button>);
                })}
              </div>
            </div>

            {/* Template Information Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900 text-sm">{activeTemplate.name}</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold text-[10.5px] rounded-md border border-emerald-200">
                  Active in CageFS
                </span>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Automated Trigger:</span>
                <p className="text-slate-600">{activeTemplate.trigger}</p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Customer / Receiver Subject:</span>
                <p className="font-mono text-[11px] text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {activeTemplate.receiverSubject}
                </p>
              </div>

              <div>
                <span className="font-semibold text-slate-700 block mb-0.5">Clinic Staff Alert Subject:</span>
                <p className="font-mono text-[11px] text-slate-800 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {activeTemplate.adminSubject}
                </p>
              </div>

              {activeTemplate.pdfAttachmentName && (<div className="p-3 bg-teal-50/60 border border-teal-200 rounded-xl flex items-center gap-2 text-teal-900">
                  <Paperclip className="w-4 h-4 text-[#147A7A] flex-shrink-0" />
                  <div>
                    <span className="font-bold block text-[11.5px]">Automated PDF Attachment:</span>
                    <span className="text-[10.5px] font-mono">{activeTemplate.pdfAttachmentName}</span>
                  </div>
                </div>)}
            </div>

            {/* Global Branding Info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3 text-xs">
              <span className="font-bold text-slate-900 block text-sm border-b border-slate-100 pb-2">
                Header &amp; Footer Branding
              </span>
              <div className="space-y-2">
                <div>
                  <label className="block text-slate-600 font-medium mb-0.5">Company Name</label>
                  <input
                    type="text"
                    value={emailConfig.clinicName}
                    onChange={(e) => setEmailConfig({...emailConfig, clinicName: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-[#147A7A]"
                  />
                </div>
                <div>
                  <label className="block text-slate-600 font-medium mb-0.5">Address</label>
                  <input
                    type="text"
                    value={emailConfig.address}
                    onChange={(e) => setEmailConfig({...emailConfig, address: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-[#147A7A]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-600 font-medium mb-0.5">Phone</label>
                    <input
                      type="text"
                      value={emailConfig.phone}
                      onChange={(e) => setEmailConfig({...emailConfig, phone: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900 outline-none focus:border-[#147A7A]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 font-medium mb-0.5">ABN</label>
                    <input
                      type="text"
                      value={emailConfig.abn}
                      onChange={(e) => setEmailConfig({...emailConfig, abn: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-900 font-mono outline-none focus:border-[#147A7A]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveBranding}
                    className={`w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      brandingSaved
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#147A7A] hover:bg-[#106262] text-white shadow-2xs'
                    }`}
                  >
                    {brandingSaved ? (<>
                        <Check className="w-3.5 h-3.5" />
                        <span>Branding &amp; Defaults Saved!</span>
                      </>) : (<>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Save Branding &amp; Template Defaults</span>
                      </>)}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE RESPONSIVE EMAIL CANVAS (8 COLS) */}
          <div className="lg:col-span-8 space-y-4">
            
            {/* Preview Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-xs text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">View Copy:</span>
                <div className="bg-slate-800 p-0.5 rounded-lg flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewRecipient('receiver')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      previewRecipient === 'receiver'
                        ? 'bg-[#147A7A] text-white shadow-2xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Customer / Client Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewRecipient('admin')}
                    className={`px-3 py-1 rounded-md font-bold transition-all cursor-pointer ${
                      previewRecipient === 'admin'
                        ? 'bg-[#147A7A] text-white shadow-2xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Clinic Staff Alert
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-300">Viewport:</span>
                <div className="bg-slate-800 p-0.5 rounded-lg flex gap-1">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      previewDevice === 'desktop'
                        ? 'bg-slate-700 text-cyan-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${
                      previewDevice === 'mobile'
                        ? 'bg-slate-700 text-cyan-400'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Mobile 375px Preview"
                  >
                    <Smartphone className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Send Live Test to Inbox */}
              <div className="flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                <input
                  type="email"
                  value={sampleRecipientEmail}
                  onChange={(e) => setSampleRecipientEmail(e.target.value)}
                  placeholder="Recipient test email"
                  className="px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-lg text-[11px] text-white outline-none w-40 focus:border-teal-400"
                />
                <button
                  type="button"
                  disabled={isSendingSample}
                  onClick={() => handleSendSampleEmail(false)}
                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title={`Dispatch test copy of this template (${previewRecipient === 'admin' ? 'Clinic Staff Alert' : 'Customer Copy'}) with attached PDF`}
                >
                  {isSendingSample ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Test {previewRecipient === 'admin' ? 'Staff Alert' : 'Customer Copy'}</span>
                </button>
                <button
                  type="button"
                  disabled={isSendingSample}
                  onClick={() => handleSendSampleEmail(true)}
                  className="px-2.5 py-1 bg-[#147A7A] hover:bg-[#106262] text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50 shadow-2xs"
                  title="Dispatch both Customer Copy and Clinic Staff Alert with attached PDF"
                >
                  {isSendingSample ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>Dispatch Both (Customer &amp; Us)</span>
                </button>
              </div>
            </div>

            {sampleResult && (<div
                className={`p-3 rounded-xl text-xs flex items-center justify-between gap-2 animate-fade-in ${
                  sampleResult.success
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  {sampleResult.success ? (<CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />) : (<AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />)}
                  <span>{sampleResult.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSampleResult(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>)}

            {/* Email Canvas Environment */}
            <div className="bg-slate-100 p-4 sm:p-8 rounded-3xl border border-slate-200 flex justify-center overflow-x-auto min-h-[700px]">
              <div
                style={{
                  width: previewDevice === 'mobile' ? '375px' : '640px',
                  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                }}
                className="bg-white rounded-xl border border-slate-200 p-6 sm:p-8 shadow-md text-slate-800 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* 1. Header with Logo & Brand Details */}
                  <div className="border-b border-slate-200 pb-4 mb-5 text-center">
                    <img
                      src={logoHeaderImg}
                      alt={emailConfig.clinicName}
                      className="max-h-12 w-auto mx-auto mb-2 object-contain"
                    />
                    <div className="text-slate-900 font-extrabold text-base tracking-tight">
                      {emailConfig.clinicName}
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {emailConfig.address} &bull; Phone: {emailConfig.phone}
                    </div>
                  </div>

                  {/* 2. Main Email Content */}
                  <div>
                    {previewRecipient === 'receiver'
                      ? activeTemplate.renderReceiverBody()
                      : activeTemplate.renderAdminBody()}
                  </div>
                </div>

                {/* 3. Footer with Confidentiality & ABN */}
                <div className="border-t border-slate-200 mt-7 pt-4 text-center text-slate-500 text-[11px] leading-relaxed">
                  <div className="font-bold text-slate-700">
                    {emailConfig.clinicName} &bull; ABN: {emailConfig.abn}
                  </div>
                  <div className="mt-1 text-slate-400">
                    {emailConfig.footerText}
                  </div>
                  <div className="mt-2 text-slate-400">
                    {emailConfig.website} &bull; {emailConfig.email}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>);
}

export default AdminEmails;
