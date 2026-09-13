import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import {
  Truck,
  Box,
  Clock,
  CreditCard,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  ShieldCheck,
  Package,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export function AdminOperationsDashboard() {
  const { products, orders, shippingZones } = useAdminStore();

  const stats = useMemo(() => {
    const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
    const outOfStock = products.filter((p) => p.stock === 0);
    const awaitingShipment = orders.filter((o) => o.status === 'confirmed' || o.status === 'processing');
    const inTransit = orders.filter((o) => o.status === 'shipped');

    const hireOrders = orders.filter((o) => o.items.some((i) => i.purchaseType === 'hire'));
    const totalHireUnits = hireOrders.reduce((sum, o) => {
      return sum + o.items.filter((i) => i.purchaseType === 'hire').reduce((sub, itm) => sub + itm.quantity, 0);
    }, 0);

    return {
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      awaitingShipmentCount: awaitingShipment.length,
      inTransitCount: inTransit.length,
      totalHireUnits,
      activeHireOrders: hireOrders.length,
      totalZones: shippingZones.length,
    };
  }, [products, orders, shippingZones]);

  const dispatchQueue = orders
    .filter((o) => o.status === 'confirmed' || o.status === 'processing' || o.status === 'pending')
    .slice(0, 6);

  const lowStockItems = products
    .filter((p) => p.stock <= p.lowStockThreshold)
    .slice(0, 5);

  return (<div className="space-y-6 font-sans text-slate-700 animate-fade-in">
      {/* 1. TOP HEADER */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-teal-50 text-[#147A7A] border border-teal-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Topic Hub
            </span>
            <span className="text-slate-400 text-xs">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">Logistics, Freight, Fleet Tracking &amp; Warehouse</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Operations Dashboard</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Coordinate dispatch queues, equipment hire fleet rotations, Australian courier logistics, and low stock replenishments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/at/shipping"
            className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs"
          >
            <Truck className="w-4 h-4" />
            <span>Manage Shipping Zones</span>
          </Link>
          <Link
            to="/at/products"
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors"
          >
            <Box className="w-4 h-4 text-slate-500" />
            <span>Stock Health ({stats.lowStockCount})</span>
          </Link>
        </div>
      </div>

      {/* 3. OPERATIONS METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Dispatch</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.awaitingShipmentCount}</span>
            <p className="text-xs text-amber-700 font-medium mt-1">
              Confirmed orders requiring courier booking
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Hire Fleet</span>
            <div className="w-10 h-10 rounded-xl bg-teal-50 text-[#147A7A] flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalHireUnits} Units</span>
            <p className="text-xs text-teal-700 font-medium mt-1">
              Deployed across {stats.activeHireOrders} active rental contracts
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Low Stock Warnings</span>
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.lowStockCount}</span>
            <p className="text-xs text-red-600 font-medium mt-1">
              {stats.outOfStockCount} items completely out of stock
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-teal-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Freight &amp; Delivery</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-bold text-slate-900">{stats.totalZones} Zones</span>
            <p className="text-xs text-blue-600 font-medium mt-1">
              Australia Post Express &amp; Local Metro delivery active
            </p>
          </div>
        </div>
      </div>

      {/* 4. DISPATCH QUEUE & INVENTORY REPLENISHMENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Dispatch Queue */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Fulfillment &amp; Dispatch Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">Orders ready to pack, assemble, and dispatch</p>
            </div>
            <Link
              to="/at/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147A7A] hover:underline"
            >
              <span>Manage Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {dispatchQueue.length === 0 ? (<div className="p-8 text-center text-slate-400 text-xs">All orders have been dispatched!</div>) : (dispatchQueue.map((ord) => (<div key={ord.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs font-mono">{ord.id}</span>
                      <span className="text-slate-300 text-xs">&bull;</span>
                      <span className="text-xs font-semibold text-slate-700">{ord.customerName}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate max-w-sm">{ord.shippingAddress}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                      {ord.status}
                    </span>
                    <Link
                      to={`/at/orders?id=${ord.id}`}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-[#147A7A] hover:text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Process
                    </Link>
                  </div>
                </div>)))}
          </div>
        </div>

        {/* Right: Low Stock Warnings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Low Stock Restock Alerts</h2>
              <p className="text-xs text-slate-500 mt-0.5">Assistive products below reorder threshold</p>
            </div>
            <Link
              to="/at/products"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147A7A] hover:underline"
            >
              <span>View Products</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {lowStockItems.length === 0 ? (<div className="p-8 text-center text-slate-400 text-xs">All products healthy and well-stocked!</div>) : (lowStockItems.map((p) => (<div key={p.id} className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400">{p.brand} &middot; {formatCurrency(p.price)}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-200 font-mono">
                      Stock: {p.stock}
                    </span>
                    <Link
                      to={`/at/products?edit=${p.id}`}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-[#147A7A] hover:text-white rounded-lg text-xs font-bold transition-colors"
                    >
                      Update
                    </Link>
                  </div>
                </div>)))}
          </div>
        </div>
      </div>
    </div>);
}

export default AdminOperationsDashboard;
