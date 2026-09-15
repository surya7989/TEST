import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  Users,
  FileText,
  Building2,
  Award,
  BookOpen,
  Lock,
  Clock,
  Sparkles,
  ArrowRight,
  Armchair,
} from 'lucide-react';
import {
  AT_DEPARTMENTS,
  getDepartmentCount,
  getDepartmentSubcategories,
  getDepartmentHref,
  getCuratedDepartmentSubcategories,
  getExactSubcategoryProducts,
} from '@/data/departments';
import { getSubcategories } from '@/data/categories';
import { PRODUCTS, useProducts, resolveProductBrand } from '@/data/products';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';
import { getVariantPriceInfo } from '@/lib/productPricing';

const DEPARTMENT_FEATURED_MAP: Record<string, {
  id: string;
  badge: string;
  tagline: string;
}> = {
  chairs: {
    id: 'prod-accora-configura-comfort-black',
    badge: 'Premier Lift Chair',
    tagline: 'Configura® posture & tilt-in-space riser recliner',
  },
  bedroom: {
    id: 'prod-accora-empresa-long-term-care-bed-skandi-lissa-oak',
    badge: 'Clinical Care Bed',
    tagline: 'Empresa LTC floor-level electric profiling bed',
  },
  wheelchairs: {
    id: 'prod-aspire-vida-x',
    badge: 'Ultralight Wheelchair',
    tagline: 'Aspire VIDA X lightweight foldable transit chair',
  },
  'bathroom-and-toilet': {
    id: 'prod-aquatec-ocean-ergo-vip-tilt-in-space-shower-commode',
    badge: 'Clinical Commode',
    tagline: 'Aquatec Ocean Ergo VIP ergonomic tilt-in-space commode',
  },
  'mobility-aids': {
    id: 'prod-aspire-vogue-adventure',
    badge: 'All-Terrain Walker',
    tagline: 'Aspire Vogue Adventure seat walker with pneumatic tyres',
  },
  'patient-handling': {
    id: 'prod-arjo-sara-stedy',
    badge: 'Sit-to-Stand Aid',
    tagline: 'Arjo Sara Stedy ergonomic standing & transfer aid',
  },
  'daily-living-aids': {
    id: 'prod-uccello-kettle',
    badge: 'Assisted Living Aid',
    tagline: 'Uccello power-assisted effortless tipping kettle',
  },
  'pressure-care-cushions': {
    id: 'prod-roho-mosaic-cushion',
    badge: 'Pressure Care Cushion',
    tagline: 'ROHO® Mosaic interconnected air-cell cushion',
  },
  paediatric: {
    id: 'prod-vicair-junior-vector-o2-paediatric-wheelchair-cushion',
    badge: 'Paediatric Seating',
    tagline: 'Vicair® Junior Vector O2 specialized paediatric cushion',
  },
  bariatric: {
    id: 'prod-accora-configura-bariatric-tis-vinyl',
    badge: 'Heavy-Duty Bariatric',
    tagline: 'Configura® Bariatric tilt-in-space chair up to 300kg',
  },
  'mobility-ramps': {
    id: 'prod-invacare-edge-barrier-limiter-ebl-ramp',
    badge: 'Portable Access Ramp',
    tagline: 'Invacare® EBL lightweight folding barrier ramp',
  },
  'for-carers': {
    id: 'prod-tena-proskin-pants-super-large',
    badge: 'Carer Continence Priority',
    tagline: 'TENA ProSkin pull-ups, belted briefs & daily protection',
  },
  hire: {
    id: 'prod-accora-configura-comfort-black',
    badge: 'Hire Fleet Priority',
    tagline: 'Immediate Melbourne & nationwide clinical hire delivery',
  },
};

export function MainNavigation() {
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isNdisDropdownOpen, setIsNdisDropdownOpen] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);

  // Active category in desktop mega-menu
  const [activeCategorySlug, setActiveCategorySlug] = useState<string>('chairs');

  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const ndisDropdownRef = useRef<HTMLDivElement>(null);
  const companyDropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (setter: (v: boolean) => void) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setter(true);
  };

  const handleMouseLeave = (setter: (v: boolean) => void) => {
    timeoutRef.current = setTimeout(() => {
      setter(false);
    }, 200);
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (ndisDropdownRef.current && !ndisDropdownRef.current.contains(e.target as Node)) {
        setIsNdisDropdownOpen(false);
      }
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(e.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const ndisLinks = [
    { label: 'NDIS Equipment Guide', href: '/ndis?tab=guide', desc: 'Low, Mid & High-Cost AT pathways and funding codes', icon: BookOpen },
    { label: 'Plan & Self Managed', href: '/ndis?tab=plan-managed', desc: '0 out-of-pocket ordering & direct Plan Manager billing', icon: ShieldCheck },
    { label: 'Support Coordinators', href: '/ndis?tab=support-coordinators', desc: 'Fast quotes within 2 hours & priority participant portal', icon: Users },
    { label: 'Occupational Therapists', href: '/ndis?tab=occupational-therapists', desc: 'In-home trial fleet bookings & joint clinical assessments', icon: FileText },
  ];

  const companyLinks = [
    { label: 'About AT Specialists', href: '/about', desc: "Australia's dedicated clinical assistive technology provider", icon: Building2 },
    { label: 'Our Clinical Team', href: '/team', desc: 'Meet our registered Occupational Therapists and ATPs', icon: Award },
    { label: 'Brands We Stock', href: '/brands', desc: 'Accora, Etac, Invacare, Permobil, Roho, Sunrise & more', icon: Sparkles },
    { label: 'Privacy Policy', href: '/privacy', desc: 'Australian Privacy Principles & NDIS data safeguards', icon: Lock },
  ];

  const liveProducts = useProducts();

  // Active category in mega menu
  const activeCategory = AT_DEPARTMENTS.find((c) => c.id === activeCategorySlug) || AT_DEPARTMENTS[0];
  const [activeSubcategorySlug, setActiveSubcategorySlug] = useState<string>('lift-chairs');

  const activeSubcategories = useMemo(() => {
    if (!activeCategory) return [];
    return getCuratedDepartmentSubcategories(activeCategory.id, liveProducts);
  }, [activeCategory, liveProducts]);

  // Keep activeSubcategorySlug in sync when active category changes
  useEffect(() => {
    if (activeSubcategories.length > 0) {
      setActiveSubcategorySlug(activeSubcategories[0].slug);
    } else {
      setActiveSubcategorySlug('');
    }
  }, [activeCategorySlug, activeSubcategories]);

  const activeSubcategory = useMemo(() => {
    return activeSubcategories.find((s) => s.slug === activeSubcategorySlug) || activeSubcategories[0] || null;
  }, [activeSubcategories, activeSubcategorySlug]);

  // Exact matching products belonging to the hovered/selected subcategory ("small ones neatly")
  const subcategoryProducts = useMemo(() => {
    if (!activeCategory) return [];
    const targetSlug = activeSubcategorySlug || (activeSubcategories[0]?.slug ?? '');
    return getExactSubcategoryProducts(activeCategory.id, targetSlug, 100, liveProducts);
  }, [activeCategory, activeSubcategorySlug, activeSubcategories, liveProducts]);

  return (<>
      <nav
        className="hidden lg:block bg-[#0B1728] text-white select-none border-b border-[#142336] relative z-30"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-[1400px] mx-auto px-6 2xl:px-8 h-[46px] flex items-center justify-between">
          <div className="flex items-center h-full gap-1">
            {/* ========================================== */}
            {/* 1. SHOP BY CATEGORY MEGA DROPDOWN */}
            {/* ========================================== */}
            <div
              className="relative h-full"
              ref={categoryDropdownRef}
              onMouseEnter={() => handleMouseEnter(setIsCategoryDropdownOpen)}
              onMouseLeave={() => handleMouseLeave(setIsCategoryDropdownOpen)}
            >
              <button
                type="button"
                onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                className="flex items-center gap-2.5 h-full px-5 bg-[#147A7A] hover:bg-[#106262] text-white text-[13px] font-bold transition-colors cursor-pointer shadow-sm"
                aria-expanded={isCategoryDropdownOpen}
              >
                <Menu className="h-4 w-4" />
                <span>Shop by Category</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    isCategoryDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Desktop Mega-Menu Container (3-Tier Cascade: Category -> Subcategory -> Small Products) */}
              {isCategoryDropdownOpen && (<div
                  className="absolute top-full left-0 min-w-[760px] w-[1160px] xl:w-[1220px] max-w-[calc(100vw-2rem)] bg-white border border-gray-200/90 rounded-b-2xl shadow-2xl z-50 animate-fade-in text-[#0F1E2E] flex flex-col overflow-hidden max-h-[620px]"
                  onMouseEnter={() => handleMouseEnter(setIsCategoryDropdownOpen)}
                  onMouseLeave={() => handleMouseLeave(setIsCategoryDropdownOpen)}
                >
                  {/* Top: 3 Cascading Columns */}
                  <div className="flex-1 flex overflow-hidden min-h-[460px] max-h-[510px]">
                    {/* Tier 1: Primary Categories / Departments List (Column 1) */}
                    <div className="w-[260px] xl:w-[280px] flex-shrink-0 bg-slate-50/95 border-r border-gray-200/80 overflow-y-auto p-2.5 space-y-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                      <div className="px-3 py-2 border-b border-gray-200/80 mb-1.5 flex items-center justify-between">
                        <span className="text-[10.5px] font-black text-gray-400 uppercase tracking-wider">
                          Categories
                        </span>
                        <Link
                          to="/shop"
                          onClick={() => setIsCategoryDropdownOpen(false)}
                          className="text-[11px] font-bold text-[#147A7A] hover:underline"
                        >
                          All ({liveProducts.length}) →
                        </Link>
                      </div>

                      {AT_DEPARTMENTS.map((cat) => {
                        const IconComp = cat.icon;
                        const isActive = activeCategorySlug === cat.id;

                        return (<div
                            key={cat.id}
                            onMouseEnter={() => setActiveCategorySlug(cat.id)}
                            className={`group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all relative ${
                              isActive
                                ? 'bg-white text-[#147A7A] shadow-xs border border-teal-600/20 font-bold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:bg-[#147A7A] before:rounded-r'
                                : 'text-gray-700 hover:bg-white/80 hover:text-[#0F1E2E] font-semibold'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-1">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                                  isActive
                                    ? 'bg-[#147A7A] text-white shadow-2xs'
                                    : 'bg-white border border-gray-200/60 text-gray-400 group-hover:text-[#147A7A] group-hover:border-[#147A7A]/30'
                                }`}
                              >
                                <IconComp className="w-3.5 h-3.5" />
                              </div>
                              <span className="text-[12px] leading-snug truncate">{cat.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold transition-colors ${
                                  isActive
                                    ? 'bg-teal-50 text-[#147A7A]'
                                    : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600'
                                }`}
                              >
                                {getDepartmentCount(cat, liveProducts) || 0}
                              </span>
                              <ChevronRight
                                className={`w-3.5 h-3.5 transition-all ${
                                  isActive
                                    ? 'text-[#147A7A] translate-x-0.5'
                                    : 'text-gray-300 group-hover:text-gray-400'
                                }`}
                              />
                            </div>
                          </div>);
                      })}
                    </div>

                    {/* Tier 2: Subcategories List (Column 2) - "WHEN WE KEEP CATEGORY MEANS SUB CATEGORY COMING" */}
                    <div className="w-[280px] xl:w-[300px] flex-shrink-0 bg-white border-r border-gray-200/80 flex flex-col p-3 overflow-hidden">
                      <div className="pb-2.5 mb-2 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center flex-shrink-0">
                            {React.createElement(activeCategory?.icon || Armchair, { className: 'w-3.5 h-3.5' })}
                          </div>
                          <span className="text-[12.5px] font-black text-[#0F1E2E] truncate">
                            {activeCategory?.name}
                          </span>
                        </div>
                        <Link
                          to={activeCategory ? getDepartmentHref(activeCategory) : '/shop'}
                          onClick={() => setIsCategoryDropdownOpen(false)}
                          className="text-[10.5px] font-bold text-[#147A7A] hover:underline flex items-center gap-0.5 flex-shrink-0"
                        >
                          <span>All</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1.5 px-1">
                        Select Subcategory
                      </span>

                      <div className="flex-1 overflow-y-auto space-y-1 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
                        {activeSubcategories.length === 0 ? (<div className="p-4 text-center text-xs text-gray-400 bg-slate-50 rounded-xl border border-dashed border-gray-200 mt-2">
                            Explore the complete {activeCategory?.name} catalogue
                          </div>) : (activeSubcategories.map((sub) => {
                            const isSubActive = activeSubcategorySlug === sub.slug;

                            return (<div
                                key={sub.id}
                                onMouseEnter={() => setActiveSubcategorySlug(sub.slug)}
                                className={`group flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all ${
                                  isSubActive
                                    ? 'bg-teal-50 text-[#147A7A] font-bold border border-teal-200/80 shadow-2xs'
                                    : 'text-gray-700 hover:bg-slate-50 hover:text-[#0F1E2E] font-medium'
                                }`}
                              >
                                <Link
                                  to={activeCategory?.isHire ? `/hire?category=${sub.slug}` : `/shop/${sub.slug}`}
                                  onClick={() => setIsCategoryDropdownOpen(false)}
                                  className="text-[12px] truncate flex-1 min-w-0 text-left group-hover:text-[#147A7A] transition-colors"
                                >
                                  {sub.name}
                                </Link>
                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-1.5">
                                  {sub.productCount ? (<span
                                      className={`text-[9.5px] px-1.5 py-0.2 rounded font-bold transition-colors ${
                                        isSubActive
                                          ? 'bg-white text-[#147A7A] border border-teal-200'
                                          : 'bg-gray-100 text-gray-400 group-hover:bg-gray-200'
                                      }`}
                                    >
                                      {sub.productCount}
                                    </span>) : null}
                                  <ChevronRight
                                    className={`w-3.5 h-3.5 transition-all ${
                                      isSubActive
                                        ? 'text-[#147A7A] translate-x-0.5'
                                        : 'text-gray-300 group-hover:text-gray-400'
                                    }`}
                                  />
                                </div>
                              </div>);
                          }))}
                      </div>
                    </div>

                    {/* Tier 3: Small Product Cards (Column 3) - "WHEN WE KEEP SUB CATEGORY MEANS THAT PRODUCTS WILL COME SMALL ONES NEATLY" */}
                    <div className="flex-1 min-h-0 bg-slate-50/50 flex flex-col min-w-0 p-3.5 xl:p-4 overflow-hidden">
                      {/* Column 3 Header */}
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-gray-200/80 flex-shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[13px] font-black text-[#0F1E2E] truncate">
                            {activeSubcategory ? activeSubcategory.name : activeCategory?.name} Products
                          </span>
                          <span className="text-[10px] font-bold text-[#147A7A] bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200/60 flex-shrink-0">
                            {subcategoryProducts.length} Products
                          </span>
                        </div>
                        <Link
                          to={
                            activeCategory?.isHire
                              ? (activeSubcategory ? `/hire?category=${activeSubcategory.slug}` : '/hire')
                              : (activeSubcategory ? `/shop/${activeSubcategory.slug}` : activeCategory ? getDepartmentHref(activeCategory) : '/shop')
                          }
                          onClick={() => setIsCategoryDropdownOpen(false)}
                          className="text-[11px] font-bold text-[#147A7A] hover:underline flex items-center gap-1 flex-shrink-0"
                        >
                          <span>View All in Range</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>

                      {/* Small Products Grid - Full cards with smooth mouse-wheel scroll */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 content-start auto-rows-max overflow-y-auto overscroll-contain pr-2 pb-6 flex-1 min-h-0 scroll-smooth [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#147A7A]/70">
                        {subcategoryProducts.map((p) => (<Link
                            key={p.id}
                            to={`/product/${p.slug || p.id}`}
                            onClick={() => setIsCategoryDropdownOpen(false)}
                            className="group/pcard flex flex-col justify-between min-h-[210px] h-full flex-shrink-0 bg-white hover:bg-slate-50/60 border border-gray-200/80 hover:border-[#147A7A]/60 rounded-xl p-3 shadow-2xs hover:shadow-md transition-all text-left relative overflow-hidden"
                          >
                            {/* Product Thumbnail */}
                            <div className="h-24 w-full flex-shrink-0 bg-slate-50/80 rounded-lg p-2 flex items-center justify-center relative overflow-hidden mb-2 border border-gray-100/70">
                              <img
                                src={proxyImageUrl(p.image)}
                                alt={p.name}
                                className="w-full h-full object-contain group-hover/pcard:scale-105 transition-transform duration-200"
                                loading="lazy"
                                onError={handleImageError}
                              />
                              {p.hireAvailable && (<span className="absolute top-1.5 right-1.5 bg-amber-500 text-white text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded shadow-2xs">
                                  Hire
                                </span>)}
                              {(p.badge || p.tags?.some((t) => t.toLowerCase().includes('ndis'))) && (<span className="absolute top-1.5 left-1.5 bg-teal-600/90 text-white text-[8.5px] font-black px-1.5 py-0.5 rounded shadow-2xs">
                                  {p.badge || 'NDIS'}
                                </span>)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 flex flex-col justify-between min-w-0">
                              <div>
                                <span className="text-[9.5px] uppercase font-black text-[#147A7A] tracking-wider block truncate">
                                  {resolveProductBrand(p)}
                                </span>
                                <h4 className="text-[12px] font-bold text-[#0F1E2E] group-hover/pcard:text-[#147A7A] transition-colors line-clamp-2 leading-tight mt-0.5">
                                  {p.name}
                                </h4>
                              </div>

                              {/* Price & Direct Action */}
                              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
                                <div>
                                  {(() => {
                                    const info = getVariantPriceInfo(p as any);
                                    const effectiveBuyPrice = info.hasPricedVariants ? info.min : (p.buyPrice || 0);
                                    if (effectiveBuyPrice > 0) {
                                      return (
                                        <span className="text-[12.5px] font-black text-[#0F1E2E]">
                                          {info.hasPricedVariants && info.min !== info.max
                                            ? `From $${effectiveBuyPrice.toFixed(2)}`
                                            : `$${effectiveBuyPrice.toFixed(2)}`}
                                        </span>
                                      );
                                    }
                                    if (p.hirePrice > 0) {
                                      return (
                                        <span className="text-[11.5px] font-black text-[#E88D2A]">
                                          ${p.hirePrice}/wk
                                        </span>
                                      );
                                    }
                                    return (
                                      <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                                        Trial Eligible
                                      </span>
                                    );
                                  })()}
                                </div>
                                <span className="text-[10.5px] font-bold text-[#147A7A] group-hover/pcard:translate-x-0.5 transition-transform flex items-center gap-1">
                                  <span>View</span>
                                  <ArrowRight className="w-3 h-3" />
                                </span>
                              </div>
                            </div>
                          </Link>))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Feature Banners */}
                  <div className="grid grid-cols-3 gap-2.5 px-4 py-2.5 bg-slate-50 border-t border-gray-200/80 flex-shrink-0">
                    <Link
                      to="/hire"
                      onClick={() => setIsCategoryDropdownOpen(false)}
                      className="px-3 py-1.5 bg-white hover:bg-amber-50/60 rounded-xl border border-gray-200/70 hover:border-amber-200 flex items-center gap-2.5 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-md bg-[#FFF8ED] text-[#E88D2A] flex items-center justify-center flex-shrink-0">
                        <Clock className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-bold text-[#0F1E2E] truncate">
                          Equipment Hire Fleet
                        </span>
                        <span className="block text-[9.5px] text-gray-500 truncate">
                          100% rental credited to buy
                        </span>
                      </div>
                    </Link>

                    <Link
                      to="/ndis?tab=occupational-therapists"
                      onClick={() => setIsCategoryDropdownOpen(false)}
                      className="px-3 py-1.5 bg-white hover:bg-teal-50/60 rounded-xl border border-gray-200/70 hover:border-teal-200 flex items-center gap-2.5 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-md bg-teal-50 text-[#147A7A] flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-bold text-[#0F1E2E] truncate">
                          In-Home Clinical Trials
                        </span>
                        <span className="block text-[9.5px] text-gray-500 truncate">
                          OT assessments Australia-wide
                        </span>
                      </div>
                    </Link>

                    <Link
                      to="/ndis?tab=guide"
                      onClick={() => setIsCategoryDropdownOpen(false)}
                      className="px-3 py-1.5 bg-white hover:bg-sky-50/60 rounded-xl border border-gray-200/70 hover:border-sky-200 flex items-center gap-2.5 transition-colors"
                    >
                      <div className="w-6 h-6 rounded-md bg-sky-50 text-sky-700 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-[11px] font-bold text-[#0F1E2E] truncate">
                          NDIS Direct Billing
                        </span>
                        <span className="block text-[9.5px] text-gray-500 truncate">
                          Fast quotes issued within 2 hours
                        </span>
                      </div>
                    </Link>
                  </div>
                </div>)}
            </div>

            {/* 2. Direct Links */}
            <Link
              to="/hire"
              className="flex items-center h-full px-3.5 text-[13px] font-bold text-[#F59E0B] hover:text-[#FBBF24] hover:bg-white/5 transition-colors"
            >
              Equipment Hire
            </Link>

            <Link
              to="/for-carers"
              className="flex items-center h-full px-3.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-white/5 transition-colors"
            >
              For Carers
            </Link>

            {/* 3. NDIS Dropdown Menu */}
            <div
              className="relative h-full"
              ref={ndisDropdownRef}
              onMouseEnter={() => handleMouseEnter(setIsNdisDropdownOpen)}
              onMouseLeave={() => handleMouseLeave(setIsNdisDropdownOpen)}
            >
              <button
                type="button"
                onClick={() => setIsNdisDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 h-full px-3.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                aria-expanded={isNdisDropdownOpen}
              >
                <span>NDIS Hub</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                    isNdisDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {isNdisDropdownOpen && (<div
                  className="absolute top-full left-0 w-[380px] bg-white border border-gray-200 rounded-b-2xl shadow-2xl p-3 z-50 animate-fade-in text-[#0F1E2E]"
                  onMouseEnter={() => handleMouseEnter(setIsNdisDropdownOpen)}
                  onMouseLeave={() => handleMouseLeave(setIsNdisDropdownOpen)}
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      NDIS Pathways &amp; Support
                    </span>
                    <Link
                      to="/ndis"
                      onClick={() => setIsNdisDropdownOpen(false)}
                      className="text-[11px] font-bold text-[#147A7A] hover:underline"
                    >
                      NDIS Overview
                    </Link>
                  </div>
                  <div className="space-y-1">
                    {ndisLinks.map((item) => (<Link
                        key={item.label}
                        to={item.href}
                        onClick={() => setIsNdisDropdownOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#147A7A] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#147A7A] group-hover:text-white transition-colors">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[13px] font-bold text-[#0F1E2E] group-hover:text-[#147A7A] transition-colors">
                            {item.label}
                          </span>
                          <span className="block text-[11.5px] text-gray-500 line-clamp-1 leading-snug">
                            {item.desc}
                          </span>
                        </div>
                      </Link>))}
                  </div>
                </div>)}
            </div>

            {/* 4. Company Dropdown */}
            <div
              className="relative h-full"
              ref={companyDropdownRef}
              onMouseEnter={() => handleMouseEnter(setIsCompanyDropdownOpen)}
              onMouseLeave={() => handleMouseLeave(setIsCompanyDropdownOpen)}
            >
              <button
                type="button"
                onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                className="flex items-center gap-1.5 h-full px-3.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                aria-expanded={isCompanyDropdownOpen}
              >
                <span>Company</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                    isCompanyDropdownOpen ? 'rotate-180 text-white' : ''
                  }`}
                />
              </button>

              {isCompanyDropdownOpen && (<div
                  className="absolute top-full left-0 w-[360px] bg-white border border-gray-200 rounded-b-2xl shadow-2xl p-3 z-50 animate-fade-in text-[#0F1E2E]"
                  onMouseEnter={() => handleMouseEnter(setIsCompanyDropdownOpen)}
                  onMouseLeave={() => handleMouseLeave(setIsCompanyDropdownOpen)}
                >
                  <div className="px-3 py-2 border-b border-gray-100 mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      About AT Specialists
                    </span>
                  </div>
                  <div className="space-y-1">
                    {companyLinks.map((item) => (<Link
                        key={item.label}
                        to={item.href}
                        onClick={() => setIsCompanyDropdownOpen(false)}
                        className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-[#F8FAFC] transition-colors group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-teal-50 text-[#147A7A] flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-[#147A7A] group-hover:text-white transition-colors">
                          <item.icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-[13px] font-bold text-[#0F1E2E] group-hover:text-[#147A7A] transition-colors">
                            {item.label}
                          </span>
                          <span className="block text-[11.5px] text-gray-500 line-clamp-1 leading-snug">
                            {item.desc}
                          </span>
                        </div>
                      </Link>))}
                  </div>
                </div>)}
            </div>

            {/* 5. Resources */}
            <Link
              to="/resources"
              className="flex items-center h-full px-3.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-white/5 transition-colors"
            >
              Guides &amp; Resources
            </Link>

            {/* 6. Contact */}
            <Link
              to="/contact"
              className="flex items-center h-full px-3.5 text-[13px] font-semibold text-white/90 hover:text-white hover:bg-white/5 transition-colors"
            >
              Contact Us
            </Link>
          </div>

          {/* Right Action: Request Quote */}
          <div className="flex items-center gap-3">
            <Link
              to="/contact?type=ndis-quote"
              className="px-3.5 py-1.5 bg-[#E88D2A] hover:bg-[#D47C1E] text-white text-[12px] font-bold rounded-lg transition-all shadow-sm flex items-center gap-1.5"
            >
              <span>Request Written Quote</span>
            </Link>
          </div>
        </div>
      </nav>

    </>);
}