import React from 'react';
import logoHeaderImg from '@/assets/logo-header.png';
import { FileText, Phone, ExternalLink } from 'lucide-react';

export type EmailTemplateType =
  | 'ndis_quote'
  | 'order'
  | 'hire'
  | 'trial'
  | 'quote'
  | 'contact'
  | 'product_quote'
  | 'order_invoice'
  | 'ndis_invoice'
  | 'ndis_hire'
  | 'ndis_trial';

export interface EmailPreviewItem {
  id?: string;
  code?: string;
  sku?: string;
  productId?: string;
  name: string;
  detail?: string;
  quantity: number;
  price?: number;
  amount?: number;
}

export interface ExactEmailPreviewProps {
  templateId: string;
  recipientType?: 'customer' | 'admin';
  previewDevice?: 'desktop' | 'mobile';
  docId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  items: EmailPreviewItem[];
  subtotal?: number;
  deliveryFee?: number;
  gstTotal?: number;
  total?: number;
  notes?: string;
  extraMeta?: {
    generatePdf?: boolean;
    subject?: string;
    responseMessage?: string;
    originalInquiry?: string;
    ndisNumber?: string;
    planType?: string;
    planManager?: string;
    prescribingClinician?: string;
    clinicianAhpra?: string;
    assessmentRef?: string;
    validityPeriod?: string;
    deliveryTimeframe?: string;
    hireDuration?: string;
    depositBond?: string;
    trialDate?: string;
    trialFee?: string;
    paymentStatus?: string;
    fulfillment?: string;
    [key: string]: any;
  };
  customSettings?: {
    companyName?: string;
    abn?: string;
    ndisProviderNo?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCountry?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
    bankTitle?: string;
    bankName?: string;
    accountName?: string;
    bsb?: string;
    accountNumber?: string;
    footerText?: string;
    mailTemplate?: any;
    mailTemplates?: Record<string, any>;
    [key: string]: any;
  };
  showEnvelope?: boolean;
  onViewDocumentClick?: () => void;
  isTemplateFormat?: boolean;
}

export function ExactEmailPreview({
  templateId,
  recipientType = 'customer',
  previewDevice = 'desktop',
  docId = 'SAMPLE-DOC',
  customerName,
  customerEmail,
  customerPhone,
  shippingAddress,
  items = [],
  subtotal,
  deliveryFee = 0,
  gstTotal = 0,
  total,
  notes,
  extraMeta = {},
  customSettings = {},
  showEnvelope = true,
  onViewDocumentClick,
  isTemplateFormat = false,
}: ExactEmailPreviewProps) {
  const companyName = customSettings.companyName || 'AT Specialists Australia Pty Ltd';
  const abn = customSettings.abn || '48 123 456 789';
  const address =
    customSettings.address ||
    (customSettings.addressLine1
      ? `${customSettings.addressLine1}, ${customSettings.addressLine2 || ''} ${customSettings.addressCountry || ''}`.trim()
      : 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039');
  const phone = customSettings.phone || '0494 767 409';
  const email = customSettings.email || 'payments@atspecialists.com.au';
  const website = customSettings.website || 'atspecialists.com.au';
  const bankTitle = customSettings.bankTitle || 'Direct Bank Transfer (EFT) Details:';
  const bankName = customSettings.bankName || 'Commonwealth Bank of Australia (CBA)';
  const accountName = customSettings.accountName || 'AT Specialists Australia Pty Ltd - Client Account';
  const bsb = customSettings.bsb || '063-000';
  const accountNumber = customSettings.accountNumber || '1088 4422';
  const footerText =
    customSettings.footerText ||
    'Confidentiality Notice: This medical and assistive technology communication is confidential and intended solely for the recipient. If received in error, please notify sender immediately.';

  const isReceiver = recipientType === 'customer';
  const tId = (templateId || 'order').toLowerCase();
  const firstName = (customerName || 'Valued Client').split(' ')[0] || customerName;

  // Financial calculations matching backend
  const computedItemsSum = items.reduce((acc, it) =>
      acc +
      Number(it.amount !== undefined ? it.amount : (Number(it.price || 0) * Number(it.quantity || 1))),
    0);

  const rawSubtotal =
    subtotal !== undefined && subtotal !== null && !isNaN(Number(subtotal)) && Number(subtotal) > 0
      ? Number(subtotal)
      : computedItemsSum > 0
      ? computedItemsSum
      : Number(total || 0);

  const rawDelivery = Number(deliveryFee || 0);
  const rawGst = Number(gstTotal || 0);

  const rawTotal =
    total !== undefined && total !== null && !isNaN(Number(total)) && Number(total) > 0
      ? Number(total)
      : rawSubtotal + rawDelivery + rawGst;

  const formattedSubtotal = rawSubtotal.toFixed(2);
  const formattedDelivery = rawDelivery.toFixed(2);
  const formattedGst = rawGst.toFixed(2);
  const formattedTotal = rawTotal.toFixed(2);

  const viewDocumentUrl = `/view-document/${encodeURIComponent(docId)}`;

  // Determine Subject, Status Badge, Headline, Subtext
  // Determine Subject, Status Badge, Headline, Subtext
  let subject = '';
  let statusBadge = '';
  let headline = '';
  let subtext = '';

  if (isTemplateFormat) {
    if (tId === 'order' || tId === 'order_invoice' || tId === 'product_buy') {
      subject = `NDIS Invoice #{{document_id}} — ${companyName}`;
      statusBadge = '✓ NDIS INVOICE • REF #{{document_id}}';
      headline = 'Thank you for your order, {{customer_name}}';
      subtext = 'Your payment has been processed and your official NDIS Invoice is ready and viewable online below.';
    } else if (tId === 'quote' || tId === 'product_quote') {
      subject = `EQUIPMENT INVOICE #{{document_id}} — ${companyName}`;
      statusBadge = '📋 COMMERCIAL QUOTATION • REF #{{document_id}}';
      headline = 'Equipment Quotation for {{customer_name}}';
      subtext = 'Thank you for requesting an equipment quotation. Your itemized schedule and verified digital document link are provided below.';
    } else if (tId === 'ndis_quote') {
      subject = `NDIS Quotation #{{document_id}} — ${companyName}`;
      statusBadge = '✓ NDIS QUOTATION • REF #{{document_id}}';
      headline = 'Your NDIS Quotation is Ready, {{customer_name}}';
      subtext = 'Prepared according to NDIA Price Arrangements with line-item support codes and verified digital document link below.';
    } else if (tId === 'hire' || tId === 'ndis_hire') {
      subject = `EQUIPMENT HIRE Agreement #{{document_id}} — ${companyName}`;
      statusBadge = '✓ HIRE AGREEMENT CONFIRMED • REF #{{document_id}}';
      headline = 'Equipment Hire Agreement • {{customer_name}}';
      subtext = 'Your equipment rental booking has been scheduled for delivery. Full hire terms and schedule are viewable below.';
    } else {
      subject = `Clinical Advisory #{{document_id}} — ${companyName}`;
      statusBadge = '✓ CLINICAL ADVISORY • REF #{{document_id}}';
      headline = 'Specialist Clinical Advice & Suitability Matrix for {{customer_name}}';
      subtext = 'Our clinical occupational therapy team has reviewed your inquiry and prepared recommendations below.';
    }
  } else if (tId === 'order' || tId === 'order_invoice' || tId === 'product_buy') {
    subject = isReceiver
      ? `Order Confirmation & Tax Invoice #${docId} — ${companyName}`
      : `[New Order Alert] #${docId} — ${customerName} ($${formattedTotal} AUD)`;
    statusBadge = isReceiver
      ? `✓ ORDER CONFIRMED • INVOICE #${docId}`
      : `📦 NEW ORDER RECEIVED • PENDING DISPATCH #${docId}`;
    headline = isReceiver
      ? `Thank you for your order, ${firstName}!`
      : `New Order Placed by ${customerName}`;
    subtext = isReceiver
      ? 'We have received your assistive technology order. Your Tax Invoice is ready and viewable online below.'
      : `Order ${docId} has been submitted on the portal. Please verify payment and dispatch items.`;
  } else if (tId === 'quote' || tId === 'product_quote') {
    subject = isReceiver
      ? `Product Quotation #${docId} — ${companyName} (${customerName})`
      : `🔔 [New Product Quote Request] #${docId} from ${customerName} ($${formattedTotal} AUD)`;
    statusBadge = `📋 COMMERCIAL QUOTATION • VALID 30 DAYS • REF #${docId}`;
    headline = `Product & Equipment Quotation: ${customerName}`;
    subtext = `Thank you for requesting an equipment quotation from ${companyName}. Please find the itemized quotation breakdown and verified digital document link below.`;
  } else if (tId === 'ndis_quote') {
    subject = isReceiver
      ? `NDIS Quotation #${docId} — ${companyName} (${customerName})`
      : `🔔 [New NDIS Quote Request] #${docId} from ${customerName} ($${formattedTotal} AUD)`;
    statusBadge = isReceiver
      ? `✓ NDIS QUOTATION • REF #${docId}`
      : `📋 NDIS QUOTE SUBMITTED • REF #${docId}`;
    headline = isReceiver
      ? `NDIS Equipment Quotation for ${customerName}`
      : `New NDIS Quote Request: ${customerName}`;
    subtext = isReceiver
      ? 'Thank you for requesting an Assistive Technology quotation. Your verified digital document link and breakdown are provided below.'
      : `NDIS participant ${customerName} has submitted a quotation request. Review line items and forward to plan manager.`;
  } else if (tId === 'hire' || tId === 'ndis_hire') {
    subject = isReceiver
      ? `Equipment Hire Agreement & Schedule #${docId} — ${companyName}`
      : `[Hire Agreement Alert] #${docId} — ${customerName}`;
    statusBadge = isReceiver
      ? `✓ HIRE AGREEMENT CONFIRMED • REF #${docId}`
      : `🚚 NEW EQUIPMENT RENTAL SCHEDULED • REF #${docId}`;
    headline = isReceiver
      ? `Equipment Hire Agreement • ${customerName}`
      : `Rental Agreement Scheduled: ${customerName}`;
    subtext =
      'Your equipment rental has been scheduled for delivery. Full hire terms and weekly rental schedule are detailed below.';
  } else {
    subject = isReceiver
      ? `Response to your Inquiry — ${companyName}`
      : `[Inquiry Response Alert] ${customerName} — ${extraMeta.subject || 'Consultation Inquiry'}`;
    statusBadge = isReceiver
      ? `✓ INQUIRY RESPONSE • REF #${docId}`
      : `💬 CONSULTATION INQUIRY REPLY • REF #${docId}`;
    headline = isReceiver
      ? `Regarding your Inquiry, ${firstName}`
      : `Inquiry Response: ${customerName}`;
    subtext = isReceiver
      ? 'Thank you for contacting AT Specialists Australia. Our clinical equipment team has reviewed your inquiry and prepared this response below.'
      : `Inquiry response prepared for ${customerName} (${customerEmail || 'No Email'} | ${customerPhone || 'No Phone'}).`;
  }

  // Apply custom template overrides if present
  const customTmpl = (customSettings as any)?.mailTemplates?.[tId] || (customSettings as any)?.mailTemplate;
  const replaceTokens = (val?: string) => {
    if (!val) return '';
    if (isTemplateFormat) {
      // In master template format schema, keep dynamic placeholders visible
      return val
        .replace(/\{\{companyName\}\}/g, companyName)
        .replace(/\{\{company_name\}\}/g, companyName);
    }
    return val
      .replace(/\{\{docId\}\}/g, docId || '')
      .replace(/\{\{document_id\}\}/g, docId || '')
      .replace(/\{\{companyName\}\}/g, companyName)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{customerName\}\}/g, customerName || '')
      .replace(/\{\{customer_name\}\}/g, customerName || '')
      .replace(/\{\{firstName\}\}/g, firstName || '')
      .replace(/\{\{total\}\}/g, `$${formattedTotal} AUD`);
  };

  if ((isReceiver || isTemplateFormat) && customTmpl?.subject) {
    subject = replaceTokens(customTmpl.subject);
  } else if (extraMeta.subject) {
    subject = replaceTokens(extraMeta.subject);
  } else if (extraMeta.mailSubject) {
    subject = replaceTokens(extraMeta.mailSubject);
  }

  if (customTmpl?.badge) {
    statusBadge = replaceTokens(customTmpl.badge);
  } else if (extraMeta.badge) {
    statusBadge = replaceTokens(extraMeta.badge);
  }

  if (customTmpl?.headline) {
    headline = replaceTokens(customTmpl.headline);
  } else if (extraMeta.headline) {
    headline = replaceTokens(extraMeta.headline);
  }

  if (customTmpl?.subtext) {
    subtext = replaceTokens(customTmpl.subtext);
  } else if (extraMeta.subtext) {
    subtext = replaceTokens(extraMeta.subtext);
  }

  const showPdfActionCard = extraMeta.generatePdf !== false;

  const isMobile = previewDevice === 'mobile';

  return (<div className="space-y-3 font-sans">
      {/* Simulated Email Envelope Header */}
      {showEnvelope && (<div className="bg-slate-900 text-slate-200 rounded-xl p-3 text-xs space-y-1 font-mono shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1.5">
            <span className="text-[10px] font-sans font-bold uppercase tracking-wider text-teal-400">
              ✉️ {isTemplateFormat ? 'Master Customer Email Format (Automated Trigger)' : recipientType === 'customer' ? 'Customer Inbox View' : 'Internal Staff Alert View'}
            </span>
            <span className="text-[10px] text-slate-400 font-sans">
              Format: {previewDevice === 'mobile' ? 'Mobile (390px)' : 'Desktop (640px)'}
            </span>
          </div>
          <div>
            <strong className="text-slate-400">From:</strong> {companyName} &lt;{email}&gt;
          </div>
          <div>
            <strong className="text-slate-400">To:</strong>{' '}
            {isTemplateFormat
              ? '{{customer_email}} (Automated response to customer request)'
              : isReceiver
              ? customerEmail || 'customer@example.com'
              : 'admin@atspecialists.com.au'}
          </div>
          <div>
            <strong className="text-slate-400">Subject:</strong> {subject}
          </div>
        </div>)}

      {/* Production Email Outer Body */}
      <div className="bg-slate-100 p-3 sm:p-5 rounded-2xl border border-slate-200 overflow-x-auto flex justify-center">
        <div
          className={`w-full bg-white rounded-xl shadow-sm border border-slate-200 text-slate-800 transition-all ${
            isMobile ? 'max-w-[390px] p-4 text-xs' : 'max-w-[640px] p-6 text-sm'
          }`}
          style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
        >
          {/* Header */}
          <div className="text-center border-b-2 border-[#0F766E] pb-3.5 space-y-1">
            <img
              src={logoHeaderImg}
              alt={companyName}
              className="h-10 w-auto mx-auto object-contain mb-1.5"
            />
            <div className="font-black text-base uppercase tracking-tight text-slate-900">
              {companyName}
            </div>
            <div className="text-[11.5px] text-[#0F766E] font-bold">
              Assistive Technology &amp; Healthcare Specialists &bull; NDIS Provider
            </div>
            <div className="text-[11px] text-slate-500">
              {address} &bull; Phone: {phone} &bull; ABN: {abn}
            </div>
          </div>

          {/* Status Badge */}
          <div className="pt-4 pb-1 text-xs font-black uppercase text-[#0D9488] tracking-wide">
            {statusBadge}
          </div>

          {/* Headline & Subtext */}
          <div className="space-y-1 pb-4">
            <h1 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">{headline}</h1>
            <p className="text-xs text-slate-600 leading-relaxed">{subtext}</p>
          </div>

          {/* Personalized Message Body Content */}
          {(() => {
            let rawBody = customTmpl?.body || extraMeta.responseMessage || extraMeta.mailBody;
            if (!rawBody) {
              if (tId === 'ndis_quote') {
                rawBody = 'Dear {{customer_name}},\n\nPlease find enclosed your NDIS Quotation prepared by our clinical team. This quote includes itemized NDIA support codes suitable for plan management claim submission and capital funding allocation.\n\nTo view your complete itemized quotation, please use the verified digital document button below or open the attached official PDF.';
              } else if (tId === 'order' || tId === 'ndis_invoice' || tId === 'order_invoice') {
                rawBody = 'Dear {{customer_name}},\n\nThank you for choosing AT Specialists Australia. Your NDIS order has been confirmed. Our clinical dispatch team is preparing your assistive technology equipment for handover.\n\nYour itemized NDIS Invoice, compliance certifications, and receipt details are available in the attached PDF and online document viewer.';
              } else if (tId === 'hire' || tId === 'ndis_hire') {
                rawBody = 'Dear {{customer_name}},\n\nYour EQUIPMENT HIRE agreement has been scheduled. All equipment in our rental fleet undergoes clinical hospital-grade terminal sanitation and thorough safety inspection prior to dispatch.\n\nPlease review your hire agreement terms and handover schedule below.';
              } else if (tId === 'quote' || tId === 'product_quote') {
                rawBody = 'Dear {{customer_name}},\n\nPlease review your EQUIPMENT INVOICE. We have itemized specifications, freight delivery allowances, and clinical warranty terms for your review.\n\nTo proceed with purchase approval or if you require an amended invoice, please let us know.';
              } else {
                rawBody = 'Dear {{customer_name}},\n\nThank you for contacting AT Specialists Australia. Our clinical equipment team has reviewed your request. We have tailored assistive equipment options available to support your mobility and rehabilitation goals.\n\nPlease review your specialist advisory and consultation summary via the document viewer link below.';
              }
            }
            return (
              <div className="mb-4 bg-teal-50/50 border border-teal-200/80 rounded-xl p-3.5 sm:p-4 text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                <div className="text-[10px] font-black text-[#0F766E] uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <span>✉️ Message to Customer:</span>
                </div>
                <div className="text-slate-800 text-xs sm:text-sm leading-relaxed">{replaceTokens(rawBody)}</div>
              </div>
            );
          })()}

          {/* Click & Visit PDF Document Action Card */}
          {showPdfActionCard && (<div className="mb-5 bg-[#F0FDFA] border-1.5 border-[#0D9488] rounded-xl p-4 text-center space-y-2.5">
              <div className="text-[11px] font-black uppercase tracking-wider text-[#0F766E]">
                {tId === 'contact' ? '📄 Verified Clinical Advisory Document' : '📄 Verified Digital Document'}
              </div>
              <div className="text-sm sm:text-base font-extrabold text-slate-900">
                Document Reference: #{docId}
              </div>
              <p className="text-xs text-slate-600 max-w-md mx-auto leading-normal">
                {tId === 'contact'
                  ? 'Click below to review your clinical advisory recommendations & official printable document format.'
                  : 'Click below to open and review your itemized document & printable PDF directly in your browser.'}
              </p>
              <div className="pt-1">
                <a
                  href={viewDocumentUrl}
                  target={onViewDocumentClick ? '_self' : '_blank'}
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    if (onViewDocumentClick) {
                      e.preventDefault();
                      onViewDocumentClick();
                    }
                  }}
                  className="inline-block bg-[#147A7A] hover:bg-[#106262] text-white font-extrabold text-xs sm:text-sm px-6 py-2.5 rounded-lg shadow-sm transition-transform hover:scale-102 cursor-pointer"
                >
                  {customTmpl?.ctaText ||
                    extraMeta?.ctaText ||
                    (tId === 'contact'
                      ? '👉 Click & Visit: View Clinical Advisory Document →'
                      : tId === 'ndis_quote'
                      ? '👉 Click & Visit: View NDIS Quotation →'
                      : tId === 'order'
                      ? '👉 Click & Visit: View NDIS Tax Invoice →'
                      : tId === 'hire'
                      ? '👉 Click & Visit: View Equipment Hire Agreement →'
                      : '👉 Click & Visit: View Equipment Invoice →')}
                </a>
              </div>
              <div className="text-[11px] text-slate-500">
                Instant browser view &bull; No download required &bull; ATSA Record
              </div>
            </div>)}

          {/* Inquiry Reference (For contact/inquiry responses) */}
          {extraMeta.originalInquiry && (
            <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600">
              <strong className="text-slate-800 block mb-1">Regarding Your Website Inquiry:</strong>
              <span className="italic">&ldquo;{extraMeta.originalInquiry}&rdquo;</span>
            </div>
          )}

          {tId === 'contact' && (
            <div className="mb-4 bg-[#F0FDFA] border border-[#CCFBF1] rounded-lg p-3 text-xs text-[#0F766E] leading-relaxed">
              <strong>Need direct clinical advice or to speak with an OT?</strong><br />
              Contact our Specialist Advice Line on <strong>{phone}</strong> (Mon-Fri 8:30am - 5:30pm AEST) or reply directly to this email.
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 text-center space-y-1 text-[11px] text-slate-500">
            <div className="font-bold text-slate-700">
              {companyName} &bull; ABN: {abn} &bull; NDIS Provider
            </div>
            <div className="text-slate-400 text-[10px] leading-normal max-w-lg mx-auto">
              {customTmpl?.footerText || extraMeta?.footerText || footerText}
            </div>
            <div className="text-slate-400 text-[10px] pt-1">
              {website} &bull; {email} &bull; Phone: {phone}
            </div>
          </div>
        </div>
      </div>
    </div>);
}

export default ExactEmailPreview;
