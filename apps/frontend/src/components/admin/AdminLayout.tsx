import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAdminStore } from '@/store/adminStore';
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bell,
  Search,
  Truck,
  Tag,
  Star,
  FileText,
  MessageSquare,
  Clock,
  BarChart3,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
  description: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export const navSections: NavSection[] = [
  {
    title: 'Overview & Intelligence',
    items: [
      { label: 'Executive Dashboard', icon: LayoutDashboard, path: '/at', description: 'Central command, live metrics & recent activity' },
      { label: 'Analytics & Reports', icon: BarChart3, path: '/at/analytics', description: 'Financial trends, ATO tax reports & stock health' },
    ],
  },
  {
    title: 'Catalog & Merchandising',
    items: [
      { label: 'Products & Inventory', icon: Package, path: '/at/products', description: 'Product catalog, stock levels, variants & NDIS codes' },
      { label: 'Promotions & Coupons', icon: Tag, path: '/at/promotions', description: 'Discount codes, percentage offers & active sales' },
    ],
  },
  {
    title: 'Orders & Fulfilment',
    items: [
      { label: 'Orders Queue', icon: ShoppingCart, path: '/at/orders', description: 'Customer orders, dispatch status & parcel tracking' },
      { label: 'NDIS Quotes', icon: FileText, path: '/at/quotes', description: 'NDIS participant quotations, approvals & conversions' },
      { label: 'Invoices & Documents', icon: Receipt, path: '/at/invoices', description: 'ATO tax invoices, PDF generator, email dispatch & NDIS quotes' },
      { label: 'Equipment Hire Fleet', icon: Clock, path: '/at/rentals', description: 'Clinical rental equipment schedules & returns' },
      { label: 'Shipping & Freight', icon: Truck, path: '/at/shipping', description: 'Australian shipping zones & courier rates' },
    ],
  },
  {
    title: 'Clients & Communications',
    items: [
      { label: 'Customer Directory', icon: Users, path: '/at/customers', description: 'Client CRM, NDIS participants & lifetime spend' },
      { label: 'Inquiries & Leads', icon: MessageSquare, path: '/at/inquiries', description: 'Contact requests, trial bookings & clinical triage' },
      { label: 'Reviews & Ratings', icon: Star, path: '/at/reviews', description: 'Product reviews moderation & verified buyer badges' },
    ],
  },
  {
    title: 'System & Settings',
    items: [
      { label: 'Store Settings', icon: Settings, path: '/at/settings', description: 'Business profile, PayPal gateway, bank & security' },
    ],
  },
];

const navItems = navSections.flatMap((s) => s.items);

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarOpen, toggleSidebar, logout, adminName, isAuthenticated, checkAuth, fetchAllData } = useAdminStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [topSearch, setTopSearch] = useState('');

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  // Strict Admin Auth Guard
  useEffect(() => {
    let active = true;
    checkAuth().then((authed) => {
      if (active) {
        if (!authed) {
          navigate('/at/login', { replace: true });
        } else {
          fetchAllData();
        }
        setAuthChecking(false);
      }
    });
    return () => { active = false; };
  }, [checkAuth, navigate, fetchAllData]);

  // A 401 on any admin-token API call means the session died after mount
  // (e.g. the 12h token cap). Bounce to login instead of showing dead pages.
  useEffect(() => {
    const onSessionExpired = () => {
      logout();
      navigate('/at/login', { replace: true });
    };
    window.addEventListener('at:admin-session-expired', onSessionExpired);
    return () => window.removeEventListener('at:admin-session-expired', onSessionExpired);
  }, [logout, navigate]);

  // Re-validate the session whenever the admin navigates — a token can expire
  // while the SPA shell stays mounted, and no single page re-checks it.
  useEffect(() => {
    let active = true;
    checkAuth().then((authed) => {
      if (active && !authed) {
        navigate('/at/login', { replace: true });
      }
    });
    return () => { active = false; };
  }, [location.pathname, checkAuth, navigate]);

  useEffect(() => {
    closeMobile();
  }, [location.pathname, closeMobile]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileOpen) closeMobile();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mobileOpen, closeMobile]);

  const handleLogout = () => {
    logout();
    navigate('/at/login');
  };

  const isNavActive = (item: NavItem) => {
    if (item.path === '/at') return location.pathname === '/at';
    return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
  };

  const renderSidebarContent = () => {
    return (
      <nav className="flex-1 py-3 px-2 space-y-3 overflow-y-auto">
        {navSections.map((section, sIdx) => (
          <div key={section.title} className="space-y-1">
            {sidebarOpen ? (
              <div className="px-3 pt-1 pb-1 text-[10px] font-bold text-teal-300/70 uppercase tracking-wider">
                {section.title}
              </div>
            ) : sIdx > 0 ? (
              <div className="my-2 mx-2 border-t border-white/10" />
            ) : null}

            <div className="space-y-0.5">
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                const active = isNavActive(item);

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      closeMobile();
                    }}
                    title={!sidebarOpen ? `${item.label} — ${item.description}` : item.description}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl transition-all duration-200 cursor-pointer select-none w-full text-left',
                      'py-2 text-xs sm:text-sm font-medium min-w-0',
                      sidebarOpen ? 'px-3' : 'px-0 justify-center',
                      active
                        ? 'bg-[#147A7A] text-white shadow-xs shadow-[#147A7A]/25 font-semibold ring-1 ring-teal-400/40'
                        : 'text-white/75 hover:text-white hover:bg-white/10'
                    )}
                  >
                    <ItemIcon className="w-4 h-4 flex-shrink-0 text-white/90" />
                    {sidebarOpen && (
                      <div className="flex items-center flex-1 min-w-0 justify-between">
                        <span className="truncate">{item.label}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    );
  };

  if (authChecking) {
    return (<div className="min-h-screen bg-[#0F1E2E] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-teal-500/20 border-t-teal-400 rounded-full animate-spin" />
          <p className="text-white/70 text-sm font-medium">Verifying Administrator Session...</p>
        </div>
      </div>);
  }

  if (!isAuthenticated) {
    return null;
  }

  return (<div className="min-h-screen bg-[#F1F5F9] flex">
      {/* Sidebar */}
      <aside
        className={cn('fixed inset-y-0 left-0 z-40 bg-[#0F1E2E] text-white transition-all duration-300 flex flex-col lg:overflow-visible',
          sidebarOpen ? 'w-64' : 'w-20',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0')}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-white/10 flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-white/10 p-0.5 ring-1 ring-white/20 flex-shrink-0 flex items-center justify-center">
            <img
              src="/images/logo.png"
              alt="AT Specialist Australia"
              className="w-full h-full object-contain rounded-full"
            />
          </div>
          {sidebarOpen && (<div className="overflow-hidden">
              <span className="font-bold text-sm tracking-wide block leading-tight text-white">AT Specialist</span>
              <span className="block text-[9.5px] text-teal-300/90 font-semibold tracking-wider uppercase">
                Australia &middot; Admin
              </span>
            </div>)}
        </div>

        {/* Nav */}
        {renderSidebarContent()}

        {/* Logout */}
        <div className="p-3 border-t border-white/10 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-white/70 hover:text-red-300 hover:bg-red-500/20 transition-all duration-200 w-full cursor-pointer"
            title={!sidebarOpen ? 'Logout' : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (<div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={closeMobile}
        />)}

      {/* Main content */}
      <div
        className={cn('flex-1 flex flex-col transition-all duration-300 min-w-0',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20')}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 h-14 lg:h-16 flex items-center px-3 sm:px-4 lg:px-6 gap-2 sm:gap-4 flex-shrink-0">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0 lg:hidden cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 cursor-pointer"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500 min-w-0">
            <Link to="/at" className="hover:text-[#147A7A]">
              Admin
            </Link>
            {location.pathname !== '/at' && (<>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="text-gray-800 font-medium capitalize truncate">
                  {location.pathname.split('/').pop()?.replace(/-/g, ' ')}
                </span>
              </>)}
          </div>

          <div className="flex-1" />

          {/* Quick Search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const q = topSearch.trim();
              if (!q) return;
              const upper = q.toUpperCase();
              if (upper.startsWith('ORD') || !isNaN(Number(q))) {
                navigate(`/at/orders?search=${encodeURIComponent(q)}`);
              } else if (upper.startsWith('NDIS') || upper.startsWith('QT')) {
                navigate(`/at/quotes?search=${encodeURIComponent(q)}`);
              } else if (q.includes('@')) {
                navigate(`/at/customers?search=${encodeURIComponent(q)}`);
              } else {
                navigate(`/at/products?search=${encodeURIComponent(q)}`);
              }
            }}
            className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 w-64 focus-within:border-[#147A7A] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#147A7A]/20 transition-all"
          >
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              placeholder="Search orders, quotes, products..."
              className="bg-transparent text-xs sm:text-sm outline-none w-full text-slate-800 placeholder:text-slate-400"
            />
          </form>

          {/* Notifications */}
          <Link to="/at/inquiries" className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0">
            <Bell className="w-5 h-5 text-gray-600" />
          </Link>

          {/* Admin avatar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 bg-[#147A7A] rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {adminName.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <span className="hidden lg:block text-sm font-medium text-gray-700">{adminName}</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto">
          <div className="max-w-[1600px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>);
}

export default AdminLayout;
