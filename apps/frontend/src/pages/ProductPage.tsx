import React, { useState, useMemo, useEffect } from 'react';
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Star,
  CheckCircle,
  Headphones,
  Maximize2,
  X,
  ShieldCheck,
  Truck,
  Check,
  RotateCcw,
  Sparkles,
  Clock,
  FileText,
  HelpCircle,
  ChevronDown,
  SlidersHorizontal,
  ExternalLink,
  BookOpen,
  Info,
  Layers,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { Product, ProductVariant, OptionalEquipment, ProductDocument } from '@/types/catalogue';
import { PRODUCTS, getProductBySlug } from '@/data/products';
import { CATEGORIES, getCategoryBreadcrumbs, getCategoryBySlug } from '@/data/categories';
import { useWishlist } from '@/hooks/useWishlist';
import { useCart } from '@/hooks/useCart';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { ProductImage } from '@/components/ui/ProductImage';
import { getProductReviews, submitProductReview, type StoreReview } from '@/lib/api';
import { ProductCard } from '@/components/product/ProductCard';
import { formatCurrency, getColorSwatchHex, estimateWeeklyHireRate } from '@/lib/utils';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';
import { useAdminStore } from '@/store/adminStore';

export function ProductPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isInWishlist, toggleItem } = useWishlist();
  const { addItem, cartType, itemCount } = useCart();
  const adminProducts = useAdminStore((s) => s.products);

  // Find product by slug, id, SKU or variant SKU.
  // `found` is false for unknown slugs so the page renders a proper not-found
  // state instead of silently showing an unrelated product. Hooks below always
  // run unconditionally against `product` (rules of hooks).
  const { product, found } = useMemo(() => {
    const defaultFallback = adminProducts[0] || PRODUCTS[0];
    const miss = { product: defaultFallback, found: false };
    if (!slug) return miss;
    const sLower = slug.toLowerCase().trim();
    const cleanSlug = sLower.replace(/[^a-z0-9]+/g, '-');

    // Check reactive adminStore products first so admin edits & added products immediately reflect to customers!
    const adminMatch = (adminProducts || []).find((p) =>
        (p.slug && p.slug.toLowerCase() === sLower) ||
        (p.slug && p.slug.toLowerCase() === cleanSlug) ||
        p.id.toLowerCase() === sLower ||
        (p.sku && p.sku.toLowerCase() === sLower));
    if (adminMatch) return { product: adminMatch as Product, found: true };

    // 1. Direct slug match
    const bySlug = getProductBySlug(slug) || getProductBySlug(cleanSlug);
    if (bySlug) return { product: bySlug, found: true };

    // 2. Direct ID or SKU match
    const directMatch = adminProducts.find((p) =>
        p.id.toLowerCase() === sLower ||
        p.slug.toLowerCase() === sLower ||
        p.slug.toLowerCase() === cleanSlug ||
        p.sku.toLowerCase() === sLower);
    if (directMatch) return { product: directMatch as Product, found: true };

    // 3. Variant SKU or Variant ID match
    const variantMatch = adminProducts.find((p) =>
        p.variants &&
        p.variants.some((v) => (v.sku && v.sku.toLowerCase() === sLower) || v.id === slug));
    if (variantMatch) return { product: variantMatch as Product, found: true };

    // 4. Fuzzy name / substring match
    const fuzzy = adminProducts.find((p) =>
        p.slug.toLowerCase().includes(cleanSlug) ||
        p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').includes(cleanSlug));
    return fuzzy ? { product: fuzzy as Product, found: true } : miss;
  }, [slug, adminProducts]);

  // Tab State
  const [activeTab, setActiveTab] = useState<'description' | 'specifications' | 'related' | 'reviews'>('description');

  // Hire vs Buy Mode State
  const initialType = searchParams.get('type') === 'hire' && product.hireAvailable ? 'hire' : 'buy';
  const [purchaseType, setPurchaseType] = useState<'buy' | 'hire'>(initialType);
  const [hireWeeks, setHireWeeks] = useState(2);

  // Image & Lightbox State
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [activeVariantImage, setActiveVariantImage] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [addedNotification, setAddedNotification] = useState(false);

  // Zoom Lens Cursor State
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  // ==========================================
  // DYNAMIC MULTI-ATTRIBUTE VARIANT ENGINE
  // ==========================================
  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>({});

  // Initialize selected attributes when product changes
  useEffect(() => {
    setSelectedImageIndex(0);
    setActiveVariantImage(null);
    setSelectedAddons([]);

    if (product.attributes && product.attributes.length > 0) {
      const initial: Record<string, string> = {};
      product.attributes.forEach((attr) => {
        if (attr.values && attr.values.length > 0) {
          initial[attr.slug] = attr.values[0].value;
        }
      });
      setSelectedAttributes(initial);
    } else {
      setSelectedAttributes({});
    }

    if (searchParams.get('type') === 'hire' && product.hireAvailable) {
      setPurchaseType('hire');
    } else if (searchParams.get('type') === 'buy' || !product.hireAvailable) {
      setPurchaseType('buy');
    }
  }, [product.id, searchParams]);

  // Find the exact matching variant based on currently selected attributes
  // (case-insensitive, consistent with isOptionAvailable below)
  const currentVariant: ProductVariant | undefined = useMemo(() => {
    if (!product.variants || product.variants.length === 0) return undefined;

    return product.variants.find((v) => {
      return Object.entries(selectedAttributes).every(([attrSlug, attrVal]) => {
        const variantVal = v.attributes[attrSlug];
        if (!variantVal) return true; // wildcard
        return String(variantVal).toLowerCase() === String(attrVal).toLowerCase();
      });
    }) || product.variants[0];
  }, [product.variants, selectedAttributes]);

  // Dynamic image switching when variant changes (restart gallery at the new variant photo)
  useEffect(() => {
    if (currentVariant?.image) {
      setActiveVariantImage(currentVariant.image);
    } else {
      setActiveVariantImage(null);
    }
    setSelectedImageIndex(0);
  }, [currentVariant]);

  // Helper to check if a particular attribute value has valid available variants
  // (case-insensitive on both sides, matching the currentVariant matcher above)
  const isOptionAvailable = (attrSlug: string, value: string) => {
    if (!product.variants || product.variants.length === 0) return true;

    // Test hypothetical combination
    const hypothetical = {...selectedAttributes, [attrSlug]: value };

    return product.variants.some((v) => {
      const matches = Object.entries(hypothetical).every(([slug, val]) => {
        const vv = v.attributes[slug];
        if (slug === attrSlug) return vv === val || !vv;
        return !vv || String(vv).toLowerCase() === String(val).toLowerCase();
      });
      return matches && v.available !== false;
    });
  };

  // Handle attribute selection change
  const handleAttributeChange = (attrSlug: string, value: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attrSlug]: value,
    }));
  };

  // ==========================================
  // DYNAMIC OPTIONAL EQUIPMENT / ADDONS ENGINE
  // ==========================================
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  const toggleAddon = (addonId: string) => {
    setSelectedAddons((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]);
  };

  const checkedAddonsList = useMemo(() => {
    if (!product.optionalEquipment || product.optionalEquipment.length === 0) return [];
    return product.optionalEquipment.filter((e) => selectedAddons.includes(e.id));
  }, [product.optionalEquipment, selectedAddons]);

  // Total additions from addons
  const addonsTotalBuyPrice = checkedAddonsList.reduce((sum, e) => sum + (e.price || 0), 0);
  const addonsTotalHirePrice = checkedAddonsList.reduce((sum, e) => sum + (e.hirePrice || estimateWeeklyHireRate(e.price)),
    0);

  // Base Prices (from variant if available, else product)
  const baseBuyPrice = currentVariant?.price !== undefined ? currentVariant.price : (product.buyPrice || 0);
  const baseHirePrice = currentVariant?.hirePrice !== undefined
    ? currentVariant.hirePrice
    : (product.hirePrice || estimateWeeklyHireRate(baseBuyPrice));

  // Final Effective Prices
  const unitBuyPrice = baseBuyPrice + addonsTotalBuyPrice;
  const unitWeeklyHirePrice = baseHirePrice + addonsTotalHirePrice;
  const hirePeriodPrice = unitWeeklyHirePrice * hireWeeks;

  // Active SKU (dynamic variant SKU if selected)
  const activeSku = currentVariant?.sku || product.sku;

  // Image Gallery Assembly: strictly respects product.galleryImages and cover photo.
  // Never re-injects deleted images or obsolete variant photos.
  const galleryImages = useMemo(() => {
    if (product.galleryImages && product.galleryImages.length > 0) {
      const list = [...product.galleryImages];
      if (activeVariantImage && (product.galleryImages.includes(activeVariantImage) || activeVariantImage === product.image)) {
        const idx = list.indexOf(activeVariantImage);
        if (idx > 0) {
          list.splice(idx, 1);
          list.unshift(activeVariantImage);
        }
      } else if (product.image && !list.includes(product.image)) {
        list.unshift(product.image);
      }
      return list.filter(Boolean);
    }
    const fallback = product.image || activeVariantImage;
    return fallback ? [fallback] : [];
  }, [product.image, product.galleryImages, activeVariantImage]);

  const activeDisplayImage = galleryImages[selectedImageIndex] || galleryImages[0];

  // Mouse Magnification Handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setMousePos({ x, y });
  };

  // Add to Cart
  const handleAddToCart = () => {
    const codeVal = (product as any).ndisCode || activeSku || product.sku || product.id;
    const skuVal = activeSku || product.sku || product.id;
    const detailParts = [
      selectedAttributes['size'] || selectedAttributes['sizes'] ? `Size: ${selectedAttributes['size'] || selectedAttributes['sizes']}` : '',
      selectedAttributes['colour'] || selectedAttributes['color'] ? `Colour: ${selectedAttributes['colour'] || selectedAttributes['color']}` : '',
      purchaseType === 'hire' ? `${hireWeeks} Wks Hire` : '',
    ].filter(Boolean);

    const added = addItem({
      id: activeSku || product.id,
      code: codeVal,
      sku: skuVal,
      detail: detailParts.join(' • '),
      slug: product.slug,
      name: product.name,
      price: purchaseType === 'buy' ? unitBuyPrice : hirePeriodPrice,
      image: activeDisplayImage,
      purchaseType,
      selectedSize: selectedAttributes['size'] || selectedAttributes['sizes'],
      selectedColor: selectedAttributes['colour'] || selectedAttributes['color'],
      selectedAttributes,
      selectedExtras: checkedAddonsList.map((e) => ({
        id: e.id,
        name: e.name,
        price: e.price,
      })),
      weeklyRate: purchaseType === 'hire' ? unitWeeklyHirePrice : undefined,
      hireWeeks: purchaseType === 'hire' ? hireWeeks : undefined,
      quantity,
      gstType: product.gstType || 'gst-free',
      gstRate: product.gstRate || 0,
      deliveryFee: product.deliveryFee || 0,
    });

    if (added) {
      setAddedNotification(true);
      setTimeout(() => setAddedNotification(false), 3500);
    }
  };

  // ==========================================
  // LIVE CUSTOMER REVIEWS (approved reviews really count)
  // ==========================================
  const [liveReviews, setLiveReviews] = useState<StoreReview[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewNotice, setReviewNotice] = useState('');

  useEffect(() => {
    setLiveReviews([]);
    setReviewNotice('');
    getProductReviews(product.id)
      .then((res) => setLiveReviews(res.reviews || []))
      .catch(() => setLiveReviews([]));
  }, [product.id]);

  const displayRating = liveReviews.length > 0
    ? Math.round((liveReviews.reduce((s, r) => s + r.rating, 0) / liveReviews.length) * 10) / 10
    : product.rating;
  const displayReviewCount = liveReviews.length > 0 ? liveReviews.length : product.reviewCount;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || (!reviewTitle.trim() && !reviewComment.trim())) {
      setReviewNotice('Please add your name and a few words about the product.');
      return;
    }
    setReviewSending(true);
    setReviewNotice('');
    try {
      await submitProductReview({
        productId: product.id,
        productName: product.name,
        productImage: product.image,
        customerName: reviewName.trim(),
        rating: reviewRating,
        title: reviewTitle.trim(),
        comment: reviewComment.trim(),
      });
      setReviewNotice('Thank you! Your review was submitted and will appear after moderation.');
      setReviewName('');
      setReviewTitle('');
      setReviewComment('');
      setReviewRating(5);
    } catch (err: any) {
      setReviewNotice(err.message || 'Could not submit your review. Please try again.');
    } finally {
      setReviewSending(false);
    }
  };

  // Breadcrumbs construction
  const primaryCategorySlug = product.categories?.[0] || 'chairs';
  const categoryCrumbs = getCategoryBreadcrumbs(primaryCategorySlug);

  const breadcrumbItems = [
    { label: 'Home', to: '/' },
    { label: 'Shop', to: '/shop' },
    ...categoryCrumbs.map((c) => ({
      label: c.name,
      to: `/shop/${c.slug}`,
    })),
    { label: product.name },
  ];

  // Related Products
  const relatedProducts = useMemo(() => {
    const prods = (adminProducts && adminProducts.length > 0 ? adminProducts : PRODUCTS) as Product[];
    const sameCategory = prods.filter((p) => p.id !== product.id && p.categories?.some((c) => product.categories?.includes(c)));
    if (sameCategory.length >= 4) return sameCategory.slice(0, 4);
    const others = prods.filter((p) => p.id !== product.id);
    return [...sameCategory,...others].slice(0, 4);
  }, [product, adminProducts]);

  // Unknown slug: proper not-found state (placed after all hooks).
  if (!found) {
    return (<div className="min-h-screen bg-[#F7F9FA] py-16 text-[#0F1E2E]">
        <div className="max-w-xl mx-auto px-6 text-center bg-white border border-gray-200 rounded-3xl p-10 shadow-sm">
          <h1 className="text-2xl font-black tracking-tight">Product not found</h1>
          <p className="text-sm text-gray-500 mt-2">
            The equipment you are looking for is unavailable or the link is incorrect.
          </p>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-[#147A7A] hover:bg-[#106262] text-white text-xs font-bold rounded-xl transition-colors"
          >
            <span>Browse all equipment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>);
  }

  return (<div className="min-h-screen bg-[#F7F9FA] py-6 sm:py-8 text-[#0F1E2E]">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Added to Cart Notification Toast */}
        {addedNotification && (<div className="bg-emerald-600 text-white rounded-2xl p-4 mt-4 shadow-md flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2.5 font-bold text-xs sm:text-sm">
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span>
                Added {quantity}x "{product.name}" (SKU: {activeSku}) to your cart!
              </span>
            </div>
            <Link
              to="/cart"
              className="px-4 py-1.5 bg-white text-emerald-800 text-xs font-bold rounded-xl hover:bg-emerald-50 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <span>View Cart & Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>)}

        {/* Main Product Card */}
        <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-8 lg:p-10 mt-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14">
            {/* ========================================== */}
            {/* LEFT COLUMN: PRODUCT IMAGES & ZOOM LENS */}
            {/* ========================================== */}
            <div className="space-y-4">
              {/* Primary Image Viewport */}
              <div
                className="relative aspect-square rounded-2xl overflow-hidden bg-[#F8FAFC] border border-gray-200 p-6 sm:p-10 flex items-center justify-center cursor-crosshair select-none group"
                onMouseMove={handleMouseMove}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                onClick={() => setIsLightboxOpen(true)}
              >
                <ProductImage
                  key={activeDisplayImage}
                  src={activeDisplayImage}
                  alt={product.name}
                  eager
                  style={{
                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`,
                    transform: isHovered ? 'scale(1.85)' : 'scale(1)',
                    transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.35s ease-out',
                  }}
                  className="w-full h-full object-contain pointer-events-none transition-all duration-300"
                />

                {/* Badge Tag */}
                {product.badge && (<span className="absolute top-4 left-4 bg-[#0F1E2E] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm z-10 pointer-events-none">
                    {product.badge}
                  </span>)}

                {/* SWL Badge */}
                {product.swl && (<span className="absolute bottom-4 left-4 bg-white/90 border border-gray-200 text-gray-700 text-xs font-bold px-3 py-1 rounded-lg shadow-xs z-10 backdrop-blur-xs pointer-events-none">
                    SWL: {product.swl}
                  </span>)}

                {/* Wishlist Heart */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleItem(product.id);
                  }}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 hover:bg-white text-gray-700 shadow-md flex items-center justify-center transition-all cursor-pointer z-10 hover:scale-110"
                  aria-label="Wishlist"
                >
                  <Heart
                    className={`h-5 w-5 ${
                      isInWishlist(product.id) ? 'fill-red-500 text-red-500' : 'text-gray-400'
                    }`}
                  />
                </button>

                {/* Zoom Hint & Expand Fullscreen */}
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10 pointer-events-auto">
                  <span className="px-3 py-1 bg-black/65 backdrop-blur-sm text-white text-[11px] font-semibold rounded-lg shadow-sm flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Move cursor to zoom</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsLightboxOpen(true);
                    }}
                    className="p-1.5 bg-white/90 hover:bg-white text-gray-700 rounded-lg shadow-md transition-all cursor-pointer hover:scale-105"
                    title="Expand Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Clickable Thumbnail Strip */}
              {galleryImages.length > 1 && (<div>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                      Product Gallery ({galleryImages.length} images)
                    </span>
                    <span className="text-[11px] text-[#147A7A] font-semibold">
                      Click or hover to switch
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5">
                    {galleryImages.map((img, i) => (<button
                        key={i}
                        type="button"
                        onMouseEnter={() => setSelectedImageIndex(i)}
                        onClick={() => setSelectedImageIndex(i)}
                        className={`aspect-square rounded-xl overflow-hidden border-2 p-2 bg-[#F8FAFC] transition-all cursor-pointer relative ${
                          selectedImageIndex === i
                            ? 'border-[#147A7A] ring-2 ring-[#147A7A]/25 scale-[1.03] shadow-md bg-white'
                            : 'border-gray-200 opacity-75 hover:opacity-100 hover:border-gray-300 hover:scale-[1.01]'
                        }`}
                      >
                        <ProductImage
                          src={img}
                          alt=""
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      </button>))}
                  </div>
                </div>)}

              {/* Feature Highlights Badges */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100 text-center">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-[#147A7A] mx-auto mb-1" />
                  <span className="block text-[11px] font-bold text-[#0F1E2E]">NDIS</span>
                  <span className="block text-[10px] text-gray-500">Capital & Consumables</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <Truck className="w-4 h-4 text-[#147A7A] mx-auto mb-1" />
                  <span className="block text-[11px] font-bold text-[#0F1E2E]">Fast Dispatch</span>
                  <span className="block text-[10px] text-gray-500">Australia-wide</span>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <RotateCcw className="w-4 h-4 text-[#147A7A] mx-auto mb-1" />
                  <span className="block text-[11px] font-bold text-[#0F1E2E]">Trial Fleet</span>
                  <span className="block text-[10px] text-gray-500">Clinical Setups</span>
                </div>
              </div>
            </div>

            {/* ========================================== */}
            {/* RIGHT COLUMN: PRODUCT INFO & SELECTION */}
            {/* ========================================== */}
            <div className="flex flex-col justify-between">
              <div>
                {/* Brand & Department */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#147A7A] uppercase tracking-wider">
                    {product.brand}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs font-semibold text-gray-500 capitalize">
                    {product.categories?.[0]?.replace(/-/g, ' ') || 'Assistive Technology'}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-black text-[#0F1E2E] leading-tight tracking-tight mt-1 mb-2">
                  {product.name}
                </h1>

                {/* Dynamic SKU & Rating */}
                <div className="flex flex-wrap items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="flex items-center text-amber-400">
                    {[...Array(5)].map((_, i) => (<Star key={i} className="h-4 w-4 fill-current" />))}
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-[#0F1E2E]">
                    {displayRating}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({displayReviewCount} verified clinical reviews)
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-xs font-mono font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                    SKU: {activeSku}
                  </span>
                </div>

                {/* Short Description */}
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed my-4">
                  {product.shortDescription}
                </p>

                {/* Buy vs Hire Mode Dual Cards */}
                {product.hireAvailable ? (<div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                      type="button"
                      onClick={() => setPurchaseType('buy')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        purchaseType === 'buy'
                          ? 'border-[#147A7A] bg-[#147A7A]/5 shadow-sm ring-2 ring-[#147A7A]/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="block text-[11px] font-bold text-gray-500 uppercase">
                        Buy Outright
                      </span>
                      <span className="block text-xl font-black text-[#0F1E2E]">
                        ${unitBuyPrice.toFixed(2)}
                      </span>
                      <span className="block text-[11px] text-gray-500 mt-0.5">
                        NDIS Capital / Self & Plan Managed
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPurchaseType('hire')}
                      className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                        purchaseType === 'hire'
                          ? 'border-[#E88D2A] bg-[#FFF8ED] shadow-sm ring-2 ring-[#E88D2A]/20'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="block text-[11px] font-bold text-[#E88D2A] uppercase">
                        Flexible Equipment Hire
                      </span>
                      <span className="block text-xl font-black text-[#0F1E2E]">
                        ${unitWeeklyHirePrice.toFixed(2)}
                        <span className="text-xs font-normal text-gray-500">/wk</span>
                      </span>
                      <span className="block text-[11px] text-[#E88D2A] font-semibold mt-0.5">
                        Min. 2 weeks • 100% credited to buy
                      </span>
                    </button>
                  </div>) : (<div className="p-4 rounded-2xl border border-gray-200 bg-[#F8FAFC] mb-6 flex items-center justify-between">
                    <div>
                      <span className="block text-[11px] font-bold text-gray-500 uppercase">
                        Buy Outright (AUD)
                      </span>
                      <span className="block text-2xl font-black text-[#0F1E2E]">
                        ${unitBuyPrice.toFixed(2)}
                      </span>
                    </div>
                    <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl border border-emerald-200 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      NDIS Consumables Approved
                    </span>
                  </div>)}

                {/* ========================================== */}
                {/* DYNAMIC ATTRIBUTE DROPDOWNS & SELECTORS */}
                {/* ========================================== */}
                {product.attributes && product.attributes.length > 0 && (<div className="space-y-4 mb-6">
                    {product.attributes.map((attr) => {
                      const selectedVal = selectedAttributes[attr.slug] || '';

                      return (<div
                          key={attr.id}
                          className="p-4 bg-slate-50 border border-slate-200 rounded-2xl"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <label
                              htmlFor={`attr-select-${attr.slug}`}
                              className="text-xs font-extrabold text-[#0F1E2E] uppercase tracking-wider flex items-center gap-1.5"
                            >
                              <span>{attr.name} :</span>
                            </label>
                            <span className="text-xs font-bold text-[#147A7A]">
                              {attr.values.find((v) => v.value === selectedVal)?.label || selectedVal}
                            </span>
                          </div>

                          {/* Standard HTML Dropdown Select */}
                          <div className="relative mb-2.5">
                            <select
                              id={`attr-select-${attr.slug}`}
                              value={selectedVal}
                              onChange={(e) => handleAttributeChange(attr.slug, e.target.value)}
                              className="w-full h-11 px-3.5 pr-10 bg-white border border-gray-300 rounded-xl text-xs sm:text-sm font-semibold text-[#0F1E2E] appearance-none outline-none focus:border-[#147A7A] focus:ring-2 focus:ring-[#147A7A]/20 shadow-xs cursor-pointer"
                            >
                              {attr.values.map((val) => {
                                const available = isOptionAvailable(attr.slug, val.value);
                                return (<option
                                    key={val.value}
                                    value={val.value}
                                    disabled={!available}
                                  >
                                    {val.label} {!available ? '(Unavailable in this combination)' : ''}
                                  </option>);
                              })}
                            </select>
                            <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>

                          {/* Quick Option Pills / Color Swatches */}
                          <div className="flex flex-wrap gap-2">
                            {attr.values.map((val) => {
                              const isSelected = selectedVal === val.value;
                              const available = isOptionAvailable(attr.slug, val.value);

                              if (attr.type === 'color') {
                                return (<button
                                    key={val.value}
                                    type="button"
                                    disabled={!available}
                                    onClick={() => handleAttributeChange(attr.slug, val.value)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 transition-all cursor-pointer bg-white ${
                                      isSelected
                                        ? 'border-[#147A7A] ring-2 ring-[#147A7A]/20 shadow-xs'
                                        : available
                                        ? 'border-gray-200 hover:border-gray-300'
                                        : 'border-gray-100 opacity-40 cursor-not-allowed line-through'
                                    }`}
                                  >
                                    <span
                                      className="w-4 h-4 rounded-full border border-black/15 shadow-xs flex-shrink-0"
                                      style={{
                                        backgroundColor: getColorSwatchHex(val.value, val.colorHex),
                                      }}
                                    />
                                    <span className="text-xs font-bold text-[#0F1E2E]">{val.label}</span>
                                  </button>);
                              }

                              return (<button
                                  key={val.value}
                                  type="button"
                                  disabled={!available}
                                  onClick={() => handleAttributeChange(attr.slug, val.value)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? 'bg-[#0F1E2E] text-white shadow-xs'
                                      : available
                                      ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                                      : 'bg-gray-100 text-gray-400 border border-gray-100 cursor-not-allowed line-through'
                                  }`}
                                >
                                  {val.label}
                                </button>);
                            })}
                          </div>
                        </div>);
                    })}
                  </div>)}

                {/* ========================================== */}
                {/* DYNAMIC OPTIONAL EQUIPMENT CHECKBOXES */}
                {/* ========================================== */}
                {product.optionalEquipment && product.optionalEquipment.length > 0 && (<div className="mb-6 p-4 bg-[#F8FAFC] border border-gray-200 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-extrabold text-[#0F1E2E] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#E88D2A]" />
                        <span>Optional Equipment :</span>
                      </span>
                      {addonsTotalBuyPrice > 0 && (<span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                          +${addonsTotalBuyPrice.toFixed(2)} added
                        </span>)}
                    </div>

                    <div className="space-y-2">
                      {product.optionalEquipment.map((addon) => {
                        const isChecked = selectedAddons.includes(addon.id);
                        return (<label
                            key={addon.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                              isChecked
                                ? 'bg-white border-[#147A7A] shadow-xs'
                                : 'bg-white/60 border-gray-200 hover:bg-white hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => toggleAddon(addon.id)}
                              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#147A7A] focus:ring-[#147A7A] cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-[#0F1E2E] leading-snug">
                                {addon.name}{' '}
                                {addon.price > 0 && (<span className="font-extrabold text-[#E88D2A]">
                                    (+ ${addon.price.toFixed(2)})
                                  </span>)}
                              </p>
                              {addon.sku && (<span className="text-[10.5px] font-mono text-gray-400 block mt-0.5">
                                  SKU: {addon.sku}
                                </span>)}
                            </div>
                          </label>);
                      })}
                    </div>
                  </div>)}

                {/* Hire Period Selector (When Hire mode is active) */}
                {product.hireAvailable && purchaseType === 'hire' && (<div className="bg-[#FFF8ED] border border-[#FDE5CC] rounded-2xl p-4 mb-6 animate-fade-in">
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[12px] font-bold text-[#0F1E2E] flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-[#E88D2A]" />
                        Select Hire Period:
                      </span>
                      <span className="text-[12.5px] font-extrabold text-[#E88D2A]">
                        ${unitWeeklyHirePrice.toFixed(2)}/wk × {hireWeeks} wks = ${hirePeriodPrice.toFixed(2)}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 4, 8, 12].map((weeks) => (<button
                          key={weeks}
                          type="button"
                          onClick={() => setHireWeeks(weeks)}
                          className={`py-2 px-1 text-center rounded-xl font-bold text-xs transition-all cursor-pointer ${
                            hireWeeks === weeks
                              ? 'bg-[#E88D2A] text-white shadow-sm ring-2 ring-[#E88D2A]/30'
                              : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {weeks} Weeks
                        </button>))}
                    </div>
                    <p className="text-[10.5px] text-gray-500 mt-2">
                      * 100% of hire fees can be credited toward purchase. Scheduled collection service included.
                    </p>
                  </div>)}

                {/* ========================================== */}
                {/* ACTION BUTTONS (REHAB HIRE EXACT DESIGN) */}
                {/* ========================================== */}
                {/* Cart Conflict Warning Symbol Notice */}
                {itemCount > 0 && cartType && cartType !== purchaseType && (
                  <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 flex items-start gap-2.5 text-xs text-amber-900 animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-amber-950 block">Notice: Separate Order Required</span>
                      Your cart currently contains <strong>{cartType === 'buy' ? 'Outright Purchases' : 'Equipment Hire'}</strong>.
                      Equipment Hire contracts and Outright Purchases/NDIS Quotes follow separate clinical workflows and cannot be placed together in the same order. Adding this item will prompt you to replace or separate your order.
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
                  {/* Quantity */}
                  <div className="flex items-center border border-gray-300 rounded-xl h-[48px] bg-white">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3.5 text-gray-600 hover:bg-gray-100 h-full rounded-l-xl font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="px-4 text-sm font-black text-[#0F1E2E]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="px-3.5 text-gray-600 hover:bg-gray-100 h-full rounded-r-xl font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>

                  {/* ADD TO CART Button */}
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`flex-1 py-3.5 px-6 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                      purchaseType === 'hire'
                        ? 'bg-[#E88D2A] hover:bg-[#D47C1E]'
                        : 'bg-[#147A7A] hover:bg-[#106262]'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>
                      {purchaseType === 'hire'
                        ? `Add ${quantity}x Hire (${hireWeeks} Wks) • $${(hirePeriodPrice * quantity).toFixed(2)}`
                        : `Add ${quantity} to Cart • $${(unitBuyPrice * quantity).toFixed(2)}`}
                    </span>
                  </button>
                </div>

                {/* Request $0 NDIS Quote secondary button */}
                {product.buyAvailable !== false && purchaseType === 'buy' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart();
                      if (!cartType || cartType === 'buy') {
                        setTimeout(() => navigate('/checkout?mode=ndis_quote'), 100);
                      }
                    }}
                    className="w-full mb-6 py-3 px-4 bg-[#FEF5E9] hover:bg-[#FDE5CC] border border-[#FDE5CC] text-[#E88D2A] hover:text-[#D47C1E] text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-4 h-4 text-[#E88D2A]" />
                    <span>Request $0 NDIS Formal Quote (For Plan Managers &amp; NDIA)</span>
                  </button>
                )}

                {/* Clinical Notice Box (Amber Notice Matching Screenshot) */}
                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4 mb-6 text-xs text-[#92400E] flex items-start gap-3">
                  <Info className="w-5 h-5 flex-shrink-0 text-[#D97706] mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-extrabold block text-[#78350F] mb-0.5">
                      Clinical Notice:
                    </span>
                    This product may require clinical assessment or custom setup. Our team of equipment specialists and Occupational Therapists can assist with prescription, trial bookings, and delivery across Australia.
                  </div>
                </div>

                {/* Specialist Clinical Support Callout */}
                <div className="bg-[#EAF5F4]/60 border border-[#D5EBE9] rounded-2xl p-4 flex items-center gap-3">
                  <Headphones className="w-6 h-6 text-[#147A7A] flex-shrink-0" />
                  <div className="text-xs">
                    <p className="font-bold text-[#0F1E2E]">Need clinical sizing or NDIS quote support?</p>
                    <p className="text-gray-600">
                      Call our Occupational Therapy team at{' '}
                      <a href="tel:0494767409" className="text-[#147A7A] font-bold hover:underline">
                        0494 767 409
                      </a>{' '}
                      for trial setups and custom configuration assistance.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================== */}
          {/* BOTTOM TABS: DESCRIPTION, SPECS, RELATED */}
          {/* ========================================== */}
          <div className="mt-12 pt-8 border-t border-gray-200">
            {/* Tab Headers */}
            <div className="flex items-center border-b border-gray-200 gap-2 sm:gap-6 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4 sm:mx-0 sm:px-0">
              <button
                type="button"
                onClick={() => setActiveTab('description')}
                className={`shrink-0 pb-3 sm:pb-4 px-2 sm:px-3 text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap border-b-2 flex items-center gap-1.5 sm:gap-2 ${
                  activeTab === 'description'
                    ? 'border-[#147A7A] text-[#147A7A]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span>Description</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('specifications')}
                className={`shrink-0 pb-3 sm:pb-4 px-2 sm:px-3 text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap border-b-2 flex items-center gap-1.5 sm:gap-2 ${
                  activeTab === 'specifications'
                    ? 'border-[#147A7A] text-[#147A7A]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Layers className="w-4 h-4 shrink-0" />
                <span>Specifications & Dimensions</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('related')}
                className={`shrink-0 pb-3 sm:pb-4 px-2 sm:px-3 text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap border-b-2 flex items-center gap-1.5 sm:gap-2 ${
                  activeTab === 'related'
                    ? 'border-[#147A7A] text-[#147A7A]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                <span>Related Equipment</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className={`shrink-0 pb-3 sm:pb-4 px-2 sm:px-3 text-xs sm:text-sm font-extrabold transition-all cursor-pointer whitespace-nowrap border-b-2 flex items-center gap-1.5 sm:gap-2 ${
                  activeTab === 'reviews'
                    ? 'border-[#147A7A] text-[#147A7A]'
                    : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                <Star className="w-4 h-4 shrink-0" />
                <span>Reviews ({displayReviewCount})</span>
              </button>
            </div>

            {/* Tab 1: Description */}
            {activeTab === 'description' && (<div className="py-6 space-y-4 animate-fade-in text-xs sm:text-sm text-gray-700 leading-relaxed max-w-4xl">
                <div className="prose prose-sm max-w-none">
                  <p>{product.fullDescription || product.shortDescription}</p>
                </div>

                {product.features && product.features.length > 0 && (<div className="pt-4">
                    <h4 className="font-extrabold text-[#0F1E2E] text-sm mb-3">Key Clinical Features:</h4>
                    <ul className="space-y-2">
                      {product.features.map((feat, idx) => (<li key={idx} className="flex items-start gap-2.5">
                          <CheckCircle className="w-4 h-4 text-[#147A7A] flex-shrink-0 mt-0.5" />
                          <span>{feat}</span>
                        </li>))}
                    </ul>
                  </div>)}

                {product.compliance && product.compliance.length > 0 && (<div className="pt-4">
                    <h4 className="font-extrabold text-[#0F1E2E] text-sm mb-2">Compliance & Standards:</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.compliance.map((c, idx) => (<span key={idx} className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold">
                          {c}
                        </span>))}
                    </div>
                  </div>)}
              </div>)}

            {/* Tab 2: Specifications */}
            {activeTab === 'specifications' && (<div className="py-6 animate-fade-in max-w-3xl">
                <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100">
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 text-xs">
                    <span className="font-bold text-gray-600">Product SKU</span>
                    <span className="font-mono font-bold text-[#0F1E2E]">{activeSku}</span>
                  </div>
                  <div className="flex items-center justify-between p-3.5 bg-white text-xs">
                    <span className="font-bold text-gray-600">Brand</span>
                    <span className="font-bold text-[#0F1E2E]">{product.brand}</span>
                  </div>
                  {product.swl && (<div className="flex items-center justify-between p-3.5 bg-slate-50 text-xs">
                      <span className="font-bold text-gray-600">Safe Working Load (SWL)</span>
                      <span className="font-bold text-[#0F1E2E]">{product.swl}</span>
                    </div>)}
                  {product.specifications?.map((spec, i) => (<div
                      key={i}
                      className={`flex items-center justify-between p-3.5 text-xs ${
                        i % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                      }`}
                    >
                      <span className="font-bold text-gray-600">{spec.name}</span>
                      <span className="font-bold text-[#0F1E2E] text-right">{spec.value}</span>
                    </div>))}
                  {product.warranty && (<div className="flex items-center justify-between p-3.5 bg-white text-xs">
                      <span className="font-bold text-gray-600">Warranty</span>
                      <span className="font-bold text-[#0F1E2E]">{product.warranty}</span>
                    </div>)}
                </div>
              </div>)}

            {/* Tab 3: Related Equipment */}
            {activeTab === 'related' && (<div className="py-6 animate-fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  {relatedProducts.map((rel) => (
                    <ProductCard
                      key={rel.id}
                      product={rel}
                    />
                  ))}
                </div>
              </div>)}

            {/* Tab 4: Customer Reviews */}
            {activeTab === 'reviews' && (<div className="py-6 animate-fade-in max-w-4xl">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-extrabold text-[#0F1E2E] text-sm">
                      Verified buyer reviews ({displayReviewCount})
                    </h4>
                    {liveReviews.length === 0 ? (<div className="p-6 text-center bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                        <Star className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-500">
                          No written reviews yet — overall rating {displayRating} from {displayReviewCount} clinical evaluations.
                          Be the first to share your experience below.
                        </p>
                      </div>) : (<ul className="space-y-3">
                        {liveReviews.map((r) => (<li key={r.id} className="p-4 bg-white border border-slate-200 rounded-2xl">
                            <div className="flex items-center gap-1 text-amber-400 mb-1">
                              {[...Array(5)].map((_, i) => (<Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-current' : 'text-slate-300'}`} />))}
                              <span className="ml-1.5 text-[11px] font-bold text-[#0F1E2E]">{r.rating}/5</span>
                            </div>
                            {r.title && <p className="text-xs font-extrabold text-[#0F1E2E]">{r.title}</p>}
                            {r.comment && <p className="text-xs text-slate-600 leading-relaxed mt-1">{r.comment}</p>}
                            <p className="text-[10.5px] text-slate-400 mt-2">
                              {r.customerName} {r.verifiedBuyer ? '• Verified buyer' : ''} {r.date ? `• ${r.date}` : ''}
                            </p>
                          </li>))}
                      </ul>)}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-[#0F1E2E] text-sm mb-3">Write a review</h4>
                    <form onSubmit={handleSubmitReview} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Your rating</label>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((n) => (<button key={n} type="button" onClick={() => setReviewRating(n)} className="cursor-pointer" aria-label={`${n} star${n > 1 ? 's' : ''}`}>
                              <Star className={n <= reviewRating ? "h-6 w-6 fill-amber-400 text-amber-400" : "h-6 w-6 text-slate-300"} />
                            </button>))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Your name *</label>
                        <input type="text" value={reviewName} onChange={(e) => setReviewName(e.target.value)} placeholder="e.g. Sarah J." className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Headline</label>
                        <input type="text" value={reviewTitle} onChange={(e) => setReviewTitle(e.target.value)} placeholder="Sum it up in a few words" className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1.5">Review</label>
                        <textarea rows={4} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="How did this equipment work for you?" className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#147A7A]/20 resize-none" />
                      </div>
                      {reviewNotice && (<p className="text-[11px] font-semibold text-[#147A7A] bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
                          {reviewNotice}
                        </p>)}
                      <button type="submit" disabled={reviewSending} className="w-full py-3 bg-[#147A7A] hover:bg-[#106262] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all cursor-pointer">
                        {reviewSending ? 'Submitting…' : 'Submit review'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>)}
          </div>
        </div>

        {/* ALWAYS-VISIBLE RELATED PRODUCTS SECTION */}
        {relatedProducts.length > 0 && (<div className="mt-10 bg-white border border-gray-200 rounded-3xl p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <span className="text-[11px] font-bold text-[#147A7A] uppercase tracking-wider bg-[#147A7A]/10 px-3 py-1 rounded-full">
                  Specialist Recommendation
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#0F1E2E] mt-1.5">
                  Frequently Paired &amp; Related Equipment
                </h2>
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#147A7A] hover:underline"
              >
                <span>Browse Full Catalogue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {relatedProducts.map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                />
              ))}
            </div>
          </div>)}

        {/* Lightbox Modal */}
        {isLightboxOpen && (<div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={proxyImageUrl(activeDisplayImage)}
              alt={product.name}
              className="max-w-full max-h-[90vh] object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
              onError={handleImageError}
            />
          </div>)}
      </div>
    </div>);
}