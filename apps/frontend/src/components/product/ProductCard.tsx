import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Star,
  Check,
  CheckCircle,
  RotateCcw,
  FileText,
  SlidersHorizontal,
  ArrowRight
} from 'lucide-react';
import { Product } from '@/types/catalogue';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { formatCurrency, getColorSwatchHex } from '@/lib/utils';
import { ProductImage } from '@/components/ui/ProductImage';

interface ProductCardProps {
  product: Product;
  viewMode?: 'grid' | 'list';
  hireOnly?: boolean;
  onQuoteRequest?: (product: Product) => void;
  /** Load image eagerly (first results on screen). */
  eagerImage?: boolean;
}

export function ProductCard({
  product,
  viewMode = 'grid',
  hireOnly = false,
  onQuoteRequest,
  eagerImage = false,
}: ProductCardProps) {
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const inWishlist = isInWishlist(product.id);
  const hasVariants = product.variants && product.variants.length > 0;
  const hireWeeklyRate = product.hirePrice && product.hirePrice > 0 ? product.hirePrice : 0;
  const effectiveBuyPrice = product.buyPrice || (product as any).price || 0;
  const isHireOnlyProduct =
    (product.purchaseType === 'hire' || (product.buyAvailable === false && (product.hireAvailable || hireWeeklyRate > 0))) &&
    effectiveBuyPrice <= 0;
  const isHireActive = hireOnly || isHireOnlyProduct;
  const isQuoteOnly =
    product.quoteRequired ||
    (!isHireActive && effectiveBuyPrice <= 0 && !hasVariants);

  const colorAttr = product.attributes?.find((a) => a.slug === 'colour' || a.slug === 'color' || a.type === 'color');
  const sizeAttr = product.attributes?.find((a) => a.slug === 'size');

  // Calculate pricing range
  const priceDisplay = React.useMemo(() => {
    if (isHireActive) {
      if (hasVariants) {
        const hireVariants = product.variants.filter((v) => v.attributes && v.attributes['purchase-type'] === 'hire');
        const hirePrices = (hireVariants.length > 0 ? hireVariants : product.variants)
          .map((v) => v.price || v.hirePrice || product.hirePrice || 0)
          .filter((p) => p > 0);
        if (hirePrices.length > 0) {
          const minHire = Math.min(...hirePrices);
          const maxHire = Math.max(...hirePrices);
          if (minHire !== maxHire) {
            return {
              main: `$${minHire.toFixed(2)} – $${maxHire.toFixed(2)}`,
              period: '/wk',
              sub: isHireOnlyProduct ? 'Equipment Hire Only • Min. 2 wks' : `Min. 2 wks: $${(minHire * 2).toFixed(2)}`,
            };
          }
          return {
            main: `$${minHire.toFixed(2)}`,
            period: '/wk',
            sub: isHireOnlyProduct ? 'Equipment Hire Only • Min. 2 wks' : `Min. 2 wks: $${(minHire * 2).toFixed(2)}`,
          };
        }
      }
      if (!hireWeeklyRate) {
        return { main: 'Price on Application', period: '', sub: 'Hire quote required' };
      }
      return {
        main: `$${hireWeeklyRate.toFixed(2)}`,
        period: '/wk',
        sub: isHireOnlyProduct ? 'Equipment Hire Only • Min. 2 wks' : `Min. 2 wks: $${(hireWeeklyRate * 2).toFixed(2)}`,
      };
    }

    if (hasVariants) {
      // In buy mode, filter ONLY for buy variants (or variants without purchase-type: 'hire')
      const buyVariants = product.variants.filter((v) => v.attributes && v.attributes['purchase-type'] === 'buy');
      const nonHireVariants = product.variants.filter((v) => !v.attributes || v.attributes['purchase-type'] !== 'hire');
      const candidateVariants = buyVariants.length > 0 ? buyVariants : nonHireVariants;

      const prices = (candidateVariants.length > 0 ? candidateVariants : product.variants)
        .map((v) => v.price || effectiveBuyPrice)
        .filter((p) => p > 0);
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        if (minPrice !== maxPrice) {
          return {
            main: `${formatCurrency(minPrice)} – ${formatCurrency(maxPrice)}`,
            period: '',
            sub: product.hireAvailable && hireWeeklyRate > 0 ? `or from $${hireWeeklyRate.toFixed(2)}/wk hire` : 'Multiple sizes & options',
          };
        }
        return {
          main: formatCurrency(minPrice),
          period: '',
          sub: product.hireAvailable && hireWeeklyRate > 0 ? `or from $${hireWeeklyRate.toFixed(2)}/wk hire` : undefined,
        };
      }
    }

    if (effectiveBuyPrice > 0) {
      return {
        main: formatCurrency(effectiveBuyPrice),
        period: '',
        sub: product.hireAvailable && hireWeeklyRate > 0 ? `or from $${hireWeeklyRate.toFixed(2)}/wk hire` : 'NDIS Capital & Consumables',
      };
    }

    return {
      main: 'Price on Application',
      period: '',
      sub: 'Clinical quote required',
    };
  }, [product, isHireActive, hasVariants, hireWeeklyRate, isHireOnlyProduct, effectiveBuyPrice]);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Guard against adding $0 items to cart
    const effectivePrice = isHireActive ? hireWeeklyRate * 2 : effectiveBuyPrice;
    if (!effectivePrice || effectivePrice <= 0) return;

    const added = addItem({
      id: product.id,
      code: (product as any).ndisCode || product.sku || product.id,
      sku: product.sku || product.id,
      detail: isHireActive ? '2 Wks Hire' : undefined,
      slug: product.slug,
      name: product.name,
      price: effectivePrice,
      image: product.image,
      purchaseType: isHireActive ? 'hire' : 'buy',
      weeklyRate: isHireActive ? hireWeeklyRate : undefined,
      hireWeeks: isHireActive ? 2 : undefined,
      gstType: product.gstType || 'gst-free',
      gstRate: product.gstRate || 0,
      deliveryFee: product.deliveryFee || 0,
    });

    if (added) {
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    }
  };

  const productLink = isHireActive
    ? `/product/${product.slug || product.id}?type=hire`
    : `/product/${product.slug || product.id}`;

  // ==========================================
  // LIST VIEW LAYOUT
  // ==========================================
  if (viewMode === 'list') {
    return (<div
        className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md hover:border-[#147A7A]/40 transition-all duration-200 flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between group"
        role="listitem"
      >
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center flex-1 min-w-0">
          {/* Image */}
          <Link
            to={productLink}
            className="relative w-full sm:w-44 aspect-square bg-[#F8FAFC] rounded-xl overflow-hidden flex-shrink-0 border border-gray-100 p-3 flex items-center justify-center"
          >
            <ProductImage
              src={product.image}
              alt={product.name}
              eager={eagerImage}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
            {product.swl && (<span className="absolute bottom-2 left-2 bg-[#0F1E2E]/80 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-xs backdrop-blur-xs">
                SWL: {product.swl}
              </span>)}
            {product.badge && (<span className="absolute top-2 left-2 bg-[#0F1E2E] text-white text-[9.5px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                {product.badge}
              </span>)}
          </Link>

          {/* Details */}
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#147A7A] uppercase tracking-wider">
                {product.brand}
              </span>
              <span className="text-gray-300">•</span>
              <span className="text-[11px] text-gray-500 capitalize truncate">
                {product.categories?.[0]?.replace(/-/g, ' ') || 'Assistive Technology'}
              </span>
              {product.sku && (<>
                  <span className="text-gray-300 hidden sm:inline">•</span>
                  <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
                    SKU: {product.sku}
                  </span>
                </>)}
            </div>

            <Link
              to={productLink}
              className="text-base font-bold text-[#0F1E2E] hover:text-[#147A7A] transition-colors line-clamp-1"
            >
              {product.name}
            </Link>

            <div className="flex items-center gap-1.5">
              <div className="flex items-center text-amber-400">
                {[...Array(5)].map((_, i) => (<Star key={i} className="h-3 w-3 fill-current" />))}
              </div>
              <span className="text-xs font-bold text-[#0F1E2E]">{product.rating}</span>
              <span className="text-[11px] text-gray-400">({product.reviewCount} reviews)</span>
            </div>

            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed max-w-xl">
              {product.shortDescription || product.fullDescription}
            </p>

            {/* Badges / Options notice */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {hasVariants && (<span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10.5px] font-semibold flex items-center gap-1">
                  <SlidersHorizontal className="w-3 h-3" />
                  {product.variants.length} Variants Available
                </span>)}

              {product.hireAvailable && !hireOnly && (<span className="px-2 py-0.5 bg-[#FFF8ED] text-[#E88D2A] border border-[#FDE5CC] rounded text-[10.5px] font-bold">
                  Hire Available
                </span>)}
              {colorAttr && (<span className="px-2 py-0.5 bg-slate-50 text-gray-600 border border-gray-200 rounded text-[10.5px] font-semibold flex items-center gap-1">
                  <span className="flex items-center">
                    {colorAttr.values.slice(0, 5).map((v) => (<span
                        key={v.value}
                        title={v.label}
                        className="w-3 h-3 rounded-full border border-black/15 -ml-0.5 first:ml-0"
                        style={{ backgroundColor: getColorSwatchHex(v.value, (v as any).colorHex) }}
                      />))}
                  </span>
                  {colorAttr.values.length} Colours
                </span>)}
              {sizeAttr && (<span className="px-2 py-0.5 bg-slate-50 text-gray-600 border border-gray-200 rounded text-[10.5px] font-semibold">
                  {sizeAttr.values.length} Sizes
                </span>)}
            </div>
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="w-full sm:w-auto pt-4 sm:pt-0 sm:pl-6 border-t sm:border-t-0 sm:border-l border-gray-100 flex sm:flex-col items-center sm:items-end justify-between gap-3 flex-shrink-0">
          <div className="text-left sm:text-right">
            <div className={`text-xl font-extrabold ${hireOnly ? 'text-[#E88D2A]' : 'text-[#0F1E2E]'}`}>
              {priceDisplay.main}
              {priceDisplay.period && (<span className="text-xs font-semibold text-gray-500">{priceDisplay.period}</span>)}
            </div>
            {priceDisplay.sub && (<div className="text-[11px] text-gray-500 font-medium">{priceDisplay.sub}</div>)}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleItem(product.id)}
              className="p-2.5 rounded-xl border border-gray-200 hover:border-gray-300 text-gray-600 hover:text-red-500 transition-colors cursor-pointer"
              aria-label="Wishlist"
            >
              <Heart className={`w-4 h-4 ${inWishlist ? 'fill-red-500 text-red-500' : ''}`} />
            </button>

            {hasVariants ? (
              <Link
                to={productLink}
                className="px-4 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>SELECT OPTIONS</span>
              </Link>
            ) : isQuoteOnly ? (
              <Link
                to={productLink}
                className="px-4 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>VIEW DETAILS</span>
              </Link>
            ) : isHireOnlyProduct && !hireOnly ? (
              <Link
                to={`/product/${product.slug || product.id}?type=hire`}
                className="px-4 py-2.5 bg-[#E88D2A] hover:bg-[#D47C1E] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-sm cursor-pointer hover:scale-[1.02]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>VIEW HIRE OPTIONS</span>
              </Link>
            ) : (<button
                type="button"
                onClick={handleAddToCart}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm cursor-pointer ${
                  justAdded
                    ? 'bg-[#008244] text-white'
                    : hireOnly
                    ? 'bg-[#E88D2A] hover:bg-[#D47C1E] text-white'
                    : 'bg-[#147A7A] hover:bg-[#106262] text-white'
                }`}
              >
                {justAdded ? (<>
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Added!</span>
                  </>) : hireOnly ? (<>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Hire (2 Wks)</span>
                  </>) : (<>
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>ADD TO CART</span>
                  </>)}
              </button>)}
          </div>
        </div>
      </div>);
  }

  // ==========================================
  // GRID VIEW LAYOUT (DEFAULT)
  // ==========================================
  return (<div
      className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-[#147A7A]/40 transition-all duration-200 flex flex-col justify-between group"
      role="listitem"
    >
      <div>
        {/* Product Image Box */}
        <div className="relative aspect-square bg-[#F8FAFC] overflow-hidden p-6 flex items-center justify-center border-b border-gray-100">
          <Link to={productLink} className="w-full h-full flex items-center justify-center">
            <ProductImage
              src={product.image}
              alt={product.name}
              eager={eagerImage}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </Link>

          {/* Badge */}
          {hireOnly || isHireOnlyProduct ? (
            <span className="absolute top-3 left-3 bg-[#E88D2A] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm z-10 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Equipment Hire
            </span>
          ) : product.badge ? (
            <span className="absolute top-3 left-3 bg-[#0F1E2E] text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-sm z-10">
              {product.badge}
            </span>
          ) : hasVariants ? (
            <span className="absolute top-3 left-3 bg-blue-600/90 text-white text-[9.5px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider shadow-xs z-10 flex items-center gap-1">
              <SlidersHorizontal className="w-2.5 h-2.5" />
              Variants
            </span>
          ) : null}

          {/* SWL tag */}
          {product.swl && (<span className="absolute bottom-2 left-3 bg-white/90 text-gray-700 border border-gray-200 text-[9.5px] font-bold px-2 py-0.5 rounded shadow-xs">
              SWL: {product.swl}
            </span>)}

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleItem(product.id);
            }}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-sm flex items-center justify-center transition-all cursor-pointer z-10"
            aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Heart
              className={`h-4 w-4 transition-colors ${
                inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'
              }`}
            />
          </button>
        </div>

        {/* Product Content */}
        <div className="p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#147A7A] uppercase tracking-wider">
              {product.brand}
            </span>
            <span className="text-[10.5px] text-gray-400 font-medium truncate max-w-[120px]">
              {product.categories?.[0]?.replace(/-/g, ' ') || 'AT Equipment'}
            </span>
          </div>

          <Link
            to={productLink}
            className="block text-sm font-bold text-[#0F1E2E] group-hover:text-[#147A7A] transition-colors line-clamp-2 leading-snug min-h-[2.5rem]"
          >
            {product.name}
          </Link>

          {/* Rating */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <div className="flex items-center text-amber-400">
              {[...Array(5)].map((_, i) => (<Star key={i} className="h-3 w-3 fill-current" />))}
            </div>
            <span className="text-[11.5px] font-bold text-[#0F1E2E]">{product.rating}</span>
            <span className="text-[10.5px] text-gray-400">({product.reviewCount})</span>
          </div>

          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed pt-1">
            {product.shortDescription || product.fullDescription}
          </p>

          {/* Colour & Size options preview (updates on detail page when selected) */}
          {(colorAttr || sizeAttr) && (<div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pt-1.5">
              {colorAttr && (<span className="flex items-center gap-1">
                  {colorAttr.values.slice(0, 6).map((v) => (<span
                      key={v.value}
                      title={v.label}
                      className="w-3.5 h-3.5 rounded-full border border-black/15 shadow-xs"
                      style={{ backgroundColor: getColorSwatchHex(v.value, (v as any).colorHex) }}
                    />))}
                  {colorAttr.values.length > 6 && (<span className="text-[10px] text-gray-400 font-bold">+{colorAttr.values.length - 6}</span>)}
                </span>)}
              {sizeAttr && (<span className="text-[10.5px] text-gray-500 font-semibold truncate">
                  {sizeAttr.values.slice(0, 4).map((v) => v.label).join(' • ')}
                  {sizeAttr.values.length > 4 ? ` +${sizeAttr.values.length - 4} sizes` : ''}
                </span>)}
            </div>)}
        </div>
      </div>

      {/* Pricing & Button Action */}
      <div className="p-5 pt-0">
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className={`text-base sm:text-lg font-extrabold truncate ${hireOnly ? 'text-[#E88D2A]' : 'text-[#0F1E2E]'}`}>
              {priceDisplay.main}
              {priceDisplay.period && (<span className="text-xs font-semibold text-gray-500">{priceDisplay.period}</span>)}
            </div>
            {priceDisplay.sub && (<span className="block text-[10px] text-gray-500 font-medium truncate">
                {priceDisplay.sub}
              </span>)}
          </div>

          {/* Action Button: SELECT OPTIONS / ADD TO CART / REQUEST A QUOTE */}
          {isHireOnlyProduct && !hireOnly ? (
            <Link
              to={productLink}
              className="flex items-center gap-1 px-3 py-2 bg-[#E88D2A] hover:bg-[#D47C1E] text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex-shrink-0 cursor-pointer hover:scale-[1.02]"
            >
              <RotateCcw className="w-3 h-3" />
              <span>HIRE OPTIONS</span>
            </Link>
          ) : hasVariants ? (
            <Link
              to={productLink}
              className="flex items-center gap-1 px-3 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex-shrink-0 cursor-pointer hover:scale-[1.02]"
            >
              <span>SELECT OPTIONS</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          ) : isQuoteOnly ? (
            <Link
              to={productLink}
              className="flex items-center gap-1 px-3 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-[11px] font-bold rounded-xl transition-all shadow-sm flex-shrink-0 cursor-pointer hover:scale-[1.02]"
            >
              <span>REQUEST QUOTE</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          ) : (<button
              type="button"
              onClick={handleAddToCart}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-bold rounded-xl transition-all shadow-sm flex-shrink-0 cursor-pointer ${
                justAdded
                  ? 'bg-[#008244] text-white'
                  : hireOnly
                  ? 'bg-[#E88D2A] hover:bg-[#D47C1E] text-white'
                  : 'bg-[#147A7A] hover:bg-[#106262] text-white'
              }`}
            >
              {justAdded ? (<>
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                  <span>Added!</span>
                </>) : hireOnly ? (<>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Hire (2 Wks)</span>
                </>) : (<>
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>ADD TO CART</span>
                </>)}
            </button>)}
        </div>
      </div>
    </div>);
}
