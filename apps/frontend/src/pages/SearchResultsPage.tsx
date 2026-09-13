import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, RotateCcw } from 'lucide-react';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ProductGrid } from '@/components/product/ProductGrid';
import { useProducts, type Product } from '@/data/products';

export function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const allProducts = useProducts();

  const [filterType, setFilterType] = useState<'all' | 'buy' | 'hire'>('all');

  const matchingProducts = useMemo(() => {
    let list: Product[] = allProducts.filter((p) => (p as any).available !== false);

    if (categoryParam && categoryParam !== 'All categories' && categoryParam !== 'all') {
      const catLower = categoryParam.toLowerCase().trim();
      list = list.filter((p) =>
        (p.categories || []).some((c) => c.toLowerCase() === catLower || c.toLowerCase().includes(catLower)) ||
        (p.category && (p.category.toLowerCase() === catLower || p.category.toLowerCase().includes(catLower))));
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      list = list.filter((p) =>
          p.name.toLowerCase().includes(q) ||
          p.brand.toLowerCase().includes(q) ||
          p.shortDescription?.toLowerCase().includes(q) ||
          p.fullDescription?.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          (p.categories || []).some((c) => c.toLowerCase().includes(q)) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q)));
    }

    if (filterType === 'hire') {
      list = list.filter((p) => p.hireAvailable || (p.hirePrice || 0) > 0);
    } else if (filterType === 'buy') {
      list = list.filter((p) => p.buyAvailable || (p.buyPrice || 0) > 0);
    }

    return list;
  }, [allProducts, query, categoryParam, filterType]);

  const hireCount = useMemo(() => {
    const q = query.toLowerCase().trim();
    const base = allProducts.filter((p) => p.hireAvailable || (p.hirePrice || 0) > 0);
    if (!q) return base.length;
    return base.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.shortDescription?.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.categories || []).some((c) => c.toLowerCase().includes(q))).length;
  }, [allProducts, query]);

  return (<div className="min-h-screen bg-[#F7F9FA] py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Search Results' }]} />

        {/* Search Query Header */}
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 mt-6 mb-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center flex-shrink-0">
                <Search className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-[22px] sm:text-[26px] font-black text-[#0F1E2E] tracking-tight">
                  {query ? `Search results for "${query}"` : 'All Assistive Equipment'}
                </h1>
                <p className="text-[13px] sm:text-[14px] text-gray-500 mt-0.5">
                  Found <strong className="text-[#0F1E2E] font-bold">{matchingProducts.length}</strong> matching products
                  {categoryParam && categoryParam !== 'All categories' && (<span> in <strong>{categoryParam}</strong></span>)}
                </p>
              </div>
            </div>

            {/* Quick Filter Buttons: All, Outright Buy, Hire */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'all'
                    ? 'bg-[#147A7A] text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                All Equipment
              </button>

              <button
                type="button"
                onClick={() => setFilterType('buy')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === 'buy'
                    ? 'bg-[#147A7A] text-white shadow-xs'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                Buy Outright
              </button>

              {hireCount > 0 && (<button
                  type="button"
                  onClick={() => setFilterType('hire')}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    filterType === 'hire'
                      ? 'bg-[#E88D2A] text-white shadow-xs'
                      : 'bg-[#FFF8ED] text-[#E88D2A] border border-[#FDE5CC] hover:bg-[#FDE5CC]'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Available for Hire ({hireCount})</span>
                </button>)}
            </div>
          </div>
        </div>

        {/* Results Product Grid */}
        <ProductGrid
          productsList={matchingProducts}
          hireOnly={filterType === 'hire'}
          onResetFilters={() => setFilterType('all')}
        />
      </div>
    </div>);
}

export default SearchResultsPage;