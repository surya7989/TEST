import React, { useState, useEffect } from 'react';
import { useAdminStore, type OrderStatus } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import {
  Search,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  ShoppingCart,
  ShoppingBag,
  Package,
  Copy,
  MapPin,
  ArrowLeft,
  Calendar,
  Check,
  CreditCard,
  Building2,
  FileText,
  Printer,
  Receipt,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const statusConfig: Record<OrderStatus, { label: string; color: string; badgeColor: string; icon: React.ElementType }> = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border border-amber-200', badgeColor: 'bg-amber-100 text-amber-800', icon: Clock },
  confirmed: { label: 'Confirmed', color: 'bg-blue-50 text-blue-700 border border-blue-200', badgeColor: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  processing: { label: 'Processing', color: 'bg-violet-50 text-violet-700 border border-violet-200', badgeColor: 'bg-violet-100 text-violet-800', icon: AlertCircle },
  shipped: { label: 'Shipped', color: 'bg-cyan-50 text-cyan-700 border border-cyan-200', badgeColor: 'bg-cyan-100 text-cyan-800', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200', badgeColor: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border border-red-200', badgeColor: 'bg-red-100 text-red-800', icon: XCircle },
};

export function AdminOrders() {
  const { orders, updateOrderStatus, updateOrderTracking } = useAdminStore();
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Sync with top-bar quick search (?search=...) on every navigation
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);

  const filteredOrders = orders.filter((o) => {
    const s = (search || '').toLowerCase();
    const matchesSearch =
      !s ||
      (o.id || '').toLowerCase().includes(s) ||
      (o.customerName || '').toLowerCase().includes(s) ||
      (o.customerEmail || '').toLowerCase().includes(s) ||
      Boolean(o.trackingNumber && o.trackingNumber.toLowerCase().includes(s));
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    const matchesDateFrom = !dateFrom || o.createdAt >= dateFrom;
    const matchesDateTo = !dateTo || o.createdAt <= dateTo;
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const activeOrder = selectedOrderId ? orders.find((o) => o.id === selectedOrderId) : null;
  const totalRevenue = filteredOrders.filter((o) => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.total, 0);

  const openOrderDetail = (orderId: string) => {
    const ord = orders.find((o) => o.id === orderId);
    setSelectedOrderId(orderId);
    setTrackingInput(ord?.trackingNumber || '');
    setViewMode('detail');
  };

  const handleCopyTracking = (code: string) => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // ==========================================
  // VIEW MODE: FULL-PAGE ORDER DETAILS
  // ==========================================
  if (viewMode === 'detail' && activeOrder) {
    const cfg = statusConfig[activeOrder.status];
    const StatusIcon = cfg.icon;
    const rawItems = Array.isArray(activeOrder.items) ? activeOrder.items : [];
    const hireItems = rawItems.filter((i: any) => {
      const pt = (i.purchaseType || i.purchase_type || '').toLowerCase();
      return pt === 'hire';
    });
    const buyItems = rawItems.filter((i: any) => {
      const pt = (i.purchaseType || i.purchase_type || '').toLowerCase();
      return pt !== 'hire';
    });
    const buySubtotal = buyItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const hireSubtotal = hireItems.reduce((sum, i) => sum + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);
    const isMixed = buyItems.length > 0 && hireItems.length > 0;

    const getReturnDate = (createdDate: string, weeks: number) => {
      try {
        const d = new Date(createdDate);
        d.setDate(d.getDate() + weeks * 7);
        return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch {
        return `${weeks} weeks from delivery`;
      }
    };

    return (<div className="space-y-6 pb-12 animate-fade-in">
        {/* Top Header */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-[#147A7A] transition-colors cursor-pointer border border-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#147A7A] uppercase tracking-wider">Order Management</span>
                <span className="text-gray-300">&bull;</span>
                <span className="text-xs text-gray-500 font-medium">{activeOrder.createdAt}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-[#0F1E2E]">{activeOrder.id}</h1>
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold ${cfg.badgeColor}`}>
                  {cfg.label}
                </span>
                <span className="text-xs font-semibold text-slate-600">
                  {isMixed
                    ? `Mixed Order: ${buyItems.reduce((s, i) => s + (i.quantity || 1), 0)} Buy + ${hireItems.reduce((s, i) => s + (i.quantity || 1), 0)} Hire`
                    : hireItems.length > 0
                    ? `Equipment Hire (${hireItems.reduce((s, i) => s + (i.quantity || 1), 0)} items)`
                    : `Outright Purchase (${buyItems.reduce((s, i) => s + (i.quantity || 1), 0)} items)`}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to={`/at/invoices?orderId=${activeOrder.id}`}
              className="px-4 py-2.5 bg-teal-50 hover:bg-teal-100 text-[#147A7A] border border-teal-200 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Open in ATO Tax Invoice Editor &amp; Forward"
            >
              <Receipt className="w-4 h-4" />
              <span>Tax Invoice</span>
            </Link>
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
            <select
              value={activeOrder.status}
              onChange={(e) => updateOrderStatus(activeOrder.id, e.target.value as OrderStatus)}
              className="px-4 py-2.5 bg-[#147A7A] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md cursor-pointer focus:outline-none"
            >
              {Object.entries(statusConfig).map(([k, c]) => (<option key={k} value={k} className="bg-white text-gray-900">
                  Status: {c.label}
                </option>))}
            </select>
          </div>
        </div>

        {/* 2-Column Detail View */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Order Items & Delivery */}
          <div className="lg:col-span-2 space-y-6">

            {/* Fallback summary card when items array is empty */}
            {rawItems.length === 0 && (
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#147A7A]" />
                  <span>Order Items Summary</span>
                </h2>
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Assistive Equipment Order</p>
                    <p className="text-xs text-gray-500 font-mono">Reference: {activeOrder.id}</p>
                  </div>
                  <span className="text-base font-black text-gray-900">{formatCurrency(activeOrder.total)}</span>
                </div>
              </div>
            )}

            {/* 1. OUTRIGHT PURCHASED ITEMS (If any) */}
            {buyItems.length > 0 && (<div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <span>Outright Purchased Equipment ({buyItems.length})</span>
                  </h2>
                  <span className="text-xs font-semibold text-emerald-700">
                    Permanent Ownership / Capital AT
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {buyItems.map((item, idx) => {
                    let extras = (item as any).selectedExtras;
                    if (!extras && typeof (item as any).selected_extras === 'string' && (item as any).selected_extras.startsWith('[')) {
                      try { extras = JSON.parse((item as any).selected_extras); } catch { /* keep raw value on parse failure */ }
                    }
                    const hasExtras = Array.isArray(extras) && extras.length > 0;

                    return (<div key={idx} className="py-3 flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
                          {((item as any).code || (item as any).sku || item.productId || item.id) && (<span className="text-[10px] font-mono font-bold text-[#147A7A] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                              {(item as any).code || (item as any).sku || item.productId || item.id}
                            </span>)}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-semibold text-emerald-700">Qty: {item.quantity}</span> &middot; {formatCurrency(item.price)} each
                          {(item as any).detail ? ` &middot; ${(item as any).detail}` : ''}
                        </p>
                        {hasExtras && (<div className="mt-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-700 space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                            Included Extras:
                          </span>
                          {extras.map((extra: any, eIdx: number) => (
                            <div key={extra.id || eIdx} className="flex items-center gap-1">
                              <span className="text-emerald-600 font-bold">+</span>
                              <span>{extra.name}</span>
                              {extra.price !== undefined && (
                                <span className="font-semibold text-gray-900">(${Number(extra.price).toFixed(2)})</span>
                              )}
                            </div>
                          ))}
                        </div>)}
                      </div>
                      <span className="text-base font-black text-gray-900 pt-0.5">
                        {formatCurrency(item.price * item.quantity)}
                      </span>
                    </div>);
                  })}
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-600">
                  <span>Purchased Subtotal:</span>
                  <span className="text-sm font-black text-gray-900">{formatCurrency(buySubtotal)}</span>
                </div>
              </div>)}

            {/* 2. EQUIPMENT HIRE & RENTAL SCHEDULE (If any) */}
            {hireItems.length > 0 && (<div className="bg-white p-6 rounded-2xl border border-amber-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-amber-100 text-[#D97706] rounded-lg">
                      <Clock className="w-4 h-4" />
                    </div>
                    <span>Equipment Hire & Rental Schedule ({hireItems.length})</span>
                  </h2>
                  <span className="text-xs font-semibold text-amber-700">
                    Clinical Rental / Loan Scheme
                  </span>
                </div>

                <div className="divide-y divide-gray-100">
                  {hireItems.map((item, idx) => {
                    const weeks = item.hireWeeks || 2;
                    const weeklyRate = Math.round(item.price / weeks);
                    const returnDueDate = getReturnDate(activeOrder.createdAt, weeks);
                    let extras = (item as any).selectedExtras;
                    if (!extras && typeof (item as any).selected_extras === 'string' && (item as any).selected_extras.startsWith('[')) {
                      try { extras = JSON.parse((item as any).selected_extras); } catch { /* keep raw value on parse failure */ }
                    }
                    const hasExtras = Array.isArray(extras) && extras.length > 0;

                    return (<div key={idx} className="py-3.5 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-gray-900 text-sm">{item.name}</h3>
                              {((item as any).code || (item as any).sku || item.productId || item.id) && (<span className="text-[10px] font-mono font-bold text-[#147A7A] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                                  {(item as any).code || (item as any).sku || item.productId || item.id}
                                </span>)}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              <span className="font-semibold text-[#D97706]">Qty: {item.quantity}</span> &middot; Weekly Rate: {formatCurrency(weeklyRate)}/week
                              {(item as any).detail ? ` &middot; ${(item as any).detail}` : ''}
                            </p>
                            {hasExtras && (<div className="mt-1.5 p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs text-gray-700 space-y-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">
                                Included Extras:
                              </span>
                              {extras.map((extra: any, eIdx: number) => (
                                <div key={extra.id || eIdx} className="flex items-center gap-1">
                                  <span className="text-emerald-600 font-bold">+</span>
                                  <span>{extra.name}</span>
                                  {extra.price !== undefined && (
                                    <span className="font-semibold text-gray-900">(${Number(extra.price).toFixed(2)})</span>
                                  )}
                                </div>
                              ))}
                            </div>)}
                          </div>
                          <span className="text-base font-black text-gray-900 pt-0.5">
                            {formatCurrency(item.price * item.quantity)}
                          </span>
                        </div>

                        {/* Rental Duration & Return Due Badge */}
                        <div className="flex flex-wrap items-center gap-2 bg-[#FFF8ED] border border-[#FDE5CC] p-2.5 rounded-xl text-xs">
                          <span className="font-bold text-[#D97706]">Duration: {weeks} Weeks</span>
                          <span className="text-gray-300">&bull;</span>
                          <span className="font-semibold text-gray-700">Scheduled Return Due Date: <strong>{returnDueDate}</strong></span>
                        </div>
                      </div>);
                  })}
                </div>

                <div className="bg-amber-50/60 border border-amber-200/70 p-3 rounded-xl text-xs text-gray-600 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Clinical sanitisation AS/NZS 3760 pass certified. Courier pickup will be scheduled before return due date.</span>
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs font-bold text-gray-600">
                  <span>Equipment Hire Subtotal:</span>
                  <span className="text-sm font-black text-gray-900">{formatCurrency(hireSubtotal)}</span>
                </div>
              </div>)}

            {/* 3. COST & SETTLEMENT BREAKDOWN */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-3">
              <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="w-4 h-4 text-[#147A7A]" />
                <span>Financial & Invoice Summary</span>
              </h2>

              <div className="space-y-2 text-sm">
                {buyItems.length > 0 && (<div className="flex justify-between text-gray-600">
                    <span>Outright Purchased Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(buySubtotal)}</span>
                  </div>)}
                {hireItems.length > 0 && (<div className="flex justify-between text-gray-600">
                    <span>Equipment Hire Subtotal</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(hireSubtotal)}</span>
                  </div>)}
                <div className="flex justify-between text-gray-600">
                  <span>Clinical Setup & Delivery</span>
                  <span className="font-bold text-gray-900">
                    {activeOrder.deliveryTotal !== undefined
                      ? (activeOrder.deliveryTotal === 0 ? 'FREE Delivery' : formatCurrency(activeOrder.deliveryTotal))
                      : 'FREE Delivery'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>GST Component</span>
                  <span className="font-semibold text-gray-700">
                    {activeOrder.gstTotal && activeOrder.gstTotal > 0
                      ? `${formatCurrency(activeOrder.gstTotal)} (10% Taxable Items)`
                      : '$0.00 (NDIS Sec 38-45 GST-Free)'}
                  </span>
                </div>
                <div className="flex justify-between text-base font-black text-[#0F1E2E] pt-3 border-t border-gray-100">
                  <span>Grand Total Settled / Invoiced</span>
                  <span className="text-lg text-[#147A7A]">{formatCurrency(activeOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Tracking & Dispatch */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2 border-b border-gray-100 pb-3">
                <Truck className="w-4 h-4 text-[#147A7A]" />
                <span>Courier Tracking & Logistics</span>
              </h2>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  value={trackingInput}
                  onChange={(e) => setTrackingInput(e.target.value)}
                  placeholder="Enter courier consignment number (e.g. AU9876543210)..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                />
                <button
                  type="button"
                  onClick={() => updateOrderTracking(activeOrder.id, trackingInput)}
                  className="px-5 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
                >
                  Save Tracking
                </button>
                {activeOrder.trackingNumber && (<button
                    type="button"
                    onClick={() => handleCopyTracking(activeOrder.trackingNumber || '')}
                    className="p-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors"
                    title="Copy Tracking Number"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>)}
              </div>

              {activeOrder.trackingNumber && (<p className="text-xs text-gray-500 flex items-center gap-1.5 bg-cyan-50 border border-cyan-200 p-3 rounded-xl">
                  <Truck className="w-4 h-4 text-cyan-700" />
                  <span>Active Consignment: <strong>{activeOrder.trackingNumber}</strong> (Australia Post Express)</span>
                </p>)}
            </div>

            {/* Notes */}
            {activeOrder.notes && (<div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl space-y-2">
                <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700" /> Order & Delivery Notes
                </h3>
                <p className="text-xs sm:text-sm text-gray-800 leading-relaxed bg-white p-3.5 rounded-xl border border-amber-200/60">
                  {activeOrder.notes}
                </p>
              </div>)}
          </div>

          {/* RIGHT 1 COLUMN: Customer & Payment Details */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Customer Information</h2>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase block">Name</span>
                  <p className="font-bold text-gray-900 mt-0.5">{activeOrder.customerName}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase block">Email Address</span>
                  <a href={`mailto:${activeOrder.customerEmail}`} className="text-[#147A7A] hover:underline font-medium">
                    {activeOrder.customerEmail}
                  </a>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase block">Delivery Address</span>
                  <p className="text-gray-700 flex items-start gap-1.5 mt-0.5">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{activeOrder.shippingAddress}</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Payment & Invoicing */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-3">Payment & Settlement</h2>

              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Payment Status</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${activeOrder.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {activeOrder.paymentStatus.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Payment Method</span>
                  <span className="font-semibold text-gray-900 text-right truncate max-w-[180px]" title={activeOrder.paymentMethod}>
                    {activeOrder.paymentMethod || 'Credit Card / NDIS'}
                  </span>
                </div>
                {activeOrder.transactionId && (<div className="flex items-center justify-between">
                    <span className="text-gray-500">Transaction ID</span>
                    <span className="font-mono text-xs text-gray-700 font-medium truncate max-w-[180px]" title={activeOrder.transactionId}>
                      {activeOrder.transactionId}
                    </span>
                  </div>)}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Total Charged</span>
                  <span className="text-lg font-semibold font-mono text-slate-900">{formatCurrency(activeOrder.total)}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <Link
                  to={`/at/invoices?orderId=${activeOrder.id}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-[#147A7A] hover:bg-[#106262] text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Open in Invoices &amp; Email Studio &rarr;</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>);
  }

  // ==========================================
  // VIEW MODE: DEFAULT ORDERS TABLE
  // ==========================================
  return (<div className="space-y-6 animate-fade-in font-sans text-slate-700">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-teal-50 text-[#147A7A] border border-teal-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Sales Hub
            </span>
            <span className="text-slate-400 text-xs">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">Order Management &amp; Dispatch</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Customer Orders</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {orders.length} total orders &middot; {formatCurrency(totalRevenue)} settled revenue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/at/analytics"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            <span>Revenue Analytics</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Status Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(statusConfig).map(([key, config]) => {
          const count = orders.filter((o) => o.status === key).length;
          const Icon = config.icon;
          return (<button
              key={key}
              onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer shadow-xs ${
                statusFilter === key
                  ? 'border-[#147A7A] bg-[#147A7A]/5 ring-1 ring-[#147A7A]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-[#147A7A]" />
                <span className="text-xs font-medium text-slate-600">{config.label}</span>
              </div>
              <span className="text-xl font-semibold font-mono text-slate-900">{count}</span>
            </button>);
        })}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order ID, customer name, email or tracking #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A] bg-white text-[#0F1E2E]"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white"
            />
            <span className="text-gray-400 text-xs hidden sm:inline">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="border border-gray-300 rounded-xl px-3 py-2 text-xs sm:text-sm bg-white"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Order ID
                </th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden sm:table-cell">
                  Customer
                </th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden md:table-cell">
                  Type
                </th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Total (AUD)
                </th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                  Payment
                </th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-3 sm:px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider hidden lg:table-cell">
                  Date
                </th>
                <th className="text-right px-3 sm:px-6 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (<tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-900 font-semibold text-base">No orders found matching your filters</p>
                  </td>
                </tr>) : (filteredOrders.map((o) => {
                  const cfg = statusConfig[o.status];
                  const buyCount = o.items.filter((i) => i.purchaseType === 'buy').length;
                  const hireCount = o.items.filter((i) => i.purchaseType === 'hire').length;
                  const isMixed = buyCount > 0 && hireCount > 0;

                  return (<tr key={o.id} className="hover:bg-teal-50/30 transition-colors">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => openOrderDetail(o.id)}
                          className="font-bold text-slate-900 hover:text-[#147A7A] text-left cursor-pointer flex items-center gap-1.5 transition-colors font-mono text-sm"
                        >
                          <span>{o.id}</span>
                        </button>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {(() => {
                            const totalQty = o.items.reduce((s: number, it: any) => s + (Number(it.quantity) || 1), 0);
                            return `${totalQty} ${totalQty === 1 ? 'item' : 'items'}${o.items.length > 1 && o.items.length !== totalQty ? ` (${o.items.length} products)` : ''}`;
                          })()}
                        </p>
                      </td>
                      <td className="px-3 sm:px-6 py-4 hidden sm:table-cell">
                        <p className="font-semibold text-slate-900 text-sm">{o.customerName}</p>
                        <p className="text-xs text-slate-500 font-mono font-medium">{o.customerEmail}</p>
                      </td>
                      <td className="px-3 sm:px-6 py-4 hidden md:table-cell whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                          isMixed ? 'text-purple-700' : hireCount > 0 ? 'text-amber-800' : 'text-emerald-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            isMixed ? 'bg-purple-600' : hireCount > 0 ? 'bg-amber-600' : 'bg-emerald-600'
                          }`}></span>
                          {isMixed
                            ? `Mixed (${buyCount} Buy + ${hireCount} Hire)`
                            : hireCount > 0
                            ? `Hire (${hireCount} ${hireCount === 1 ? 'item' : 'items'})`
                            : `Buy (${buyCount} ${buyCount === 1 ? 'item' : 'items'})`}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 font-bold font-mono text-slate-900 text-sm whitespace-nowrap">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="px-3 sm:px-6 py-4 hidden lg:table-cell whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase ${
                          o.paymentStatus === 'paid' ? 'text-emerald-700' : 'text-amber-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${o.paymentStatus === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          {o.paymentStatus}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <select
                          value={o.status}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 transition-all ${cfg.color}`}
                        >
                          {Object.entries(statusConfig).map(([k, c]) => (<option key={k} value={k} className="bg-white text-gray-900 font-medium">
                              {c.label}
                            </option>))}
                        </select>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-gray-500 text-xs hidden lg:table-cell whitespace-nowrap font-mono">
                        {o.createdAt}
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => openOrderDetail(o.id)}
                          className="p-2 rounded-xl hover:bg-teal-50 text-gray-400 hover:text-[#147A7A] transition-colors cursor-pointer border border-transparent hover:border-teal-200"
                          title="View Full Order Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>);
                }))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}

export default AdminOrders;
