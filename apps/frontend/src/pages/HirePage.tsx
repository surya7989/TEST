import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  RotateCcw,
  Truck,
  Headphones,
  ArrowRight,
  CheckCircle,
  Search,
  Layers,
  Phone,
} from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts, type Product } from '@/data/products';
import { AT_DEPARTMENTS, getDepartmentSubcategories } from '@/data/departments';

const benefits = [
  {
    icon: RotateCcw,
    title: 'Flexible Hire Periods',
    description:
      'From 2 weeks to 12+ months. Extend, return or convert to purchase anytime — 100% of hire fees can be credited toward the purchase price.',
  },
  {
    icon: Truck,
    title: 'Rapid Direct Delivery',
    description:
      'Dispatched directly from clinical hubs with white-glove unboxing, demonstration and positioning by trained technicians.',
  },
  {
    icon: Headphones,
    title: 'Clinical Support Included',
    description:
      'Our registered Occupational Therapy team assists in selecting the right equipment, with full setup training and orientation at your home.',
  },
];

export function HirePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const categoryParam = searchParams.get('category');
  const allProducts = useProducts();
  const hireProducts = useMemo(() => allProducts.filter((p) => (p as any).available !== false && (p.hireAvailable || (p.hirePrice || 0) > 0)),
    [allProducts]);

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam || 'all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  // Department chips: same 12 AT departments as the menu, counted over hire products
  // (matches the Shop by Category grouping, including nested subcategories).
  const hireCategories = useMemo(() => {
    const list = AT_DEPARTMENTS.filter((d) => !d.isHire).map((dept) => {
      const subs = getDepartmentSubcategories(dept);
      const allSlugs = new Set([dept.shopSlug,...dept.slugs,...subs.map((s) => s.slug)]);
      const count = hireProducts.filter((p) =>
        (p.categories || []).some((c) => {
          const lc = (c || '').toLowerCase();
          return [...allSlugs].some((s) => lc.includes(s));
        })).length;

      return {
        key: dept.id,
        name: dept.name,
        desc: dept.blurb,
        icon: dept.icon,
        count,
      };
    }).filter((c) => c.count > 0);

    return [
      {
        key: 'all',
        name: 'All Equipment',
        desc: 'Browse entire flexible rental fleet',
        icon: Layers,
        count: hireProducts.length,
      },
      ...list,
    ];
  }, [hireProducts]);

  // Filtered hire products for on-page grid
  const filteredProducts = useMemo(() => {
    let list = hireProducts;

    if (selectedCategory !== 'all') {
      const dept = AT_DEPARTMENTS.find((d) => d.id === selectedCategory);
      const subs = dept ? getDepartmentSubcategories(dept) : [];
      const allSlugs = new Set([
        ...(dept ? [dept.shopSlug,...dept.slugs] : [selectedCategory]),
        ...subs.map((s) => s.slug),
      ]);
      list = list.filter((p) =>
        (p.categories || []).some((c) => {
          const lc = (c || '').toLowerCase();
          return [...allSlugs].some((s) => lc.includes(s));
        }));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.shortDescription?.toLowerCase().includes(q) ||
          p.fullDescription?.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          (p.categories || []).some((c) => c.toLowerCase().includes(q)));
    }

    return list;
  }, [hireProducts, selectedCategory, searchQuery]);

  const handleCategoryCardClick = (catKey: string) => {
    setSelectedCategory(catKey);
    const element = document.getElementById('hire-products');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (<div className="min-h-screen bg-[#F7F9FA]">
      {/* Hero Banner */}
      <div className="bg-[#0B1728] text-white relative overflow-hidden">
        {/* Background gradient embellishment */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E88D2A]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-80 h-80 bg-[#147A7A]/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-12 lg:py-16 relative z-10">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Equipment Hire' }]} variant="dark" />
          <div className="mt-6 max-w-3xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E88D2A] text-white text-[11.5px] font-extrabold rounded-full mb-4 uppercase tracking-wider shadow-sm">
              <RotateCcw className="w-3.5 h-3.5" />
              Flexible Equipment Hire Fleet • {hireProducts.length} Items Available
            </span>
            <h1 className="text-[30px] sm:text-[42px] font-black text-white leading-tight tracking-tight">
              Need Hospital & Assistive Equipment Temporarily?
            </h1>
            <p className="text-[14.5px] sm:text-[16px] text-white/80 mt-4 leading-relaxed max-w-2xl">
              Hospital profiling beds, patient lift chairs, manual wheelchairs, rollators, and bathroom aids available for immediate short & long-term hire. Fast delivery, professional setup, and 100% of hire fees credited toward purchase.
            </p>

            <div className="flex flex-wrap gap-3.5 mt-8">
              <a
                href="#hire-products"
                className="px-6 py-3.5 bg-[#E88D2A] hover:bg-[#D47C1E] active:bg-[#BF6E19] text-white text-[13.5px] font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Browse Hire Equipment</span>
                <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href="tel:0494767409"
                className="px-6 py-3.5 bg-white/10 hover:bg-white/15 border border-white/25 text-white text-[13.5px] font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Phone className="h-4 w-4 text-[#E88D2A]" />
                <span>Urgent Discharge Hotline: 0494 767 409</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-10 sm:py-12">
        <div className="grid sm:grid-cols-3 gap-5 sm:gap-6">
          {benefits.map((b) => (<div
              key={b.title}
              className="bg-white border border-gray-200 rounded-2xl p-6 shadow-xs hover:shadow-md hover:border-[#147A7A]/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center mb-4">
                <b.icon className="h-6 w-6 text-[#147A7A]" />
              </div>
              <h3 className="text-[16px] font-bold text-[#0F1E2E] mb-2">{b.title}</h3>
              <p className="text-[13px] text-gray-600 leading-relaxed">{b.description}</p>
            </div>))}
        </div>
      </section>

      {/* Popular Hire Categories */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 pb-10">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-[20px] sm:text-[22px] font-extrabold text-[#0F1E2E]">
              Explore Hire by Equipment Type
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              Click a category to filter the available fleet below
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {hireCategories
            .filter((c) => c.key !== 'all')
            .map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.key;
              return (<button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategoryCardClick(cat.key)}
                  className={`bg-white border rounded-2xl p-4 text-left transition-all group cursor-pointer ${
                    isSelected
                      ? 'border-[#E88D2A] ring-2 ring-[#E88D2A]/20 bg-[#FFF8ED]/40 shadow-sm'
                      : 'border-gray-200 hover:border-[#147A7A]/40 hover:shadow-md'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F8FAFC] group-hover:bg-[#147A7A]/10 flex items-center justify-center mb-3 transition-colors">
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-[#E88D2A]' : 'text-gray-700 group-hover:text-[#147A7A]'}`} />
                  </div>
                  <p className="text-[13px] font-bold text-[#0F1E2E] group-hover:text-[#147A7A] transition-colors line-clamp-2 leading-snug">
                    {cat.name}
                  </p>
                  <p className="text-[11px] font-semibold text-[#E88D2A] mt-1.5">
                    {cat.count} items available
                  </p>
                </button>);
            })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-white border-y border-gray-200 py-12">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
          <h2 className="text-[22px] sm:text-[24px] font-extrabold text-[#0F1E2E] text-center mb-8">
            How Equipment Hire Works
          </h2>
          <ol className="grid sm:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: 'Choose Equipment',
                desc: 'Select from our verified clinical range online or speak with an OT.',
              },
              {
                title: 'Select Hire Period',
                desc: 'Choose 2, 4, 8, or 12+ weeks duration with flexible extensions.',
              },
              {
                title: 'Delivered & Installed',
                desc: 'Professional home delivery, installation, and user safety orientation.',
              },
              {
                title: 'Return or Purchase',
                desc: 'Extend rental, request free return pickup, or credit 100% fees to buy.',
              },
            ].map((step, i) => (<li key={i} className="text-center bg-[#F8FAFC] rounded-2xl p-5 border border-gray-100">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#0F1E2E] text-white text-[13px] font-extrabold mb-3 shadow-xs">
                  {i + 1}
                </span>
                <h4 className="text-[14px] font-bold text-[#0F1E2E] mb-1">{step.title}</h4>
                <p className="text-[12px] text-gray-600 leading-relaxed">{step.desc}</p>
              </li>))}
          </ol>
        </div>
      </section>

      {/* Hire Products Section */}
      <section id="hire-products" className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 py-12 scroll-mt-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF8ED] text-[#E88D2A] border border-[#FDE5CC] rounded-full text-xs font-bold uppercase tracking-wider mb-2">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Available Hire Fleet</span>
            </div>
            <h2 className="text-[24px] sm:text-[28px] font-black text-[#0F1E2E] tracking-tight">
              All Equipment Available for Hire
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
              All rates shown per week. Minimum 2-week hire period. 100% hire fee credited toward purchase.
            </p>
          </div>

          {/* Search within hire equipment */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search hire equipment..."
              className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm outline-none focus:border-[#147A7A] focus:ring-1 focus:ring-[#147A7A] shadow-xs"
            />
            {searchQuery && (<button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>)}
          </div>
        </div>

        {/* Interactive Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 scrollbar-hide">
          {hireCategories.map((cat) => {
            const isSelected = selectedCategory === cat.key;
            return (<button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-[#0F1E2E] text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>);
          })}
        </div>

        {/* Active Filter summary */}
        {selectedCategory !== 'all' && (<div className="mb-4 flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-2 text-xs text-gray-600">
            <span>
              Showing <strong>{filteredProducts.length}</strong> items in <strong>{hireCategories.find((c) => c.key === selectedCategory)?.name}</strong>
            </span>
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className="text-[#147A7A] hover:underline font-bold"
            >
              Reset to All ({hireProducts.length})
            </button>
          </div>)}

        {/* Product Grid Render */}
        <ProductGrid productsList={filteredProducts} hireOnly={true} onResetFilters={() => { setSelectedCategory('all'); setSearchQuery(''); }} />
      </section>

      {/* CTA */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8 pb-16">
        <div className="bg-[#0B1728] rounded-3xl p-8 lg:p-12 text-center text-white relative overflow-hidden">
          <div className="w-14 h-14 rounded-2xl bg-[#E88D2A]/20 text-[#E88D2A] flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-[#E88D2A]" />
          </div>
          <h2 className="text-[24px] sm:text-[28px] font-extrabold text-white mb-3">
            Not Sure Which Equipment You Need?
          </h2>
          <p className="text-[14.5px] text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            Our clinical team and occupational therapists provide free advice to select the optimal bed, lift chair, wheelchair, or mobility aid for your clinical requirements and budget.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/contact?type=hire"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#E88D2A] hover:bg-[#D47C1E] text-white text-[14px] font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              <span>Talk to a Hire Specialist</span>
              <Headphones className="h-4 w-4" />
            </Link>
            <a
              href="tel:0494767409"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-[14px] font-bold rounded-xl transition-all cursor-pointer"
            >
              <Phone className="h-4 w-4 text-emerald-400" />
              <span>Call 0494 767 409</span>
            </a>
          </div>
        </div>
      </section>
    </div>);
}

export default HirePage;