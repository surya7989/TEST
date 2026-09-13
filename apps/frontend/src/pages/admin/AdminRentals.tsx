import React, { useState } from 'react';
import { useAdminStore, type OrderStatus } from '@/store/adminStore';
import { formatCurrency, estimateWeeklyHireRate } from '@/lib/utils';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  DollarSign,
  Search,
  Filter,
  User,
  Package,
  ArrowUpRight,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Truck,
  ShieldCheck,
  Check,
  Building2,
  FileCheck2,
  Plus,
  Edit3,
  Save,
  FileText,
  Send,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

export function AdminRentals() {
  const { orders, ndisQuotes, convertNdisQuoteToOrder, updateNdisQuote, updateOrderStatus } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'active' | 'completed' | 'due-soon'>('all');
  const [selectedRentalId, setSelectedRentalId] = useState<string | null>(null);

  // Notification Toast State
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4500);
  };

  // Quick Edit Modal State for Hire Invoices & Quotes
  const [quickEditQuote, setQuickEditQuote] = useState<any | null>(null);
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);

  // 1. EXTRACT PENDING HIRE QUOTE REQUESTS & INVOICES (from ndisQuotes)
  const pendingHireQuotes = ndisQuotes
    .filter((q) => {
      const isHire =
        q.quoteType === 'hire' ||
        q.id.toUpperCase().startsWith('HIR') ||
        (Array.isArray(q.items) &&
          q.items.some((it: any) => it.isRental || it.type === 'hire' || (it.purchaseType || '').toLowerCase() === 'hire'));
      // Only include pending/sent/draft quotes that have not been converted to approved orders yet
      return isHire && q.status !== 'approved';
    })
    .map((q) => {
      const firstItem: any = (q.items && q.items[0]) || {};
      const weeklyRate =
        Number(firstItem.weeklyRate || firstItem.weekly_rate || 0) ||
        estimateWeeklyHireRate(Number(firstItem.price || firstItem.amount || 0));
      const hireWeeks = Number((q as any).hireWeeks || (q as any).hireDurationWeeks || firstItem.hireWeeks || 4);
      const totalHireCost = Number(q.total || (q as any).subtotal || weeklyRate * hireWeeks);
      const hireStartDate = (q as any).hireStartDate || (q.createdAt ? q.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);

      const orderDate = new Date(hireStartDate);
      const dueDate = new Date(orderDate);
      dueDate.setDate(dueDate.getDate() + hireWeeks * 7);
      const returnDueDate = (q as any).hireReturnDate || dueDate.toISOString().split('T')[0];

      return {
        recordType: 'quote' as const,
        rentalId: q.id,
        orderId: q.id,
        orderStatus: 'pending' as OrderStatus,
        paymentStatus: 'pending' as const,
        customerName: q.customerName || (q as any).participantName || 'Hire Inquirer',
        customerEmail: q.customerEmail || (q as any).participantEmail || '',
        customerPhone: q.customerPhone || (q as any).participantPhone || '',
        shippingAddress: q.shippingAddress || (q as any).address || '',
        trackingNumber: undefined,
        productId: firstItem.productId || firstItem.code || firstItem.sku || 'HIRE-EQ',
        productName: firstItem.name || 'Assistive Technology Hire Equipment',
        items: q.items || [],
        quantity: Number(firstItem.quantity || 1),
        weeklyRate,
        hireWeeks,
        totalHireCost,
        hireStartDate,
        returnDueDate,
        daysRemaining: hireWeeks * 7,
        rentalStatus: 'pending' as const,
        notes: q.notes || '',
        hireLocationType: (q as any).hireLocationType,
        hireFacilityName: (q as any).hireFacilityName,
        hireFacilityWard: (q as any).hireFacilityWard,
        hireFacilityRoom: (q as any).hireFacilityRoom,
        hireDischargeDate: (q as any).hireDischargeDate,
        rawQuote: q,
      };
    });

  // 2. EXTRACT ACTIVE & COMPLETED RENTALS (from confirmed/paid orders)
  const activeRentalOrders = orders.flatMap((order) => {
    return (order.items || [])
      .filter((item) => (item.purchaseType || (item as any).purchase_type || '').toLowerCase() === 'hire')
      .map((item, idx) => {
        const hireWeeks = order.hireDurationWeeks ? Number(order.hireDurationWeeks) : (item.hireWeeks || 4);
        const weeklyRate = (item as any).weeklyRate || estimateWeeklyHireRate(item.price);
        const totalHireCost = weeklyRate * hireWeeks * (item.quantity || 1);

        const hireStartDate = order.hireStartDate || (order.createdAt ? order.createdAt.split('T')[0] : '2026-03-01');
        let returnDueDate = order.hireReturnDate;
        if (!returnDueDate) {
          const orderDate = new Date(hireStartDate);
          const dueDate = new Date(orderDate);
          dueDate.setDate(dueDate.getDate() + hireWeeks * 7);
          returnDueDate = dueDate.toISOString().split('T')[0];
        }

        const now = new Date();
        const returnDateObj = new Date(returnDueDate);
        const diffDays = Math.ceil((returnDateObj.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        let rentalStatus: 'active' | 'completed' | 'due-soon' = 'active';
        if (order.status === 'delivered') {
          if (diffDays <= 7) {
            rentalStatus = 'due-soon';
          }
        } else if (order.status === 'cancelled') {
          rentalStatus = 'completed';
        }

        return {
          recordType: 'order' as const,
          rentalId: `${order.id}-H${idx + 1}`,
          orderId: order.id,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          shippingAddress: order.shippingAddress,
          trackingNumber: order.trackingNumber,
          productId: item.productId,
          productName: item.name,
          items: [item],
          quantity: item.quantity,
          weeklyRate,
          hireWeeks,
          totalHireCost,
          hireStartDate,
          returnDueDate,
          daysRemaining: diffDays,
          rentalStatus,
          notes: order.notes,
          hireLocationType: order.hireLocationType,
          hireFacilityName: order.hireFacilityName,
          hireFacilityWard: order.hireFacilityWard,
          hireFacilityRoom: order.hireFacilityRoom,
          hireDischargeDate: order.hireDischargeDate,
          rawQuote: undefined,
        };
      });
  });

  // COMBINED HIRE RECORDS LIST
  const allHireRecords = [...pendingHireQuotes, ...activeRentalOrders];

  // Calculate rental dashboard metrics
  const stats = {
    totalRecords: allHireRecords.length,
    pendingQuotesCount: pendingHireQuotes.length,
    activeRentalsCount: activeRentalOrders.filter((r) => r.rentalStatus === 'active' || r.rentalStatus === 'due-soon').length,
    totalWeeklyIncome: activeRentalOrders.reduce((sum, r) => sum + r.weeklyRate * r.quantity, 0),
    totalGrossRentalRevenue: allHireRecords.reduce((sum, r) => sum + r.totalHireCost, 0),
    dueSoonCount: activeRentalOrders.filter((r) => r.rentalStatus === 'due-soon').length,
    completedCount: activeRentalOrders.filter((r) => r.rentalStatus === 'completed').length,
  };

  // Filter rentals by search & status
  const filteredRentals = allHireRecords.filter((r) => {
    const s = searchTerm.toLowerCase();
    const matchesSearch =
      !s ||
      r.customerName.toLowerCase().includes(s) ||
      r.orderId.toLowerCase().includes(s) ||
      r.productName.toLowerCase().includes(s) ||
      r.rentalId.toLowerCase().includes(s) ||
      (r.shippingAddress || '').toLowerCase().includes(s) ||
      (r.hireFacilityName || '').toLowerCase().includes(s);

    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'pending' && r.rentalStatus === 'pending') ||
      (filterStatus === 'active' && (r.rentalStatus === 'active' || r.rentalStatus === 'due-soon')) ||
      (filterStatus === 'due-soon' && r.rentalStatus === 'due-soon') ||
      (filterStatus === 'completed' && r.rentalStatus === 'completed');

    return matchesSearch && matchesStatus;
  });

  const selectedRental = allHireRecords.find((r) => r.rentalId === selectedRentalId) || allHireRecords[0];

  // ACTION: CONFIRM PAYMENT & ACTIVATE RENTAL
  const handleConfirmPaymentAndActivate = (quoteId: string) => {
    setConvertingQuoteId(quoteId);
    try {
      const order = convertNdisQuoteToOrder(quoteId, {
        paymentMethod: 'Credit Card / Direct Bank Transfer',
        status: 'processing',
      });
      if (order) {
        showNotice(
          `Payment confirmed for ${quoteId}! Converted to active order #${order.id} and added to ongoing rental schedule. Now viewable in Orders page.`,
          'success'
        );
      }
    } catch (err: any) {
      showNotice(err.message || 'Failed to convert hire quote', 'error');
    } finally {
      setConvertingQuoteId(null);
      setQuickEditQuote(null);
    }
  };

  // ACTION: SAVE QUICK EDIT FOR HIRE QUOTE
  const handleSaveQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEditQuote) return;
    updateNdisQuote(quickEditQuote);
    showNotice(`Hire agreement changes saved for quote ${quickEditQuote.id}`, 'success');
    setQuickEditQuote(null);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in font-sans text-slate-700">
      {/* NOTIFICATION TOAST */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold transition-all border ${
            notification.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-red-900 text-white border-red-700'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-50 text-amber-900 border border-amber-200">
              Session 2: Equipment Hire &amp; Rental Operations
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-[#147A7A] border border-teal-200">
              Sanitized Fleet &bull; Hospital Inpatient &bull; NDIS Hire
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Equipment Hire &amp; Rental Operations</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 max-w-2xl">
            Manage incoming hire requests, dispatch hire invoices, confirm payments, and track sanitized equipment rental schedules with automated return due dates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/at/invoices?tab=workflow&topic=hire"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Hire Invoice</span>
          </Link>
          <Link
            to="/at/orders"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <Package className="w-4 h-4 text-slate-500" />
            <span>All Store Orders (Paid)</span>
          </Link>
        </div>
      </div>

      {/* 2. RENTAL KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Records */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Hire Fleet</span>
            <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-slate-900">{stats.totalRecords} Records</p>
          <p className="text-[11px] text-slate-500 font-medium">Inquiries &amp; active contracts</p>
        </div>

        {/* Pending Requests & Invoices */}
        <div
          onClick={() => setFilterStatus('pending')}
          className={`bg-white rounded-2xl border p-4 shadow-xs space-y-1.5 cursor-pointer transition-all ${
            filterStatus === 'pending' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200/80 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider">Pending Hire Invoices</span>
            <div className="p-2 bg-amber-50 text-amber-800 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-amber-800">{stats.pendingQuotesCount} Pending</p>
          <p className="text-[11px] text-amber-700 font-semibold">
            {stats.pendingQuotesCount > 0 ? 'Action: Review & confirm payment' : 'All hire invoices confirmed'}
          </p>
        </div>

        {/* Active Hired Equipment */}
        <div
          onClick={() => setFilterStatus('active')}
          className={`bg-white rounded-2xl border p-4 shadow-xs space-y-1.5 cursor-pointer transition-all ${
            filterStatus === 'active' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200/80 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Active on Hire</span>
            <div className="p-2 bg-emerald-50 text-emerald-800 rounded-xl">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-emerald-800">{stats.activeRentalsCount} Units</p>
          <p className="text-[11px] text-slate-500 font-medium">Currently deployed with clients</p>
        </div>

        {/* Weekly Recurring Income */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#147A7A] uppercase tracking-wider">Weekly Hire Income</span>
            <div className="p-2 bg-teal-50 text-[#147A7A] rounded-xl">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-[#147A7A]">{formatCurrency(stats.totalWeeklyIncome)}/wk</p>
          <p className="text-[11px] text-slate-500 font-medium">Recurring rental rate</p>
        </div>

        {/* Returns Due */}
        <div
          onClick={() => setFilterStatus('due-soon')}
          className={`bg-white rounded-2xl border p-4 shadow-xs space-y-1.5 cursor-pointer transition-all ${
            filterStatus === 'due-soon' ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200/80 hover:border-red-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-red-800 uppercase tracking-wider">Returns Due (&le;7d)</span>
            <div className="p-2 bg-red-50 text-red-700 rounded-xl">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black font-mono text-red-800">{stats.dueSoonCount} Due</p>
          <p className="text-[11px] text-slate-500 font-medium">Check renewal or return</p>
        </div>
      </div>

      {/* 3. SEARCH, FILTERS & RENTAL ROSTER */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
        {/* Search and Tabs Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3.5 border-b border-slate-100 pb-4">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by customer, hire ref, equipment, or facility..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            {[
              { id: 'all', label: `All Records (${allHireRecords.length})` },
              { id: 'pending', label: `Pending Invoices (${stats.pendingQuotesCount})`, highlight: stats.pendingQuotesCount > 0 },
              { id: 'active', label: `Active Fleet (${stats.activeRentalsCount})` },
              { id: 'due-soon', label: `Due Soon (${stats.dueSoonCount})` },
              { id: 'completed', label: `Completed (${stats.completedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : tab.highlight
                    ? 'text-amber-800 hover:text-amber-900 bg-amber-100/60'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rentals Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                <th className="py-3 px-4">Hire Ref #</th>
                <th className="py-3 px-4">Customer &amp; Handover Address</th>
                <th className="py-3 px-4">Equipment Description</th>
                <th className="py-3 px-4">Hire Schedule</th>
                <th className="py-3 px-4">Rate &amp; Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRentals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Truck className="w-10 h-10 mx-auto mb-2.5 text-slate-300" />
                    <p className="font-bold text-slate-800 text-sm">No hire records found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      When customers submit hire requests or book rentals online, they appear here.
                    </p>
                    <div className="mt-3">
                      <Link
                        to="/at/invoices?tab=workflow&topic=hire"
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Create First Hire Agreement</span>
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRentals.map((rental) => {
                  const isPending = rental.recordType === 'quote';

                  return (
                    <tr
                      key={rental.rentalId}
                      className="hover:bg-amber-50/20 transition-colors cursor-pointer"
                      onClick={() => setSelectedRentalId(rental.rentalId)}
                    >
                      {/* Ref */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[#0F766E]">{rental.rentalId}</span>
                        </div>
                        <span className="block text-[10px] text-slate-500 font-mono font-medium mt-0.5">
                          {rental.recordType === 'quote' ? 'Quote Request' : `Paid Order: ${rental.orderId}`}
                        </span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4 font-normal text-slate-800">
                        <div className="font-bold text-slate-900">{rental.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">{rental.customerEmail || rental.customerPhone || 'No contact'}</div>

                        {/* Hospital Facility Badge */}
                        {rental.hireFacilityName ? (
                          <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200">
                            <span>🏥 {rental.hireFacilityName}</span>
                            {rental.hireFacilityWard && <span>(Ward: {rental.hireFacilityWard})</span>}
                            {rental.hireFacilityRoom && <span>(Rm: {rental.hireFacilityRoom})</span>}
                          </div>
                        ) : rental.shippingAddress ? (
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px] mt-0.5">
                            📍 {rental.shippingAddress}
                          </div>
                        ) : null}
                      </td>

                      {/* Equipment */}
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 truncate max-w-[220px]">{rental.productName}</p>
                        <p className="text-[11px] text-slate-500 font-medium">
                          Qty: <span>{rental.quantity}x</span> &bull; Tenure: <span>{rental.hireWeeks} Weeks (Min)</span>
                        </p>
                      </td>

                      {/* Schedule */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{rental.hireStartDate} &rarr; {rental.returnDueDate}</span>
                        </div>
                        <div className="text-[11px] font-bold font-mono mt-0.5">
                          {isPending ? (
                            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              Awaiting Payment Confirmation
                            </span>
                          ) : (
                            <span className="text-[#147A7A]">
                              {rental.hireWeeks} Wks ({rental.daysRemaining > 0 ? `${rental.daysRemaining} days remaining` : 'Due / Expired'})
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rate & Total */}
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <div className="text-amber-800">{formatCurrency(rental.weeklyRate)}/wk</div>
                        <div className="text-[11px] text-slate-500 font-semibold">Total: {formatCurrency(rental.totalHireCost)}</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Invoice</span>
                          </span>
                        ) : rental.rentalStatus === 'due-soon' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-800 border border-red-200">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span>Due for Return</span>
                          </span>
                        ) : rental.rentalStatus === 'active' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active Rental</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Check className="w-3 h-3 text-slate-500" />
                            <span>Returned / Complete</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If pending quote: offer Confirm Payment & Activate */}
                          {isPending && rental.rawQuote && (
                            <>
                              <button
                                type="button"
                                title="Confirm Customer Payment & Move to Orders"
                                onClick={() => handleConfirmPaymentAndActivate(rental.rawQuote.id)}
                                disabled={convertingQuoteId === rental.rawQuote.id}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirm Payment &amp; Activate</span>
                              </button>

                              <button
                                type="button"
                                title="Edit Line Items, Pricing & Notes"
                                onClick={() => setQuickEditQuote({ ...rental.rawQuote })}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </>
                          )}

                          {/* View Agreement */}
                          <Link
                            to={`/view/${rental.orderId}`}
                            target="_blank"
                            title="View Formal Verified Hire Agreement & Schedule"
                            className="p-1.5 bg-teal-50 hover:bg-teal-100 text-[#147A7A] rounded-lg text-xs font-bold transition-all"
                          >
                            <FileCheck2 className="w-4 h-4" />
                          </Link>

                          {/* Detail Drawer */}
                          <button
                            type="button"
                            onClick={() => setSelectedRentalId(rental.rentalId)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-[#147A7A] hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                          >
                            Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. QUICK EDIT MODAL FOR HIRE INVOICE & QUOTE */}
      {quickEditQuote && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  Quick Edit Hire Agreement &amp; Invoice
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  Hire Ref #{quickEditQuote.id}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQuickEditQuote(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-4 text-xs">
              {/* Customer details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Customer / Hirer Name *</label>
                  <input
                    type="text"
                    value={quickEditQuote.customerName || ''}
                    onChange={(e) => setQuickEditQuote({ ...quickEditQuote, customerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={quickEditQuote.customerEmail || ''}
                    onChange={(e) => setQuickEditQuote({ ...quickEditQuote, customerEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={quickEditQuote.customerPhone || ''}
                    onChange={(e) => setQuickEditQuote({ ...quickEditQuote, customerPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Delivery / Handover Address</label>
                  <input
                    type="text"
                    value={quickEditQuote.shippingAddress || quickEditQuote.address || ''}
                    onChange={(e) => setQuickEditQuote({ ...quickEditQuote, shippingAddress: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Hospital Inpatient section */}
              <div className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2.5">
                <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
                  🏥 Hospital / Inpatient Handover Facility (Optional)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Facility / Hospital Name</label>
                    <input
                      type="text"
                      value={quickEditQuote.hireFacilityName || ''}
                      onChange={(e) => setQuickEditQuote({ ...quickEditQuote, hireFacilityName: e.target.value })}
                      placeholder="e.g. Royal Melbourne Hospital"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Ward</label>
                    <input
                      type="text"
                      value={quickEditQuote.hireFacilityWard || ''}
                      onChange={(e) => setQuickEditQuote({ ...quickEditQuote, hireFacilityWard: e.target.value })}
                      placeholder="Ward 4B"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Room / Bed</label>
                    <input
                      type="text"
                      value={quickEditQuote.hireFacilityRoom || ''}
                      onChange={(e) => setQuickEditQuote({ ...quickEditQuote, hireFacilityRoom: e.target.value })}
                      placeholder="Room 12"
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Hired Assistive Equipment Items</span>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {(quickEditQuote.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-12 gap-2 items-center text-xs">
                      <div className="col-span-5">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Item Name</label>
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => {
                            const newItems = [...quickEditQuote.items];
                            newItems[idx] = { ...item, name: e.target.value };
                            setQuickEditQuote({ ...quickEditQuote, items: newItems });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Weekly Rate ($)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.weeklyRate || item.price || 0}
                          onChange={(e) => {
                            const newItems = [...quickEditQuote.items];
                            newItems[idx] = { ...item, weeklyRate: parseFloat(e.target.value) || 0, price: parseFloat(e.target.value) || 0 };
                            const subtotal = newItems.reduce((s, it) => s + (Number(it.weeklyRate || it.price) * (Number(it.hireWeeks || 4)) * (Number(it.quantity || 1))), 0);
                            setQuickEditQuote({ ...quickEditQuote, items: newItems, subtotal, total: subtotal + Number(quickEditQuote.deliveryFee || 0) });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-mono font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Weeks</label>
                        <input
                          type="number"
                          value={item.hireWeeks || quickEditQuote.hireWeeks || 4}
                          onChange={(e) => {
                            const newItems = [...quickEditQuote.items];
                            newItems[idx] = { ...item, hireWeeks: parseInt(e.target.value) || 1 };
                            const subtotal = newItems.reduce((s, it) => s + (Number(it.weeklyRate || it.price) * (Number(it.hireWeeks || 4)) * (Number(it.quantity || 1))), 0);
                            setQuickEditQuote({ ...quickEditQuote, items: newItems, subtotal, total: subtotal + Number(quickEditQuote.deliveryFee || 0) });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Qty</label>
                        <input
                          type="number"
                          value={item.quantity || 1}
                          onChange={(e) => {
                            const newItems = [...quickEditQuote.items];
                            newItems[idx] = { ...item, quantity: parseInt(e.target.value) || 1 };
                            const subtotal = newItems.reduce((s, it) => s + (Number(it.weeklyRate || it.price) * (Number(it.hireWeeks || 4)) * (Number(it.quantity || 1))), 0);
                            setQuickEditQuote({ ...quickEditQuote, items: newItems, subtotal, total: subtotal + Number(quickEditQuote.deliveryFee || 0) });
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery Fee & Total */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Sanitization &amp; Delivery Fee ($ AUD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={quickEditQuote.deliveryFee || 0}
                    onChange={(e) => {
                      const deliveryFee = parseFloat(e.target.value) || 0;
                      setQuickEditQuote({ ...quickEditQuote, deliveryFee, total: Number(quickEditQuote.subtotal || 0) + deliveryFee });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Total Contracted Hire Cost ($ AUD)</label>
                  <div className="px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs font-mono font-black text-amber-900">
                    {formatCurrency(quickEditQuote.total || 0)} AUD
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleConfirmPaymentAndActivate(quickEditQuote.id)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Payment &amp; Move to Orders</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickEditQuote(null)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save Changes</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. RENTAL DETAIL DRAWER / POPUP */}
      {selectedRental && selectedRentalId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                  Equipment Hire Agreement &amp; Rental Schedule
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">Hire Ref #{selectedRental.rentalId}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRentalId(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs sm:text-sm">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Equipment Details</span>
                <p className="font-bold text-slate-900 text-sm sm:text-base">{selectedRental.productName}</p>
                <div className="grid grid-cols-2 gap-2 text-slate-600 pt-1">
                  <div>Quantity: <span className="text-slate-900 font-bold">{selectedRental.quantity}x</span></div>
                  <div>Weekly Rate: <span className="text-slate-900 font-bold">{formatCurrency(selectedRental.weeklyRate)}/wk</span></div>
                  <div>Initial Tenure: <span className="text-slate-900 font-bold">{selectedRental.hireWeeks} Weeks (Min)</span></div>
                  <div>Total Initial Cost: <span className="text-slate-900 font-bold">{formatCurrency(selectedRental.totalHireCost)}</span></div>
                </div>
              </div>

              <div className="bg-teal-50/50 p-4 rounded-2xl border border-teal-200 space-y-2">
                <span className="text-[10px] font-bold uppercase text-[#147A7A] tracking-wider">Hire Schedule &amp; Return</span>
                <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                  <div>Start Date: <span className="font-bold text-slate-900">{selectedRental.hireStartDate}</span></div>
                  <div>Return Due: <span className="font-bold text-slate-900">{selectedRental.returnDueDate}</span></div>
                  <div>Remaining: <span className="text-[#147A7A] font-bold">{selectedRental.daysRemaining} Days</span></div>
                  <div>Status: <span className="capitalize font-bold">{selectedRental.rentalStatus}</span></div>
                </div>
              </div>

              {/* Hospital Delivery Details if applicable */}
              {selectedRental.hireFacilityName && (
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-1.5 text-amber-950">
                  <span className="text-[10px] font-bold uppercase text-amber-800 tracking-wider">Hospital Inpatient Delivery</span>
                  <p className="font-bold text-amber-950">{selectedRental.hireFacilityName}</p>
                  <p className="text-xs text-amber-900">
                    Ward: <strong>{selectedRental.hireFacilityWard || '-'}</strong> &bull; Bed/Room: <strong>{selectedRental.hireFacilityRoom || '-'}</strong>
                    {selectedRental.hireDischargeDate && <span> &bull; Expected Discharge: <strong>{selectedRental.hireDischargeDate}</strong></span>}
                  </p>
                </div>
              )}

              {/* Rehab Hire 100% Rebate Guarantee */}
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200 text-xs text-amber-900">
                ⭐ <strong>Rehab Hire 100% Purchase Credit:</strong> 100% of hire fees paid (up to 4 weeks) credited toward outright purchase if purchased during rental.
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Customer Contact</span>
                <p className="font-bold text-slate-900">{selectedRental.customerName}</p>
                <p className="text-slate-600">{selectedRental.customerEmail || selectedRental.customerPhone || 'No contact specified'}</p>
                <p className="text-slate-500 text-xs">{selectedRental.shippingAddress || '88 Holmes Road, Moonee Ponds VIC 3039'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRentalId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
              <Link
                to={`/view/${selectedRental.orderId}`}
                target="_blank"
                className="px-4 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
              >
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>View Formal Agreement</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRentals;
