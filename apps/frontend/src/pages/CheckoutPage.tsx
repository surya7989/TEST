import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Lock,
  ShieldCheck,
  Truck,
  User,
  MapPin,
  ArrowRight,
  ShoppingBag,
  FileText,
  AlertCircle,
  Receipt,
  Download,
  CreditCard,
  Check,
  PhoneCall,
  Info,
  Copy,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Building2,
  Sparkles,
  Clock,
} from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useCartStore } from '@/store/useCartStore';
import { redeemPromo } from '@/lib/api';
import { useAdminStore } from '@/store/adminStore';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { formatCurrency } from '@/lib/utils';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import {
  getPayPalClientId,
  createPayPalOrder as apiCreateOrder,
  capturePayPalOrder as apiCaptureOrder,
  createNdisQuote as apiCreateNdisQuote,
  calculateCart as apiCalculateCart,
  getOrderInvoicePdfUrl,
  getQuotePdfUrl,
  type PayPalClientConfig,
} from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';

export function CheckoutPage() {
  const { user, autoRegisterFromOrder } = useAuthStore();
  const navigate = useNavigate();
  const { items, buyItems, hireItems, clearCart, setPromo, itemCount, hasMixedItems, separateCart, cartType } = useCart();
  const addOrder = useAdminStore((s) => s.addOrder);
  const addNdisQuote = useAdminStore((s) => s.addNdisQuote);
  const addCustomer = useAdminStore((s) => s.addCustomer);
  const checkoutSettings = useAdminStore((s) => s.checkoutSettings);

  // Admin checkout controls: Enable/Disable Direct Payment and Quotation
  const enablePayment = checkoutSettings?.enablePayment !== false;
  const enableQuotation = checkoutSettings?.enableQuotation !== false;

  // Primary Checkout Mode: 'payment' (PayPal / Cards) vs 'ndis_quote' ($0 Upfront NDIS Quotation)
  const [checkoutMode, setCheckoutMode] = useState<'payment' | 'ndis_quote'>('payment');

  // Sync mode if one of the modes is disabled by Admin Settings
  useEffect(() => {
    if (enablePayment && !enableQuotation) {
      setCheckoutMode('payment');
    } else if (!enablePayment && enableQuotation) {
      setCheckoutMode('ndis_quote');
    }
  }, [enablePayment, enableQuotation]);

  // PayPal client config loaded from backend
  const [paypalConfig, setPaypalConfig] = useState<PayPalClientConfig | null>(null);
  // 'sb' is only a local-dev sentinel — never render live PayPal buttons with it.
  const paypalReady = !!paypalConfig?.clientId && paypalConfig.clientId !== 'sb';
  const [configLoading, setConfigLoading] = useState(true);

  // Delivery selection
  const [deliveryMethod, setDeliveryMethod] = useState<'standard' | 'express' | 'white_glove'>('standard');

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  // Ref-level submission lock: blocks double-click duplicates before re-render
  const submittingRef = useRef(false);
  const [processingStep, setProcessingStep] = useState('');
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [placedOrderSummary, setPlacedOrderSummary] = useState<any>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);
  const [redirectSeconds, setRedirectSeconds] = useState(3);
  const [isRedirectPaused, setIsRedirectPaused] = useState(false);

  // Form validation
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

  // Server-authoritative totals (promo code applied server-side too)
  const [calculatedTotals, setCalculatedTotals] = useState<{
    subtotal: number;
    deliveryFee: number;
    gstTotal: number;
    total: number;
    discount: number;
    promoCode: string | null;
  }>({
    subtotal: 0,
    deliveryFee: 0,
    gstTotal: 0,
    total: 0,
    discount: 0,
    promoCode: null,
  });

  // Customer, Equipment Hire & NDIS details (Rehab Hire Standards)
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'VIC',
    postcode: '',
    deliveryNotes: '',

    // Equipment Hire Specific Details (Rehab Hire Rental Agreement Standard)
    hireStartDate: tomorrowStr,
    hireDurationWeeks: hireItems[0]?.hireWeeks || 4,
    hireLocationType: 'home' as 'home' | 'hospital' | 'facility',
    hireFacilityName: '',
    hireFacilityWard: '',
    hireFacilityRoom: '',
    hireDischargeDate: '',
    hireTermsAccepted: false,

    // NDIS Details
    ndisNumber: '',
    planType: 'plan_managed' as 'plan_managed' | 'self_managed' | 'ndia_managed',
    planManagerAgency: '',
    planManagerEmail: '',
    participantDob: '',
    clinicalNotes: '',

    // Prescribing Clinician / Occupational Therapist Details (Clinical Quotes)
    prescriberName: '',
    prescriberOrg: '',
    prescriberPhone: '',
    prescriberEmail: '',
    clinicalRationale: '',
  });

  // Calculated estimated return date for Equipment Hire
  const calculatedReturnDate = useMemo(() => {
    try {
      const start = new Date(formData.hireStartDate || Date.now());
      const weeks = Number(formData.hireDurationWeeks) || (hireItems[0]?.hireWeeks || 4);
      start.setDate(start.getDate() + weeks * 7);
      return start.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return '4 Weeks from delivery';
    }
  }, [formData.hireStartDate, formData.hireDurationWeeks, hireItems]);

  // Keep a synchronized ref to prevent stale closures inside async PayPal callbacks
  const latestStateRef = useRef({
    formData,
    items,
    deliveryMethod,
    calculatedTotals,
  });

  useEffect(() => {
    latestStateRef.current = {
      formData,
      items,
      deliveryMethod,
      calculatedTotals,
    };
  }, [formData, items, deliveryMethod, calculatedTotals]);

  // Form validity for PayPal button enablement
  const isFormValid = useMemo(() => {
    if (hasMixedItems) return false;
    const hasName = formData.name.trim().length > 0;
    const hasValidEmail = /\S+@\S+\.\S+/.test(formData.email.trim());
    const hasPhone = formData.phone.trim().length > 0;
    const hasAddress = formData.address.trim().length > 0;
    const hasCity = formData.city.trim().length > 0;
    const hasPostcode = formData.postcode.trim().length > 0;
    const hasItems = items.length > 0;

    const isHireCart = cartType === 'hire' || items.some((i) => i.purchaseType === 'hire');
    if (isHireCart) {
      if (!formData.hireTermsAccepted) return false;
      if (!formData.hireStartDate) return false;
      if ((formData.hireLocationType === 'hospital' || formData.hireLocationType === 'facility') && !formData.hireFacilityName.trim()) {
        return false;
      }
    }

    if (checkoutMode === 'ndis_quote') {
      const hasNdis = formData.ndisNumber.trim().length > 0;
      const hasPlanManager = formData.planType !== 'plan_managed' || formData.planManagerAgency.trim().length > 0;
      return hasName && hasValidEmail && hasPhone && hasAddress && hasCity && hasPostcode && hasItems && hasNdis && hasPlanManager;
    }

    return hasName && hasValidEmail && hasPhone && hasAddress && hasCity && hasPostcode && hasItems;
  }, [formData, items, checkoutMode, hasMixedItems, cartType]);

  // Calculate authoritative pricing whenever items or delivery method changes
  useEffect(() => {
    if (items.length === 0) return;

    const methodFee = deliveryMethod === 'white_glove' ? 149 : deliveryMethod === 'express' ? 29 : 0;
    const localSubtotal = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const localDelivery = items.reduce((sum, it) => sum + (it.deliveryFee || 0) * it.quantity, 0) + methodFee;
    const localGst = items.reduce((sum, it) => {
      if (it.gstType === 'gst-free') return sum;
      const rate = it.gstRate || 10;
      return sum + (it.price * it.quantity * rate) / (100 + rate);
    }, 0);
    const localTotal = localSubtotal + localDelivery;

    // Immediately set local computed totals (server confirms with promo shortly after)
    setCalculatedTotals({
      subtotal: localSubtotal,
      deliveryFee: localDelivery,
      gstTotal: localGst,
      total: localTotal,
      discount: 0,
      promoCode: useCartStore.getState().appliedPromo?.code || null,
    });

    let active = true;
    const promoCode = useCartStore.getState().appliedPromo?.code;
    apiCalculateCart(items, deliveryMethod, promoCode)
      .then((res) => {
        if (active && res.success) {
          const safeSubtotal = res.subtotal > 0 ? res.subtotal : localSubtotal;
          const safeDelivery = res.deliveryFee !== undefined ? res.deliveryFee : localDelivery;
          const safeTotal = res.total > 0 ? res.total : (safeSubtotal + safeDelivery);
          setCalculatedTotals({
            subtotal: safeSubtotal,
            deliveryFee: safeDelivery,
            gstTotal: res.gstTotal !== undefined ? res.gstTotal : localGst,
            total: safeTotal,
            discount: res.discount || 0,
            promoCode: res.promo?.code || promoCode || null,
          });
        }
      })
      .catch((err) => {
        console.warn('Server calculation notice:', err);
      });

    return () => {
      active = false;
    };
  }, [items, deliveryMethod]);

  // Auto-prefill customer info from logged-in account
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        address: prev.address || user.address || '',
        city: prev.city || user.city || '',
        state: prev.state || user.state || 'VIC',
        postcode: prev.postcode || user.postcode || '',
        ndisNumber: prev.ndisNumber || user.ndisNumber || '',
        planType: (user.planType as any) || prev.planType,
        planManagerAgency: prev.planManagerAgency || user.planManager || '',
        planManagerEmail: prev.planManagerEmail || user.planManagerEmail || '',
      }));
    }
  }, [user]);

  // Load PayPal credentials securely from backend API
  useEffect(() => {
    let active = true;
    getPayPalClientId()
      .then((cfg) => {
        if (active) {
          const rawId = cfg?.clientId || '';
          const safeClientId = (!rawId || rawId.includes('@') || rawId.includes('your_paypal') || rawId.includes('placeholder')) ? 'sb' : rawId;
          setPaypalConfig({
            clientId: safeClientId,
            mode: cfg?.mode || 'sandbox',
            currency: cfg?.currency || 'AUD',
          });
        }
      })
      .catch(() => {
        if (active) {
          setPaypalConfig({
            clientId: 'sb',
            mode: 'sandbox',
            currency: 'AUD',
          });
        }
      })
      .finally(() => {
        if (active) setConfigLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const validateForm = () => {
    const errs: { [key: string]: string } = {};

    if (hasMixedItems) {
      errs.mixedCart = 'Order cannot be placed with mixed purchase and hire items.';
      setGeneralError('Order Restriction: Equipment Hire items and Outright Purchases/NDIS Quotes cannot be processed together in a single order. Please separate your order.');
      return false;
    }

    if (!formData.name.trim()) errs.name = 'Full name is required';
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Valid email address is required';
    }
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    if (!formData.address.trim()) errs.address = 'Street address is required';
    if (!formData.city.trim()) errs.city = 'City / suburb is required';
    if (!formData.postcode.trim()) errs.postcode = 'Postcode is required';

    const isHireCart = cartType === 'hire' || items.some((i) => i.purchaseType === 'hire');
    if (isHireCart) {
      if (!formData.hireStartDate) {
        errs.hireStartDate = 'Preferred hire start date is required';
      }
      if ((formData.hireLocationType === 'hospital' || formData.hireLocationType === 'facility') && !formData.hireFacilityName.trim()) {
        errs.hireFacilityName = 'Hospital or rehabilitation facility name is required';
      }
      if (!formData.hireTermsAccepted) {
        errs.hireTermsAccepted = 'You must agree to the Equipment Hire Terms & Conditions to proceed';
      }
    }

    if (checkoutMode === 'ndis_quote') {
      if (!formData.ndisNumber.trim()) errs.ndisNumber = 'NDIS participant number is required for quotes';
      if (formData.planType === 'plan_managed' && !formData.planManagerAgency.trim()) {
        errs.planManagerAgency = 'Plan management agency name is required';
      }
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildCheckoutItemDetail = (it: any) => {
    const parts: string[] = [];
    if (it.selectedSize) parts.push(`Size: ${it.selectedSize.split('(')[0].trim()}`);
    if (it.selectedColor) parts.push(`Colour: ${it.selectedColor}`);
    if (it.hireWeeks) parts.push(`${it.hireWeeks} Wks Hire`);
    if (it.selectedExtras && it.selectedExtras.length > 0) {
      const extrasStr = it.selectedExtras.map((e: any) => `${e.name} (+$${Number(e.price).toFixed(2)})`).join(', ');
      parts.push(`Extras: ${extrasStr}`);
    }
    return parts.length > 0 ? parts.join(' • ') : (it.detail || '');
  };

  const handleNdisQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    if (hasMixedItems) {
      setGeneralError('Order Restriction: Equipment Hire items cannot be mixed with Outright Purchases in an NDIS Quote. Please separate your cart.');
      return;
    }
    if (!validateForm()) return;
    if (submittingRef.current) return;
    submittingRef.current = true;

    setIsProcessing(true);
    setProcessingStep('Registering NDIS quote in database...');

    try {
      const isHireQuote = cartType === 'hire' || items.some((it) => it.purchaseType === 'hire');
      const quotePayload = {
        items: items.map((it) => ({
          id: it.id,
          code: it.code || it.sku || it.id,
          sku: it.sku || it.code || it.id,
          name: it.name,
          detail: buildCheckoutItemDetail(it),
          selectedSize: it.selectedSize,
          selectedColor: it.selectedColor,
          selectedExtras: it.selectedExtras || [],
          quantity: it.quantity,
          price: it.price,
          purchaseType: it.purchaseType,
          hireWeeks: it.hireWeeks,
          fundingCategory: it.purchaseType === 'hire' ? 'Rental / Core AT' : 'Capital Assistive Technology',
        })),
        deliveryMethod,
        promoCode: calculatedTotals.promoCode || undefined,
        subtotal: calculatedTotals.subtotal,
        deliveryFee: calculatedTotals.deliveryFee,
        total: calculatedTotals.total,
        customerName: formData.name,
        customerEmail: formData.email,
        customerPhone: formData.phone,
        shippingAddress: `${formData.address}, ${formData.city} ${formData.state} ${formData.postcode}`,
        ndisNumber: formData.ndisNumber,
        planType: formData.planType,
        planManager: formData.planManagerAgency,
        planManagerEmail: formData.planManagerEmail,
        quoteType: isHireQuote ? ('hire' as const) : ('purchase' as const),
        participantDob: formData.participantDob,
        prescriberName: formData.prescriberName,
        prescriberOrg: formData.prescriberOrg,
        prescriberPhone: formData.prescriberPhone,
        prescriberEmail: formData.prescriberEmail,
        clinicalRationale: formData.clinicalRationale,
        hireStartDate: formData.hireStartDate,
        hireDurationWeeks: Number(formData.hireDurationWeeks) || 4,
        hireReturnDate: calculatedReturnDate,
        hireLocationType: formData.hireLocationType,
        hireFacilityName: formData.hireFacilityName,
        hireFacilityWard: formData.hireFacilityWard,
        hireFacilityRoom: formData.hireFacilityRoom,
        hireDischargeDate: formData.hireDischargeDate,
        hireTermsAccepted: formData.hireTermsAccepted,
        notes: isHireQuote
          ? `Hire Schedule: ${formData.hireDurationWeeks || 4} wks from ${formData.hireStartDate} (Est Return: ${calculatedReturnDate}). Delivery: ${formData.hireLocationType === 'hospital' ? `Hospital ${formData.hireFacilityName} Ward ${formData.hireFacilityWard} Bed ${formData.hireFacilityRoom}` : 'Private Residence'}. Prescriber: ${formData.prescriberName || 'None'}. Clinical Notes: ${formData.clinicalRationale || formData.clinicalNotes || 'None'}.`
          : `Prescribing Clinician: ${formData.prescriberName || 'None'} (${formData.prescriberOrg || 'Independent'}). Clinical Rationale: ${formData.clinicalRationale || formData.clinicalNotes || 'None'}. Delivery: ${formData.deliveryNotes || 'Standard'}.`,
      };

      const res = await apiCreateNdisQuote(quotePayload);

      if (res.success) {
        addNdisQuote({
          id: res.quoteId,
          customerName: formData.name,
          customerEmail: formData.email,
          customerPhone: formData.phone,
          shippingAddress: quotePayload.shippingAddress,
          ndisNumber: formData.ndisNumber,
          planManager: formData.planManagerAgency,
          planManagerEmail: formData.planManagerEmail,
          planType: formData.planType,
          quoteType: isHireQuote ? 'hire' : 'purchase',
          participantDob: formData.participantDob,
          prescriberName: formData.prescriberName,
          prescriberOrg: formData.prescriberOrg,
          prescriberPhone: formData.prescriberPhone,
          prescriberEmail: formData.prescriberEmail,
          clinicalRationale: formData.clinicalRationale,
          hireStartDate: formData.hireStartDate,
          hireDurationWeeks: Number(formData.hireDurationWeeks) || 4,
          hireReturnDate: calculatedReturnDate,
          hireLocationType: formData.hireLocationType,
          hireFacilityName: formData.hireFacilityName,
          hireFacilityWard: formData.hireFacilityWard,
          hireFacilityRoom: formData.hireFacilityRoom,
          hireDischargeDate: formData.hireDischargeDate,
          items: quotePayload.items,
          total: res.total || calculatedTotals.total,
          status: 'pending',
          createdAt: new Date().toISOString().split('T')[0],
          validUntil: new Date(Date.now() + 60 * 86400000).toISOString().split('T')[0],
          notes: quotePayload.notes,
        });

        addCustomer({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || '',
          ndisNumber: formData.ndisNumber,
          planManager: formData.planManagerAgency,
          address: quotePayload.shippingAddress,
          ordersCount: 0,
          totalSpent: 0,
        });

        setPlacedOrderSummary({
          type: 'ndis_quote',
          quoteType: isHireQuote ? 'hire' : 'purchase',
          isHire: isHireQuote,
          quoteId: res.quoteId,
          accessToken: res.accessToken,
          customerName: formData.name,
          customerEmail: formData.email,
          total: res.total || calculatedTotals.total,
          ndisNumber: formData.ndisNumber,
          planManager: formData.planManagerAgency,
          hireStartDate: formData.hireStartDate,
          hireReturnDate: calculatedReturnDate,
          hireDurationWeeks: formData.hireDurationWeeks,
          hireFacilityName: formData.hireFacilityName,
          pdfUrl: getQuotePdfUrl(res.quoteId, res.accessToken),
        });

        // Automatically create and sign in customer account
        try {
          await autoRegisterFromOrder({
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            city: formData.city,
            state: formData.state,
            postcode: formData.postcode,
            ndisNumber: formData.ndisNumber,
            planType: formData.planType,
            planManager: formData.planManagerAgency,
            planManagerEmail: formData.planManagerEmail,
          });
        } catch (accErr) {
          console.warn('Auto account registration notice:', accErr);
        }

        setOrderPlaced(true);
        if (calculatedTotals.promoCode) {
          redeemPromo(calculatedTotals.promoCode).catch(() => {});
          setPromo(null);
        }
        clearCart();
      } else {
        throw new Error(res.message || 'Failed to generate NDIS quote');
      }
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to submit NDIS quotation request. Please try again.');
    } finally {
      setIsProcessing(false);
      setProcessingStep('');
      submittingRef.current = false;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2500);
  };

  // Automatically open customer account after order completion.
  // NOTE: navigation lives in its own effect — never inside a state updater
  // (side effects in updaters trigger React setState-in-render warnings).
  useEffect(() => {
    if (!orderPlaced || !placedOrderSummary || isRedirectPaused) return;
    setRedirectSeconds(3);
    const timer = setInterval(() => {
      setRedirectSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [orderPlaced, placedOrderSummary, isRedirectPaused]);

  useEffect(() => {
    if (!orderPlaced || !placedOrderSummary || isRedirectPaused || redirectSeconds > 0) return;

    const ref = placedOrderSummary.type === 'ndis_quote' ? placedOrderSummary.quoteId : placedOrderSummary.orderId;
    const targetParam = placedOrderSummary.type === 'ndis_quote'
      ? `quoteId=${encodeURIComponent(ref)}`
      : `orderId=${encodeURIComponent(ref)}`;
    navigate(`/account?welcome=new_account&${targetParam}`);
  }, [orderPlaced, placedOrderSummary, isRedirectPaused, redirectSeconds, navigate]);

  // ============================================================================
  // EMPTY CART STATE
  // ============================================================================
  if (items.length === 0 && !orderPlaced) {
    return (<div className="min-h-[75vh] flex items-center justify-center py-16 px-4 bg-[#F8FAFC]">
        <div className="max-w-md w-full text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-gray-200 shadow-sm">
          <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto text-[#147A7A]">
            <ShoppingBag className="w-10 h-10" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900">Your Equipment Cart is Empty</h1>
            <p className="text-gray-500 text-xs sm:text-sm leading-relaxed">
              Explore our certified assistive equipment, mobility aids, pressure care, and clinical seating range to add items before checking out.
            </p>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white font-bold transition-all shadow-sm cursor-pointer"
          >
            <span>Browse Products Catalog</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>);
  }

  // ============================================================================
  // ORDER / QUOTE SUCCESS VIEW (REDESIGNED VOUCHER RECEIPT)
  // ============================================================================
  if (orderPlaced && placedOrderSummary) {
    const isQuote = placedOrderSummary.type === 'ndis_quote';
    const isHire = placedOrderSummary.isHire || placedOrderSummary.type === 'hire_order' || placedOrderSummary.quoteType === 'hire';
    const referenceNumber = isQuote ? placedOrderSummary.quoteId : placedOrderSummary.orderId;

    return (<div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 animate-fade-in">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-gray-200 shadow-lg text-center space-y-7 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#147A7A] via-[#0F766E] to-[#E88D2A]" />

            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-block text-[11px] font-black tracking-wider text-emerald-700 uppercase bg-emerald-50 px-3.5 py-1 rounded-full border border-emerald-200">
                {isHire
                  ? isQuote
                    ? 'NDIS Hire Quotation Generated ($0 Upfront)'
                    : 'Equipment Hire Agreement Confirmed'
                  : isQuote
                  ? 'NDIS Quote Generated ($0 Upfront)'
                  : 'Order Paid & Confirmed'}
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                {isHire
                  ? isQuote
                    ? 'Your NDIS Equipment Hire Quotation is Ready'
                    : 'Equipment Hire Agreement Confirmed'
                  : isQuote
                  ? 'Your NDIS Quotation is Ready'
                  : 'Thank You for Your Equipment Order!'}
              </h1>
              <p className="text-gray-600 text-xs sm:text-sm max-w-lg mx-auto leading-relaxed">
                {isHire
                  ? isQuote
                    ? `An Australian clinical standard NDIS Equipment Hire quotation has been created and emailed to ${placedOrderSummary.customerEmail}.`
                    : `Your equipment hire agreement #${referenceNumber} has been authorized. Delivery and collection coordination details are summarized below.`
                  : isQuote
                  ? `An ATO-compliant NDIS quotation document has been generated and emailed to ${placedOrderSummary.customerEmail}.`
                  : `Order #${placedOrderSummary.orderId} has been successfully authorized. Your Tax Invoice and delivery tracking reference are ready below.`}
              </p>
            </div>

            {/* Automatic Account Creation & Instant Open Alert */}
            <div className="bg-gradient-to-r from-teal-50 via-emerald-50/70 to-teal-50 border border-teal-200/80 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#147A7A] text-white flex items-center justify-center shrink-0 shadow-sm">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100/90 px-2.5 py-0.5 rounded-full border border-teal-200">
                      Account Automatically Created
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">{placedOrderSummary.customerEmail}</span>
                  </div>
                  <p className="text-xs sm:text-sm font-bold text-gray-900 mt-1">
                    {isRedirectPaused ? (<span>Your account is active! You can access your client portal anytime.</span>) : (<span>Opening your personal client portal in {redirectSeconds} second{redirectSeconds !== 1 ? 's' : ''}...</span>)}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    Live delivery tracking, Tax Invoices, and order records are connected to your account.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    const targetParam = isQuote
                      ? `quoteId=${encodeURIComponent(placedOrderSummary.quoteId)}`
                      : `orderId=${encodeURIComponent(placedOrderSummary.orderId)}`;
                    navigate(`/account?welcome=new_account&${targetParam}`);
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <span>Open My Account Now</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsRedirectPaused(!isRedirectPaused)}
                  className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  title={isRedirectPaused ? 'Resume countdown' : 'Stay on confirmation view'}
                >
                  {isRedirectPaused ? 'Resume' : 'Stay Here'}
                </button>
              </div>
            </div>

            {/* Reference & Billing Box */}
            <div className="bg-slate-50/80 rounded-2xl p-6 border border-gray-200 text-left space-y-3.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-200/80">
                <div>
                  <span className="text-xs text-gray-500 block">
                    {isHire ? 'Hire Agreement / Schedule Reference' : isQuote ? 'Quote Number' : 'Order Reference Number'}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono font-black text-lg text-gray-900">{referenceNumber}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(referenceNumber)}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                      title="Copy reference number"
                    >
                      {copiedRef ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-gray-500 block">Total Value (AUD)</span>
                  <span className="font-mono font-black text-lg text-[#147A7A]">
                    {formatCurrency(placedOrderSummary.total || calculatedTotals.total)}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500 block">Recipient / Participant:</span>
                  <span className="font-bold text-gray-900 block mt-0.5">{placedOrderSummary.customerName}</span>
                </div>

                {isQuote && placedOrderSummary.ndisNumber && (<div>
                    <span className="text-gray-500 block">NDIS Participant Number:</span>
                    <span className="font-mono font-bold text-gray-900 block mt-0.5">{placedOrderSummary.ndisNumber}</span>
                  </div>)}

                {!isQuote && placedOrderSummary.trackingNumber && (<div>
                    <span className="text-gray-500 block">Tracking Reference:</span>
                    <span className="font-mono font-bold text-gray-900 block mt-0.5">{placedOrderSummary.trackingNumber}</span>
                  </div>)}
              </div>

              {/* Specialized Equipment Hire Details Block */}
              {isHire && placedOrderSummary.hireStartDate && (
                <div className="pt-2 border-t border-gray-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-amber-50/70 p-3 rounded-xl text-xs text-amber-950">
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Hire Start Date:</span>
                    <span className="font-bold block font-mono">{placedOrderSummary.hireStartDate}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Est. Return Due Date:</span>
                    <span className="font-bold block font-mono text-[#147A7A]">{placedOrderSummary.hireReturnDate || 'Flexible Extension'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10.5px]">Tenure / Terms:</span>
                    <span className="font-bold block">{placedOrderSummary.hireDurationWeeks || 4} Weeks (Flexible Weekly)</span>
                  </div>
                  {placedOrderSummary.hireFacilityName && (
                    <div className="sm:col-span-3 pt-1 border-t border-amber-200/60 text-[11px]">
                      <span className="text-gray-500">Hospital Delivery Location: </span>
                      <strong className="text-amber-950">{placedOrderSummary.hireFacilityName}</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <Link
                to={`/view-document/${referenceNumber}`}
                target="_blank"
                className="inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#147A7A] hover:bg-[#106262] text-white font-bold text-xs sm:text-sm transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isHire
                    ? 'View & Download Hire Agreement (PDF)'
                    : isQuote
                    ? 'Download NDIS Quote (PDF)'
                    : 'Download Tax Invoice (PDF)'}
                </span>
              </Link>

              <Link
                to="/shop"
                className="inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl border border-gray-300 bg-white text-gray-700 font-bold text-xs sm:text-sm hover:bg-gray-50 transition-colors"
              >
                <span>Return to Equipment Store</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>);
  }

  // ============================================================================
  // MAIN CHECKOUT VIEW
  // ============================================================================
  return (<div className="min-h-screen bg-[#F8FAFC] py-8 sm:py-12">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 lg:px-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: 'Home', path: '/' },
            { label: 'Shop', path: '/shop' },
            { label: 'Cart', path: '/cart' },
            { label: 'Secure Checkout & NDIS Billing', path: '/checkout' },
          ]}
        />

        {/* Warning Symbol Restriction: Mixed Cart Detected */}
        {hasMixedItems && (
          <div className="mt-6 bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 sm:p-6 shadow-sm animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center flex-shrink-0 text-amber-700">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                    Order Restriction
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-amber-950">
                    Mixed Order Types Not Permitted
                  </h2>
                </div>
                <p className="text-xs sm:text-sm text-amber-900/90 mt-1.5 leading-relaxed">
                  Your cart contains both <strong>Outright Purchases</strong> ({buyItems.length} items) and <strong>Equipment Hire</strong> ({hireItems.length} items). Hire contracts require separate clinical rental agreements and collection scheduling, and cannot be combined into a single transaction.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => separateCart('buy')}
                    className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Proceed with Purchases Only ({buyItems.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => separateCart('hire')}
                    className="px-4 py-2.5 bg-[#E88D2A] hover:bg-[#D47C1E] text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Proceed with Equipment Hire Only ({hireItems.length})</span>
                  </button>
                  <Link
                    to="/cart"
                    className="px-4 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Return to Cart
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Slim page header: title + trust signals on one row */}
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 px-5 sm:px-7 py-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#147A7A] text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight leading-tight">
                  Secure Checkout
                </h1>
                <p className="text-[11px] sm:text-xs text-gray-500 mt-0.5">
                  NDIS Supplier · ABN 48 123 456 789 · 256-bit SSL secured
                </p>
              </div>
            </div>
            <a
              href="tel:0494767409"
              className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-[#147A7A] hover:text-[#106262] bg-teal-50 hover:bg-teal-100/70 border border-teal-200 rounded-xl px-4 py-2.5 transition-colors whitespace-nowrap self-start lg:self-auto"
            >
              <PhoneCall className="w-4 h-4" />
              <span>Need help? 0494 767 409</span>
            </a>
          </div>

          {/* Visual progress steps */}
          <ol className="flex items-center gap-1.5 sm:gap-2 mt-5 pt-4 border-t border-gray-100 overflow-x-auto">
            {[
              { n: 1, label: 'Your details' },
              { n: 2, label: 'Delivery' },
              ...(checkoutMode === 'ndis_quote' ? [{ n: 3, label: 'NDIS plan' }] : []),
              { n: checkoutMode === 'ndis_quote' ? 4 : 3, label: checkoutMode === 'ndis_quote' ? 'Get quote' : 'Payment' },
            ].map((s, i, arr) => (<li key={s.label} className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <span className={`flex items-center gap-1.5 text-[11px] sm:text-xs font-bold rounded-full pl-1 pr-2.5 sm:pr-3 py-1 ${i === 0 ? 'bg-[#147A7A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${i === 0 ? 'bg-white/25 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>
                    {s.n}
                  </span>
                  {s.label}
                </span>
                {i < arr.length - 1 && <span className="w-3 sm:w-5 h-px bg-gray-300" />}
              </li>))}
          </ol>

          {/* Checkout Mode Controls: Driven by Admin Settings */}
          {enablePayment && enableQuotation ? (/* BOTH MODES ENABLED: Clean Segmented Selector */
            <div className="mt-6 space-y-3">
              <div>
                <span className="text-sm font-black text-gray-900 block">
                  How would you like to proceed?
                </span>
                <span className="text-[11px] text-gray-500 block mt-0.5">
                  Pay now by card, or get a $0 NDIS quote for funding approval.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setCheckoutMode('payment')}
                  className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-4 ${
                    checkoutMode === 'payment'
                      ? 'border-[#147A7A] bg-teal-50/40 shadow-sm ring-1 ring-[#147A7A]/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      checkoutMode === 'payment' ? 'bg-[#147A7A] text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm sm:text-base">
                        {cartType === 'hire' || items.some((i) => i.purchaseType === 'hire')
                          ? 'Hire Agreement & Booking'
                          : 'Direct Payment'}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                        {cartType === 'hire' || items.some((i) => i.purchaseType === 'hire') ? 'Instant Booking' : 'Instant Dispatch'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">
                      {cartType === 'hire' || items.some((i) => i.purchaseType === 'hire')
                        ? 'Pay initial hire tenure & delivery. Instant confirmation with Hire Agreement Schedule (HIR-XXXXX).'
                        : 'PayPal · Visa / Mastercard · Pay in 4. Immediate order confirmation with Tax Invoice.'}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setCheckoutMode('ndis_quote')}
                  className={`p-4 sm:p-5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-start gap-4 ${
                    checkoutMode === 'ndis_quote'
                      ? 'border-[#147A7A] bg-teal-50/40 shadow-sm ring-1 ring-[#147A7A]/20'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      checkoutMode === 'ndis_quote' ? 'bg-[#147A7A] text-white shadow-xs' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900 text-sm sm:text-base">
                        {cartType === 'hire' || items.some((i) => i.purchaseType === 'hire')
                          ? '$0 NDIS Hire Quote'
                          : 'NDIS Quotation'}
                      </span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        $0 Upfront
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-snug">
                      {cartType === 'hire' || items.some((i) => i.purchaseType === 'hire')
                        ? 'For Plan-Managed & NDIA participants. Generates formal equipment hire quote for Plan Manager funding approval.'
                        : 'For Plan-Managed & NDIA participants. Generates instant PDF quote for funding approval.'}
                    </p>
                  </div>
                </button>
              </div>
            </div>) : enablePayment && !enableQuotation ? (/* ONLY PAYMENT ENABLED */
            <div className="mt-5 p-4 bg-teal-50/60 border border-teal-200 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-teal-900">
              <CreditCard className="w-5 h-5 text-[#147A7A] flex-shrink-0" />
              <div>
                <span className="font-bold block">Direct Payment Mode Active</span>
                <span className="text-teal-800 text-xs">
                  Instant card and PayPal payments are enabled. Automated ATO Tax Invoices provided upon checkout.
                </span>
              </div>
            </div>) : !enablePayment && enableQuotation ? (/* ONLY QUOTATION ENABLED */
            <div className="mt-5 p-4 bg-blue-50/60 border border-blue-200 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-blue-900">
              <FileText className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div>
                <span className="font-bold block">NDIS Quotation Mode Active ($0 Upfront)</span>
                <span className="text-blue-800 text-xs">
                  Direct online payments are currently paused. You can generate NDIS PDF quotations for funding approval.
                </span>
              </div>
            </div>) : (/* BOTH MODES DISABLED BY ADMIN */
            <div className="mt-5 p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center gap-3 text-xs sm:text-sm text-amber-900">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <div>
                <span className="font-bold block">Checkout Temporarily Paused</span>
                <span className="text-amber-800 text-xs">
                  Online payments and quote generators are currently offline for maintenance. Please call 0494 767 409 for direct assistance.
                </span>
              </div>
            </div>)}
        </div>

        {generalError && (<div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <div>
              <p className="font-bold">Checkout Notice</p>
              <p className="mt-0.5">{generalError}</p>
            </div>
          </div>)}

        {/* 2-COLUMN MAIN CONTENT GRID */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 7 COLUMNS: CUSTOMER DETAILS, DELIVERY & NDIS FIELDS */}
          <div className="lg:col-span-7 space-y-6">
            {/* SECTION 1: CUSTOMER & RECIPIENT DETAILS */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-5">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#147A7A] flex items-center justify-center font-black text-xs">
                  1
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-900">
                    {checkoutMode === 'ndis_quote' ? 'NDIS participant & contact person' : 'Your details'}
                  </h2>
                  <p className="text-xs text-gray-400">Who is ordering and where do we deliver?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Full Name / Participant Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    data-invalid={formErrors.name ? 'true' : undefined}
                    onChange={(e) => {
                      setFormData({...formData, name: e.target.value });
                      if (formErrors.name) setFormErrors((prev) => ({...prev, name: '' }));
                    }}
                    placeholder="e.g. John Doe"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium ${
                      formErrors.name ? 'border-red-500 bg-red-50/50' : 'border-gray-300 focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/15'
                    }`}
                  />
                  {formErrors.name && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Email Address (For Invoices/Quotes) *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    data-invalid={formErrors.email ? 'true' : undefined}
                    onChange={(e) => {
                      setFormData({...formData, email: e.target.value });
                      if (formErrors.email) setFormErrors((prev) => ({...prev, email: '' }));
                    }}
                    placeholder="name@example.com.au"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium ${
                      formErrors.email ? 'border-red-500 bg-red-50/50' : 'border-gray-300 focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/15'
                    }`}
                  />
                  {formErrors.email && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Mobile / Contact Phone *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    data-invalid={formErrors.phone ? 'true' : undefined}
                    onChange={(e) => {
                      setFormData({...formData, phone: e.target.value });
                      if (formErrors.phone) setFormErrors((prev) => ({...prev, phone: '' }));
                    }}
                    placeholder="0400 000 000"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium ${
                      formErrors.phone ? 'border-red-500 bg-red-50/50' : 'border-gray-300 focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/15'
                    }`}
                  />
                  {formErrors.phone && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.phone}</p>}
                </div>
              </div>
            </div>

            {/* SECTION 1.5: EQUIPMENT HIRE SCHEDULE & AGREEMENT (REHAB HIRE STANDARDS) */}
            {(cartType === 'hire' || items.some((i) => i.purchaseType === 'hire')) && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-amber-300/80 shadow-sm space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center font-black text-xs">
                      <RotateCcw className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="font-bold text-base sm:text-lg text-gray-900">
                        Equipment Hire Schedule &amp; Tenure
                      </h2>
                      <p className="text-xs text-gray-500">
                        Australian Clinical Equipment Hire Standard (Rehab Hire Model)
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                    2-Week Min. Hire
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Preferred Hire Start Date */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-[#147A7A]" />
                      <span>Preferred Hire Start Date *</span>
                    </label>
                    <input
                      type="date"
                      min={tomorrowStr}
                      value={formData.hireStartDate}
                      data-invalid={formErrors.hireStartDate ? 'true' : undefined}
                      onChange={(e) => {
                        setFormData({ ...formData, hireStartDate: e.target.value });
                        if (formErrors.hireStartDate) setFormErrors((prev) => ({ ...prev, hireStartDate: '' }));
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium ${
                        formErrors.hireStartDate
                          ? 'border-red-500 bg-red-50/50'
                          : 'border-gray-300 focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/15'
                      }`}
                    />
                    {formErrors.hireStartDate && (
                      <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.hireStartDate}</p>
                    )}
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Date equipment will be delivered and hire period starts.
                    </span>
                  </div>

                  {/* Initial Hire Period Selector */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#147A7A]" />
                      <span>Initial Hire Duration</span>
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {[2, 4, 6, 8, 12].map((weeks) => (
                        <button
                          key={weeks}
                          type="button"
                          onClick={() => setFormData({ ...formData, hireDurationWeeks: weeks })}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                            Number(formData.hireDurationWeeks) === weeks
                              ? 'bg-[#147A7A] text-white border-[#147A7A] shadow-xs'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div>{weeks} W</div>
                          {weeks === 2 && <span className="text-[8.5px] opacity-80 block font-normal leading-none">Min</span>}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px] text-gray-500 mt-1 block">
                      Selected: <strong>{formData.hireDurationWeeks} Weeks</strong> (Ongoing weekly rental until collection).
                    </span>
                  </div>

                  {/* Computed Estimated Return Due Date Banner */}
                  <div className="sm:col-span-2 bg-gradient-to-r from-teal-50/80 to-emerald-50/80 border border-teal-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-800 block">
                        Estimated Return Due Date:
                      </span>
                      <span className="text-sm font-black text-gray-900 mt-0.5 block font-mono">
                        {calculatedReturnDate}
                      </span>
                      <p className="text-[11px] text-gray-500 mt-0.5">
                        Rental continues on a weekly billing cycle until you contact us to request collection.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200 shrink-0">
                      <Check className="w-3.5 h-3.5" />
                      <span>Flexible Extension</span>
                    </div>
                  </div>

                  {/* Delivery Location Type Toggle: Private Residence vs Hospital / Facility */}
                  <div className="sm:col-span-2 space-y-2 pt-2 border-t border-gray-100">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Delivery Location Type
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          formData.hireLocationType === 'home'
                            ? 'border-[#147A7A] bg-teal-50/40'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="hire_location_type"
                          checked={formData.hireLocationType === 'home'}
                          onChange={() => setFormData({ ...formData, hireLocationType: 'home' })}
                          className="w-4 h-4 text-[#147A7A] focus:ring-[#147A7A]"
                        />
                        <div>
                          <div className="text-xs font-bold text-gray-900">Private Residence / Home</div>
                          <div className="text-[11px] text-gray-500">Standard residential street delivery</div>
                        </div>
                      </label>

                      <label
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                          formData.hireLocationType === 'hospital' || formData.hireLocationType === 'facility'
                            ? 'border-[#147A7A] bg-teal-50/40'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="hire_location_type"
                          checked={formData.hireLocationType === 'hospital' || formData.hireLocationType === 'facility'}
                          onChange={() => setFormData({ ...formData, hireLocationType: 'hospital' })}
                          className="w-4 h-4 text-[#147A7A] focus:ring-[#147A7A]"
                        />
                        <div>
                          <div className="text-xs font-bold text-gray-900">Hospital / Rehab Facility Delivery</div>
                          <div className="text-[11px] text-gray-500">Direct delivery to hospital ward / room for discharge</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Hospital Delivery Details if selected */}
                  {(formData.hireLocationType === 'hospital' || formData.hireLocationType === 'facility') && (
                    <div className="sm:col-span-2 p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 animate-fade-in">
                      <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                        <Building2 className="w-4 h-4 text-[#147A7A]" />
                        <span>Hospital / Inpatient Delivery Details (For OT Discharge)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">
                            Hospital / Facility Name *
                          </label>
                          <input
                            type="text"
                            value={formData.hireFacilityName}
                            data-invalid={formErrors.hireFacilityName ? 'true' : undefined}
                            onChange={(e) => {
                              setFormData({ ...formData, hireFacilityName: e.target.value });
                              if (formErrors.hireFacilityName) setFormErrors((prev) => ({ ...prev, hireFacilityName: '' }));
                            }}
                            placeholder="e.g. The Alfred Hospital, Epworth Richmond, Royal Melbourne Hospital"
                            className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none bg-white font-medium ${
                              formErrors.hireFacilityName ? 'border-red-500 bg-red-50/50' : 'border-gray-300 focus:border-[#147A7A]'
                            }`}
                          />
                          {formErrors.hireFacilityName && (
                            <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.hireFacilityName}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Ward / Unit</label>
                          <input
                            type="text"
                            value={formData.hireFacilityWard}
                            onChange={(e) => setFormData({ ...formData, hireFacilityWard: e.target.value })}
                            placeholder="e.g. Ward 4 West"
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs outline-none bg-white font-medium focus:border-[#147A7A]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Bed / Room Number</label>
                          <input
                            type="text"
                            value={formData.hireFacilityRoom}
                            onChange={(e) => setFormData({ ...formData, hireFacilityRoom: e.target.value })}
                            placeholder="e.g. Bed 12 / Room 402"
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs outline-none bg-white font-medium focus:border-[#147A7A]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 mb-1">Expected Discharge Date</label>
                          <input
                            type="date"
                            value={formData.hireDischargeDate}
                            onChange={(e) => setFormData({ ...formData, hireDischargeDate: e.target.value })}
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs outline-none bg-white font-medium focus:border-[#147A7A]"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Rehab Hire 100% Purchase Credit Rebate Box */}
                  <div className="sm:col-span-2 bg-[#FFF8ED] border border-[#FDE5CC] rounded-2xl p-4 flex items-start gap-3.5 text-xs text-[#9A5310]">
                    <div className="w-8 h-8 rounded-xl bg-[#FEE9CE] text-[#E88D2A] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-extrabold text-[#7A3F05] text-xs sm:text-sm flex items-center gap-2">
                        <span>100% Hire Rebate Guarantee (Purchase Credit)</span>
                        <span className="text-[10px] font-black uppercase bg-[#FDE5CC] text-[#7A3F05] px-2 py-0.5 rounded">
                          Rehab Hire Model
                        </span>
                      </div>
                      <p className="text-[11.5px] mt-1 text-[#8A4A0A] leading-relaxed">
                        If you decide to purchase this equipment outright within the first <strong>4 weeks</strong> of hire, <strong>100% of all hire fees paid</strong> will be credited directly towards your purchase price.
                      </p>
                    </div>
                  </div>

                  {/* Hire Agreement Terms Checkbox */}
                  <div className="sm:col-span-2 pt-2">
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                        formData.hireTermsAccepted
                          ? 'border-[#147A7A] bg-teal-50/30'
                          : formErrors.hireTermsAccepted
                          ? 'border-red-400 bg-red-50/40'
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50/50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.hireTermsAccepted}
                        onChange={(e) => {
                          setFormData({ ...formData, hireTermsAccepted: e.target.checked });
                          if (formErrors.hireTermsAccepted) setFormErrors((prev) => ({ ...prev, hireTermsAccepted: '' }));
                        }}
                        className="w-4 h-4 mt-0.5 text-[#147A7A] rounded focus:ring-[#147A7A]"
                      />
                      <div className="text-xs text-gray-700 leading-relaxed">
                        <span className="font-bold text-gray-900 block">
                          I agree to the Equipment Hire Agreement Terms &amp; Conditions *
                        </span>
                        <span className="text-[11px] text-gray-500 block mt-0.5">
                          Minimum 2-week hire term applies. Hire automatically continues on an ongoing weekly rate until collection is requested. Equipment remains the property of Assistive Tech Specialists Australia at all times. The hirer is responsible for reasonable care of the equipment.
                        </span>
                      </div>
                    </label>
                    {formErrors.hireTermsAccepted && (
                      <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.hireTermsAccepted}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: DELIVERY ADDRESS & FREIGHT METHOD */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-5">
              <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-[#147A7A] flex items-center justify-center font-black text-xs">
                  2
                </div>
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-900">
                    Delivery Address &amp; Shipping
                  </h2>
                  <p className="text-xs text-gray-400">Where should we send your equipment?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    data-invalid={formErrors.address ? 'true' : undefined}
                    onChange={(e) => {
                      setFormData({...formData, address: e.target.value });
                      if (formErrors.address) setFormErrors((prev) => ({...prev, address: '' }));
                    }}
                    placeholder="120 Collins Street, Level 3"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium ${
                      formErrors.address ? 'border-red-500 bg-red-50/50' : 'border-gray-300 focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/15'
                    }`}
                  />
                  {formErrors.address && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.address}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    City / Suburb *
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    data-invalid={formErrors.city ? 'true' : undefined}
                    onChange={(e) => {
                      setFormData({...formData, city: e.target.value });
                      if (formErrors.city) setFormErrors((prev) => ({...prev, city: '' }));
                    }}
                    placeholder="Melbourne"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium ${
                      formErrors.city ? 'border-red-500 bg-red-50/50' : 'border-gray-300 focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/15'
                    }`}
                  />
                  {formErrors.city && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.city}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">State</label>
                    <select
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-gray-300 text-sm outline-none bg-white font-medium focus:border-[#147A7A] cursor-pointer"
                    >
                      <option value="VIC">VIC</option>
                      <option value="NSW">NSW</option>
                      <option value="QLD">QLD</option>
                      <option value="WA">WA</option>
                      <option value="SA">SA</option>
                      <option value="TAS">TAS</option>
                      <option value="ACT">ACT</option>
                      <option value="NT">NT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Postcode *</label>
                    <input
                      type="text"
                      value={formData.postcode}
                      data-invalid={formErrors.postcode ? 'true' : undefined}
                      onChange={(e) => {
                        setFormData({...formData, postcode: e.target.value });
                        if (formErrors.postcode) setFormErrors((prev) => ({...prev, postcode: '' }));
                      }}
                      placeholder="3000"
                      className={`w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium ${
                        formErrors.postcode ? 'border-red-500 bg-red-50/50' : 'border-gray-300 focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/15'
                      }`}
                    />
                    {formErrors.postcode && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.postcode}</p>}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Delivery Instructions / Ramp Access Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.deliveryNotes}
                    onChange={(e) => setFormData({...formData, deliveryNotes: e.target.value })}
                    placeholder="e.g. Ground floor clinic, ramp access via side entrance"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#147A7A]"
                  />
                </div>
              </div>

              {/* Delivery Freight Level Cards */}
              <div className="space-y-3 pt-4 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Select Delivery &amp; Setup Service
                </label>
                <div className="space-y-2.5">
                  {[
                    { id: 'standard', label: 'Standard Tracked Courier', fee: 0, desc: '2–5 business days nationwide • Tracked door delivery' },
                    { id: 'express', label: 'Express Priority Courier', fee: 29, desc: '1–2 business days prioritized warehouse dispatch' },
                    { id: 'white_glove', label: 'White Glove Setup & In-Room Assembly', fee: 149, desc: 'In-room delivery, unpacking, equipment adjustment & testing by technician' },
                  ].map((opt) => (<label
                      key={opt.id}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                        deliveryMethod === opt.id
                          ? 'border-[#147A7A] bg-teal-50/40 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery_method"
                          checked={deliveryMethod === opt.id}
                          onChange={() => setDeliveryMethod(opt.id as any)}
                          className="w-4 h-4 text-[#147A7A] focus:ring-[#147A7A]"
                        />
                        <div>
                          <div className="text-sm font-bold text-gray-900">{opt.label}</div>
                          <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
                        </div>
                      </div>
                      <div className="text-sm font-black text-gray-900">
                        {opt.fee === 0 ? <span className="text-emerald-700">FREE</span> : formatCurrency(opt.fee)}
                      </div>
                    </label>))}
                </div>
              </div>
            </div>

            {/* SECTION 3: NDIS QUOTATION & CLINICAL PRESCRIBER DETAILS */}
            {checkoutMode === 'ndis_quote' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6 animate-fade-in">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                      3
                    </div>
                    <div>
                      <h2 className="font-bold text-base sm:text-lg text-gray-900">
                        NDIS Plan &amp; Prescribing Clinician Details
                      </h2>
                      <p className="text-xs text-gray-400">
                        Compliant NDIS Quotation standard for Plan Managers &amp; NDIA PACE Portal
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    60-Day Validity
                  </span>
                </div>

                {/* Sub-section A: Participant & Plan Management */}
                <div className="space-y-4">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                    Part A: Participant &amp; Plan Manager
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        NDIS Participant Number *
                      </label>
                      <input
                        type="text"
                        value={formData.ndisNumber}
                        onChange={(e) => setFormData({ ...formData, ndisNumber: e.target.value })}
                        placeholder="e.g. 430 000 000"
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-mono font-medium ${
                          formErrors.ndisNumber ? 'border-red-500 bg-red-50/50' : 'border-gray-300 focus:border-[#147A7A]'
                        }`}
                      />
                      {formErrors.ndisNumber && <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.ndisNumber}</p>}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Participant Date of Birth (DOB)
                      </label>
                      <input
                        type="date"
                        value={formData.participantDob}
                        onChange={(e) => setFormData({ ...formData, participantDob: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none bg-white font-medium focus:border-[#147A7A]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        NDIS Management Structure *
                      </label>
                      <select
                        value={formData.planType}
                        onChange={(e) => setFormData({ ...formData, planType: e.target.value as any })}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm outline-none bg-white font-medium focus:border-[#147A7A] cursor-pointer"
                      >
                        <option value="plan_managed">Plan-Managed (Invoiced to Plan Management Agency)</option>
                        <option value="self_managed">Self-Managed (Claimed directly by Participant / Carer)</option>
                        <option value="ndia_managed">NDIA / Agency-Managed (Claimed via PACE Provider Portal)</option>
                      </select>
                    </div>

                    {formData.planType === 'plan_managed' && (
                      <>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Plan Management Agency Name *
                          </label>
                          <input
                            type="text"
                            value={formData.planManagerAgency}
                            onChange={(e) => setFormData({ ...formData, planManagerAgency: e.target.value })}
                            placeholder="e.g. Plan Partners, MyIntegra, Moira, Maple"
                            className={`w-full px-4 py-2.5 rounded-xl border text-sm outline-none transition-all font-medium ${
                              formErrors.planManagerAgency ? 'border-red-500 bg-red-50/50' : 'border-gray-300 focus:border-[#147A7A]'
                            }`}
                          />
                          {formErrors.planManagerAgency && (
                            <p className="text-xs text-red-500 mt-1 font-semibold">{formErrors.planManagerAgency}</p>
                          )}
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                            Plan Manager Invoices Email
                          </label>
                          <input
                            type="email"
                            value={formData.planManagerEmail}
                            onChange={(e) => setFormData({ ...formData, planManagerEmail: e.target.value })}
                            placeholder="invoices@planagency.com.au"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#147A7A]"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Sub-section B: Prescribing Clinician / Occupational Therapist (Rehab Hire Standards) */}
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#147A7A]" />
                      <span>Part B: Prescribing Clinician / OT (Optional / Clinical Standard)</span>
                    </span>
                    <span className="text-[10px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Rehab Hire Standard
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Prescribing Clinician / OT Name
                      </label>
                      <input
                        type="text"
                        value={formData.prescriberName}
                        onChange={(e) => setFormData({ ...formData, prescriberName: e.target.value })}
                        placeholder="e.g. Sarah Mitchell (Occupational Therapist)"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#147A7A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Hospital / Health Practice / Organization
                      </label>
                      <input
                        type="text"
                        value={formData.prescriberOrg}
                        onChange={(e) => setFormData({ ...formData, prescriberOrg: e.target.value })}
                        placeholder="e.g. Monash Health / Independent Practice"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#147A7A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Clinician Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.prescriberPhone}
                        onChange={(e) => setFormData({ ...formData, prescriberPhone: e.target.value })}
                        placeholder="e.g. 03 9000 0000"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#147A7A]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Clinician Email (For Assessment Copy)
                      </label>
                      <input
                        type="email"
                        value={formData.prescriberEmail}
                        onChange={(e) => setFormData({ ...formData, prescriberEmail: e.target.value })}
                        placeholder="clinician@healthpractice.com.au"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#147A7A]"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Clinical Rationale / Assistive Technology Goals
                      </label>
                      <textarea
                        rows={2}
                        value={formData.clinicalRationale}
                        onChange={(e) => setFormData({ ...formData, clinicalRationale: e.target.value })}
                        placeholder="e.g. Prescribed for post-discharge mobility, pressure ulcer prevention, and independent transfers."
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm outline-none focus:border-[#147A7A] resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT 5 COLUMNS: STICKY ORDER & FUNDING SUMMARY */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-200 shadow-lg space-y-6 sticky top-24">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h2 className="font-bold text-base sm:text-lg text-gray-900">
                    Your order
                  </h2>
                  <p className="text-xs text-gray-400">What you are getting</p>
                </div>
                <span className="text-xs font-bold bg-teal-50 text-[#147A7A] px-2.5 py-1 rounded-full border border-teal-200">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}{items.length > 1 && items.length !== itemCount ? ` (${items.length} products)` : ''}
                </span>
              </div>

              {/* Items List with Thumbnails, Variant Badges & Extras */}
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 pr-1 space-y-3">
                {items.map((it) => {
                  const isHire = it.purchaseType === 'hire';
                  return (
                    <div key={it.cartItemId} className="py-3 flex items-start justify-between gap-3 text-sm">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        {it.image && (
                          <div className="w-14 h-14 rounded-xl bg-gray-50 border border-gray-100 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden">
                            <img
                              src={proxyImageUrl(it.image)}
                              alt={it.name}
                              className="w-full h-full object-contain"
                              onError={handleImageError}
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          {/* Tag Badge: Purchase vs Hire */}
                          <div className="mb-1 flex items-center gap-2">
                            {isHire ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF8ED] text-[#E88D2A] border border-[#FDE5CC]">
                                <RotateCcw className="h-2.5 w-2.5" />
                                EQUIPMENT HIRE ({it.hireWeeks || 2} WEEKS)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <ShoppingBag className="h-2.5 w-2.5" />
                                OUTRIGHT PURCHASE
                              </span>
                            )}
                          </div>

                          <p className="font-bold text-gray-900 text-xs sm:text-sm leading-snug">{it.name}</p>

                          {/* Variant metadata: Size & Colour */}
                          {(it.selectedSize || it.selectedColor) && (
                            <div className="flex flex-wrap gap-1 mt-1 text-[10.5px] text-gray-600">
                              {it.selectedSize && (
                                <span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700">
                                  Size: <strong>{it.selectedSize.split('(')[0].trim()}</strong>
                                </span>
                              )}
                              {it.selectedColor && (
                                <span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700">
                                  Colour: <strong>{it.selectedColor}</strong>
                                </span>
                              )}
                            </div>
                          )}

                          {/* Optional Extras itemization */}
                          {it.selectedExtras && it.selectedExtras.length > 0 && (
                            <div className="mt-1.5 p-2 bg-gray-50/80 rounded-lg border border-gray-100 space-y-1">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                INCLUDED EXTRAS:
                              </span>
                              {it.selectedExtras.map((extra) => (
                                <div key={extra.id} className="text-[11px] text-gray-700 flex items-start gap-1">
                                  <span className="text-emerald-600 font-bold leading-none mt-0.5">+</span>
                                  <span className="flex-1 font-medium">{extra.name}</span>
                                  <span className="font-semibold text-gray-900">
                                    (${Number(extra.price).toFixed(2)})
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          <p className="text-[11px] text-gray-500 mt-1">
                            Qty: <strong className="text-gray-800">{it.quantity}</strong> &bull; {formatCurrency(it.price)} each
                          </p>
                        </div>
                      </div>

                      <div className="font-black text-gray-900 text-right flex-shrink-0 font-mono text-xs sm:text-sm pt-1">
                        {formatCurrency(it.price * it.quantity)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="space-y-2.5 pt-4 border-t border-gray-100 text-xs sm:text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Equipment Subtotal:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {formatCurrency(calculatedTotals.subtotal)} AUD
                  </span>
                </div>
                {calculatedTotals.discount > 0 && (<div className="flex justify-between text-emerald-600">
                    <span>Coupon ({calculatedTotals.promoCode})</span>
                    <span className="font-bold font-mono">-{formatCurrency(calculatedTotals.discount)} AUD</span>
                  </div>)}
                <div className="flex justify-between text-gray-600">
                  <span>Freight &amp; Delivery:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {calculatedTotals.deliveryFee === 0 ? <span className="text-emerald-700">FREE</span> : `${formatCurrency(calculatedTotals.deliveryFee)} AUD`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-gray-600 text-xs py-1">
                  <span>GST Status:</span>
                  {calculatedTotals.gstTotal > 0 ? (<span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      <Check className="w-3 h-3" />
                      <span>Includes {formatCurrency(calculatedTotals.gstTotal)} GST</span>
                    </span>) : (<span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <Check className="w-3 h-3" />
                      <span>0% NDIS GST-Free (Sec 38-45)</span>
                    </span>)}
                </div>

                <div className="flex justify-between items-baseline pt-3 border-t border-gray-200">
                  <div>
                    <span className="text-base font-black text-gray-900 block">Total Amount:</span>
                    <span className="text-[11px] text-gray-400 font-medium">Includes shipping &amp; itemized tax invoice</span>
                  </div>
                  <span className="text-2xl font-black text-[#147A7A] font-mono">
                    {formatCurrency(calculatedTotals.total)}
                  </span>
                </div>
              </div>

              {/* PAYMENT EXECUTION OR QUOTE SUBMISSION */}
              <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-black text-gray-900">
                    {checkoutMode === 'ndis_quote' ? 'Finish — get your quote' : 'Finish — pay securely'}
                  </span>
                </div>
                {hasMixedItems ? (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-900 space-y-2">
                    <div className="flex items-center gap-2 font-bold text-amber-950 text-xs sm:text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <span>Checkout Restricted: Mixed Cart</span>
                    </div>
                    <p className="text-[11.5px] leading-relaxed text-amber-800">
                      You cannot check out with both Outright Purchases and Equipment Hire in the same transaction. Please separate your order using the banner above.
                    </p>
                  </div>
                ) : checkoutMode === 'ndis_quote' ? (/* NDIS QUOTATION SUBMISSION BUTTON */
                  <button
                    type="button"
                    onClick={handleNdisQuoteSubmit}
                    disabled={isProcessing}
                    className="w-full py-4 px-6 rounded-2xl bg-[#147A7A] hover:bg-[#106262] text-white font-bold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01]"
                  >
                    {isProcessing ? (<>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>{processingStep || 'Generating Quote...'}</span>
                      </>) : (<>
                        <FileText className="w-5 h-5" />
                        <span>Generate NDIS Quote ($0 Upfront)</span>
                      </>)}
                  </button>) : enablePayment ? (/* DIRECT ONLINE PAYMENT (PAYPAL / CARDS) */
                  <div className="space-y-4">
                    {configLoading ? (<div className="py-6 flex items-center justify-center gap-2 text-gray-500 text-xs">
                        <div className="w-4 h-4 border-2 border-[#147A7A]/30 border-t-[#147A7A] rounded-full animate-spin" />
                        <span>Initializing secure PayPal &amp; Card Gateway...</span>
                      </div>) : paypalReady ? (<div className="space-y-2">
                        {!isFormValid && (<div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 font-medium flex items-center gap-2">
                            <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            <span>Complete delivery address on the left to activate payment buttons</span>
                          </div>)}

                        <PayPalScriptProvider
                          options={{
                            clientId: paypalConfig.clientId,
                            currency: 'AUD',
                            intent: 'capture',
                            components: 'buttons',
                            enableFunding: 'paylater,card',
                          }}
                        >
                          <PayPalButtons
                            style={{
                              layout: 'vertical',
                              color: 'gold',
                              shape: 'rect',
                              label: 'pay',
                              height: 48,
                            }}
                            disabled={isProcessing || !isFormValid}
                            onClick={(_data: any, actions: any) => {
                              setGeneralError(null);
                              if (!validateForm()) {
                                const firstInvalid = document.querySelector('[data-invalid="true"]') as HTMLElement;
                                if (firstInvalid) {
                                  firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  setTimeout(() => firstInvalid.focus(), 350);
                                }
                                setGeneralError('Please fill in all required customer contact and address fields before proceeding to payment.');
                                return actions.reject();
                              }
                              return actions.resolve();
                            }}
                            createOrder={async () => {
                              setGeneralError(null);
                              try {
                                const state = latestStateRef.current;

                              const payload = {
                                items: state.items.map((it) => ({
                                  id: it.id,
                                  code: it.code || it.sku || it.id,
                                  sku: it.sku || it.code || it.id,
                                  name: it.name,
                                  detail: buildCheckoutItemDetail(it),
                                  selectedSize: it.selectedSize,
                                  selectedColor: it.selectedColor,
                                  selectedExtras: it.selectedExtras || [],
                                  price: it.price,
                                  quantity: it.quantity,
                                  purchaseType: it.purchaseType,
                                  hireWeeks: it.hireWeeks,
                                  gstType: it.gstType,
                                  gstRate: it.gstRate,
                                  deliveryFee: it.deliveryFee,
                                })),
                                subtotal: state.calculatedTotals.subtotal,
                                deliveryFee: state.calculatedTotals.deliveryFee,
                                gstTotal: state.calculatedTotals.gstTotal,
                                total: state.calculatedTotals.total,
                                deliveryMethod: state.deliveryMethod,
                                promoCode: state.calculatedTotals.promoCode || undefined,
                                customer: {
                                  name: state.formData.name,
                                  email: state.formData.email,
                                  phone: state.formData.phone,
                                  address: state.formData.address,
                                  city: state.formData.city,
                                  state: state.formData.state,
                                  postcode: state.formData.postcode,
                                },
                                shipping: {
                                  address: state.formData.address,
                                  city: state.formData.city,
                                  state: state.formData.state,
                                  postcode: state.formData.postcode,
                                },
                              };

                              const res = await apiCreateOrder(payload);
                              if (!res.paypalOrderId) {
                                throw new Error('Failed to obtain PayPal Order ID from server');
                              }
                              return res.paypalOrderId;
                              } catch (err: any) {
                                setGeneralError(err?.message || 'Could not start PayPal checkout. Please try again.');
                                throw err;
                              }
                            }}
                            onApprove={async (data) => {
                              setIsProcessing(true);
                              setProcessingStep('Capturing payment and generating tax invoice...');
                              const state = latestStateRef.current;

                              const orderItemsPayload = state.items.map((it) => ({
                                id: it.id,
                                code: it.code || it.sku || it.id,
                                sku: it.sku || it.code || it.id,
                                name: it.name,
                                detail: buildCheckoutItemDetail(it),
                                selectedSize: it.selectedSize,
                                selectedColor: it.selectedColor,
                                selectedExtras: it.selectedExtras || [],
                                price: it.price,
                                quantity: it.quantity,
                                purchaseType: it.purchaseType,
                                hireWeeks: it.hireWeeks,
                                gstType: it.gstType,
                                gstRate: it.gstRate,
                                deliveryFee: it.deliveryFee,
                              }));

                              try {
                                const res = await apiCaptureOrder({
                                  paypalOrderId: data.orderID,
                                  items: orderItemsPayload,
                                  subtotal: state.calculatedTotals.subtotal,
                                  deliveryFee: state.calculatedTotals.deliveryFee,
                                  gstTotal: state.calculatedTotals.gstTotal,
                                  total: state.calculatedTotals.total,
                                  deliveryMethod: state.deliveryMethod,
                                promoCode: state.calculatedTotals.promoCode || undefined,
                                  customer: {
                                    name: state.formData.name,
                                    email: state.formData.email,
                                    phone: state.formData.phone,
                                    address: state.formData.address,
                                    city: state.formData.city,
                                    state: state.formData.state,
                                    postcode: state.formData.postcode,
                                  },
                                  ndisNumber: state.formData.ndisNumber,
                                  deliveryNotes: state.formData.deliveryNotes,
                                });

                                if (res.success && res.order) {
                                  const isHireOrder = cartType === 'hire' || orderItemsPayload.some((it) => it.purchaseType === 'hire');
                                  addOrder({
                                    id: res.order.orderId,
                                    customerName: state.formData.name,
                                    customerEmail: state.formData.email,
                                    customerPhone: state.formData.phone,
                                    shippingAddress: `${state.formData.address}, ${state.formData.city} ${state.formData.state} ${state.formData.postcode}`,
                                    deliveryMethod: state.deliveryMethod,
                                    items: orderItemsPayload,
                                    subtotal: state.calculatedTotals.subtotal,
                                    deliveryFee: state.calculatedTotals.deliveryFee,
                                    gstTotal: state.calculatedTotals.gstTotal,
                                    total: state.calculatedTotals.total,
                                    status: 'confirmed',
                                    paymentStatus: 'paid',
                                    paymentMethod: 'paypal',
                                    paypalOrderId: data.orderID,
                                    paypalCaptureId: res.order.paypalCaptureId,
                                    trackingNumber: res.order.trackingNumber,
                                    createdAt: new Date().toISOString().split('T')[0],
                                    hireLocationType: isHireOrder ? state.formData.hireLocationType : undefined,
                                    hireFacilityName: isHireOrder ? state.formData.hireFacilityName : undefined,
                                    hireFacilityWard: isHireOrder ? state.formData.hireFacilityWard : undefined,
                                    hireFacilityRoom: isHireOrder ? state.formData.hireFacilityRoom : undefined,
                                    hireStartDate: isHireOrder ? state.formData.hireStartDate : undefined,
                                    hireReturnDate: isHireOrder ? calculatedReturnDate : undefined,
                                    hireDurationWeeks: isHireOrder ? Number(state.formData.hireDurationWeeks) || 4 : undefined,
                                  });

                                  addCustomer({
                                    name: state.formData.name,
                                    email: state.formData.email,
                                    phone: state.formData.phone || '',
                                    ndisNumber: state.formData.ndisNumber,
                                    address: `${state.formData.address}, ${state.formData.city} ${state.formData.state} ${state.formData.postcode}`,
                                    ordersCount: 1,
                                    totalSpent: state.calculatedTotals.total,
                                  });

                                  setPlacedOrderSummary({
                                    type: isHireOrder ? 'hire_order' : 'order',
                                    isHire: isHireOrder,
                                    orderId: res.order.orderId,
                                    accessToken: res.order.accessToken,
                                    customerName: state.formData.name,
                                    customerEmail: state.formData.email,
                                    total: state.calculatedTotals.total,
                                    trackingNumber: res.order.trackingNumber,
                                    hireStartDate: state.formData.hireStartDate,
                                    hireReturnDate: calculatedReturnDate,
                                    hireDurationWeeks: state.formData.hireDurationWeeks,
                                    hireFacilityName: state.formData.hireFacilityName,
                                  });

                                  // Automatically create and sign in customer account
                                  try {
                                    await autoRegisterFromOrder({
                                      name: state.formData.name,
                                      email: state.formData.email,
                                      phone: state.formData.phone,
                                      address: state.formData.address,
                                      city: state.formData.city,
                                      state: state.formData.state,
                                      postcode: state.formData.postcode,
                                      ndisNumber: state.formData.ndisNumber,
                                      planType: state.formData.planType,
                                      planManager: state.formData.planManagerAgency,
                                      planManagerEmail: state.formData.planManagerEmail,
                                    });
                                  } catch (accErr) {
                                    console.warn('Auto account registration notice:', accErr);
                                  }

                                  setOrderPlaced(true);
                                  if (state.calculatedTotals.promoCode) {
                                    redeemPromo(state.calculatedTotals.promoCode).catch(() => {});
                                  }
                                  clearCart();
                                } else {
                                  throw new Error('Payment capture did not complete.');
                                }
                              } catch (err: any) {
                                setGeneralError(err.message || 'Payment capture failed.');
                              } finally {
                                setIsProcessing(false);
                                setProcessingStep('');
                              }
                            }}
                            onError={(err: any) => {
                              setGeneralError(err?.message || 'PayPal encountered an unexpected error.');
                            }}
                          />
                        </PayPalScriptProvider>
                      </div>) : (<div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                        Online card payment is not configured yet. Please choose the NDIS Quote option above
                        or contact support at admin@atspecialists.com.au to complete your order.
                      </div>)}
                  </div>) : (<div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs text-center">
                    Direct payment is currently paused by store administration.
                  </div>)}
              </div>

              {/* High-Trust Guarantee Badges */}
              <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-3 text-[11px] text-gray-500">
                <div className="flex items-center gap-1.5 font-medium">
                  <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>NDIS Compliant</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Receipt className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  <span>ATO Tax Invoices</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Truck className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                  <span>Australia-Wide Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>);
}

export default CheckoutPage;