import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import {
  dispatchTemplateEmail,
  getDispatchedDocuments,
  type DispatchedDocumentItem,
} from '@/lib/api';
import logoHeaderImg from '@/assets/logo-header.png';
import { ExactEmailPreview } from '@/components/admin/ExactEmailPreview';
import { proxyImageUrl, PLACEHOLDER_IMAGE } from '@/lib/imageProxy';
import {
  FileText,
  Mail,
  Send,
  Download,
  Printer,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  ShieldCheck,
  Search,
  User,
  Users,
  Building2,
  Settings,
  RotateCcw,
  Save,
  ExternalLink,
  Eye,
  FileCheck2,
  CreditCard,
  X,
  ChevronDown,
  Monitor,
  Smartphone,
  Copy,
  Check,
  Tag,
  DollarSign,
  Calendar,
  Sparkles,
  ShoppingBag,
  Clock,
  Truck,
  MessageSquare,
  RefreshCw,
  Filter,
  MoreVertical,
  Edit3,
  ArrowRight,
  Pencil,
  Package,
} from 'lucide-react';
import { exportElementToPdf } from '@/lib/exportPdf';

export type TemplateType = 'ndis_quote' | 'order' | 'quote' | 'hire' | 'contact';

export interface CustomInvoiceItem {
  id: string;
  code: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
  detail?: string;
  size?: string;
  color?: string;
  subProducts?: string[];
  productId?: string;
  availableSizes?: string[];
  availableColors?: { name: string; hex?: string }[];
  availableSubProducts?: { name: string; price?: number }[];
}

export const STANDARD_SIZES = [
  'King Single',
  'Long Double',
  'Long Single',
  'Queen',
] as const;

export const STANDARD_COLOURS = [
  { name: 'Charcoal / Black', hex: '#1e293b' },
  { name: 'Hospital White', hex: '#f8fafc' },
  { name: 'Classic Blue', hex: '#1d4ed8' },
  { name: 'Cream / Beige', hex: '#fef3c7' },
  { name: 'Warm Oak / Timber', hex: '#b45309' },
  { name: 'Slate Grey', hex: '#64748b' },
] as const;

export const STANDARD_SUB_PRODUCTS = [
  { name: 'Fold-Down Side Safety Rails (Pair)', price: 280.0 },
  { name: 'Pressure Care Foam/Air Mattress', price: 650.0 },
  { name: 'Timber Headboard & Footboard Panels', price: 320.0 },
  { name: 'Self-Help Repositioning Pole & Handle', price: 180.0 },
  { name: 'Waterproof Incontinence Fitted Cover', price: 85.0 },
  { name: 'Hospital-Grade Terminal Sanitization', price: 120.0 },
  { name: 'Delivery, Assembly & Setup Orientation', price: 150.0 },
];

export function isRealBedOrMattress(prod: any): boolean {
  if (!prod) return false;
  const name = (prod.name || '').toLowerCase();
  const nonBedKeywords = [
    'pillow',
    'sheet',
    'rail',
    'pole',
    'bracket',
    'strap',
    'pad',
    'protector',
    'table',
    'cradle',
    'wedge',
    'block',
    'lever',
    'cover',
    'bar',
    'pan',
    'hoist',
    'sling',
    'scale',
    'commode',
    'walker',
    'cushion',
    'case',
    'swatch',
  ];
  if (nonBedKeywords.some((w) => name.includes(w))) return false;

  return /\bbeds?\b/i.test(name) || /\bmattress(es)?\b/i.test(name);
}

export interface RelatedProductOptions {
  sizes: string[];
  colors: { name: string; hex?: string }[];
  subProducts: { name: string; price?: number }[];
  variants: any[];
  isBedOrMattress: boolean;
}

export function getRelatedProductOptions(prod: any): RelatedProductOptions {
  if (!prod) {
    return {
      sizes: [],
      colors: [],
      subProducts: [],
      variants: [],
      isBedOrMattress: false,
    };
  }

  const isBed = isRealBedOrMattress(prod);

  // 1. SIZES: Extract ONLY real sizes that actually exist on this product in the catalog
  let sizes: string[] = [];
  const sizeAttr = (prod.attributes || []).find(
    (a: any) =>
      a.slug === 'size' ||
      a.name?.toLowerCase() === 'size' ||
      a.name?.toLowerCase() === 'sizing' ||
      a.name?.toLowerCase() === 'bed sizing'
  );
  if (sizeAttr && Array.isArray(sizeAttr.values)) {
    sizes = sizeAttr.values.map((v: any) => (typeof v === 'object' ? (v.label || v.value) : String(v)));
  } else if (Array.isArray(prod.variants) && prod.variants.length > 0) {
    const sSet = new Set<string>();
    prod.variants.forEach((v: any) => {
      const s = v.attributes?.size || v.attributes?.Size || v.attributes?.sizing;
      if (s) {
        const formatted = s
          .split('-')
          .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
        sSet.add(formatted);
      }
    });
    sizes = Array.from(sSet);
  }

  // 2. COLOURS: Extract ONLY real colours that actually exist on this product in the catalog
  let colors: { name: string; hex?: string }[] = [];
  const colorAttr = (prod.attributes || []).find(
    (a: any) =>
      a.slug === 'colour' ||
      a.slug === 'color' ||
      a.name?.toLowerCase() === 'colour' ||
      a.name?.toLowerCase() === 'color' ||
      a.type === 'color'
  );
  if (colorAttr && Array.isArray(colorAttr.values)) {
    colors = colorAttr.values.map((v: any) => ({
      name: typeof v === 'object' ? (v.label || v.value) : String(v),
      hex: v.colorHex || v.hex,
    }));
  } else if (Array.isArray(prod.variants) && prod.variants.length > 0) {
    const cMap = new Map<string, string | undefined>();
    prod.variants.forEach((v: any) => {
      const c = v.attributes?.colour || v.attributes?.color || v.attributes?.Colour;
      if (c && !cMap.has(c)) {
        const formatted = c.charAt(0).toUpperCase() + c.slice(1);
        cMap.set(formatted, v.colorHex || v.hex);
      }
    });
    colors = Array.from(cMap.entries()).map(([name, hex]) => ({ name, hex }));
  }

  // 3. SUB-PRODUCTS: Strictly empty (sub-products are managed via the dedicated Sub-Product button)
  const subProducts: { name: string; price?: number }[] = [];

  return {
    sizes,
    colors,
    subProducts,
    variants: Array.isArray(prod.variants) ? prod.variants : [],
    isBedOrMattress: isBed,
  };
}

export interface CanonicalTemplate {
  id: TemplateType;
  name: string;
  shortTitle: string;
  badge: string;
  category: string;
  pdfAttachmentName: string;
  description: string;
  trigger: string;
  defaultRecipient: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  subject: string;
  items: CustomInvoiceItem[];
  extraMeta: Record<string, any>;
}

export const CANONICAL_TEMPLATES: CanonicalTemplate[] = [
  {
    id: 'ndis_quote',
    name: 'NDIS Quotation',
    shortTitle: 'NDIS Quotation',
    badge: 'NDIS Item 05 • Valid 30 Days',
    category: 'NDIS Funding & PACE Claims (Customer Request)',
    pdfAttachmentName: 'NDIS-Quotation.pdf',
    description:
      'Official NDIS Assistive Technology Quote compliant with NDIA Price Arrangements, PACE claims, and clinical OT approvals.',
    trigger: 'Triggered automatically when a customer submits an NDIS Quote Request on the website.',
    defaultRecipient: '',
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    subject: 'NDIS Quotation #{{document_id}} — AT Specialists Australia',
    items: [
      {
        id: 'tmpl-ndis-1',
        code: '05_120603099_0105_1_2',
        name: 'Electric Profiling Low Care Bed with Wooden Safety Rails',
        detail: 'Four-section profiling deck, integral wooden headboards, AS/NZS 3696.19 healthcare certified',
        quantity: 1,
        price: 2450.0,
        amount: 2450.0,
      },
      {
        id: 'tmpl-ndis-2',
        code: '05_181206121_0103_1_2',
        name: 'Pressure Relief Dynamic Alternating Air Mattress',
        detail: 'Alternating cycle therapy, cell-on-cell safety system, multi-stretch vapor permeable cover',
        quantity: 1,
        price: 1850.0,
        amount: 1850.0,
      },
    ],
    extraMeta: {
      ndisNumber: '',
      planType: 'Plan-Managed (Capital AT Level 3/4)',
      planManager: 'Registered Plan Management',
      prescribingClinician: 'Senior Occupational Therapist',
      clinicianAhpra: 'AHPRA Registered',
      assessmentRef: 'AT-CLINICAL/ASSESS',
      validityPeriod: '30 Days from Issue',
      deliveryTimeframe: '2 - 4 Weeks from Plan Approval',
      generatePdf: true,
    },
  },
  {
    id: 'order',
    name: 'NDIS Invoice',
    shortTitle: 'NDIS Invoice',
    badge: 'ATO Compliant • Paid Receipt',
    category: 'Storefront Checkout & Order (Customer Request)',
    pdfAttachmentName: 'NDIS-Invoice.pdf',
    description:
      'ATO-compliant tax invoice confirming customer payment, product specifications, and medical GST-free exemption.',
    trigger: 'Triggered automatically upon customer online order completion, payment, or NDIS checkout.',
    defaultRecipient: '',
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    subject: 'NDIS Invoice #{{document_id}} — AT Specialists Australia',
    items: [
      {
        id: 'tmpl-order-1',
        code: 'AT-PRD-101',
        name: 'Air-Cell High-Risk Pressure Relief Wheelchair Cushion',
        detail: 'Multi-cell immersion profile with breathable wipe-clean incontinence cover',
        quantity: 1,
        price: 480.0,
        amount: 480.0,
      },
      {
        id: 'tmpl-order-2',
        code: 'AT-PRD-105',
        name: 'Lightweight Folding Transport Wheelchair (18-Inch)',
        detail: 'Dual handbrakes, attendant handles, flip-up footplates',
        quantity: 1,
        price: 540.0,
        amount: 540.0,
      },
    ],
    extraMeta: {
      paymentStatus: 'CONFIRMED / PAID',
      fulfillment: 'Australia Express Courier',
      validityPeriod: 'Immediate Dispatch',
      generatePdf: true,
    },
  },
  {
    id: 'hire',
    name: 'EQUIPMENT HIRE',
    shortTitle: 'EQUIPMENT HIRE',
    badge: 'Sanitized Rental Fleet',
    category: 'Equipment Rental Fleet (Customer Request)',
    pdfAttachmentName: 'Equipment-Hire.pdf',
    description:
      'Sanitized rental agreement detailing hire tenure, security bond, hospital-grade sanitize clean, and setup orientation.',
    trigger: 'Triggered automatically when a customer submits an equipment rental booking on the website.',
    defaultRecipient: '',
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    subject: 'EQUIPMENT HIRE #{{document_id}} — AT Specialists Australia',
    items: [
      {
        id: 'tmpl-hire-1',
        code: 'HIRE-BED-01',
        name: 'Electric Low Profiling Hospital Bed (Monthly Hire)',
        detail: '4-week initial rental period • Hospital-grade terminal sanitize completed • Full delivery & setup orientation included',
        quantity: 1,
        price: 360.0,
        amount: 360.0,
      },
    ],
    extraMeta: {
      hireDuration: '4 Weeks Initial Rental',
      depositBond: '$200.00 (Refundable upon inspection)',
      deliveryTimeframe: 'Express Next-Day Medical Courier',
      validityPeriod: 'Immediate Handover',
      generatePdf: true,
    },
  },
  {
    id: 'quote',
    name: 'EQUIPMENT INVOICE',
    shortTitle: 'EQUIPMENT INVOICE',
    badge: 'Commercial Proposal • 30 Days',
    category: 'Commercial & Healthcare Facility (Customer Request)',
    pdfAttachmentName: 'Equipment-Invoice.pdf',
    description:
      'Commercial equipment quotation prepared for healthcare facilities, aged care providers, and private clients.',
    trigger: 'Triggered automatically when a healthcare facility or client requests an equipment quote online.',
    defaultRecipient: '',
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    subject: 'EQUIPMENT INVOICE #{{document_id}} — AT Specialists Australia',
    items: [
      {
        id: 'tmpl-quote-1',
        code: 'AT-EQ-100',
        name: 'Complex Powered Mobility Chair (TRU-Balance 3)',
        detail: 'Commercial assistive technology product quotation with mid-wheel drive and tilt-in-space seating',
        quantity: 1,
        price: 7850.0,
        amount: 7850.0,
      },
    ],
    extraMeta: {
      deliveryTimeframe: '5 - 10 Business Days',
      validityPeriod: '30 Days from Issue',
      generatePdf: true,
    },
  },
  {
    id: 'contact',
    name: 'Clinical Advisory',
    shortTitle: 'Clinical Advisory',
    badge: 'Clinical Advice',
    category: 'Clinical Advisory Consultation (Customer Request)',
    pdfAttachmentName: 'Clinical-Advisory.pdf',
    description:
      'Written clinical advice summary with assistive technology guidance, sizing matrix, and supplier recommendations.',
    trigger: 'Triggered automatically when a customer or therapist submits a clinical inquiry on the website.',
    defaultRecipient: '',
    customerName: '',
    customerPhone: '',
    deliveryAddress: '',
    subject: 'Clinical Advisory #{{document_id}} — AT Specialists Australia',
    items: [
      {
        id: 'tmpl-contact-1',
        code: 'ADVISORY-01',
        name: 'Specialist Clinical Product Recommendations & Sizing Matrix',
        detail: 'Comprehensive assistive technology suitability assessment, dimensions, weight capacity, and clinical specifications',
        quantity: 1,
        price: 0.0,
        amount: 0.0,
      },
    ],
    extraMeta: {
      advisoryDate: '18 September 2026',
      prescribingClinician: 'Senior Occupational Therapist',
      clinicianAhpra: 'AHPRA Registered',
      validityPeriod: 'Clinical Advisory',
      generatePdf: true,
    },
  },
];

export const DEFAULT_PDF_CONFIGS: Record<TemplateType, {
  title: string;
  subtitle: string;
  tagline: string;
  terms: string;
  notes: string;
  showStatutoryNotice: boolean;
  statutoryNoticeText: string;
  bankTitle: string;
  footerText: string;
}> = {
  ndis_quote: {
    title: 'NDIS QUOTATION',
    subtitle: 'Capital & Core Support Pricing Schedule',
    tagline: 'NDIS Provider • Capital Supports',
    terms: 'Valid for 30 Days from Issue • Standard NDIA Pricing Schedule',
    notes: 'Quote prepared according to NDIA Price Arrangements and Support Catalogue guidelines. Items comply with Australian Standards for medical devices.',
    showStatutoryNotice: false,
    statutoryNoticeText: '',
    bankTitle: 'Direct Bank Transfer (EFT) Remittance Details:',
    footerText: 'NDIS Quotation • Assistive Technology Specialists Australia Pty Ltd • Thank you for your business.',
  },
  order: {
    title: 'NDIS INVOICE',
    subtitle: 'NDIS Participant Equipment Delivery & Tax Invoice Schedule',
    tagline: 'ABN: 48 123 456 789 • NDIS Provider',
    terms: 'Payment Received in Full • ATO Compliant NDIS Tax Invoice',
    notes: 'Thank you for your order with AT Specialists. All items are dispatched with manufacturer warranty and Australian safety compliance certifications.',
    showStatutoryNotice: false,
    statutoryNoticeText: '',
    bankTitle: 'Payment Method: Confirmed via Secure Payment Gateway / Card / EFT',
    footerText: 'NDIS Invoice • Assistive Technology Specialists Australia Pty Ltd • Thank you for your business.',
  },
  hire: {
    title: 'EQUIPMENT HIRE',
    subtitle: 'Assistive Equipment Rental Tenure & Clinical Handover Schedule',
    tagline: 'Sanitized Equipment Fleet • NDIS Provider',
    terms: 'Hire Tenure: 4 Weeks Initial • Hospital Sanitized',
    notes: 'Equipment has undergone terminal hospital-grade cleaning and clinical safety inspection before delivery.',
    showStatutoryNotice: false,
    statutoryNoticeText: '',
    bankTitle: 'Direct Bank Transfer (EFT) Remittance Details:',
    footerText: 'EQUIPMENT HIRE • Assistive Technology Specialists Australia Pty Ltd • Thank you for your business.',
  },
  quote: {
    title: 'EQUIPMENT INVOICE',
    subtitle: 'Healthcare Facility & Commercial Equipment Invoice Schedule',
    tagline: 'Healthcare Procurement • ABN 48 123 456 789',
    terms: 'Net 30 Days from Delivery • Valid for 30 Days',
    notes: 'Commercial pricing includes delivery, standard freight handling, and scheduled clinical handover upon delivery.',
    showStatutoryNotice: false,
    statutoryNoticeText: '',
    bankTitle: 'Direct Bank Transfer (EFT) Remittance Details:',
    footerText: 'EQUIPMENT INVOICE • Assistive Technology Specialists Australia Pty Ltd • Thank you for your business.',
  },
  contact: {
    title: 'CLINICAL ADVISORY',
    subtitle: 'Assistive Technology Clinical Advisory Advice',
    tagline: 'Specialist Clinical Advice Line • ABN 48 123 456 789',
    terms: 'Clinical Consultation Record',
    notes: 'Tailored recommendations prepared by clinical assistive technology consultant.',
    showStatutoryNotice: false,
    statutoryNoticeText: '',
    bankTitle: 'Direct Bank Transfer (EFT) Remittance Details:',
    footerText: 'Clinical Advisory • Assistive Technology Specialists Australia Pty Ltd.',
  },
};

export const DEFAULT_MAIL_CONFIGS: Record<TemplateType, {
  subject: string;
  badge: string;
  headline: string;
  subtext: string;
  body: string;
  ctaText: string;
  footerText: string;
  prescribingClinician?: string;
  assessmentRef?: string;
  validityPeriod?: string;
  deliveryTimeframe?: string;
  planType?: string;
}> = {
  ndis_quote: {
    subject: 'NDIS Quotation #{{document_id}} — AT Specialists Australia',
    badge: 'NDIS Quotation',
    headline: 'Your NDIS Quotation is Ready',
    subtext: 'Prepared according to NDIA Price Arrangements with line-item support codes.',
    body: 'Dear {{customer_name}},\n\nPlease find enclosed your NDIS Quotation prepared by our clinical team. This quote includes itemized NDIA support codes suitable for plan management claim submission and capital funding allocation.\n\nIf you or your plan manager require any adjustments, please reply directly to this email or contact our clinical support team.',
    ctaText: 'View NDIS Quotation Online',
    footerText: 'NDIS Quotation • Assistive Technology Specialists Australia • NDIS Provider • Questions? Contact 0494 767 409',
    prescribingClinician: 'Dr. Alistair Vance, Senior OT (AHPRA: OCC0001892341)',
    assessmentRef: 'AT-ASSESS/2026/0812',
    validityPeriod: 'Quote Valid for 30 Days',
    deliveryTimeframe: '2 - 4 Weeks from Approval',
    planType: 'Plan-Managed (Capital AT Level 3/4)',
  },
  order: {
    subject: 'NDIS Invoice #{{document_id}} — AT Specialists Australia',
    badge: 'NDIS Invoice',
    headline: 'Thank You For Your Order & Payment',
    subtext: 'Your payment has been processed and your official NDIS Invoice is ready.',
    body: 'Dear {{customer_name}},\n\nThank you for choosing AT Specialists Australia. Your NDIS order has been successfully placed and confirmed. Our clinical dispatch team is now preparing your assistive technology equipment for delivery.\n\nYour NDIS Invoice is available online for your records and plan manager reimbursement.',
    ctaText: 'View NDIS Invoice Online',
    footerText: 'NDIS Invoice • AT Specialists Australia • Need support? Call 0494 767 409 or email admin@atspecialists.com.au',
    deliveryTimeframe: '2 - 5 Business Days Express',
  },
  hire: {
    subject: 'EQUIPMENT HIRE Agreement #{{document_id}} — AT Specialists Australia',
    badge: 'EQUIPMENT HIRE',
    headline: 'Your EQUIPMENT HIRE Agreement & Schedule',
    subtext: 'Confirmed rental booking with delivery and setup orientation.',
    body: 'Dear {{customer_name}},\n\nYour EQUIPMENT HIRE agreement has been scheduled. All equipment in our rental fleet undergoes clinical hospital-grade terminal sanitation and thorough safety inspection prior to dispatch.\n\nPlease review your hire agreement terms and handover schedule below.',
    ctaText: 'View EQUIPMENT HIRE Agreement Online',
    footerText: 'EQUIPMENT HIRE • AT Specialists Australia • Equipment Rental Fleet • Questions? Call 0494 767 409',
    deliveryTimeframe: '2 - 4 Business Days Handover',
  },
  quote: {
    subject: 'EQUIPMENT INVOICE #{{document_id}} — AT Specialists Australia',
    badge: 'EQUIPMENT INVOICE',
    headline: 'Your EQUIPMENT INVOICE is Ready',
    subtext: 'Prepared for healthcare facility and clinical procurement.',
    body: 'Dear {{customer_name}},\n\nPlease review your EQUIPMENT INVOICE. We have itemized specifications, freight delivery allowances, and clinical warranty terms for your review.\n\nTo proceed with purchase approval or if you require an amended invoice, please let us know.',
    ctaText: 'View EQUIPMENT INVOICE Online',
    footerText: 'EQUIPMENT INVOICE • AT Specialists Australia • Commercial Division • Call 0494 767 409',
    validityPeriod: '30 Days from Issue Date',
    deliveryTimeframe: '5 - 10 Business Days',
  },
  contact: {
    subject: 'Clinical Advisory #{{document_id}} — AT Specialists Australia',
    badge: 'Clinical Advisory',
    headline: 'Specialist Clinical Advice & Suitability Matrix',
    subtext: 'Comprehensive assistive technology guidance from our occupational therapy team.',
    body: 'Dear {{customer_name}},\n\nThank you for reaching out to AT Specialists Australia. Our clinical consultant has reviewed your inquiry and prepared equipment recommendations tailored to your rehabilitation plan.\n\nPlease review the clinical summary and product sizing matrix below.',
    ctaText: 'View Clinical Advisory Online',
    footerText: 'Clinical Advisory • AT Specialists Australia • Clinical Advisory Team • Call 0494 767 409',
    assessmentRef: 'INQ-ADVISORY/2026',
    validityPeriod: 'General Clinical Guidance',
  },
};


function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return new Date().toLocaleDateString('en-AU');
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return dateStr;
  } catch {
    return dateStr || new Date().toLocaleDateString('en-AU');
  }
}

function sanitizePdfConfig(cfg: any) {
  if (!cfg) return cfg;
  const copy = { ...cfg };
  if (
    copy.statutoryNoticeText &&
    (copy.statutoryNoticeText.includes('Section 38-45') || copy.statutoryNoticeText.includes('GST-Free Medical Supply'))
  ) {
    copy.showStatutoryNotice = false;
    copy.statutoryNoticeText = '';
  }
  return copy;
}

export function AdminInvoices() {
  const {
    invoiceSettings,
    updateInvoiceSettings,
    customers,
    products,
    ndisQuotes,
    orders,
    inquiries,
    fetchInquiries,
    deleteNdisQuote,
    updateNdisQuote,
    convertNdisQuoteToOrder,
  } = useAdminStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // 6 Main Tabs (quotes added)
  type MainTab = 'workflow' | 'pdf_templates' | 'email_templates' | 'history' | 'company';
  const VALID_TABS: MainTab[] = ['workflow', 'pdf_templates', 'email_templates', 'history', 'company'];
  const initialTab = searchParams.get('tab') as MainTab;
  const [activeTab, setActiveTab] = useState<MainTab>(VALID_TABS.includes(initialTab) ? initialTab : 'workflow');
  const navigate = useNavigate();

  const handleSetTab = (tab: MainTab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    if (tab === 'email_templates') {
      if (selectedMailType === 'ndis_quote' || selectedMailType === 'hire') {
        handleSelectMailType('order');
      }
    }
  };

  // Notification Toast State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // =========================================================================
  // UNIVERSAL COMPANY & BANK SETTINGS STATE
  // =========================================================================
  const [companyForm, setCompanyForm] = useState({
    companyName: invoiceSettings.companyName || 'Assistive Technology Specialists Australia Pty Ltd',
    abn: invoiceSettings.abn || '48 123 456 789',
    ndisRegistrationNumber: invoiceSettings.ndisRegistrationNumber || '405001928',
    email: invoiceSettings.email || 'admin@atspecialists.com.au',
    phone: invoiceSettings.phone || '0494 767 409',
    address: invoiceSettings.address || '42 Victoria Parade, Fitzroy VIC 3065',
    bankName: invoiceSettings.bankName || 'Commonwealth Bank of Australia (CBA)',
    accountName: invoiceSettings.accountName || 'Assistive Technology Specialists Australia Pty Ltd',
    bsb: invoiceSettings.bsb || '063-000',
    accountNumber: invoiceSettings.accountNumber || '1088 4422',
    paymentTermsDays: invoiceSettings.paymentTermsDays || 30,
    brandColor: invoiceSettings.brandColor || '#147A7A',
  });

  const handleSaveCompanyDefaults = () => {
    updateInvoiceSettings(companyForm);
    showNotice('Saved company information and remittance defaults');
  };

  // =========================================================================
  // TAB 1: SEND DOCUMENT WORKFLOW STATE
  // =========================================================================
  const [selectedTopic, setSelectedTopic] = useState<TemplateType>('ndis_quote');
  const [customerSearch, setCustomerSearch] = useState('');
  const [isCustomerPickerOpen, setIsCustomerPickerOpen] = useState(false);

  // Active Document Data
  const [documentId, setDocumentId] = useState(`NDIS-QT-${Date.now().toString().slice(-5)}`);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [ndisNumber, setNdisNumber] = useState('');
  const [planManager, setPlanManager] = useState('');
  const [planManagerEmail, setPlanManagerEmail] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [workflowTagline, setWorkflowTagline] = useState('');
  const [workflowFooterText, setWorkflowFooterText] = useState('');
  const [workflowProviderName, setWorkflowProviderName] = useState('');
  const [workflowNdisProviderNo, setWorkflowNdisProviderNo] = useState('');
  const [workflowAbn, setWorkflowAbn] = useState('');
  const [workflowAddress, setWorkflowAddress] = useState('');
  const [workflowPhone, setWorkflowPhone] = useState('');
  const [workflowWebsite, setWorkflowWebsite] = useState('');
  const [workflowEmailHeadline, setWorkflowEmailHeadline] = useState('');
  const [isProviderHeaderOpen, setIsProviderHeaderOpen] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [documentNotes, setDocumentNotes] = useState('');
  const [items, setItems] = useState<CustomInvoiceItem[]>([]);

  // Fully Editable Document, Email & Bank Fields for Customer Dispatch Workflow
  const [workflowDocTitle, setWorkflowDocTitle] = useState('');
  const [workflowDocSubtitle, setWorkflowDocSubtitle] = useState('');
  const [workflowDocTerms, setWorkflowDocTerms] = useState('');
  const [workflowEmailSubject, setWorkflowEmailSubject] = useState('');
  const [workflowEmailBody, setWorkflowEmailBody] = useState('');
  const [workflowBankTitle, setWorkflowBankTitle] = useState('Direct Bank Transfer (EFT) Remittance Details:');
  const [workflowBankName, setWorkflowBankName] = useState('');
  const [workflowAccountName, setWorkflowAccountName] = useState('');
  const [workflowBsb, setWorkflowBsb] = useState('');
  const [workflowAccountNumber, setWorkflowAccountNumber] = useState('');
  const [workflowShowStatutory, setWorkflowShowStatutory] = useState(false);
  const [workflowStatutoryText, setWorkflowStatutoryText] = useState('');

  // Clinical Assessment & Logistics Workflow Fields
  const [workflowPrescribingClinician, setWorkflowPrescribingClinician] = useState('Dr. Alistair Vance, Senior OT (AHPRA: OCC0001892341)');
  const [workflowAssessmentRef, setWorkflowAssessmentRef] = useState('AT-ASSESS/2026/0812');
  const [workflowValidityPeriod, setWorkflowValidityPeriod] = useState('Quote Valid for 30 Days');
  const [workflowDeliveryTimeframe, setWorkflowDeliveryTimeframe] = useState('2 - 4 Weeks from Approval');
  const [workflowPlanType, setWorkflowPlanType] = useState('Plan-Managed (Capital AT Level 3/4)');

  // Product Catalog Search & Sub-Product Modal in Workflow
  const [productSearch, setProductSearch] = useState('');
  const [searchCategoryFilter, setSearchCategoryFilter] = useState('all');
  const [searchVisibleLimit, setSearchVisibleLimit] = useState(25);
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [isSubProductModalOpen, setIsSubProductModalOpen] = useState(false);
  const [customSubProductInput, setCustomSubProductInput] = useState<Record<string, string>>({});

  // Smart SKU, Variant, Multi-Term & Category Search across ALL Catalogue Products
  const allMatchedProducts = useMemo(() => {
    const q = (productSearch || '').toLowerCase().trim();
    const tokens: string[] = q.split(/\s+/).filter(Boolean);

    // Filter by Category if selected
    let baseList = products;
    if (searchCategoryFilter !== 'all') {
      baseList = products.filter((p: any) => {
        const cat = ((p.category || '') + ' ' + (p.categories || []).join(' ')).toLowerCase();
        const pName = (p.name || '').toLowerCase();
        if (searchCategoryFilter === 'beds') {
          return isRealBedOrMattress(p) || cat.includes('bed');
        }
        if (searchCategoryFilter === 'pressure') {
          return cat.includes('mattress') || cat.includes('pressure') || pName.includes('mattress') || pName.includes('cushion');
        }
        if (searchCategoryFilter === 'mobility') {
          return cat.includes('mobility') || cat.includes('wheelchair') || cat.includes('scooter') || cat.includes('walker') || pName.includes('wheelchair');
        }
        if (searchCategoryFilter === 'accessories') {
          return cat.includes('accessory') || cat.includes('linen') || pName.includes('pillow') || pName.includes('rail') || pName.includes('pole') || pName.includes('cover');
        }
        return true;
      });
    }

    if (!q) {
      return baseList;
    }

    return baseList
      .map((p: any) => {
        let score = 0;
        const pSku = (p.sku || p.id || '').toLowerCase().trim();
        const pName = (p.name || '').toLowerCase().trim();
        const pBrand = (p.brand || '').toLowerCase().trim();
        const pCat = ((p.category || '') + ' ' + (p.categories || []).join(' ')).toLowerCase();
        const variantSkus: string[] = Array.isArray(p.variants)
          ? p.variants.map((v: any) => String(v.sku || '').toLowerCase().trim())
          : [];

        // Exact match on product SKU or variant SKU (highest priority)
        if (pSku === q) {
          score += 3000;
        } else if (variantSkus.includes(q)) {
          score += 3000;
        } else if (pSku.startsWith(q)) {
          score += 1500;
        } else if (variantSkus.some((s: string) => s.startsWith(q))) {
          score += 1400;
        } else if (pSku.includes(q)) {
          score += 800;
        } else if (variantSkus.some((s: string) => s.includes(q))) {
          score += 750;
        }

        // Exact match on product name
        if (pName === q) {
          score += 1200;
        } else if (pName.startsWith(q)) {
          score += 600;
        } else if (pName.includes(q)) {
          score += 350;
        }

        // Multi-word token matching (e.g. "aspire bed", "neeki pillowcase", "activ care")
        if (tokens.length > 1) {
          const fullText = `${pName} ${pSku} ${pBrand} ${pCat} ${variantSkus.join(' ')}`;
          const allMatch = tokens.every((t: string) => fullText.includes(t));
          if (allMatch) {
            score += 500;
          }
          const matchedCount = tokens.filter((t: string) => fullText.includes(t)).length;
          score += matchedCount * 50;
        }

        // Brand and Category matches
        if (pBrand && pBrand.includes(q)) score += 80;
        if (pCat && pCat.includes(q)) score += 50;

        return { product: p, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product);
  }, [products, productSearch, searchCategoryFilter]);

  const displayedProducts = useMemo(() => {
    return allMatchedProducts.slice(0, searchVisibleLimit);
  }, [allMatchedProducts, searchVisibleLimit]);

  // Workflow Preview Toggle: 'document' (A4 PDF) or 'email' (Exact Email Preview)
  const [workflowPreviewMode, setWorkflowPreviewMode] = useState<'document' | 'email'>('document');
  const [emailPreviewDevice, setEmailPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  // Dispatch Status
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [sendResult, setSendResult] = useState<{
    success: boolean;
    message: string;
    viewUrl?: string;
    pdfUrl?: string;
  } | null>(null);

  // PDF Preview Container Ref for Export
  const a4PreviewRef = useRef<HTMLDivElement>(null);

  // Populate Workflow fields when a document type is selected
  const applyTopicDefaults = (topic: TemplateType) => {
    const tmpl = CANONICAL_TEMPLATES.find((t) => t.id === topic);
    const activePdf = sanitizePdfConfig(invoiceSettings.pdfTemplates?.[topic] || DEFAULT_PDF_CONFIGS[topic]);
    const activeMail = invoiceSettings.mailTemplates?.[topic] || DEFAULT_MAIL_CONFIGS[topic];

    if (tmpl) {
      setItems(JSON.parse(JSON.stringify(tmpl.items)));
      const prefix =
        topic === 'ndis_quote'
          ? 'NDIS-QT'
          : topic === 'order'
          ? 'ORD-INV'
          : topic === 'quote'
          ? 'QT-COMM'
          : topic === 'hire'
          ? 'HIRE'
          : 'CLIN';
      const newDocId = `${prefix}-${Date.now().toString().slice(-5)}`;
      setDocumentId(newDocId);
      setDocumentNotes(tmpl.extraMeta?.deliveryTimeframe ? `Estimated Delivery: ${tmpl.extraMeta.deliveryTimeframe}` : (activePdf.notes || ''));
      setWorkflowDocTitle(activePdf.title || tmpl.name);
      setWorkflowDocSubtitle(activePdf.subtitle || 'Assistive Technology & Clinical Equipment Schedule');
      setWorkflowTagline(activePdf.tagline || tmpl.badge || 'NDIS Provider');
      setWorkflowDocTerms(activePdf.terms || 'Strictly 14 Days Net (ATO & NDIS Standard)');
      setWorkflowFooterText(activePdf.footerText || 'Document • Assistive Technology Specialists Australia Pty Ltd • Thank you for your business.');
      setWorkflowBankTitle(activePdf.bankTitle || 'Direct Bank Transfer (EFT) Remittance Details:');
      setWorkflowShowStatutory(activePdf.showStatutoryNotice ?? false);
      setWorkflowStatutoryText(activePdf.statutoryNoticeText || '');

      setWorkflowProviderName(companyForm.companyName || 'Assistive Technology Specialists Australia Pty Ltd');
      setWorkflowNdisProviderNo(companyForm.ndisRegistrationNumber || '405001928');
      setWorkflowAbn(companyForm.abn || '48 123 456 789');
      setWorkflowAddress(companyForm.address || '42 Victoria Parade, Fitzroy VIC 3065');
      setWorkflowPhone(companyForm.phone || '0494 767 409');
      setWorkflowWebsite((companyForm as any).website || 'atspecialists.com.au');

      setWorkflowBankName((activePdf as any).bankName || companyForm.bankName || 'Commonwealth Bank of Australia');
      setWorkflowAccountName((activePdf as any).accountName || companyForm.accountName || 'Assistive Technology Specialists Australia');
      setWorkflowBsb((activePdf as any).bsb || companyForm.bsb || '063-000');
      setWorkflowAccountNumber((activePdf as any).accountNumber || companyForm.accountNumber || '1088 4422');

      setWorkflowPrescribingClinician(activeMail.prescribingClinician || 'Dr. Alistair Vance, Senior OT (AHPRA: OCC0001892341)');
      setWorkflowAssessmentRef(activeMail.assessmentRef || 'AT-ASSESS/2026/0812');
      setWorkflowValidityPeriod(activeMail.validityPeriod || 'Quote Valid for 30 Days');
      setWorkflowDeliveryTimeframe(activeMail.deliveryTimeframe || (tmpl.extraMeta?.deliveryTimeframe || '2 - 4 Weeks from Approval'));
      setWorkflowPlanType(activeMail.planType || 'Plan-Managed (Capital AT Level 3/4)');

      const clientName = customerName || 'Valued Client';
      setWorkflowEmailHeadline(activeMail.headline || tmpl.name);
      setWorkflowEmailSubject((activeMail.subject || tmpl.subject || '')
          .replace(/\{\{document_id\}\}/g, newDocId)
          .replace(/\{\{customer_name\}\}/g, clientName));
      setWorkflowEmailBody((activeMail.body || tmpl.description || '')
          .replace(/\{\{customer_name\}\}/g, clientName)
          .replace(/\{\{document_id\}\}/g, newDocId));
    }
  };

  // Helper to load any quote into the Document Generator & Email Studio
  const loadQuoteIntoWorkflow = (q: any) => {
    const isHire = q.quoteType === 'hire' || q.id.toUpperCase().startsWith('HIR') ||
      (Array.isArray(q.items) && q.items.some((it: any) => it.isRental || it.type === 'hire' || (it.purchaseType || '').toLowerCase() === 'hire'));
    const topic: TemplateType = isHire ? 'hire' : 'ndis_quote';
    setSelectedTopic(topic);
    applyTopicDefaults(topic);

    setDocumentId(q.id);
    setCustomerName(q.customerName || '');
    setCustomerEmail(q.customerEmail || '');
    setCustomerPhone(q.customerPhone || '');
    setDeliveryAddress(q.shippingAddress || '');
    setNdisNumber(q.ndisNumber || '');
    setPlanManager(q.planManager || '');
    setPlanManagerEmail(q.planManagerEmail || '');
    if (q.planType) {
      setWorkflowPlanType(q.planType === 'self_managed' ? 'Self-Managed (Capital AT)' : q.planType === 'ndia_managed' ? 'NDIA-Managed (Direct Claim)' : 'Plan-Managed (Capital AT Level 3/4)');
    }
    if (q.prescriberName) {
      setWorkflowPrescribingClinician(`${q.prescriberName}${q.prescriberOrg ? ' (' + q.prescriberOrg + ')' : ''}`);
    }
    if (Array.isArray(q.items) && q.items.length > 0) {
      setItems(q.items.map((i: any, idx: number) => {
        const qty = Number(i.quantity) || 1;
        const prc = Number(i.price) || 0;
        return {
          id: `quote-item-${idx}`,
          code: (i as any).code || (i as any).sku || (i as any).productId || (i as any).id || '',
          name: i.name,
          quantity: qty,
          price: prc,
          amount: qty * prc,
          detail: (i as any).detail || '',
        };
      }));
    }
    if (q.deliveryFee) setDeliveryFee(Number(q.deliveryFee));
    if (q.notes) setDocumentNotes(q.notes);

    handleSetTab('workflow');
    showNotice(`Loaded quote ${q.id} into document generator.`);
  };

  // Helper to pre-populate quote/invoice from an incoming contact inquiry
  const loadInquiryIntoWorkflow = (inq: any) => {
    setSelectedTopic('ndis_quote');
    applyTopicDefaults('ndis_quote');

    const cleanId = String(inq.id || '').replace(/^INQ-?/i, '');
    const inqDocId = `NDIS-QT-${cleanId || Date.now().toString().slice(-5)}`;
    setDocumentId(inqDocId);
    setCustomerName(inq.name || '');
    setCustomerEmail(inq.email || '');
    setCustomerPhone(inq.phone || '');
    if (inq.ndisNumber) setNdisNumber(inq.ndisNumber);
    if (inq.planManager) setPlanManager(inq.planManager);
    setDocumentNotes(`Lead Source: Website Inquiry #${inq.id} [${inq.enquiryType || 'General'}]\nCustomer Message: ${inq.message || ''}`);

    if (inq.equipmentInterest || (inq.message && inq.message.includes('[Equipment Interest:'))) {
      let equipName = inq.equipmentInterest || '';
      if (!equipName && inq.message) {
        const match = inq.message.match(/\[Equipment Interest:\s*([^\]]+)\]/i);
        if (match) equipName = match[1].trim();
      }
      if (equipName) {
        setItems([
          {
            id: 'inq-item-1',
            code: '05_120603099_0105_1_2',
            name: `${equipName} — Prescribed Assistive Solution`,
            quantity: 1,
            price: 850.0,
            amount: 850.0,
            detail: `Specified via contact enquiry #${inq.id}`,
          },
        ]);
      }
    }

    handleSetTab('workflow');
    showNotice(`Loaded patient inquiry #${inq.id} into quote generator.`);
  };

  useEffect(() => {
    const inquiryId = searchParams.get('inquiryId');
    if (inquiryId) {
      if (inquiries.length === 0) {
        fetchInquiries();
      } else {
        const foundInq = inquiries.find((i) => i.id === inquiryId);
        if (foundInq) {
          loadInquiryIntoWorkflow(foundInq);
        }
      }
    }
  }, [searchParams, inquiries, fetchInquiries]);

  const handleSaveQuoteDraft = () => {
    const existingQuote = ndisQuotes.find((q) => q.id === documentId);
    const isHire = selectedTopic === 'hire';
    const quoteData: any = {
      id: documentId,
      customerName: customerName || 'Valued Client',
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      shippingAddress: deliveryAddress || '',
      ndisNumber: ndisNumber || '',
      planManager: planManager || '',
      planManagerEmail: planManagerEmail || '',
      planType: (workflowPlanType.toLowerCase().includes('self') ? 'self_managed' : workflowPlanType.toLowerCase().includes('ndia') ? 'ndia_managed' : 'plan_managed'),
      quoteType: isHire ? 'hire' : 'purchase',
      items: items.map((it) => ({
        id: it.id,
        code: it.code,
        name: it.name,
        detail: it.detail,
        size: it.size,
        color: it.color,
        subProducts: it.subProducts,
        quantity: it.quantity,
        price: it.price,
        purchaseType: (isHire ? 'hire' : 'buy'),
      })),
      total,
      status: existingQuote?.status || 'draft',
      createdAt: existingQuote?.createdAt || new Date().toISOString(),
      validUntil: existingQuote?.validUntil || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      notes: documentNotes,
      prescriberName: existingQuote?.prescriberName || workflowPrescribingClinician.split(',')[0],
      prescriberOrg: existingQuote?.prescriberOrg,
      prescriberPhone: existingQuote?.prescriberPhone,
      prescriberEmail: existingQuote?.prescriberEmail,
      clinicalRationale: existingQuote?.clinicalRationale,
      hireStartDate: existingQuote?.hireStartDate,
      hireDurationWeeks: existingQuote?.hireDurationWeeks,
      hireReturnDate: existingQuote?.hireReturnDate,
      hireLocationType: existingQuote?.hireLocationType,
      hireFacilityName: existingQuote?.hireFacilityName,
      hireFacilityWard: existingQuote?.hireFacilityWard,
      hireFacilityRoom: existingQuote?.hireFacilityRoom,
      hireDischargeDate: existingQuote?.hireDischargeDate,
    };

    if (existingQuote) {
      updateNdisQuote(quoteData);
      showNotice(`Quote ${documentId} updated successfully!`);
    } else {
      useAdminStore.getState().addNdisQuote(quoteData);
      showNotice(`New Quote ${documentId} saved to Quotes registry!`);
    }
  };

  const handleConfirmPaymentAndConvertToOrder = (qId?: string) => {
    const targetQuoteId = qId || documentId;
    const existingQuote = ndisQuotes.find((q) => q.id === targetQuoteId);
    if (!existingQuote && targetQuoteId === documentId) {
      handleSaveQuoteDraft();
    }
    const createdOrder = convertNdisQuoteToOrder(targetQuoteId);
    if (createdOrder) {
      showNotice(`Payment confirmed! Converted to Order #${createdOrder.id} and moved to Orders.`, 'success');
      return createdOrder;
    } else {
      showNotice(`Failed to convert quote ${targetQuoteId}`, 'error');
      return null;
    }
  };

  // Only run topic initialization on initial mount
  const hasInitializedRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const qId = searchParams.get('quoteId');
      const ordId = searchParams.get('orderId');
      const topicParam = searchParams.get('topic') as TemplateType;

      if (qId) {
        const q = ndisQuotes.find((item) => item.id === qId);
        if (q) {
          loadQuoteIntoWorkflow(q);
          return;
        }
      }

      if (ordId) {
        const ord = orders.find((o) => o.id === ordId);
        if (ord) {
          setSelectedTopic('order');
          applyTopicDefaults('order');
          setDocumentId(`TAX-INV-${ord.id}`);
          setCustomerName(ord.customerName || '');
          setCustomerEmail(ord.customerEmail || '');
          setCustomerPhone(ord.customerPhone || '');
          setDeliveryAddress(ord.shippingAddress || '');
          setNdisNumber(ord.ndisNumber || '');
          if (Array.isArray(ord.items) && ord.items.length > 0) {
            setItems(ord.items.map((i: any, idx: number) => {
              const qty = Number(i.quantity) || 1;
              const prc = Number(i.price) || 0;
              return {
                id: `ord-item-${idx}`,
                code: (i as any).code || (i as any).sku || (i as any).productId || (i as any).id || '',
                name: i.name,
                quantity: qty,
                price: prc,
                amount: qty * prc,
                detail: (i as any).detail || '',
              };
            }));
          }
          if (ord.notes) setDocumentNotes(ord.notes);
          return;
        }
      }

      if (topicParam) {
        setSelectedTopic(topicParam);
        applyTopicDefaults(topicParam);
        return;
      }

      applyTopicDefaults(selectedTopic);
    }
  }, [searchParams, ndisQuotes, orders]);

  // Explicit user topic switch handler
  const handleSelectTopic = (topic: TemplateType) => {
    setSelectedTopic(topic);
    applyTopicDefaults(topic);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (Number(it.price) || 0) * (Number(it.quantity) || 1), 0);
  }, [items]);

  const total = useMemo(() => {
    return subtotal + (Number(deliveryFee) || 0);
  }, [subtotal, deliveryFee]);

  // Handle Customer Selection
  const handleSelectCustomer = (cust: any) => {
    setCustomerName(cust.name || '');
    setCustomerEmail(cust.email || '');
    setCustomerPhone(cust.phone || '');
    setDeliveryAddress(cust.address || (cust.city ? `${cust.city} ${cust.state || ''}` : ''));
    setNdisNumber(cust.ndis_number || cust.ndisNumber || '');
    setPlanManager(cust.plan_manager || cust.planManager || '');
    setIsCustomerPickerOpen(false);
    
    // Dynamically update email subject and greeting to reflect customer name
    const activeMail = invoiceSettings.mailTemplates?.[selectedTopic] || DEFAULT_MAIL_CONFIGS[selectedTopic];
    const tmpl = CANONICAL_TEMPLATES.find((t) => t.id === selectedTopic);
    const clientName = cust.name || 'Valued Client';
    setWorkflowEmailSubject((activeMail.subject || tmpl?.subject || '')
        .replace(/\{\{document_id\}\}/g, documentId)
        .replace(/\{\{customer_name\}\}/g, clientName));
    setWorkflowEmailBody((activeMail.body || tmpl?.description || '')
        .replace(/\{\{customer_name\}\}/g, clientName)
        .replace(/\{\{document_id\}\}/g, documentId));

    showNotice(`Selected customer: ${cust.name}`);
  };

  // Add Item from Catalog Search
  const handleAddProductItem = (
    prod: any,
    size?: string,
    color?: string,
    subProducts?: string[],
    variantSku?: string,
    variantPrice?: number
  ) => {
    const rel = getRelatedProductOptions(prod);
    const finalPrice = Number(variantPrice !== undefined ? variantPrice : (prod.price || prod.buyPrice || 0));
    const newItem: CustomInvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: variantSku || prod.sku || prod.id.toUpperCase(),
      name: prod.name,
      detail: prod.shortDescription || prod.category || 'Assistive Equipment',
      quantity: 1,
      price: finalPrice,
      amount: finalPrice,
      productId: prod.id,
      size: size || undefined,
      color: color || undefined,
      subProducts: subProducts && subProducts.length > 0 ? subProducts : undefined,
      availableSizes: rel.sizes.length > 0 ? rel.sizes : undefined,
      availableColors: rel.colors.length > 0 ? rel.colors : undefined,
      availableSubProducts: rel.subProducts.length > 0 ? rel.subProducts : undefined,
    };
    setItems((prev) => [...prev, newItem]);
    setProductSearch('');
    setIsProductSearchOpen(false);
    const badges = [size, color, variantSku].filter(Boolean).join(' • ');
    showNotice(`Added: ${prod.name}${badges ? ` (${badges})` : ''}`);
  };

  // Item Manipulations
  const handleItemChange = (id: string, field: keyof CustomInvoiceItem, value: any) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = {...item, [field]: value };
        if (field === 'price' || field === 'quantity') {
          updated.amount = (Number(updated.price) || 0) * (Number(updated.quantity) || 1);
        }
        return updated;
      }));
  };

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const handleAddNewBlankItem = () => {
    const newItem: CustomInvoiceItem = {
      id: `item-${Date.now()}`,
      code: 'AT-CUSTOM',
      name: 'Custom Assistive Item / Clinical Service',
      detail: 'Customized clinical solution',
      quantity: 1,
      price: 0,
      amount: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleAddSubProductAsLineItem = (sub: { name: string; price: number }) => {
    const newItem: CustomInvoiceItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      code: '05_120603099_0105_1_2',
      name: sub.name,
      detail: 'Assistive equipment accessory / clinical add-on',
      quantity: 1,
      price: sub.price,
      amount: sub.price,
    };
    setItems((prev) => [...prev, newItem]);
    setIsSubProductModalOpen(false);
    showNotice(`Added accessory: ${sub.name}`);
  };

  // Export A4 PDF from Live Preview
  const handleDownloadPdf = async () => {
    if (!a4PreviewRef.current) return;
    setIsGeneratingPdf(true);
    try {
      await exportElementToPdf(a4PreviewRef.current, `${documentId}.pdf`);
      showNotice(`Downloaded PDF: ${documentId}.pdf`);
    } catch (err: any) {
      showNotice(err.message || 'Failed to export PDF', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Dispatch Document Email to Customer
  const handleDispatchDocument = async () => {
    if (!customerEmail || !customerEmail.includes('@')) {
      showNotice('Please enter a valid recipient customer email address', 'error');
      return;
    }
    setIsSending(true);
    setSendResult(null);

    try {
      const res = await dispatchTemplateEmail({
        templateId: selectedTopic,
        recipientEmail: customerEmail,
        customerName: customerName || 'Valued Client',
        customerEmail,
        customerPhone,
        shippingAddress: deliveryAddress,
        documentId,
        items,
        subtotal,
        deliveryFee,
        gstTotal: 0,
        total,
        notes: documentNotes,
        extraMeta: {
          ndisNumber,
          planManager,
          prescribingClinician: workflowPrescribingClinician,
          assessmentRef: workflowAssessmentRef,
          validityPeriod: workflowValidityPeriod,
          deliveryTimeframe: workflowDeliveryTimeframe,
          planType: workflowPlanType,
          pdfTitle: workflowDocTitle,
          terms: workflowDocTerms,
          mailSubject: workflowEmailSubject,
          mailBody: workflowEmailBody,
          statutoryNotice: workflowShowStatutory ? workflowStatutoryText : undefined,
          bankDetails: {
            bankTitle: workflowBankTitle,
            bankName: workflowBankName,
            accountName: workflowAccountName,
            bsb: workflowBsb,
            accountNumber: workflowAccountNumber,
          },
        },
        customSettings: {
          companyName: workflowProviderName || companyForm.companyName,
          abn: workflowAbn || companyForm.abn,
          ndisProviderNo: workflowNdisProviderNo || companyForm.ndisRegistrationNumber,
          phone: workflowPhone || companyForm.phone,
          email: companyForm.email,
          address: workflowAddress || companyForm.address,
          website: workflowWebsite || (companyForm as any).website,
          bankTitle: workflowBankTitle,
          bankName: workflowBankName || companyForm.bankName,
          accountName: workflowAccountName || companyForm.accountName,
          bsb: workflowBsb || companyForm.bsb,
          accountNumber: workflowAccountNumber || companyForm.accountNumber,
          footerText: workflowFooterText,
          mailTemplate: {
            subject: workflowEmailSubject,
            body: workflowEmailBody,
            headline: workflowEmailHeadline,
          },
        },
        // Plain email body — the PDF stays available via the secure view link
        // instead of an attachment.
        attachPdf: false,
      });

      if (res.success) {
        setSendResult({
          success: true,
          message: `Document successfully dispatched to ${customerEmail}`,
          viewUrl: res.viewDocumentUrl,
          pdfUrl: res.directPdfUrl,
        });
        showNotice(`Document successfully sent to ${customerEmail}!`);
        loadHistory();
      } else {
        setSendResult({
          success: false,
          message: res.message || 'Dispatch failed',
        });
        showNotice(res.message || 'Failed to dispatch document', 'error');
      }
    } catch (err: any) {
      setSendResult({
        success: false,
        message: err.message || 'Error communicating with dispatch server',
      });
      showNotice(err.message || 'Dispatch error', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // =========================================================================
  // TAB 2: PDF TEMPLATES EDITOR STATE
  // =========================================================================
  const [selectedPdfType, setSelectedPdfType] = useState<TemplateType>('ndis_quote');
  const [pdfEditState, setPdfEditState] = useState<any>(() => {
    const saved = invoiceSettings.pdfTemplates?.ndis_quote;
    return sanitizePdfConfig(saved ? { ...DEFAULT_PDF_CONFIGS.ndis_quote, ...saved } : { ...DEFAULT_PDF_CONFIGS.ndis_quote });
  });

  const handleSelectPdfType = (type: TemplateType) => {
    setSelectedPdfType(type);
    const saved = invoiceSettings.pdfTemplates?.[type];
    setPdfEditState(sanitizePdfConfig(saved ? { ...DEFAULT_PDF_CONFIGS[type], ...saved } : { ...DEFAULT_PDF_CONFIGS[type] }));
  };

  const handleSavePdfTemplate = () => {
    const templateWithBank = {
      ...pdfEditState,
      bankName: pdfEditState.bankName || companyForm.bankName,
      accountName: pdfEditState.accountName || companyForm.accountName,
      bsb: pdfEditState.bsb || companyForm.bsb,
      accountNumber: pdfEditState.accountNumber || companyForm.accountNumber,
    };
    const updatedPdfTemplates = {
      ...(invoiceSettings.pdfTemplates || {}),
      [selectedPdfType]: templateWithBank,
    };
    updateInvoiceSettings({
      pdfTemplates: updatedPdfTemplates,
      bankName: templateWithBank.bankName,
      accountName: templateWithBank.accountName,
      bsb: templateWithBank.bsb,
      accountNumber: templateWithBank.accountNumber,
    });
    setCompanyForm((prev) => ({
      ...prev,
      bankName: templateWithBank.bankName,
      accountName: templateWithBank.accountName,
      bsb: templateWithBank.bsb,
      accountNumber: templateWithBank.accountNumber,
    }));
    showNotice(`Saved PDF template for: ${selectedPdfType.toUpperCase()}`);
  };

  const handleResetPdfTemplate = () => {
    const resetConfig = {
      ...DEFAULT_PDF_CONFIGS[selectedPdfType],
      bankName: companyForm.bankName,
      accountName: companyForm.accountName,
      bsb: companyForm.bsb,
      accountNumber: companyForm.accountNumber,
    };
    setPdfEditState(resetConfig);
    const updatedPdfTemplates = {
      ...(invoiceSettings.pdfTemplates || {}),
      [selectedPdfType]: resetConfig,
    };
    updateInvoiceSettings({ pdfTemplates: updatedPdfTemplates });
    showNotice(`Reset PDF template for: ${selectedPdfType.toUpperCase()} to standard defaults`);
  };

  // =========================================================================
  // =========================================================================
  // TAB 3: CUSTOMER RECEIVE FORMATS (EMAIL & PDF DUAL STUDIO) STATE
  // =========================================================================
  const [selectedMailType, setSelectedMailType] = useState<TemplateType>('order');
  const [mailEditState, setMailEditState] = useState<any>(() => {
    const saved = invoiceSettings.mailTemplates?.order;
    return saved ? { ...DEFAULT_MAIL_CONFIGS.order, ...saved } : { ...DEFAULT_MAIL_CONFIGS.order };
  });
  const [mailEditorDevice, setMailEditorDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [mailPreviewMode, setMailPreviewMode] = useState<'email' | 'document'>('email');
  const [editSubTab, setEditSubTab] = useState<'email' | 'pdf'>('email');

  const handleSelectMailType = (type: TemplateType) => {
    setSelectedMailType(type);
    setSelectedPdfType(type);
    const savedMail = invoiceSettings.mailTemplates?.[type];
    setMailEditState(savedMail ? { ...DEFAULT_MAIL_CONFIGS[type], ...savedMail } : { ...DEFAULT_MAIL_CONFIGS[type] });
    const savedPdf = invoiceSettings.pdfTemplates?.[type];
    setPdfEditState(sanitizePdfConfig(savedPdf ? { ...DEFAULT_PDF_CONFIGS[type], ...savedPdf } : { ...DEFAULT_PDF_CONFIGS[type] }));
  };

  const handleSaveMailTemplate = () => {
    const templateWithBank = {
      ...pdfEditState,
      bankName: pdfEditState.bankName || companyForm.bankName,
      accountName: pdfEditState.accountName || companyForm.accountName,
      bsb: pdfEditState.bsb || companyForm.bsb,
      accountNumber: pdfEditState.accountNumber || companyForm.accountNumber,
    };
    const updatedMailTemplates = {
      ...(invoiceSettings.mailTemplates || {}),
      [selectedMailType]: mailEditState,
    };
    const updatedPdfTemplates = {
      ...(invoiceSettings.pdfTemplates || {}),
      [selectedMailType]: templateWithBank,
    };
    updateInvoiceSettings({
      mailTemplates: updatedMailTemplates,
      pdfTemplates: updatedPdfTemplates,
      bankName: templateWithBank.bankName,
      accountName: templateWithBank.accountName,
      bsb: templateWithBank.bsb,
      accountNumber: templateWithBank.accountNumber,
    });
    setCompanyForm((prev) => ({
      ...prev,
      bankName: templateWithBank.bankName,
      accountName: templateWithBank.accountName,
      bsb: templateWithBank.bsb,
      accountNumber: templateWithBank.accountNumber,
    }));
    showNotice(`Saved Email & PDF format settings for: ${selectedMailType.toUpperCase()}`);
  };

  const handleResetMailTemplate = () => {
    setMailEditState({...DEFAULT_MAIL_CONFIGS[selectedMailType] });
    const resetPdfConfig = {
      ...DEFAULT_PDF_CONFIGS[selectedMailType],
      bankName: companyForm.bankName,
      accountName: companyForm.accountName,
      bsb: companyForm.bsb,
      accountNumber: companyForm.accountNumber,
    };
    setPdfEditState(resetPdfConfig);
    const updatedMailTemplates = {
      ...(invoiceSettings.mailTemplates || {}),
      [selectedMailType]: DEFAULT_MAIL_CONFIGS[selectedMailType],
    };
    const updatedPdfTemplates = {
      ...(invoiceSettings.pdfTemplates || {}),
      [selectedMailType]: resetPdfConfig,
    };
    updateInvoiceSettings({
      mailTemplates: updatedMailTemplates,
      pdfTemplates: updatedPdfTemplates,
    });
    showNotice(`Reset Email & PDF formats for: ${selectedMailType.toUpperCase()} to standard defaults`);
  };

  // =========================================================================
  // TAB 4: DISPATCHED DOCUMENTS HISTORY STATE
  // =========================================================================
  const [dispatchedDocs, setDispatchedDocs] = useState<DispatchedDocumentItem[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [historyFilter, setHistoryFilter] = useState<'all' | TemplateType>('all');
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await getDispatchedDocuments();
      if (res && Array.isArray(res.documents)) {
        setDispatchedDocs(res.documents);
      }
    } catch {
      // Best effort load
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  const filteredHistory = useMemo(() => {
    return dispatchedDocs.filter((doc) => {
      const matchType = historyFilter === 'all' || doc.templateId === historyFilter;
      const q = historySearch.toLowerCase().trim();
      if (!q) return matchType;
      return (matchType &&
        (doc.docId?.toLowerCase().includes(q) ||
          doc.customerName?.toLowerCase().includes(q) ||
          doc.customerEmail?.toLowerCase().includes(q)));
    });
  }, [dispatchedDocs, historySearch, historyFilter]);

  // Active PDF template for workflow rendering
  const activeWorkflowPdf =
    invoiceSettings.pdfTemplates?.[selectedTopic] || DEFAULT_PDF_CONFIGS[selectedTopic];

  return (<div className="p-3 sm:p-5 lg:p-6 2xl:p-8 max-w-[1880px] mx-auto space-y-6">
      {/* Toast Notification */}
      {notification && (<div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg flex items-center gap-2.5 text-xs font-bold animate-fade-in ${
            notification.type === 'error' ? 'bg-rose-600 text-white' : 'bg-[#147A7A] text-white'
          }`}
        >
          {notification.type === 'error' ? (<AlertCircle className="w-4 h-4" />) : (<CheckCircle2 className="w-4 h-4" />)}
          <span>{notification.message}</span>
        </div>)}

      {/* HEADER BANNER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-9 h-9 rounded-xl bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Invoice &amp; Document Management Studio
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Centralized generation, editing, previewing, and customer delivery for NDIS quotes, tax invoices, and hire agreements.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600">
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#147A7A]" />
              <span>NDIS</span>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200/80 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>ABN 48 123 456 789</span>
            </span>
          </div>
        </div>

        {/* 5 MAIN NAVIGATION TABS */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => handleSetTab('workflow')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'workflow'
                ? 'bg-[#0F1E2E] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-[#147A7A]" />
            <span>Send Document to Customer (Manual Dispatch)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetTab('pdf_templates')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'pdf_templates'
                ? 'bg-[#0F1E2E] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>PDF Document Formats</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetTab('email_templates')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'email_templates'
                ? 'bg-[#0F1E2E] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-amber-500" />
            <span>Email Formats &amp; Templates (Customer Requests)</span>
          </button>

<button
            type="button"
            onClick={() => handleSetTab('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#0F1E2E] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Dispatched Registry & History</span>
          </button>

          <button
            type="button"
            onClick={() => handleSetTab('company')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'company'
                ? 'bg-[#0F1E2E] text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-indigo-500" />
            <span>Company &amp; Bank Defaults</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: SEND DOCUMENT TO CUSTOMER WORKFLOW */}
      {/* ========================================================================= */}
      {activeTab === 'workflow' && (() => {
        const activeQuote = ndisQuotes.find((q) => q.id === documentId);
        if (activeQuote) {
          const isHire = activeQuote.quoteType === 'hire' || activeQuote.id.toUpperCase().startsWith('HIR');
          return (
            <div className="mb-4 bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/5 border border-teal-500/30 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 shadow-xs animate-fade-in">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-teal-500/20 text-[#147A7A] rounded-xl font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-[#147A7A]">
                      {isHire ? 'Editing Equipment Hire Agreement' : 'Editing NDIS Formal Quotation'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-white text-slate-800 border border-slate-200">
                      ID: {documentId}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase">
                      Status: {activeQuote.status || 'pending'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    Participant / Client: <span className="font-semibold text-slate-900">{activeQuote.customerName}</span> &middot; Total: <span className="font-mono font-bold text-slate-900">${activeQuote.total.toFixed(2)}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveQuoteDraft}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5 text-teal-600" />
                  <span>Save Quote Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmPaymentAndConvertToOrder(documentId)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Payment &amp; Move to Orders</span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/at/quotes')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>Quotes List</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}

      {activeTab === 'workflow' && (<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
          {/* LEFT COLUMN: CONFIGURATION & ITEMS (BALANCED 6 OF 12 COLS) */}
          <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 space-y-5">
            {/* STEP 1: DOCUMENT TYPE & TEMPLATE SELECTION (ARRANGED BY 3 SESSIONS) */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#147A7A] text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Select Document Type &amp; Template</h2>
                    <p className="text-[11px] text-slate-500">Organized into 3 dedicated operational sessions</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-[#147A7A] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60">
                  Active: {CANONICAL_TEMPLATES.find((t) => t.id === selectedTopic)?.shortTitle}
                </span>
              </div>

              {/* 3 SESSIONS: NDIS, HIRE, TRIAL */}
              <div className="space-y-3">
                {/* SESSION 1: NDIS QUOTATION & NDIS INVOICE */}
                <div className="bg-gradient-to-r from-teal-50/50 to-slate-50/70 border border-teal-200/70 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-[#0F766E] uppercase tracking-wider">
                      <ShieldCheck className="w-4 h-4 text-[#147A7A]" />
                      <span>Session 1: NDIS Quotation &amp; NDIS Invoice</span>
                    </div>
                    <span className="text-[10px] font-bold text-teal-700 bg-teal-100/60 px-2 py-0.5 rounded-md">
                      NDIS Funding &amp; PACE Claims
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* NDIS Quote */}
                    {(() => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === 'ndis_quote')!;
                      const isSel = selectedTopic === 'ndis_quote';
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTopic(t.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                            isSel
                              ? 'bg-teal-50/90 border-[#147A7A] ring-2 ring-[#147A7A]/30 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-[#147A7A]" />
                              {t.shortTitle}
                            </span>
                            {isSel && <Check className="w-3.5 h-3.5 text-[#147A7A]" />}
                          </div>
                          <div className="text-[10.5px] font-bold text-[#147A7A] mb-1">{t.badge}</div>
                          <p className="text-[11px] text-slate-500 leading-snug">{t.description}</p>
                        </button>
                      );
                    })()}

                    {/* Tax Invoice */}
                    {(() => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === 'order')!;
                      const isSel = selectedTopic === 'order';
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTopic(t.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                            isSel
                              ? 'bg-blue-50/90 border-blue-600 ring-2 ring-blue-600/30 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <FileCheck2 className="w-4 h-4 text-blue-600" />
                              {t.shortTitle}
                            </span>
                            {isSel && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </div>
                          <div className="text-[10.5px] font-bold text-blue-700 mb-1">{t.badge}</div>
                          <p className="text-[11px] text-slate-500 leading-snug">{t.description}</p>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* SESSION 2: EQUIPMENT HIRE & EQUIPMENT INVOICE */}
                <div className="bg-gradient-to-r from-amber-50/50 to-slate-50/70 border border-amber-200/70 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-amber-900 uppercase tracking-wider">
                      <Truck className="w-4 h-4 text-amber-600" />
                      <span>Session 2: EQUIPMENT HIRE &amp; EQUIPMENT INVOICE</span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded-md">
                      Sanitized Rental Fleet
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Equipment Hire */}
                    {(() => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === 'hire')!;
                      const isSel = selectedTopic === 'hire';
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTopic(t.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                            isSel
                              ? 'bg-amber-50/90 border-amber-600 ring-2 ring-amber-600/30 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <Truck className="w-4 h-4 text-amber-600" />
                              {t.shortTitle}
                            </span>
                            {isSel && <Check className="w-3.5 h-3.5 text-amber-600" />}
                          </div>
                          <div className="text-[10.5px] font-bold text-amber-800 mb-1">{t.badge}</div>
                          <p className="text-[11px] text-slate-500 leading-snug">{t.description}</p>
                        </button>
                      );
                    })()}

                    {/* Commercial Quote */}
                    {(() => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === 'quote')!;
                      const isSel = selectedTopic === 'quote';
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTopic(t.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                            isSel
                              ? 'bg-purple-50/90 border-purple-600 ring-2 ring-purple-600/30 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <Building2 className="w-4 h-4 text-purple-600" />
                              {t.shortTitle}
                            </span>
                            {isSel && <Check className="w-3.5 h-3.5 text-purple-600" />}
                          </div>
                          <div className="text-[10.5px] font-bold text-purple-700 mb-1">{t.badge}</div>
                          <p className="text-[11px] text-slate-500 leading-snug">{t.description}</p>
                        </button>
                      );
                    })()}
                  </div>
                </div>

                {/* SESSION 3: CLINICAL ADVISORY & CONSULTATION */}
                <div className="bg-gradient-to-r from-emerald-50/50 to-slate-50/70 border border-emerald-200/70 rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-900 uppercase tracking-wider">
                      <MessageSquare className="w-4 h-4 text-emerald-600" />
                      <span>Session 3: Clinical Advisory &amp; OT Consultation</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100/60 px-2 py-0.5 rounded-md">
                      Prescribing OT Protocols
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {/* Clinical Advisory */}
                    {(() => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === 'contact')!;
                      const isSel = selectedTopic === 'contact';
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTopic(t.id)}
                          className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between ${
                            isSel
                              ? 'bg-teal-50/90 border-[#147A7A] ring-2 ring-[#147A7A]/30 shadow-xs'
                              : 'bg-white hover:bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                              <MessageSquare className="w-4 h-4 text-teal-600" />
                              {t.shortTitle}
                            </span>
                            {isSel && <Check className="w-3.5 h-3.5 text-[#147A7A]" />}
                          </div>
                          <div className="text-[10.5px] font-bold text-[#147A7A] mb-1">{t.badge}</div>
                          <p className="text-[11px] text-slate-500 leading-snug">{t.description}</p>
                        </button>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Editable Document Title, Reference, Date, Tagline & Terms for this Dispatch */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Document Reference #</label>
                  <input
                    type="text"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Issue Date</label>
                  <input
                    type="date"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Editable Document Main Title</label>
                  <input
                    type="text"
                    value={workflowDocTitle}
                    onChange={(e) => setWorkflowDocTitle(e.target.value)}
                    placeholder="e.g. NDIS ASSISTIVE TECHNOLOGY QUOTATION"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Document Subtitle / Sub-Heading</label>
                  <input
                    type="text"
                    value={workflowDocSubtitle}
                    onChange={(e) => setWorkflowDocSubtitle(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Header Tagline / Badge Text</label>
                  <input
                    type="text"
                    value={workflowTagline}
                    onChange={(e) => setWorkflowTagline(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Terms &amp; Validity Statement</label>
                  <input
                    type="text"
                    value={workflowDocTerms}
                    onChange={(e) => setWorkflowDocTerms(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>
              </div>

              {/* Editable Clinical Assessment, Prescribing OT & Logistics */}
              <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Prescribing OT / Clinician</label>
                  <input
                    type="text"
                    value={workflowPrescribingClinician}
                    onChange={(e) => setWorkflowPrescribingClinician(e.target.value)}
                    placeholder="e.g. Senior OT (AHPRA Registered)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Assessment Reference #</label>
                  <input
                    type="text"
                    value={workflowAssessmentRef}
                    onChange={(e) => setWorkflowAssessmentRef(e.target.value)}
                    placeholder="e.g. AT-ASSESS/2026/0812"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Price Validity</label>
                  <input
                    type="text"
                    value={workflowValidityPeriod}
                    onChange={(e) => setWorkflowValidityPeriod(e.target.value)}
                    placeholder="e.g. Valid for 30 Days"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Delivery ETA / Lead Time</label>
                  <input
                    type="text"
                    value={workflowDeliveryTimeframe}
                    onChange={(e) => setWorkflowDeliveryTimeframe(e.target.value)}
                    placeholder="e.g. 2 - 4 Weeks from Approval"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>
              </div>

              {/* Expandable Company / Provider Header Details Override */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsProviderHeaderOpen(!isProviderHeaderOpen)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[#147A7A] hover:underline cursor-pointer"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{isProviderHeaderOpen ? 'Hide' : 'Customize'} Provider Header &amp; Contact Details for this Document</span>
                </button>

                {isProviderHeaderOpen && (
                  <div className="mt-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Provider Business Name</label>
                      <input
                        type="text"
                        value={workflowProviderName}
                        onChange={(e) => setWorkflowProviderName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">NDIS Provider Registration #</label>
                      <input
                        type="text"
                        value={workflowNdisProviderNo}
                        onChange={(e) => setWorkflowNdisProviderNo(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Australian Business Number (ABN)</label>
                      <input
                        type="text"
                        value={workflowAbn}
                        onChange={(e) => setWorkflowAbn(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Provider Physical Address</label>
                      <input
                        type="text"
                        value={workflowAddress}
                        onChange={(e) => setWorkflowAddress(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Contact Phone</label>
                      <input
                        type="text"
                        value={workflowPhone}
                        onChange={(e) => setWorkflowPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 2: CUSTOMER / RECIPIENT SELECTION */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#147A7A] text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <h2 className="text-sm font-bold text-slate-900">Select Customer / Recipient</h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCustomerPickerOpen(!isCustomerPickerOpen)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#147A7A]/10 hover:bg-[#147A7A]/20 text-[#147A7A] transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Choose from Customer Database</span>
                </button>
              </div>

              {/* Customer Picker Dropdown */}
              {isCustomerPickerOpen && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 animate-fade-in">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search customers by name, email, or phone..."
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#147A7A]"
                    />
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 divide-y divide-slate-100">
                    {customers
                      .filter((c) => {
                        const q = customerSearch.toLowerCase();
                        return (
                          !q ||
                          c.name?.toLowerCase().includes(q) ||
                          c.email?.toLowerCase().includes(q) ||
                          c.phone?.includes(q)
                        );
                      })
                      .map((cust) => (
                        <div
                          key={cust.id}
                          onClick={() => handleSelectCustomer(cust)}
                          className="p-2 hover:bg-white rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-bold text-slate-900">{cust.name}</div>
                            <div className="text-[11px] text-slate-500">{cust.email} • {cust.phone || 'No phone'}</div>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            Select
                          </span>
                        </div>
                      ))}
                    {customers.length === 0 && (
                      <div className="py-3 text-center text-xs text-slate-500 font-medium">
                        No saved customer accounts in database. Enter details manually below.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Customer Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Eleanor Vance"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="e.g. client@example.com.au"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0400 000 000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">NDIS Participant Number</label>
                  <input
                    type="text"
                    value={ndisNumber}
                    onChange={(e) => setNdisNumber(e.target.value)}
                    placeholder="e.g. 430 000 000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Delivery Address</label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Street, Suburb, State, Postcode"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>
              </div>
            </div>

            {/* STEP 3: ITEMS & PRICING */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
              <div className="pb-3 border-b border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-[#147A7A] text-white text-xs font-black flex items-center justify-center shrink-0">
                      3
                    </span>
                    <h2 className="text-sm font-bold text-slate-900">Document Line Items &amp; Pricing</h2>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {items.length} {items.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProductSearchOpen(!isProductSearchOpen);
                      setIsSubProductModalOpen(false);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs ${
                      isProductSearchOpen
                        ? 'bg-[#0F1E2E] text-white'
                        : 'bg-[#147A7A] hover:bg-[#106262] text-white'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Add Catalog</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSubProductModalOpen(!isSubProductModalOpen);
                      setIsProductSearchOpen(false);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isSubProductModalOpen
                        ? 'bg-teal-100 text-[#0F766E] border-teal-300'
                        : 'bg-teal-50 hover:bg-teal-100 text-[#147A7A] border-teal-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#147A7A] shrink-0" />
                    <span className="truncate">Sub-Product</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddNewBlankItem}
                    className="py-2 px-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 shrink-0" />
                    <span className="truncate">Custom Line</span>
                  </button>
                </div>
              </div>

              {/* Quick Add Sub-Product Panel */}
              {isSubProductModalOpen && (
                <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl space-y-2.5 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#147A7A]" />
                      <span>Select Sub-Product / Equipment Accessory to Add as Line Item:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsSubProductModalOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {STANDARD_SUB_PRODUCTS.map((sub) => (
                      <button
                        key={sub.name}
                        type="button"
                        onClick={() => handleAddSubProductAsLineItem(sub)}
                        className="p-2.5 bg-white hover:bg-teal-50 border border-teal-200/80 rounded-xl text-left transition-all hover:shadow-xs group cursor-pointer"
                      >
                        <div className="text-xs font-bold text-slate-900 group-hover:text-[#147A7A] transition-colors">
                          + {sub.name}
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500">
                          <span className="font-mono text-[#0F766E] font-bold">${sub.price.toFixed(2)} AUD</span>
                          <span className="text-[10px] text-teal-700 font-medium">Add to Document →</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Product Catalog Search Modal / Dropdown */}
              {isProductSearchOpen && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5 animate-fade-in shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-[#147A7A]" />
                      <span>Search Catalog by SKU or Product Name:</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsProductSearchOpen(false)}
                      className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Search Bar Input */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Type SKU (e.g. HHPCSETB, IC333) or name (e.g. Bed, Mattress, Pillowcase)..."
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setSearchVisibleLimit(25);
                      }}
                      className="w-full pl-9 pr-9 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all"
                    />
                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setProductSearch('');
                          setSearchVisibleLimit(25);
                        }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Quick Category Filter Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                    {[
                      { id: 'all', label: `All Products (${products.length})` },
                      { id: 'beds', label: '🛏️ Beds & Profiling Deck' },
                      { id: 'pressure', label: '💨 Pressure Care & Mattresses' },
                      { id: 'mobility', label: '♿ Mobility & Seating' },
                      { id: 'accessories', label: '🧩 Accessories & Linen' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setSearchCategoryFilter(cat.id);
                          setSearchVisibleLimit(25);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer ${
                          searchCategoryFilter === cat.id
                            ? 'bg-[#147A7A] text-white shadow-2xs'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Search Results Summary Header */}
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-1 px-1">
                    <span>
                      Showing <strong className="text-slate-800 font-bold">{displayedProducts.length}</strong> of{' '}
                      <strong className="text-slate-800 font-bold">{allMatchedProducts.length}</strong> products
                      {productSearch ? ` matching "${productSearch}"` : ' in catalogue'}:
                    </span>
                    <span className="font-semibold text-teal-800 text-[10.5px]">Exact SKU matches appear first</span>
                  </div>

                  {/* Scrollable Products List */}
                  <div className="max-h-[32rem] overflow-y-auto space-y-3 divide-y divide-slate-100 pr-1">
                    {displayedProducts.map((prod: any) => {
                      const qLower = productSearch.toLowerCase().trim();
                      const isExactSkuMatch =
                        qLower &&
                        ((prod.sku || '').toLowerCase().trim() === qLower ||
                          (prod.variants || []).some((v: any) => (v.sku || '').toLowerCase().trim() === qLower));

                      // Strictly extract ONLY real colours or sizes present in THIS product
                      const rel = getRelatedProductOptions(prod);
                      const hasOptions = rel.sizes.length > 0 || rel.colors.length > 0;

                      return (
                        <div
                          key={prod.id}
                          className={`p-3.5 rounded-2xl border transition-all space-y-2.5 ${
                            isExactSkuMatch
                              ? 'bg-teal-50/70 border-teal-300 ring-1 ring-teal-400/40 shadow-xs'
                              : 'bg-white hover:bg-slate-50/80 border-slate-200/90'
                          }`}
                        >
                          {/* Product Main Row: Image, Full Name, Badges & Price */}
                          <div className="flex items-start justify-between gap-3 text-xs">
                            <div className="flex items-start gap-3 min-w-0 flex-1">
                              {/* High-Clarity Proxied Product Image */}
                              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl border border-slate-200 bg-white shrink-0 p-1 flex items-center justify-center overflow-hidden shadow-2xs">
                                <img
                                  src={proxyImageUrl(prod.image)}
                                  alt={prod.name}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE;
                                  }}
                                  className="w-full h-full object-contain"
                                />
                              </div>

                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <h3 className="font-extrabold text-slate-900 text-xs sm:text-sm leading-snug">
                                    {prod.name}
                                  </h3>
                                  {isExactSkuMatch && (
                                    <span className="px-2 py-0.5 rounded-md bg-[#147A7A] text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                                      ⭐ Exact SKU Match
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5 mt-0.5">
                                  <span className="font-mono font-bold text-[#147A7A] bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                                    SKU: {prod.sku || prod.id}
                                  </span>
                                  <span className="font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {prod.brand || 'AT Specialists'}
                                  </span>
                                  <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                    {prod.category || 'General Equipment'}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="font-mono text-sm sm:text-base font-black text-slate-900">
                                ${Number(prod.price || prod.buyPrice || 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD
                              </div>
                              <button
                                type="button"
                                onClick={() => handleAddProductItem(prod)}
                                className="mt-1 px-3 py-1.5 rounded-lg bg-[#147A7A] hover:bg-[#106262] text-white text-[11px] font-bold transition-all cursor-pointer shadow-2xs flex items-center gap-1 ml-auto"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add Item</span>
                              </button>
                            </div>
                          </div>

                          {/* Options: ONLY rendered if THIS product has real colours or sizes in the catalog */}
                          {hasOptions && (
                            <div className="pt-2 border-t border-slate-100 space-y-2 text-[10.5px]">
                              {/* Colours (ONLY IF PRESENT IN THIS PRODUCT) */}
                              {rel.colors.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px] flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-[#147A7A]" />
                                    <span>Available Colours:</span>
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {rel.colors.map((col) => (
                                      <button
                                        key={col.name}
                                        type="button"
                                        onClick={() => handleAddProductItem(prod, undefined, col.name)}
                                        className="px-2.5 py-1 rounded-lg text-[10.5px] font-medium bg-white hover:bg-slate-900 hover:text-white text-slate-700 border border-slate-200 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
                                      >
                                        {col.hex && (
                                          <span
                                            className="w-2.5 h-2.5 rounded-full border border-slate-300 shrink-0"
                                            style={{ backgroundColor: col.hex }}
                                          />
                                        )}
                                        <span>+ {col.name.split('/')[0].trim()}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Sizes (ONLY IF PRESENT IN THIS PRODUCT) */}
                              {rel.sizes.length > 0 && (
                                <div className="space-y-1">
                                  <span className="font-bold text-slate-500 uppercase tracking-wider text-[9.5px] flex items-center gap-1">
                                    <Tag className="w-3 h-3 text-[#147A7A]" />
                                    <span>Available Sizes:</span>
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {rel.sizes.map((sz) => (
                                      <button
                                        key={sz}
                                        type="button"
                                        onClick={() => handleAddProductItem(prod, sz)}
                                        className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold bg-white hover:bg-[#147A7A] hover:text-white text-slate-700 border border-slate-200 hover:border-[#147A7A] transition-all cursor-pointer shadow-2xs"
                                      >
                                        + {sz}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {displayedProducts.length === 0 && (
                      <div className="py-8 text-center space-y-2">
                        <Package className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-bold text-slate-700">No products match your search or filter</p>
                        <p className="text-[11px] text-slate-500">
                          Try typing a different SKU (e.g. &ldquo;BA4240&rdquo;, &ldquo;HHPCSETB&rdquo;) or click &ldquo;All Products&rdquo;.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Load More & Pagination Bar */}
                  {allMatchedProducts.length > displayedProducts.length && (
                    <div className="pt-3 pb-1 flex flex-wrap items-center justify-center gap-2.5 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setSearchVisibleLimit((prev) => prev + 30)}
                        className="px-4 py-2 bg-white hover:bg-teal-50 text-[#147A7A] border border-teal-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Load Next 30 Products</span>
                        <span className="text-[10px] text-teal-700 bg-teal-100/80 px-2 py-0.5 rounded-full font-mono font-bold">
                          {allMatchedProducts.length - displayedProducts.length} remaining
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSearchVisibleLimit(allMatchedProducts.length)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Show All ({allMatchedProducts.length})
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State Banner when no items are present */}
              {items.length === 0 && !isProductSearchOpen && !isSubProductModalOpen && (
                <div className="p-6 text-center bg-slate-50/80 border border-dashed border-slate-200 rounded-2xl space-y-2 animate-fade-in">
                  <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-200 text-[#147A7A] flex items-center justify-center mx-auto">
                    <Package className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">No line items in this document yet</p>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    Click &ldquo;Add from Catalog&rdquo; above to search products by SKU or name, or click &ldquo;Custom Line&rdquo; to add a custom clinical item.
                  </p>
                </div>
              )}

              {/* Line Items List */}
              <div className="space-y-3">
                {items.map((it, idx) => {
                  const linkedProduct = products.find(
                    (p: any) =>
                      (p.sku && p.sku === it.code) ||
                      p.id === it.productId ||
                      p.name === it.name ||
                      (Array.isArray(p.variants) && p.variants.some((v: any) => v.sku === it.code))
                  );

                  const rel = linkedProduct
                    ? getRelatedProductOptions(linkedProduct)
                    : {
                        sizes: it.availableSizes || (it.size ? [it.size] : []),
                        colors: it.availableColors || (it.color ? [{ name: it.color }] : []),
                        subProducts: it.availableSubProducts || (it.subProducts ? it.subProducts.map((n) => ({ name: n })) : []),
                        variants: [],
                        isBedOrMattress: isRealBedOrMattress({ name: it.name }),
                      };

                  const hasSize = rel.sizes.length > 0 || !!it.size;
                  const hasColor = rel.colors.length > 0 || !!it.color;
                  const hasSub = rel.subProducts.length > 0 || (it.subProducts && it.subProducts.length > 0);

                  return (
                    <div
                      key={it.id || idx}
                      className="p-4 bg-white border border-slate-200/90 rounded-2xl shadow-xs space-y-3.5 hover:border-slate-300 transition-all"
                    >
                      {/* Row 1: Item Header (Number, Description Input, Active Badges, and Trash) */}
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-lg bg-teal-50 border border-teal-200 text-[#147A7A] text-[11px] font-black flex items-center justify-center shrink-0 mt-1">
                          {idx + 1}
                        </div>

                        <div className="flex-1 space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <label className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">
                              Item Description &amp; Technical Specifications
                            </label>
                            <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                              {it.size && (
                                <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                                  Size: {it.size}
                                </span>
                              )}
                              {it.color && (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-300">
                                  Colour: {it.color}
                                </span>
                              )}
                              {it.subProducts && it.subProducts.length > 0 && (
                                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  +{it.subProducts.length} Sub-Products
                                </span>
                              )}
                            </div>
                          </div>
                          <input
                            type="text"
                            value={it.name}
                            onChange={(e) => handleItemChange(it.id, 'name', e.target.value)}
                            placeholder="e.g. Icare IC333 Hi-Lo Electric Adjustable Bed"
                            className="w-full bg-slate-50/70 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#147A7A] transition-all"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all cursor-pointer shrink-0 mt-1"
                          title="Delete line item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Row 2: Parameters Grid (Code, Qty, Unit Rate, Line Total) */}
                      <div className="grid grid-cols-2 sm:grid-cols-12 gap-3 items-end bg-slate-50/80 p-3 rounded-xl border border-slate-200/80">
                        <div className="col-span-2 sm:col-span-4 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            NDIS Code / SKU
                          </label>
                          <input
                            type="text"
                            value={it.code}
                            onChange={(e) => handleItemChange(it.id, 'code', e.target.value)}
                            placeholder="e.g. 05_120603099_0105_1_2 or SKU"
                            className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:border-[#147A7A]"
                          />
                        </div>

                        <div className="col-span-1 sm:col-span-2 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Quantity
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={it.quantity}
                            onChange={(e) =>
                              handleItemChange(it.id, 'quantity', Math.max(1, parseInt(e.target.value, 10) || 1))
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-center focus:outline-none focus:border-[#147A7A]"
                          />
                        </div>

                        <div className="col-span-1 sm:col-span-3 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Unit Rate ($AUD)
                          </label>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={it.price}
                              onChange={(e) => handleItemChange(it.id, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-mono font-bold focus:outline-none focus:border-[#147A7A]"
                            />
                          </div>
                        </div>

                        <div className="col-span-2 sm:col-span-3 text-right space-y-0.5 pb-1">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Line Total</div>
                          <div className="font-mono text-sm font-black text-slate-900">
                            ${Number(it.amount || (Number(it.price || 0) * Number(it.quantity || 1))).toFixed(2)} AUD
                          </div>
                        </div>
                      </div>

                      {/* Row 3: Size & Colour (ONLY rendered if THIS item has sizes or colours) */}
                      {(hasSize || hasColor) && (
                        <div className={`grid grid-cols-1 ${hasSize && hasColor ? 'md:grid-cols-2' : ''} gap-3 pt-2 border-t border-slate-100`}>
                          {/* Size Selection */}
                          {hasSize && (
                            <div className="space-y-1.5 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/70">
                              <div className="flex items-center justify-between">
                                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                  <Tag className="w-3.5 h-3.5 text-[#147A7A]" />
                                  <span>Size:</span>
                                </span>
                                {it.size && (
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(it.id, 'size', '')}
                                    className="text-[10px] text-slate-400 hover:text-rose-600 font-medium flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" /> Clear
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {rel.sizes.map((sz) => {
                                  const isSelected = it.size === sz;
                                  return (
                                    <button
                                      key={sz}
                                      type="button"
                                      onClick={() => handleItemChange(it.id, 'size', isSelected ? '' : sz)}
                                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#147A7A] text-white shadow-2xs ring-2 ring-[#147A7A]/25'
                                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                      }`}
                                    >
                                      {isSelected && <Check className="w-3 h-3 text-white stroke-[3]" />}
                                      <span>{sz}</span>
                                    </button>
                                  );
                                })}

                                <input
                                  type="text"
                                  value={rel.sizes.includes(it.size || '') ? '' : (it.size || '')}
                                  onChange={(e) => handleItemChange(it.id, 'size', e.target.value)}
                                  placeholder="Other size..."
                                  className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10.5px] font-medium text-slate-700 focus:outline-none focus:border-[#147A7A]"
                                />
                              </div>
                            </div>
                          )}

                          {/* Colour Selection */}
                          {hasColor && (
                            <div className="space-y-1.5 bg-slate-50/60 p-2.5 rounded-xl border border-slate-200/70">
                              <div className="flex items-center justify-between">
                                <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                                  <Sparkles className="w-3.5 h-3.5 text-[#147A7A]" />
                                  <span>Colour / Finish:</span>
                                </span>
                                {it.color && (
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(it.id, 'color', '')}
                                    className="text-[10px] text-slate-400 hover:text-rose-600 font-medium flex items-center gap-0.5 cursor-pointer"
                                  >
                                    <X className="w-3 h-3" /> Clear
                                  </button>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5">
                                {rel.colors.map((col) => {
                                  const isSelected = it.color === col.name;
                                  return (
                                    <button
                                      key={col.name}
                                      type="button"
                                      onClick={() => handleItemChange(it.id, 'color', isSelected ? '' : col.name)}
                                      className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                                        isSelected
                                          ? 'bg-slate-900 text-white shadow-2xs ring-2 ring-slate-900/30'
                                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                                      }`}
                                    >
                                      {col.hex && (
                                        <span
                                          className="w-2.5 h-2.5 rounded-full border border-slate-300"
                                          style={{ backgroundColor: col.hex }}
                                        />
                                      )}
                                      <span>{col.name.split('/')[0].trim()}</span>
                                    </button>
                                  );
                                })}

                                <input
                                  type="text"
                                  value={rel.colors.some((c) => c.name === it.color) ? '' : (it.color || '')}
                                  onChange={(e) => handleItemChange(it.id, 'color', e.target.value)}
                                  placeholder="Custom colour..."
                                  className="w-28 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10.5px] font-medium text-slate-700 focus:outline-none focus:border-[#147A7A]"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Row 4: Sub Products / Add-ons (ONLY rendered if THIS item has sub-products) */}
                      {hasSub && (
                        <div className="pt-2 border-t border-slate-100 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                              <Plus className="w-3.5 h-3.5 text-[#147A7A]" />
                              <span>Sub Products / Add-ons Attached:</span>
                            </span>
                            <span className="text-[10px] text-slate-400">Click any accessory to toggle on/off</span>
                          </div>

                          {/* Active Sub Products Badges */}
                          {it.subProducts && it.subProducts.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 p-2 bg-teal-50/70 border border-teal-200 rounded-xl">
                              {it.subProducts.map((subName, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-teal-300 text-[#0F766E] text-[10.5px] font-bold shadow-2xs"
                                >
                                  <span>✓ {subName}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = (it.subProducts || []).filter((_, i) => i !== sIdx);
                                      handleItemChange(it.id, 'subProducts', updated.length > 0 ? updated : undefined);
                                    }}
                                    className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Sub-product toggle pills */}
                          <div className="flex flex-wrap gap-1.5">
                            {rel.subProducts.map((sub) => {
                              const isAttached = (it.subProducts || []).includes(sub.name);
                              return (
                                <button
                                  key={sub.name}
                                  type="button"
                                  onClick={() => {
                                    const curr = it.subProducts || [];
                                    const updated = isAttached
                                      ? curr.filter((s) => s !== sub.name)
                                      : [...curr, sub.name];
                                    handleItemChange(it.id, 'subProducts', updated.length > 0 ? updated : undefined);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                                    isAttached
                                      ? 'bg-[#147A7A] text-white shadow-2xs ring-1 ring-[#147A7A]'
                                      : 'bg-white hover:bg-teal-50 hover:text-[#147A7A] text-slate-600 border border-slate-200'
                                  }`}
                                >
                                  {isAttached ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : <Plus className="w-2.5 h-2.5" />}
                                  <span>{sub.name}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Custom sub-product text input */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <input
                              type="text"
                              value={customSubProductInput[it.id] || ''}
                              onChange={(e) =>
                                setCustomSubProductInput((prev) => ({ ...prev, [it.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  const val = (customSubProductInput[it.id] || '').trim();
                                  if (val) {
                                    const curr = it.subProducts || [];
                                    if (!curr.includes(val)) {
                                      handleItemChange(it.id, 'subProducts', [...curr, val]);
                                    }
                                    setCustomSubProductInput((prev) => ({ ...prev, [it.id]: '' }));
                                  }
                                }
                              }}
                              placeholder="Type custom accessory or sub-product & press Enter..."
                              className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] focus:bg-white focus:outline-none focus:border-[#147A7A]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const val = (customSubProductInput[it.id] || '').trim();
                                if (val) {
                                  const curr = it.subProducts || [];
                                  if (!curr.includes(val)) {
                                    handleItemChange(it.id, 'subProducts', [...curr, val]);
                                  }
                                  setCustomSubProductInput((prev) => ({ ...prev, [it.id]: '' }));
                                }
                              }}
                              className="px-3 py-1 bg-teal-50 hover:bg-teal-100 text-[#147A7A] border border-teal-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                            >
                              + Add Sub-Product
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Quick Add Specification Buttons (if item has no attached options) */}
                      {!hasSize && !hasColor && !hasSub && (
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[10.5px] text-slate-500 border-t border-slate-100/80">
                          <button
                            type="button"
                            onClick={() => handleItemChange(it.id, 'size', 'Standard')}
                            className="hover:text-[#147A7A] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus className="w-3 h-3 text-[#147A7A]" /> Add Size Spec
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => handleItemChange(it.id, 'color', 'Standard')}
                            className="hover:text-[#147A7A] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus className="w-3 h-3 text-[#147A7A]" /> Add Colour Spec
                          </button>
                          <span className="text-slate-300">•</span>
                          <button
                            type="button"
                            onClick={() => handleItemChange(it.id, 'subProducts', ['Standard Accessory'])}
                            className="hover:text-[#147A7A] hover:underline flex items-center gap-1 cursor-pointer font-medium"
                          >
                            <Plus className="w-3 h-3 text-[#147A7A]" /> Add Sub-Product
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totals & Delivery Adjustment Card */}
              <div className="p-4 bg-slate-50/90 border border-slate-200/90 rounded-2xl space-y-3 text-xs shadow-2xs">
                {/* Freight & Delivery Row */}
                <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#147A7A]" />
                    <span className="font-bold text-slate-700 text-xs">Freight &amp; Delivery:</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={deliveryFee}
                      onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                      className="w-28 bg-white border border-slate-200 rounded-lg pl-6 pr-2.5 py-1.5 font-mono font-bold text-slate-900 text-right focus:outline-none focus:border-[#147A7A] shadow-2xs"
                    />
                  </div>
                </div>

                {/* Subtotal & Grand Total Stack */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-slate-600 text-xs">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-mono font-bold text-slate-800">${subtotal.toFixed(2)} AUD</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-900 pt-2 border-t border-slate-200">
                    <span className="text-sm font-extrabold">Grand Total</span>
                    <span className="text-base font-black text-[#147A7A] font-mono">${total.toFixed(2)} AUD</span>
                  </div>
                  <div className="text-[10px] text-emerald-800 font-semibold text-right pt-0.5">
                    GST-Free Medical Exemption (pursuant to Sec 38-45)
                  </div>
                </div>
              </div>

              {/* Notes & Statutory Notice Controls */}
              <div className="pt-3 border-t border-slate-100 space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Document Notes &amp; Clinician Instructions</label>
                  <textarea
                    rows={2}
                    value={documentNotes}
                    onChange={(e) => setDocumentNotes(e.target.value)}
                    placeholder="Enter clinical notes, delivery lead times, trial guidelines or special remarks..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={workflowShowStatutory}
                        onChange={(e) => setWorkflowShowStatutory(e.target.checked)}
                        className="w-4 h-4 text-[#147A7A] rounded cursor-pointer"
                      />
                      <span>Include Legal &amp; GST Exemption Statutory Notice Box</span>
                    </label>
                  </div>

                  {workflowShowStatutory && (<textarea
                      rows={2}
                      value={workflowStatutoryText}
                      onChange={(e) => setWorkflowStatutoryText(e.target.value)}
                      placeholder="Statutory notice text..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-[11px] font-medium focus:outline-none focus:border-[#147A7A]"
                    />)}
                </div>
              </div>
            </div>

            {/* STEP 4: EDITABLE EMAIL DISPATCH & BANK REMITTANCE */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#147A7A] text-white text-xs font-black flex items-center justify-center">
                  4
                </span>
                <h2 className="text-sm font-bold text-slate-900">Dispatch Document &amp; Email Customization</h2>
              </div>

              {/* Editable Email Subject & Message for Customer */}
              <div className="p-4 bg-teal-50/40 border border-teal-200/80 rounded-xl space-y-3 text-xs">
                <div className="font-bold text-xs text-[#147A7A] flex items-center gap-1.5 border-b border-teal-200/60 pb-1.5">
                  <Mail className="w-4 h-4" />
                  <span>Customer Email Subject &amp; Message (Fully Editable Before Sending)</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    value={workflowEmailSubject}
                    onChange={(e) => setWorkflowEmailSubject(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-900 focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Message / Body Content</label>
                  <textarea
                    rows={3}
                    value={workflowEmailBody}
                    onChange={(e) => setWorkflowEmailBody(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs font-medium focus:outline-none focus:border-[#147A7A]"
                  />
                </div>
              </div>

              {/* Editable Direct Bank EFT Details */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="font-bold text-xs text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                  <Building2 className="w-4 h-4 text-[#147A7A]" />
                  <span>Direct Bank Transfer (EFT) Remittance Coordinates</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      value={workflowBankName}
                      onChange={(e) => setWorkflowBankName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Account Name</label>
                    <input
                      type="text"
                      value={workflowAccountName}
                      onChange={(e) => setWorkflowAccountName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">BSB</label>
                    <input
                      type="text"
                      value={workflowBsb}
                      onChange={(e) => setWorkflowBsb(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Account Number</label>
                    <input
                      type="text"
                      value={workflowAccountNumber}
                      onChange={(e) => setWorkflowAccountNumber(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              {sendResult && (<div
                  className={`p-3.5 rounded-xl text-xs font-semibold ${
                    sendResult.success
                      ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                      : 'bg-rose-50 text-rose-900 border border-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {sendResult.success ? (<CheckCircle2 className="w-4 h-4 text-emerald-600" />) : (<AlertCircle className="w-4 h-4 text-rose-600" />)}
                    <span>{sendResult.message}</span>
                  </div>
                  {sendResult.viewUrl && (<div className="mt-2 pt-2 border-t border-emerald-200/60 flex items-center gap-3">
                      <a
                        href={sendResult.viewUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Public Verified Document</span>
                      </a>
                    </div>)}
                </div>)}

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleDispatchDocument}
                  disabled={isSending || !customerEmail}
                  className="w-full sm:flex-1 py-3 px-5 rounded-xl bg-[#147A7A] hover:bg-[#106262] disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer hover:scale-[1.01]"
                >
                  {isSending ? (<RefreshCw className="w-4 h-4 animate-spin" />) : (<Send className="w-4 h-4" />)}
                  <span>
                    {isSending
                      ? 'Dispatching via SMTP...'
                      : `Send ${CANONICAL_TEMPLATES.find((t) => t.id === selectedTopic)?.shortTitle} to Customer`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isGeneratingPdf}
                  className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isGeneratingPdf ? (<RefreshCw className="w-4 h-4 animate-spin" />) : (<Download className="w-4 h-4 text-slate-600" />)}
                  <span>Download A4 PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LIVE DUAL-MODE PREVIEW (BALANCED 6 OF 12 COLS) */}
          <div className="lg:col-span-6 xl:col-span-6 2xl:col-span-6 space-y-4 lg:sticky lg:top-4 self-start">
            {/* Mode Switcher */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWorkflowPreviewMode('document')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    workflowPreviewMode === 'document'
                      ? 'bg-[#147A7A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>A4 PDF Document View</span>
                </button>

                <button
                  type="button"
                  onClick={() => setWorkflowPreviewMode('email')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    workflowPreviewMode === 'email'
                      ? 'bg-[#147A7A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Customer Email View</span>
                </button>
              </div>

              {workflowPreviewMode === 'email' && (<div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setEmailPreviewDevice('desktop')}
                    className={`p-1.5 rounded ${
                      emailPreviewDevice === 'desktop' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailPreviewDevice('mobile')}
                    className={`p-1.5 rounded ${
                      emailPreviewDevice === 'mobile' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>)}
            </div>

            {/* PREVIEW 1: EXACT PREVIOUS A4 DOCUMENT PREVIEW */}
            {workflowPreviewMode === 'document' && (<div className="bg-slate-100/90 p-3 sm:p-5 lg:p-6 rounded-2xl border border-slate-200/80 max-h-[920px] overflow-y-auto print:max-h-none print:overflow-visible print:bg-white print:p-0 print:border-none shadow-inner">
                <div
                  ref={a4PreviewRef}
                  id="printable-a4-document"
                  className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 lg:p-9 text-black space-y-5 max-w-[880px] mx-auto print:shadow-none print:border-none print:p-0 print:m-0 print:max-w-none"
                >
                  {/* Header Bar */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-900 pb-3">
                    <img
                      src={logoHeaderImg}
                      crossOrigin="anonymous"
                      alt={workflowProviderName || companyForm.companyName}
                      className="h-12 sm:h-14 w-auto object-contain"
                    />

                    <div className="text-left sm:text-right text-[11px] leading-tight space-y-0.5">
                      <p className="font-bold text-[#147A7A]">NDIS Provider</p>
                      <p className="font-mono font-bold text-black">ABN: {workflowAbn || companyForm.abn}</p>
                      <p className="text-slate-700">{workflowAddress || companyForm.address}</p>
                      <p className="text-slate-700">Phone: <span className="font-mono">{workflowPhone || companyForm.phone}</span> &bull; Web: {workflowWebsite || (companyForm as any).website || 'atspecialists.com.au'}</p>
                    </div>
                  </div>

                  {/* Document Title & Reference */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                    <div>
                      <h1 className="text-base sm:text-lg font-black text-black tracking-tight uppercase">
                        {workflowDocTitle || activeWorkflowPdf.title}
                      </h1>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="font-mono font-black text-xs sm:text-sm bg-slate-100 border border-slate-300 px-3 py-1 rounded inline-block text-black">
                        #{documentId}
                      </span>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        Date of Issue: {docDate ? formatDisplayDate(docDate) : formatDisplayDate()}
                      </div>
                    </div>
                  </div>

                  {/* 2-Column Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs text-black">
                    {/* Left Box: Customer / Participant Record */}
                    <div className="border border-slate-300 p-3.5 rounded-xl space-y-1.5 bg-slate-50/70">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-black border-b border-slate-300 pb-1 flex items-center justify-between">
                        <span>{selectedTopic === 'ndis_quote' ? 'NDIS Participant Details:' : 'Customer Details:'}</span>
                        {selectedTopic === 'ndis_quote' ? (<span className="font-mono text-[#147A7A] font-bold">
                            {ndisNumber ? `NDIS #${ndisNumber}` : 'NDIS'}
                          </span>) : (<span className="font-bold text-slate-700">Commercial Client</span>)}
                      </div>
                      <p className="font-bold text-sm text-black pt-0.5">
                        {customerName || 'Valued Client'}
                      </p>
                      <p>
                        <span className="text-slate-600">Delivery Address:</span>{' '}
                        <strong className="text-black">{deliveryAddress || 'On File / Prescribed Address'}</strong>
                      </p>
                      <p>
                        <span className="text-slate-600">Phone:</span>{' '}
                        <strong className="text-black font-mono">{customerPhone || companyForm.phone}</strong>
                      </p>
                      {customerEmail && (<p>
                          <span className="text-slate-600">Email:</span>{' '}
                          <strong className="text-black font-mono">{customerEmail}</strong>
                        </p>)}
                    </div>

                    {/* Right Box: Plan Manager / Remittance Terms */}
                    <div className="border border-slate-300 p-3.5 rounded-xl space-y-1.5 bg-slate-50/70">
                      <div className="font-bold text-[10.5px] uppercase tracking-wider text-black border-b border-slate-300 pb-1 flex items-center justify-between">
                        <span>
                          {selectedTopic === 'ndis_quote'
                            ? 'Plan Management & Remittance:'
                            : selectedTopic === 'contact'
                            ? 'Clinical Advisory Details:'
                            : selectedTopic === 'hire'
                            ? 'Hire Tenure & Agreement:'
                            : 'Quotation Terms & Validity:'}
                        </span>
                        <span className="text-[10px] font-bold text-[#147A7A]">
                          {selectedTopic === 'contact'
                            ? 'SPECIALIST ADVICE'
                            : selectedTopic === 'ndis_quote'
                            ? planManager || 'NDIS'
                            : workflowTagline || activeWorkflowPdf.tagline || '30 Days Validity'}
                        </span>
                      </div>
                      <p className="font-bold text-sm text-black pt-0.5">
                        {selectedTopic === 'ndis_quote'
                          ? planManager || 'Self-Managed Participant'
                          : 'Commercial Purchasing Entity'}
                      </p>
                      {selectedTopic === 'ndis_quote' && (planManagerEmail || customerEmail) && (<p>
                          <span className="text-slate-600">Claims Email:</span>{' '}
                          <strong className="text-black font-mono">{planManagerEmail || customerEmail}</strong>
                        </p>)}
                      <p>
                        <span className="text-slate-600">Terms:</span>{' '}
                        <strong>{workflowDocTerms || activeWorkflowPdf.terms || 'Strictly 14 Days Net (ATO & NDIS Standard)'}</strong>
                      </p>
                      <div className="text-[10.5px] text-slate-700 pt-1.5 border-t border-slate-200/90 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <span><span className="text-slate-500 font-semibold">Bank:</span> <strong className="text-slate-900">{workflowBankName || companyForm.bankName}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span><span className="text-slate-500 font-semibold">BSB:</span> <strong className="font-mono text-slate-900">{workflowBsb || companyForm.bsb}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span><span className="text-slate-500 font-semibold">Acc:</span> <strong className="font-mono text-slate-900">{workflowAccountNumber || companyForm.accountNumber}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Itemized Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-t-2 border-b-2 border-slate-900 font-bold uppercase text-[10.5px] text-black">
                          <th className="py-2.5 text-left w-36">{selectedTopic === 'ndis_quote' ? 'Support Item Code' : 'Item Code / SKU'}</th>
                          <th className="py-2.5 text-left">Equipment Description &amp; Technical Specifications</th>
                          <th className="py-2.5 text-center w-14">Qty</th>
                          <th className="py-2.5 text-right w-28">Unit Rate</th>
                          <th className="py-2.5 text-right w-20">GST</th>
                          <th className="py-2.5 text-right w-28">Line Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {items.map((it) => (<tr key={it.id}>
                            <td className="py-3 font-mono font-bold text-[10.5px] text-[#147A7A] align-top">
                              {it.code || (selectedTopic === 'ndis_quote' ? '05_120603099_0105_1_2' : 'AT-PRD-01')}
                            </td>
                            <td className="py-3 align-top pr-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-black text-[12.5px]">
                                  {it.name || 'Assistive Rehabilitation Technology'}
                                </span>
                                {it.size && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                                    Size: {it.size}
                                  </span>
                                )}
                                {it.color && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
                                    Colour: {it.color}
                                  </span>
                                )}
                              </div>
                              {it.subProducts && it.subProducts.length > 0 && (
                                <div className="text-[10.5px] text-slate-700 mt-1 space-y-0.5">
                                  <span className="font-bold text-[#147A7A]">Sub Products &amp; Accessories:</span>
                                  <ul className="list-disc list-inside pl-1 text-[10px] text-slate-600 space-y-0.5">
                                    {it.subProducts.map((sub, sIdx) => (
                                      <li key={sIdx}>{sub}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              {it.detail && (<div className="text-[10.5px] text-slate-600 mt-0.5 leading-snug">
                                  {it.detail}
                                </div>)}
                            </td>
                            <td className="py-3 text-center align-top font-bold text-black">{it.quantity || 1}</td>
                            <td className="py-3 text-right font-mono align-top text-black">${Number(it.price || 0).toFixed(2)}</td>
                            <td className="py-3 text-right font-mono align-top text-slate-600 text-[10.5px]">GST-Free</td>
                            <td className="py-3 text-right font-mono font-bold align-top text-black">
                              ${Number(it.amount || (Number(it.price || 0) * Number(it.quantity || 1))).toFixed(2)}
                            </td>
                          </tr>))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary & Terms */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3 border-t-2 border-slate-900 items-center">
                    <div className="sm:col-span-7 text-[11px] text-slate-600 space-y-1">
                      {(documentNotes || activeWorkflowPdf.notes) && (<p className="leading-snug text-slate-700 font-medium">
                          {documentNotes || activeWorkflowPdf.notes}
                        </p>)}
                      {workflowShowStatutory && (workflowStatutoryText || activeWorkflowPdf.statutoryNoticeText) && (<p className="leading-snug text-slate-600 text-[10px] pt-1 border-t border-slate-200">
                          {workflowStatutoryText || activeWorkflowPdf.statutoryNoticeText}
                        </p>)}
                    </div>

                    <div className="sm:col-span-5 space-y-1.5 text-right text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Subtotal (Excl. GST):</span>
                        <span className="font-mono font-bold text-black">${subtotal.toFixed(2)} AUD</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Freight &amp; Delivery:</span>
                        <span className="font-mono font-bold text-emerald-800">
                          {deliveryFee > 0 ? `$${deliveryFee.toFixed(2)} AUD` : 'INCLUDED'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">GST (0%):</span>
                        <span className="font-mono font-bold text-slate-700">$0.00</span>
                      </div>
                      <div className="flex justify-between pt-1.5 border-t-2 border-slate-900 text-sm sm:text-base font-black text-black">
                        <span>TOTAL AMOUNT:</span>
                        <span className="font-mono text-[#147A7A]">${total.toFixed(2)} AUD</span>
                      </div>
                    </div>
                  </div>

                  {/* Direct Bank EFT Remittance Card */}
                  <div className="border border-teal-200 bg-teal-50/60 rounded-xl p-4 text-xs space-y-2">
                    <div className="flex items-center justify-between border-b border-teal-200/80 pb-2">
                      <span className="font-bold text-sm text-[#147A7A] flex items-center gap-1.5">
                        <Building2 className="w-4 h-4" />
                        {workflowBankTitle || activeWorkflowPdf.bankTitle || 'Direct Bank Transfer (EFT) Remittance Details:'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-600">Reference: <strong>#{documentId}</strong></span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                      <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-semibold block">Bank</span>
                        <span className="font-bold text-slate-900 text-[11px] block leading-snug">{workflowBankName || companyForm.bankName}</span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-semibold block">Account Name</span>
                        <span className="font-bold text-slate-900 text-[11px] block leading-snug">{workflowAccountName || companyForm.accountName}</span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-semibold block">BSB</span>
                        <span className="font-mono font-black text-slate-900 text-xs block">{workflowBsb || companyForm.bsb}</span>
                      </div>

                      <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                        <span className="text-[10px] text-slate-500 font-semibold block">Account Number</span>
                        <span className="font-mono font-black text-slate-900 text-xs block">{workflowAccountNumber || companyForm.accountNumber}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quotation Acceptance Slip */}
                  <div className="pt-2">
                    <div className="text-center text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest border-b border-dashed border-slate-400 pb-1 mb-2.5">
                      &#9986; ----------------- DOCUMENT ACCEPTANCE SLIP (RETURN COPY) ----------------- &#9986;
                    </div>

                    <div className="border border-slate-300 p-3 rounded-xl text-xs bg-slate-50 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
                        <span className="font-black uppercase tracking-wider text-[11px] text-black">
                          {selectedTopic === 'ndis_quote' ? 'Participant & Plan Manager Authorization' : 'Client Purchase Authorization'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-700">
                          Ref: <strong>#{documentId}</strong> &bull; Total: <strong>${total.toFixed(2)} AUD</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        <div className="border border-slate-200 bg-white p-2.5 rounded-lg space-y-1">
                          <span className="font-bold block text-[10px] text-slate-700 uppercase">
                            {selectedTopic === 'ndis_quote' ? 'Participant / Nominee Approval:' : 'Client Approval Signature:'}
                          </span>
                          <div className="pt-6 border-b border-slate-300" />
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>Authorized Signature</span>
                            <span>Date: ____ / ____ / 2026</span>
                          </div>
                        </div>

                        <div className="border border-slate-200 bg-white p-2.5 rounded-lg space-y-1">
                          <span className="font-bold block text-[10px] text-slate-700 uppercase">
                            {selectedTopic === 'ndis_quote' ? 'Plan Manager Sign-off / Claim Ref:' : 'Purchase Order Number:'}
                          </span>
                          <div className="text-[10px] text-slate-700 font-mono">PO / Claim Ref: ______________________</div>
                          <div className="pt-2 border-b border-slate-300" />
                          <div className="flex justify-between text-[9px] text-slate-500">
                            <span>Authorized Officer Signature</span>
                            <span>Date: ____ / ____ / 2026</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="border-t border-slate-300 pt-3 text-center text-[10px] text-slate-500 leading-normal">
                    <p className="font-bold text-slate-700">
                      {workflowProviderName || companyForm.companyName} &bull; ABN: {workflowAbn || companyForm.abn} &bull; NDIS Provider
                    </p>
                    <p className="mt-0.5">
                      {workflowFooterText || `Remittance inquiries: ${companyForm.email} • Phone: ${workflowPhone || companyForm.phone} • ${workflowAddress || companyForm.address}`}
                    </p>
                  </div>
                </div>
              </div>)}

            {/* PREVIEW 2: EXACT EMAIL PREVIEW */}
            {workflowPreviewMode === 'email' && (<div className="bg-slate-100 p-3 sm:p-5 rounded-2xl border border-slate-200/80">
                <ExactEmailPreview
                  templateId={selectedTopic}
                  previewDevice={emailPreviewDevice}
                  docId={documentId}
                  customerName={customerName || 'Valued Client'}
                  customerEmail={customerEmail || 'client@example.com.au'}
                  customerPhone={customerPhone}
                  shippingAddress={deliveryAddress}
                  items={items}
                  subtotal={subtotal}
                  deliveryFee={deliveryFee}
                  total={total}
                  notes={documentNotes}
                  extraMeta={{
                    ndisNumber,
                    planManager,
                    prescribingClinician: workflowPrescribingClinician,
                    assessmentRef: workflowAssessmentRef,
                    validityPeriod: workflowValidityPeriod,
                    deliveryTimeframe: workflowDeliveryTimeframe,
                    planType: workflowPlanType,
                    generatePdf: true,
                    subject: workflowEmailSubject,
                    responseMessage: workflowEmailBody,
                    mailSubject: workflowEmailSubject,
                    mailBody: workflowEmailBody,
                    headline: workflowEmailHeadline,
                  }}
                  customSettings={{
                    companyName: workflowProviderName || companyForm.companyName,
                    abn: workflowAbn || companyForm.abn,
                    ndisProviderNo: workflowNdisProviderNo || companyForm.ndisRegistrationNumber,
                    phone: workflowPhone || companyForm.phone,
                    email: companyForm.email,
                    address: workflowAddress || companyForm.address,
                    website: workflowWebsite || (companyForm as any).website,
                    bankTitle: workflowBankTitle,
                    bankName: workflowBankName || companyForm.bankName,
                    accountName: workflowAccountName || companyForm.accountName,
                    bsb: workflowBsb || companyForm.bsb,
                    accountNumber: workflowAccountNumber || companyForm.accountNumber,
                    footerText: workflowFooterText,
                    mailTemplate: {
                      subject: workflowEmailSubject,
                      body: workflowEmailBody,
                      headline: workflowEmailHeadline,
                    },
                  }}
                  showEnvelope={true}
                />
              </div>)}
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* TAB 2: PDF DOCUMENT TEMPLATES CENTRALIZED EDITOR */}
      {/* ========================================================================= */}
      {activeTab === 'pdf_templates' && (<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
          <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">PDF Document Template Editor</h2>
                <p className="text-xs text-slate-500">Edit titles, legal disclaimers, terms, and remittance instructions.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetPdfTemplate}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePdfTemplate}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#147A7A] hover:bg-[#106262] text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Template</span>
                </button>
              </div>
            </div>

            {/* Template Selector Arranged by 3 Sessions */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Select Template Session to Edit:
                </span>
                <span className="text-[11px] font-bold text-[#147A7A] bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200/60">
                  Active: {CANONICAL_TEMPLATES.find((t) => t.id === selectedPdfType)?.shortTitle}
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Session 1: NDIS Quotation & NDIS Invoice */}
                <div className="p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-extrabold text-[#0F766E] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Session 1: NDIS Funding &amp; PACE Claims</span>
                    </div>
                    <span className="text-[9.5px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded">
                      NDIS Item 05 &bull; ATO Compliant
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['ndis_quote', 'order'].map((tid) => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === tid)!;
                      const isSel = selectedPdfType === tid;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectPdfType(t.id)}
                          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSel
                              ? 'bg-[#147A7A] text-white shadow-xs ring-2 ring-[#147A7A]/30'
                              : 'bg-white hover:bg-teal-100/60 text-slate-700 border border-teal-200/60'
                          }`}
                        >
                          {isSel && <Check className="w-3.5 h-3.5" />}
                          <span>{t.shortTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session 2: EQUIPMENT HIRE & EQUIPMENT INVOICE */}
                <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Session 2: Equipment Rental Fleet &amp; Commercial</span>
                    </div>
                    <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                      Sanitized Fleet &bull; Commercial
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {['hire', 'quote'].map((tid) => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === tid)!;
                      const isSel = selectedPdfType === tid;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectPdfType(t.id)}
                          className={`py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSel
                              ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30'
                              : 'bg-white hover:bg-amber-100/60 text-slate-700 border border-amber-200/60'
                          }`}
                        >
                          {isSel && <Check className="w-3.5 h-3.5" />}
                          <span>{t.shortTitle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session 3: Clinical Advisory */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Session 3: Clinical Advisory &amp; OT Consultation</span>
                    </div>
                    <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                      Specialist Advice
                    </span>
                  </div>
                  <div>
                    {['contact'].map((tid) => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === tid)!;
                      const isSel = selectedPdfType === tid;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectPdfType(t.id)}
                          className={`w-full py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSel
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30'
                              : 'bg-white hover:bg-emerald-100/60 text-slate-700 border border-emerald-200/60'
                          }`}
                        >
                          {isSel && <Check className="w-3.5 h-3.5" />}
                          <span>{t.shortTitle} (Clinical Advisory &amp; OT Consultation)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Document Main Title</label>
                <input
                  type="text"
                  value={pdfEditState.title}
                  onChange={(e) => setPdfEditState({...pdfEditState, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle / Clinical Classification</label>
                <input
                  type="text"
                  value={pdfEditState.subtitle}
                  onChange={(e) => setPdfEditState({...pdfEditState, subtitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tagline Badge Text</label>
                <input
                  type="text"
                  value={pdfEditState.tagline}
                  onChange={(e) => setPdfEditState({...pdfEditState, tagline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Validity &amp; Terms Statement</label>
                <input
                  type="text"
                  value={pdfEditState.terms}
                  onChange={(e) => setPdfEditState({...pdfEditState, terms: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Clinical / Compliance Notes</label>
                <textarea
                  rows={3}
                  value={pdfEditState.notes}
                  onChange={(e) => setPdfEditState({...pdfEditState, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>

              {/* Statutory Notice Toggle */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Display Legal / GST Statutory Notice Box</span>
                  <input
                    type="checkbox"
                    checked={pdfEditState.showStatutoryNotice}
                    onChange={(e) => setPdfEditState({...pdfEditState, showStatutoryNotice: e.target.checked })}
                    className="w-4 h-4 text-[#147A7A] rounded cursor-pointer"
                  />
                </div>

                {pdfEditState.showStatutoryNotice && (<textarea
                    rows={2}
                    value={pdfEditState.statutoryNoticeText}
                    onChange={(e) => setPdfEditState({...pdfEditState, statutoryNoticeText: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none focus:border-[#147A7A]"
                  />)}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Direct Bank Remittance Title</label>
                <input
                  type="text"
                  value={pdfEditState.bankTitle}
                  onChange={(e) => setPdfEditState({...pdfEditState, bankTitle: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>

              {/* Remittance Bank Account Coordinates */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Template EFT Remittance Coordinates</span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Bank Name</label>
                    <input
                      type="text"
                      value={pdfEditState.bankName ?? companyForm.bankName}
                      onChange={(e) => setPdfEditState({...pdfEditState, bankName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Account Name</label>
                    <input
                      type="text"
                      value={pdfEditState.accountName ?? companyForm.accountName}
                      onChange={(e) => setPdfEditState({...pdfEditState, accountName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">BSB Code</label>
                    <input
                      type="text"
                      value={pdfEditState.bsb ?? companyForm.bsb}
                      onChange={(e) => setPdfEditState({...pdfEditState, bsb: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Account Number</label>
                    <input
                      type="text"
                      value={pdfEditState.accountNumber ?? companyForm.accountNumber}
                      onChange={(e) => setPdfEditState({...pdfEditState, accountNumber: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Footer Notice</label>
                <input
                  type="text"
                  value={pdfEditState.footerText}
                  onChange={(e) => setPdfEditState({...pdfEditState, footerText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>
            </div>
          </div>

          {/* LIVE A4 PREVIEW OF EDITED TEMPLATE (EXACT PREVIOUS DESIGN) */}
          <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 bg-slate-100/90 p-4 sm:p-6 lg:p-7 rounded-2xl border border-slate-200/80 max-h-[920px] overflow-y-auto lg:sticky lg:top-4 self-start shadow-inner">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 lg:p-9 text-black space-y-5 max-w-[880px] mx-auto text-xs font-sans leading-normal">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-900 pb-3">
                <img
                  src={logoHeaderImg}
                  crossOrigin="anonymous"
                  alt={companyForm.companyName}
                  className="h-12 sm:h-14 w-auto object-contain"
                />
                <div className="text-left sm:text-right text-[10.5px] leading-tight space-y-0.5">
                  <p className="font-bold text-[#147A7A]">NDIS Provider</p>
                  <p className="font-mono font-bold text-black">ABN: {companyForm.abn}</p>
                  <p className="text-slate-700">{companyForm.address}</p>
                  <p className="text-slate-700">Phone: <span className="font-mono">{companyForm.phone}</span></p>
                </div>
              </div>

              {/* Document Title & Reference */}
              <div className="flex justify-between items-center gap-2 pt-1 border-b border-slate-200 pb-2">
                <div>
                  <h1 className="text-base font-black text-black tracking-tight uppercase">
                    {pdfEditState.title}
                  </h1>
                  <div className="text-[10px] text-slate-500 mt-0.5">{pdfEditState.subtitle}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-black text-xs bg-slate-100 border border-slate-300 px-2.5 py-1 rounded inline-block text-black">
                    #SAMPLE-TEMPLATE
                  </span>
                </div>
              </div>

              {/* 2-Column Info Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs text-black">
                <div className="border border-slate-300 p-3 rounded-xl bg-slate-50/70 space-y-1">
                  <div className="font-bold text-[10px] uppercase text-black border-b border-slate-200 pb-1">
                    Sample Recipient:
                  </div>
                  <p className="font-bold text-slate-900">Jane Citizen (NDIS Participant)</p>
                  <p className="text-slate-600 text-[10.5px]">42 Sample Parade, Melbourne VIC 3000</p>
                </div>
                <div className="border border-slate-300 p-3 rounded-xl bg-slate-50/70 space-y-1">
                  <div className="font-bold text-[10px] uppercase text-black border-b border-slate-200 pb-1">
                    Validity &amp; Terms:
                  </div>
                  <p className="font-bold text-slate-900">{pdfEditState.terms}</p>
                  <p className="text-[10px] text-teal-800 font-semibold">{pdfEditState.tagline}</p>
                </div>
              </div>

              {/* Sample Item Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-t-2 border-b-2 border-slate-900 font-bold uppercase text-[10px] text-black">
                      <th className="py-2 text-left">Code</th>
                      <th className="py-2 text-left">Description</th>
                      <th className="py-2 text-center w-12">Qty</th>
                      <th className="py-2 text-right w-20">Rate</th>
                      <th className="py-2 text-right w-20">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[10.5px]">
                    <tr>
                      <td className="py-2 font-mono font-bold text-[#147A7A]">05_120603099_0105_1_2</td>
                      <td className="py-2">Electric Profiling Low Bed with Safety Side Rails</td>
                      <td className="py-2 text-center font-bold">1</td>
                      <td className="py-2 text-right font-mono">$2,450.00</td>
                      <td className="py-2 text-right font-mono font-bold">$2,450.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-12 gap-2 pt-2 border-t-2 border-slate-900 items-center">
                <div className="col-span-7 text-[10px] text-slate-600">
                  {pdfEditState.notes && <p className="font-medium text-slate-700">{pdfEditState.notes}</p>}
                  {pdfEditState.showStatutoryNotice && (<p className="text-[9.5px] text-teal-900 pt-1 border-t border-slate-200">{pdfEditState.statutoryNoticeText}</p>)}
                </div>
                <div className="col-span-5 text-right text-xs space-y-1">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono font-bold text-black">$2,450.00 AUD</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-slate-900 pt-1 text-sm font-black text-black">
                    <span>TOTAL:</span>
                    <span className="font-mono text-[#147A7A]">$2,450.00 AUD</span>
                  </div>
                </div>
              </div>

              {/* EFT Remittance Card */}
              <div className="border border-teal-200 bg-teal-50/60 rounded-xl p-3 text-xs space-y-1.5">
                <div className="font-bold text-xs text-[#147A7A] flex items-center gap-1.5 border-b border-teal-200/80 pb-1">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{pdfEditState.bankTitle || 'Direct Bank Transfer (EFT) Remittance Details:'}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-semibold block">Bank</span>
                    <span className="font-bold text-slate-900 text-[11px] block leading-snug">{pdfEditState.bankName || companyForm.bankName}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-semibold block">Account Name</span>
                    <span className="font-bold text-slate-900 text-[11px] block leading-snug">{pdfEditState.accountName || companyForm.accountName}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-semibold block">BSB</span>
                    <span className="font-mono font-black text-slate-900 text-xs block">{pdfEditState.bsb || companyForm.bsb}</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                    <span className="text-[10px] text-slate-500 font-semibold block">Account Number</span>
                    <span className="font-mono font-black text-slate-900 text-xs block">{pdfEditState.accountNumber || companyForm.accountNumber}</span>
                  </div>
                </div>
              </div>

              {/* Acceptance Slip */}
              <div className="pt-1">
                <div className="text-center text-[8.5px] font-mono text-slate-400 border-b border-dashed border-slate-300 pb-0.5 mb-1.5">
                  &#9986; --- DOCUMENT ACCEPTANCE SLIP (RETURN COPY) --- &#9986;
                </div>
                <div className="border border-slate-200 p-2 rounded-lg text-[10px] bg-slate-50 grid grid-cols-2 gap-2">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-600 block text-[9px] uppercase">Participant Approval:</span>
                    <div className="pt-4 border-b border-slate-300" />
                    <span className="text-[8.5px] text-slate-400">Signature &bull; Date</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-600 block text-[9px] uppercase">Plan Manager Sign-off:</span>
                    <div className="pt-4 border-b border-slate-300" />
                    <span className="text-[8.5px] text-slate-400">Signature &bull; Claim Ref</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-slate-300 pt-2 text-center text-[9.5px] text-slate-500">
                <p className="font-bold text-slate-700">{companyForm.companyName} &bull; ABN: {companyForm.abn}</p>
                <p className="mt-0.5">{pdfEditState.footerText}</p>
              </div>
            </div>
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* TAB 3: EMAIL TEMPLATES CENTRALIZED EDITOR */}
      {/* ========================================================================= */}
      {activeTab === 'email_templates' && (<div className="grid grid-cols-1 lg:grid-cols-12 gap-5 xl:gap-6 items-start">
          <div className="lg:col-span-5 xl:col-span-5 2xl:col-span-4 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-base font-black text-slate-900">Customer Website Request Templates</h2>
                <p className="text-xs text-slate-500">Configure master empty response formats automatically triggered by customer actions on the website.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetMailTemplate}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveMailTemplate}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#147A7A] hover:bg-[#106262] text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Format</span>
                </button>
              </div>
            </div>

            {/* Informational Guidance Notice */}
            <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900 text-[11.5px]">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Customer Website Request Formats Only</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-normal">
                These templates are the master formats dispatched when a <strong>customer submits a request or order on your website</strong>. Configure the format schema below — it will work accordingly when triggered. To compose and send a custom document directly to an individual customer, use <strong>Send Document to Customer (Tab 1)</strong>.
              </p>
            </div>

            {/* Template Selector Arranged by 3 Sessions */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Select Customer Request Format:
                </span>
                <span className="text-[11px] font-bold text-[#147A7A] bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200/60">
                  Active: {CANONICAL_TEMPLATES.find((t) => t.id === selectedMailType)?.shortTitle}
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Session 1: NDIS Invoice (Customer Order Receipt) */}
                <div className="p-3 bg-teal-50/50 border border-teal-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-extrabold text-[#0F766E] uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Session 1: NDIS Funding &amp; Claims (Customer Request)</span>
                    </div>
                    <span className="text-[9.5px] font-bold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded">
                      Customer Action
                    </span>
                  </div>
                  <div>
                    {['order'].map((tid) => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === tid)!;
                      const isSel = selectedMailType === tid;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectMailType(t.id)}
                          className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSel
                              ? 'bg-[#147A7A] text-white shadow-xs ring-2 ring-[#147A7A]/30'
                              : 'bg-white hover:bg-teal-100/60 text-slate-700 border border-teal-200/60'
                          }`}
                        >
                          {isSel && <Check className="w-3.5 h-3.5" />}
                          <span>NDIS Invoice (Customer Online Order Receipt)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session 2: EQUIPMENT INVOICE (Customer Commercial Quote) */}
                <div className="p-3 bg-amber-50/50 border border-amber-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-extrabold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" />
                      <span>Session 2: Equipment Rental &amp; Commercial (Customer Request)</span>
                    </div>
                    <span className="text-[9.5px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded">
                      Customer Action
                    </span>
                  </div>
                  <div>
                    {['quote'].map((tid) => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === tid)!;
                      const isSel = selectedMailType === tid;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectMailType(t.id)}
                          className={`w-full py-2.5 px-3 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSel
                              ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30'
                              : 'bg-white hover:bg-amber-100/60 text-slate-700 border border-amber-200/60'
                          }`}
                        >
                          {isSel && <Check className="w-3.5 h-3.5" />}
                          <span>EQUIPMENT INVOICE (Customer Commercial Quote)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Session 3: Clinical Advisory */}
                <div className="p-3 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Session 3: Clinical Advisory Consultation (Customer Request)</span>
                    </div>
                    <span className="text-[9.5px] font-bold text-emerald-800 bg-emerald-100/70 px-2 py-0.5 rounded">
                      Specialist Advice
                    </span>
                  </div>
                  <div>
                    {['contact'].map((tid) => {
                      const t = CANONICAL_TEMPLATES.find((x) => x.id === tid)!;
                      const isSel = selectedMailType === tid;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectMailType(t.id)}
                          className={`w-full py-2 px-2.5 rounded-lg text-xs font-bold transition-all text-center cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSel
                              ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-600/30'
                              : 'bg-white hover:bg-emerald-100/60 text-slate-700 border border-emerald-200/60'
                          }`}
                        >
                          {isSel && <Check className="w-3.5 h-3.5" />}
                          <span>Clinical Advisory (Consultation Inquiry)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* SUB-TAB SWITCHER: EDIT EMAIL FORMAT VS EDIT PDF DOCUMENT FORMAT */}
            <div className="pt-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => {
                    setEditSubTab('email');
                    setMailPreviewMode('email');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editSubTab === 'email'
                      ? 'bg-[#147A7A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>✉️ Edit Email Format</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditSubTab('pdf');
                    setMailPreviewMode('document');
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    editSubTab === 'pdf'
                      ? 'bg-[#147A7A] text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>📄 Edit PDF Document Format</span>
                </button>
              </div>
            </div>

            {/* SUB-TAB 1: EMAIL FORMAT FIELDS */}
            {editSubTab === 'email' && (
              <div className="space-y-3.5 pt-1">
                {/* Variable Guide Chips */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-700 block">Available Dynamic Variables:</span>
                  <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">{`{{customer_name}}`}</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">{`{{document_id}}`}</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">{`{{total}}`}</span>
                    <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-semibold">{`{{company_name}}`}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Subject Line</label>
                  <input
                    type="text"
                    value={mailEditState.subject}
                    onChange={(e) => setMailEditState({ ...mailEditState, subject: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Header Preheader Badge</label>
                  <input
                    type="text"
                    value={mailEditState.badge}
                    onChange={(e) => setMailEditState({ ...mailEditState, badge: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Main Heading</label>
                  <input
                    type="text"
                    value={mailEditState.headline}
                    onChange={(e) => setMailEditState({ ...mailEditState, headline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle / Summary</label>
                  <input
                    type="text"
                    value={mailEditState.subtext}
                    onChange={(e) => setMailEditState({ ...mailEditState, subtext: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Message Body</label>
                  <textarea
                    rows={5}
                    value={mailEditState.body}
                    onChange={(e) => setMailEditState({ ...mailEditState, body: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Call-To-Action Button Text</label>
                  <input
                    type="text"
                    value={mailEditState.ctaText}
                    onChange={(e) => setMailEditState({ ...mailEditState, ctaText: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Footer Notice</label>
                  <input
                    type="text"
                    value={mailEditState.footerText}
                    onChange={(e) => setMailEditState({ ...mailEditState, footerText: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>
              </div>
            )}

            {/* SUB-TAB 2: PDF DOCUMENT FORMAT FIELDS */}
            {editSubTab === 'pdf' && (
              <div className="space-y-3.5 pt-1">
                <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-xs space-y-1">
                  <div className="font-bold text-[#0F766E] flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    <span>Official PDF Document Layout Configuration</span>
                  </div>
                  <p className="text-[11px] text-teal-800 leading-normal">
                    Adjust the document title, subtitle, validity terms, compliance notes, and EFT remittance coordinates for this customer receiving format.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Document Main Title</label>
                  <input
                    type="text"
                    value={pdfEditState.title || ''}
                    onChange={(e) => setPdfEditState({ ...pdfEditState, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Subtitle / Clinical Classification</label>
                  <input
                    type="text"
                    value={pdfEditState.subtitle || ''}
                    onChange={(e) => setPdfEditState({ ...pdfEditState, subtitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tagline Badge Text</label>
                  <input
                    type="text"
                    value={pdfEditState.tagline || ''}
                    onChange={(e) => setPdfEditState({ ...pdfEditState, tagline: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Validity &amp; Terms Statement</label>
                  <input
                    type="text"
                    value={pdfEditState.terms || ''}
                    onChange={(e) => setPdfEditState({ ...pdfEditState, terms: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Clinical / Compliance Notes</label>
                  <textarea
                    rows={3}
                    value={pdfEditState.notes || ''}
                    onChange={(e) => setPdfEditState({ ...pdfEditState, notes: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                {/* Statutory Notice Toggle */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Display Legal / GST Statutory Notice Box</span>
                    <input
                      type="checkbox"
                      checked={pdfEditState.showStatutoryNotice || false}
                      onChange={(e) => setPdfEditState({ ...pdfEditState, showStatutoryNotice: e.target.checked })}
                      className="w-4 h-4 text-[#147A7A] rounded cursor-pointer"
                    />
                  </div>

                  {pdfEditState.showStatutoryNotice && (
                    <textarea
                      rows={2}
                      value={pdfEditState.statutoryNoticeText || ''}
                      onChange={(e) => setPdfEditState({ ...pdfEditState, statutoryNoticeText: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs font-medium focus:outline-none focus:border-[#147A7A]"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Direct Bank Remittance Title</label>
                  <input
                    type="text"
                    value={pdfEditState.bankTitle || ''}
                    onChange={(e) => setPdfEditState({ ...pdfEditState, bankTitle: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>

                {/* Remittance Bank Account Coordinates */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-slate-800 block">Template EFT Remittance Coordinates</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Bank Name</label>
                      <input
                        type="text"
                        value={pdfEditState.bankName ?? companyForm.bankName}
                        onChange={(e) => setPdfEditState({ ...pdfEditState, bankName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Account Name</label>
                      <input
                        type="text"
                        value={pdfEditState.accountName ?? companyForm.accountName}
                        onChange={(e) => setPdfEditState({ ...pdfEditState, accountName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">BSB Code</label>
                      <input
                        type="text"
                        value={pdfEditState.bsb ?? companyForm.bsb}
                        onChange={(e) => setPdfEditState({ ...pdfEditState, bsb: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Account Number</label>
                      <input
                        type="text"
                        value={pdfEditState.accountNumber ?? companyForm.accountNumber}
                        onChange={(e) => setPdfEditState({ ...pdfEditState, accountNumber: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Document Footer Notice</label>
                  <input
                    type="text"
                    value={pdfEditState.footerText || ''}
                    onChange={(e) => setPdfEditState({ ...pdfEditState, footerText: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* DUAL PREVIEW: CUSTOMER EMAIL VIEW OR VIEW DOCUMENT FORMAT */}
          <div className="lg:col-span-7 xl:col-span-7 2xl:col-span-8 bg-slate-100/90 p-4 sm:p-6 lg:p-7 rounded-2xl border border-slate-200/80 space-y-4 lg:sticky lg:top-4 self-start shadow-inner max-h-[920px] overflow-y-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Preview Mode:</span>
                <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setMailPreviewMode('email')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      mailPreviewMode === 'email'
                        ? 'bg-[#147A7A] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Customer Email View</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMailPreviewMode('document')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      mailPreviewMode === 'document'
                        ? 'bg-[#147A7A] text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>View Document Format</span>
                  </button>
                </div>
              </div>

              {mailPreviewMode === 'email' ? (
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setMailEditorDevice('desktop')}
                    className={`p-1.5 rounded ${
                      mailEditorDevice === 'desktop' ? 'bg-[#147A7A] text-white' : 'text-slate-500'
                    }`}
                    title="Desktop Inbox View"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMailEditorDevice('mobile')}
                    className={`p-1.5 rounded ${
                      mailEditorDevice === 'mobile' ? 'bg-[#147A7A] text-white' : 'text-slate-500'
                    }`}
                    title="Mobile View"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-[11px] font-mono font-bold text-[#147A7A] bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-lg self-start sm:self-auto">
                  A4 Document Format &bull; {CANONICAL_TEMPLATES.find((t) => t.id === selectedMailType)?.shortTitle}
                </span>
              )}
            </div>

            {/* PREVIEW 1: CUSTOMER EMAIL VIEW */}
            {mailPreviewMode === 'email' && (
              <ExactEmailPreview
                templateId={selectedMailType}
                previewDevice={mailEditorDevice}
                docId="{{document_id}}"
                customerName="{{customer_name}}"
                customerEmail="{{customer_email}}"
                items={[]}
                subtotal={0}
                deliveryFee={0}
                total={0}
                onViewDocumentClick={() => setMailPreviewMode('document')}
                isTemplateFormat={true}
                extraMeta={{
                  subject: mailEditState?.subject || '',
                  badge: mailEditState?.badge || '',
                  headline: mailEditState?.headline || '',
                  subtext: mailEditState?.subtext || '',
                  responseMessage: mailEditState?.body || '',
                  mailSubject: mailEditState?.subject || '',
                  mailBody: mailEditState?.body || '',
                  ctaText: mailEditState?.ctaText || '',
                  footerText: mailEditState?.footerText || '',
                  prescribingClinician: mailEditState?.prescribingClinician,
                  assessmentRef: mailEditState?.assessmentRef,
                  validityPeriod: mailEditState?.validityPeriod,
                  deliveryTimeframe: mailEditState?.deliveryTimeframe,
                  planType: mailEditState?.planType,
                }}
                customSettings={{
                  companyName: companyForm.companyName,
                  abn: companyForm.abn,
                  ndisProviderNo: companyForm.ndisRegistrationNumber,
                  phone: companyForm.phone,
                  email: companyForm.email,
                  bankName: companyForm.bankName,
                  accountName: companyForm.accountName,
                  bsb: companyForm.bsb,
                  accountNumber: companyForm.accountNumber,
                  footerText: mailEditState.footerText,
                  mailTemplate: mailEditState,
                }}
                showEnvelope={true}
              />
            )}

            {/* PREVIEW 2: CORRESPONDING A4 VIEW DOCUMENT FORMAT */}
            {mailPreviewMode === 'document' && (() => {
              const currentPdf = pdfEditState || invoiceSettings.pdfTemplates?.[selectedMailType] || DEFAULT_PDF_CONFIGS[selectedMailType];
              const canonical = CANONICAL_TEMPLATES.find((t) => t.id === selectedMailType);
              return (
                <div className="space-y-3">
                  {/* Schema Guidance Banner */}
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-teal-900 shadow-2xs">
                    <Sparkles className="w-4 h-4 text-[#147A7A] shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-[#0F766E]">Master Document Format Schema (Customer Request)</p>
                      <p className="text-[11px] text-teal-800 leading-normal">
                        This empty schema format is what you fix here. When a customer submits an action or order on the website, this official document layout automatically populates with their exact name, address, chosen equipment, and calculated total.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 lg:p-9 text-black space-y-5 max-w-[880px] mx-auto text-xs font-sans leading-normal">
                    {/* Header Bar */}
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 border-slate-900 pb-3">
                      <img
                        src={logoHeaderImg}
                        crossOrigin="anonymous"
                        alt={companyForm.companyName}
                        className="h-12 sm:h-14 w-auto object-contain"
                      />
                      <div className="text-left sm:text-right text-[10.5px] leading-tight space-y-0.5">
                        <p className="font-bold text-[#147A7A]">NDIS Provider</p>
                        <p className="font-mono font-bold text-black">ABN: {companyForm.abn}</p>
                        <p className="text-slate-700">{companyForm.address}</p>
                        <p className="text-slate-700">Phone: <span className="font-mono">{companyForm.phone}</span> &bull; Web: {(companyForm as any).website || 'atspecialists.com.au'}</p>
                      </div>
                    </div>

                    {/* Document Title & Reference */}
                    <div className="flex justify-between items-center gap-2 pt-1 border-b border-slate-200 pb-2">
                      <div>
                        <h1 className="text-base font-black text-black tracking-tight uppercase">
                          {currentPdf?.title || canonical?.name}
                        </h1>
                        <div className="text-[10px] text-slate-500 mt-0.5">{currentPdf?.subtitle || 'Official Healthcare Equipment Schedule'}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-xs bg-slate-100 border border-slate-300 px-2.5 py-1 rounded inline-block text-slate-800">
                          #&#123;&#123;document_id&#125;&#125;
                        </span>
                        <div className="text-[9.5px] text-slate-400 font-mono mt-0.5">Date: &#123;&#123;request_date&#125;&#125;</div>
                      </div>
                    </div>

                    {/* 2-Column Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-black">
                      <div className="border border-slate-300 p-3 rounded-xl bg-slate-50/70 space-y-1">
                        <div className="font-bold text-[10px] uppercase text-black border-b border-slate-200 pb-1 flex justify-between">
                          <span>Customer Request Recipient:</span>
                          <span className="text-[#147A7A] font-bold text-[9px] bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded">
                            Auto-Populated
                          </span>
                        </div>
                        <p className="font-mono font-bold text-slate-900">&#123;&#123;customer_name&#125;&#125;</p>
                        <p className="text-slate-600 text-[10.5px] font-mono">&#123;&#123;delivery_address&#125;&#125;</p>
                        <p className="text-slate-600 text-[10.5px] font-mono">Email: &#123;&#123;customer_email&#125;&#125; &bull; Phone: &#123;&#123;customer_phone&#125;&#125;</p>
                        {(selectedMailType === 'ndis_quote' || selectedMailType === 'order') && (
                          <p className="text-[#0F766E] text-[10px] font-mono pt-1 border-t border-slate-200">
                            NDIS #: &#123;&#123;ndis_number&#125;&#125; &bull; Plan: &#123;&#123;plan_type&#125;&#125;
                          </p>
                        )}
                      </div>
                      <div className="border border-slate-300 p-3 rounded-xl bg-slate-50/70 space-y-1">
                        <div className="font-bold text-[10px] uppercase text-black border-b border-slate-200 pb-1 flex justify-between">
                          <span>Validity &amp; Terms:</span>
                          <span className="text-[10px] text-teal-800 font-bold">{currentPdf?.tagline || canonical?.badge}</span>
                        </div>
                        <p className="font-bold text-slate-900">{currentPdf?.terms || 'Strictly 14 Days Net (ATO & NDIS Standard)'}</p>
                        <p className="text-[10px] text-slate-500">Document Type: {canonical?.shortTitle} &bull; ATSA Compliance</p>
                        <p className="text-[10px] text-[#147A7A] font-semibold">Trigger: Customer Website Request Submission</p>
                      </div>
                    </div>

                    {/* Empty Dynamic Items Table */}
                    <div className="overflow-x-auto space-y-2">
                      <table className="w-full text-xs border-collapse">
                        <thead>
                          <tr className="border-t-2 border-b-2 border-slate-900 font-bold uppercase text-[10px] text-black">
                            <th className="py-2 text-left">Code / Support #</th>
                            <th className="py-2 text-left">Customer Requested Equipment / Specifications</th>
                            <th className="py-2 text-center w-12">Qty</th>
                            <th className="py-2 text-right w-24">Rate</th>
                            <th className="py-2 text-right w-24">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-[10.5px] font-mono">
                          <tr>
                            <td className="py-2.5 font-bold text-[#147A7A]">&#123;&#123;support_item_code_1&#125;&#125;</td>
                            <td className="py-2.5 font-sans">
                              <span className="font-bold text-slate-900 block font-mono">&#123;&#123;customer_requested_item_1&#125;&#125;</span>
                              <span className="text-[10px] text-slate-500 block font-mono">&#123;&#123;item_1_clinical_specifications_size_and_options&#125;&#125;</span>
                            </td>
                            <td className="py-2.5 text-center font-bold">&#123;&#123;qty_1&#125;&#125;</td>
                            <td className="py-2.5 text-right font-mono">&#123;&#123;unit_rate_1&#125;&#125;</td>
                            <td className="py-2.5 text-right font-mono font-bold">&#123;&#123;item_total_1&#125;&#125;</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 font-bold text-[#147A7A]">&#123;&#123;support_item_code_2&#125;&#125;</td>
                            <td className="py-2.5 font-sans">
                              <span className="font-bold text-slate-900 block font-mono">&#123;&#123;customer_requested_item_2&#125;&#125;</span>
                              <span className="text-[10px] text-slate-500 block font-mono">&#123;&#123;item_2_clinical_specifications_size_and_options&#125;&#125;</span>
                            </td>
                            <td className="py-2.5 text-center font-bold">&#123;&#123;qty_2&#125;&#125;</td>
                            <td className="py-2.5 text-right font-mono">&#123;&#123;unit_rate_2&#125;&#125;</td>
                            <td className="py-2.5 text-right font-mono font-bold">&#123;&#123;item_total_2&#125;&#125;</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t-2 border-slate-900 items-center">
                      <div className="sm:col-span-7 text-[10px] text-slate-600">
                        {currentPdf?.notes && <p className="font-medium text-slate-700">{currentPdf.notes}</p>}
                        {currentPdf?.showStatutoryNotice && (<p className="text-[9.5px] text-teal-900 pt-1 border-t border-slate-200">{currentPdf.statutoryNoticeText}</p>)}
                      </div>
                      <div className="sm:col-span-5 text-right text-xs space-y-1">
                        <div className="flex justify-between text-slate-600">
                          <span>Subtotal:</span>
                          <span className="font-mono font-bold text-black">&#123;&#123;subtotal&#125;&#125; AUD</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>Delivery / Freight:</span>
                          <span className="font-mono font-bold text-black">&#123;&#123;delivery_fee&#125;&#125; AUD</span>
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>GST:</span>
                          <span className="font-mono text-emerald-800">$0.00 (GST-Free)</span>
                        </div>
                        <div className="flex justify-between border-t-2 border-slate-900 pt-1 text-sm font-black text-black">
                          <span>TOTAL:</span>
                          <span className="font-mono text-[#147A7A]">&#123;&#123;total&#125;&#125; AUD</span>
                        </div>
                      </div>
                    </div>

                    {/* EFT Remittance Card */}
                    <div className="border border-teal-200 bg-teal-50/60 rounded-xl p-3 text-xs space-y-1.5">
                      <div className="font-bold text-xs text-[#147A7A] flex items-center gap-1.5 border-b border-teal-200/80 pb-1">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{currentPdf?.bankTitle || 'Direct Bank Transfer (EFT) Remittance Details:'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                        <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 font-semibold block">Bank</span>
                          <span className="font-bold text-slate-900 text-[11px] block leading-snug">{(currentPdf as any)?.bankName || companyForm.bankName}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 font-semibold block">Account Name</span>
                          <span className="font-bold text-slate-900 text-[11px] block leading-snug">{(currentPdf as any)?.accountName || companyForm.accountName}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 font-semibold block">BSB</span>
                          <span className="font-mono font-black text-slate-900 text-xs block">{(currentPdf as any)?.bsb || companyForm.bsb}</span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-teal-100 shadow-2xs">
                          <span className="text-[10px] text-slate-500 font-semibold block">Account Number</span>
                          <span className="font-mono font-black text-slate-900 text-xs block">{(currentPdf as any)?.accountNumber || companyForm.accountNumber}</span>
                        </div>
                      </div>
                    </div>

                    {/* Acceptance Slip */}
                    <div className="pt-1">
                      <div className="text-center text-[8.5px] font-mono text-slate-400 border-b border-dashed border-slate-300 pb-0.5 mb-1.5">
                        &#9986; --- DOCUMENT ACCEPTANCE SLIP (RETURN COPY) --- &#9986;
                      </div>
                      <div className="border border-slate-200 p-2.5 rounded-xl text-[10.5px] bg-slate-50 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-700 block mb-1">
                            {selectedMailType === 'ndis_quote'
                              ? 'Participant / Nominee Approval'
                              : selectedMailType === 'hire'
                              ? 'Hirer / Client Agreement'
                              : selectedMailType === 'order'
                              ? 'Recipient Confirmation'
                              : 'Authorized Client Approval'}
                          </span>
                          <span className="font-mono text-slate-900 block mt-1">&#123;&#123;customer_name&#125;&#125;</span>
                          <div className="pt-3 border-b border-slate-300" />
                          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                            <span>Authorized Signature</span>
                            <span>Date: ____ / ____ / 2026</span>
                          </div>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="font-bold text-slate-700 block mb-1">
                            {selectedMailType === 'ndis_quote'
                              ? 'Plan Manager Sign-Off / Claim Ref'
                              : 'Purchase Order / Claim Reference'}
                          </span>
                          <div className="text-slate-600 font-mono text-[10px]">PO / Claim Ref: ______________________</div>
                          <div className="pt-2 border-b border-slate-300" />
                          <div className="flex justify-between text-[9px] text-slate-400 mt-1">
                            <span>Authorized Officer Signature</span>
                            <span>Date: ____ / ____ / 2026</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer Bar */}
                    <div className="border-t border-slate-200 pt-2 flex flex-col sm:flex-row justify-between text-[9.5px] text-slate-500">
                      <span>{currentPdf?.footerText || (companyForm as any).footerNotice || 'Assistive Technology Specialists Australia Pty Ltd'}</span>
                      <span className="font-bold text-[#147A7A]">Verified Official ATSA Record</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* TAB 4: DISPATCHED DOCUMENTS REGISTRY & HISTORY */}
      {/* ========================================================================= */}
      {activeTab === 'history' && (<div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-black text-slate-900">Dispatched Document Registry</h2>
              <p className="text-xs text-slate-500">Live verified documents, public links, and customer delivery history.</p>
            </div>

            <button
              type="button"
              onClick={loadHistory}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              <span>Refresh Records</span>
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by Document ID, Customer Name, or Email..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-[#147A7A]"
              />
            </div>

            <select
              value={historyFilter}
              onChange={(e) => setHistoryFilter(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="all">All Document Types</option>
              <option value="ndis_quote">NDIS Quotation</option>
              <option value="order">NDIS Invoice</option>
              <option value="hire">EQUIPMENT HIRE</option>
              <option value="quote">EQUIPMENT INVOICE</option>
              <option value="contact">Clinical Advisory</option>
            </select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="py-3 px-3">Document ID</th>
                  <th className="py-3 px-3">Recipient / Customer</th>
                  <th className="py-3 px-3">Date Sent</th>
                  <th className="py-3 px-3 text-right">Total ($AUD)</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredHistory.map((doc) => (<tr key={doc.docId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {doc.docId}
                      <div className="text-[10px] font-sans font-medium text-slate-500 uppercase">
                        {doc.templateId.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-bold text-slate-900">{doc.customerName || 'Client'}</div>
                      <div className="text-[11px] text-slate-500">{doc.customerEmail}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {formatDisplayDate(doc.createdAt)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-slate-900">
                      ${Number(doc.total || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                        <Check className="w-3.5 h-3.5" />
                        Dispatched
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <a
                          href={`/view-document/${doc.docId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                          title="Open Online Viewer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>))}
                {filteredHistory.length === 0 && (<tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 font-medium text-xs">
                      No dispatched documents found in history. Send your first document using the "Send Document to Customer" tab.
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>)}

      {/* ========================================================================= */}
      {/* TAB 5: COMPANY & BANK DEFAULTS */}
      {/* ========================================================================= */}
      {activeTab === 'company' && (<div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs max-w-[1000px] space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-base font-black text-slate-900">Company &amp; Remittance Defaults</h2>
              <p className="text-xs text-slate-500">Universal business identity, ABN, and EFT bank transfer coordinates.</p>
            </div>

            <button
              type="button"
              onClick={handleSaveCompanyDefaults}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#147A7A] hover:bg-[#106262] text-white transition-all flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>Save Defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Company Legal Name</label>
              <input
                type="text"
                value={companyForm.companyName}
                onChange={(e) => setCompanyForm({...companyForm, companyName: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Australian Business Number (ABN)</label>
              <input
                type="text"
                value={companyForm.abn}
                onChange={(e) => setCompanyForm({...companyForm, abn: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#147A7A]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">NDIS Provider Number</label>
              <input
                type="text"
                value={companyForm.ndisRegistrationNumber}
                onChange={(e) => setCompanyForm({...companyForm, ndisRegistrationNumber: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#147A7A]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Support / Order Email</label>
              <input
                type="email"
                value={companyForm.email}
                onChange={(e) => setCompanyForm({...companyForm, email: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Customer Care Phone</label>
              <input
                type="text"
                value={companyForm.phone}
                onChange={(e) => setCompanyForm({...companyForm, phone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Payment Terms (Days)</label>
              <input
                type="number"
                value={companyForm.paymentTermsDays}
                onChange={(e) => setCompanyForm({...companyForm, paymentTermsDays: parseInt(e.target.value, 10) || 30 })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">Registered Business Address</label>
              <input
                type="text"
                value={companyForm.address}
                onChange={(e) => setCompanyForm({...companyForm, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <h3 className="text-sm font-black text-slate-900 mb-3">EFT Direct Deposit Remittance Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Financial Institution / Bank</label>
                <input
                  type="text"
                  value={companyForm.bankName}
                  onChange={(e) => setCompanyForm({...companyForm, bankName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Name</label>
                <input
                  type="text"
                  value={companyForm.accountName}
                  onChange={(e) => setCompanyForm({...companyForm, accountName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-semibold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">BSB Number (6 Digits)</label>
                <input
                  type="text"
                  value={companyForm.bsb}
                  onChange={(e) => setCompanyForm({...companyForm, bsb: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Number</label>
                <input
                  type="text"
                  value={companyForm.accountNumber}
                  onChange={(e) => setCompanyForm({...companyForm, accountNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 font-mono font-bold focus:bg-white focus:outline-none focus:border-[#147A7A]"
                />
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}

export default AdminInvoices;
