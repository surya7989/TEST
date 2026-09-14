import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Plus, Trash2, Truck, Shield, ArrowRight, ShoppingBag, CheckCircle, Phone, Clock, RotateCcw, AlertTriangle, FileText } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useAdminStore } from '@/store/adminStore';
import { validatePromo } from '@/lib/api';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { proxyImageUrl, handleImageError } from '@/lib/imageProxy';

export function CartPage() {
  const { items, buyItems, hireItems, buySubtotal, hireSubtotal, removeItem, updateQuantity, updateHireWeeks, clearCart, total, totalDeliveryFee, totalGst, appliedPromo, setPromo, itemCount, hasMixedItems, separateCart } = useCart();
  // Live catalogue stock so quantities can never exceed availability
  // (the server rejects oversell at capture — this stops it at the cart).
  const catalogueProducts = useAdminStore((s) => s.products);
  const stockFor = (productId: string): number | null => {
    const found = catalogueProducts.find((p: any) => p.id === productId || p.sku === productId);
    if (!found) return null;
    const n = Number((found as any).stock);
    return Number.isFinite(n) ? n : null;
  };
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [discount, setDiscount] = useState(0);

  const buyQty = buyItems.reduce((s, i) => s + i.quantity, 0);
  const hireQty = hireItems.reduce((s, i) => s + i.quantity, 0);

  const deliveryFee = totalDeliveryFee;
  const cartSubtotal = Math.max(0, total - deliveryFee);
  // `total` from the cart already includes delivery (subtotal + delivery).
  // Coupon math always runs against the merchandise subtotal, like the server.
  const shipDiscount = appliedPromo?.type === 'free_shipping' ? deliveryFee : 0;
  const finalTotal = Math.max(0, total - discount - shipDiscount);
  const gst = totalGst;

  // Keep an applied coupon honest as the cart changes (server re-verifies at checkout).
  useEffect(() => {
    if (!appliedPromo) return;
    if (cartSubtotal < 1) {
      setPromo(null);
      setDiscount(0);
      return;
    }
    if (appliedPromo.type === 'percentage') {
      setDiscount(Math.round(cartSubtotal * appliedPromo.value) / 100);
    } else if (appliedPromo.type === 'fixed') {
      setDiscount(Math.min(appliedPromo.value, cartSubtotal));
    } else {
      setDiscount(0);
    }
  }, [cartSubtotal, appliedPromo, setPromo]);

  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim();
    if (!code) return;
    setPromoApplying(true);
    setPromoError('');
    try {
      const res = await validatePromo(code, cartSubtotal);
      setPromo({ code: res.code, type: res.type, value: res.value });
      setDiscount(res.freeShipping ? 0 : res.discount);
      setPromoCode('');
    } catch (err: any) {
      // Offline fallback: honour the long-standing NDIS10 code locally.
      if (code.toUpperCase() === 'NDIS10' && cartSubtotal >= 200) {
        setPromo({ code: 'NDIS10', type: 'percentage', value: 10 });
        setDiscount(Math.round(cartSubtotal * 0.1 * 100) / 100);
        setPromoCode('');
      } else {
        setPromoError(err.message || 'Invalid code. Try "NDIS10" for 10% discount.');
      }
    } finally {
      setPromoApplying(false);
    }
  };

  const handleRemovePromo = () => {
    setPromo(null);
    setDiscount(0);
    setPromoError('');
  };

  if (items.length === 0) {
    return (<div className="min-h-screen bg-[#F7F9FA] py-12 sm:py-16">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
          <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shopping Cart' }]} />

          <div className="bg-white border border-gray-200 rounded-3xl p-8 sm:p-12 text-center max-w-xl mx-auto my-8 sm:my-10 shadow-sm">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#147A7A]/10 text-[#147A7A] flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <h1 className="text-[22px] sm:text-[24px] font-extrabold text-[#0F1E2E] mb-2">Your Cart Is Empty</h1>
            <p className="text-[13px] sm:text-[14px] text-gray-500 mb-8">
              Browse our comprehensive range of hospital and assistive equipment to find what you need.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/shop"
                className="px-5 sm:px-6 py-3 bg-[#147A7A] hover:bg-[#106262] text-white text-[13px] sm:text-[14px] font-bold rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
              >
                Browse Equipment
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/hire"
                className="px-5 sm:px-6 py-3 border-2 border-[#147A7A] text-[#147A7A] hover:bg-[#147A7A]/5 text-[13px] sm:text-[14px] font-bold rounded-lg transition-all flex items-center justify-center"
              >
                Explore Hire Options
              </Link>
            </div>
          </div>
        </div>
      </div>);
  }

  return (<div className="min-h-screen bg-[#F7F9FA] py-6 sm:py-8">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 2xl:px-8">
        <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: 'Shopping Cart' }]} />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 mb-8">
          <div>
            <h1 className="text-[24px] sm:text-[28px] font-extrabold text-[#0F1E2E] tracking-tight">Shopping Cart</h1>
            <p className="text-[13px] sm:text-[14px] text-gray-600 mt-0.5">
              You have <strong className="text-[#0F1E2E]">{itemCount}</strong> item{itemCount !== 1 ? 's' : ''} in your cart ({buyQty} purchase{buyQty !== 1 ? 's' : ''}, {hireQty} hire{hireQty !== 1 ? 's' : ''})
            </p>
          </div>

          <button
            onClick={clearCart}
            className="text-[12px] sm:text-[13px] text-red-600 hover:text-red-700 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            Clear Cart
          </button>
        </div>

        {/* Layout Grid */}
        <div className="space-y-6 lg:grid lg:grid-cols-3 lg:gap-8 lg:space-y-0">
          {/* ORDER SUMMARY */}
          <div className="lg:col-span-1 lg:order-2">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 sticky top-20 lg:top-24">
              <h2 className="text-[16px] sm:text-[18px] font-extrabold text-[#0F1E2E] pb-3 border-b border-gray-100">
                Order Summary
              </h2>

              <div className="space-y-3 text-[12.5px] sm:text-[13.5px]">
                {buyItems.length > 0 && (<div className="flex justify-between text-gray-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-emerald-600" />
                      Purchases ({buyItems.reduce((s, i) => s + i.quantity, 0)} items)
                    </span>
                    <span className="font-bold text-[#0F1E2E]">${buySubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>)}

                {hireItems.length > 0 && (<div className="flex justify-between text-gray-700">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#E88D2A]" />
                      Equipment Hire ({hireItems.reduce((s, i) => s + i.quantity, 0)} items)
                    </span>
                    <span className="font-bold text-[#0F1E2E]">${hireSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>)}

                <div className="flex justify-between text-gray-600 pt-1">
                  <span>Subtotal</span>
                  <span className="font-bold text-[#0F1E2E]">${cartSubtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>

                {discount > 0 && (<div className="flex justify-between text-emerald-600">
                    <span>Discount ({appliedPromo?.code || 'Coupon'})</span>
                    <span className="font-bold">-${discount.toFixed(2)}</span>
                  </div>)}

                {shipDiscount > 0 && (<div className="flex justify-between text-emerald-600">
                    <span>Free shipping ({appliedPromo?.code})</span>
                    <span className="font-bold">-${shipDiscount.toFixed(2)}</span>
                  </div>)}

                <div className="flex justify-between text-gray-600">
                  <span>Delivery (Australia-wide)</span>
                  <span className={`font-bold ${deliveryFee - shipDiscount <= 0 ? 'text-emerald-600' : 'text-[#0F1E2E]'}`}>
                    {deliveryFee - shipDiscount <= 0 ? 'FREE' : `$${(deliveryFee - shipDiscount).toFixed(2)}`}
                  </span>
                </div>

                <div className="flex justify-between text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg">
                  <span>GST Component</span>
                  <span className="font-semibold text-gray-700">
                    {gst > 0 ? `$${gst.toFixed(2)} (Taxable items)` : '0% (NDIS GST-Free)'}
                  </span>
                </div>
              </div>

              {/* Promo Code Form */}
              {appliedPromo ? (<div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold">
                    ✓ {appliedPromo.code} applied
                  </span>
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="text-[11px] font-bold text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Remove
                  </button>
                </div>) : (<form onSubmit={handleApplyPromo} className="pt-3 border-t border-gray-100 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Promo / NDIS Code"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-[12.5px] uppercase outline-none focus:border-[#147A7A]"
                    />
                    <button
                      type="submit"
                      disabled={promoApplying}
                      className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-[12.5px] font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {promoApplying ? 'Checking…' : 'Apply'}
                    </button>
                  </div>
                  {promoError && <p className="text-[11px] font-semibold text-red-500">{promoError}</p>}
                </form>)}

              {/* Total & Checkout */}
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between items-baseline mb-4">
                  <span className="text-[14px] sm:text-[15px] font-bold text-[#0F1E2E]">Total</span>
                  <span className="text-[22px] sm:text-[24px] font-black text-[#0F1E2E]">
                    ${finalTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {hasMixedItems ? (
                  <div className="space-y-2.5">
                    <div className="w-full py-3.5 px-4 bg-amber-100 border border-amber-300 text-amber-950 rounded-lg flex items-center justify-center gap-2 font-bold text-[13px] shadow-xs">
                      <AlertTriangle className="h-4 w-4 text-amber-700 flex-shrink-0" />
                      <span>Checkout Restricted: Mixed Cart</span>
                    </div>
                    <p className="text-[11.5px] text-center text-amber-800 font-medium leading-tight">
                      Please select "Keep Purchases" or "Keep Hire" below to proceed.
                    </p>
                  </div>
                ) : (
                  <Link
                    to="/checkout"
                    className="w-full py-3.5 bg-[#147A7A] hover:bg-[#106262] text-white text-[14px] font-bold rounded-lg shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    Proceed to Checkout
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              {/* Trust Badges */}
              <div className="space-y-2 pt-2 text-[11px] sm:text-[11.5px] text-gray-500">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-[#147A7A]" />
                  <span>NDIS Provider</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-[#147A7A]" />
                  <span>Australia-Wide Delivery & Setup Available</span>
                </div>
              </div>
            </div>
          </div>

          {/* CART ITEMS LIST */}
          <div className="lg:col-span-2 lg:order-1 space-y-3 lg:space-y-4">
            {/* Warning Symbol Restriction: Mixed Cart Detected */}
            {hasMixedItems && (
              <div className="bg-amber-50 border-2 border-amber-400 rounded-2xl p-5 shadow-xs animate-fade-in">
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/40 flex items-center justify-center flex-shrink-0 text-amber-700">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900">
                        Order Restriction
                      </span>
                      <h3 className="text-[15px] font-extrabold text-amber-950">
                        Separate Orders Required
                      </h3>
                    </div>
                    <p className="text-[13px] text-amber-900/90 mt-1.5 leading-relaxed">
                      Equipment Hire contracts, Outright Purchases, and NDIS Formal Quotes follow different clinical agreements, invoicing schedules, and dispatch logistics. They cannot be placed in a single order.
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => separateCart('buy')}
                        className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Keep Outright Purchases Only ({buyQty})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => separateCart('hire')}
                        className="px-4 py-2 bg-[#E88D2A] hover:bg-[#D47C1E] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Keep Equipment Hire Only ({hireQty})</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {items.map((item) => {
              const isHire = item.purchaseType === 'hire';
              // Buy-item stock cap (hire draws from the trial fleet, uncapped).
              const liveStock = isHire ? null : stockFor(item.id);
              const atStockCap = liveStock !== null && item.quantity >= liveStock;

              return (<div
                  key={item.cartItemId}
                  className="bg-white border border-gray-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-sm transition-all flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 justify-between"
                >
                  {/* Image & Title */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0 w-full sm:w-auto">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#F8F9FA] border border-gray-100 flex-shrink-0">
                      <img
                        src={proxyImageUrl(item.image)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      {/* Tag Badge: Purchase vs Hire */}
                      <div className="mb-1 flex items-center gap-2">
                        {isHire ? (<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-[#FFF8ED] text-[#E88D2A] border border-[#FDE5CC]">
                            <RotateCcw className="h-3 w-3" />
                            EQUIPMENT HIRE ({item.hireWeeks || 2} WEEKS)
                          </span>) : (<span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <ShoppingBag className="h-3 w-3" />
                            OUTRIGHT PURCHASE
                          </span>)}
                      </div>

                      <Link
                        to={`/product/${item.slug || item.id}`}
                        className="text-[14px] sm:text-[15px] font-bold text-[#0F1E2E] hover:text-[#147A7A] transition-colors line-clamp-2 leading-snug"
                      >
                        {item.name}
                      </Link>

                      {/* Variant metadata: Size & Colour */}
                      {(item.selectedSize || item.selectedColor) && (<div className="flex flex-wrap gap-1.5 mt-1 text-[11px] text-gray-600">
                          {item.selectedSize && (<span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700">
                              Size: <strong>{item.selectedSize.split('(')[0].trim()}</strong>
                            </span>)}
                          {item.selectedColor && (<span className="px-2 py-0.5 bg-gray-100 rounded-md font-semibold text-gray-700">
                              Colour: <strong>{item.selectedColor}</strong>
                            </span>)}
                        </div>)}

                      {/* Optional Extras itemization */}
                      {item.selectedExtras && item.selectedExtras.length > 0 && (<div className="mt-1.5 space-y-0.5">
                          <span className="text-[10.5px] font-bold uppercase tracking-wider text-gray-400 block">
                            Included Extras:
                          </span>
                          {item.selectedExtras.map((extra) => (<div key={extra.id} className="text-[11px] text-gray-600 flex items-center gap-1">
                              <span className="text-emerald-600 font-bold">+</span>
                              <span className="truncate max-w-xs">{extra.name}</span>
                              <span className="font-semibold text-gray-800">(${extra.price.toFixed(2)})</span>
                            </div>))}
                        </div>)}

                      {/* Pricing detail & hire duration adjuster */}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-[13px] sm:text-[14px] font-extrabold text-[#147A7A]">
                          ${item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>

                        {isHire && (<div className="flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-200">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>Duration:</span>
                            <select
                              value={item.hireWeeks || 2}
                              onChange={(e) => updateHireWeeks(item.cartItemId, Number(e.target.value))}
                              className="bg-white border border-gray-300 rounded px-1.5 py-0.5 font-bold text-[#0F1E2E] text-[11px] outline-none cursor-pointer"
                            >
                              <option value={2}>2 Weeks (${((item.weeklyRate || (item.price / 2)) * 2).toFixed(2)})</option>
                              <option value={4}>4 Weeks (${((item.weeklyRate || (item.price / 2)) * 4).toFixed(2)})</option>
                              <option value={6}>6 Weeks (${((item.weeklyRate || (item.price / 2)) * 6).toFixed(2)})</option>
                              <option value={8}>8 Weeks (${((item.weeklyRate || (item.price / 2)) * 8).toFixed(2)})</option>
                              <option value={12}>12 Weeks (${((item.weeklyRate || (item.price / 2)) * 12).toFixed(2)})</option>
                            </select>
                          </div>)}
                      </div>
                    </div>
                  </div>

                  {/* Quantity Controls & Line Total */}
                  <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto self-end sm:self-center justify-between sm:justify-end">
                    <div className="flex items-center border border-gray-300 rounded-lg h-[36px] sm:h-[38px] bg-white">
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)}
                        className="px-2.5 sm:px-3 text-gray-600 hover:bg-gray-100 h-full rounded-l-lg font-bold cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="px-2.5 sm:px-3 text-[12px] sm:text-[13px] font-bold text-[#0F1E2E]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        disabled={atStockCap}
                        title={atStockCap ? `Only ${liveStock} in stock` : 'Increase quantity'}
                        className="px-2.5 sm:px-3 text-gray-600 hover:bg-gray-100 h-full rounded-r-lg font-bold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    {atStockCap && (
                      <span className="text-[11px] font-semibold text-amber-700">Only {liveStock} in stock</span>
                    )}

                    <span className="text-[15px] sm:text-[17px] font-black text-[#0F1E2E] min-w-[70px] sm:min-w-[80px] text-right hidden sm:block">
                      ${(item.price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>

                    <button
                      onClick={() => removeItem(item.cartItemId)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                      title="Remove item"
                      aria-label="Remove item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>);
            })}

            {/* NDIS Notice */}
            <div className="bg-[#FEF5E9] border border-[#FDE5CC] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-[#E88D2A] flex-shrink-0" />
                <div>
                  <h4 className="text-[12.5px] sm:text-[13.5px] font-bold text-[#0F1E2E]">Need an Official NDIS Quote?</h4>
                  <p className="text-[11.5px] sm:text-[12px] text-gray-600">
                    We generate $0 upfront formal itemised quotes with line-item NDIS codes for your Plan Manager or the NDIA.
                  </p>
                </div>
              </div>
              <Link
                to="/checkout?mode=ndis_quote"
                className="px-4 py-2 bg-[#E88D2A] hover:bg-[#D47C1E] text-white text-[12px] font-bold rounded-lg transition-all whitespace-nowrap w-full sm:w-auto text-center cursor-pointer shadow-xs"
              >
                Create $0 NDIS Quote
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>);
}