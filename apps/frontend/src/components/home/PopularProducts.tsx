import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Heart, ShoppingCart, Star } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { ProductImage } from '@/components/ui/ProductImage';
import { useProducts, type Product } from '@/data/products';
import { getVariantPriceInfo, formatPriceLabel } from '@/lib/productPricing';

export function PopularProducts() {
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem } = useCart();
  const allProducts = useProducts();

  // Pull premier authentic Rehab Hire clinical products directly from the dynamic catalogue
  const products = React.useMemo(() => {
    const flagshipKeywords = [
      'configura® comfort',
      'empresa long term care bed',
      'aspire vogue',
      'aspire vida',
      'ocean ergo',
      'sara stedy',
      'roho®',
      'universal stand assist',
    ];

    const source = allProducts.filter((p) => p.buyAvailable !== false && (p as any).available !== false);
    const flagship: Product[] = [];
    flagshipKeywords.forEach((kw) => {
      const match = source.find((p) =>
          p.image &&
          p.image.trim().length > 0 &&
          p.name.toLowerCase().includes(kw) &&
          ((p.buyPrice || 0) > 0 || (p.price || 0) > 0));
      if (match && !flagship.some((s) => s.id === match.id)) {
        flagship.push(match);
      }
    });

    if (flagship.length < 8) {
      const fillers = [...source]
        .filter((p) =>
            p.image &&
            p.image.trim().length > 0 &&
            ((p.buyPrice || 0) > 0 || (p.price || 0) > 0) &&
            !flagship.some((s) => s.id === p.id))
        .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0) || (b.rating || 0) - (a.rating || 0));

      while (flagship.length < 8 && fillers.length > 0) {
        flagship.push(fillers.shift()!);
      }
    }

    return flagship.slice(0, 8);
  }, [allProducts]);

  return (<section className="py-10 sm:py-14 bg-[#F7F9FA]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <span className="inline-block px-3 py-1 bg-[#147A7A]/10 text-[#147A7A] text-[12px] font-bold rounded-full mb-1 uppercase tracking-wider">
              Specialist Selection
            </span>
            <h2 className="text-[24px] sm:text-[28px] font-extrabold text-[#0F1E2E]">Popular Assistive Technology</h2>
          </div>
          <Link
            to="/shop"
            className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#147A7A] hover:underline whitespace-nowrap"
          >
            View All Equipment
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Product Grid */}
        {products.length === 0 ? (<div className="text-center py-12 px-6 bg-white rounded-2xl border border-gray-200 shadow-xs">
            <h3 className="text-sm font-bold text-gray-800 mb-1">No Products Available Yet</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto mb-4">
              Add products to your catalogue to see them here.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <span>Browse All Equipment</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>) : (<div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
            {products.map((product) => {
              const inWishlist = isInWishlist(product.id);
              const productLink = `/product/${(product as any).slug || product.id}`;
              // Variant-aware pricing (shared helper): listings never
              // contradict the product page / checkout totals.
              const priceInfo = getVariantPriceInfo(product as any);
              const displayPrice = priceInfo.hasPricedVariants ? priceInfo.min : priceInfo.base;
              const priceLabel = formatPriceLabel(product as any);
              const needsOptions = priceInfo.needsOptions;

              return (<div
                  key={product.id}
                  className="group bg-white border border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-[#147A7A]/40 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="flex-1 flex flex-col">
                    {/* Image */}
                    <div className="relative aspect-square overflow-hidden bg-[#F8F9FA] p-4 flex items-center justify-center border-b border-gray-100">
                      <Link to={productLink} className="block w-full h-full flex items-center justify-center">
                        <ProductImage
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      </Link>
                      {(product as any).badge && (<span className="absolute top-2 left-2 sm:top-3 sm:left-3 bg-[#E88D2A] text-white text-[9.5px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md shadow-xs pointer-events-none">
                          {(product as any).badge}
                        </span>)}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleItem(product.id);
                        }}
                        className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 bg-white/90 rounded-full shadow-xs hover:bg-white transition-all cursor-pointer"
                        aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                      >
                        <Heart
                          className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-gray-500'}`}
                        />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-[9.5px] sm:text-[11px] font-bold text-[#147A7A] uppercase tracking-wider">{product.brand}</p>
                        <Link
                          to={productLink}
                          className="block text-[12.5px] sm:text-[14px] font-bold text-[#0F1E2E] mt-0.5 sm:mt-1 line-clamp-2 group-hover:text-[#147A7A] transition-colors leading-snug"
                        >
                          {product.name}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 sm:mt-2">
                        <div className="flex items-center text-amber-400">
                          {[...Array(5)].map((_, i) => (<Star key={i} className="h-3 w-3 sm:h-3.5 sm:w-3.5 fill-current" />))}
                        </div>
                        <span className="text-[10.5px] sm:text-[11.5px] font-bold text-[#0F1E2E] ml-0.5 sm:ml-1">{product.rating}</span>
                        <span className="text-[10px] sm:text-[11px] text-gray-400">({product.reviewCount})</span>
                      </div>
                    </div>
                  </div>

                  {/* Price & Add to Cart */}
                  <div className="p-3 sm:p-5 pt-0">
                    <div className="pt-2.5 sm:pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-[14px] sm:text-[17px] font-black text-[#0F1E2E]">{priceLabel}</span>
                        {product.hirePrice > 0 && (<span className="text-[9.5px] sm:text-[11px] text-gray-500 block truncate">or ${product.hirePrice}/wk</span>)}
                      </div>
                      {needsOptions ? (
                        <Link
                          to={productLink}
                          className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 bg-[#147A7A] hover:bg-[#106262] text-white rounded-lg shadow-xs transition-all cursor-pointer"
                          aria-label="Select options"
                          title="Select options"
                        >
                          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Link>
                      ) : (
                      <button
                        type="button"
                        onClick={() => addItem({ id: product.id, sku: (product as any).sku || product.id, name: product.name, price: displayPrice, image: product.image })}
                        className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 bg-[#147A7A] hover:bg-[#106262] text-white rounded-lg shadow-xs transition-all cursor-pointer"
                        aria-label="Add to cart"
                      >
                        <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                      )}
                    </div>
                  </div>
                </div>);
            })}
          </div>)}
      </div>
    </section>);
}
