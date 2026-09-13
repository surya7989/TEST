import React from 'react';
import { cn } from '@/lib/utils';
import { Select } from '@/components/ui/Select';
import { Dropdown } from '@/components/ui/Dropdown';
import { Grid, List, SlidersHorizontal, Search, X, ChevronDown, Package } from 'lucide-react';
import { AT_DEPARTMENTS, getDepartmentCount } from '@/data/departments';
import { useProducts } from '@/data/products';

const sortOptions = [
  { value: 'recommended', label: 'Featured / Recommended' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest Additions' },
];

const viewModes: Array<{ value: 'grid' | 'list'; label: string; icon: typeof Grid }> = [
  { value: 'grid', label: 'Grid View', icon: Grid },
  { value: 'list', label: 'List View', icon: List },
];

interface ProductToolbarProps {
  totalProducts?: number;
  totalCount?: number;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
  onFilterClick?: () => void;
  onToggleMobileFilters?: () => void;
  hasActiveFilters?: boolean;
  activeFilterCount?: number;
  activeFilterBadges?: Array<{ key: string; label: string; onRemove: () => void }>;
  onClearAll?: () => void;
}

function CategoryDropdown() {
  const products = useProducts();
  const departments = AT_DEPARTMENTS.filter((d) => !d.isHire);

  const categoryItems = departments.map((dept) => ({
    label: `${dept.name} (${getDepartmentCount(dept, products)})`,
    to: dept.id === 'for-carers' ? '/for-carers' : `/shop/${dept.shopSlug}`,
  }));

  return (<Dropdown
      trigger={
        <button
          type="button"
          className="flex items-center gap-2 px-3.5 py-2 border border-gray-200 rounded-xl bg-white text-gray-700 hover:bg-gray-50 hover:border-[#147A7A] transition-all cursor-pointer text-xs font-bold min-w-[160px]"
        >
          <Package className="h-3.5 w-3.5 text-[#147A7A]" />
          <span>All Categories</span>
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
      }
      items={categoryItems}
      align="left"
    />);
}

export function ProductToolbar({ 
  totalProducts, 
  totalCount,
  searchQuery = '',
  onSearchChange,
  sortBy,
  onSortChange,
  viewMode,
  onViewModeChange,
  onFilterClick, 
  onToggleMobileFilters,
  hasActiveFilters = false,
  activeFilterCount = 0,
  activeFilterBadges = [],
  onClearAll
}: ProductToolbarProps) {
  const count = totalCount !== undefined ? totalCount : (totalProducts || 0);
  const handleFilterToggle = onFilterClick || onToggleMobileFilters;
  const isFilterActive = hasActiveFilters || activeFilterCount > 0;
  return (<div className="space-y-3 mb-6">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white border border-gray-200 rounded-2xl p-3 sm:p-4 shadow-sm">
        {/* Left: Product count, Category Dropdown & Search input */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
          <div className="text-xs sm:text-[13px] text-gray-600 font-medium whitespace-nowrap">
            Showing <span className="font-extrabold text-[#0F1E2E]">{count}</span> {count === 1 ? 'product' : 'products'}
          </div>

          {/* All Categories Dropdown */}
          <CategoryDropdown />

          {/* Quick Search */}
          {onSearchChange && (<div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name, brand, SKU, or product code..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 bg-[#F8FAFC] focus:bg-white focus:border-[#147A7A] focus:ring-1 focus:ring-[#147A7A] outline-none text-gray-900 transition-all placeholder:text-gray-400"
              />
              {searchQuery && (<button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>)}
            </div>)}
        </div>

        {/* Right: Sort & Layout controls */}
        <div className="flex items-center gap-2.5 justify-between sm:justify-end">
          {/* Mobile Filter Button */}
          {handleFilterToggle && (<button
              type="button"
              onClick={handleFilterToggle}
              className={`lg:hidden flex items-center gap-2 px-3.5 py-2 border rounded-xl transition-colors cursor-pointer text-xs font-bold ${
                isFilterActive
                  ? 'bg-[#147A7A] text-white border-[#147A7A]'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filters</span>
              {isFilterActive && (<span className="w-2 h-2 rounded-full bg-amber-400" />)}
            </button>)}

          {/* Sort By Dropdown */}
          <div className="w-48 sm:w-52">
            <Select
              value={sortBy}
              onChange={onSortChange}
              options={sortOptions}
              placeholder="Sort by"
            />
          </div>

          {/* View Mode Toggle (Grid / List) */}
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-0.5">
            {viewModes.map((mode) => (<button
                key={mode.value}
                type="button"
                onClick={() => onViewModeChange(mode.value)}
                className={cn('p-2 rounded-lg transition-colors cursor-pointer',
                  viewMode === mode.value
                    ? 'bg-[#0F1E2E] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-white')}
                aria-label={mode.label}
                aria-pressed={viewMode === mode.value}
                title={mode.label}
              >
                <mode.icon className="h-4 w-4" />
              </button>))}
          </div>
        </div>
      </div>

      {/* Active Filter Chips / Badges */}
      {activeFilterBadges.length > 0 && (<div className="flex flex-wrap items-center gap-2 pt-1 animate-fade-in">
          <span className="text-xs font-bold text-gray-500 mr-1">Active Filters:</span>
          {activeFilterBadges.map((badge) => (<span
              key={badge.key}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#147A7A]/10 border border-[#147A7A]/20 text-[#147A7A] rounded-full text-xs font-bold"
            >
              <span>{badge.label}</span>
              <button
                type="button"
                onClick={badge.onRemove}
                className="hover:text-red-500 hover:bg-[#147A7A]/20 rounded-full p-0.5 transition-colors"
                title="Remove filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>))}

          {onClearAll && (<button
              type="button"
              onClick={onClearAll}
              className="text-xs font-bold text-gray-500 hover:text-red-600 underline ml-2 cursor-pointer"
            >
              Clear All
            </button>)}
        </div>)}
    </div>);
}