import React from 'react';
import { Link } from 'react-router-dom';
import { SearchX, RotateCcw } from 'lucide-react';
import { Product } from '@/types/catalogue';
import { ProductCard } from './ProductCard';
import { useProducts } from '@/data/products';

interface ProductGridProps {
  productsList?: Product[];
  categoryFilter?: string;
  hireOnly?: boolean;
  viewMode?: 'grid' | 'list';
  onResetFilters?: () => void;
}

export function ProductGrid({
  productsList,
  categoryFilter,
  hireOnly = false,
  viewMode = 'grid',
  onResetFilters,
}: ProductGridProps) {
  const liveProducts = useProducts();

  const baseList = productsList || liveProducts;

  const displayedProducts = React.useMemo(() => {
    return baseList.filter((p) => {
      if (categoryFilter && categoryFilter !== 'all') {
        const cats = p.categories || ((p as any).category ? [(p as any).category] : []);
        if (!cats.includes(categoryFilter) && (p as any).category !== categoryFilter) {
          return false;
        }
      }
      if (hireOnly && (!p.hirePrice || p.hirePrice <= 0) && !p.hireAvailable) {
        return false;
      }
      return true;
    });
  }, [baseList, categoryFilter, hireOnly]);

  if (displayedProducts.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-3xl p-10 sm:p-16 text-center shadow-sm my-4 max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-[#147A7A]/10 text-[#147A7A] rounded-2xl flex items-center justify-center mx-auto mb-4">
          <SearchX className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-extrabold text-[#0F1E2E] mb-2">
          No equipment matches your filters
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 mb-6 max-w-md mx-auto leading-relaxed">
          Try expanding your price range, unchecking specific categories or brands, or clearing search keywords.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {onResetFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Filters</span>
            </button>
          )}
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Speak with an AT Specialist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {viewMode === 'list' ? (
        <div className="space-y-4" role="list" aria-label="Product list">
          {displayedProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode="list"
              hireOnly={hireOnly}
              eagerImage={idx < 3}
            />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6"
          role="list"
          aria-label="Products grid"
        >
          {displayedProducts.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode="grid"
              hireOnly={hireOnly}
              eagerImage={idx < 6}
            />
          ))}
        </div>
      )}
    </>
  );
}