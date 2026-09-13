import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminStore } from '@/store/adminStore';
import { useCart } from '@/hooks/useCart';
import { useWishlist } from '@/hooks/useWishlist';
import { PRODUCTS as catalogProducts } from '@/data/products';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { formatCurrency } from '@/lib/utils';
import {
  User,
  Package,
  FileText,
  LogOut,
  Search,
  Download,
  AlertCircle,
  Truck,
  CheckCircle2,
  Clock,
  ExternalLink,
  Shield,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Eye,
  EyeOff,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Heart,
  Edit3,
  Save,
  X,
  RefreshCw,
  Receipt,
  Check,
  RotateCcw,
  Tag,
  Building,
  KeyRound,
  ShieldCheck,
  Copy,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  getOrders as apiGetOrders,
  getOrder as apiGetOrder,
  lookupGuestOrder as apiLookupGuestOrder,
  getOrderInvoicePdfUrl,
  getNdisQuotes as apiGetNdisQuotes,
  getQuotePdfUrl,
} from '@/lib/api';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';

// Order Status Visual Configuration
const ORDER_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; step: number; icon: React.ElementType }
> = {
  pending: {
    label: 'Order Placed',
    color: 'text-amber-800',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    step: 1,
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmed',
    color: 'text-teal-800',
    bg: 'bg-teal-50',
    border: 'border-teal-200',
    step: 2,
    icon: CheckCircle2,
  },
  processing: {
    label: 'Processing',
    color: 'text-blue-800',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    step: 2,
    icon: RefreshCw,
  },
  shipped: {
    label: 'Dispatched / In Transit',
    color: 'text-purple-800',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    step: 3,
    icon: Truck,
  },
  delivered: {
    label: 'Delivered',
    color: 'text-emerald-800',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    step: 4,
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'text-rose-800',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    step: 0,
    icon: X,
  },
};

const ORDER_STEPS = ['Order Placed', 'Confirmed', 'Dispatched', 'Delivered'];

export function AccountPage() {
  const {
    user,
    isAuthenticated,
    signIn,
    signUp,
    sendPasswordReset,
    signOut,
    isLoading,
    error,
    clearError,
    updateProfile,
    initListener,
    setAccountPassword,
  } = useAuthStore();

  const { addItem, openCart } = useCart();
  const { items: wishlistIds, toggleItem } = useWishlist();
  const [searchParams, setSearchParams] = useSearchParams();

  // Active Tab: orders | quotes | profile | wishlist | guest_lookup
  const [tab, setTab] = useState<'orders' | 'quotes' | 'profile' | 'wishlist' | 'guest_lookup'>('orders');

  // Customer Orders fetched from API
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('all');

  // NDIS Quotes fetched from API
  const [quotes, setQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);

  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [orderModalToken, setOrderModalToken] = useState<string | undefined>(undefined);
  const [copiedTracking, setCopiedTracking] = useState(false);

  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authNdis, setAuthNdis] = useState('');
  const [authPlanType, setAuthPlanType] = useState<'plan_managed' | 'self_managed' | 'ndia_managed'>('plan_managed');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Forgot Password Mode
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);

  // Guest Order Lookup State
  const [lookupOrderId, setLookupOrderId] = useState(searchParams.get('lookup') || '');
  const [lookupEmail, setLookupEmail] = useState('');
  const [guestOrderResult, setGuestOrderResult] = useState<any>(null);
  const [guestAccessToken, setGuestAccessToken] = useState<string>(searchParams.get('token') || '');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Profile Form & Feedback
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: 'VIC',
    postcode: '',
    ndisNumber: '',
    planType: 'plan_managed' as 'plan_managed' | 'self_managed' | 'ndia_managed',
    planManager: '',
    planManagerEmail: '',
  });


  // Initialize Firebase and Session Listener on Mount
  useEffect(() => {
    const unsub = initListener();
    return () => {
      unsub();
    };
  }, [initListener]);

  // Fetch Customer Orders
  const fetchCustomerOrders = useCallback(async () => {
    if (!isAuthenticated) return;
    setOrdersLoading(true);
    try {
      const res = await apiGetOrders();
      const email = user?.email?.toLowerCase();
      let combined = res.orders || [];
      // Also merge any local adminStore orders for this customer to guarantee instant visibility
      const localOrders = useAdminStore.getState().orders || [];
      if (email) {
        const matchingLocal = localOrders.filter((o) => (o.customerEmail || (o as any).customer_email || '').toLowerCase() === email);
        for (const lo of matchingLocal) {
          if (!combined.some((o: any) => o.id === lo.id)) {
            combined.unshift(lo);
          }
        }
      }
      const ownOrders = email
        ? combined.filter((order: any) => (order.customer_email || order.customerEmail || '').toLowerCase() === email)
        : combined;
      setOrders(ownOrders);
    } catch {
      const email = user?.email?.toLowerCase();
      if (email) {
        const localOrders = useAdminStore.getState().orders || [];
        setOrders(localOrders.filter((o) => (o.customerEmail || (o as any).customer_email || '').toLowerCase() === email));
      }
    } finally {
      setOrdersLoading(false);
    }
  }, [isAuthenticated, user?.email]);

  // Fetch Customer NDIS Quotes
  const fetchCustomerQuotes = useCallback(async () => {
    if (!isAuthenticated) return;
    setQuotesLoading(true);
    try {
      const res = await apiGetNdisQuotes();
      const userEmail = user?.email?.toLowerCase();
      let combined = res.quotes || [];
      // Also merge any local adminStore quotes for this customer
      const localQuotes = useAdminStore.getState().ndisQuotes || [];
      if (userEmail) {
        const matchingLocal = localQuotes.filter((q) => (q.customerEmail || (q as any).customer_email || '').toLowerCase() === userEmail);
        for (const lq of matchingLocal) {
          if (!combined.some((q: any) => q.id === lq.id)) {
            combined.unshift(lq);
          }
        }
      }
      const filtered = userEmail
        ? combined.filter((q: any) =>
              (q.customerEmail && q.customerEmail.toLowerCase() === userEmail) ||
              (q.customer_email && q.customer_email.toLowerCase() === userEmail))
        : combined;
      setQuotes(filtered);
    } catch {
      const userEmail = user?.email?.toLowerCase();
      if (userEmail) {
        const localQuotes = useAdminStore.getState().ndisQuotes || [];
        setQuotes(localQuotes.filter((q) => (q.customerEmail || (q as any).customer_email || '').toLowerCase() === userEmail));
      }
    } finally {
      setQuotesLoading(false);
    }
  }, [isAuthenticated, user?.email]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomerOrders();
      fetchCustomerQuotes();
    }
  }, [isAuthenticated, fetchCustomerOrders, fetchCustomerQuotes]);

  // Sync profile form when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || 'VIC',
        postcode: user.postcode || '',
        ndisNumber: user.ndisNumber || '',
        planType: (user.planType as any) || 'plan_managed',
        planManager: user.planManager || '',
        planManagerEmail: user.planManagerEmail || '',
      });
    }
  }, [user]);

  // Handle URL lookup parameters on mount
  useEffect(() => {
    const urlLookup = searchParams.get('lookup');
    const urlToken = searchParams.get('token');
    const urlQuote = searchParams.get('quoteId');
    if (urlLookup) {
      setLookupOrderId(urlLookup);
      if (urlToken) {
        setGuestAccessToken(urlToken);
      }
    }
    if (urlQuote) {
      setTab('quotes');
    }
  }, [searchParams]);

  // Handle Sign In / Sign Up
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (authMode === 'signin') {
      await signIn(authEmail, authPassword);
    } else {
      await signUp({
        email: authEmail,
        pass: authPassword,
        name: authName,
        phone: authPhone,
        ndisNumber: authNdis,
        planType: authPlanType,
      });
    }
  };


  // Handle Password Reset via Firebase
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetStatus(null);
    setResetLoading(true);
    const res = await sendPasswordReset(resetEmail || authEmail);
    setResetLoading(false);
    setResetStatus(res);
  };

  // Handle Guest Lookup
  const handleGuestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLookupError(null);
    setGuestOrderResult(null);

    const cleanId = lookupOrderId.trim().replace(/^#/, '');
    const cleanEmail = lookupEmail.trim();

    if (!cleanId || !cleanEmail) {
      setLookupError('Please enter both your Order Number and Billing Email address.');
      return;
    }

    setLookupLoading(true);
    try {
      const res = await apiLookupGuestOrder(cleanId, cleanEmail);
      if (res.success && res.order) {
        setGuestOrderResult(res.order);
        setGuestAccessToken(res.accessToken || '');
      } else {
        setLookupError('No order found matching those details. Please check your Order ID and Email.');
      }
    } catch (err: any) {
      setLookupError(err.message || 'Unable to locate order. Please check the information provided.');
    } finally {
      setLookupLoading(false);
    }
  };

  // Save Profile Changes
  const handleProfileSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    updateProfile({
      name: profileForm.name,
      phone: profileForm.phone,
      address: profileForm.address,
      city: profileForm.city,
      state: profileForm.state,
      postcode: profileForm.postcode,
      ndisNumber: profileForm.ndisNumber,
      planType: profileForm.planType,
      planManager: profileForm.planManager,
      planManagerEmail: profileForm.planManagerEmail,
    });
    setIsEditingProfile(false);
    setProfileSuccessMsg(true);
    setTimeout(() => setProfileSuccessMsg(false), 3500);
  };

  // View Order Details in Modal
  const handleOpenOrderDetail = async (order: any, token?: string) => {
    setSelectedOrder(order);
    setOrderModalToken(token);
    setSelectedOrderItems(order.items || []);
    setOrderDetailLoading(true);

    try {
      const res = await apiGetOrder(order.id, token);
      if (res && res.items) {
        setSelectedOrderItems(res.items);
      }
      if (res && res.order) {
        setSelectedOrder(res.order);
      }
    } catch {
      // Fallback to order
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const handleCopyTracking = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedTracking(true);
    setTimeout(() => setCopiedTracking(false), 2000);
  };

  // Status helper
  const getStatusConfig = (status: string) => {
    const key = (status || 'confirmed').toLowerCase();
    return ORDER_STATUS_CONFIG[key] || ORDER_STATUS_CONFIG.confirmed;
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = orderSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        String(ord.id).toLowerCase().includes(q) ||
        (ord.items && ord.items.some((it: any) => (it.name || it.product_name || '').toLowerCase().includes(q)));

      if (!matchesSearch) return false;

      if (orderFilterStatus === 'active') {
        return ord.status === 'pending' || ord.status === 'confirmed' || ord.status === 'processing' || ord.status === 'shipped';
      }
      if (orderFilterStatus === 'delivered') {
        return ord.status === 'delivered';
      }
      if (orderFilterStatus === 'cancelled') {
        return ord.status === 'cancelled';
      }
      return true;
    });
  }, [orders, orderSearchQuery, orderFilterStatus]);

  // Wishlist products
  const wishlistProducts = useMemo(() => {
    return catalogProducts.filter((p) => wishlistIds.includes(p.id));
  }, [wishlistIds]);

  // Summary stats
  const totalSpent = useMemo(() => {
    return orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
  }, [orders]);

  // Checkout-created accounts stay signed in until sign-out, but must create
  // a password once before the account fully works.
  const needsActivation = isAuthenticated && user?.hasPassword === false;
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState<string | null>(null);

  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwDone(null);
    if (!newPw || newPw.length < 8) {
      setPwError('Password must be at least 8 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.');
      return;
    }
    setPwSaving(true);
    const orderRef = searchParams.get('orderId') || searchParams.get('quoteId') || undefined;
    const res = await setAccountPassword(newPw, orderRef);
    setPwSaving(false);
    if (res.success) {
      setPwDone(res.message);
      setNewPw('');
      setConfirmPw('');
    } else {
      setPwError(res.message);
    }
  };

  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'pending' || o.status === 'confirmed' || o.status === 'processing' || o.status === 'shipped').length;
  }, [orders]);

  return (<div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Top Breadcrumb Navigation */}
      <div className="bg-white border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <Breadcrumbs
            items={[
              { label: 'Home', path: '/' },
              { label: isAuthenticated ? 'My Account' : 'Client Portal', path: '/account' },
            ]}
          />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
        {/* Account activation gate: checkout-created accounts must set a
            password once. Session stays open until explicit sign-out. */}
        {needsActivation ? (<div className="max-w-xl mx-auto animate-fade-in">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-lg overflow-hidden">
              <div className="h-2 bg-gradient-to-r from-[#147A7A] via-[#0F766E] to-[#E88D2A]" />
              <div className="p-6 sm:p-8 space-y-5">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center shrink-0">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#147A7A]">One last step</p>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Create your password</h1>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Welcome, <strong>{user?.name || 'Valued Client'}</strong>! Your account
                  (<strong>{user?.email}</strong>) was automatically created with your order and is now open.
                  It will stay open until you sign out. Create a password now to activate full access —
                  order tracking, tax invoices, and faster future checkouts.
                </p>
                {pwDone ? (<div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pwDone} Unlocking your dashboard…</span>
                  </div>) : (
                <form onSubmit={handleCreatePassword} className="space-y-3.5">
                  {pwError && (<div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{pwError}</span>
                    </div>)}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">New password (min 8 characters)</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Choose a secure password"
                        className="w-full h-11 px-3.5 pr-11 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Confirm password</label>
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      className="w-full h-11 px-3.5 border border-slate-300 rounded-xl text-sm outline-none focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={pwSaving}
                    className="w-full py-3 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-sm transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {pwSaving ? 'Creating password…' : 'Create password & activate account'}
                  </button>
                </form>)}
                <button
                  type="button"
                  onClick={() => signOut()}
                  className="w-full text-center text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  Sign out instead
                </button>
              </div>
            </div>
          </div>) : (<>
        {/* ========================================================================= */}
        {/* STATE 1: UNAUTHENTICATED PORTAL (Sign In, Sign Up, Firebase & Guest) */}
        {/* ========================================================================= */}
        {!isAuthenticated ? (<div className="space-y-8 animate-fade-in">
            {/* Header Hero */}
            <div className="text-center max-w-3xl mx-auto space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#147A7A] text-xs font-bold tracking-wide uppercase shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>AT Specialists Australia &bull; Client Portal</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-[#0F1E2E] tracking-tight">
                Client &amp; NDIS Participant Portal
              </h1>
              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
                Sign in to manage equipment orders, download ATO Tax Invoices for plan management,
                track medical dispatches, or look up guest orders without an account.
              </p>
            </div>

            {/* Trust Badges Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-4xl mx-auto">
              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#147A7A] shrink-0 shadow-2xs">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">ATO Tax Invoices</div>
                  <div className="text-[11px] text-slate-500">ABN &amp; GST itemized PDF</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#147A7A] shrink-0 shadow-2xs">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">NDIS Ready</div>
                  <div className="text-[11px] text-slate-500">Plan-Managed, Self &amp; NDIA friendly</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
                <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#147A7A] shrink-0 shadow-2xs">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">Live Tracking</div>
                  <div className="text-[11px] text-slate-500">Real-time medical carrier updates</div>
                </div>
              </div>
            </div>

            {/* Two Column Portal Grid: Client Auth & Guest Lookup */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start max-w-5xl mx-auto">
              {/* Card 1: Client Account Authentication (7 cols) */}
              <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Tab Switcher */}
                <div className="flex border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setShowForgotPassword(false);
                      clearError();
                    }}
                    className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      authMode === 'signin' && !showForgotPassword
                        ? 'bg-white text-[#147A7A] shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>Client Sign In</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setShowForgotPassword(false);
                      clearError();
                    }}
                    className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      authMode === 'signup' && !showForgotPassword
                        ? 'bg-white text-[#147A7A] shadow-xs border border-slate-200'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Create Account</span>
                  </button>
                </div>

                <div className="p-6 sm:p-8 space-y-5">


                  {/* Error Alert */}
                  {error && (<div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <div>
                        <span className="font-bold block">Authentication Notice</span>
                        <span>{error}</span>
                      </div>
                    </div>)}

                  {/* Forgot Password View */}
                  {showForgotPassword ? (<form onSubmit={handlePasswordReset} className="space-y-4">
                      <div>
                        <h3 className="text-sm font-extrabold text-slate-900">Reset Your Password</h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Enter your registered email address and we will send you a secure password reset link.
                        </p>
                      </div>

                      {resetStatus && (<div
                          className={`p-3.5 rounded-xl border text-xs ${
                            resetStatus.success
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                              : 'bg-rose-50 border-rose-200 text-rose-900'
                          }`}
                        >
                          {resetStatus.message}
                        </div>)}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            required
                            value={resetEmail || authEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            placeholder="client@example.com.au"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all outline-none bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="submit"
                          disabled={resetLoading}
                          className="flex-1 py-2.5 px-4 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white font-bold text-xs shadow-xs cursor-pointer disabled:opacity-60 flex items-center justify-center gap-1.5"
                        >
                          {resetLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                          <span>Send Password Reset</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowForgotPassword(false)}
                          className="py-2.5 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs cursor-pointer"
                        >
                          Back to Sign In
                        </button>
                      </div>
                    </form>) : (/* Standard Auth Form */
                    <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                      {authMode === 'signup' && (<>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                              Full Name *
                            </label>
                            <div className="relative">
                              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                              <input
                                type="text"
                                required
                                value={authName}
                                onChange={(e) => setAuthName(e.target.value)}
                                placeholder="e.g. Sarah Jenkins"
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all outline-none bg-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                                Contact Phone
                              </label>
                              <div className="relative">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                  type="tel"
                                  value={authPhone}
                                  onChange={(e) => setAuthPhone(e.target.value)}
                                  placeholder="0400 000 000"
                                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all outline-none bg-white"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                                NDIS Number (Optional)
                              </label>
                              <div className="relative">
                                <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                  type="text"
                                  value={authNdis}
                                  onChange={(e) => setAuthNdis(e.target.value)}
                                  placeholder="430 000 000"
                                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all outline-none bg-white"
                                />
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                              NDIS Funding Plan Type
                            </label>
                            <select
                              value={authPlanType}
                              onChange={(e: any) => setAuthPlanType(e.target.value)}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all outline-none bg-white text-slate-800"
                            >
                              <option value="plan_managed">Plan-Managed (Plan Manager pays invoices)</option>
                              <option value="self_managed">Self-Managed (Participant claims direct)</option>
                              <option value="ndia_managed">NDIA-Managed (Agency Portal direct claim)</option>
                            </select>
                          </div>
                        </>)}

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                          Email Address *
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                          <input
                            type="email"
                            required
                            value={authEmail}
                            onChange={(e) => setAuthEmail(e.target.value)}
                            placeholder="client@example.com.au"
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all outline-none bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Password *
                          </label>
                          {authMode === 'signin' && (<button
                              type="button"
                              onClick={() => {
                                setResetEmail(authEmail);
                                setShowForgotPassword(true);
                              }}
                              className="text-xs font-bold text-[#147A7A] hover:underline cursor-pointer"
                            >
                              Forgot password?
                            </button>)}
                        </div>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={authPassword}
                            onChange={(e) => setAuthPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full pl-4 pr-11 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all outline-none bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {authMode === 'signin' && (<div className="flex items-center justify-between pt-1">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={rememberMe}
                              onChange={(e) => setRememberMe(e.target.checked)}
                              className="rounded border-slate-300 text-[#147A7A] focus:ring-[#147A7A]"
                            />
                            <span className="text-xs text-slate-600">Remember my session</span>
                          </label>
                        </div>)}

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 px-5 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white font-bold transition-all shadow-xs hover:shadow-sm cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 text-xs mt-2"
                      >
                        {isLoading ? (<>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Verifying Credentials...</span>
                          </>) : (<>
                            <span>{authMode === 'signin' ? 'Sign In to Client Portal' : 'Create My Client Account'}</span>
                            <ArrowRight className="w-4 h-4" />
                          </>)}
                      </button>
                    </form>)}

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-6 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5 text-[#147A7A]" /> 256-Bit SSL Encrypted
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified Secure
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Quick Guest Order & Tax Invoice Lookup (5 cols) */}
              <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-[#0F1E2E] text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
                      <Search className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-sm text-white">Guest Order Lookup</h2>
                      <p className="text-[11px] text-slate-300">No account required &bull; Instant ATO Tax Invoice</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Plan Managers, Support Coordinators, and guest clients can retrieve invoices and delivery tracking using the Order Reference Number.
                  </p>

                  {lookupError && (<div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                      <span>{lookupError}</span>
                    </div>)}

                  <form onSubmit={handleGuestLookup} className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        Order Number *
                      </label>
                      <div className="relative">
                        <Package className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={lookupOrderId}
                          onChange={(e) => setLookupOrderId(e.target.value)}
                          placeholder="e.g. ATS-123456"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all outline-none bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                        Billing Email *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="email"
                          required
                          value={lookupEmail}
                          onChange={(e) => setLookupEmail(e.target.value)}
                          placeholder="orders@example.com.au"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 transition-all outline-none bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={lookupLoading}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#0F1E2E] hover:bg-[#1A2E44] text-white font-bold transition-all shadow-xs flex items-center justify-center gap-2 text-xs cursor-pointer disabled:opacity-60"
                    >
                      {lookupLoading ? (<>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Searching Records...</span>
                        </>) : (<>
                          <Search className="w-4 h-4" />
                          <span>Locate Order &amp; Tax Invoice</span>
                        </>)}
                    </button>
                  </form>

                  {/* Guest Order Result Display */}
                  {guestOrderResult && (<div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 space-y-3 animate-fade-in">
                      <div className="flex items-center justify-between">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          #{guestOrderResult.id}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                            getStatusConfig(guestOrderResult.status).bg
                          } ${getStatusConfig(guestOrderResult.status).color} ${
                            getStatusConfig(guestOrderResult.status).border
                          }`}
                        >
                          {getStatusConfig(guestOrderResult.status).label}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-teal-100">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Total Amount</span>
                          <span className="font-mono font-bold text-[#147A7A]">
                            ${Number(guestOrderResult.total || 0).toFixed(2)} AUD
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Order Date</span>
                          <span className="font-medium text-slate-800 text-xs">
                            {guestOrderResult.created_at
                              ? new Date(guestOrderResult.created_at).toLocaleDateString('en-AU', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })
                              : 'Recent'}
                          </span>
                        </div>
                      </div>

                      {guestOrderResult.tracking_number && (<div className="text-xs bg-white p-2.5 rounded-xl border border-teal-200/60 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Truck className="w-3.5 h-3.5 text-purple-600" />
                            <span className="font-mono font-bold text-slate-900">
                              {guestOrderResult.tracking_number}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyTracking(guestOrderResult.tracking_number)}
                            className="text-[10px] font-bold text-[#147A7A] hover:underline"
                          >
                            {copiedTracking ? 'Copied!' : 'Copy'}
                          </button>
                        </div>)}

                      <div className="space-y-2 pt-1">
                        <a
                          href={getOrderInvoicePdfUrl(guestOrderResult.id, guestAccessToken)}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2.5 px-3 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download ATO Tax Invoice (PDF)
                        </a>

                        <button
                          type="button"
                          onClick={() => handleOpenOrderDetail(guestOrderResult, guestAccessToken)}
                          className="w-full py-2 px-3 rounded-xl border border-slate-300 hover:bg-white text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          View Order Breakdown
                        </button>
                      </div>
                    </div>)}

                  <div className="pt-3 border-t border-slate-100 text-center">
                    <p className="text-[11px] text-slate-500">
                      Need help retrieving an invoice? Contact our accounts desk at{' '}
                      <a href="mailto:admin@atspecialists.com.au" className="text-[#147A7A] font-bold hover:underline">
                        admin@atspecialists.com.au
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>) : (/* ========================================================================= */
          /* STATE 2: AUTHENTICATED CLIENT DASHBOARD */
          /* ========================================================================= */
          <div className="space-y-6 animate-fade-in">
            {/* Automatic Account Creation Welcome Notification */}
            {searchParams.get('welcome') === 'new_account' && (<div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-[#147A7A] rounded-2xl p-5 text-white shadow-md flex items-start justify-between gap-4 animate-fade-in relative overflow-hidden border border-teal-400/40">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="w-5 h-5 text-teal-200" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/20">
                        Account Automatically Created &amp; Connected
                      </span>
                      <span className="text-xs text-teal-100 font-medium">Welcome, {user?.name || 'Valued Client'}!</span>
                    </div>
                    <h2 className="text-sm sm:text-base font-black text-white">
                      Your customer account has been automatically created &amp; opened
                    </h2>
                    <p className="text-xs text-teal-50 max-w-2xl leading-relaxed">
                      Your order {searchParams.get('orderId') || searchParams.get('quoteId') ? `(#${searchParams.get('orderId') || searchParams.get('quoteId')})` : ''} has been synchronized to your personal client portal. You are now logged in and can track delivery status, download ATO Tax Invoices, and manage delivery addresses.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('welcome');
                    setSearchParams(newParams);
                  }}
                  className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                  title="Dismiss notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>)}

            {/* Executive Profile Header Card */}
            <div className="bg-[#0F1E2E] rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-[#147A7A]/20 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/3" />

              <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                  {user?.photoURL ? (<img
                      src={user.photoURL}
                      alt={user.name}
                      className="w-16 h-16 rounded-2xl object-cover border-2 border-white/20 shadow-md shrink-0"
                    />) : (<div className="w-16 h-16 rounded-2xl bg-[#147A7A] flex items-center justify-center text-2xl font-black text-white shadow-inner border border-white/20 shrink-0">
                      {user?.name ? user.name[0].toUpperCase() : 'C'}
                    </div>)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                        {user?.name || 'Valued Client'}
                      </h1>
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[11px] font-bold border border-teal-400/30">
                        <Check className="w-3 h-3" /> Verified Client
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-slate-300 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {user?.email}
                      </span>
                      {user?.phone && (<span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {user.phone}
                        </span>)}
                      {user?.ndisNumber && (<span className="flex items-center gap-1.5 font-mono text-teal-300">
                          <Shield className="w-3.5 h-3.5" />
                          NDIS: #{user.ndisNumber}
                        </span>)}
                    </div>
                  </div>
                </div>

                {/* KPI Metrics & Sign Out Button */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 bg-white/10 p-2 rounded-2xl border border-white/10 text-xs">
                    <div className="px-3 py-1 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Active Orders</div>
                      <div className="text-base font-black text-white font-mono">{activeOrdersCount}</div>
                    </div>
                    <div className="w-px h-7 bg-white/20" />
                    <div className="px-3 py-1 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">NDIS Quotes</div>
                      <div className="text-base font-black text-teal-300 font-mono">{quotes.length}</div>
                    </div>
                    <div className="w-px h-7 bg-white/20" />
                    <div className="px-3 py-1 text-center">
                      <div className="text-[10px] text-slate-400 uppercase font-bold">Total Invoiced</div>
                      <div className="text-base font-black text-emerald-300 font-mono">
                        ${totalSpent.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => signOut()}
                    className="p-3 rounded-xl bg-white/10 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-white/10 transition-colors cursor-pointer"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Dashboard Tabs Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 scrollbar-hide">
              <button
                type="button"
                onClick={() => setTab('orders')}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  tab === 'orders'
                    ? 'bg-[#147A7A] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>My Equipment Orders ({orders.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('quotes')}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  tab === 'quotes'
                    ? 'bg-[#147A7A] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>NDIS Quotes &amp; Funding ({quotes.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('profile')}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  tab === 'profile'
                    ? 'bg-[#147A7A] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span>NDIS &amp; Delivery Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('wishlist')}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  tab === 'wishlist'
                    ? 'bg-[#147A7A] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Heart className="w-4 h-4 shrink-0" />
                <span>Saved Equipment ({wishlistProducts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setTab('guest_lookup')}
                className={`shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  tab === 'guest_lookup'
                    ? 'bg-[#147A7A] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Look Up Another Order</span>
              </button>
            </div>

            {/* TAB 1: MY EQUIPMENT ORDERS */}
            {tab === 'orders' && (<div className="space-y-4">
                {/* Search & Status Filters */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <button
                      type="button"
                      onClick={() => setOrderFilterStatus('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        orderFilterStatus === 'all' ? 'bg-[#147A7A] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      All ({orders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilterStatus('active')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        orderFilterStatus === 'active' ? 'bg-[#147A7A] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Active ({activeOrdersCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderFilterStatus('delivered')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        orderFilterStatus === 'delivered' ? 'bg-[#147A7A] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Delivered
                    </button>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search orders or equipment..."
                      value={orderSearchQuery}
                      onChange={(e) => setOrderSearchQuery(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs focus:bg-white focus:ring-2 focus:ring-[#147A7A]/20"
                    />
                  </div>
                </div>

                {ordersLoading ? (<div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#147A7A] mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">Retrieving order history...</p>
                  </div>) : filteredOrders.length === 0 ? (<div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                    <Package className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-extrabold text-slate-800">No Equipment Orders Found</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      You haven't placed any orders yet, or no orders match your search criteria.
                    </p>
                    <Link
                      to="/shop"
                      className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs mt-2"
                    >
                      <span>Browse Assistive Technology</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>) : (<div className="space-y-4">
                    {filteredOrders.map((ord) => {
                      const cfg = getStatusConfig(ord.status);
                      const StatusIcon = cfg.icon;
                      return (<div key={ord.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                          {/* Order Header */}
                          <div className="p-4 sm:p-5 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-white border border-slate-200 text-[#147A7A] shadow-2xs">
                                <Package className="w-5 h-5" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm text-slate-900">#{ord.id}</span>
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase flex items-center gap-1 ${cfg.bg} ${cfg.color} ${cfg.border}`}
                                  >
                                    <StatusIcon className="w-3 h-3" />
                                    <span>{cfg.label}</span>
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Placed on {new Date(ord.created_at || ord.createdAt).toLocaleDateString('en-AU', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-auto">
                              <div className="text-right">
                                <div className="text-[10px] text-slate-500 uppercase font-bold">Total Amount</div>
                                <div className="text-base font-black font-mono text-[#147A7A]">
                                  ${Number(ord.total || 0).toFixed(2)} AUD
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 4-Step Progress Bar for Active Orders */}
                          {cfg.step > 0 && ord.status !== 'cancelled' && (<div className="px-5 py-4 bg-white border-b border-slate-100">
                              <div className="relative flex items-center justify-between max-w-2xl mx-auto">
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full -z-0" />
                                <div
                                  className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#147A7A] transition-all -z-0"
                                  style={{ width: `${((cfg.step - 1) / (ORDER_STEPS.length - 1)) * 100}%` }}
                                />
                                {ORDER_STEPS.map((st, idx) => {
                                  const stepNum = idx + 1;
                                  const isDone = cfg.step >= stepNum;
                                  return (<div key={st} className="flex flex-col items-center gap-1 relative z-10">
                                      <div
                                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 transition-all ${
                                          isDone
                                            ? 'bg-[#147A7A] border-[#147A7A] text-white shadow-2xs'
                                            : 'bg-white border-slate-300 text-slate-400'
                                        }`}
                                      >
                                        {isDone ? '✓' : stepNum}
                                      </div>
                                      <span className="text-[10px] font-bold text-slate-600 hidden sm:block">
                                        {st}
                                      </span>
                                    </div>);
                                })}
                              </div>
                            </div>)}

                          {/* Carrier Tracking Banner */}
                          {ord.tracking_number && (<div className="p-3.5 bg-purple-50/60 border-b border-purple-100 flex items-center justify-between text-xs text-purple-900">
                              <div className="flex items-center gap-2">
                                <Truck className="w-4 h-4 text-purple-700 shrink-0" />
                                <span>Medical Courier Consignment:</span>
                                <strong className="font-mono font-bold">{ord.tracking_number}</strong>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleCopyTracking(ord.tracking_number)}
                                className="px-2 py-0.5 rounded bg-white border border-purple-200 text-purple-800 text-[10px] font-bold cursor-pointer"
                              >
                                {copiedTracking ? 'Copied!' : 'Copy Code'}
                              </button>
                            </div>)}

                          {/* Items Preview */}
                          <div className="p-5 space-y-3">
                            <div className="space-y-2">
                              {(ord.items || []).map((it: any, idx: number) => (<div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[11px] font-bold text-slate-700">
                                      {it.quantity}x
                                    </span>
                                    <span className="font-semibold text-slate-800">{it.name || it.product_name}</span>
                                  </div>
                                  <span className="font-mono font-bold text-slate-700">
                                    ${Number(it.price || it.unit_price || 0).toFixed(2)}
                                  </span>
                                </div>))}
                            </div>

                            {/* Actions Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleOpenOrderDetail(ord)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147A7A] hover:underline cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>View Full Breakdown</span>
                              </button>

                              <div className="flex items-center gap-2">
                                <a
                                  href={getOrderInvoicePdfUrl(ord.id)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold transition-colors shadow-2xs"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  <span>Download ATO Tax Invoice (PDF)</span>
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>);
                    })}
                  </div>)}
              </div>)}

            {/* TAB 2: NDIS QUOTES & FUNDING */}
            {tab === 'quotes' && (<div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">NDIS Assistive Technology Quotations</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Cat 05 Assistive Technology quotes for NDIA, Support Coordinators, and Plan Managers.
                    </p>
                  </div>

                  <Link
                    to="/contact?type=ndis-quote"
                    className="inline-flex items-center gap-1.5 bg-[#147A7A] hover:bg-[#106262] text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors shadow-xs shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Request New NDIS Quote</span>
                  </Link>
                </div>

                {quotesLoading ? (<div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
                    <RefreshCw className="w-6 h-6 animate-spin text-[#147A7A] mx-auto mb-2" />
                    <p className="text-xs font-bold text-slate-600">Retrieving NDIS quotes...</p>
                  </div>) : quotes.length === 0 ? (<div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                    <Shield className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-extrabold text-slate-800">No NDIS Quotes on File</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      You haven't requested any NDIS quotations yet.
                    </p>
                    <Link
                      to="/contact?type=ndis-quote"
                      className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs mt-2"
                    >
                      <span>Create NDIS Quote</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>) : (<div className="space-y-4">
                    {quotes.map((q) => (<div key={q.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-teal-50 text-[#147A7A] border border-teal-200">
                              <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm text-slate-900">Quote #{q.id}</span>
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
                                  Cat 05 Assistive Tech
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                Valid for 30 days &bull; Participant: <strong>{q.customerName}</strong>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-[10px] text-slate-500 font-bold uppercase">Quoted Amount</div>
                            <div className="text-base font-black font-mono text-[#147A7A]">
                              ${Number(q.total || 0).toFixed(2)} AUD
                            </div>
                          </div>
                        </div>

                        {/* Items */}
                        <div className="space-y-1.5 py-1">
                          {(q.items || []).map((it: any, idx: number) => (<div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-slate-50">
                              <span className="font-medium text-slate-800">{it.name}</span>
                              <span className="font-mono font-bold text-slate-700">
                                {it.quantity}x &bull; ${Number(it.price || 0).toFixed(2)}
                              </span>
                            </div>))}
                        </div>

                        <div className="flex items-center justify-between pt-2">
                          <div className="text-xs text-slate-500">
                            {q.planManager && <span>Plan Manager: <strong>{q.planManager}</strong></span>}
                          </div>

                          <a
                            href={getQuotePdfUrl(q.id, q.accessToken || q.access_token)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold transition-colors shadow-2xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Download Quote (PDF)</span>
                          </a>
                        </div>
                      </div>))}
                  </div>)}
              </div>)}

            {/* TAB 3: NDIS & PERSONAL PROFILE */}
            {tab === 'profile' && (<div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="font-extrabold text-base text-slate-900">NDIS &amp; Delivery Profile</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Keep your delivery destination and NDIS plan details up to date for streamlined ordering and claims.
                    </p>
                  </div>

                  {!isEditingProfile ? (<button
                      type="button"
                      onClick={() => setIsEditingProfile(true)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit Information</span>
                    </button>) : (<button
                      type="button"
                      onClick={() => setIsEditingProfile(false)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                    >
                      Cancel Editing
                    </button>)}
                </div>

                {profileSuccessMsg && (<div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Your profile information has been saved successfully!</span>
                  </div>)}

                <form onSubmit={handleProfileSave} className="space-y-6">
                  {/* Section A: Contact Details */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Personal &amp; Contact Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({...profileForm, name: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Contact Phone</label>
                        <input
                          type="tel"
                          disabled={!isEditingProfile}
                          value={profileForm.phone}
                          onChange={(e) => setProfileForm({...profileForm, phone: e.target.value })}
                          placeholder="0400 000 000"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section B: Delivery Address */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Default Delivery Destination
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Street Address</label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({...profileForm, address: e.target.value })}
                          placeholder="e.g. 42 Victoria Parade"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">City / Suburb</label>
                          <input
                            type="text"
                            disabled={!isEditingProfile}
                            value={profileForm.city}
                            onChange={(e) => setProfileForm({...profileForm, city: e.target.value })}
                            placeholder="Fitzroy"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">State</label>
                          <select
                            disabled={!isEditingProfile}
                            value={profileForm.state}
                            onChange={(e) => setProfileForm({...profileForm, state: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                          >
                            <option value="VIC">VIC (Victoria)</option>
                            <option value="NSW">NSW (New South Wales)</option>
                            <option value="QLD">QLD (Queensland)</option>
                            <option value="SA">SA (South Australia)</option>
                            <option value="WA">WA (Western Australia)</option>
                            <option value="TAS">TAS (Tasmania)</option>
                            <option value="ACT">ACT (Australian Capital Territory)</option>
                            <option value="NT">NT (Northern Territory)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Postcode</label>
                          <input
                            type="text"
                            disabled={!isEditingProfile}
                            value={profileForm.postcode}
                            onChange={(e) => setProfileForm({...profileForm, postcode: e.target.value })}
                            placeholder="3065"
                            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section C: NDIS Funding Details */}
                  <div className="space-y-3 pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      NDIS Participant Funding Details
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">NDIS Number</label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={profileForm.ndisNumber}
                          onChange={(e) => setProfileForm({...profileForm, ndisNumber: e.target.value })}
                          placeholder="430 921 884"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Plan Management Type</label>
                        <select
                          disabled={!isEditingProfile}
                          value={profileForm.planType}
                          onChange={(e: any) => setProfileForm({...profileForm, planType: e.target.value })}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                        >
                          <option value="plan_managed">Plan-Managed (Plan Manager pays invoices)</option>
                          <option value="self_managed">Self-Managed (Participant claims direct)</option>
                          <option value="ndia_managed">NDIA-Managed (Agency Portal direct claim)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Plan Manager Name</label>
                        <input
                          type="text"
                          disabled={!isEditingProfile}
                          value={profileForm.planManager}
                          onChange={(e) => setProfileForm({...profileForm, planManager: e.target.value })}
                          placeholder="e.g. MyPlan Health Solutions"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Invoices / Claims Email</label>
                        <input
                          type="email"
                          disabled={!isEditingProfile}
                          value={profileForm.planManagerEmail}
                          onChange={(e) => setProfileForm({...profileForm, planManagerEmail: e.target.value })}
                          placeholder="claims@myplanhealth.com.au"
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-semibold disabled:bg-slate-50 disabled:text-slate-600 outline-none focus:border-[#147A7A]"
                        />
                      </div>
                    </div>
                  </div>

                  {isEditingProfile && (<div className="pt-4 flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEditingProfile(false)}
                        className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white font-bold text-xs transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Profile Changes</span>
                      </button>
                    </div>)}
                </form>
              </div>)}

            {/* TAB 4: SAVED WISHLIST */}
            {tab === 'wishlist' && (<div className="space-y-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">Saved Assistive Technology Equipment</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Items you have saved for upcoming trials, clinical reviews, or NDIS plan approval.
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#147A7A] bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200">
                    {wishlistProducts.length} Saved
                  </span>
                </div>

                {wishlistProducts.length === 0 ? (<div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                    <Heart className="w-10 h-10 text-slate-300 mx-auto" />
                    <h3 className="text-sm font-extrabold text-slate-800">Your Wishlist is Empty</h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto">
                      Click the heart icon on any equipment item in the catalogue to save it to your client account.
                    </p>
                    <Link
                      to="/shop"
                      className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs mt-2"
                    >
                      <span>Explore Equipment Catalogue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {wishlistProducts.map((prd) => (<div key={prd.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col justify-between space-y-3">
                        <div className="space-y-2">
                          <img
                            src={proxyImageUrl(prd.image)}
                            alt={prd.name}
                            className="w-full h-40 object-contain rounded-xl bg-slate-50 p-2"
                            loading="lazy"
                            onError={handleImageError}
                          />
                          <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2">{prd.name}</h4>
                          <div className="text-sm font-black font-mono text-[#147A7A]">
                            ${(prd.buyPrice ?? prd.price ?? 0).toFixed(2)} AUD
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => {
                              addItem({
                                id: prd.id,
                                name: prd.name,
                                price: prd.buyPrice ?? prd.price ?? 0,
                                image: prd.image,
                                purchaseType: 'buy',
                                quantity: 1,
                              });
                              openCart();
                            }}
                            className="flex-1 py-2 px-3 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white font-bold text-xs transition-colors cursor-pointer shadow-2xs flex items-center justify-center gap-1.5"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Cart</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleItem(prd.id)}
                            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>))}
                  </div>)}
              </div>)}

            {/* TAB 5: GUEST ORDER LOOKUP */}
            {tab === 'guest_lookup' && (<div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8 max-w-2xl mx-auto space-y-5">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">Look Up Any Order or Invoice</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Search for orders placed under a different email or on behalf of an NDIS participant.
                  </p>
                </div>

                {lookupError && (<div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                    <span>{lookupError}</span>
                  </div>)}

                <form onSubmit={handleGuestLookup} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Order Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={lookupOrderId}
                      onChange={(e) => setLookupOrderId(e.target.value)}
                      placeholder="e.g. ATS-123456"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                      Billing Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={lookupEmail}
                      onChange={(e) => setLookupEmail(e.target.value)}
                      placeholder="client@example.com.au"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={lookupLoading}
                    className="w-full py-3 px-4 rounded-xl bg-[#0F1E2E] hover:bg-[#1A2E44] text-white font-bold text-xs shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    {lookupLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    <span>Search Database</span>
                  </button>
                </form>

                {guestOrderResult && (<div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 space-y-3 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-slate-900">#{guestOrderResult.id}</span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                          getStatusConfig(guestOrderResult.status).bg
                        } ${getStatusConfig(guestOrderResult.status).color} ${
                          getStatusConfig(guestOrderResult.status).border
                        }`}
                      >
                        {getStatusConfig(guestOrderResult.status).label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-teal-100">
                      <span className="font-mono font-bold text-[#147A7A]">
                        ${Number(guestOrderResult.total || 0).toFixed(2)} AUD
                      </span>
                      <a
                        href={getOrderInvoicePdfUrl(guestOrderResult.id, guestAccessToken)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#147A7A] underline font-bold"
                      >
                        Download ATO Tax Invoice (PDF)
                      </a>
                    </div>
                  </div>)}
              </div>)}
          </div>)}
        </>)}
      </div>

      {/* ========================================================================= */}
      {/* ORDER DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedOrder && (<div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-scale-up">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-teal-50 text-[#147A7A] border border-teal-200">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    Order Breakdown #{selectedOrder.id}
                  </h3>
                  <p className="text-xs text-slate-500">ATO-Compliant Purchase Record</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Order Meta Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Status</span>
                  <span className="font-bold text-[#147A7A] uppercase">{selectedOrder.status}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Payment</span>
                  <span className="font-bold text-emerald-700 uppercase">{selectedOrder.payment_status || selectedOrder.paymentStatus || 'Paid'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Date</span>
                  <span className="font-bold text-slate-900">
                    {new Date(selectedOrder.created_at || selectedOrder.createdAt).toLocaleDateString('en-AU')}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Total</span>
                  <span className="font-mono font-black text-slate-900">
                    ${Number(selectedOrder.total || 0).toFixed(2)} AUD
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">Itemized Equipment</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-2 text-center w-12">Qty</th>
                        <th className="py-2.5 px-3 text-right w-24">Rate</th>
                        <th className="py-2.5 px-3 text-right w-24">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedOrderItems.map((it: any, idx: number) => (<tr key={idx}>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{it.name || it.product_name}</div>
                            {it.product_id && (<div className="text-[10px] font-mono text-slate-400">SKU: {it.product_id}</div>)}
                          </td>
                          <td className="py-2.5 px-2 text-center font-bold">{it.quantity}</td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                            ${Number(it.price || it.unit_price || 0).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            ${(Number(it.price || it.unit_price || 0) * Number(it.quantity || 1)).toFixed(2)}
                          </td>
                        </tr>))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-teal-50/60 text-slate-900 font-black border-t border-teal-200 text-xs">
                        <td colSpan={3} className="py-2.5 px-3 text-right text-[#147A7A]">Total Amount (GST-Free):</td>
                        <td className="py-2.5 px-3 text-right font-mono text-[#147A7A]">
                          ${Number(selectedOrder.total || 0).toFixed(2)} AUD
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Delivery Address */}
              {selectedOrder.shipping_address && (<div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <span className="font-bold text-slate-500 uppercase text-[10px] block mb-0.5">Delivery Destination</span>
                  <div className="font-semibold text-slate-800">{selectedOrder.shipping_address}</div>
                </div>)}

              {/* Download Button */}
              <div className="pt-2">
                <a
                  href={getOrderInvoicePdfUrl(selectedOrder.id, orderModalToken)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ATO Tax Invoice (PDF)</span>
                </a>
              </div>
              </div>
            </div>
          </div>)}
    </div>);
}

export default AccountPage;
