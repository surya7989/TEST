import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, ArrowRight, Trash2 } from 'lucide-react';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { formatPriceLabel, getVariantPriceInfo } from '@/lib/productPricing';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { useProducts, getProductById, getProductBySlug } from '@/data/products';
import { Product } from '@/types/catalogue';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';

export function WishlistPage() {
  const { items, toggleItem, clearWishlist } = useWishlist();
  const { addItem } = useCart();
  const allProducts = useProducts();

  const wishlistProducts: Product[] = useMemo(() => {
    return items
      .map((id) => allProducts.find((p) => p.id === id || p.slug === id || p.sku === id) || getProductById(id) || getProductBySlug(id))
      .filter(Boolean) as Product[];
  }, [items, allProducts]);

  return (<div className="min-h-screen bg-[#F7F9FA] py-8">
      <div className="max-w-[1400px] mx-auto px-6 2xl:px-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'My Wishlist' }]} />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-6 mb-8">
          <div>
            <h1 className="text-[28px] font-extrabold text-[#0F1E2E] tracking-tight">
              My Saved Items
            </h1>
            <p className="text-[14px] text-gray-600 mt-1">
              You have <strong className="text-[#0F1E2E]">{wishlistProducts.length}</strong> {wishlistProducts.length === 1 ? 'item' : 'items'} saved in your wishlist
            </p>
          </div>

          {wishlistProducts.length > 0 && (<button
              onClick={clearWishlist}
              className="text-[13px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Clear Wishlist
            </button>)}
        </div>

        {wishlistProducts.length === 0 ? (<div className="bg-white border border-gray-200 rounded-2xl p-12 text-center max-w-xl mx-auto my-12 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center mx-auto mb-4">
              <Heart className="h-8 w-8" />
            </div>
            <h2 className="text-[20px] font-bold text-[#0F1E2E] mb-2">Your wishlist is empty</h2>
            <p className="text-[14px] text-gray-500 mb-6">
              Browse our specialist assistive technology catalogue and save items you want to review or purchase later.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#147A7A] hover:bg-[#106262] text-white text-[14px] font-semibold rounded-lg shadow-sm transition-all"
            >
              Explore Equipment
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {wishlistProducts.map((product) => {
              // Variant-aware: never show/add the stale base price when
              // sizes/options carry their own prices.
              const priceInfo = getVariantPriceInfo(product as any);
              const displayPrice = priceInfo.hasPricedVariants ? priceInfo.min : (product.buyPrice || (product as any).price || 0);
              const priceLabel = formatPriceLabel(product as any);
              const productUrl = `/product/${product.slug || product.id}`;

              return (<div
                  key={product.id}
                  className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
                >
                  <div>
                    {/* Product Image */}
                    <div className="relative aspect-square bg-[#F8F9FA] overflow-hidden p-4 flex items-center justify-center border-b border-gray-100">
                      <Link to={productUrl} className="w-full h-full flex items-center justify-center">
                        <img
                          src={proxyImageUrl(product.image)}
                          alt={product.name}
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          onError={handleImageError}
                        />
                      </Link>
                      <button
                        onClick={() => toggleItem(product.id)}
                        className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Remove from wishlist"
                      >
                        <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      </button>
                      {product.badge && (<span className="absolute top-3 left-3 bg-[#E88D2A] text-white text-[11px] font-bold px-2 py-0.5 rounded">
                          {product.badge}
                        </span>)}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <p className="text-[11px] font-bold text-[#147A7A] uppercase tracking-wider">
                        {product.brand}
                      </p>
                      <Link
                        to={productUrl}
                        className="text-[14px] font-bold text-[#0F1E2E] hover:text-[#147A7A] transition-colors line-clamp-2 mt-1"
                      >
                        {product.name}
                      </Link>
                      <p className="text-[12px] text-gray-500 line-clamp-2 mt-1">
                        {product.shortDescription || product.fullDescription || ''}
                      </p>
                    </div>
                  </div>

                  {/* Pricing & Add to Cart */}
                  <div className="p-4 pt-0">
                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-[17px] font-black text-[#0F1E2E]">
                          {priceLabel || 'Price on request'}
                        </span>
                        {product.hirePrice > 0 && (<span className="block text-[10.5px] text-gray-500">
                            or ${product.hirePrice}/wk hire
                          </span>)}
                      </div>

                      {priceInfo.needsOptions ? (
                        <Link
                          to={productUrl}
                          className="flex items-center gap-1.5 px-3 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-[12.5px] font-semibold rounded-lg transition-all cursor-pointer"
                        >
                          Select Options
                        </Link>
                      ) : (
                      <button
                        onClick={() =>
                          addItem({
                            id: product.id,
                            sku: (product as any).sku || product.id,
                            slug: (product as any).slug,
                            name: product.name,
                            price: displayPrice,
                            image: product.image,
                            purchaseType: 'buy',
                            gstType: (product as any).gstType || 'gst-free',
                            gstRate: (product as any).gstRate || 0,
                            deliveryFee: (product as any).deliveryFee || 0,
                          })
                        }
                        className="flex items-center gap-1.5 px-3 py-2 bg-[#147A7A] hover:bg-[#106262] text-white text-[12.5px] font-semibold rounded-lg transition-all cursor-pointer"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Add to Cart
                      </button>
                      )}
                    </div>
                  </div>
                </div>);
            })}
          </div>)}
      </div>
    </div>);
}
