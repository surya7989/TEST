/**
 * AT Specialists Australia - Canonical Production API Client
 * 
 * Centralized, secure API client communicating with the production PHP REST API (/api/*).
 * Automatically injects Bearer JWT authentication for administrative and customer sessions.
 */

const API_BASE = (import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api` : '/api');

// Local storage keys for session persistence
const ADMIN_TOKEN_KEY = 'at_admin_jwt_token';
const CUSTOMER_TOKEN_KEY = 'at_customer_jwt_token';

export function getAdminToken(): string | null {
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch (e) {
    console.warn('Storage notice:', e);
  }
}

export function clearAdminToken(): void {
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch (e) {
    console.warn('Storage notice:', e);
  }
}

export function getCustomerToken(): string | null {
  try {
    return localStorage.getItem(CUSTOMER_TOKEN_KEY);
  } catch (e) {
    console.warn('Storage notice:', e);
    return null;
  }
}

export function setCustomerToken(token: string): void {
  try {
    localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
  } catch (e) {
    console.warn('Storage notice:', e);
  }
}

export function clearCustomerToken(): void {
  try {
    localStorage.removeItem(CUSTOMER_TOKEN_KEY);
  } catch (e) {
    console.warn('Storage notice:', e);
  }
}

export interface ApiErrorResponse {
  success?: boolean;
  error?: string;
  message?: string;
  code?: string;
}

async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const adminToken = getAdminToken();
  const customerToken = getCustomerToken();

  // Prefer the admin token, but remember which identity was actually sent so
  // a 401 below clears the stale token instead of the wrong one.
  let sentTokenKind: 'admin' | 'customer' | null = null;
  if (adminToken) {
    headers['Authorization'] = `Bearer ${adminToken}`;
    sentTokenKind = 'admin';
  } else if (customerToken) {
    headers['Authorization'] = `Bearer ${customerToken}`;
    sentTokenKind = 'customer';
  }

  if (options.headers) {
    Object.assign(headers, options.headers);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new Error(`Network error: ${err.message || 'Unable to connect to server. Please check your internet connection.'}`);
  }

  const rawText = await response.text();
  let data: any = {};
  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { error: rawText.length > 200 ? `Server returned status ${response.status}` : rawText };
    }
  }

  if (!response.ok) {
    if (response.status === 401 && sentTokenKind && url !== '/auth/login' && url !== '/auth/customer-login') {
      if (sentTokenKind === 'admin') {
        clearAdminToken();
        // Notify the admin shell so a stale/expired session bounces to the
        // login screen instead of rendering broken pages that keep 401ing.
        try {
          window.dispatchEvent(new CustomEvent('at:admin-session-expired'));
        } catch { /* non-DOM environment — ignore */ }
      } else clearCustomerToken();
    }
    const errorMsg = data.error || data.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    (err as any).status = response.status;
    (err as any).code = data.code;
    throw err;
  }

  return data as T;
}

// ============================================================================
// 1. AUTHENTICATION API
// ============================================================================

export interface LoginResponse {
  success: boolean;
  token: string;
  user: {
    id: number | string;
    name: string;
    email: string;
    role: string;
    hasPassword?: boolean;
  };
}

export async function adminLogin(email: string, pass: string): Promise<LoginResponse> {
  const res = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password: pass }),
  });
  if (res.token) {
    setAdminToken(res.token);
  }
  return res;
}

export async function apiCustomerLogin(email: string, pass: string): Promise<LoginResponse> {
  const res = await apiRequest<LoginResponse>('/auth/customer-login', {
    method: 'POST',
    body: JSON.stringify({ email, password: pass }),
  });
  if (res.token) {
    setCustomerToken(res.token);
  }
  return res;
}

export async function apiCustomerRegister(data: {
  name: string;
  email: string;
  password: string;
  phone?: string;
  ndisNumber?: string;
  planType?: string;
  planManager?: string;
  planManagerEmail?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
}): Promise<LoginResponse> {
  const res = await apiRequest<LoginResponse>('/auth/customer-register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res.token) {
    setCustomerToken(res.token);
  }
  return res;
}

export async function apiCustomerOrderSession(data: {
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  ndisNumber?: string;
  planType?: string;
  planManager?: string;
  planManagerEmail?: string;
}): Promise<LoginResponse & { isNewAccount?: boolean }> {
  const res = await apiRequest<LoginResponse & { isNewAccount?: boolean }>('/auth/customer-order-session', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (res.token) {
    setCustomerToken(res.token);
  }
  return res;
}

export async function apiSetPassword(data: {
  email: string;
  password: string;
  orderId?: string;
  quoteId?: string;
}): Promise<LoginResponse> {
  // Always prove ownership with the CUSTOMER session — never the admin token
  // (both may live in this browser when staff test checkout while logged in).
  const customerToken = getCustomerToken();
  const res = await apiRequest<LoginResponse>('/auth/set-password', {
    method: 'POST',
    headers: customerToken
      ? { Authorization: `Bearer ${customerToken}` }
      : { Authorization: '' },
    body: JSON.stringify(data),
  });
  if (res.token) {
    setCustomerToken(res.token);
  }
  return res;
}

export async function getAdminProfile(): Promise<{ success: boolean; user: any }> {
  return apiRequest<{ success: boolean; user: any }>('/auth/me');
}

export async function getCustomerProfile(): Promise<{ success: boolean; user: any }> {
  return apiRequest<{ success: boolean; user: any }>('/auth/me');
}

// ============================================================================
// 2. PRODUCTS API
// ============================================================================

export async function getProducts(): Promise<{ products: any[] }> {
  // The full catalogue is 1200+ products (>5MB in one response). Requesting it
  // unbounded exhausts PHP memory on shared hosting and returns HTTP 500, so
  // page through ?limit=&offset= (supported by GET /api/products) instead.
  const PAGE = 400;
  const all: any[] = [];
  let offset = 0;
  for (;;) {
    const res = await apiRequest<{ products: any[] }>(`/products?limit=${PAGE}&offset=${offset}`);
    const batch = res?.products ?? [];
    all.push(...batch);
    if (batch.length < PAGE) break;
    offset += PAGE;
    if (offset > 20000) break; // safety cap
  }
  return { products: all };
}

export async function getProduct(id: string): Promise<{ product: any }> {
  return apiRequest<{ product: any }>(`/products/${id}`);
}

export async function createProduct(data: any): Promise<{ success: boolean; product: any }> {
  return apiRequest<{ success: boolean; product: any }>('/products', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id: string, data: any): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/products/${id}`, {
    method: 'DELETE',
  });
}

export async function clearAllProductsApi(): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/products/clear-all', {
    method: 'DELETE',
  });
}

// ============================================================================
// 3. CART & PRICING API
// ============================================================================

export interface CalculatedCart {
  success: boolean;
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    purchaseType: 'buy' | 'hire';
    hireWeeks: number;
    gstType: string;
    gstRate: number;
    deliveryFee: number;
    lineTotal: number;
    image: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  gstTotal: number;
  subtotalExGst: number;
  total: number;
  deliveryMethod: string;
  discount?: number;
  promo?: { code: string; type: string; value: number } | null;
  rejected?: string[];
}

export async function calculateCart(items: any[], deliveryMethod: string = 'standard', promoCode?: string): Promise<CalculatedCart> {
  return apiRequest<CalculatedCart>('/cart/calculate', {
    method: 'POST',
    body: JSON.stringify({ items, deliveryMethod, promoCode: promoCode || undefined }),
  });
}

// ============================================================================
// REVIEWS API (customer ratings that really count)
// ============================================================================

export interface StoreReview {
  id: string;
  productId: string;
  productName?: string;
  productImage?: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  status: 'approved' | 'pending' | 'flagged' | 'rejected';
  verifiedBuyer?: boolean;
  ndisParticipant?: boolean;
  featured?: boolean;
}

export async function getProductReviews(productId: string): Promise<{ reviews: StoreReview[] }> {
  return apiRequest<{ reviews: StoreReview[] }>(`/reviews?productId=${encodeURIComponent(productId)}`);
}

export async function submitProductReview(data: {
  productId: string;
  productName?: string;
  productImage?: string;
  customerName: string;
  customerEmail?: string;
  rating: number;
  title: string;
  comment: string;
  ndisParticipant?: boolean;
}): Promise<{ success: boolean; message: string; review: StoreReview }> {
  return apiRequest<{ success: boolean; message: string; review: StoreReview }>('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getAllReviews(): Promise<{ reviews: StoreReview[] }> {
  return apiRequest<{ reviews: StoreReview[] }>('/reviews/admin/all');
}

export async function updateReviewStatus(id: string, status: StoreReview['status'], extra?: { featured?: boolean; verifiedBuyer?: boolean }): Promise<{ success: boolean; review: StoreReview }> {
  return apiRequest<{ success: boolean; review: StoreReview }>(`/reviews/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status,...extra }),
  });
}

export async function deleteReviewApi(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/reviews/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// PROMOTIONS / COUPONS API (codes that really apply)
// ============================================================================

export interface Promotion {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrder: number;
  maxUsage: number | null;
  usageCount: number;
  expiresAt: string;
  active: boolean;
  description: string;
}

export async function validatePromo(code: string, subtotal: number): Promise<{
  success: boolean;
  code: string;
  type: Promotion['type'];
  value: number;
  discount: number;
  freeShipping: boolean;
  message: string;
}> {
  return apiRequest('/promotions/validate', {
    method: 'POST',
    body: JSON.stringify({ code, subtotal }),
  });
}

export async function redeemPromo(code: string): Promise<{ success: boolean; usageCount: number }> {
  return apiRequest(`/promotions/${encodeURIComponent(code)}/redeem`, { method: 'POST' });
}

export async function getPromotions(): Promise<{ promotions: Promotion[] }> {
  return apiRequest<{ promotions: Promotion[] }>('/promotions');
}

export async function createPromotion(data: Omit<Promotion, 'id' | 'usageCount'>): Promise<{ success: boolean; promotion: Promotion }> {
  return apiRequest<{ success: boolean; promotion: Promotion }>('/promotions', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updatePromotion(id: string, data: Partial<Promotion>): Promise<{ success: boolean; promotion: Promotion }> {
  return apiRequest<{ success: boolean; promotion: Promotion }>(`/promotions/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deletePromotionApi(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/promotions/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// 4. PAYPAL PAYMENT API
// ============================================================================

export interface PayPalClientConfig {
  clientId: string;
  mode: string;
  currency: string;
}

export async function getPayPalClientId(): Promise<PayPalClientConfig> {
  return apiRequest<PayPalClientConfig>('/paypal/client-id');
}

export async function savePayPalSettings(data: { clientId: string; secretKey?: string; mode: string }): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/paypal/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function createPayPalOrder(data: {
  items: any[];
  deliveryMethod?: string;
  promoCode?: string;
  customer?: any;
  shipping?: any;
}): Promise<{ paypalOrderId: string; status: string; authoritativeTotal?: number }> {
  return apiRequest<{ paypalOrderId: string; status: string; authoritativeTotal?: number }>('/paypal/create-order', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function capturePayPalOrder(data: {
  paypalOrderId: string;
  items: any[];
  subtotal?: number;
  deliveryFee?: number;
  gstTotal?: number;
  total?: number;
  deliveryMethod?: string;
  promoCode?: string;
  customer?: any;
  ndisNumber?: string;
  deliveryNotes?: string;
}): Promise<{ success: boolean; order: any }> {
  return apiRequest<{ success: boolean; order: any }>('/paypal/capture-order', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ============================================================================
// 5. ORDERS API
// ============================================================================

export async function getOrders(): Promise<{ orders: any[] }> {
  return apiRequest<{ orders: any[] }>('/orders');
}

export async function getOrder(orderId: string, accessToken?: string): Promise<{ order: any; items: any[] }> {
  const url = accessToken ? `/orders/${orderId}?token=${encodeURIComponent(accessToken)}` : `/orders/${orderId}`;
  return apiRequest<{ order: any; items: any[] }>(url);
}

export async function lookupGuestOrder(orderId: string, email: string): Promise<{ success: boolean; order: any; accessToken: string }> {
  return apiRequest<{ success: boolean; order: any; accessToken: string }>('/orders/guest-lookup', {
    method: 'POST',
    body: JSON.stringify({ orderId, email }),
  });
}

export async function updateOrderStatus(orderId: string, status: string, paymentStatus?: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/orders/${orderId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, paymentStatus }),
  });
}

export async function updateOrderTracking(orderId: string, trackingNumber: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/orders/${orderId}/tracking`, {
    method: 'PATCH',
    body: JSON.stringify({ trackingNumber }),
  });
}

export function getOrderInvoicePdfUrl(orderId: string, accessToken?: string): string {
  const base = `${API_BASE}/orders/${orderId}/invoice-pdf`;
  return accessToken ? `${base}?token=${encodeURIComponent(accessToken)}` : base;
}

// ============================================================================
// 6. NDIS QUOTES API
// ============================================================================

export async function createNdisQuote(data: {
  items: any[];
  deliveryMethod?: string;
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  shippingAddress?: string;
  ndisNumber?: string;
  planType?: string;
  planManager?: string;
  planManagerEmail?: string;
  notes?: string;
}): Promise<{ success: boolean; quoteId: string; accessToken: string; total: number; message: string }> {
  const response = await apiRequest<{
    success: boolean;
    quote?: { id?: string; total?: number; message?: string };
    quoteId?: string;
    accessToken?: string;
    total?: number;
    message?: string;
  }>('/quotes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return {
    success: response.success,
    quoteId: response.quoteId || response.quote?.id || '',
    accessToken: response.accessToken || '',
    total: response.total ?? response.quote?.total ?? 0,
    message: response.message || response.quote?.message || 'Quote created successfully',
  };
}

export async function getNdisQuotes(): Promise<{ quotes: any[] }> {
  return apiRequest<{ quotes: any[] }>('/quotes');
}

export async function updateNdisQuoteStatus(quoteId: string, status: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/quotes/${quoteId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getQuotePdfUrl(quoteId: string, accessToken?: string): string {
  const token = accessToken ? `?token=${encodeURIComponent(accessToken)}` : '';
  return `${API_BASE}/quotes/${quoteId}/pdf${token}`;
}

// ============================================================================
// 7. INQUIRIES & CONTACT API
// ============================================================================

export async function submitInquiry(data: {
  name: string;
  email: string;
  phone?: string;
  enquiryType?: string;
  ndisNumber?: string;
  subject?: string;
  message: string;
}): Promise<{ success: boolean; message: string; id: string }> {
  return apiRequest<{ success: boolean; message: string; id: string }>('/inquiries', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getInquiries(): Promise<{ inquiries: any[] }> {
  return apiRequest<{ inquiries: any[] }>('/inquiries');
}

export async function updateInquiryStatus(id: string, status: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/inquiries/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function updateInquiryNotes(id: string, notes: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/inquiries/${id}/notes`, {
    method: 'PATCH',
    body: JSON.stringify({ notes }),
  });
}

export async function deleteInquiryApi(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/inquiries/${id}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// 8. CUSTOMERS API
// ============================================================================

export async function getCustomers(): Promise<{ customers: any[] }> {
  return apiRequest<{ customers: any[] }>('/customers');
}

export async function getCustomer(id: string): Promise<{ customer: any; orders: any[] }> {
  return apiRequest<{ customer: any; orders: any[] }>(`/customers/${id}`);
}

export async function createCustomer(data: any): Promise<{ success: boolean; message: string; customer: any }> {
  return apiRequest<{ success: boolean; message: string; customer: any }>('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateCustomerApi(id: string, updates: any): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/customers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
}

export async function deleteCustomerApi(id: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>(`/customers/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

// ============================================================================
// 9. SMTP & EMAILS API
// ============================================================================

export interface SmtpConfigData {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass?: string;
  passMasked?: string;
  fromName: string;
  fromEmail: string;
}

export async function getSmtpConfig(): Promise<SmtpConfigData> {
  return apiRequest<SmtpConfigData>('/emails/smtp-config');
}

export async function saveSmtpConfig(config: any): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/emails/smtp-config', {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function verifySmtp(): Promise<{ success: boolean; message: string; host: string; port: number }> {
  return apiRequest<{ success: boolean; message: string; host: string; port: number }>('/emails/verify-smtp', {
    method: 'POST',
  });
}

export async function sendTestEmail(to: string): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/emails/send-test', {
    method: 'POST',
    body: JSON.stringify({ to }),
  });
}

export async function sendInvoiceEmail(data: {
  orderId?: string;
  invoiceId?: string;
  toEmail?: string;
  to?: string;
  customerName?: string;
  customerPhone?: string;
  invoiceHtml?: string;
  total?: number;
  subtotal?: number;
  deliveryFee?: number;
  gstTotal?: number;
  items?: any[];
  notes?: string;
  shippingAddress?: string;
  companyName?: string;
  abn?: string;
  addressLine1?: string;
  addressLine2?: string;
  addressCountry?: string;
  phone?: string;
  email?: string;
  website?: string;
  bankTitle?: string;
  bankName?: string;
  accountName?: string;
  bsb?: string;
  accountNumber?: string;
  remittanceTitle?: string;
  terms?: string;
  dueDate?: string;
  requiredByDate?: string;
  footerLeft?: string;
  footerRight?: string;
}): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/emails/send-invoice', {
    method: 'POST',
    body: JSON.stringify({
      to: data.toEmail || data.to,
      invoiceId: data.invoiceId || data.orderId,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      invoiceHtml: data.invoiceHtml,
      total: data.total,
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      gstTotal: data.gstTotal,
      items: data.items,
      notes: data.notes,
      shippingAddress: data.shippingAddress,
      companyName: data.companyName,
      abn: data.abn,
      addressLine1: data.addressLine1,
      addressLine2: data.addressLine2,
      addressCountry: data.addressCountry,
      phone: data.phone,
      email: data.email,
      website: data.website,
      bankTitle: data.bankTitle,
      bankName: data.bankName,
      accountName: data.accountName,
      bsb: data.bsb,
      accountNumber: data.accountNumber,
      remittanceTitle: data.remittanceTitle,
      terms: data.terms,
      dueDate: data.dueDate,
      requiredByDate: data.requiredByDate,
      footerLeft: data.footerLeft,
      footerRight: data.footerRight,
    }),
  });
}

export async function sendTemplateSampleEmail(data: {
  templateId: string;
  recipientType: 'receiver' | 'admin';
  to: string;
}): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/emails/send-template-sample', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function dispatchTemplateEmail(data: {
  templateId: string;
  recipientEmail?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  documentId?: string;
  items?: any[];
  subtotal?: number;
  deliveryFee?: number;
  gstTotal?: number;
  total?: number;
  notes?: string;
  extraMeta?: Record<string, any>;
  sendCustomerCopy?: boolean;
  sendAdminCopy?: boolean;
  adminEmail?: string;
  customSettings?: Record<string, any>;
  attachPdf?: boolean;
}): Promise<{ success: boolean; message: string; documentId?: string; filename?: string; viewDocumentUrl?: string; directPdfUrl?: string }> {
  return apiRequest<{ success: boolean; message: string; documentId?: string; filename?: string; viewDocumentUrl?: string; directPdfUrl?: string }>('/emails/dispatch-template', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getDocumentData(docId: string): Promise<{ success: boolean; document: any; pdfUrl: string }> {
  return apiRequest<{ success: boolean; document: any; pdfUrl: string }>(`/emails/document/${encodeURIComponent(docId)}`);
}

export interface DispatchedDocumentItem {
  docId: string;
  templateId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  total: number;
  createdAt: string;
  filename?: string;
  needsPdf: boolean;
  viewDocumentUrl?: string;
  directPdfUrl?: string;
}

export async function getDispatchedDocuments(): Promise<{ success: boolean; documents: DispatchedDocumentItem[] }> {
  return apiRequest<{ success: boolean; documents: DispatchedDocumentItem[] }>('/emails/documents');
}

// ============================================================================
// 10. SETTINGS API
// ============================================================================

export async function getSettings(): Promise<{ settings: Record<string, any> }> {
  return apiRequest<{ settings: Record<string, any> }>('/settings');
}

export async function saveSettings(key: string, value: any): Promise<{ success: boolean; message: string }> {
  return apiRequest<{ success: boolean; message: string }>('/settings', {
    method: 'POST',
    body: JSON.stringify({ key, value }),
  });
}
