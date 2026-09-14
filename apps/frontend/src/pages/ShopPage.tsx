import React, { useState, useMemo, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  ChevronRight,
  ArrowRight,
  LayoutGrid,
  Package,
  Sparkles,
  Layers,
  ChevronLeft,
  Search,
  RotateCcw
} from 'lucide-react';
import { ShopSidebar } from '@/components/product/ShopSidebar';
import { ProductToolbar } from '@/components/product/ProductToolbar';
import { ProductGrid } from '@/components/product/ProductGrid';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { getVariantPriceInfo } from '@/lib/productPricing';
import { Product } from '@/types/catalogue';
import { PRODUCTS } from '@/data/products';
import {
  getCategoryBySlug,
  getCategoryBreadcrumbs,
  getSubcategories,
  Category
} from '@/data/categories';
import {
  AT_DEPARTMENTS,
  getDepartmentCount,
  getCuratedDepartmentSubcategories,
  CURATED_DEPARTMENT_SUBCATEGORIES,
  filterProductsBySubcategory,
} from '@/data/departments';
import { useAdminStore } from '@/store/adminStore';

const ITEMS_PER_PAGE = 24;

export function ShopPage() {
  const { slug, categorySlug, subCategorySlug } = useParams<{
    slug?: string;
    categorySlug?: string;
    subCategorySlug?: string;
  }>();
  const activeSlug = subCategorySlug || categorySlug || slug;
  const navigate = useNavigate();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 15000]);
  const [sortBy, setSortBy] = useState('recommended');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Active category details from URL (supports canonical departments and curated subcategories)
  const currentCategory: Category | undefined = useMemo(() => {
    if (!activeSlug || activeSlug === 'all') return undefined;
    const cat = getCategoryBySlug(activeSlug);
    if (cat) return cat;

    const sLower = activeSlug.toLowerCase();
    const dept = AT_DEPARTMENTS.find((d) => d.id === sLower || d.shopSlug === sLower);
    if (dept) {
      return {
        id: `dept-${dept.id}`,
        slug: dept.shopSlug,
        name: dept.name,
        description: dept.blurb,
        depth: 1,
        path: dept.shopSlug,
        parentSlug: null,
      } as Category;
    }

    for (const [deptId, subs] of Object.entries(CURATED_DEPARTMENT_SUBCATEGORIES)) {
      const sub = subs.find((s) => s.slug === sLower);
      if (sub) {
        const parentDept = AT_DEPARTMENTS.find((d) => d.id === deptId);
        return {
          id: `sub-${sub.slug}`,
          slug: sub.slug,
          name: sub.name,
          depth: 2,
          path: `${parentDept?.shopSlug || deptId}/${sub.slug}`,
          parentSlug: parentDept?.shopSlug || deptId,
        } as Category;
      }
    }
    return undefined;
  }, [activeSlug]);

  // Unknown slug in URL: fall back to the full catalogue instead of an empty grid
  const unknownSlug = Boolean(activeSlug && activeSlug !== 'all' && !currentCategory);
  useEffect(() => {
    if (unknownSlug) navigate('/shop', { replace: true });
  }, [unknownSlug, navigate]);

  const adminStoreProducts = useAdminStore((s) => s.products);

  // Subcategories of active category with dynamic live product counts
  const currentSubcategoriesWithCount = useMemo(() => {
    if (!currentCategory) return [];
    const prods: Product[] = (adminStoreProducts && adminStoreProducts.length > 0
      ? adminStoreProducts
      : PRODUCTS) as Product[];

    // Match clinical curated department if available
    const matchingDept = AT_DEPARTMENTS.find((d) => d.shopSlug === currentCategory.slug || d.slugs.includes(currentCategory.slug));
    if (matchingDept) {
      const curated = getCuratedDepartmentSubcategories(matchingDept.id, prods);
      if (curated.length > 0) return curated;
    }

    const subs = getSubcategories(currentCategory.slug);
    return subs.map((sub) => {
      const count = prods.filter((p) =>
        (p.categories || []).some((c) => c.toLowerCase() === sub.slug.toLowerCase())).length;
      return {
        id: sub.id,
        name: sub.name,
        slug: sub.slug,
        productCount: count,
      };
    });
  }, [currentCategory, adminStoreProducts]);

  // Primary departments with live counts for browsing /shop without category
  const primaryDepartmentsWithCount = useMemo(() => {
    const prods: Product[] = (adminStoreProducts && adminStoreProducts.length > 0
      ? adminStoreProducts
      : PRODUCTS) as Product[];
    return AT_DEPARTMENTS.filter((d) => !d.isHire).map((d) => ({
      id: d.id,
      name: d.name,
      slug: d.shopSlug,
      count: getDepartmentCount(d, prods),
    }));
  }, [adminStoreProducts]);

  // Reset page when category, filters, or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeSlug, searchQuery, activeFilters, priceRange, sortBy]);

  // Sync category filter with route param
  useEffect(() => {
    if (activeSlug && activeSlug !== 'all') {
      setActiveFilters((prev) => ({
        ...prev,
        category: [activeSlug],
      }));
    } else {
      setActiveFilters((prev) => {
        const next = {...prev };
        delete next.category;
        return next;
      });
    }
  }, [activeSlug]);

  const handleFilterChange = (sectionId: string, value: string) => {
    const current = activeFilters[sectionId] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];

    setActiveFilters((prev) => ({...prev, [sectionId]: updated }));

    if (sectionId === 'category') {
      if (updated.length === 1) {
        navigate(`/shop/${updated[0]}`);
      } else if (updated.length === 0 && activeSlug) {
        navigate('/shop');
      }
    }
  };

  const handleClearFilters = () => {
    setActiveFilters({});
    setPriceRange([0, 15000]);
    setSearchQuery('');
    if (activeSlug) {
      navigate('/shop');
    }
  };

  // Filter and Sort Pipeline
  const filteredProducts = useMemo(() => {
    const baseList: Product[] = (adminStoreProducts && adminStoreProducts.length > 0
      ? adminStoreProducts
      : PRODUCTS) as Product[];

    // Live available products across all channels (sales and hire)
    let list = baseList.filter((p) => (p as any).available !== false);

    // 1. Category Filter (Matches canonical clinical departments and curated subcategories)
    const targetCategories = activeFilters['category'] || (activeSlug && activeSlug !== 'all' ? [activeSlug] : []);
    if (targetCategories.length > 0) {
      list = list.filter((p) => {
        const pCats = (p.categories || []).map((c) => (c || '').toLowerCase());
        const pBrand = (p.brand || '').toLowerCase();
        const pName = (p.name || '').toLowerCase();

        return targetCategories.some((catSlug) => {
          const sLower = catSlug.toLowerCase();

          // Check if this slug matches a primary clinical department
          const dept = AT_DEPARTMENTS.find((d) => d.id === sLower || d.shopSlug === sLower);
          if (dept) {
            if (dept.isHire) {
              return p.hireAvailable || (p.hirePrice && p.hirePrice > 0);
            }
            if (dept.id === 'for-carers') {
              return (pBrand === 'tena' ||
                pCats.includes('continence-care') ||
                pCats.includes('for-carers') ||
                pCats.includes('incontinence-aids') ||
                pCats.some((c) => dept.slugs.includes(c)) ||
                pName.includes('tena') ||
                pName.includes('proskin'));
            }
            return dept.slugs.some((s) => pCats.some((pc) => pc.includes(s)));
          }

          // Check if this slug is a curated subcategory under any department
          for (const [deptId, subs] of Object.entries(CURATED_DEPARTMENT_SUBCATEGORIES)) {
            const sub = subs.find((s) => s.slug === sLower);
            if (sub) {
              const matched = filterProductsBySubcategory(deptId, sub.slug, [p]);
              return matched.length > 0;
            }
          }

          // Fallback to hierarchical category matching
          const allTargetSlugs = new Set<string>();
          allTargetSlugs.add(sLower);
          const subcats = getSubcategories(sLower);
          subcats.forEach((sub) => {
            allTargetSlugs.add(sub.slug.toLowerCase());
            const deepSubcats = getSubcategories(sub.slug);
            deepSubcats.forEach((deep) => allTargetSlugs.add(deep.slug.toLowerCase()));
          });
          return pCats.some((tc) => allTargetSlugs.has(tc));
        });
      });
    }

    // 2. Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.shortDescription?.toLowerCase().includes(q) ||
          p.fullDescription?.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q)));
    }

    // 3. Brand Filter
    if (activeFilters['brand'] && activeFilters['brand'].length > 0) {
      const selectedBrands = activeFilters['brand'].map((b) => b.toLowerCase());
      list = list.filter((p) => selectedBrands.includes(p.brand.toLowerCase()));
    }

    // 4. Purchase Type (Buy / Hire)
    if (activeFilters['purchaseType'] && activeFilters['purchaseType'].length > 0) {
      const types = activeFilters['purchaseType'];
      list = list.filter((p) => {
        if (types.includes('hire') && (p.hireAvailable || p.hirePrice > 0)) return true;
        if (types.includes('buy') && (p.buyAvailable || p.buyPrice > 0)) return true;
        return false;
      });
    }

    // 4b. Size filter (matches attribute values or variant attributes, case-insensitive)
    if (activeFilters['size'] && activeFilters['size'].length > 0) {
      const wanted = activeFilters['size'].map((s) => s.toLowerCase());
      list = list.filter((p) => {
        const vals = new Set<string>();
        p.attributes?.filter((a) => a.slug === 'size').forEach((a) =>
          a.values.forEach((v) => vals.add(v.value.toLowerCase())));
        p.variants?.forEach((v) => {
          const s = (v.attributes as any)?.['size'];
          if (s) vals.add(String(s).toLowerCase());
        });
        return [...vals].some((v) => wanted.includes(v));
      });
    }

    // 4c. Colour filter (matches attribute values or variant attributes, case-insensitive)
    if (activeFilters['colour'] && activeFilters['colour'].length > 0) {
      const wanted = activeFilters['colour'].map((s) => s.toLowerCase());
      list = list.filter((p) => {
        const vals = new Set<string>();
        p.attributes?.filter((a) => a.slug === 'colour' || a.slug === 'color').forEach((a) =>
          a.values.forEach((v) => vals.add(v.value.toLowerCase())));
        p.variants?.forEach((v) => {
          const c = (v.attributes as any)?.['colour'] ?? (v.attributes as any)?.['color'];
          if (c) vals.add(String(c).toLowerCase());
        });
        return [...vals].some((v) => wanted.includes(v));
      });
    }

    // 5. Price Range (variant-aware: filter on the lowest buyable price,
    // never the stale catalogue base price)
    if (priceRange[0] > 0 || priceRange[1] < 15000) {
      list = list.filter((p) => {
        const info = getVariantPriceInfo(p as any);
        const price = info.hasPricedVariants ? info.min : (p.buyPrice || 0);
        return price >= priceRange[0] && price <= priceRange[1];
      });
    }

    // 6. Sorting (supports both snake_case and kebab-case sort values)
    // Price sorts use the same effective (variant-aware) price as filters.
    const effectivePrice = (p: any) => {
      const info = getVariantPriceInfo(p as any);
      return info.hasPricedVariants ? info.min : (p.buyPrice || 0);
    };
    switch (sortBy) {
      case 'price_asc':
      case 'price-asc':
        list.sort((a, b) => effectivePrice(a) - effectivePrice(b));
        break;
      case 'price_desc':
      case 'price-desc':
        list.sort((a, b) => effectivePrice(b) - effectivePrice(a));
        break;
      case 'name_asc':
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
      case 'name-desc':
        list.sort((a, b) => b.name.localeCompare(a.name));
        break;
      case 'rating':
        list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
      case 'newest':
        list.sort((a, b) => (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0));
        break;
      case 'popular':
      case 'recommended':
      default:
        list.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
        break;
    }

    return list;
  }, [searchQuery, activeFilters, priceRange, sortBy, activeSlug]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  // Breadcrumbs
  const breadcrumbItems = useMemo(() => {
    const base = [
      { label: 'Home', to: '/' },
      { label: 'Catalogue', to: '/shop' },
    ];
    if (currentCategory) {
      const crumbs = getCategoryBreadcrumbs(currentCategory.slug);
      crumbs.forEach((c) => {
        if (c.slug === currentCategory.slug) {
          base.push({ label: c.name, to: `/shop/${c.slug}` });
        } else {
          base.push({ label: c.name, to: `/shop/${c.slug}` });
        }
      });
    }
    return base;
  }, [currentCategory]);

  return (<div className="min-h-screen bg-[#F7F9FA] text-[#0F1E2E] py-6 sm:py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Category Hero / Title Section */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 mt-4 shadow-sm relative overflow-hidden">
          <div className="max-w-3xl">
            <span className="text-xs font-black text-[#147A7A] uppercase tracking-wider block mb-1">
              Clinical Equipment Catalogue
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F1E2E] tracking-tight">
              {currentCategory ? currentCategory.name : 'All Assistive Technology Equipment'}
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 mt-2 leading-relaxed">
              {currentCategory
                ? currentCategory.description
                : 'Browse our complete range of clinical mobility aids, wheelchairs, specialized seating, hospital beds, and patient handling systems across Australia.'}
            </p>
          </div>

          {/* Subcategory Pills or Department Browser */}
          {currentSubcategoriesWithCount.length > 0 ? (<div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500 self-center mr-1">
                Subcategories:
              </span>
              {currentSubcategoriesWithCount.map((sub) => (<Link
                  key={sub.id}
                  to={sub.slug === 'for-carers' ? '/for-carers' : `/shop/${sub.slug}`}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-[#147A7A] hover:text-white text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all inline-flex items-center gap-1.5"
                >
                  <span>{sub.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-teal-50 text-[#147A7A] font-bold border border-teal-200/60">
                    {sub.productCount}
                  </span>
                </Link>))}
            </div>) : !currentCategory ? (<div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-gray-100">
              <span className="text-xs font-bold text-gray-500 self-center mr-1">
                Shop by Department:
              </span>
              {primaryDepartmentsWithCount.map((dept) => (<Link
                  key={dept.id}
                  to={dept.slug === 'for-carers' ? '/for-carers' : `/shop/${dept.slug}`}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-[#147A7A] hover:text-white text-gray-700 text-xs font-bold rounded-xl border border-gray-200 transition-all inline-flex items-center gap-1.5"
                >
                  <span>{dept.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-teal-50 text-[#147A7A] font-bold border border-teal-200/60">
                    {dept.count}
                  </span>
                </Link>))}
            </div>) : null}
        </div>

        {/* Main Catalogue Layout: Sidebar + Product Grid */}
        <div className="flex gap-8 mt-6 items-start">
          {/* Left Sidebar */}
          <ShopSidebar
            isOpen={isMobileDrawerOpen}
            onToggle={setIsMobileDrawerOpen}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            priceRange={priceRange}
            onPriceRangeChange={setPriceRange}
            onClearFilters={handleClearFilters}
          />

          {/* Right Product Grid Column */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Toolbar */}
            <ProductToolbar
              totalCount={filteredProducts.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              sortBy={sortBy}
              onSortChange={setSortBy}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              onToggleMobileFilters={() => setIsMobileDrawerOpen(true)}
              activeFilterCount={
                Object.values(activeFilters).reduce((acc, v) => acc + v.length, 0) +
                (priceRange[0] > 0 || priceRange[1] < 15000 ? 1 : 0)
              }
            />

            {/* Active Filter Chips */}
            {(Object.values(activeFilters).some((a) => a.length > 0) || searchQuery) && (<div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs font-bold text-gray-500">Active filters:</span>
                {searchQuery && (<span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-[#147A7A] border border-teal-200 rounded-lg text-xs font-bold">
                    Search: "{searchQuery}"
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>)}
                {Object.entries(activeFilters).map(([section, values]) =>
                  values.map((val) => (<span
                      key={`${section}-${val}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-gray-800 rounded-lg text-xs font-bold"
                    >
                      {val.replace(/-/g, ' ')}
                      <button
                        type="button"
                        onClick={() => handleFilterChange(section, val)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>)))}
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs font-bold text-[#147A7A] hover:underline ml-2"
                >
                  Clear all
                </button>
              </div>)}

            {/* Products Grid */}
            <ProductGrid
              productsList={paginatedProducts}
              viewMode={viewMode}
              onResetFilters={handleClearFilters}
            />

            {/* Pagination Controls */}
            {totalPages > 1 && (<div className="bg-white border border-gray-200 rounded-2xl p-4 mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                <span className="text-xs font-bold text-gray-500">
                  Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} of{' '}
                  {filteredProducts.length} items
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => {
                      setCurrentPage((p) => Math.max(1, p - 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Page numbers */}
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = currentPage;
                    if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    if (pageNum < 1 || pageNum > totalPages) return null;

                    const isCurrent = pageNum === currentPage;
                    return (<button
                        key={pageNum}
                        type="button"
                        onClick={() => {
                          setCurrentPage(pageNum);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-[#147A7A] text-white shadow-sm'
                            : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>);
                  })}

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => {
                      setCurrentPage((p) => Math.min(totalPages, p + 1));
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="p-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>)}
          </div>
        </div>
      </div>
    </div>);
}

export default ShopPage;