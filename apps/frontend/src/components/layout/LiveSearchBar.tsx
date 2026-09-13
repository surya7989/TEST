import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  X,
  ChevronDown,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Tag,
  TrendingUp,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import { useAdminStore } from '@/store/adminStore';
import { PRODUCTS, getEffectiveProducts, type Product } from '@/data/products';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';

interface LiveSearchBarProps {
  isMobile?: boolean;
  onItemSelect?: () => void;
  placeholder?: string;
}

const POPULAR_SEARCHES = [
  'Electric Beds',
  'Wheelchairs',
  'Seat Walkers',
  'Lift Chairs',
  'Equipment Hire',
  'Shower Chairs',
  'Commodes',
  'NDIS Consumables',
];

export function LiveSearchBar({
  isMobile = false,
  onItemSelect,
  placeholder = 'Search by name, SKU, brand, or equipment type...',
}: LiveSearchBarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All categories');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const storeCategories = useAdminStore((s) => s.categories);
  const storeProducts = useAdminStore((s) => s.products.filter((p) => p.available !== false));

  // Guarantee search queries the authoritative live equipment catalogue
  const allProducts: Product[] = useMemo(() => {
    if (storeProducts && storeProducts.length > 0) {
      return storeProducts as Product[];
    }
    return getEffectiveProducts().filter((p) => p.buyAvailable !== false);
  }, [storeProducts]);

  const categories = useMemo(() => {
    if (storeCategories && storeCategories.length > 0) {
      return ['All categories',...storeCategories.map((c) => c.name)];
    }
    return [
      'All categories',
      'Electric Beds',
      'Wheelchairs',
      'Seat Walkers & Rollators',
      'Lift Chairs & Recliners',
      'Shower & Commode Chairs',
      'Patient Lifting & Slings',
      'Pressure Care & Mattresses',
      'Equipment Hire',
      'Daily Living Aids',
      'Bariatric Equipment',
    ];
  }, [storeCategories]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setIsCategoryOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter products matching live query with intelligent ranking
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = allProducts;

    // Filter by selected category if not 'All categories'
    if (selectedCategory !== 'All categories') {
      const catQuery = selectedCategory.toLowerCase().replace(/[^\w\s]/g, '').trim();
      list = list.filter((p) => {
        const catStr = (p.category || '').toLowerCase();
        if (catStr && (catStr.includes(catQuery) || catQuery.includes(catStr))) return true;
        const cats = Array.isArray(p.categories) ? p.categories : [];
        return cats.some((c) => {
          const cClean = String(c).toLowerCase().replace(/-/g, ' ');
          return cClean.includes(catQuery) || catQuery.includes(cClean);
        });
      });
    }

    if (!q) {
      return { products: [], matchingCategories: [], totalCount: 0 };
    }

    const isSingleChar = q.length === 1;

    // Score and filter products
    const scoredProducts: { product: Product; score: number }[] = [];

    list.forEach((product) => {
      const name = (product.name || '').toLowerCase();
      const sku = (product.sku || '').toLowerCase();
      const brand = (product.brand || '').toLowerCase();
      const categoryList = Array.isArray(product.categories) ? product.categories : [];
      const categoryStr = (product.category || categoryList.join(' ')).toLowerCase().replace(/-/g, ' ');
      const desc = (product.shortDescription || product.fullDescription || product.description || '').toLowerCase();
      const tags = (product.tags || []).map((t) => t.toLowerCase());

      const words = name.split(/[\s\-_/]+/);
      let score = 0;

      // 1. Name matches
      if (name.startsWith(q)) {
        score += 150; // Highest priority: title starts with query
      } else if (words.some((w) => w.startsWith(q))) {
        score += 110; // Word in title starts with query (e.g. "Electric Bed" matches "b")
      } else if (!isSingleChar && name.includes(q)) {
        score += 60; // Substring in title only for multi-char queries
      }

      // 2. SKU matches
      if (sku.startsWith(q)) {
        score += 120;
      } else if (!isSingleChar && sku.includes(q)) {
        score += 50;
      }

      // 3. Brand matches
      if (brand.startsWith(q)) {
        score += 90;
      } else if (!isSingleChar && brand.includes(q)) {
        score += 40;
      }

      // 4. Category matches
      if (categoryStr.startsWith(q) || categoryList.some((c) => c.startsWith(q))) {
        score += 70;
      } else if (!isSingleChar && categoryStr.includes(q)) {
        score += 30;
      }

      // 5. Tags matches
      if (tags.some((t) => t.startsWith(q))) {
        score += 50;
      } else if (!isSingleChar && tags.some((t) => t.includes(q))) {
        score += 20;
      }

      // 6. Description match (only for multi-char queries to prevent single letter noise)
      if (!isSingleChar && desc.includes(q)) {
        score += 15;
      }

      if (score > 0) {
        scoredProducts.push({ product, score: score + (product.rating || 0) });
      }
    });

    // Sort by descending score
    scoredProducts.sort((a, b) => b.score - a.score);

    // Matching categories
    const matchingCats = categories
      .filter((cat) => cat !== 'All categories' && cat.toLowerCase().includes(q))
      .slice(0, 4);

    return {
      products: scoredProducts.map((sp) => sp.product),
      matchingCategories: matchingCats,
      totalCount: scoredProducts.length,
    };
  }, [searchQuery, selectedCategory, allProducts, categories]);

  // Keep selected index within bounds
  useEffect(() => {
    setSelectedIndex(-1);
  }, [searchQuery]);

  // Scroll active item into view
  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const totalItems = searchResults.products.slice(0, 8).length;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!isDropdownOpen) {
        setIsDropdownOpen(true);
        return;
      }
      setSelectedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && searchResults.products[selectedIndex]) {
        const item = searchResults.products[selectedIndex];
        navigate(`/product/${(item as any).slug || item.id}`);
        setIsDropdownOpen(false);
        if (onItemSelect) onItemSelect();
      } else if (searchQuery.trim()) {
        handleSubmitSearch();
      }
    } else if (e.key === 'Escape') {
      setIsDropdownOpen(false);
      inputRef.current?.blur();
    }
  };

  const handleSubmitSearch = (overrideQuery?: string) => {
    const q = overrideQuery !== undefined ? overrideQuery : searchQuery;
    if (q.trim()) {
      const categoryParam = selectedCategory !== 'All categories' ? `&category=${encodeURIComponent(selectedCategory)}` : '';
      navigate(`/search?q=${encodeURIComponent(q.trim())}${categoryParam}`);
      setIsDropdownOpen(false);
      if (onItemSelect) onItemSelect();
    }
  };

  const handleClear = () => {
    setSearchQuery('');
    inputRef.current?.focus();
  };

  const handleSelectPopular = (term: string) => {
    setSearchQuery(term);
    handleSubmitSearch(term);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (<>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (<span key={i} className="bg-amber-200/70 text-[#0F1E2E] font-black rounded-xs px-0.5">
              {part}
            </span>) : (part))}
      </>);
  };

  const topProducts = searchResults.products.slice(0, 8);

  return (<div className="relative w-full" ref={containerRef}>
      {/* Search Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmitSearch();
        }}
        className={`relative flex items-center h-[44px] border border-gray-300 rounded-lg bg-white shadow-xs focus-within:border-[#147A7A] focus-within:ring-2 focus-within:ring-[#147A7A]/20 transition-all ${
          isDropdownOpen ? 'rounded-b-none border-b-transparent shadow-md' : ''
        }`}
      >
        {/* Input Text Box */}
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsDropdownOpen(true);
          }}
          onFocus={() => setIsDropdownOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder || 'What are you looking for?'}
          autoComplete="off"
          spellCheck="false"
          className="flex-1 px-3.5 h-full text-[13.5px] text-gray-800 placeholder:text-gray-400 outline-none bg-transparent"
        />

        {/* Clear Button (X) */}
        {searchQuery.trim().length > 0 && (<button
            type="button"
            onClick={handleClear}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors mr-1 cursor-pointer"
            title="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>)}

        {/* Category Dropdown (Desktop Only) */}
        {!isMobile && (<div className="relative border-l border-gray-200 h-full flex items-center" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="flex items-center gap-1.5 h-full px-3 text-[12px] font-medium text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap bg-transparent cursor-pointer select-none"
            >
              <span className="max-w-[120px] truncate">{selectedCategory}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryOpen && (<div className="absolute top-[calc(100%+4px)] right-0 z-50 w-60 bg-white border border-gray-200 rounded-xl shadow-2xl py-2 animate-fade-in max-h-80 overflow-y-auto">
                {categories.map((cat) => (<button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryOpen(false);
                      inputRef.current?.focus();
                    }}
                    className={`w-full text-left px-4 py-2 text-[12.5px] hover:bg-gray-50 transition-colors cursor-pointer ${
                      selectedCategory === cat ? 'text-[#147A7A] font-bold bg-[#147A7A]/5' : 'text-gray-700 font-medium'
                    }`}
                  >
                    {cat}
                  </button>))}
              </div>)}
          </div>)}

        {/* Submit Search Button */}
        <button
          type="submit"
          className="flex items-center justify-center w-[46px] h-full bg-[#147A7A] hover:bg-[#106262] active:bg-[#0c4e4e] text-white transition-colors cursor-pointer flex-shrink-0 rounded-r-[7px]"
          aria-label="Search"
        >
          <Search className="h-4.5 w-4.5" />
        </button>
      </form>

      {/* Live Dropdown Results Overlay */}
      {isDropdownOpen && (<div
          ref={listRef}
          className="absolute top-[43px] left-0 right-0 z-50 bg-white border border-gray-300 rounded-b-2xl shadow-2xl overflow-hidden animate-fade-in divide-y divide-gray-100 max-h-[75vh] sm:max-h-[520px] overflow-y-auto"
        >
          {/* 1. When query has text */}
          {searchQuery.trim().length > 0 ? (<div>
              {/* Category Suggestions (if matching) */}
              {searchResults.matchingCategories.length > 0 && (<div className="p-3 bg-slate-50/80 border-b border-gray-100">
                  <div className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                    <Tag className="w-3 h-3 text-[#147A7A]" />
                    <span>Matching Categories</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {searchResults.matchingCategories.map((cat) => (<button
                        key={cat}
                        type="button"
                        onClick={() => {
                          navigate(`/search?q=${encodeURIComponent(cat)}`);
                          setIsDropdownOpen(false);
                          if (onItemSelect) onItemSelect();
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-[#147A7A]/10 border border-gray-200 hover:border-[#147A7A]/30 text-xs font-semibold text-[#0F1E2E] rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                      >
                        <span>{highlightMatch(cat, searchQuery)}</span>
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                      </button>))}
                  </div>
                </div>)}

              {/* Product Results List */}
              {topProducts.length > 0 ? (<div>
                  <div className="px-4 py-2 bg-gray-50/60 flex items-center justify-between text-[11px] text-gray-500 font-semibold border-b border-gray-100">
                    <span>Products ({searchResults.totalCount} found)</span>
                    <span className="text-[10px] text-gray-400 font-normal">Use ↑↓ to navigate</span>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {topProducts.map((product, idx) => {
                      const isSelected = selectedIndex === idx;
                      const hasHire = (product.hirePrice ?? 0) > 0;
                      const buyPrice = product.buyPrice ?? product.price ?? 0;
                      const categoryDisplay =
                        product.category ||
                        (product.categories && product.categories[0]
                          ? product.categories[0].replace(/-/g, ' ')
                          : 'Equipment');

                      return (<div
                          key={product.id}
                          data-index={idx}
                          onClick={() => {
                            navigate(`/product/${(product as any).slug || product.id}`);
                            setIsDropdownOpen(false);
                            if (onItemSelect) onItemSelect();
                          }}
                          className={`p-3 sm:p-3.5 flex items-center justify-between gap-3.5 transition-all cursor-pointer group ${
                            isSelected ? 'bg-[#147A7A]/8 text-[#147A7A]' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Product Thumbnail */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-white border border-gray-200 p-1 flex-shrink-0 flex items-center justify-center overflow-hidden group-hover:border-[#147A7A]/40 transition-colors">
                              <img
                                src={proxyImageUrl(product.image)}
                                alt={product.name}
                                className="w-full h-full object-contain"
                                loading="lazy"
                                onError={handleImageError}
                              />
                            </div>

                            {/* Product Title, SKU, Brand & Category */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10.5px] font-bold text-[#147A7A] uppercase tracking-wider">
                                  {product.brand}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span className="text-[10.5px] text-gray-500 capitalize truncate">
                                  {categoryDisplay}
                                </span>
                                {product.sku && (<span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1 rounded">
                                    {product.sku}
                                  </span>)}
                              </div>

                              <p className="text-[13px] font-bold text-[#0F1E2E] group-hover:text-[#147A7A] transition-colors truncate">
                                {highlightMatch(product.name, searchQuery)}
                              </p>

                              {/* Badges / Hire Indicator */}
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {hasHire && (<span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-[#FFF8ED] text-[#E88D2A] border border-[#FDE5CC] rounded text-[9.5px] font-extrabold uppercase">
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    Hire: ${product.hirePrice}/wk
                                  </span>)}
                                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
                                  <CheckCircle className="w-2.5 h-2.5" />
                                  NDIS Consumables
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Pricing & Arrow */}
                          <div className="text-right flex-shrink-0 flex items-center gap-3">
                            <div>
                              {buyPrice > 0 ? (<div className="text-[14px] sm:text-[15px] font-extrabold text-[#0F1E2E]">
                                  ${buyPrice.toFixed(2)}
                                </div>) : hasHire ? (<div className="text-[13px] font-extrabold text-[#E88D2A]">
                                  Hire ${product.hirePrice}/wk
                                </div>) : (<div className="text-[11px] font-bold text-gray-500">
                                  Quote on Request
                                </div>)}
                              {hasHire && buyPrice > 0 && (<div className="text-[10px] font-bold text-[#E88D2A]">
                                  ${product.hirePrice}/wk
                                </div>)}
                            </div>
                            <div className="w-7 h-7 rounded-full bg-gray-100 group-hover:bg-[#147A7A] group-hover:text-white flex items-center justify-center transition-colors">
                              <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                            </div>
                          </div>
                        </div>);
                    })}
                  </div>

                  {/* View All Results Button */}
                  <div className="p-3 bg-slate-50 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => handleSubmitSearch()}
                      className="w-full py-2.5 px-4 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <span>
                        View all {searchResults.totalCount} results for "{searchQuery}"
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>) : (/* Empty state when query produces no matches */
                <div className="p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
                    <Search className="w-6 h-6" />
                  </div>
                  <p className="text-[14px] font-bold text-[#0F1E2E]">
                    No equipment matches "{searchQuery}"
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Try checking your spelling, searching with general terms like "bed", "walker", "wheelchair", or browse all categories.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/shop');
                        setIsDropdownOpen(false);
                        if (onItemSelect) onItemSelect();
                      }}
                      className="px-4 py-2 bg-[#147A7A] text-white text-xs font-bold rounded-xl hover:bg-[#106262] transition-colors cursor-pointer"
                    >
                      Browse All Equipment
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/hire');
                        setIsDropdownOpen(false);
                        if (onItemSelect) onItemSelect();
                      }}
                      className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      Explore Hire Range
                    </button>
                  </div>
                </div>)}
            </div>) : (/* 2. When query is empty and user opened / focused search bar */
            <div className="p-4 sm:p-5 space-y-4">
              {/* Popular Searches */}
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-[#147A7A]" />
                  <span>Popular Equipment Searches</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_SEARCHES.map((term) => (<button
                      key={term}
                      type="button"
                      onClick={() => handleSelectPopular(term)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-[#147A7A]/10 hover:text-[#147A7A] text-gray-700 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search className="w-3 h-3 text-gray-400" />
                      <span>{term}</span>
                    </button>))}
                </div>
              </div>

              {/* Quick Clinical Categories */}
              <div className="pt-3 border-t border-gray-100">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#E88D2A]" />
                  <span>Explore Key Categories</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { label: 'Electric Beds', path: '/shop/beds' },
                    { label: 'Wheelchairs', path: '/shop/wheelchairs' },
                    { label: 'Seat Walkers', path: '/shop/seat-walkers' },
                    { label: 'Equipment Hire', path: '/hire' },
                    { label: 'Lift Chairs', path: '/shop/lift-chairs' },
                    { label: 'Bathroom & Toilet', path: '/shop/bathroom-and-toilet' },
                  ].map((cat) => (<button
                      key={cat.label}
                      type="button"
                      onClick={() => {
                        navigate(cat.path);
                        setIsDropdownOpen(false);
                        if (onItemSelect) onItemSelect();
                      }}
                      className="p-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-left border border-gray-100 transition-colors flex items-center justify-between group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-[#0F1E2E] group-hover:text-[#147A7A] truncate">
                        {cat.label}
                      </span>
                      <ArrowRight className="w-3 h-3 text-gray-400 group-hover:text-[#147A7A]" />
                    </button>))}
                </div>
              </div>
            </div>)}
        </div>)}
    </div>);
}

export default LiveSearchBar;
