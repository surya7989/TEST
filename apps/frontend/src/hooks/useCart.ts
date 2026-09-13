/**
 * AT Specialists Australia - useCart hook
 * 
 * Re-exports reactive cart state and actions directly from the canonical useCartStore.
 */

import { useCartStore, type CartItem, type AddItemParams } from '@/store/useCartStore';

export type { CartItem, AddItemParams };

export function useCart() {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const appliedPromo = useCartStore((s) => s.appliedPromo);
  const setPromo = useCartStore((s) => s.setPromo);
  const addItem = useCartStore((s) => s.addItem);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const updateHireWeeks = useCartStore((s) => s.updateHireWeeks);
  const clearCart = useCartStore((s) => s.clearCart);
  const openCart = useCartStore((s) => s.openCart);
  const closeCart = useCartStore((s) => s.closeCart);
  const toggleCart = useCartStore((s) => s.toggleCart);
  const conflict = useCartStore((s) => s.conflict);
  const resolveConflict = useCartStore((s) => s.resolveConflict);
  const dismissConflict = useCartStore((s) => s.dismissConflict);
  const separateCart = useCartStore((s) => s.separateCart);

  const buyItems = items.filter((item) => item.purchaseType !== 'hire');
  const hireItems = items.filter((item) => item.purchaseType === 'hire');
  const hasMixedItems = buyItems.length > 0 && hireItems.length > 0;
  const cartType = items.length === 0 ? 'empty' : hasMixedItems ? 'mixed' : hireItems.length > 0 ? 'hire' : 'buy';

  const buySubtotal = buyItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const hireSubtotal = hireItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const totalDeliveryFee = items.reduce((sum, item) => sum + (item.deliveryFee || 0) * item.quantity,
    0);

  const totalGst = items.reduce((sum, item) => {
    if (item.gstType === 'gst-free') return sum;
    const itemTotal = item.price * item.quantity;
    const rate = item.gstType === 'custom' && item.gstRate !== undefined ? item.gstRate : 10;
    if (rate <= 0) return sum;
    const rateFraction = rate / 100;
    return sum + (itemTotal * rateFraction) / (1 + rateFraction);
  }, 0);

  const subtotalExGst = subtotal - totalGst;
  const grandTotal = subtotal + totalDeliveryFee;
  const total = grandTotal;

  return {
    items,
    isOpen,
    appliedPromo,
    setPromo,
    conflict,
    resolveConflict,
    dismissConflict,
    separateCart,
    hasMixedItems,
    cartType,
    buyItems,
    hireItems,
    buySubtotal,
    hireSubtotal,
    subtotal,
    totalDeliveryFee,
    totalGst,
    subtotalExGst,
    grandTotal,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    updateHireWeeks,
    clearCart,
    openCart,
    closeCart,
    toggleCart,
  };
}

export default useCart;