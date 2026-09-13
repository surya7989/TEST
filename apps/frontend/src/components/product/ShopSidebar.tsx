import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
import { cn, getColorSwatchHex } from '@/lib/utils';
import { Slider } from '@/components/ui/Slider';
import {
  AT_DEPARTMENTS,
  getDepartmentCount,
  getCuratedDepartmentSubcategories,
} from '@/data/departments';
import { useProducts } from '@/data/products';
import { Product } from '@/types/catalogue';

interface ShopSidebarProps {
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  activeFilters: Record<string, string[]>;
  onFilterChange: (sectionId: string, value: string) => void;
  priceRange: [number, number];
  onPriceRangeChange: (range: [number, number]) => void;
  onClearFilters: () => void;
  maxPrice?: number;
}

export function ShopSidebar({
  isOpen = false,
  onToggle,
  activeFilters,
  onFilterChange,
  priceRange,
  onPriceRangeChange,
  onClearFilters,
  maxPrice = 15000,
}: ShopSidebarProps) {
  const [openSections, setOpenSections] = useState<string[]>([
    'category',
    'brand',
    'purchaseType',
    'size',
    'colour',
  ]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const products = useProducts();

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]);
  };

  // Dynamic Clinical Departments and curated subcategories with live product counts
  const departmentOptions = useMemo(() => {
    return AT_DEPARTMENTS.filter((d) => !d.isHire).map((dept) => {
      const count = getDepartmentCount(dept, products);
      const subs = getCuratedDepartmentSubcategories(dept.id, products);
      return {
        id: dept.id,
        slug: dept.shopSlug,
        name: dept.name,
        count,
        subs,
      };
    });
  }, [products]);

  // Unique Brands from all active products
  const brandOptions = useMemo(() => {
    const counts: Record<string, number> = {};
    products.forEach((p) => {
      const b = p.brand?.trim();
      if (b) {
        counts[b] = (counts[b] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([brand, count]) => ({
        value: brand.toLowerCase(),
        label: brand,
        count,
      }));
  }, [products]);

  const purchaseTypeOptions = useMemo(() => {
    const buyCount = products.filter((p) => p.buyAvailable || p.buyPrice > 0).length;
    const hireCount = products.filter((p) => p.hireAvailable || p.hirePrice > 0).length;

    return [
      { value: 'buy', label: 'Outright Purchase (Buy)', count: buyCount },
      { value: 'hire', label: 'Equipment Hire (Rental)', count: hireCount },
    ];
  }, [products]);

  // Dynamic Size options derived from catalogue variant attributes
  const sizeOptions = useMemo(() => {
    const counts: Record<string, { label: string; count: number }> = {};
    products.forEach((p) => {
      const seen = new Set<string>();
      p.attributes?.filter((a) => a.slug === 'size').forEach((a) => a.values.forEach((v) => seen.add(v.value.toLowerCase())));
      p.variants?.forEach((v) => {
        const s = (v.attributes as any)?.['size'];
        if (s) seen.add(String(s).toLowerCase());
      });
      seen.forEach((k) => {
        const label = k.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        if (!counts[k]) counts[k] = { label, count: 0 };
        counts[k].count += 1;
      });
    });
    return Object.entries(counts)
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  // Dynamic Colour options derived from catalogue variant attributes
  const colourOptions = useMemo(() => {
    const counts: Record<string, { label: string; count: number; hex?: string }> = {};
    products.forEach((p) => {
      const seen = new Set<string>();
      const hexByKey: Record<string, string | undefined> = {};
      p.attributes?.filter((a) => a.slug === 'colour' || a.slug === 'color').forEach((a) =>
        a.values.forEach((v) => {
          seen.add(v.value.toLowerCase());
          hexByKey[v.value.toLowerCase()] = (v as any).colorHex;
        }));
      p.variants?.forEach((v) => {
        const c = (v.attributes as any)?.['colour'] ?? (v.attributes as any)?.['color'];
        if (c) seen.add(String(c).toLowerCase());
      });
      seen.forEach((k) => {
        const label = k.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        if (!counts[k]) counts[k] = { label, count: 0, hex: hexByKey[k] };
        counts[k].count += 1;
        if (!counts[k].hex && hexByKey[k]) counts[k].hex = hexByKey[k];
      });
    });
    return Object.entries(counts)
      .map(([value, { label, count, hex }]) => ({ value, label, count, hex }))
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const hasActiveFilters =
    Object.values(activeFilters).some((arr) => arr.length > 0) ||
    priceRange[0] > 0 ||
    priceRange[1] < maxPrice;

  return (<>
      {/* Mobile Backdrop */}
      {isOpen && (<div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-xs"
          onClick={() => onToggle?.(false)}
        />)}

      <aside
        className={cn('w-72 bg-white border border-gray-200 rounded-3xl p-5 shadow-sm space-y-6 flex-shrink-0 transition-transform duration-300',
          'lg:static lg:translate-x-0',
          isOpen
            ? 'fixed top-0 left-0 h-full z-50 overflow-y-auto translate-x-0 w-80'
            : 'fixed -translate-x-full lg:translate-x-0')}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-2 font-extrabold text-sm text-[#0F1E2E]">
            <SlidersHorizontal className="w-4 h-4 text-[#147A7A]" />
            <span>Catalogue Filters</span>
          </div>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (<button
                type="button"
                onClick={onClearFilters}
                className="text-[11px] font-bold text-[#147A7A] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>)}
            <button
              type="button"
              onClick={() => onToggle?.(false)}
              className="lg:hidden p-1 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 1. Category Tree Filter */}
        <div className="border-b border-gray-100 pb-5">
          <button
            type="button"
            onClick={() => toggleSection('category')}
            className="flex items-center justify-between w-full text-xs font-black text-[#0F1E2E] uppercase tracking-wider py-1 cursor-pointer"
          >
            <span>Clinical Departments</span>
            <ChevronDown
              className={cn('w-4 h-4 text-gray-400 transition-transform',
                openSections.includes('category') && 'rotate-180')}
            />
          </button>

          {openSections.includes('category') && (<div className="mt-3 space-y-1 max-h-[360px] overflow-y-auto pr-1 text-xs">
              {departmentOptions.map((cat) => {
                const isChecked = (activeFilters['category'] || []).includes(cat.slug);
                const isExpanded = expandedCategory === cat.slug;
                const subs = cat.subs;

                return (<div key={cat.id} className="space-y-1">
                    <div className="flex items-center justify-between group p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => onFilterChange('category', cat.slug)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A] cursor-pointer"
                        />
                        <span
                          className={cn('truncate',
                            isChecked ? 'font-bold text-[#147A7A]' : 'text-gray-700')}
                        >
                          {cat.name}
                        </span>
                      </label>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-[10px] font-semibold text-[#147A7A] bg-teal-50 px-1 rounded border border-teal-100">{cat.count}</span>
                        {subs.length > 0 && (<button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedCategory(isExpanded ? null : cat.slug);
                            }}
                            className="p-0.5 text-gray-400 hover:text-gray-700"
                          >
                            <ChevronRight
                              className={cn('w-3 h-3 transition-transform',
                                isExpanded && 'rotate-90')}
                            />
                          </button>)}
                      </div>
                    </div>

                    {/* Subcategories list */}
                    {isExpanded && subs.length > 0 && (<div className="pl-6 space-y-1 py-1 border-l-2 border-slate-200 ml-3">
                        {subs.map((sub) => {
                          const isSubChecked = (activeFilters['category'] || []).includes(sub.slug);

                          return (<label
                              key={sub.id}
                              className="flex items-center justify-between py-1 px-1 rounded hover:bg-slate-50 cursor-pointer select-none text-[11.5px]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <input
                                  type="checkbox"
                                  checked={isSubChecked}
                                  onChange={() => onFilterChange('category', sub.slug)}
                                  className="h-3 w-3 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A]"
                                />
                                <span
                                  className={cn('truncate',
                                    isSubChecked ? 'font-bold text-[#147A7A]' : 'text-gray-600')}
                                >
                                  {sub.name}
                                </span>
                              </div>
                              <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                                {sub.productCount}
                              </span>
                            </label>);
                        })}
                      </div>)}
                  </div>);
              })}
            </div>)}
        </div>

        {/* 2. Purchase / Rental Type */}
        <div className="border-b border-gray-100 pb-5">
          <button
            type="button"
            onClick={() => toggleSection('purchaseType')}
            className="flex items-center justify-between w-full text-xs font-black text-[#0F1E2E] uppercase tracking-wider py-1 cursor-pointer"
          >
            <span>Purchase & Hire</span>
            <ChevronDown
              className={cn('w-4 h-4 text-gray-400 transition-transform',
                openSections.includes('purchaseType') && 'rotate-180')}
            />
          </button>

          {openSections.includes('purchaseType') && (<div className="mt-3 space-y-2 text-xs">
              {purchaseTypeOptions.map((opt) => {
                const isChecked = (activeFilters['purchaseType'] || []).includes(opt.value);

                return (<label
                    key={opt.value}
                    className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onFilterChange('purchaseType', opt.value)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A]"
                      />
                      <span className={cn(isChecked ? 'font-bold text-[#147A7A]' : 'text-gray-700')}>
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-[10.5px] text-gray-400">{opt.count}</span>
                  </label>);
              })}
            </div>)}
        </div>

        {/* 3. Brand Filter */}
        <div className="border-b border-gray-100 pb-5">
          <button
            type="button"
            onClick={() => toggleSection('brand')}
            className="flex items-center justify-between w-full text-xs font-black text-[#0F1E2E] uppercase tracking-wider py-1 cursor-pointer"
          >
            <span>Brands</span>
            <ChevronDown
              className={cn('w-4 h-4 text-gray-400 transition-transform',
                openSections.includes('brand') && 'rotate-180')}
            />
          </button>

          {openSections.includes('brand') && (<div className="mt-3 space-y-1.5 max-h-[240px] overflow-y-auto pr-1 text-xs">
              {brandOptions.map((brand) => {
                const isChecked = (activeFilters['brand'] || []).includes(brand.value);

                return (<label
                    key={brand.value}
                    className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onFilterChange('brand', brand.value)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A]"
                      />
                      <span className={cn('truncate', isChecked ? 'font-bold text-[#147A7A]' : 'text-gray-700')}>
                        {brand.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">
                      {brand.count}
                    </span>
                  </label>);
              })}
            </div>)}
        </div>

        {/* 4. Size Filter (dynamic, from catalogue variants) */}
        <div className="border-b border-gray-100 pb-5">
          <button
            type="button"
            onClick={() => toggleSection('size')}
            className="flex items-center justify-between w-full text-xs font-black text-[#0F1E2E] uppercase tracking-wider py-1 cursor-pointer"
          >
            <span>Size</span>
            <ChevronDown
              className={cn('w-4 h-4 text-gray-400 transition-transform',
                openSections.includes('size') && 'rotate-180')}
            />
          </button>

          {openSections.includes('size') && (<div className="mt-3 space-y-1.5 max-h-[240px] overflow-y-auto pr-1 text-xs">
              {sizeOptions.length === 0 && (<span className="text-[11px] text-gray-400">No sized options in catalogue</span>)}
              {sizeOptions.map((opt) => {
                const isChecked = (activeFilters['size'] || []).includes(opt.value);
                return (<label
                    key={opt.value}
                    className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onFilterChange('size', opt.value)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A]"
                      />
                      <span className={cn('truncate', isChecked ? 'font-bold text-[#147A7A]' : 'text-gray-700')}>
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{opt.count}</span>
                  </label>);
              })}
            </div>)}
        </div>

        {/* 5. Colour Filter (dynamic, from catalogue variants) */}
        <div className="border-b border-gray-100 pb-5">
          <button
            type="button"
            onClick={() => toggleSection('colour')}
            className="flex items-center justify-between w-full text-xs font-black text-[#0F1E2E] uppercase tracking-wider py-1 cursor-pointer"
          >
            <span>Colour</span>
            <ChevronDown
              className={cn('w-4 h-4 text-gray-400 transition-transform',
                openSections.includes('colour') && 'rotate-180')}
            />
          </button>

          {openSections.includes('colour') && (<div className="mt-3 space-y-1.5 max-h-[240px] overflow-y-auto pr-1 text-xs">
              {colourOptions.length === 0 && (<span className="text-[11px] text-gray-400">No colour options in catalogue</span>)}
              {colourOptions.map((opt) => {
                const isChecked = (activeFilters['colour'] || []).includes(opt.value);
                return (<label
                    key={opt.value}
                    className="flex items-center justify-between p-1 rounded-lg hover:bg-slate-50 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onFilterChange('colour', opt.value)}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A]"
                      />
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/15 flex-shrink-0"
                        style={{ backgroundColor: getColorSwatchHex(opt.value, opt.hex) }}
                      />
                      <span className={cn('truncate', isChecked ? 'font-bold text-[#147A7A]' : 'text-gray-700')}>
                        {opt.label}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0 ml-1">{opt.count}</span>
                  </label>);
              })}
            </div>)}
        </div>

        {/* 6. Price Range Filter */}
        <div>
          <span className="block text-xs font-black text-[#0F1E2E] uppercase tracking-wider mb-3">
            Price Range (AUD)
          </span>
          <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-2">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1] >= maxPrice ? `${maxPrice}+` : priceRange[1]}</span>
          </div>
          <input
            type="range"
            min="0"
            max={maxPrice}
            step="100"
            value={priceRange[1]}
            onChange={(e) => onPriceRangeChange([priceRange[0], parseInt(e.target.value, 10)])}
            className="w-full accent-[#147A7A] cursor-pointer"
          />
        </div>
      </aside>
    </>);
}