import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';
import {
  Package,
  ShoppingCart,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Truck,
  FileText,
  AlertTriangle,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';

export function AdminDashboard() {
  const { orders, products, customers, ndisQuotes } = useAdminStore();

  const stats = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0);
    const pendingOrders = orders.filter((o) => o.status === 'pending').length;
    const deliveredOrders = orders.filter((o) => o.status === 'delivered').length;
    const totalProducts = products.length;
    const totalCustomers = customers.length;
    const lowStockProducts = products.filter((p) => p.stock <= p.lowStockThreshold);
    const activeQuotes = ndisQuotes.filter((q) => q.status === 'sent' || q.status === 'draft').length;
    const hireOrders = orders.filter((o) => o.items.some((i) => i.purchaseType === 'hire')).length;
    const avgOrderValue = totalRevenue / (orders.filter((o) => o.paymentStatus === 'paid').length || 1);

    return {
      totalRevenue,
      pendingOrders,
      deliveredOrders,
      totalProducts,
      totalCustomers,
      lowStockProducts,
      activeQuotes,
      hireOrders,
      avgOrderValue,
    };
  }, [orders, products, customers, ndisQuotes]);

  const recentOrders = orders.slice(0, 6);

  const statCards = [
    {
      label: 'Total Revenue (AUD)',
      value: formatCurrency(stats.totalRevenue),
      change: '+12.5% vs last month',
      up: true,
      icon: DollarSign,
      color: 'bg-emerald-600',
    },
    {
      label: 'Total Orders',
      value: String(orders.length),
      change: `${stats.pendingOrders} pending`,
      up: true,
      icon: ShoppingCart,
      color: 'bg-blue-600',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(stats.avgOrderValue),
      change: 'Per paid checkout',
      up: true,
      icon: BarChart3,
      color: 'bg-violet-600',
    },
    {
      label: 'Active Customers',
      value: String(stats.totalCustomers),
      change: `${customers.filter((c) => c.ndisNumber).length} NDIS verified`,
      up: true,
      icon: Users,
      color: 'bg-amber-600',
    },
  ];

  const statusColors: Record<string, { bg: string; icon: React.ElementType }> = {
    pending: { bg: 'bg-amber-50 text-amber-800 border border-amber-200 font-medium', icon: Clock },
    confirmed: { bg: 'bg-blue-50 text-blue-800 border border-blue-200 font-medium', icon: CheckCircle },
    processing: { bg: 'bg-violet-50 text-violet-800 border border-violet-200 font-medium', icon: AlertCircle },
    shipped: { bg: 'bg-cyan-50 text-cyan-800 border border-cyan-200 font-medium', icon: Truck },
    delivered: { bg: 'bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium', icon: CheckCircle },
    cancelled: { bg: 'bg-red-50 text-red-800 border border-red-200 font-medium', icon: XCircle },
  };

  return (<div className="space-y-6 font-sans text-slate-700">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Store performance metrics, live transactions, and assistive equipment logistics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/at/orders"
            className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all shadow-xs"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Manage Orders</span>
          </Link>
        </div>
      </div>

      {/* Stat KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (<div key={stat.label} className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] sm:text-xs font-medium text-slate-500 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-xl sm:text-2xl font-semibold font-mono text-slate-900 mt-1 truncate">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-2 sm:p-2.5 rounded-xl flex-shrink-0 text-white shadow-2xs`}>
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="pt-1 flex items-center gap-1.5 border-t border-slate-100">
                {stat.up ? <TrendingUp className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                <span className="text-[11px] font-normal text-slate-500 truncate">{stat.change}</span>
              </div>
            </div>);
        })}
      </div>


      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Recent Customer Orders Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-xs">
          <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-semibold text-slate-900 tracking-tight">Recent Orders & Transactions</h2>
              <p className="text-xs text-slate-500 font-normal">Live order activity across Australia</p>
            </div>
            <Link to="/at/orders" className="text-xs font-medium text-[#147A7A] hover:underline flex items-center gap-1">
              View All Orders <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-500">
                  <th className="text-left px-4 sm:px-6 py-3 text-[11px] font-medium uppercase tracking-wider">Order ID</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-[11px] font-medium uppercase tracking-wider hidden sm:table-cell">Customer</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-[11px] font-medium uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-[11px] font-medium uppercase tracking-wider">Total (AUD)</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-[11px] font-medium uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 sm:px-6 py-3 text-[11px] font-medium uppercase tracking-wider hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentOrders.length === 0 ? (<tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-medium text-slate-700 text-sm">No orders placed yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">When orders are placed in the store, they will reflect here instantly.</p>
                    </td>
                  </tr>) : (recentOrders.map((order) => {
                    const cfg = statusColors[order.status] || statusColors.pending;
                    const StatusIcon = cfg.icon;
                    const buyCount = order.items.filter((i) => i.purchaseType === 'buy').length;
                    const hireCount = order.items.filter((i) => i.purchaseType === 'hire').length;
                    const isMixed = buyCount > 0 && hireCount > 0;

                    return (<tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                          <Link to="/at/orders" className="font-medium font-mono text-slate-900 hover:text-[#147A7A]">
                            {order.id}
                          </Link>
                          <p className="text-[11px] text-slate-500 sm:hidden">{order.customerName}</p>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-slate-800 hidden sm:table-cell font-medium">
                          {order.customerName}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 hidden md:table-cell whitespace-nowrap">
                          {isMixed ? (<span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200">
                              Mixed ({buyCount}B + {hireCount}H)
                            </span>) : hireCount > 0 ? (<span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                              Hire ({hireCount})
                            </span>) : (<span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Buy ({buyCount})
                            </span>)}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 font-medium font-mono text-slate-900 whitespace-nowrap">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] ${cfg.bg}`}>
                            <StatusIcon className="w-3 h-3" />
                            <span>{order.status.toUpperCase()}</span>
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-3.5 text-slate-500 text-xs hidden lg:table-cell font-mono whitespace-nowrap">
                          {order.createdAt}
                        </td>
                      </tr>);
                  }))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Sidebar: Topics & Highlights */}
        <div className="space-y-6">
          
          {/* Topic 1: Order Pipeline Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Order Pipeline Status</h3>
            <div className="space-y-3">
              {[
                { label: 'Pending', count: orders.filter((o) => o.status === 'pending').length, color: 'bg-amber-500' },
                { label: 'Processing', count: orders.filter((o) => o.status === 'processing').length, color: 'bg-violet-500' },
                { label: 'Shipped', count: orders.filter((o) => o.status === 'shipped').length, color: 'bg-cyan-500' },
                { label: 'Delivered', count: orders.filter((o) => o.status === 'delivered').length, color: 'bg-emerald-500' },
                { label: 'Cancelled', count: orders.filter((o) => o.status === 'cancelled').length, color: 'bg-red-500' },
              ].map((item) => (<div key={item.label} className="flex items-center gap-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${item.color} flex-shrink-0`} />
                  <span className="text-xs sm:text-sm font-normal text-slate-700 flex-1">{item.label}</span>
                  <span className="text-xs sm:text-sm font-medium font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                    {item.count}
                  </span>
                </div>))}
            </div>
          </div>

          {/* Topic 2: Low Stock Alerts */}
          {stats.lowStockProducts.length > 0 && (<div className="bg-white rounded-2xl border border-amber-200 p-5 sm:p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Low Stock Inventory Alerts</h3>
              </div>
              <div className="space-y-2">
                {stats.lowStockProducts.slice(0, 4).map((product) => (<div key={product.id} className="flex items-center justify-between bg-amber-50 rounded-xl px-3 py-2 border border-amber-200">
                    <p className="text-xs font-medium text-slate-900 truncate max-w-[160px]">{product.name}</p>
                    <span className={`text-[11px] font-medium font-mono ${product.stock <= 3 ? 'text-red-700' : 'text-amber-800'}`}>
                      {product.stock} units left
                    </span>
                  </div>))}
              </div>
            </div>)}

          {/* Topic 3: NDIS Quotes & Trials */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">NDIS Formal Quotes</h3>
              <Link to="/at/quotes" className="text-xs font-medium text-[#147A7A] hover:underline">
                View All
              </Link>
            </div>
            {ndisQuotes.length === 0 ? (<p className="text-xs text-slate-400 py-3 text-center font-normal">No quote requests recorded yet</p>) : (<div className="space-y-2">
                {ndisQuotes.slice(0, 4).map((quote) => (<div key={quote.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{quote.customerName}</p>
                      <p className="text-[11px] font-normal text-slate-500 font-mono">
                        {quote.id} &middot; {formatCurrency(quote.total)}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium ${
                        quote.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : quote.status === 'sent'
                          ? 'bg-blue-50 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {quote.status.toUpperCase()}
                    </span>
                  </div>))}
              </div>)}
          </div>

          {/* Topic 4: High Value Equipment */}
          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-xs">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Top Value Equipment</h3>
            <div className="space-y-3">
              {products
                .sort((a, b) => b.price - a.price)
                .slice(0, 4)
                .map((product) => (<div key={product.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-50 border border-slate-200 rounded-xl overflow-hidden flex-shrink-0 p-0.5">
                      <img
                        src={proxyImageUrl(product.image)}
                        alt={product.name}
                        className="w-full h-full object-contain"
                        onError={handleImageError}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-900 truncate">{product.name}</p>
                      <p className="text-[11px] font-normal text-slate-500 font-mono">
                        <span className="text-[#147A7A] font-medium">{formatCurrency(product.price)}</span> &middot; {product.stock} in stock
                      </p>
                    </div>
                  </div>))}
            </div>
          </div>

        </div>
      </div>
    </div>);
}

export default AdminDashboard;
