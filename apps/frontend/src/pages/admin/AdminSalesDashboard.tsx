import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  FileText,
  Clock,
  Receipt,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Truck,
  ArrowUpRight,
  Plus,
  ArrowRight,
  Filter,
  Eye,
  Calendar,
} from 'lucide-react';

export function AdminSalesDashboard() {
  const navigate = useNavigate();
  const { orders, ndisQuotes } = useAdminStore();

  const stats = useMemo(() => {
    const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = orders.filter((o) => o.status === 'pending');
    const processingOrders = orders.filter((o) => o.status === 'processing');
    const shippedOrders = orders.filter((o) => o.status === 'shipped');
    const deliveredOrders = orders.filter((o) => o.status === 'delivered');

    const hireOrders = orders.filter((o) => o.items.some((i) => i.purchaseType === 'hire'));
    const hireRevenue = hireOrders.reduce((sum, o) => {
      const hireItems = o.items.filter((i) => i.purchaseType === 'hire');
      return sum + hireItems.reduce((sub, itm) => sub + itm.price * itm.quantity, 0);
    }, 0);

    const activeQuotes = ndisQuotes.filter((q) => q.status === 'sent' || q.status === 'draft');
    const totalQuotesValue = ndisQuotes.reduce((sum, q) => sum + (q.total || 0), 0);

    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

    return {
      totalRevenue,
      totalOrdersCount: orders.length,
      paidOrdersCount: paidOrders.length,
      pendingCount: pendingOrders.length,
      processingCount: processingOrders.length,
      shippedCount: shippedOrders.length,
      deliveredCount: deliveredOrders.length,
      hireOrdersCount: hireOrders.length,
      hireRevenue,
      activeQuotesCount: activeQuotes.length,
      totalQuotesValue,
      avgOrderValue,
    };
  }, [orders, ndisQuotes]);

  const recentOrders = orders.slice(0, 6);

  return (<div className="space-y-6 font-sans text-slate-700 animate-fade-in">
      {/* 1. TOP HEADER */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-teal-50 text-[#147A7A] border border-teal-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Topic Hub
            </span>
            <span className="text-slate-400 text-xs">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">Sales, Orders, Quotes &amp; Billing</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Sales Dashboard</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Monitor revenue streams, order fulfillment, NDIS quote pipeline, and rental subscriptions
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/at/orders"
            className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>View All Orders</span>
          </Link>
          <Link
            to="/at/invoices"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            <Receipt className="w-4 h-4 text-slate-500" />
            <span>Invoices Studio</span>
          </Link>
        </div>
      </div>

      {/* 3. SALES METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Settled Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</span>
            <p className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{stats.paidOrdersCount} fully settled transactions</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Orders</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalOrdersCount}</span>
            <p className="text-xs text-slate-500 font-medium mt-1">
              <span className="text-amber-600 font-bold">{stats.pendingCount} pending</span> &middot; {stats.shippedCount} in transit
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">NDIS Quotes Pipeline</span>
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{formatCurrency(stats.totalQuotesValue)}</span>
            <p className="text-xs text-violet-600 font-medium mt-1">
              {stats.activeQuotesCount} active clinical equipment quotes
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Hire &amp; Rental Revenue</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{formatCurrency(stats.hireRevenue)}</span>
            <p className="text-xs text-amber-700 font-medium mt-1">
              {stats.hireOrdersCount} active hire bookings &middot; Avg {formatCurrency(stats.avgOrderValue)}
            </p>
          </div>
        </div>
      </div>

      {/* 4. ORDER FULFILLMENT PIPELINE */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Order Fulfillment Pipeline</span>
          <span className="text-xs font-normal text-slate-500">Live order status progression</span>
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-amber-800 uppercase">Pending Approval</span>
              <AlertCircle className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-2xl font-bold text-amber-900 font-mono">{stats.pendingCount}</span>
            <p className="text-[11px] text-amber-700 mt-1">Awaiting clinical or payment check</p>
          </div>

          <div className="p-4 rounded-xl bg-violet-50 border border-violet-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-violet-800 uppercase">Processing</span>
              <Clock className="w-4 h-4 text-violet-600" />
            </div>
            <span className="text-2xl font-bold text-violet-900 font-mono">{stats.processingCount}</span>
            <p className="text-[11px] text-violet-700 mt-1">Warehouse picking &amp; assembly</p>
          </div>

          <div className="p-4 rounded-xl bg-cyan-50 border border-cyan-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-cyan-800 uppercase">Shipped &amp; In Transit</span>
              <Truck className="w-4 h-4 text-cyan-600" />
            </div>
            <span className="text-2xl font-bold text-cyan-900 font-mono">{stats.shippedCount}</span>
            <p className="text-[11px] text-cyan-700 mt-1">With courier / freight partner</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-emerald-800 uppercase">Delivered &amp; Complete</span>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold text-emerald-900 font-mono">{stats.deliveredCount}</span>
            <p className="text-[11px] text-emerald-700 mt-1">Successfully handed over</p>
          </div>
        </div>
      </div>

      {/* 5. RECENT SALES & ORDERS STREAM */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Sales Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest customer checkouts and hire reservations</p>
          </div>
          <Link
            to="/at/orders"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147A7A] hover:underline"
          >
            <span>View All ({orders.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="text-left px-5 py-3">Order ID</th>
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-5 py-3">Type</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-left px-5 py-3">Payment</th>
                <th className="text-left px-5 py-3">Fulfillment</th>
                <th className="text-right px-5 py-3">Total (AUD)</th>
                <th className="text-center px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentOrders.map((ord) => {
                const hasHire = ord.items.some((i) => i.purchaseType === 'hire');
                const hasBuy = ord.items.some((i) => i.purchaseType === 'buy');
                const isPaid = ord.paymentStatus === 'paid';

                return (<tr key={ord.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900 font-mono text-xs">
                      {ord.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900 text-xs">{ord.customerName}</p>
                      <p className="text-[11px] text-slate-400">{ord.customerEmail}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {hasHire && hasBuy ? (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Buy + Hire
                        </span>) : hasHire ? (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          Hire / Rental
                        </span>) : (<span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Outright Buy
                        </span>)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">
                      {ord.createdAt}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          isPaid
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {ord.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                        {ord.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900 font-mono text-xs">
                      {formatCurrency(ord.total)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Link
                        to={`/at/orders?id=${ord.id}`}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg text-[#147A7A] hover:bg-teal-50 transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}

export default AdminSalesDashboard;
