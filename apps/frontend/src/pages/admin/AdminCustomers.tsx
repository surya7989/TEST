import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAdminStore, type Customer, type Order } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import { getCustomer as apiGetCustomer } from '@/lib/api';
import {
  Search,
  Users,
  Mail,
  Phone,
  ShoppingBag,
  Building2,
  Eye,
  Edit2,
  Trash2,
  Plus,
  ArrowLeft,
  MapPin,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Check,
  Download,
  Calendar,
  DollarSign,
  ShieldCheck,
  Package,
  Clock,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

type SortKey = 'name' | 'totalSpent' | 'ordersCount' | 'joinedAt';
type SortDir = 'asc' | 'desc';
type ViewMode = 'list' | 'detail' | 'form';

export function AdminCustomers() {
  const { customers, orders, addCustomer, updateCustomer, deleteCustomer, fetchAllData } = useAdminStore();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');

  // Sync with top-bar quick search (?search=...) on every navigation
  useEffect(() => {
    setSearch(searchParams.get('search') || '');
  }, [searchParams]);
  const [ndisFilter, setNdisFilter] = useState<'all' | 'ndis' | 'self' | 'high-value'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);

  // Live Refresh & Detail Fetch State
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [apiLoadedOrders, setApiLoadedOrders] = useState<any[]>([]);

  // Automatically refresh latest customer & order records on mount
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllData();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Synthesize customer records for orders where email is not in registered customers (e.g. guest checkouts)
  const effectiveCustomers: Customer[] = useMemo(() => {
    const existingEmails = new Set(
      customers.map((c) => (c.email || '').trim().toLowerCase()).filter(Boolean)
    );
    const existingIds = new Set(customers.map((c) => c.id));
    const synthesized: Customer[] = [];

    for (const ord of orders) {
      const email = (ord.customerEmail || (ord as any).customer_email || '').trim().toLowerCase();
      const ordId = (ord as any).customerId || (ord as any).customer_id || `GUEST-${ord.id}`;
      if (!email || existingEmails.has(email) || existingIds.has(ordId)) continue;

      existingEmails.add(email);
      existingIds.add(ordId);
      synthesized.push({
        id: ordId,
        name: ord.customerName || email.split('@')[0] || 'Store Client',
        email: email,
        phone: ord.customerPhone || '',
        ordersCount: 1,
        totalSpent: Number(ord.total) || 0,
        joinedAt: ord.createdAt ? ord.createdAt.split('T')[0] : new Date().toISOString().split('T')[0],
        address: ord.shippingAddress || '',
        ndisNumber: ord.ndisNumber || '',
        notes: 'Customer from order checkout',
      });
    }

    return [...customers, ...synthesized];
  }, [customers, orders]);

  // Pre-index orders by lowercase email and by customerId for fast, accurate lookup
  const ordersByCustomerKey = useMemo(() => {
    const map = new Map<string, Order[]>();
    for (const ord of orders) {
      const email = (ord.customerEmail || (ord as any).customer_email || '').trim().toLowerCase();
      const cid = (ord as any).customerId || (ord as any).customer_id;
      if (email) {
        if (!map.has(email)) map.set(email, []);
        map.get(email)!.push(ord);
      }
      if (cid && cid !== email) {
        if (!map.has(cid)) map.set(cid, []);
        if (!email || !map.get(email)!.includes(ord)) {
          map.get(cid)!.push(ord);
        }
      }
    }
    return map;
  }, [orders]);

  // Compute live, accurate order count, total spend, and order list per customer
  const customerStats = useMemo(() => {
    const stats = new Map<string, { count: number; total: number; orders: Order[] }>();
    for (const c of effectiveCustomers) {
      const email = (c.email || '').trim().toLowerCase();
      const emailOrders = email ? (ordersByCustomerKey.get(email) || []) : [];
      const idOrders = c.id ? (ordersByCustomerKey.get(c.id) || []) : [];

      // Combine de-duplicated
      const seen = new Set<string>();
      const combined: Order[] = [];
      for (const o of [...emailOrders, ...idOrders]) {
        if (!seen.has(o.id)) {
          seen.add(o.id);
          combined.push(o);
        }
      }

      const count = combined.length > 0 ? combined.length : Math.max(0, c.ordersCount || 0);
      const total = combined.length > 0
        ? combined.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
        : Math.max(0, c.totalSpent || 0);

      stats.set(c.id, { count, total, orders: combined });
    }
    return stats;
  }, [effectiveCustomers, ordersByCustomerKey]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    isNdisParticipant: false,
    ndisNumber: '',
    planManager: '',
    notes: '',
  });

  const filteredCustomers = useMemo(() => {
    return effectiveCustomers
      .filter((c) => {
        const s = (search || '').toLowerCase();
        const stat = customerStats.get(c.id);
        const totalSpent = stat?.total ?? c.totalSpent;
        const matchesSearch =
          !s ||
          (c.name || '').toLowerCase().includes(s) ||
          (c.email || '').toLowerCase().includes(s) ||
          (c.phone || '').includes(s) ||
          Boolean(c.ndisNumber && c.ndisNumber.toLowerCase().includes(s)) ||
          Boolean(c.planManager && c.planManager.toLowerCase().includes(s));

        const matchesNdis =
          ndisFilter === 'all' ||
          (ndisFilter === 'ndis' && Boolean(c.ndisNumber)) ||
          (ndisFilter === 'self' && !c.ndisNumber) ||
          (ndisFilter === 'high-value' && totalSpent >= 1000);

        return matchesSearch && matchesNdis;
      })
      .sort((a, b) => {
        const mul = sortDir === 'asc' ? 1 : -1;
        const statA = customerStats.get(a.id);
        const statB = customerStats.get(b.id);
        const countA = statA?.count ?? a.ordersCount;
        const countB = statB?.count ?? b.ordersCount;
        const totalA = statA?.total ?? a.totalSpent;
        const totalB = statB?.total ?? b.totalSpent;

        if (sortKey === 'name') return mul * (a.name || '').localeCompare(b.name || '');
        if (sortKey === 'totalSpent') return mul * (totalA - totalB);
        if (sortKey === 'ordersCount') return mul * (countA - countB);
        if (sortKey === 'joinedAt') return mul * (a.joinedAt || '').localeCompare(b.joinedAt || '');
        return 0;
      });
  }, [effectiveCustomers, customerStats, search, ndisFilter, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return sortDir === 'asc' ? (<ArrowUp className="w-3.5 h-3.5 text-[#147A7A]" />) : (<ArrowDown className="w-3.5 h-3.5 text-[#147A7A]" />);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      isNdisParticipant: false,
      ndisNumber: '',
      planManager: '',
      notes: '',
    });
  };

  const openAddForm = () => {
    resetForm();
    setEditingCustomerId(null);
    setViewMode('form');
  };

  const openEditForm = (id: string) => {
    const c = effectiveCustomers.find((cust) => cust.id === id);
    if (c) {
      setFormData({
        name: c.name,
        email: c.email,
        phone: c.phone,
        address: c.address || '',
        isNdisParticipant: Boolean(c.ndisNumber),
        ndisNumber: c.ndisNumber || '',
        planManager: c.planManager || '',
        notes: c.notes || '',
      });
      setEditingCustomerId(id);
      setViewMode('form');
    }
  };

  const openDetailView = async (id: string) => {
    setSelectedCustomerId(id);
    setViewMode('detail');
    setDetailLoading(true);
    try {
      const res = await apiGetCustomer(id);
      if (res && res.orders) {
        setApiLoadedOrders(res.orders);
      } else {
        setApiLoadedOrders([]);
      }
    } catch {
      setApiLoadedOrders([]);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      alert('Please provide customer name and email address.');
      return;
    }

    if (editingCustomerId) {
      updateCustomer(editingCustomerId, {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        ndisNumber: formData.isNdisParticipant ? formData.ndisNumber.trim() : '',
        planManager: formData.isNdisParticipant ? formData.planManager.trim() : '',
        notes: formData.notes.trim(),
      });
    } else {
      addCustomer({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        ndisNumber: formData.isNdisParticipant ? formData.ndisNumber.trim() : '',
        planManager: formData.isNdisParticipant ? formData.planManager.trim() : '',
        notes: formData.notes.trim(),
        ordersCount: 0,
        totalSpent: 0,
      });
    }

    setViewMode('list');
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this customer profile?')) {
      deleteCustomer(id);
      if (viewMode === 'detail') setViewMode('list');
    }
  };

  const toggleSelect = (id: string) =>
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const exportCustomersCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Address', 'NDIS Number', 'Plan Manager', 'Orders', 'Total Spent', 'Joined'];
    const rows = filteredCustomers.map((c) => {
      const stat = customerStats.get(c.id);
      const ordersCount = stat?.count ?? c.ordersCount;
      const totalSpent = stat?.total ?? c.totalSpent;
      return [
        c.id,
        `"${c.name}"`,
        c.email,
        `"${c.phone}"`,
        `"${c.address || ''}"`,
        c.ndisNumber || 'N/A',
        `"${c.planManager || 'N/A'}"`,
        ordersCount,
        totalSpent,
        c.joinedAt,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `customers_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics calculated from accurate customerStats & effectiveCustomers
  const totalRevenue = useMemo(() => {
    let sum = 0;
    for (const c of effectiveCustomers) {
      const st = customerStats.get(c.id);
      sum += st ? st.total : (c.totalSpent || 0);
    }
    return sum;
  }, [effectiveCustomers, customerStats]);

  const ndisCustomersCount = useMemo(() => {
    return effectiveCustomers.filter((c) => Boolean(c.ndisNumber && c.ndisNumber.trim() !== '')).length;
  }, [effectiveCustomers]);

  const avgSpend = totalRevenue / (effectiveCustomers.length || 1);

  const activeCustomer = selectedCustomerId ? effectiveCustomers.find((c) => c.id === selectedCustomerId) : null;
  const activeStat = activeCustomer ? customerStats.get(activeCustomer.id) : null;

  // Merge store orders with apiLoadedOrders for active customer (with full item details)
  const customerOrders = useMemo(() => {
    if (!activeCustomer) return [];
    const storeOrds = activeStat?.orders || [];
    const seen = new Set<string>();
    const combined: any[] = [];

    for (const o of storeOrds) {
      if (!seen.has(o.id)) {
        seen.add(o.id);
        combined.push({
          id: o.id,
          customerName: o.customerName || (o as any).customer_name || '',
          customerEmail: o.customerEmail || (o as any).customer_email || '',
          customerPhone: o.customerPhone || (o as any).customer_phone || '',
          total: Number(o.total) || 0,
          status: o.status || 'confirmed',
          paymentStatus: o.paymentStatus || (o as any).payment_status || 'paid',
          createdAt: o.createdAt || (o as any).created_at || '',
          items: Array.isArray(o.items) ? o.items : [],
        });
      }
    }

    for (const o of apiLoadedOrders) {
      const existing = combined.find((x) => x.id === o.id);
      if (!existing) {
        seen.add(o.id);
        combined.push({
          id: o.id,
          customerName: o.customer_name || o.customerName || '',
          customerEmail: o.customer_email || o.customerEmail || '',
          customerPhone: o.customer_phone || o.customerPhone || '',
          total: parseFloat(o.total || 0),
          status: o.status || 'confirmed',
          paymentStatus: o.payment_status || (o as any).paymentStatus || 'paid',
          createdAt: o.created_at ? o.created_at.split('T')[0] : (o.createdAt || ''),
          items: Array.isArray(o.items) ? o.items : [],
        });
      } else {
        // Enrich items if store order had empty items
        if ((!existing.items || existing.items.length === 0) && Array.isArray(o.items) && o.items.length > 0) {
          existing.items = o.items;
        }
      }
    }

    return combined;
  }, [activeCustomer, activeStat, apiLoadedOrders]);

  const activeOrdersCount = customerOrders.length > 0 ? customerOrders.length : (activeStat?.count ?? activeCustomer?.ordersCount ?? 0);
  const activeTotalSpent = customerOrders.length > 0
    ? customerOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)
    : (activeStat?.total ?? activeCustomer?.totalSpent ?? 0);

  // ==========================================
  // VIEW MODE: FULL-PAGE ADD / EDIT CUSTOMER
  // ==========================================
  if (viewMode === 'form') {
    return (<div className="space-y-6 pb-12 animate-fade-in">
        {/* Top Action Header */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-[#147A7A] transition-colors cursor-pointer border border-gray-200"
              title="Return to Customer Directory"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#147A7A] uppercase tracking-wider">Customer Directory</span>
                <span className="text-gray-300">&bull;</span>
                <span className="text-xs text-gray-500 font-medium">{editingCustomerId ? 'Editing Profile' : 'New Registration'}</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">
                {editingCustomerId ? `Edit Profile: ${formData.name || 'Customer'}` : 'Register New Customer Profile'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="px-5 py-2.5 text-xs sm:text-sm font-bold text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer hover:scale-[1.02] flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{editingCustomerId ? 'Save Profile Changes' : 'Register Customer'}</span>
            </button>
          </div>
        </div>

        {/* 2-Column Form Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: INPUTS */}
          <div className="lg:col-span-2 space-y-6">
            {/* Card 1: Personal & Contact Information */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2 border-b border-gray-100 pb-3">
                <Users className="w-4 h-4 text-[#147A7A]" />
                <span>1. Personal & Contact Details</span>
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Customer Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value })}
                    placeholder="e.g. Sarah Mitchell"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A] bg-white text-gray-900 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value })}
                      placeholder="e.g. sarah.m@email.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value })}
                      placeholder="e.g. 0412 345 678"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Full Delivery Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value })}
                    placeholder="e.g. 123 Collins St, Melbourne VIC 3000"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Card 2: NDIS & Funding Support Details */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2 border-b border-gray-100 pb-3">
                <Building2 className="w-4 h-4 text-[#147A7A]" />
                <span>2. NDIS & Funding Management</span>
              </h2>

              {/* NDIS Toggle Switch */}
              <div className="p-4 rounded-2xl border-2 border-violet-200 bg-violet-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 flex-shrink-0">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">NDIS Participant</p>
                      <p className="text-xs text-gray-600">Enable NDIS quoting, invoice forwarding, and plan manager linkage</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({...prev, isNdisParticipant: !prev.isNdisParticipant }))}
                    className={`relative inline-flex h-7 w-13 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      formData.isNdisParticipant ? 'bg-violet-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                        formData.isNdisParticipant ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Reveal NDIS Inputs when turned ON */}
                {formData.isNdisParticipant && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-violet-200 animate-fade-in">
                    <div>
                      <label className="block text-xs font-bold text-violet-900 uppercase tracking-wider mb-1">
                        NDIS Participant Number *
                      </label>
                      <input
                        type="text"
                        required={formData.isNdisParticipant}
                        value={formData.ndisNumber}
                        onChange={(e) => setFormData({...formData, ndisNumber: e.target.value })}
                        placeholder="e.g. 430123456"
                        className="w-full px-4 py-2.5 border-2 border-violet-300 bg-white rounded-xl text-sm font-mono font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-violet-900 uppercase tracking-wider mb-1">
                        Plan Management Agency
                      </label>
                      <input
                        type="text"
                        value={formData.planManager}
                        onChange={(e) => setFormData({...formData, planManager: e.target.value })}
                        placeholder="e.g. Plan Partners, MyPlan, Self Managed"
                        className="w-full px-4 py-2.5 border-2 border-violet-300 bg-white rounded-xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400"
                      />
                    </div>
                  </div>)}
              </div>
            </div>

            {/* Card 3: Clinical Notes & Special Instructions */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h2 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="w-4 h-4 text-[#147A7A]" />
                <span>3. Clinical Notes & Delivery Requirements</span>
              </h2>

              <textarea
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value })}
                placeholder="Enter Occupational Therapist assessment notes, joint trial preferences, stair access or specific delivery instructions..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 bg-white resize-none"
              />
            </div>
          </div>

          {/* RIGHT 1 COLUMN: LIVE PROFILE CARD PREVIEW */}
          <div className="space-y-6">
            <div className="sticky top-6">
              <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Live Customer Card Preview
              </span>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg p-6 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-[#147A7A] rounded-2xl flex items-center justify-center text-white text-lg font-semibold shadow-md">
                    {formData.name
                      ? formData.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()
                      : 'CU'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 text-lg">{formData.name || 'New Customer'}</h3>
                    <p className="text-xs text-gray-500">{formData.email || 'customer@email.com'}</p>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-100 text-xs">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>{formData.phone || 'No phone provided'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-gray-700">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span>{formData.address || 'No address provided'}</span>
                  </div>
                </div>

                {formData.isNdisParticipant && (<div className="p-3 bg-violet-50 border border-violet-200 rounded-xl space-y-1">
                    <p className="text-[11px] font-bold text-violet-800 uppercase">NDIS Participant</p>
                    <p className="text-xs font-mono font-bold text-gray-900"># {formData.ndisNumber || 'Pending'}</p>
                    <p className="text-[11px] text-gray-600">Plan: {formData.planManager || 'Self Managed'}</p>
                  </div>)}
              </div>
            </div>
          </div>
        </div>
      </div>);
  }

  // ==========================================
  // VIEW MODE: FULL-PAGE CUSTOMER PROFILE / INSPECT
  // ==========================================
  if (viewMode === 'detail' && activeCustomer) {
    return (<div className="space-y-6 pb-12 animate-fade-in">
        {/* Header Bar */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('list')}
              className="p-2 rounded-xl text-gray-600 hover:bg-gray-100 hover:text-[#147A7A] transition-colors cursor-pointer border border-gray-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#147A7A] rounded-2xl flex items-center justify-center text-white text-base font-semibold shadow-sm">
                {activeCustomer.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#147A7A] uppercase tracking-wider">Client Record</span>
                  <span className="text-slate-300">&bull;</span>
                  <span className="text-xs text-slate-500 font-mono">{activeCustomer.id}</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900">{activeCustomer.name}</h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDelete(activeCustomer.id)}
              className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold rounded-xl text-xs sm:text-sm transition-all cursor-pointer"
            >
              Delete Customer
            </button>
            <button
              onClick={() => openEditForm(activeCustomer.id)}
              className="px-5 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* 2-Column Detail Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT 2 COLUMNS: Profile info, NDIS and orders */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact & NDIS Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#147A7A]" /> Contact Information
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="flex items-center gap-2 text-gray-800">
                    <span className="font-semibold text-gray-500 w-16">Email:</span>
                    <a href={`mailto:${activeCustomer.email}`} className="text-[#147A7A] hover:underline font-medium">
                      {activeCustomer.email}
                    </a>
                  </p>
                  <p className="flex items-center gap-2 text-gray-800">
                    <span className="font-semibold text-gray-500 w-16">Phone:</span>
                    <a href={`tel:${activeCustomer.phone}`} className="text-gray-900 hover:text-[#147A7A] font-medium">
                      {activeCustomer.phone}
                    </a>
                  </p>
                  <p className="flex items-start gap-2 text-gray-800">
                    <span className="font-semibold text-gray-500 w-16 flex-shrink-0">Address:</span>
                    <span className="text-gray-700">{activeCustomer.address || 'No address recorded'}</span>
                  </p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-violet-600" /> NDIS Pathway & Funding
                </h3>
                {activeCustomer.ndisNumber ? (<div className="space-y-2 text-sm">
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-gray-500">NDIS #:</span>
                      <span className="font-mono font-bold text-gray-900 bg-violet-50 px-2 py-0.5 rounded text-violet-800">
                        {activeCustomer.ndisNumber}
                      </span>
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="font-semibold text-gray-500">Management:</span>
                      <span className="font-bold text-gray-900">{activeCustomer.planManager || 'Self Managed'}</span>
                    </p>
                    <p className="text-xs text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg font-bold inline-block">
                      &check; Verified Participant
                    </p>
                  </div>) : (<div className="py-2">
                    <p className="text-sm text-gray-500">Private / Self-Funding Client</p>
                    <p className="text-xs text-gray-400 mt-1">No NDIS participant number attached to this record.</p>
                  </div>)}
              </div>
            </div>

            {/* Order History */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-bold text-[#0F1E2E] flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-[#147A7A]" />
                  <span>Order & Equipment History ({activeOrdersCount})</span>
                  {detailLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#147A7A]" />}
                </h3>
                <Link
                  to="/at/orders"
                  className="text-xs font-bold text-[#147A7A] hover:underline flex items-center gap-1"
                >
                  <span>Go to Orders</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {customerOrders.length === 0 ? (
                <div className="py-8 text-center bg-gray-50 rounded-2xl">
                  <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 font-medium">No order records found for {activeCustomer.name}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {customerOrders.map((ord) => {
                    const items = Array.isArray(ord.items) ? ord.items : [];
                    const buyItems = items.filter((i: any) => {
                      const pt = (i.purchaseType || i.purchase_type || 'buy').toLowerCase();
                      return pt === 'buy';
                    });
                    const hireItems = items.filter((i: any) => {
                      const pt = (i.purchaseType || i.purchase_type || '').toLowerCase();
                      return pt === 'hire';
                    });
                    const otherItems = items.filter((i: any) => {
                      const pt = (i.purchaseType || i.purchase_type || '').toLowerCase();
                      return pt !== 'buy' && pt !== 'hire';
                    });
                    const isMixed = (buyItems.length > 0 && hireItems.length > 0) || otherItems.length > 0;

                    return (
                      <div
                        key={ord.id}
                        className="p-5 rounded-2xl border border-gray-200 hover:border-[#147A7A]/50 transition-all bg-[#F8FAFC] space-y-3"
                      >
                        {/* Order Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200/70 pb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-gray-900 text-sm">{ord.id}</span>
                            <span className="text-xs text-gray-300">&bull;</span>
                            <span className="text-xs text-gray-500 font-mono">{ord.createdAt}</span>
                            {isMixed ? (
                              <span className="px-2.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold rounded-full">
                                Mixed Order
                              </span>
                            ) : hireItems.length > 0 ? (
                              <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold rounded-full">
                                Equipment Hire
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold rounded-full">
                                Outright Purchase
                              </span>
                            )}
                            <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[11px] font-bold rounded-full uppercase">
                              {ord.status}
                            </span>
                          </div>

                          <div className="text-right sm:text-right flex items-center sm:flex-col justify-between">
                            <span className="text-base font-black text-[#0F1E2E]">{formatCurrency(ord.total)}</span>
                            <span className="text-[10px] text-emerald-700 font-bold uppercase">{ord.paymentStatus}</span>
                          </div>
                        </div>

                        {/* Itemized breakdown */}
                        <div className="space-y-2 text-xs">
                          {items.length === 0 ? (
                            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200/60 text-gray-600">
                              <span className="font-medium">Order Summary</span>
                              <span className="font-bold text-gray-900">{formatCurrency(ord.total)}</span>
                            </div>
                          ) : null}

                          {buyItems.map((itm: any, idx: number) => {
                            const qty = Number(itm.quantity) || 1;
                            const prc = Number(itm.price) || 0;
                            return (
                              <div key={`buy-${idx}`} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200/60">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-bold rounded text-[10px] uppercase border border-emerald-200">
                                    Buy
                                  </span>
                                  <span className="font-semibold text-gray-900">{itm.name || 'Equipment item'}</span>
                                  <span className="text-gray-400 font-medium">(Qty: {qty})</span>
                                </div>
                                <span className="font-bold text-gray-900">{formatCurrency(prc * qty)}</span>
                              </div>
                            );
                          })}

                          {hireItems.map((itm: any, idx: number) => {
                            const qty = Number(itm.quantity) || 1;
                            const prc = Number(itm.price) || 0;
                            const weeks = itm.hireWeeks || itm.hire_weeks || 2;
                            return (
                              <div key={`hire-${idx}`} className="flex items-center justify-between bg-[#FFF8ED] p-2.5 rounded-xl border border-[#FDE5CC]">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[10px] uppercase border border-amber-300">
                                    Hire ({weeks}w)
                                  </span>
                                  <span className="font-semibold text-gray-900">{itm.name || 'Hire equipment'}</span>
                                  <span className="text-amber-800 font-medium">(Qty: {qty} &middot; {weeks} Weeks Duration)</span>
                                </div>
                                <span className="font-bold text-gray-900">{formatCurrency(prc * qty)}</span>
                              </div>
                            );
                          })}

                          {otherItems.map((itm: any, idx: number) => {
                            const qty = Number(itm.quantity) || 1;
                            const prc = Number(itm.price) || 0;
                            return (
                              <div key={`other-${idx}`} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200/60">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-bold rounded text-[10px] uppercase border border-blue-200">
                                    Item
                                  </span>
                                  <span className="font-semibold text-gray-900">{itm.name || 'Item'}</span>
                                  <span className="text-gray-400 font-medium">(Qty: {qty})</span>
                                </div>
                                <span className="font-bold text-gray-900">{formatCurrency(prc * qty)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Clinical & Care Notes */}
            {activeCustomer.notes && (<div className="bg-amber-50/70 border border-amber-200 p-5 rounded-2xl space-y-2">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-amber-700" /> Clinical & Delivery Notes
                </h4>
                <p className="text-xs sm:text-sm text-gray-800 leading-relaxed bg-white p-3.5 rounded-xl border border-amber-200/60">
                  {activeCustomer.notes}
                </p>
              </div>)}
          </div>

          {/* RIGHT 1 COLUMN: Financial Summary */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Value Summary</h3>

              <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-1">
                <span className="text-xs text-teal-800 font-bold uppercase">Total Lifetime Spend</span>
                <p className="text-3xl font-black text-[#147A7A]">{formatCurrency(activeTotalSpent)}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[11px] text-gray-500 font-semibold block">Total Orders</span>
                  <span className="text-lg font-black text-gray-900">{activeOrdersCount}</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <span className="text-[11px] text-gray-500 font-semibold block">Avg. Order Value</span>
                  <span className="text-lg font-black text-gray-900">
                    {activeOrdersCount > 0 ? formatCurrency(activeTotalSpent / activeOrdersCount) : '$0.00'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>);
  }

  // ==========================================
  // VIEW MODE: DEFAULT CUSTOMER DIRECTORY LIST
  // ==========================================
  return (<div className="space-y-6 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 bg-teal-50 text-[#147A7A] border border-teal-200 text-xs font-bold rounded-full uppercase tracking-wider">
              Customers Hub
            </span>
            <span className="text-slate-400 text-xs">&bull;</span>
            <span className="text-xs text-slate-500 font-medium">CRM, NDIS Profiles &amp; Inquiries</span>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Customer Directory &amp; CRM</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            {effectiveCustomers.length} registered clients &middot; {ndisCustomersCount} NDIS participants &middot; {formatCurrency(totalRevenue)} total revenue
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer border border-slate-200 disabled:opacity-50"
            title="Refresh customers and orders"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={exportCustomersCSV}
            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer border border-slate-200"
            title="Download CSV export"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddForm}
            className="inline-flex items-center gap-2 bg-[#147A7A] hover:bg-[#106262] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* 2. SUMMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total Clients', value: String(effectiveCustomers.length), icon: Users, color: 'bg-blue-600' },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: ShoppingBag, color: 'bg-emerald-600' },
          { label: 'NDIS Participants', value: String(ndisCustomersCount), icon: Building2, color: 'bg-violet-600' },
          { label: 'Avg. Client Value', value: formatCurrency(avgSpend), icon: DollarSign, color: 'bg-amber-600' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (<div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
              <div className="flex items-center gap-3">
                <div className={`${stat.color} p-3 rounded-2xl text-white shadow-2xs flex-shrink-0`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{stat.label}</p>
                  <p className="text-lg sm:text-2xl font-semibold font-mono text-slate-900 truncate mt-0.5">{stat.value}</p>
                </div>
              </div>
            </div>);
        })}
      </div>

      {/* 3. FILTERS & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone, NDIS # or plan manager..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 focus:border-[#147A7A] bg-white text-[#0F1E2E]"
            />
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {([
              ['all', 'All Clients'],
              ['ndis', 'NDIS Participants'],
              ['self', 'Self Managed'],
              ['high-value', 'High Value ($1,000+)'],
            ] as const).map(([val, label]) => (<button
                key={val}
                onClick={() => setNdisFilter(val)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  ndisFilter === val
                    ? 'bg-[#147A7A] text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                }`}
              >
                {label}
              </button>))}
          </div>
        </div>
      </div>

      {/* 4. CUSTOMERS TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-[#F8FAFC]">
                <th className="text-left px-3 sm:px-4 py-3.5 w-8">
                  <input
                    type="checkbox"
                    checked={
                      selectedCustomerIds.length === filteredCustomers.length &&
                      filteredCustomers.length > 0
                    }
                    onChange={() =>
                      setSelectedCustomerIds(selectedCustomerIds.length === filteredCustomers.length
                          ? []
                          : filteredCustomers.map((c) => c.id))
                    }
                    className="rounded border-gray-300 cursor-pointer"
                  />
                </th>
                <th
                  className="text-left px-3 sm:px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Customer Client <SortIcon k="name" />
                  </div>
                </th>
                <th className="text-left px-3 sm:px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider hidden md:table-cell">
                  Contact Details
                </th>
                <th
                  className="text-left px-3 sm:px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('ordersCount')}
                >
                  <div className="flex items-center gap-1">
                    Orders <SortIcon k="ordersCount" />
                  </div>
                </th>
                <th
                  className="text-left px-3 sm:px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none"
                  onClick={() => toggleSort('totalSpent')}
                >
                  <div className="flex items-center gap-1">
                    Total Spend <SortIcon k="totalSpent" />
                  </div>
                </th>
                <th className="text-left px-3 sm:px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider hidden lg:table-cell">
                  NDIS Status
                </th>
                <th
                  className="text-left px-3 sm:px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer select-none hidden lg:table-cell"
                  onClick={() => toggleSort('joinedAt')}
                >
                  <div className="flex items-center gap-1">
                    Joined <SortIcon k="joinedAt" />
                  </div>
                </th>
                <th className="text-right px-3 sm:px-4 py-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCustomers.length === 0 ? (<tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-700 font-bold">No customers match your search criteria</p>
                  </td>
                </tr>) : (filteredCustomers.map((c) => (<tr key={c.id} className="hover:bg-teal-50/30 transition-colors">
                    <td className="px-3 sm:px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedCustomerIds.includes(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 sm:px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => openDetailView(c.id)}
                          className="w-10 h-10 bg-[#147A7A] rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0 cursor-pointer shadow-sm"
                        >
                          {c.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <button
                            onClick={() => openDetailView(c.id)}
                            className="font-bold text-gray-900 truncate max-w-[150px] sm:max-w-[220px] hover:text-[#147A7A] text-left cursor-pointer"
                          >
                            {c.name}
                          </button>
                          <p className="text-xs text-gray-400 font-mono">{c.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-xs hidden md:table-cell">
                      <div className="space-y-0.5">
                        <a href={`mailto:${c.email}`} className="text-gray-700 hover:text-[#147A7A] flex items-center gap-1.5">
                          <Mail className="w-3 h-3 text-gray-400" /> {c.email}
                        </a>
                        <a href={`tel:${c.phone}`} className="text-gray-500 hover:text-[#147A7A] flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-gray-400" /> {c.phone}
                        </a>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-bold">
                        <ShoppingBag className="w-3 h-3" /> {customerStats.get(c.id)?.count ?? c.ordersCount}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 font-bold text-gray-900 text-xs sm:text-sm">
                      {formatCurrency(customerStats.get(c.id)?.total ?? c.totalSpent)}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 hidden lg:table-cell">
                      {c.ndisNumber ? (<div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200 rounded-full text-xs font-bold">
                            <ShieldCheck className="w-3 h-3" /> NDIS
                          </span>
                          <p className="text-[11px] text-gray-500 font-medium truncate max-w-[140px]">{c.planManager || 'Self Managed'}</p>
                        </div>) : (<span className="text-gray-400 text-xs font-medium">Private</span>)}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-gray-500 text-xs hidden lg:table-cell">
                      {c.joinedAt}
                    </td>
                    <td className="px-3 sm:px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetailView(c.id)}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-[#147A7A] transition-colors cursor-pointer"
                          title="View Profile"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEditForm(c.id)}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-teal-50 text-gray-500 hover:text-[#147A7A] transition-colors cursor-pointer"
                          title="Edit Customer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 sm:p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
                          title="Delete Customer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>)))}
            </tbody>
          </table>
        </div>
      </div>
    </div>);
}

export default AdminCustomers;
