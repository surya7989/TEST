/**
 * AT Specialists Australia - Canonical Production Admin Store
 * 
 * Manages Administrative Authentication, RBAC, and Real Backend CRUD Synchronization.
 * Every administrative operation persists to the canonical MySQL backend via authenticated API calls.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  adminLogin as apiAdminLogin,
  getAdminProfile as apiGetAdminProfile,
  getProducts as apiGetProducts,
  createProduct as apiCreateProduct,
  updateProduct as apiUpdateProduct,
  deleteProduct as apiDeleteProduct,
  getOrders as apiGetOrders,
  updateOrderStatus as apiUpdateOrderStatus,
  updateOrderTracking as apiUpdateOrderTracking,
  getCustomers as apiGetCustomers,
  getNdisQuotes as apiGetNdisQuotes,
  updateNdisQuoteStatus as apiUpdateNdisQuoteStatus,
  getInquiries as apiGetInquiries,
  updateInquiryStatus as apiUpdateInquiryStatus,
  getSettings as apiGetSettings,
  saveSettings as apiSaveSettings,
  saveSmtpConfig as apiSaveSmtpConfig,
  clearAdminToken,
  getAdminToken,
} from '@/lib/api';
import { PLACEHOLDER_IMAGE } from '@/lib/imageProxy';
import { products as initialFallbackProducts, type Product } from '@/data/products';
import { resolveProductBrand } from '@/lib/brandUtils';

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'expired' | 'invoiced' | 'pending';

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  items: {
    productId?: string;
    id?: string;
    code?: string;
    sku?: string;
    name: string;
    detail?: string;
    quantity: number;
    price: number;
    purchaseType?: 'buy' | 'hire';
    hireWeeks?: number;
    gstType?: 'standard' | 'gst-free' | 'custom';
    gstRate?: number;
    deliveryFee?: number;
  }[];
  subtotal?: number;
  deliveryFee?: number;
  deliveryTotal?: number;
  total: number;
  gstTotal?: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  shippingAddress: string;
  deliveryMethod?: string;
  ndisNumber?: string;
  notes?: string;
  trackingNumber?: string;
  paymentMethod?: string;
  transactionId?: string;
  paypalOrderId?: string;
  paypalCaptureId?: string;
  hireLocationType?: 'home' | 'hospital' | 'facility';
  hireFacilityName?: string;
  hireFacilityWard?: string;
  hireFacilityRoom?: string;
  hireDischargeDate?: string;
  hireStartDate?: string;
  hireReturnDate?: string;
  hireDurationWeeks?: number;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  ordersCount: number;
  totalSpent: number;
  joinedAt: string;
  ndisNumber?: string;
  planManager?: string;
  address?: string;
  notes?: string;
}

export interface NdisQuote {
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  ndisNumber: string;
  planManager: string;
  planManagerEmail?: string;
  planType?: 'plan_managed' | 'self_managed' | 'ndia_managed';
  quoteType?: 'purchase' | 'hire';
  participantDob?: string;
  prescriberName?: string;
  prescriberOrg?: string;
  prescriberPhone?: string;
  prescriberEmail?: string;
  clinicalRationale?: string;
  hireStartDate?: string;
  hireDurationWeeks?: number;
  hireReturnDate?: string;
  hireLocationType?: 'home' | 'hospital' | 'facility';
  hireFacilityName?: string;
  hireFacilityWard?: string;
  hireFacilityRoom?: string;
  hireDischargeDate?: string;
  items: {
    id?: string;
    productId?: string;
    code?: string;
    sku?: string;
    name: string;
    detail?: string;
    quantity: number;
    price: number;
    fundingCategory?: string;
    purchaseType?: 'buy' | 'hire';
    hireWeeks?: number;
  }[];
  total: number;
  status: QuoteStatus;
  createdAt: string;
  validUntil: string;
  notes?: string;
}

export interface AdminCategory {
  id: string;
  name: string;
}

export interface AdminProduct extends Product {
  stock: number;
  sku: string;
  lowStockThreshold: number;
  price: number;
  category: string;
  description: string;
  available: boolean;
  hirePeriod: 'week' | 'day' | 'month' | string;
  hasFreeSample: boolean;
  sampleNote: string;
  images: string[];
  featured?: boolean;
  onSale?: boolean;
  status?: string;
}

export interface ContactInquiry {
  id: string;
  name: string;
  email: string;
  phone: string;
  enquiryType: string;
  ndisNumber?: string;
  planManager?: string;
  equipmentInterest?: string;
  subject: string;
  message: string;
  preferredContact: 'email' | 'phone' | 'any';
  status: 'new' | 'contacted' | 'in_progress' | 'resolved' | 'archived' | 'quote_sent';
  notes?: string;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  customerName: string;
  customerEmail: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  status: 'approved' | 'pending' | 'flagged' | 'rejected';
  verifiedBuyer: boolean;
  ndisParticipant: boolean;
  featured: boolean;
  adminReply?: string;
  adminReplyDate?: string;
}

export interface ShippingZone {
  id: string;
  name: string;
  regions: string;
  methods: { name: string; price: number; estimatedDays: string; active: boolean }[];
}

export interface MailTemplateConfig {
  subject?: string;
  badge?: string;
  headline?: string;
  subtext?: string;
  body?: string;
  ctaText?: string;
  footerText?: string;
  prescribingClinician?: string;
  assessmentRef?: string;
  validityPeriod?: string;
  deliveryTimeframe?: string;
  planType?: string;
}

export interface PdfTemplateConfig {
  title?: string;
  subtitle?: string;
  tagline?: string;
  terms?: string;
  notes?: string;
  showStatutoryNotice?: boolean;
  statutoryNoticeText?: string;
  bankTitle?: string;
  footerText?: string;
}

export interface InvoiceSettings {
  templateId: string;
  companyName: string;
  abn: string;
  ndisRegistrationNumber: string;
  email: string;
  phone: string;
  address: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCountry?: string;
  website?: string;
  bankTitle?: string;
  bankName: string;
  bsb: string;
  accountNumber: string;
  accountName: string;
  remittanceTitle?: string;
  terms?: string;
  dueDate?: string;
  requiredByDate?: string;
  customerReference?: string;
  footerLeft?: string;
  footerRight?: string;
  paymentTermsDays: number;
  brandColor: string;
  notes: string;
  showNdisParticipantId: boolean;
  showItemizedGst: boolean;
  showTrackingDetails: boolean;
  showDirectDepositQr: boolean;
  showStatutoryNotice?: boolean;
  statutoryNoticeText?: string;
  mailTemplates?: Record<string, MailTemplateConfig>;
  pdfTemplates?: Record<string, PdfTemplateConfig>;
}

export interface PaymentGatewaySettings {
  paypalMerchantEmail: string;
  paypalClientId: string;
  paypalSecretKey: string;
  paypalMode: 'live' | 'sandbox';
  autoCapture: boolean;
  enablePayIn4: boolean;
  enableDirectCards: boolean;
  settlementBankName: string;
  settlementAccountName: string;
  settlementBsb: string;
  settlementAccountNumber: string;
  settlementPayId: string;
  autoPayoutToBank: boolean;
  payoutSchedule: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  fromName: string;
  fromEmail: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  type: string;
  body: string;
  variables: string[];
}

export interface CheckoutSettings {
  enablePayment: boolean;
  enableQuotation: boolean;
}

export interface CarerCategory {
  id: string;
  title: string;
  image: string;
  description: string;
  href: string;
  badge?: string;
  highlights: string[];
}

export const defaultCarerCategories: CarerCategory[] = [
  {
    id: 'pads-liners',
    title: 'Pads & Daily Liners',
    image: '/images/carers/cat-womens-pants.png',
    description: 'Ultra-thin liners, rapid-absorption InstaDRY daytime pads, and high-capacity overnight Maxi pads.',
    href: '/for-carers?cat=pads-liners',
    badge: '4 Products',
    highlights: ['InstaDRY technology', 'Discreet daytime fit', 'Maxi overnight security'],
  },
  {
    id: 'pants',
    title: 'Pull-Up Protective Pants',
    image: '/images/carers/products/proskin-pants-super.png',
    description: 'Underwear-style pull-up pants for active or assisted wearers. Soft, breathable, and easy to tear off.',
    href: '/for-carers?cat=pants',
    badge: '5 Products',
    highlights: ['NDIS Consumables Eligible', 'Tear-away side seams', 'Triple leak protection'],
  },
  {
    id: 'flex',
    title: 'Flex Belted Briefs',
    image: '/images/carers/products/proskin-flex-maxi.png',
    description: 'Ergonomic belted briefs designed to reduce carer back strain by up to 70% during bed or wheelchair changes.',
    href: '/for-carers?cat=flex',
    badge: '3 Products',
    highlights: ['Ergonomic carer belt', 'ConfioAir breathable panels', 'Easy bed transfers'],
  },
  {
    id: 'slips',
    title: 'All-in-One Slips & Bariatric',
    image: '/images/carers/cat-unisex-specialists.png',
    description: 'Wide-tab all-in-one 2XL bariatric slips and anatomically contoured inserts for high-needs care.',
    href: '/for-carers?cat=slips',
    badge: '3 Products',
    highlights: ['Waist fit up to 178cm', 'Refastenable tabs', 'Two-piece fixation system'],
  },
  {
    id: 'bed-chair-protection',
    title: 'Bed & Chair Protection',
    image: '/images/carers/products/proskin-barrier-cream.png',
    description: 'Clinical protective underpads, mattress covers, skin barrier lotions and cleansers for pressure bed care.',
    href: '/for-carers?cat=bed-chair-protection',
    badge: '3 Products',
    highlights: ['Waterproof bed protection', 'Barrier cream & lotion', 'Gentle cleansing wipes'],
  },
  {
    id: 'mens',
    title: "Men's Protective Underwear",
    image: '/images/carers/products/men-active-fit-navy.png',
    description: 'Masculine navy blue protective underwear contoured specifically for the male anatomy.',
    href: '/for-carers?cat=mens',
    badge: '2 Products',
    highlights: ['Front targeted absorption', 'Discreet navy colour', 'Active fit stretch'],
  },
];

interface AdminState {
  isAuthenticated: boolean;
  adminUser: { id: number | string; name: string; email: string; role: string } | null;
  adminName: string;
  sidebarOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Business Data
  products: AdminProduct[];
  productOverrides: Record<string, Partial<AdminProduct>>;
  deletedProductIds: string[];
  customProducts: AdminProduct[];
  categories: AdminCategory[];
  carerCategories: CarerCategory[];
  orders: Order[];
  customers: Customer[];
  ndisQuotes: NdisQuote[];
  inquiries: ContactInquiry[];
  reviews: Review[];
  shippingZones: ShippingZone[];
  invoiceSettings: InvoiceSettings;
  paymentSettings: PaymentGatewaySettings;
  checkoutSettings: CheckoutSettings;
  smtpSettings: SmtpSettings;
  emailTemplates: EmailTemplate[];

  // Actions
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<boolean>;
  toggleSidebar: () => void;
  fetchAllData: () => Promise<void>;
  fetchPublicProducts: () => Promise<void>;

  // Product CRUD
  addProduct: (product: any) => Promise<boolean>;
  updateProduct: (id: string, updates: any) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  addCategory: (category: string | AdminCategory) => void;
  deleteCategory: (categoryId: string) => void;
  clearAllProducts: () => Promise<boolean>;

  // Order Operations
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: OrderStatus, paymentStatus?: PaymentStatus) => Promise<boolean>;
  updateOrderTracking: (id: string, trackingNumber: string) => Promise<boolean>;

  // Customer Operations
  addCustomer: (customer: any) => void;
  updateCustomer: (id: string, updates: any) => void;
  deleteCustomer: (id: string) => void;

  // NDIS Quotes & Hire Workflow
  addNdisQuote: (quote: NdisQuote) => void;
  updateNdisQuote: (quote: NdisQuote) => void;
  updateNdisQuoteStatus: (id: string, status: QuoteStatus) => Promise<boolean>;
  deleteNdisQuote: (id: string) => void;
  convertNdisQuoteToOrder: (quoteId: string, options?: { paymentMethod?: string; status?: OrderStatus }) => Order | null;

  // Inquiries
  addInquiry: (inquiry: any) => void;
  updateInquiryStatus: (id: string, status: any) => Promise<boolean>;
  addInquiryNote: (id: string, note: string) => void;
  deleteInquiry: (id: string) => void;

  // Reviews
  updateReviewStatus: (id: string, status: any) => void;
  replyToReview: (id: string, reply: string) => void;
  toggleReviewFeatured: (id: string) => void;
  toggleFeatureReview: (id: string) => void;
  deleteReview: (id: string) => void;
  addReview: (review: any) => void;

  // Settings
  updateInvoiceSettings: (updates: Partial<InvoiceSettings>) => void;
  updatePaymentSettings: (updates: Partial<PaymentGatewaySettings>) => void;
  updateCheckoutSettings: (updates: Partial<CheckoutSettings>) => void;
  updateSmtpSettings: (updates: Partial<SmtpSettings>) => Promise<boolean>;
  updateShippingZone: (id: string, updates: any) => void;
  updateEmailTemplate: (templateId: string, updates: Partial<EmailTemplate>) => void;
  resetEmailTemplates: () => void;
  clearAllTestData: () => void;

  // Carer Page
  setCarerCategories: (cats: CarerCategory[]) => void;
}

const defaultAdminCategories: AdminCategory[] = [
  { id: 'cat-chairs', name: 'Chairs & Lift Chairs' },
  { id: 'cat-bedroom', name: 'Beds & Pressure Care' },
  { id: 'cat-wheelchairs', name: 'Wheelchairs & Power Mobility' },
  { id: 'cat-bathroom', name: 'Bathroom & Hygiene' },
  { id: 'cat-mobility', name: 'Walking & Mobility Aids' },
  { id: 'cat-patient-handling', name: 'Patient Handling & Hoists' },
  { id: 'cat-daily-living', name: 'Daily Living & Independence' },
  { id: 'cat-pressure-care', name: 'Pressure Care & Cushions' },
  { id: 'cat-for-carers', name: 'Continence & Carer Aids' },
  { id: 'cat-paediatric', name: 'Paediatric Equipment' },
  { id: 'cat-bariatric', name: 'Bariatric High-Capacity' },
  { id: 'cat-ramps', name: 'Ramps & Access' },
  { id: 'cat-hire', name: 'Equipment Hire Fleet' },
];

const getLocalInvoiceSettings = (): InvoiceSettings => {
  const base: InvoiceSettings = {
    templateId: 'ndis-standard',
    companyName: 'AT Specialists Australia Pty Ltd',
    abn: '48 123 456 789',
    ndisRegistrationNumber: '4-3M19KL2-PROV',
    email: 'payments@atspecialists.com.au',
    phone: '0494 767 409',
    address: 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039 Australia',
    addressLine1: 'Level 2, 88 Holmes Road',
    addressLine2: 'Moonee Ponds VIC 3039',
    addressCountry: 'Australia',
    website: 'atspecialists.com.au',
    bankTitle: 'Bank Deposit via EFT',
    bankName: 'Commonwealth Bank of Australia (CBA)',
    bsb: '063-000',
    accountNumber: '1088 4422',
    accountName: 'Assistive Technology Specialists Australia Pty Ltd',
    remittanceTitle: 'Remittance & Inquiries:',
    terms: 'Net 14 Days',
    dueDate: 'Within 14 Days',
    requiredByDate: 'Within 14 Days',
    footerLeft: 'https://atspecialists.com.au • ABN: 48 123 456 789',
    footerRight: 'Page 1',
    paymentTermsDays: 14,
    brandColor: '#147A7A',
    notes: 'Thank you for choosing AT Specialists Australia. All equipment supplied meets certified Australian healthcare standards.',
    showNdisParticipantId: true,
    showItemizedGst: true,
    showTrackingDetails: true,
    showDirectDepositQr: true,
    showStatutoryNotice: false,
    statutoryNoticeText: '',
    mailTemplates: {},
    pdfTemplates: {},
  };
  try {
    const saved = localStorage.getItem('ats_invoice_settings');
    if (saved) {
      return {...base,...JSON.parse(saved) };
    }
  } catch { /* storage unavailable - continue with defaults */ }
  return base;
};

const defaultInvoiceSettings: InvoiceSettings = getLocalInvoiceSettings();

const defaultPaymentSettings: PaymentGatewaySettings = {
  paypalMerchantEmail: 'admin@atspecialists.com.au',
  paypalClientId: '',
  paypalSecretKey: '',
  paypalMode: 'sandbox',
  autoCapture: true,
  enablePayIn4: true,
  enableDirectCards: false,
  settlementBankName: 'Commonwealth Bank of Australia (CBA)',
  settlementAccountName: 'Assistive Technology Specialists Pty Ltd',
  settlementBsb: '063-000',
  settlementAccountNumber: '1088 4422',
  settlementPayId: 'payments@atspecialists.com.au',
  autoPayoutToBank: true,
  payoutSchedule: 'daily',
};

const defaultSmtpSettings: SmtpSettings = {
  host: 'smtp.hostinger.com',
  port: 587,
  secure: false,
  user: 'admin@atspecialists.com.au',
  pass: '',
  fromName: 'AT Specialists Australia',
  fromEmail: 'admin@atspecialists.com.au',
};

const defaultCheckoutSettings: CheckoutSettings = {
  enablePayment: true,
  enableQuotation: true,
};

/**
 * IDs shipped with the app catalogue. Anything else in the product list was
 * added by the admin and is the only product data worth persisting —
 * the full 1,200+ product catalogue (~8MB) exceeds the ~5MB localStorage
 * quota and must always be re-seeded fresh from products.json instead.
 */
const CATALOGUE_IDS = new Set<string>((initialFallbackProducts || []).map((p: Product) => p.id));

/**
 * Maps a catalogue product to the admin product shape.
 * Single source of truth so the admin panel always reflects products.json.
 */
function mapCatalogueProduct(p: Product): AdminProduct {
  const gImages = p.galleryImages && p.galleryImages.length > 0 ? p.galleryImages : [p.image];
  return {
    ...p,
    brand: resolveProductBrand(p),
    price: p.buyPrice || 0,
    category: p.categories?.[0] || 'General',
    description: p.shortDescription || p.fullDescription || '',
    available: p.buyAvailable ?? true,
    hirePeriod: 'week',
    hasFreeSample: false,
    sampleNote: 'Available for OT clinical evaluation upon request',
    image: p.image,
    thumbnail: p.image,
    galleryImages: gImages,
    images: gImages,
    stock: 25,
    sku: p.sku || p.id.toUpperCase(),
    lowStockThreshold: 5,
  };
}

/**
 * Builds authoritative effective products by combining base catalogue,
 * applying delta overrides, excluding deleted IDs, and appending custom products.
 */
export function buildEffectiveProducts(overrides: Record<string, Partial<AdminProduct>> = {},
  deletedIds: string[] = [],
  customProds: AdminProduct[] = []): AdminProduct[] {
  const deletedSet = new Set((deletedIds || []).map((id) => String(id).toLowerCase().trim()));
  const catalogueProds = (initialFallbackProducts || []).map(mapCatalogueProduct);

  const mergedCatalogue = catalogueProds
    .filter((p: AdminProduct) =>
        !deletedSet.has(String(p.id).toLowerCase().trim()) &&
        !deletedSet.has(String(p.sku || '').toLowerCase().trim()))
    .map((p: AdminProduct) => {
      const o = overrides[p.id] || overrides[p.sku];
      if (!o) return p;
      const finalPrice = o.price !== undefined ? Number(o.price) : o.buyPrice !== undefined ? Number(o.buyPrice) : p.price;
      const finalBuyPrice = o.buyPrice !== undefined ? Number(o.buyPrice) : o.price !== undefined ? Number(o.price) : p.buyPrice;

      const effectiveImage = o.image !== undefined ? o.image : (o.thumbnail !== undefined ? o.thumbnail : p.image);
      const effectiveGallery = o.galleryImages !== undefined 
        ? o.galleryImages 
        : (o.images !== undefined ? o.images : p.galleryImages);
      const effectiveImages = effectiveGallery && effectiveGallery.length > 0
        ? effectiveGallery
        : (effectiveImage ? [effectiveImage] : []);

      const effectiveVariants = (o.variants || p.variants || []).map((v: any) => {
        const vImgValid = v.image && effectiveImages.includes(v.image);
        return {
          ...v,
          image: vImgValid ? v.image : effectiveImage,
        };
      });

      return {
        ...p,
        ...o,
        image: effectiveImage,
        thumbnail: effectiveImage,
        galleryImages: effectiveImages,
        images: effectiveImages,
        variants: effectiveVariants,
        price: finalPrice,
        buyPrice: finalBuyPrice,
      };
    });

  const validCustom = (customProds || [])
    .filter((p: AdminProduct) =>
        !deletedSet.has(String(p.id).toLowerCase().trim()) &&
        !deletedSet.has(String(p.sku || '').toLowerCase().trim()))
    .map((p: AdminProduct) => {
      const effectiveImage = p.image || p.thumbnail || '';
      const effectiveGallery = p.galleryImages && p.galleryImages.length > 0
        ? p.galleryImages
        : (p.images && p.images.length > 0 ? p.images : (effectiveImage ? [effectiveImage] : []));
      const effectiveVariants = (p.variants || []).map((v: any) => {
        const vImgValid = v.image && effectiveGallery.includes(v.image);
        return {
          ...v,
          image: vImgValid ? v.image : effectiveImage,
        };
      });
      return {
        ...p,
        image: effectiveImage,
        thumbnail: effectiveImage,
        galleryImages: effectiveGallery,
        images: effectiveGallery,
        variants: effectiveVariants,
      };
    });

  return [...validCustom,...mergedCatalogue];
}

/**
 * Persisted-state migration: refreshes supplier catalogue records from the
 * latest products.json while preserving admin-added products, deleted flags,
 * and operational overrides.
 */
function migrateAdminPersistedState(persisted: any): any {
  if (!persisted) return persisted;
  const overrides: Record<string, Partial<AdminProduct>> = persisted.productOverrides || {};
  const deletedIds: string[] = Array.isArray(persisted.deletedProductIds)
    ? persisted.deletedProductIds
    : [];

  let customProds: AdminProduct[] = Array.isArray(persisted.customProducts)
    ? persisted.customProducts
    : Array.isArray(persisted.products)
    ? (persisted.products as AdminProduct[]).filter((p) => !CATALOGUE_IDS.has(p.id))
    : [];

  const effective = buildEffectiveProducts(overrides, deletedIds, customProds);

  return {
    ...persisted,
    productOverrides: overrides,
    deletedProductIds: deletedIds,
    customProducts: customProds,
    products: effective,
  };
}

export const useAdminStore = create<AdminState>()(persist((set, get) => ({
      isAuthenticated: false,
      adminUser: null,
      adminName: 'Clinical Admin',
      sidebarOpen: true,
      isLoading: false,
      error: null,

      productOverrides: {},
      deletedProductIds: [],
      customProducts: [],
      products: buildEffectiveProducts({}, [], []),
      categories: defaultAdminCategories,
      orders: [],
      customers: [],
      ndisQuotes: [],
      inquiries: [],
      reviews: [],
      shippingZones: [
        {
          id: 'zone-1',
          name: 'Australia National (Metro & Regional)',
          regions: 'VIC, NSW, QLD, WA, SA, TAS, ACT, NT',
          methods: [
            { name: 'Standard Delivery', price: 0, estimatedDays: '2–5 business days', active: true },
            { name: 'Express Courier', price: 29, estimatedDays: '1–2 business days', active: true },
            { name: 'White Glove Setup', price: 149, estimatedDays: 'Scheduled in-room setup', active: true },
          ],
        },
      ],
      invoiceSettings: defaultInvoiceSettings,
      paymentSettings: defaultPaymentSettings,
      checkoutSettings: defaultCheckoutSettings,
      smtpSettings: defaultSmtpSettings,
      emailTemplates: [],
      carerCategories: defaultCarerCategories,

      login: async (email: string, pass: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiAdminLogin(email, pass);
          if (res.success && res.token) {
            set({
              isAuthenticated: true,
              adminUser: res.user,
              adminName: res.user.name || 'Clinical Admin',
              isLoading: false,
              error: null,
            });
            get().fetchAllData();
            return true;
          }
          set({ isLoading: false, error: 'Invalid credentials' });
          return false;
        } catch (err: any) {
          set({ isLoading: false, error: err.message || 'Login failed' });
          return false;
        }
      },

      logout: () => {
        clearAdminToken();
        set({
          isAuthenticated: false,
          adminUser: null,
          adminName: 'Clinical Admin',
          error: null,
        });
      },

      checkAuth: async () => {
        const token = getAdminToken();
        if (!token) {
          set({ isAuthenticated: false, adminUser: null });
          return false;
        }
        try {
          const res = await apiGetAdminProfile();
          if (res.success && res.user && res.user.role === 'admin') {
            set({
              isAuthenticated: true,
              adminUser: res.user,
              adminName: res.user.name || 'Clinical Admin',
            });
            return true;
          }
          get().logout();
          return false;
        } catch {
          get().logout();
          return false;
        }
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      fetchAllData: async () => {
        const token = getAdminToken();
        if (!token) {
          if (get().isAuthenticated) {
            get().logout();
          }
          return;
        }

        if (!get().isAuthenticated) {
          const authed = await get().checkAuth();
          if (!authed) {
            return;
          }
        }

        try {
          const [prodsRes, ordersRes, quotesRes, inqRes, custRes, settingsRes] = await Promise.allSettled([
            apiGetProducts(),
            apiGetOrders(),
            apiGetNdisQuotes(),
            apiGetInquiries(),
            apiGetCustomers(),
            apiGetSettings(),
          ]);

          if (prodsRes.status === 'fulfilled') {
            const rawProds = prodsRes.value?.products || [];
            const mappedProds: AdminProduct[] = rawProds.map((p: any): AdminProduct => ({
              id: p.id,
              name: p.name,
              slug: p.slug || p.id,
              sku: p.sku || p.id.toUpperCase(),
              price: parseFloat(p.price) || 0,
              buyPrice: parseFloat(p.buyPrice ?? p.price ?? 0),
              hirePrice: parseFloat(p.hire_price ?? p.hirePrice ?? 0),
              hirePeriod: 'week' as const,
              category: p.category || (Array.isArray(p.categories) && p.categories.length > 0 ? p.categories[0] : 'General'),
              categories: p.categories || [p.category || 'General'],
              image: p.image || PLACEHOLDER_IMAGE,
              galleryImages: p.galleryImages || p.gallery_images || p.images || [p.image || PLACEHOLDER_IMAGE],
              images: p.galleryImages || p.gallery_images || p.images || [p.image || PLACEHOLDER_IMAGE],
              thumbnail: p.thumbnail || p.image || PLACEHOLDER_IMAGE,
              brand: p.brand || 'AT Specialists',
              stock: parseInt(p.stock || 25, 10),
              lowStockThreshold: parseInt(p.low_stock_threshold || 5, 10),
              available: p.is_active !== 0,
              buyAvailable: p.buyAvailable ?? true,
              hireAvailable: p.hireAvailable ?? (parseFloat(p.hire_price ?? p.hirePrice ?? 0) > 0),
              purchaseType: p.purchaseType || 'both',
              rating: p.rating ? parseFloat(p.rating) : 5.0,
              reviewCount: p.reviewCount ? parseInt(p.reviewCount, 10) : 12,
              featured: p.is_featured === 1,
              shortDescription: p.shortDescription || p.description?.slice(0, 120) || '',
              fullDescription: p.fullDescription || p.description || '',
              description: p.description || '',
              features: p.features || [],
              specifications: p.specifications || [],
              tags: p.tags || [p.category || 'assistive-tech'],
              attributes: p.attributes || [],
              variants: p.variants || [],
              optionalEquipment: p.optionalEquipment || [],
              accessories: p.accessories || [],
              relatedProductIds: p.relatedProductIds || [],
              documents: p.documents || [],
              stockStatus: p.stockStatus || 'in_stock',
              quoteRequired: p.quoteRequired || false,
              gstType: p.gst_type || p.gstType || 'gst-free',
              gstRate: parseFloat(p.gst_rate ?? p.gstRate ?? 0),
              deliveryFee: parseFloat(p.delivery_fee ?? p.deliveryFee ?? 0),
              freeDelivery: p.free_delivery === 1 || p.freeDelivery === true || Boolean(p.freeDelivery),
              hasFreeSample: p.has_free_sample === 1 || p.hasFreeSample === true || Boolean(p.hasFreeSample),
              sampleNote: p.sample_note || p.sampleNote || 'Available for OT clinical evaluation upon request',
            }));

            // Merge MySQL products with catalogue and active overrides
            const dbOverrides = {...get().productOverrides };
            const dbCustom: AdminProduct[] = [...get().customProducts];
            const deletedSet = new Set(get().deletedProductIds);

            mappedProds.forEach((p) => {
              if (!p.available) {
                deletedSet.add(p.id);
                return;
              }
              if (CATALOGUE_IDS.has(p.id)) {
                dbOverrides[p.id] = {
                  ...(dbOverrides[p.id] || {}),
                  name: p.name,
                  price: p.price,
                  buyPrice: p.buyPrice,
                  stock: p.stock,
                  category: p.category,
                  image: p.image,
                  thumbnail: p.image,
                  galleryImages: p.galleryImages,
                  images: p.images,
                  sku: p.sku,
                  brand: p.brand,
                  description: p.description,
                };
              } else {
                const idx = dbCustom.findIndex((c) => c.id === p.id);
                if (idx >= 0) dbCustom[idx] = p;
                else dbCustom.push(p);
              }
            });

            const nextProducts = buildEffectiveProducts(dbOverrides, Array.from(deletedSet), dbCustom);

            // Sync categories from all effective products
            const allCats = Array.from(new Set([...nextProducts.map((p) => p.category?.trim()),...defaultAdminCategories.map((c) => c.name)].filter(Boolean))).map((catName) => ({
              id: String(catName).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: String(catName),
            }));

            set({
              products: nextProducts,
              categories: allCats,
              productOverrides: dbOverrides,
              customProducts: dbCustom,
            });
          }

          if (ordersRes.status === 'fulfilled' && ordersRes.value.orders) {
            set({
              orders: ordersRes.value.orders.map((o: any) => ({
                id: o.id,
                customerName: o.customer_name || o.customerName || '',
                customerEmail: o.customer_email || o.customerEmail || '',
                customerPhone: o.customer_phone || o.customerPhone || '',
                shippingAddress: o.shipping_address || o.shippingAddress || '',
                deliveryMethod: o.delivery_method || o.deliveryMethod || 'standard',
                subtotal: parseFloat(o.subtotal || 0),
                deliveryFee: parseFloat(o.delivery_fee || 0),
                gstTotal: parseFloat(o.gst_total || 0),
                total: parseFloat(o.total || 0),
                status: (o.status || 'confirmed') as OrderStatus,
                paymentStatus: (o.payment_status || 'paid') as PaymentStatus,
                paymentMethod: o.payment_method || 'PayPal',
                paypalOrderId: o.paypal_order_id,
                paypalCaptureId: o.paypal_capture_id,
                trackingNumber: o.tracking_number,
                ndisNumber: o.ndis_number,
                createdAt: o.created_at ? o.created_at.split('T')[0] : '',
                items: Array.isArray(o.items) ? o.items.map((i: any) => ({
                  productId: i.product_id || i.productId || i.id,
                  id: i.id || i.product_id || i.productId,
                  code: i.code || i.sku || i.product_id || i.productId || i.id,
                  sku: i.sku || i.code || i.product_id || i.productId || i.id,
                  name: i.name || i.product_name || '',
                  detail: i.detail,
                  quantity: Number(i.quantity || 0),
                  price: Number(i.price || 0),
                  purchaseType: i.purchase_type || i.purchaseType,
                  hireWeeks: i.hire_weeks || i.hireWeeks,
                })) : [],
              })),
            });
          }

          if (quotesRes.status === 'fulfilled' && quotesRes.value.quotes) {
            set({
              ndisQuotes: quotesRes.value.quotes.map((q: any) => ({
                id: q.id,
                customerName: q.customer_name || q.participant_name || q.participantName || '',
                participantName: q.participant_name || q.participantName || '',
                participantEmail: q.participant_email || q.participantEmail || '',
                participantPhone: q.participant_phone || q.participantPhone || '',
                ndisNumber: q.ndis_number || q.ndisNumber || '',
                planType: q.plan_type || 'plan_managed',
                planManager: q.plan_manager || q.plan_manager_name || '',
                planManagerName: q.plan_manager_name || q.plan_manager || '',
                planManagerEmail: q.plan_manager_email,
                shippingAddress: q.shipping_address || '',
                deliveryMethod: q.delivery_method || 'standard',
                subtotal: parseFloat(q.subtotal || 0),
                deliveryFee: parseFloat(q.delivery_fee || 0),
                total: parseFloat(q.total || 0),
                status: (q.status || 'draft') as QuoteStatus,
                createdAt: q.created_at ? q.created_at.split('T')[0] : '',
                validUntil: q.valid_until ? q.valid_until.split('T')[0] : '',
                notes: q.notes || '',
                items: Array.isArray(q.items) ? q.items.map((i: any) => ({
                  id: i.id || i.product_id,
                  productId: i.product_id || i.productId || i.id,
                  code: i.code || i.sku || i.product_id || i.productId || i.id,
                  sku: i.sku || i.code || i.product_id || i.productId || i.id,
                  name: i.name || i.product_name || '',
                  detail: i.detail,
                  quantity: Number(i.quantity || 0),
                  price: Number(i.price || 0),
                  fundingCategory: i.fundingCategory || i.funding_category,
                  purchaseType: i.purchase_type || i.purchaseType,
                  hireWeeks: i.hire_weeks || i.hireWeeks,
                })) : [],
              })),
            });
          }

          if (inqRes.status === 'fulfilled' && inqRes.value.inquiries) {
            set({
              inquiries: inqRes.value.inquiries.map((iq: any) => ({
                id: iq.id,
                name: iq.name,
                email: iq.email,
                phone: iq.phone || '',
                enquiryType: iq.enquiry_type || 'General',
                ndisNumber: iq.ndis_number || '',
                subject: iq.subject,
                message: iq.message,
                preferredContact: (iq.preferred_contact || 'email') as any,
                status: iq.status || 'new',
                createdAt: iq.created_at ? iq.created_at.split('T')[0] : '',
                notes: typeof iq.notes === 'string' ? iq.notes : '',
              })),
            });
          }

          if (custRes.status === 'fulfilled' && custRes.value.customers) {
            set({
              customers: custRes.value.customers.map((c: any) => ({
                id: c.id,
                name: c.name || 'Customer',
                email: c.email || '',
                phone: c.phone || '',
                ordersCount: Math.max(0, parseInt(c.orders_count ?? 0, 10)),
                totalSpent: Math.max(0, parseFloat(c.total_spent ?? 0)),
                joinedAt: c.created_at ? c.created_at.split('T')[0] : '',
                ndisNumber: c.ndis_number || '',
                planManager: c.plan_manager || '',
                address: c.address || '',
                notes: c.notes || '',
              })),
            });
          }

          if (settingsRes.status === 'fulfilled' && settingsRes.value?.settings) {
            const s = settingsRes.value.settings;
            if (s.invoice_settings) {
              set((state) => {
                const merged = {...state.invoiceSettings,...s.invoice_settings };
                try {
                  localStorage.setItem('ats_invoice_settings', JSON.stringify(merged));
                } catch { /* storage unavailable - continue with defaults */ }
                return { invoiceSettings: merged };
              });
            }
          }
        } catch (e) {
          console.warn('Backend fetch data notice:', e);
        }
      },

      fetchPublicProducts: async () => {
        try {
          const res = await apiGetProducts();
          const raw = res?.products;
          if (Array.isArray(raw) && raw.length > 0) {
            set((state) => {
              const dbCustom: AdminProduct[] = [];
              const dbOverrides = {...state.productOverrides };
              const deletedSet = new Set(state.deletedProductIds);

              raw.forEach((p: any) => {
                if (p.is_active === 0 || p.isActive === false) {
                  deletedSet.add(p.id);
                  return;
                }

                if (CATALOGUE_IDS.has(p.id)) {
                  dbOverrides[p.id] = {
                    ...(dbOverrides[p.id] || {}),
                    name: p.name,
                    price: parseFloat(p.price) || dbOverrides[p.id]?.price,
                    buyPrice: parseFloat(p.buyPrice ?? p.price) || dbOverrides[p.id]?.buyPrice,
                    stock: p.stock !== undefined ? parseInt(p.stock, 10) : dbOverrides[p.id]?.stock,
                    category: p.category || dbOverrides[p.id]?.category,
                    image: p.image || dbOverrides[p.id]?.image,
                    thumbnail: p.image || dbOverrides[p.id]?.thumbnail || dbOverrides[p.id]?.image,
                    galleryImages: p.galleryImages || p.gallery_images || dbOverrides[p.id]?.galleryImages,
                    images: p.galleryImages || p.gallery_images || dbOverrides[p.id]?.images,
                    sku: p.sku || dbOverrides[p.id]?.sku,
                    brand: p.brand || dbOverrides[p.id]?.brand,
                    description: p.description || dbOverrides[p.id]?.description,
                  };
                } else {
                  dbCustom.push({
                    id: p.id,
                    name: p.name,
                    slug: p.slug || p.id,
                    sku: p.sku || p.id.toUpperCase(),
                    price: parseFloat(p.price) || 0,
                    buyPrice: parseFloat(p.buyPrice ?? p.price ?? 0),
                    hirePrice: parseFloat(p.hire_price ?? p.hirePrice ?? 0),
                    hirePeriod: p.hire_period || 'week',
                    category: p.category || (Array.isArray(p.categories) && p.categories.length > 0 ? p.categories[0] : 'General'),
                    categories: Array.isArray(p.categories) ? p.categories : [p.category || 'General'],
                    image: p.image || PLACEHOLDER_IMAGE,
                    galleryImages: Array.isArray(p.galleryImages) ? p.galleryImages : [p.image || PLACEHOLDER_IMAGE],
                    images: Array.isArray(p.images) ? p.images : [p.image || PLACEHOLDER_IMAGE],
                    thumbnail: p.thumbnail || p.image || PLACEHOLDER_IMAGE,
                    brand: p.brand || 'AT Specialists',
                    stock: parseInt(p.stock || 25, 10),
                    lowStockThreshold: parseInt(p.low_stock_threshold || 5, 10),
                    available: p.is_active !== 0,
                    buyAvailable: p.buyAvailable ?? true,
                    hireAvailable: p.hireAvailable ?? (parseFloat(p.hire_price ?? p.hirePrice ?? 0) > 0),
                    purchaseType: p.purchaseType || 'both',
                    rating: p.rating ? parseFloat(p.rating) : 5.0,
                    reviewCount: p.reviewCount ? parseInt(p.reviewCount, 10) : 12,
                    featured: p.is_featured === 1,
                    shortDescription: p.short_description || p.shortDescription || '',
                    fullDescription: p.description || '',
                    description: p.description || '',
                    features: Array.isArray(p.features) ? p.features : [],
                    specifications: Array.isArray(p.specifications) ? p.specifications : [],
                    tags: Array.isArray(p.tags) ? p.tags : [p.category || 'assistive-tech'],
                    attributes: Array.isArray(p.attributes) ? p.attributes : [],
                    variants: Array.isArray(p.variants) ? p.variants : [],
                    optionalEquipment: [],
                    accessories: [],
                    relatedProductIds: [],
                    documents: [],
                    stockStatus: p.stock <= 0 ? 'out_of_stock' : 'in_stock',
                    quoteRequired: false,
                    gstType: p.gst_type || 'gst-free',
                    gstRate: parseFloat(p.gst_rate ?? 0),
                    deliveryFee: parseFloat(p.delivery_fee ?? 0),
                    freeDelivery: Boolean(p.free_delivery),
                    hasFreeSample: Boolean(p.has_free_sample),
                    sampleNote: p.sample_note || '',
                  });
                }
              });

              const nextDeleted = Array.from(deletedSet);
              const mergedCustom = [...state.customProducts];
              dbCustom.forEach((dc) => {
                const idx = mergedCustom.findIndex((c) => c.id === dc.id);
                if (idx >= 0) mergedCustom[idx] = dc;
                else mergedCustom.push(dc);
              });

              const nextProducts = buildEffectiveProducts(dbOverrides, nextDeleted, mergedCustom);
              return {
                productOverrides: dbOverrides,
                deletedProductIds: nextDeleted,
                customProducts: mergedCustom,
                products: nextProducts,
              };
            });
          }
        } catch {
          // Offline / standalone mode - retain local store
        }
      },

      addProduct: async (productData: any) => {
        let createdId = productData.id;
        try {
          const res = await apiCreateProduct(productData);
          if (res?.product?.id) createdId = res.product.id;
        } catch (e) {
          console.warn('Backend create product notice:', e);
        }

        const newProd: AdminProduct = {
          id: createdId || `eq-${Date.now()}`,
          ...productData,
          price: Number(productData.price) || 0,
          buyPrice: Number(productData.buyPrice ?? productData.price) || 0,
          category: productData.category || 'General',
          categories: productData.categories || [productData.category || 'General'],
          images: productData.images || productData.galleryImages || [productData.image],
          galleryImages: productData.galleryImages || productData.images || [productData.image],
          thumbnail: productData.image,
          stock: Number(productData.stock) || 25,
          sku: productData.sku || `AT-${Date.now()}`,
          lowStockThreshold: Number(productData.lowStockThreshold) || 5,
          available: productData.available !== false,
          buyAvailable: productData.buyAvailable ?? true,
        };

        set((state) => {
          const nextCustom = [newProd,...state.customProducts.filter((p) => p.id !== newProd.id)];
          const nextProducts = buildEffectiveProducts(state.productOverrides, state.deletedProductIds, nextCustom);

          const catName = productData.category?.trim() || 'General';
          const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          const exists = state.categories.some((c) => c.id === catSlug || c.name.toLowerCase() === catName.toLowerCase());
          const nextCategories = exists
            ? state.categories
            : [...state.categories, { id: catSlug, name: catName }];

          return {
            customProducts: nextCustom,
            products: nextProducts,
            categories: nextCategories,
          };
        });

        return true;
      },

      updateProduct: async (id: string, updates: any) => {
        try {
          await apiUpdateProduct(id, updates);
        } catch (e) {
          console.warn('Backend update product notice:', e);
        }

        set((state) => {
          const isCatalogue = CATALOGUE_IDS.has(id);
          const nextOverrides = {...state.productOverrides };
          let nextCustom = [...state.customProducts];

          const sanitizedImage = updates.image !== undefined ? updates.image : undefined;
          const sanitizedGallery = updates.galleryImages !== undefined
            ? updates.galleryImages
            : (updates.images !== undefined ? updates.images : (sanitizedImage ? [sanitizedImage] : undefined));

          const cleanUpdates = {
            ...updates,
            ...(sanitizedImage !== undefined ? { image: sanitizedImage, thumbnail: sanitizedImage } : {}),
            ...(sanitizedGallery !== undefined ? { galleryImages: sanitizedGallery, images: sanitizedGallery } : {}),
          };

          if (isCatalogue) {
            nextOverrides[id] = {
              ...(nextOverrides[id] || {}),
              ...cleanUpdates,
              price: updates.price !== undefined ? Number(updates.price) : updates.buyPrice !== undefined ? Number(updates.buyPrice) : undefined,
              buyPrice: updates.buyPrice !== undefined ? Number(updates.buyPrice) : updates.price !== undefined ? Number(updates.price) : undefined,
            };
            if (nextOverrides[id].price === undefined) delete nextOverrides[id].price;
            if (nextOverrides[id].buyPrice === undefined) delete nextOverrides[id].buyPrice;
          } else {
            nextCustom = nextCustom.map((p) => (p.id === id ? {...p,...cleanUpdates } : p));
          }

          const nextProducts = buildEffectiveProducts(nextOverrides, state.deletedProductIds, nextCustom);

          const catName = updates.category?.trim();
          let nextCategories = state.categories;
          if (catName) {
            const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            if (!state.categories.some((c) => c.id === catSlug || c.name.toLowerCase() === catName.toLowerCase())) {
              nextCategories = [...state.categories, { id: catSlug, name: catName }];
            }
          }

          return {
            productOverrides: nextOverrides,
            customProducts: nextCustom,
            products: nextProducts,
            categories: nextCategories,
          };
        });

        return true;
      },

      deleteProduct: async (id: string) => {
        try {
          await apiDeleteProduct(id);
        } catch (e) {
          console.warn('API delete notice:', e);
        }

        set((state) => {
          const nextDeleted = Array.from(new Set([...state.deletedProductIds, id]));
          const nextCustom = state.customProducts.filter((p) => p.id !== id);
          const nextOverrides = {...state.productOverrides };
          delete nextOverrides[id];

          const nextProducts = buildEffectiveProducts(nextOverrides, nextDeleted, nextCustom);
          return {
            deletedProductIds: nextDeleted,
            customProducts: nextCustom,
            productOverrides: nextOverrides,
            products: nextProducts,
          };
        });

        return true;
      },

      addCategory: (category: string | AdminCategory) => {
        if (typeof category === 'string') {
          const catName = category.trim();
          const id = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          set((state) => {
            if (state.categories.some((c) => c.id === id || c.name.toLowerCase() === catName.toLowerCase())) {
              return state;
            }
            return {
              categories: [...state.categories, { id, name: catName }],
            };
          });
        } else {
          set((state) => {
            if (state.categories.some((c) => c.id === category.id)) {
              return state;
            }
            return {
              categories: [...state.categories, category],
            };
          });
        }
      },

      deleteCategory: (categoryId: string) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== categoryId && c.name.toLowerCase() !== categoryId.toLowerCase()),
        }));
      },

      clearAllProducts: async () => {
        try {
          await fetch('/api/products/clear-all', { method: 'DELETE' });
        } catch (e) {
          console.warn('Backend clear all products notice:', e);
        }
        set((state) => {
          const allIds = state.products.map((p) => p.id);
          return {
            productOverrides: {},
            customProducts: [],
            deletedProductIds: allIds,
            products: [],
            categories: [],
          };
        });
        return true;
      },

      addOrder: (order: Order) => {
        set((state) => ({
          orders: [order,...state.orders],
        }));
      },

      updateOrderStatus: async (id: string, status: OrderStatus, paymentStatus?: PaymentStatus) => {
        try {
          const res = await apiUpdateOrderStatus(id, status, paymentStatus);
          if (res.success) {
            set((state) => ({
              orders: state.orders.map((o) =>
                o.id === id
                  ? {...o, status, paymentStatus: paymentStatus || o.paymentStatus }
                  : o),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      updateOrderTracking: async (id: string, trackingNumber: string) => {
        try {
          const res = await apiUpdateOrderTracking(id, trackingNumber);
          if (res.success) {
            set((state) => ({
              orders: state.orders.map((o) => (o.id === id ? {...o, trackingNumber } : o)),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      addCustomer: (customer: any) => {
        set((state) => {
          const exists = state.customers.some((c) => c.email.toLowerCase() === customer.email.toLowerCase());
          if (exists) {
            return {
              customers: state.customers.map((c) =>
                c.email.toLowerCase() === customer.email.toLowerCase()
                  ? {...c, ordersCount: c.ordersCount + 1, totalSpent: c.totalSpent + (customer.totalSpent || 0) }
                  : c),
            };
          }
          return {
            customers: [
              {
                id: `CUST-${Date.now().toString().slice(-6)}`,
                name: customer.name,
                email: customer.email,
                phone: customer.phone || '',
                ordersCount: customer.ordersCount || 1,
                totalSpent: customer.totalSpent || 0,
                joinedAt: new Date().toISOString().split('T')[0],
                ndisNumber: customer.ndisNumber,
                address: customer.address,
              },
              ...state.customers,
            ],
          };
        });
      },

      updateCustomer: (id: string, updates: any) => {
        set((state) => ({
          customers: state.customers.map((c) => (c.id === id ? {...c,...updates } : c)),
        }));
      },

      deleteCustomer: (id: string) => {
        set((state) => ({
          customers: state.customers.filter((c) => c.id !== id),
        }));
      },

      addNdisQuote: (quote: NdisQuote) => {
        set((state) => ({
          ndisQuotes: [quote, ...state.ndisQuotes],
        }));
      },

      updateNdisQuote: (quote: NdisQuote) => {
        set((state) => ({
          ndisQuotes: state.ndisQuotes.map((q) => (q.id === quote.id ? { ...q, ...quote } : q)),
        }));
      },

      updateNdisQuoteStatus: async (id: string, status: QuoteStatus) => {
        try {
          const res = await apiUpdateNdisQuoteStatus(id, status);
          if (res.success) {
            set((state) => ({
              ndisQuotes: state.ndisQuotes.map((q) => (q.id === id ? { ...q, status } : q)),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      deleteNdisQuote: (id: string) => {
        set((state) => ({
          ndisQuotes: state.ndisQuotes.filter((q) => q.id !== id),
        }));
      },

      convertNdisQuoteToOrder: (quoteId: string, options?: { paymentMethod?: string; status?: OrderStatus }) => {
        const state = get();
        const quote = state.ndisQuotes.find((q) => q.id === quoteId);
        if (!quote) return null;

        const isHire = quote.quoteType === 'hire' || quote.id.toUpperCase().startsWith('HIR') ||
          (Array.isArray(quote.items) && quote.items.some((it: any) => it.isRental || it.type === 'hire' || (it.purchaseType || '').toLowerCase() === 'hire'));

        // Distinctive Order ID
        let orderId = '';
        if (isHire) {
          orderId = quote.id.replace(/^HIR-QT-/, 'HIR-');
          if (orderId === quote.id) {
            orderId = `HIR-${Date.now().toString().slice(-6)}`;
          }
        } else {
          orderId = quote.id.replace(/^NDIS-QT-/, 'NDIS-ORD-');
          if (orderId === quote.id) {
            orderId = `NDIS-ORD-${Date.now().toString().slice(-6)}`;
          }
        }

        const orderItems = (quote.items || []).map((it: any, idx: number) => ({
          productId: it.productId || it.id || `item-${idx}`,
          id: it.id || `item-${idx}`,
          code: it.code || it.sku || (isHire ? 'HIRE-EQUIP-01' : '05_120603099_0105_1_2'),
          name: it.name,
          detail: it.detail || (isHire ? `Hire Tenure: ${quote.hireDurationWeeks || 2} Weeks` : ''),
          quantity: Number(it.quantity) || 1,
          price: Number(it.price) || 0,
          purchaseType: (isHire ? 'hire' : (it.purchaseType || 'buy')) as 'buy' | 'hire',
          hireWeeks: isHire ? (quote.hireDurationWeeks || Number(it.hireWeeks) || 2) : undefined,
          deliveryFee: 0,
        }));

        const calculatedSubtotal = orderItems.reduce((sum, it) => sum + (it.price * it.quantity), 0);
        const deliveryFee = (quote as any).deliveryFee ? Number((quote as any).deliveryFee) : 0;
        const total = Math.round((calculatedSubtotal + deliveryFee) * 100) / 100;

        const newOrder: Order = {
          id: orderId,
          customerName: quote.customerName,
          customerEmail: quote.customerEmail || 'orders@atspecialists.com.au',
          customerPhone: quote.customerPhone,
          shippingAddress: quote.shippingAddress || 'Melbourne VIC 3000',
          items: orderItems,
          subtotal: calculatedSubtotal,
          deliveryFee,
          total: total || quote.total,
          status: options?.status || 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: options?.paymentMethod || (isHire ? 'Hire Agreement Payment (Confirmed)' : `NDIS Funding (${quote.planManager || 'Plan Managed'})`),
          ndisNumber: quote.ndisNumber,
          notes: `Converted from Quote #${quote.id}. ${quote.notes || ''}`.trim(),
          createdAt: new Date().toISOString(),
          // Persist all hire schedule metadata
          hireLocationType: quote.hireLocationType,
          hireFacilityName: quote.hireFacilityName,
          hireFacilityWard: quote.hireFacilityWard,
          hireFacilityRoom: quote.hireFacilityRoom,
          hireDischargeDate: quote.hireDischargeDate,
          hireStartDate: quote.hireStartDate,
          hireReturnDate: quote.hireReturnDate,
          hireDurationWeeks: quote.hireDurationWeeks,
        };

        set((s) => ({
          orders: [newOrder, ...s.orders],
          ndisQuotes: s.ndisQuotes.map((q) => q.id === quoteId ? { ...q, status: 'approved' as QuoteStatus } : q),
        }));

        return newOrder;
      },

      addInquiry: (inquiry: any) => {
        set((state) => ({
          inquiries: [
            {
              ...inquiry,
              id: inquiry.id || `INQ-${Date.now().toString().slice(-6)}`,
              status: 'new',
              createdAt: new Date().toISOString().split('T')[0],
            },
            ...state.inquiries,
          ],
        }));
      },

      updateInquiryStatus: async (id: string, status: any) => {
        try {
          const res = await apiUpdateInquiryStatus(id, status);
          if (res.success) {
            set((state) => ({
              inquiries: state.inquiries.map((inq) => (inq.id === id ? {...inq, status } : inq)),
            }));
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      addInquiryNote: (id: string, note: string) => {
        set((state) => ({
          inquiries: state.inquiries.map((inq) =>
            inq.id === id
              ? {
                  ...inq,
                  notes: inq.notes ? `${inq.notes}\n[${new Date().toLocaleDateString('en-AU')}] ${note}` : `[${new Date().toLocaleDateString('en-AU')}] ${note}`,
                }
              : inq),
        }));
      },

      deleteInquiry: (id: string) => {
        set((state) => ({
          inquiries: state.inquiries.filter((inq) => inq.id !== id),
        }));
      },

      updateReviewStatus: (id: string, status: any) => {
        set((state) => ({
          reviews: state.reviews.map((r) => (r.id === id ? {...r, status } : r)),
        }));
      },

      replyToReview: (id: string, reply: string) => {
        set((state) => ({
          reviews: state.reviews.map((r) =>
            r.id === id
              ? {...r, adminReply: reply, adminReplyDate: new Date().toISOString().split('T')[0] }
              : r),
        }));
      },

      toggleReviewFeatured: (id: string) => {
        set((state) => ({
          reviews: state.reviews.map((r) => (r.id === id ? {...r, featured: !r.featured } : r)),
        }));
      },

      toggleFeatureReview: (id: string) => {
        get().toggleReviewFeatured(id);
      },

      deleteReview: (id: string) => {
        set((state) => ({
          reviews: state.reviews.filter((r) => r.id !== id),
        }));
      },

      addReview: (review: any) => {
        set((state) => ({
          reviews: [
            {
              ...review,
              id: review.id || `rev-${Date.now()}`,
              date: review.date || new Date().toISOString().split('T')[0],
              status: review.status || 'approved',
              verifiedBuyer: review.verifiedBuyer !== undefined ? review.verifiedBuyer : true,
            },
            ...state.reviews,
          ],
        }));
      },

      updateInvoiceSettings: (updates) => {
        set((state) => {
          const next = {...state.invoiceSettings,...updates };
          try {
            localStorage.setItem('ats_invoice_settings', JSON.stringify(next));
          } catch { /* storage unavailable - continue with defaults */ }
          return { invoiceSettings: next };
        });
        apiSaveSettings('invoice_settings', updates).catch(() => {});
      },

      updatePaymentSettings: (updates) => {
        set((state) => ({
          paymentSettings: {...state.paymentSettings,...updates },
        }));
        apiSaveSettings('payment_settings', updates).catch(() => {});
      },

      updateCheckoutSettings: (updates) => {
        set((state) => ({
          checkoutSettings: {...state.checkoutSettings,...updates },
        }));
        apiSaveSettings('checkout_settings', updates).catch(() => {});
      },

      updateSmtpSettings: async (updates) => {
        set((state) => ({
          smtpSettings: {...state.smtpSettings,...updates },
        }));
        try {
          const res = await apiSaveSmtpConfig(updates);
          return res.success;
        } catch {
          return false;
        }
      },

      updateShippingZone: (id: string, updates: any) => {
        set((state) => ({
          shippingZones: state.shippingZones.map((z) => (z.id === id ? {...z,...updates } : z)),
        }));
      },

      updateEmailTemplate: (templateId, updates) => {
        set((state) => ({
          emailTemplates: state.emailTemplates.map((t) =>
            t.id === templateId ? {...t,...updates } : t),
        }));
      },

      resetEmailTemplates: () => {
        set({ emailTemplates: [] });
      },

      clearAllTestData: () => {
        set({
          orders: [],
          inquiries: [],
          ndisQuotes: [],
        });
      },

      setCarerCategories: (cats: CarerCategory[]) => {
        set({ carerCategories: cats });
      },
    }),
    {
      name: 'at_specialists_v10',
      version: 12,
      storage: createJSONStorage(() => localStorage),
      migrate: (persistedState) => migrateAdminPersistedState(persistedState),
      merge: (persistedState: unknown, currentState: AdminState): AdminState => {
        return migrateAdminPersistedState({...currentState,...(persistedState as object) });
      },
      // Delta persistence: Only persist overrides, deleted IDs, custom products,
      // auth, and settings. Never persist the raw 1,200+ product catalogue (~8MB)
      // which exceeds the ~5MB browser quota.
      partialize: (s) => {
        const { products, orders, customers, ndisQuotes, inquiries, reviews,...rest } = s as any;
        void products; void orders; void customers; void ndisQuotes; void inquiries; void reviews;
        return {
          ...rest,
          productOverrides: s.productOverrides || {},
          deletedProductIds: s.deletedProductIds || [],
          customProducts: s.customProducts || [],
        } as any;
      },
    }));
