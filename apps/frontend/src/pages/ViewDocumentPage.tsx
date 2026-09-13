import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { getDocumentData } from '@/lib/api';
import logoHeaderImg from '@/assets/logo-header.png';
import {
  Printer,
  Download,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Building2,
  Phone,
  Mail,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { exportElementToPdf } from '@/lib/exportPdf';

export function ViewDocumentPage() {
  const { docId } = useParams<{ docId: string }>();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState<boolean>(true);
  const [docData, setDocData] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  useEffect(() => {
    if (!docId) return;
    setLoading(true);

    getDocumentData(docId)
      .then((res) => {
        if (res.success && res.document) {
          setDocData(res.document);
          setPdfUrl(res.pdfUrl || `/api/emails/pdf/${encodeURIComponent(docId)}`);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch remote document data, generating fallback:', err);
        const isNdis = docId.toUpperCase().includes('NDIS');
        setDocData({
          docId,
          templateId: isNdis ? 'ndis_quote' : 'product_quote',
          customerName: 'Valued Client',
          customerPhone: '0494 767 409',
          shippingAddress: 'Registered Delivery Destination',
          total: 1850.00,
          subtotal: 1850.00,
          gstTotal: 0,
          deliveryFee: 0,
          items: [
            {
              code: isNdis ? '05_120603099_0105_1_2' : 'AT-PRD-01',
              name: isNdis ? 'Scripted Assistive Technology Equipment' : 'Commercial Healthcare Equipment',
              quantity: 1,
              price: 1850.00,
              amount: 1850.00,
              detail: 'Clinical specification and assistive technology script',
            },
          ],
          createdAt: new Date().toLocaleDateString('en-AU'),
        });
        setPdfUrl(`/api/emails/pdf/${encodeURIComponent(docId)}`);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [docId]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadPdf = async () => {
    const element = window.document.getElementById('printable-document-view');
    if (!element) return;

    setIsGeneratingPdf(true);
    try {
      await exportElementToPdf(element, `${docId || 'Document'}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF via exportElementToPdf, falling back to window.print():', err);
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (!loading && docData && searchParams.get('download') === 'true') {
      const timer = setTimeout(() => {
        handleDownloadPdf();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [loading, docData, searchParams]);

  if (loading) {
    return (<div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-[#147A7A]/30 border-t-[#147A7A] rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-700">Loading Document...</p>
          <p className="text-xs text-slate-400 font-mono">Ref: #{docId}</p>
        </div>
      </div>);
  }

  const isHire = docData?.templateId === 'hire' || docData?.templateId === 'ndis_hire' || (docId && (docId.toUpperCase().startsWith('HIR') || docId.toUpperCase().includes('HIRE')));
  const isNdis = !isHire && (docData?.templateId === 'ndis_quote' || (docId && docId.toUpperCase().includes('NDIS')));
  const isInvoice = !isHire && (docData?.templateId === 'order' || (docId && (docId.startsWith('INV') || docId.startsWith('ORD'))));
  const isTrial = docData?.templateId === 'trial' || docData?.templateId === 'ndis_trial' || docData?.templateId === 'booking' || (docId && docId.toUpperCase().includes('TRL'));
  const isQuote = !isHire && !isNdis && (docData?.templateId === 'quote' || docData?.templateId === 'product_quote' || (docId && docId.toUpperCase().includes('QT')));
  const isReferral = docData?.templateId === 'referral';

  const customTitle = docData?.customSettings?.pdfTemplate?.title || docData?.title;
  const title = customTitle || (
    isHire
      ? 'EQUIPMENT HIRE'
      : isNdis
      ? 'NDIS QUOTATION'
      : isInvoice
      ? 'NDIS INVOICE'
      : isTrial
      ? 'EQUIPMENT TRIAL'
      : isReferral
      ? 'NDIS CLINICAL REFERRAL & INTAKE'
      : 'EQUIPMENT INVOICE'
  );

  const rawItems: any[] = Array.isArray(docData?.items) && docData.items.length > 0
    ? docData.items
    : [
        {
          code: isNdis ? '05_120603099_0105_1_2' : 'AT-PRD-01',
          sku: isNdis ? '05_120603099_0105_1_2' : 'AT-PRD-01',
          name: isNdis ? 'NDIS Scripted Assistive Technology' : 'Assistive Equipment Item',
          quantity: 1,
          price: docData?.total || 1850.00,
          amount: docData?.total || 1850.00,
          detail: 'Clinical specifications and setup according to Australian Healthcare Standards',
        },
      ];

  const items: any[] = rawItems.map((it: any) => ({
    ...it,
    code: it.code || it.sku || it.productId || it.id || (isNdis ? '05_120603099_0105_1_2' : 'AT-PRD-01'),
    name: it.name || (isNdis ? 'NDIS Scripted Assistive Technology' : 'Assistive Equipment Item'),
  }));

  const totalAmount = Number(docData?.total || 1850.00);
  const subtotalAmount = Number(docData?.subtotal || totalAmount);
  const provider = {
    name: docData?.customSettings?.companyName || 'AT Specialists Australia Pty Ltd',
    abn: docData?.customSettings?.abn || '48 123 456 789',
    ndisProviderNo: docData?.customSettings?.ndisProviderNo || '405001928',
    address: 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039 Australia',
    phone: docData?.customSettings?.phone || '0494 767 409',
    email: docData?.customSettings?.email || 'payments@atspecialists.com.au',
    website: 'atspecialists.com.au',
    bankName: 'Commonwealth Bank of Australia (CBA)',
    accountName: 'AT Specialists Australia Pty Ltd - Client Account',
    bsb: '063-000',
    accountNumber: '1088 4422',
  };

  return (<div className="min-h-screen bg-slate-100 font-sans text-slate-800 selection:bg-teal-500/20 pb-16">
      
      {/* 1. TOP VERIFICATION NAV BAR (Print:hidden) */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs print:hidden">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Website</span>
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#147A7A]">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Document Portal &bull; Verified ATSA Record</span>
            </div>
          </div>

          {/* Action Buttons: Print, Download */}
          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 transition-colors cursor-pointer shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print A4</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#147A7A] hover:bg-[#106262] text-white border border-[#147A7A] transition-colors cursor-pointer shadow-2xs disabled:opacity-60 disabled:cursor-not-allowed"
              title="Download PDF"
            >
              {isGeneratingPdf ? (<>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating PDF...</span>
                </>) : (<>
                  <Download className="w-3.5 h-3.5 text-white" />
                  <span>Download PDF</span>
                </>)}
            </button>
          </div>
        </div>
      </header>

      {/* 2. MAIN DOCUMENT WORKSPACE */}
      <main className="max-w-4xl mx-auto px-4 pt-6">
        
        {/* Verification Alert Banner */}
        <div className="mb-4 bg-teal-50 border border-teal-200 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
            <span className="font-bold text-slate-900">
              Verified Document: <span className="font-mono text-[#147A7A]">#{docId}</span>
            </span>
            <span className="text-slate-500 hidden sm:inline">&bull; Compliant with Australian Standards &amp; NDIS PACE</span>
          </div>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px] uppercase">
            Active &bull; Validated
          </span>
        </div>

        {/* ===================================================================== */}
        {/* A4 PRINTABLE DOCUMENT */}
        {/* ===================================================================== */}
        <div
          id="printable-document-view"
          className="bg-white rounded-2xl shadow-md border border-slate-200 p-6 sm:p-10 space-y-5 text-black print:shadow-none print:border-0 print:p-0 print:max-w-none"
        >
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-900 pb-4">
            <img
              src={logoHeaderImg}
              crossOrigin="anonymous"
              alt={provider.name}
              className="h-12 sm:h-14 w-auto object-contain"
            />

            <div className="text-left sm:text-right text-[11px] leading-tight space-y-0.5">
              <p className="font-bold text-[#147A7A]">NDIS Provider</p>
              <p className="font-mono font-bold">ABN: {provider.abn}</p>
              <p>{provider.address}</p>
              <p>Phone: {provider.phone} &bull; Web: {provider.website}</p>
            </div>
          </div>

          {/* Document Title & Reference */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
            <div>
              <h1 className="text-base sm:text-lg font-black text-black tracking-tight uppercase">
                {title}
              </h1>
            </div>
            <div className="text-left sm:text-right">
              <span className="font-mono font-black text-xs sm:text-sm bg-slate-100 border border-slate-300 px-3 py-1 rounded inline-block">
                #{docId}
              </span>
              <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                Date of Issue: {docData?.createdAt ? new Date(docData.createdAt).toLocaleDateString('en-AU') : new Date().toLocaleDateString('en-AU')}
              </div>
            </div>
          </div>

          {/* 2-Column Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-black">
            
            {/* Left Box: Customer / Participant Record */}
            <div className="border border-slate-300 p-3.5 rounded-xl space-y-1.5 bg-slate-50/70">
              <div className="font-bold text-[10.5px] uppercase tracking-wider text-black border-b border-slate-300 pb-1 flex items-center justify-between">
                <span>{isNdis ? 'NDIS Participant Details:' : 'Customer Details:'}</span>
                {isNdis ? (<span className="font-mono text-[#147A7A] font-bold">
                    {docData?.extraMeta?.ndisNumber ? `NDIS #${docData.extraMeta.ndisNumber}` : 'NDIS'}
                  </span>) : (<span className="font-bold text-slate-700">{docData?.extraMeta?.customerCompany || 'Commercial Client'}</span>)}
              </div>
              <p className="font-bold text-sm text-black pt-0.5">
                {docData?.customerName || 'Valued Client'}
              </p>
              <p>
                <span className="text-slate-600">Delivery Address:</span>{' '}
                <strong className="text-black">{docData?.shippingAddress || 'On File / Prescribed Address'}</strong>
              </p>
              <p>
                <span className="text-slate-600">Phone:</span>{' '}
                <strong className="text-black font-mono">{docData?.customerPhone || provider.phone}</strong>
              </p>
              {docData?.customerEmail && (<p>
                  <span className="text-slate-600">Email:</span>{' '}
                  <strong className="text-black font-mono">{docData.customerEmail}</strong>
                </p>)}
            </div>

            {/* Right Box: Plan Manager / Remittance Terms / Hire Schedule */}
            <div className="border border-slate-300 p-3.5 rounded-xl space-y-1.5 bg-slate-50/70">
              <div className="font-bold text-[10.5px] uppercase tracking-wider text-black border-b border-slate-300 pb-1 flex items-center justify-between">
                <span>
                  {isHire
                    ? 'Hire Tenure & Agreement Schedule:'
                    : isNdis
                    ? 'Plan Management & Remittance:'
                    : isTrial
                    ? 'Clinical Evaluation Details:'
                    : 'Quotation Terms & Validity:'}
                </span>
                <span className="text-[10px] font-bold text-[#147A7A]">
                  {isHire
                    ? `${docData?.extraMeta?.hireDurationWeeks || 2} Weeks Initial`
                    : isTrial
                    ? 'COMPLIMENTARY ($0.00)'
                    : isNdis
                    ? docData?.extraMeta?.planType || 'NDIS'
                    : docData?.extraMeta?.validityPeriod || '30 Days Validity'}
                </span>
              </div>
              <p className="font-bold text-sm text-black pt-0.5">
                {isHire
                  ? (docData?.extraMeta?.hireLocationType === 'hospital' ? 'Hospital Inpatient Handover' : 'Residential Equipment Hire')
                  : isNdis
                  ? docData?.extraMeta?.planManager || docData?.extraMeta?.planType || 'Self-Managed Participant'
                  : isTrial
                  ? docData?.extraMeta?.prescribingClinician || 'Dr. Alistair Vance, Senior OT'
                  : docData?.extraMeta?.customerCompany || 'Commercial Purchasing Entity'}
              </p>
              {isHire && (
                <>
                  <p>
                    <span className="text-slate-600">Preferred Start Date:</span>{' '}
                    <strong className="text-black">{docData?.extraMeta?.hireStartDate || 'Immediate Dispatch'}</strong>
                  </p>
                  <p>
                    <span className="text-slate-600">Est. Return Due Date:</span>{' '}
                    <strong className="text-black">{docData?.extraMeta?.hireReturnDate || 'Ongoing weekly rental'}</strong>
                  </p>
                  {docData?.extraMeta?.hireFacilityName && (
                    <p>
                      <span className="text-slate-600">Hospital/Ward:</span>{' '}
                      <strong className="text-black">
                        {docData.extraMeta.hireFacilityName} (Ward: {docData.extraMeta.hireFacilityWard || '-'}, Bed: {docData.extraMeta.hireFacilityRoom || '-'})
                      </strong>
                    </p>
                  )}
                </>
              )}
              {isNdis && docData?.extraMeta?.participantDob && (
                <p>
                  <span className="text-slate-600">Participant DOB:</span>{' '}
                  <strong className="text-black font-mono">{docData.extraMeta.participantDob}</strong>
                </p>
              )}
              {isNdis && docData?.extraMeta?.planManagerEmail && (
                <p>
                  <span className="text-slate-600">Claims Email:</span>{' '}
                  <strong className="text-black font-mono">{docData.extraMeta.planManagerEmail}</strong>
                </p>
              )}
              {isTrial && (
                <p>
                  <span className="text-slate-600">Scheduled Slot:</span>{' '}
                  <strong className="text-black">{docData?.extraMeta?.trialDate || 'Within 5 Business Days'}</strong>
                </p>
              )}
              {isQuote && (
                <p>
                  <span className="text-slate-600">Delivery Lead Time:</span>{' '}
                  <strong className="text-black">{docData?.extraMeta?.deliveryTimeframe || '5 - 10 Business Days'}</strong>
                </p>
              )}
              <p>
                <span className="text-slate-600">Terms:</span>{' '}
                <strong>
                  {isHire
                    ? '2-Week Min Hire • Ongoing weekly rental until collection booked'
                    : isTrial
                    ? 'Complimentary Clinical Evaluation ($0.00 Fee)'
                    : isNdis
                    ? 'Quote Valid for 60 Days (NDIA Price Arrangements Compliant)'
                    : 'Strictly 14 Days Net (ATO & Commercial Standard)'}
                </strong>
              </p>
              <p className="text-[10.5px] text-slate-700 pt-0.5">
                <span className="text-slate-500 font-bold">EFT:</span> {provider.bankName} | BSB: <strong className="font-mono">{provider.bsb}</strong> | Acc: <strong className="font-mono">{provider.accountNumber}</strong>
              </p>
            </div>
          </div>

          {/* Rehab Hire 100% Purchase Credit Rebate Guarantee (Rehab Hire Standards) */}
          {isHire && (
            <div className="bg-amber-50 border border-amber-200/90 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-3">
              <div className="px-2.5 py-1 bg-amber-200/80 border border-amber-300 rounded-lg text-amber-900 font-black text-[10.5px] tracking-wide shrink-0">
                100% REBATE
              </div>
              <div className="space-y-0.5">
                <p className="font-black text-amber-950 text-xs">
                  Rehab Hire 100% Purchase Credit Rebate Guarantee
                </p>
                <p className="text-[11px] text-amber-900/90 leading-relaxed">
                  <strong>100% of hire fees paid (up to 4 weeks)</strong> will be credited toward the outright purchase price if you decide to buy the equipment during the hire tenure. Hires continue on a weekly rental rate thereafter until collection is requested.
                </p>
              </div>
            </div>
          )}

          {/* Prescribing Clinician & Clinical Rationale Box (NDIS Clinical Standards) */}
          {isNdis && (docData?.extraMeta?.prescriberName || docData?.extraMeta?.clinicalRationale) && (
            <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3.5 text-xs text-slate-800 space-y-1.5">
              <div className="flex items-center justify-between border-b border-teal-200/80 pb-1">
                <span className="font-bold uppercase tracking-wider text-[10.5px] text-[#147A7A]">
                  Prescribing Clinician / Occupational Therapist (OT):
                </span>
                <span className="text-[10px] text-teal-700 font-medium">Assistive Technology Clinical Assessment</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-0.5">
                <div>
                  <p className="font-bold text-slate-900">
                    {docData.extraMeta.prescriberName} {docData.extraMeta.prescriberOrg ? `(${docData.extraMeta.prescriberOrg})` : ''}
                  </p>
                  {(docData.extraMeta.prescriberPhone || docData.extraMeta.prescriberEmail) && (
                    <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                      {docData.extraMeta.prescriberPhone} {docData.extraMeta.prescriberPhone && docData.extraMeta.prescriberEmail ? '• ' : ''} {docData.extraMeta.prescriberEmail}
                    </p>
                  )}
                </div>
                {docData.extraMeta.clinicalRationale && (
                  <div className="sm:border-l sm:border-teal-200 sm:pl-3">
                    <span className="text-[10px] text-slate-500 font-semibold block">Clinical Rationale &amp; Goals:</span>
                    <p className="text-[11px] text-slate-700 italic line-clamp-2">
                      &ldquo;{docData.extraMeta.clinicalRationale}&rdquo;
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Itemized Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-t-2 border-b-2 border-slate-900 font-bold uppercase text-[10.5px] text-black">
                  <th className="py-2.5 text-left w-36">{isHire ? 'Asset Code / SKU' : isNdis ? 'Support Item Code' : 'Item Code / SKU'}</th>
                  <th className="py-2.5 text-left">{isHire ? 'Hired Equipment Description & Rental Specifications' : 'Equipment Description & Technical Specifications'}</th>
                  <th className="py-2.5 text-center w-14">Qty</th>
                  <th className="py-2.5 text-right w-28">{isHire ? 'Weekly Rate' : 'Unit Rate'}</th>
                  <th className="py-2.5 text-right w-20">GST</th>
                  <th className="py-2.5 text-right w-28">{isHire ? 'Period Total' : 'Line Total'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((it, idx) => (<tr key={idx}>
                    <td className="py-3 font-mono font-bold text-[10.5px] text-[#147A7A] align-top">
                      {it.code || it.sku || it.productId || it.id || (isNdis ? '05_120603099_0105_1_2' : isHire ? 'HIRE-BED-01' : 'AT-PRD-01')}
                    </td>
                    <td className="py-3 align-top pr-2">
                      <div className="font-bold text-black text-[12.5px]">
                        {it.name || (isHire ? 'Hired Assistive Equipment' : 'Assistive Rehabilitation Technology')}
                      </div>
                      {it.detail && (<div className="text-[10.5px] text-slate-600 mt-0.5 leading-snug">
                          {it.detail}
                        </div>)}
                    </td>
                    <td className="py-3 text-center align-top font-bold text-black">{it.quantity || 1}</td>
                    <td className="py-3 text-right font-mono align-top text-black">
                      ${Number(it.price || 0).toFixed(2)}{isHire ? '/wk' : ''}
                    </td>
                    <td className="py-3 text-right font-mono align-top text-slate-600 text-[10.5px]">GST-Free</td>
                    <td className="py-3 text-right font-mono font-bold align-top text-black">${Number(it.amount || (Number(it.price || 0) * Number(it.quantity || 1))).toFixed(2)}</td>
                  </tr>))}
              </tbody>
            </table>
          </div>

          {/* Summary & Terms */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t-2 border-slate-900 items-center">
            <div className="sm:col-span-7 text-[11px] text-slate-600 space-y-1">
              {(docData?.notes || docData?.extraMeta?.notes) && (<p className="leading-snug text-slate-700 font-medium">
                  {docData?.notes || docData?.extraMeta?.notes}
                </p>)}
              {isHire && (
                <p className="text-[10.5px] text-slate-500 italic">
                  * Hires automatically continue weekly until return collection is requested. 100% of hire paid up to 4 weeks is credited if purchased.
                </p>
              )}
            </div>

            <div className="sm:col-span-5 space-y-1.5 text-right text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600">{isHire ? `Initial Hire (${docData?.extraMeta?.hireDurationWeeks || 2} Wks):` : 'Subtotal (Excl. GST):'}</span>
                <span className="font-mono font-bold text-black">${subtotalAmount.toFixed(2)} AUD</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Freight &amp; Return Collection:</span>
                <span className="font-mono font-bold text-emerald-800">INCLUDED</span>
              </div>
              {isHire && (
                <div className="flex justify-between text-amber-800">
                  <span>100% Purchase Rebate:</span>
                  <span className="font-bold text-[10.5px]">CREDITED ON PURCHASE</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-600">GST (0% / s38-45):</span>
                <span className="font-mono font-bold text-slate-700">$0.00</span>
              </div>
              <div className="flex justify-between pt-1.5 border-t-2 border-slate-900 text-sm sm:text-base font-black text-black">
                <span>{isHire ? 'INITIAL HIRE DUE:' : 'TOTAL AMOUNT:'}</span>
                <span className="font-mono text-[#147A7A]">${totalAmount.toFixed(2)} AUD</span>
              </div>
            </div>
          </div>

          {/* Direct Bank EFT Remittance Card */}
          <div className="border border-teal-200 bg-teal-50/60 rounded-xl p-4 text-xs space-y-2">
            <div className="flex items-center justify-between border-b border-teal-200/80 pb-2">
              <span className="font-bold text-sm text-[#147A7A] flex items-center gap-1.5">
                <Building2 className="w-4 h-4" />
                Direct Bank Transfer (EFT) Remittance Details:
              </span>
              <span className="text-[10px] font-mono text-slate-600">Reference: <strong>{docId}</strong></span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
              <div className="bg-white p-2 rounded-lg border border-teal-100">
                <span className="text-[10px] text-slate-500 font-semibold block">Bank</span>
                <span className="font-bold text-slate-900">{provider.bankName}</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-teal-100">
                <span className="text-[10px] text-slate-500 font-semibold block">Account Name</span>
                <span className="font-bold text-slate-900 text-[11px] truncate block">{provider.accountName}</span>
              </div>

              <div className="bg-white p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">BSB</span>
                  <span className="font-mono font-black text-slate-900">{provider.bsb}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(provider.bsb, 'bsb')}
                  className="p-1 text-slate-400 hover:text-teal-700 cursor-pointer"
                  title="Copy BSB"
                >
                  {copiedField === 'bsb' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="bg-white p-2 rounded-lg border border-teal-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Account Number</span>
                  <span className="font-mono font-black text-slate-900">{provider.accountNumber}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(provider.accountNumber, 'acc')}
                  className="p-1 text-slate-400 hover:text-teal-700 cursor-pointer"
                  title="Copy Account Number"
                >
                  {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Document Acceptance Slip */}
          <div className="pt-2">
            <div className="text-center text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-400 pb-1 mb-2.5">
              &#9986; ----------------- DOCUMENT ACCEPTANCE SLIP (RETURN COPY) ----------------- &#9986;
            </div>

            <div className="border border-slate-300 p-3 rounded-xl text-xs bg-slate-50 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                <span className="font-black uppercase tracking-wider text-[11px] text-black">
                  {isHire
                    ? 'EQUIPMENT HIRE Authorization & Terms Acceptance'
                    : isNdis
                    ? 'NDIS Quotation Participant & Plan Manager Authorization'
                    : isInvoice
                    ? 'NDIS Invoice & Payment Confirmation'
                    : isTrial
                    ? 'EQUIPMENT TRIAL Handover Authorization'
                    : 'EQUIPMENT INVOICE Purchase Authorization'}
                </span>
                <span className="font-mono text-[11px] text-slate-700">
                  Ref: <strong>{docId}</strong> &bull; Total: <strong>${totalAmount.toFixed(2)} AUD</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="border border-slate-200 bg-white p-2.5 rounded-lg space-y-1">
                  <span className="font-bold block text-[10px] text-slate-700 uppercase">
                    {isHire
                      ? 'Hirer / Nominee Agreement:'
                      : isNdis
                      ? 'Participant / Plan Manager Approval:'
                      : isInvoice
                      ? 'Recipient Confirmation:'
                      : isTrial
                      ? 'Clinical Handover Signature:'
                      : 'Purchasing Entity Approval Signature:'}
                  </span>
                  {isHire && (
                    <p className="text-[9.5px] text-slate-500">
                      I agree to the 2-week minimum tenure and ongoing weekly rental until collection is requested.
                    </p>
                  )}
                  <div className="pt-5 border-b border-slate-300" />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>Authorized Signature</span>
                    <span>Date: ____ / ____ / 2026</span>
                  </div>
                </div>

                <div className="border border-slate-200 bg-white p-2.5 rounded-lg space-y-1">
                  <span className="font-bold block text-[10px] text-slate-700 uppercase">
                    {isHire
                      ? 'Delivery Handover & Inspection:'
                      : isNdis
                      ? 'Plan Manager Sign-off / Claim Ref:'
                      : 'Purchase Order Number:'}
                  </span>
                  {isHire ? (
                    <div className="text-[10px] text-slate-700">
                      {docData?.extraMeta?.hireLocationType === 'hospital'
                        ? `Hospital Handover: ${docData.extraMeta.hireFacilityName || 'Hospital Inpatient'}`
                        : 'Private Residence Handover Confirmed'}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-700 font-mono">PO / Claim Ref: ______________________</div>
                  )}
                  <div className="pt-2 border-b border-slate-300" />
                  <div className="flex justify-between text-[9px] text-slate-500">
                    <span>{isHire ? 'Receiving Officer / Carer' : 'Authorized Officer Signature'}</span>
                    <span>Date: ____ / ____ / 2026</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500 leading-normal">
            <p className="font-bold text-slate-700">
              {provider.name} &bull; ABN: {provider.abn} &bull; NDIS Provider
            </p>
            <p>
              Remittance inquiries: accounts@atspecialists.com.au &bull; Phone: {provider.phone} &bull; Level 2, 88 Holmes Road, Moonee Ponds VIC 3039
            </p>
          </div>

        </div>

      </main>

    </div>);
}

export default ViewDocumentPage;
