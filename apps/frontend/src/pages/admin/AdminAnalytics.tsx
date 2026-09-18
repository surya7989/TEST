import { useState, useMemo, useEffect } from 'react';
import { useAdminStore } from '@/store/adminStore';
import { formatCurrency } from '@/lib/utils';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  TrendingUp,
  FileText,
  Receipt,
  Calendar,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  Check,
  Search,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Boxes,
  ExternalLink,
  Truck,
  AlertCircle,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type ReportTab = 'financial' | 'stock' | 'invoices' | 'rentals';
type DatePreset = 'today' | 'yesterday' | '7d' | '14d' | '30d' | 'this_month' | 'all';

export function AdminAnalytics() {
  const { orders, products, customers, ndisQuotes, fetchAllData } = useAdminStore();
  const [activeTab, setActiveTab] = useState<ReportTab>('financial');
  const [taxMode, setTaxMode] = useState<'standard' | 'ndis-free'>('standard');
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  // Auto-fetch data on mount to ensure live reporting data
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Date Filtering State
  const [datePreset, setDatePreset] = useState<DatePreset>('30d');
  const [dateFrom, setDateFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Tab-specific filters & searches
  const [stockSearch, setStockSearch] = useState('');
  const [stockCategoryFilter, setStockCategoryFilter] = useState('all');
  const [stockHealthFilter, setStockHealthFilter] = useState<'all' | 'out' | 'low' | 'healthy'>('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [rentalSearch, setRentalSearch] = useState('');
  const [rentalStatusFilter, setRentalStatusFilter] = useState<'all' | 'active' | 'due_soon' | 'overdue'>('all');

  // Handle Preset Changes
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'today') {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setDateFrom(yStr);
      setDateTo(yStr);
    } else if (preset === '7d') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else if (preset === '14d') {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else if (preset === '30d') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else if (preset === 'this_month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      setDateFrom(startOfMonth.toISOString().split('T')[0]);
      setDateTo(todayStr);
    } else if (preset === 'all') {
      setDateFrom('');
      setDateTo('');
    }
  };

  // Filtered Orders according to Date Range (normalized to YYYY-MM-DD to avoid time-string boundary bug)
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const raw = o.createdAt || '';
      const orderDate = raw.includes('T')
        ? raw.split('T')[0]
        : raw.includes(' ')
        ? raw.split(' ')[0]
        : raw || new Date().toISOString().split('T')[0];

      if (dateFrom && orderDate < dateFrom) return false;
      if (dateTo && orderDate > dateTo) return false;
      return true;
    });
  }, [orders, dateFrom, dateTo]);

  // Financial Analytics Calculations
  const financialAnalytics = useMemo(() => {
    const paidOrders = filteredOrders.filter((o) => (o.paymentStatus || '').toLowerCase() === 'paid');
    const grossRevenue = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    // GST Calculation
    const netRevenue = taxMode === 'standard' ? grossRevenue / 1.1 : grossRevenue;
    const gstCollected = grossRevenue - netRevenue;

    // Wholesale Equipment COGS (~58%)
    const estimatedCogs = netRevenue * 0.58;
    const netProfit = netRevenue - estimatedCogs;
    const profitMargin = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

    const avgOrderValue = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;

    // Hire vs Buy Calculations
    const hireOrders = filteredOrders.filter((o) =>
      o.items.some((i) => (i.purchaseType || (i as any).purchase_type || '').toLowerCase() === 'hire')
    ).length;
    const buyOrders = filteredOrders.filter((o) =>
      o.items.some((i) => (i.purchaseType || (i as any).purchase_type || '').toLowerCase() !== 'hire')
    ).length;

    const hireRevenue = paidOrders.reduce((sum, o) => {
      const hireItems = o.items.filter((i) => (i.purchaseType || (i as any).purchase_type || '').toLowerCase() === 'hire');
      return sum + hireItems.reduce((sub, itm) => sub + (itm.price * itm.quantity), 0);
    }, 0);
    const buyRevenue = Math.max(0, grossRevenue - hireRevenue);

    const conversionRate = filteredOrders.length > 0 ? (paidOrders.length / filteredOrders.length) * 100 : 0;

    // Order Fulfillment Status Counts
    const pendingOrdersCount = filteredOrders.filter((o) => o.status === 'pending').length;
    const processingOrdersCount = filteredOrders.filter((o) => o.status === 'processing').length;
    const shippedOrdersCount = filteredOrders.filter((o) => o.status === 'shipped').length;
    const deliveredOrdersCount = filteredOrders.filter((o) => o.status === 'delivered').length;
    const cancelledOrdersCount = filteredOrders.filter((o) => o.status === 'cancelled').length;

    // NDIS Formal Quotes Pipeline Metrics
    const activeQuotes = (ndisQuotes || []).filter(
      (q) => q.status === 'sent' || q.status === 'draft' || q.status === 'pending'
    );
    const totalQuotesValue = (ndisQuotes || []).reduce((sum, q) => sum + (q.total || 0), 0);
    const activeQuotesCount = activeQuotes.length;

    // Daily Sales Aggregation
    const dailyMap: Record<
      string,
      {
        date: string;
        orderCount: number;
        grossRevenue: number;
        netRevenue: number;
        gst: number;
        cogs: number;
        netProfit: number;
        profitMargin: number;
      }
    > = {};

    paidOrders.forEach((o) => {
      const raw = o.createdAt || '';
      const dateStr = raw.includes('T')
        ? raw.split('T')[0]
        : raw.includes(' ')
        ? raw.split(' ')[0]
        : raw || new Date().toISOString().split('T')[0];

      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          date: dateStr,
          orderCount: 0,
          grossRevenue: 0,
          netRevenue: 0,
          gst: 0,
          cogs: 0,
          netProfit: 0,
          profitMargin: 0,
        };
      }
      dailyMap[dateStr].orderCount += 1;
      dailyMap[dateStr].grossRevenue += (o.total || 0);
    });

    const dailyRows = Object.values(dailyMap)
      .map((d) => {
        const net = taxMode === 'standard' ? d.grossRevenue / 1.1 : d.grossRevenue;
        const gst = d.grossRevenue - net;
        const cogs = net * 0.58;
        const profit = net - cogs;
        const margin = net > 0 ? (profit / net) * 100 : 0;
        return {
          ...d,
          netRevenue: net,
          gst,
          cogs,
          netProfit: profit,
          profitMargin: margin,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      grossRevenue,
      netRevenue,
      gstCollected,
      estimatedCogs,
      netProfit,
      profitMargin,
      avgOrderValue,
      hireOrders,
      buyOrders,
      hireRevenue,
      buyRevenue,
      conversionRate,
      pendingOrdersCount,
      processingOrdersCount,
      shippedOrdersCount,
      deliveredOrdersCount,
      cancelledOrdersCount,
      activeQuotesCount,
      totalQuotesValue,
      paidOrdersCount: paidOrders.length,
      dailyRows,
    };
  }, [filteredOrders, taxMode, ndisQuotes]);

  // Stock & Inventory Calculations
  const stockAnalytics = useMemo(() => {
    const totalInventoryValue = products.reduce((sum, p) => sum + p.price * (p.stock || 0), 0);
    const totalStockUnits = products.reduce((sum, p) => sum + (p.stock || 0), 0);
    const lowStockCount = products.filter((p) => p.stock <= (p.lowStockThreshold || 10) && p.stock > 0).length;
    const outOfStockCount = products.filter((p) => p.stock === 0).length;
    const healthyStockCount = products.filter((p) => p.stock > (p.lowStockThreshold || 10)).length;

    const filteredProducts = products.filter((p) => {
      const matchesSearch =
        !stockSearch ||
        p.name.toLowerCase().includes(stockSearch.toLowerCase()) ||
        p.brand.toLowerCase().includes(stockSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(stockSearch.toLowerCase());
      const matchesCat = stockCategoryFilter === 'all' || p.category === stockCategoryFilter;
      const matchesHealth =
        stockHealthFilter === 'all' ||
        (stockHealthFilter === 'out' && p.stock === 0) ||
        (stockHealthFilter === 'low' && p.stock <= (p.lowStockThreshold || 10) && p.stock > 0) ||
        (stockHealthFilter === 'healthy' && p.stock > (p.lowStockThreshold || 10));
      return matchesSearch && matchesCat && matchesHealth;
    });

    return {
      totalInventoryValue,
      totalStockUnits,
      lowStockCount,
      outOfStockCount,
      healthyStockCount,
      filteredProducts,
    };
  }, [products, stockSearch, stockCategoryFilter, stockHealthFilter]);

  // Invoices & Settlements Calculations
  const invoiceAnalytics = useMemo(() => {
    const filteredInvoices = filteredOrders.filter((o) => {
      if (invoiceStatusFilter !== 'all') {
        const isPaid = (o.paymentStatus || '').toLowerCase() === 'paid';
        if (invoiceStatusFilter === 'paid' && !isPaid) return false;
        if (invoiceStatusFilter === 'pending' && isPaid) return false;
      }
      if (!invoiceSearch) return true;
      const s = invoiceSearch.toLowerCase();
      return (
        (o.id || '').toLowerCase().includes(s) ||
        (o.customerName || '').toLowerCase().includes(s) ||
        (o.customerEmail || '').toLowerCase().includes(s) ||
        (o.shippingAddress && o.shippingAddress.toLowerCase().includes(s))
      );
    });

    const totalInvoiced = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const paidInvoices = filteredOrders.filter((o) => (o.paymentStatus || '').toLowerCase() === 'paid');
    const paidInvoicedTotal = paidInvoices.reduce((sum, o) => sum + (o.total || 0), 0);
    const pendingInvoices = filteredOrders.filter((o) => (o.paymentStatus || '').toLowerCase() !== 'paid');
    const pendingInvoicedTotal = pendingInvoices.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalGstInvoiced = filteredOrders.reduce(
      (sum, o) =>
        sum +
        (o.gstTotal !== undefined && o.gstTotal !== null ? o.gstTotal : taxMode === 'standard' ? o.total / 11 : 0),
      0
    );

    return {
      filteredInvoices,
      totalInvoiced,
      paidInvoicedTotal,
      paidInvoicesCount: paidInvoices.length,
      pendingInvoicedTotal,
      pendingInvoicesCount: pendingInvoices.length,
      totalGstInvoiced,
    };
  }, [filteredOrders, invoiceSearch, invoiceStatusFilter, taxMode]);

  // Rentals & Hire Calculations
  const rentalAnalytics = useMemo(() => {
    const rentalItems: {
      orderId: string;
      customerName: string;
      customerEmail: string;
      customerPhone: string;
      productName: string;
      quantity: number;
      weeklyRate: number;
      hireWeeks: number;
      totalPrice: number;
      startDate: string;
      returnDueDate: string;
      status: 'active' | 'due_soon' | 'overdue';
    }[] = [];

    const todayStr = new Date().toISOString().split('T')[0];

    orders.forEach((o) => {
      o.items.forEach((item) => {
        const pType = (item.purchaseType || (item as any).purchase_type || '').toLowerCase();
        if (pType === 'hire') {
          const weeks = item.hireWeeks || 2;
          const weekly = Math.round(item.price / weeks);
          const raw = o.createdAt || '';
          const start = raw.includes('T')
            ? raw.split('T')[0]
            : raw.includes(' ')
            ? raw.split(' ')[0]
            : raw || todayStr;

          let returnDateStr = '';
          try {
            const d = new Date(start);
            d.setDate(d.getDate() + weeks * 7);
            returnDateStr = d.toISOString().split('T')[0];
          } catch {
            returnDateStr = start;
          }

          const custEmail = (o.customerEmail || '').trim().toLowerCase();
          const customer = customers.find((c) => (c.email || '').trim().toLowerCase() === custEmail);
          const phone = o.customerPhone || customer?.phone || '0494 767 409';

          let status: 'active' | 'due_soon' | 'overdue' = 'active';
          if (returnDateStr && returnDateStr < todayStr) {
            status = 'overdue';
          } else if (returnDateStr) {
            const diffDays = Math.ceil(
              (new Date(returnDateStr).getTime() - new Date(todayStr).getTime()) / (1000 * 3600 * 24)
            );
            if (diffDays <= 3) {
              status = 'due_soon';
            }
          }

          rentalItems.push({
            orderId: o.id,
            customerName: o.customerName,
            customerEmail: o.customerEmail,
            customerPhone: phone,
            productName: item.name,
            quantity: item.quantity,
            weeklyRate: weekly,
            hireWeeks: weeks,
            totalPrice: item.price * item.quantity,
            startDate: start,
            returnDueDate: returnDateStr,
            status,
          });
        }
      });
    });

    const filteredRentals = rentalItems.filter((r) => {
      if (rentalStatusFilter !== 'all' && r.status !== rentalStatusFilter) return false;
      if (!rentalSearch) return true;
      const s = rentalSearch.toLowerCase();
      return (
        r.orderId.toLowerCase().includes(s) ||
        r.customerName.toLowerCase().includes(s) ||
        r.productName.toLowerCase().includes(s) ||
        r.customerEmail.toLowerCase().includes(s)
      );
    });

    const totalRentalRevenue = rentalItems.reduce((sum, r) => sum + r.totalPrice, 0);
    const activeCount = rentalItems.filter((r) => r.status === 'active').length;
    const dueSoonCount = rentalItems.filter((r) => r.status === 'due_soon').length;
    const overdueCount = rentalItems.filter((r) => r.status === 'overdue').length;

    return {
      rentalItems,
      filteredRentals,
      totalRentalRevenue,
      activeCount,
      dueSoonCount,
      overdueCount,
      totalHiresCount: rentalItems.length,
    };
  }, [orders, customers, rentalSearch, rentalStatusFilter]);

  // Categories for Stock Filter
  const categories = useMemo(() => {
    const set = new Set(products.map((p) => p.category));
    return ['all', ...Array.from(set)];
  }, [products]);

  // Universal Excel / CSV Exporter
  const handleExportExcel = (mode: 'active' | 'all') => {
    setIsExporting(true);
    try {
      let csvContent = '\uFEFF';
      const timestamp = new Date().toLocaleString('en-AU');
      const dateRangeStr = dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : 'All Recorded Dates';

      if (mode === 'active' && activeTab === 'stock') {
        const stockHeaders = [
          'Product SKU',
          'Product Title',
          'Brand',
          'Category',
          'Stock On Hand (Units)',
          'Low Stock Alert Threshold',
          'Unit Buy Price (AUD)',
          'Total Valuation (AUD)',
          'GST Status',
          'Delivery Fee (AUD)',
          'Stock Health Status',
        ];

        const stockRows = stockAnalytics.filteredProducts.map((p) => [
          p.sku,
          p.name,
          p.brand,
          p.category,
          p.stock,
          p.lowStockThreshold || 10,
          p.price.toFixed(2),
          ((p.stock || 0) * p.price).toFixed(2),
          p.gstType === 'gst-free' ? '0% (NDIS GST-Free)' : p.gstType === 'custom' ? `${p.gstRate || 10}% Custom` : '10% Standard',
          (p.deliveryFee || 0).toFixed(2),
          p.stock === 0 ? 'Out of Stock' : p.stock <= (p.lowStockThreshold || 10) ? 'Low Stock Warning' : 'Healthy Stock',
        ]);

        const summary = [
          ['AT SPECIALISTS AUSTRALIA - STOCK & INVENTORY VALUATION REPORT'],
          ['Generated On:', timestamp],
          ['Total Unique Products in Catalog:', products.length],
          ['Total Physical Units in Warehouse:', stockAnalytics.totalStockUnits],
          ['Total Inventory Valuation:', `$${stockAnalytics.totalInventoryValue.toFixed(2)} AUD`],
          ['Low Stock Alert Items:', stockAnalytics.lowStockCount],
          ['Out of Stock Items:', stockAnalytics.outOfStockCount],
          [],
          ['ITEMIZED INVENTORY AUDIT SHEET'],
          stockHeaders,
          ...stockRows,
        ];

        csvContent += summary
          .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
          .join('\r\n');

        downloadFile(csvContent, `AT_Specialists_Stock_Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
      } else if (mode === 'active' && activeTab === 'invoices') {
        const invHeaders = [
          'Tax Invoice ID',
          'Customer Full Name',
          'Customer Email',
          'Issue Date',
          'Payment Status',
          'Subtotal (AUD)',
          'Clinical Delivery Fee (AUD)',
          'GST Liability (AUD)',
          'Total Invoiced (AUD)',
          'Shipping / Delivery Bay',
        ];

        const invRows = invoiceAnalytics.filteredInvoices.map((inv) => [
          inv.id,
          inv.customerName,
          inv.customerEmail,
          inv.createdAt,
          (inv.paymentStatus || '').toUpperCase(),
          (inv.total - (inv.deliveryTotal || 0) - (inv.gstTotal || 0)).toFixed(2),
          (inv.deliveryTotal || 0).toFixed(2),
          (inv.gstTotal !== undefined && inv.gstTotal !== null ? inv.gstTotal : inv.total / 11).toFixed(2),
          inv.total.toFixed(2),
          inv.shippingAddress,
        ]);

        const summary = [
          ['AT SPECIALISTS AUSTRALIA - TAX INVOICES & SETTLEMENTS LEDGER'],
          ['Generated On:', timestamp],
          ['Date Filter Range:', dateRangeStr],
          ['Total Invoiced Volume:', `$${invoiceAnalytics.totalInvoiced.toFixed(2)} AUD`],
          ['Settled / Paid Invoices:', `$${invoiceAnalytics.paidInvoicedTotal.toFixed(2)} AUD (${invoiceAnalytics.paidInvoicesCount} invoices)`],
          ['Pending Remittance Invoices:', `$${invoiceAnalytics.pendingInvoicedTotal.toFixed(2)} AUD (${invoiceAnalytics.pendingInvoicesCount} invoices)`],
          ['Total GST Tax Liability:', `$${invoiceAnalytics.totalGstInvoiced.toFixed(2)} AUD`],
          [],
          ['TAX INVOICES AUDIT LEDGER'],
          invHeaders,
          ...invRows,
        ];

        csvContent += summary
          .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
          .join('\r\n');

        downloadFile(csvContent, `AT_Specialists_Invoices_Tax_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
      } else if (mode === 'active' && activeTab === 'rentals') {
        const rentalHeaders = [
          'Order ID',
          'Customer Name',
          'Customer Email',
          'Customer Phone',
          'Equipment Model Hired',
          'Quantity',
          'Weekly Rental Rate (AUD)',
          'Hire Duration (Weeks)',
          'Total Rental Cost (AUD)',
          'Hire Start Date',
          'Scheduled Return Due Date',
          'Rental Schedule Status',
        ];

        const rentalRows = rentalAnalytics.filteredRentals.map((r) => [
          r.orderId,
          r.customerName,
          r.customerEmail,
          r.customerPhone,
          r.productName,
          r.quantity,
          r.weeklyRate.toFixed(2),
          r.hireWeeks,
          r.totalPrice.toFixed(2),
          r.startDate,
          r.returnDueDate,
          r.status === 'overdue' ? 'Overdue Return' : r.status === 'due_soon' ? 'Due Soon' : 'Active on Hire',
        ]);

        const summary = [
          ['AT SPECIALISTS AUSTRALIA - CLINICAL EQUIPMENT HIRE & RENTAL SCHEDULE'],
          ['Generated On:', timestamp],
          ['Total Equipment Rentals:', rentalAnalytics.totalHiresCount],
          ['Active on Hire:', rentalAnalytics.activeCount],
          ['Due Soon (Within 3 Days):', rentalAnalytics.dueSoonCount],
          ['Overdue Returns:', rentalAnalytics.overdueCount],
          ['Total Equipment Hire Revenue:', `$${rentalAnalytics.totalRentalRevenue.toFixed(2)} AUD`],
          [],
          ['EQUIPMENT RENTAL SCHEDULE SHEET'],
          rentalHeaders,
          ...rentalRows,
        ];

        csvContent += summary
          .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
          .join('\r\n');

        downloadFile(csvContent, `AT_Specialists_Equipment_Hire_Schedule_${new Date().toISOString().split('T')[0]}.csv`);
      } else {
        const finHeaders = [
          'Date',
          'Settled Orders Count',
          'Gross Sales (AUD Inc GST)',
          'Net Sales (AUD Ex GST)',
          'GST Tax Liability (AUD)',
          'Wholesale COGS (AUD 58%)',
          'Net Profit Take-Home (AUD)',
          'Profit Margin (%)',
        ];

        const finRows = financialAnalytics.dailyRows.map((r) => [
          r.date,
          r.orderCount,
          r.grossRevenue.toFixed(2),
          r.netRevenue.toFixed(2),
          r.gst.toFixed(2),
          r.cogs.toFixed(2),
          r.netProfit.toFixed(2),
          r.profitMargin.toFixed(1) + '%',
        ]);

        const summary = [
          ['AT SPECIALISTS AUSTRALIA - COMPLETE MASTER BUSINESS & FINANCIAL REPORT'],
          ['Generated On:', timestamp],
          ['Date Filter Range:', dateRangeStr],
          ['Tax Mode Setting:', taxMode === 'standard' ? 'Standard 10% Taxable GST' : '0% GST (NDIS Sec 38-45 Exempt)'],
          [],
          ['1. FINANCIAL PERFORMANCE SUMMARY'],
          ['Total Gross Revenue (Inc GST):', `$${financialAnalytics.grossRevenue.toFixed(2)} AUD`],
          ['Total Net Revenue (Ex GST):', `$${financialAnalytics.netRevenue.toFixed(2)} AUD`],
          ['Total GST Tax Liability:', `$${financialAnalytics.gstCollected.toFixed(2)} AUD`],
          ['Estimated Wholesale COGS (~58%):', `$${financialAnalytics.estimatedCogs.toFixed(2)} AUD`],
          ['Net Profit Take-Home:', `$${financialAnalytics.netProfit.toFixed(2)} AUD`],
          ['Net Profit Margin:', `${financialAnalytics.profitMargin.toFixed(1)}%`],
          ['Average Order Value:', `$${financialAnalytics.avgOrderValue.toFixed(2)} AUD`],
          ['Outright Purchase Sales Revenue:', `$${financialAnalytics.buyRevenue.toFixed(2)} AUD (${financialAnalytics.buyOrders} orders)`],
          ['Equipment Hire Sales Revenue:', `$${financialAnalytics.hireRevenue.toFixed(2)} AUD (${financialAnalytics.hireOrders} hires)`],
          ['NDIS Quotes Active Pipeline Value:', `$${financialAnalytics.totalQuotesValue.toFixed(2)} AUD (${financialAnalytics.activeQuotesCount} quotes)`],
          [],
          ['2. ORDER FULFILLMENT PROGRESSION'],
          ['Pending Orders:', financialAnalytics.pendingOrdersCount],
          ['Processing in Warehouse:', financialAnalytics.processingOrdersCount],
          ['Shipped & In Transit:', financialAnalytics.shippedOrdersCount],
          ['Delivered & Completed:', financialAnalytics.deliveredOrdersCount],
          [],
          ['3. INVENTORY & WAREHOUSE SUMMARY'],
          ['Total Inventory Valuation:', `$${stockAnalytics.totalInventoryValue.toFixed(2)} AUD`],
          ['Total Units on Hand:', stockAnalytics.totalStockUnits],
          ['Low Stock Alerts Count:', stockAnalytics.lowStockCount],
          ['Out of Stock Items Count:', stockAnalytics.outOfStockCount],
          [],
          ['4. DAILY-WISE REVENUE, GST & PROFIT BREAKDOWN'],
          finHeaders,
          ...finRows,
        ];

        csvContent += summary
          .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
          .join('\r\n');

        downloadFile(csvContent, `AT_Specialists_Master_Business_Report_${new Date().toISOString().split('T')[0]}.csv`);
      }

      setExportMessage('Excel Downloaded!');
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Failed to export Excel report', err);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-slate-800">
      {/* 1. TOP HEADER WITH REPORT SWITCHER & EXPORT BUTTONS */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Audited Reports & Intelligence
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Reports & Business Intelligence
            </h1>
            <p className="text-slate-500 text-xs sm:text-sm mt-0.5 font-normal">
              Itemized financial revenue, ATO GST liability, sales progression pipeline, warehouse stock valuation, tax invoices, and hire equipment schedules.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleExportExcel('active')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-xs sm:text-sm font-medium rounded-xl transition-all shadow-xs cursor-pointer"
              title="Download Excel spreadsheet report for current active tab"
            >
              {isExporting ? <Check className="w-4 h-4" /> : <FileSpreadsheet className="w-4 h-4" />}
              <span>{exportMessage || 'Download Excel Report'}</span>
            </button>

            <button
              type="button"
              onClick={() => handleExportExcel('all')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs sm:text-sm font-medium rounded-xl transition-all shadow-xs cursor-pointer"
              title="Download Master Report with Financials, Stock & Invoices"
            >
              <Download className="w-4 h-4" />
              <span>Master All-in-One Report</span>
            </button>
          </div>
        </div>

        {/* 2. REPORT TAB SELECTOR */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {[
            { id: 'financial' as const, label: 'Financial & Profit Report', icon: DollarSign, badge: `${filteredOrders.length} Orders` },
            { id: 'stock' as const, label: 'Stock & Inventory Valuation', icon: Boxes, badge: `${products.length} Products` },
            { id: 'invoices' as const, label: 'Invoices & Tax Settlements', icon: Receipt, badge: `${filteredOrders.length} Invoices` },
            { id: 'rentals' as const, label: 'Equipment Hire & Rentals', icon: Clock, badge: `${rentalAnalytics.totalHiresCount} Hires` },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#147A7A] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. CALENDAR & DATE RANGE CONTROLS BAR (Applies across reports) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5 mr-1">
            <Calendar className="w-3.5 h-3.5 text-[#147A7A]" />
            Date Range:
          </span>

          {[
            { id: 'today' as const, label: 'Today' },
            { id: 'yesterday' as const, label: 'Yesterday' },
            { id: '7d' as const, label: 'Last 7d' },
            { id: '14d' as const, label: 'Last 14d' },
            { id: '30d' as const, label: 'Last 30d' },
            { id: 'this_month' as const, label: 'This Month' },
            { id: 'all' as const, label: 'All Time' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetChange(preset.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                datePreset === preset.id
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom Calendar Date Inputs */}
        <div className="flex flex-wrap items-center gap-2 pt-2 xl:pt-0 border-t xl:border-t-0 border-slate-100">
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <span className="text-slate-400">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setDatePreset('all');
              }}
              className="bg-transparent text-slate-800 font-medium outline-none cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setDatePreset('all');
              }}
              className="bg-transparent text-slate-800 font-medium outline-none cursor-pointer"
            />
          </div>

          {(dateFrom || dateTo) && (
            <button
              type="button"
              onClick={() => handlePresetChange('all')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-medium rounded-xl transition-all cursor-pointer"
              title="Reset date filter"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FINANCIAL & REVENUE REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* STAT CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Gross Sales (Inc. GST)</span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(financialAnalytics.grossRevenue)}</p>
              <p className="text-xs text-slate-500 font-normal">
                {financialAnalytics.paidOrdersCount} of {filteredOrders.length} orders settled ({financialAnalytics.conversionRate.toFixed(0)}%)
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Sales (Ex. GST)</span>
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(financialAnalytics.netRevenue)}</p>
              <p className="text-xs text-slate-500 font-normal">Pre-tax business turnover</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">ATO 10% GST Liability</span>
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(financialAnalytics.gstCollected)}</p>
              <p className="text-xs text-slate-500 font-normal">
                {taxMode === 'standard' ? 'Tax remittable to ATO' : 'NDIS Medical GST-Free'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Net Profit Take-Home</span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-emerald-700">{formatCurrency(financialAnalytics.netProfit)}</p>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                  {financialAnalytics.profitMargin.toFixed(1)}% Margin
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal">
                Wholesale COGS: {formatCurrency(financialAnalytics.estimatedCogs)} (~58%)
              </p>
            </div>
          </div>

          {/* ORDER FULFILLMENT & SALES PROGRESSION PIPELINE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#147A7A]" />
                  <span>Order Fulfillment &amp; Sales Progression Pipeline</span>
                </h2>
                <p className="text-xs text-slate-500 font-normal">
                  Live order tracking from clinical triage and warehouse packing through freight dispatch.
                </p>
              </div>
              <Link
                to="/at/orders"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#147A7A] hover:text-[#106262]"
              >
                <span>Open Orders Queue</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <Link
                to="/at/orders?status=pending"
                className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 hover:bg-amber-100/70 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Pending Check</span>
                  <AlertCircle className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-2xl font-bold text-amber-900 font-mono">{financialAnalytics.pendingOrdersCount}</span>
                <p className="text-[11px] text-amber-700 mt-1">Awaiting clinical or payment check</p>
              </Link>

              <Link
                to="/at/orders?status=processing"
                className="p-4 rounded-xl bg-violet-50/70 border border-violet-200/80 hover:bg-violet-100/70 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-violet-800 uppercase tracking-wider">Processing</span>
                  <Clock className="w-4 h-4 text-violet-600 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-2xl font-bold text-violet-900 font-mono">{financialAnalytics.processingOrdersCount}</span>
                <p className="text-[11px] text-violet-700 mt-1">Warehouse picking &amp; assembly</p>
              </Link>

              <Link
                to="/at/orders?status=shipped"
                className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200/80 hover:bg-cyan-100/70 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-cyan-800 uppercase tracking-wider">Shipped &amp; Transit</span>
                  <Truck className="w-4 h-4 text-cyan-600 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-2xl font-bold text-cyan-900 font-mono">{financialAnalytics.shippedOrdersCount}</span>
                <p className="text-[11px] text-cyan-700 mt-1">With courier / freight carrier</p>
              </Link>

              <Link
                to="/at/orders?status=delivered"
                className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 hover:bg-emerald-100/70 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Delivered</span>
                  <CheckCircle className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                </div>
                <span className="text-2xl font-bold text-emerald-900 font-mono">{financialAnalytics.deliveredOrdersCount}</span>
                <p className="text-[11px] text-emerald-700 mt-1">Delivered to participant</p>
              </Link>
            </div>

            {/* Channels & NDIS Intelligence Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Direct Purchases</span>
                  <ShoppingCart className="w-4 h-4 text-[#147A7A]" />
                </div>
                <p className="text-xl font-bold text-slate-900 mt-2">{formatCurrency(financialAnalytics.buyRevenue)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{financialAnalytics.buyOrders} outright equipment orders</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Equipment Hire Revenue</span>
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xl font-bold text-amber-800 mt-2">{formatCurrency(financialAnalytics.hireRevenue)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{financialAnalytics.hireOrders} clinical rental contracts</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">NDIS Quotes Pipeline</span>
                  <FileText className="w-4 h-4 text-purple-600" />
                </div>
                <p className="text-xl font-bold text-purple-900 mt-2">{formatCurrency(financialAnalytics.totalQuotesValue)}</p>
                <p className="text-xs text-slate-500 mt-0.5">{financialAnalytics.activeQuotesCount} active quotes for plan managers</p>
              </div>
            </div>
          </div>

          {/* DAILY REVENUE, GST & PROFIT BREAKDOWN TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Daily-Wise Financial &amp; Profit Audit</h2>
                <p className="text-xs text-slate-500 font-normal">
                  Itemized daily performance with Gross Sales, Ex-GST Revenue, GST tax liability, and Net Profit take-home.
                </p>
              </div>

              {/* Tax Mode Switcher */}
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 self-start sm:self-auto">
                <span className="text-xs font-medium text-slate-500 pl-1.5">Tax Mode:</span>
                <button
                  type="button"
                  onClick={() => setTaxMode('standard')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    taxMode === 'standard' ? 'bg-[#147A7A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Standard 10% GST
                </button>
                <button
                  type="button"
                  onClick={() => setTaxMode('ndis-free')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    taxMode === 'ndis-free' ? 'bg-[#147A7A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  NDIS GST-Free (Sec 38-45)
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-xs font-semibold">
                    <th className="py-3 px-4 text-left font-semibold">Date</th>
                    <th className="py-3 px-3 text-center font-semibold">Settled Orders</th>
                    <th className="py-3 px-4 text-right font-semibold">Gross Sales (Inc. GST)</th>
                    <th className="py-3 px-4 text-right font-semibold">Net Sales (Ex. GST)</th>
                    <th className="py-3 px-4 text-right font-semibold">GST Liability</th>
                    <th className="py-3 px-4 text-right font-semibold">Est. COGS (58%)</th>
                    <th className="py-3 px-4 text-right font-semibold text-emerald-700">Net Profit Take-Home</th>
                    <th className="py-3 px-3 text-center font-semibold">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financialAnalytics.dailyRows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-700 text-xs">No settled orders found for selected date range</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Try widening the calendar date filter or resetting to All Time.</p>
                      </td>
                    </tr>
                  ) : (
                    financialAnalytics.dailyRows.map((row) => {
                      const isToday = row.date === new Date().toISOString().split('T')[0];

                      return (
                        <tr key={row.date} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-800 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{row.date}</span>
                              {isToday && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-800">
                                  Today
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 font-medium rounded-full text-xs border border-blue-100">
                              {row.orderCount} {row.orderCount === 1 ? 'order' : 'orders'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-slate-900 whitespace-nowrap font-mono">
                            {formatCurrency(row.grossRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-700 whitespace-nowrap">
                            {formatCurrency(row.netRevenue)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                            {formatCurrency(row.gst)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500 whitespace-nowrap">
                            {formatCurrency(row.cogs)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                            {formatCurrency(row.netProfit)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              {row.profitMargin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STOCK & INVENTORY VALUATION REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <div className="space-y-6">
          {/* STAT CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Inventory Valuation</span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(stockAnalytics.totalInventoryValue)}</p>
              <p className="text-xs text-slate-500 font-normal">Physical asset retail value in warehouse</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Stock Units on Hand</span>
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Boxes className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stockAnalytics.totalStockUnits} Units</p>
              <p className="text-xs text-slate-500 font-normal">{products.length} registered product lines</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Low Stock Warnings</span>
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-700">{stockAnalytics.lowStockCount} Items</p>
              <p className="text-xs text-slate-500 font-normal">Below threshold &bull; Reorder required</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Out of Stock Lines</span>
                <div className="p-2 bg-red-50 text-red-700 rounded-xl">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-red-700">{stockAnalytics.outOfStockCount} Items</p>
              <p className="text-xs text-slate-500 font-normal">0 warehouse stock units remaining</p>
            </div>
          </div>

          {/* STOCK INVENTORY TABLE WITH SEARCH & FILTERS */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Warehouse Inventory Valuation &amp; Stock Ledger</h2>
                <p className="text-xs text-slate-500 font-normal">Live equipment asset counts, buy prices, total valuations, and reorder alerts.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={stockSearch}
                    onChange={(e) => setStockSearch(e.target.value)}
                    placeholder="Search product, SKU, brand..."
                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#147A7A] w-52"
                  />
                </div>

                <select
                  value={stockCategoryFilter}
                  onChange={(e) => setStockCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-[#147A7A] cursor-pointer"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c === 'all' ? 'All Categories' : c.replace(/-/g, ' ').toUpperCase()}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStockHealthFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      stockHealthFilter === 'all' ? 'bg-[#147A7A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockHealthFilter('low')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      stockHealthFilter === 'low' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Low ({stockAnalytics.lowStockCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockHealthFilter('out')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      stockHealthFilter === 'out' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Out ({stockAnalytics.outOfStockCount})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-xs font-semibold">
                    <th className="py-3 px-4 text-left font-semibold">Equipment Product &amp; SKU</th>
                    <th className="py-3 px-3 text-left font-semibold">Category</th>
                    <th className="py-3 px-3 text-center font-semibold">Stock On Hand</th>
                    <th className="py-3 px-4 text-right font-semibold">Unit Price</th>
                    <th className="py-3 px-4 text-right font-semibold">Total Valuation</th>
                    <th className="py-3 px-3 text-center font-semibold">GST Classification</th>
                    <th className="py-3 px-3 text-center font-semibold">Stock Health</th>
                    <th className="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stockAnalytics.filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-700 text-xs">No equipment matches search filters</p>
                      </td>
                    </tr>
                  ) : (
                    stockAnalytics.filteredProducts.map((p) => {
                      const totalVal = (p.stock || 0) * p.price;
                      const isLow = p.stock <= (p.lowStockThreshold || 10) && p.stock > 0;
                      const isOut = p.stock === 0;

                      return (
                        <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 p-1 flex-shrink-0 flex items-center justify-center">
                                <img
                                  src={proxyImageUrl(p.image)}
                                  alt=""
                                  className="w-full h-full object-contain"
                                  onError={handleImageError}
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 truncate max-w-xs">{p.name}</p>
                                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                  {p.sku} &middot; <span className="text-[#147A7A] font-medium font-sans">{p.brand}</span>
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-xs font-medium text-slate-600 capitalize">
                              {p.category.replace(/-/g, ' ')}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-medium text-slate-800 whitespace-nowrap">
                            {p.stock} units
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-medium text-slate-800 whitespace-nowrap">
                            {formatCurrency(p.price)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-semibold text-[#147A7A] whitespace-nowrap">
                            {formatCurrency(totalVal)}
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span className="text-xs font-medium text-slate-600">
                              {p.gstType === 'gst-free' ? '0% GST-Free' : `${p.gstRate || 10}% GST`}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center whitespace-nowrap">
                            <span
                              className={`text-xs font-semibold ${
                                isOut
                                  ? 'text-red-700 font-bold'
                                  : isLow
                                  ? 'text-amber-700 font-bold'
                                  : 'text-slate-700'
                              }`}
                            >
                              {isOut ? 'Out of Stock' : isLow ? `Low (${p.stock})` : 'In Stock'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              to="/at/products"
                              className="inline-flex items-center gap-1 text-xs font-medium text-[#147A7A] hover:text-[#106262] cursor-pointer"
                            >
                              <span>Manage</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: INVOICES & TAX SETTLEMENTS REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'invoices' && (
        <div className="space-y-6">
          {/* STAT CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Invoiced Volume</span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoiceAnalytics.totalInvoiced)}</p>
              <p className="text-xs text-slate-500 font-normal">{filteredOrders.length} total generated tax invoices</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Settled &amp; Paid Invoices</span>
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoiceAnalytics.paidInvoicedTotal)}</p>
              <p className="text-xs text-slate-500 font-normal">{invoiceAnalytics.paidInvoicesCount} invoices reconciled &amp; paid</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Pending Remittances</span>
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-700">{formatCurrency(invoiceAnalytics.pendingInvoicedTotal)}</p>
              <p className="text-xs text-slate-500 font-normal">{invoiceAnalytics.pendingInvoicesCount} awaiting NDIS plan payment</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">GST Tax Invoiced</span>
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <FileText className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(invoiceAnalytics.totalGstInvoiced)}</p>
              <p className="text-xs text-slate-500 font-normal">Itemized GST liability on records</p>
            </div>
          </div>

          {/* INVOICES LEDGER TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Tax Invoices &amp; Financial Settlement Ledger</h2>
                <p className="text-xs text-slate-500 font-normal">Searchable ledger of all formal ATO and NDIS tax invoices with itemized totals.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={invoiceSearch}
                    onChange={(e) => setInvoiceSearch(e.target.value)}
                    placeholder="Search invoice #, customer..."
                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#147A7A] w-60"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setInvoiceStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      invoiceStatusFilter === 'all' ? 'bg-[#147A7A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({filteredOrders.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceStatusFilter('paid')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      invoiceStatusFilter === 'paid' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Paid ({invoiceAnalytics.paidInvoicesCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setInvoiceStatusFilter('pending')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      invoiceStatusFilter === 'pending' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Pending ({invoiceAnalytics.pendingInvoicesCount})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-xs font-semibold">
                    <th className="py-3 px-4 text-left font-semibold">Invoice ID</th>
                    <th className="py-3 px-3 text-left font-semibold">Customer Profile</th>
                    <th className="py-3 px-3 text-left font-semibold">Issue Date</th>
                    <th className="py-3 px-3 text-center font-semibold">Settlement Status</th>
                    <th className="py-3 px-3 text-right font-semibold">Delivery</th>
                    <th className="py-3 px-3 text-right font-semibold">GST</th>
                    <th className="py-3 px-4 text-right font-semibold">Total Invoiced</th>
                    <th className="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceAnalytics.filteredInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-700 text-xs">No tax invoices found matching criteria</p>
                      </td>
                    </tr>
                  ) : (
                    invoiceAnalytics.filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">
                          {inv.id}
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-900">{inv.customerName}</p>
                          <p className="text-[11px] text-slate-500 font-normal">{inv.customerEmail}</p>
                        </td>
                        <td className="py-3 px-3 text-xs font-mono text-slate-600">
                          {inv.createdAt}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              (inv.paymentStatus || '').toLowerCase() === 'paid'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                            }`}
                          >
                            {(inv.paymentStatus || '').toLowerCase() === 'paid' ? 'Paid / Settled' : 'Pending Remittance'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {inv.deliveryTotal !== undefined && inv.deliveryTotal > 0
                            ? formatCurrency(inv.deliveryTotal)
                            : 'FREE'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {inv.gstTotal && inv.gstTotal > 0 ? formatCurrency(inv.gstTotal) : '$0.00'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-[#147A7A] text-sm">
                          {formatCurrency(inv.total)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to={`/at/invoices?search=${encodeURIComponent(inv.id)}`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#147A7A] hover:text-[#106262] cursor-pointer"
                          >
                            <span>View Invoice</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EQUIPMENT HIRE & RENTALS SCHEDULE REPORT */}
      {/* ========================================================================= */}
      {activeTab === 'rentals' && (
        <div className="space-y-6">
          {/* STAT CARDS ROW */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Equipment On Hire</span>
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-amber-700">{rentalAnalytics.totalHiresCount} Units</p>
              <p className="text-xs text-slate-500 font-normal">
                {rentalAnalytics.activeCount} active &bull; {rentalAnalytics.dueSoonCount} due soon &bull; {rentalAnalytics.overdueCount} overdue
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Rental Revenue</span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatCurrency(rentalAnalytics.totalRentalRevenue)}</p>
              <p className="text-xs text-slate-500 font-normal">Cumulative hire fees collected</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Average Hire Period</span>
                <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">3.8 Weeks</p>
              <p className="text-xs text-slate-500 font-normal">Clinical trial to purchase pathway</p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Clinical Sanitised Fleet</span>
                <div className="p-2 bg-purple-50 text-purple-700 rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">100% Pass</p>
              <p className="text-xs text-slate-500 font-normal">AS/NZS 3760 Medical Compliance</p>
            </div>
          </div>

          {/* RENTALS SCHEDULE TABLE */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Clinical Equipment Hire &amp; Rental Schedule</h2>
                <p className="text-xs text-slate-500 font-normal">Live tracking of client rental terms, scheduled return due dates, and courier pickups.</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={rentalSearch}
                    onChange={(e) => setRentalSearch(e.target.value)}
                    placeholder="Search rental order, client..."
                    className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 outline-none focus:border-[#147A7A] w-60"
                  />
                </div>

                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setRentalStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      rentalStatusFilter === 'all' ? 'bg-[#147A7A] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({rentalAnalytics.totalHiresCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentalStatusFilter('active')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      rentalStatusFilter === 'active' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Active ({rentalAnalytics.activeCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentalStatusFilter('due_soon')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      rentalStatusFilter === 'due_soon' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Due Soon ({rentalAnalytics.dueSoonCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setRentalStatusFilter('overdue')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      rentalStatusFilter === 'overdue' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Overdue ({rentalAnalytics.overdueCount})
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-600 text-xs font-semibold">
                    <th className="py-3 px-4 text-left font-semibold">Order &amp; Item</th>
                    <th className="py-3 px-3 text-left font-semibold">Client Contact</th>
                    <th className="py-3 px-3 text-center font-semibold">Hire Duration</th>
                    <th className="py-3 px-3 text-right font-semibold">Weekly Rate</th>
                    <th className="py-3 px-3 text-right font-semibold">Total Hire Cost</th>
                    <th className="py-3 px-3 text-left font-semibold">Return Due Date</th>
                    <th className="py-3 px-3 text-center font-semibold">Status</th>
                    <th className="py-3 px-4 text-right font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rentalAnalytics.filteredRentals.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                        <p className="font-semibold text-slate-700 text-xs">No active equipment rentals found</p>
                      </td>
                    </tr>
                  ) : (
                    rentalAnalytics.filteredRentals.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-900">{r.productName}</p>
                          <p className="text-[11px] font-mono text-[#147A7A] mt-0.5">
                            Order #{r.orderId} &middot; Qty: {r.quantity}
                          </p>
                        </td>
                        <td className="py-3 px-3">
                          <p className="font-medium text-slate-900">{r.customerName}</p>
                          <p className="text-[11px] text-slate-500 font-normal">{r.customerEmail}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{r.customerPhone}</p>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 font-medium rounded-full text-xs border border-amber-200/60">
                            {r.hireWeeks} Weeks
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-700">
                          {formatCurrency(r.weeklyRate)}/wk
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium text-slate-900">
                          {formatCurrency(r.totalPrice)}
                        </td>
                        <td className="py-3 px-3 font-mono font-medium text-slate-800">
                          {r.returnDueDate}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <span className={`text-xs font-semibold ${
                            r.status === 'overdue'
                              ? 'text-red-600 font-bold'
                              : r.status === 'due_soon'
                              ? 'text-amber-600 font-bold'
                              : 'text-emerald-700'
                          }`}>
                            {r.status === 'overdue' ? 'Overdue Return' : r.status === 'due_soon' ? 'Due Soon' : 'Active on Hire'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link
                            to="/at/rentals"
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#147A7A] hover:text-[#106262] cursor-pointer"
                          >
                            <span>View Schedule</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminAnalytics;
