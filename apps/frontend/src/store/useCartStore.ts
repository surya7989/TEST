/**
 * AT Specialists Australia - Canonical Production Cart Store
 * 
 * Single source of truth for the customer shopping cart in browser state.
 * Supports multi-variant configurations (Sizes, Colours, Optional Extras, Hire & Buy).
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { estimateWeeklyHireRate } from '@/lib/utils';

export interface CartItemExtra {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // Product SKU or ID
  code?: string; // Explicit product or NDIS support item code
  sku?: string; // Product SKU
  detail?: string; // Formatted specification / variant detail
  cartItemId: string; // Unique key e.g. "eq-101-large-black-hire-4"
  slug?: string; // Canonical product slug for storefront links
  name: string;
  price: number; // Unit price (including size modifier & extras)
  quantity: number;
  image: string;
  purchaseType: 'buy' | 'hire';
  selectedSize?: string;
  selectedColor?: string;
  /** Full variant attribute map (size, colour, cover,...) — part of the identity hash. */
  selectedAttributes?: Record<string, string>;
  selectedExtras?: CartItemExtra[];
  weeklyRate?: number;
  hireWeeks?: number;
  gstType?: 'standard' | 'gst-free' | 'custom';
  gstRate?: number;
  deliveryFee?: number;
}

export interface AddItemParams {
  id: string;
  code?: string;
  sku?: string;
  detail?: string;
  slug?: string;
  name: string;
  price: number;
  image: string;
  purchaseType?: 'buy' | 'hire';
  selectedSize?: string;
  selectedColor?: string;
  selectedAttributes?: Record<string, string>;
  selectedExtras?: CartItemExtra[];
  weeklyRate?: number;
  hireWeeks?: number;
  quantity?: number;
  gstType?: 'standard' | 'gst-free' | 'custom';
  gstRate?: number;
  deliveryFee?: number;
}

export interface AppliedPromo {
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
}

/**
 * Canonical line-item identity. MUST stay in sync everywhere a key is built
 * (add + hire-weeks update) or quantity/remove actions target stale keys and
 * cart counts corrupt. Covers the full variant configuration.
 */
const normKeyPart = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function buildCartItemKey(params: {
  id: string;
  purchaseType: 'buy' | 'hire';
  hireWeeks?: number;
  selectedSize?: string;
  selectedColor?: string;
  selectedAttributes?: Record<string, string>;
  selectedExtras?: { id: string }[];
}): string {
  const attrEntries = Object.entries(params.selectedAttributes || {})
    .filter(([, v]) => v !== undefined && v !== null && String(v) !== '')
    .map(([k, v]) => `${normKeyPart(k)}=${normKeyPart(String(v))}`)
    .sort();
  const sizeTag =
    params.selectedSize && !attrEntries.some((e) => e.startsWith('size='))
      ? `-${normKeyPart(params.selectedSize)}`
      : '';
  const colorTag =
    params.selectedColor && !attrEntries.some((e) => e.startsWith('colour=') || e.startsWith('color='))
      ? `-${normKeyPart(params.selectedColor)}`
      : '';
  const attrsTag = attrEntries.length > 0 ? `-${attrEntries.join('_')}` : '';
  const extrasTag =
    params.selectedExtras && params.selectedExtras.length > 0
      ? `-${params.selectedExtras.map((e) => e.id).sort().join('_')}`
      : '';
  const hireTag = params.purchaseType === 'hire' ? `-hire-${params.hireWeeks || 2}` : '-buy';
  return `${params.id}${sizeTag}${colorTag}${attrsTag}${extrasTag}${hireTag}`;
}

export interface CartConflict {
  isOpen: boolean;
  currentType: 'buy' | 'hire';
  attemptedType: 'buy' | 'hire';
  incomingItem: AddItemParams;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  /** Coupon validated server-side; cleared on cart empty. Survives cart→checkout. */
  appliedPromo: AppliedPromo | null;
  /** Warning state when customer attempts to mix different order types */
  conflict: CartConflict | null;

  // Actions
  addItem: (params: AddItemParams) => boolean;
  resolveConflict: (action: 'replace' | 'cancel') => void;
  dismissConflict: () => void;
  separateCart: (keepType: 'buy' | 'hire') => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  updateHireWeeks: (cartItemId: string, weeks: number) => void;
  setPromo: (promo: AppliedPromo | null) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;

  // Getters & Computed Totals
  hasMixedItems: () => boolean;
  getItemCount: () => number;
  getSubtotal: () => number;
  getTotalDeliveryFee: () => number;
  getTotalGst: () => number;
  getGrandTotal: () => number;
}

export const useCartStore = create<CartState>()(persist((set, get) => ({
      items: [],
      isOpen: false,
      appliedPromo: null,
      conflict: null,

      addItem: (params: AddItemParams) => {
        const purchaseType = params.purchaseType || 'buy';
        const currentItems = get().items;

        // Restriction Check: Outright purchase vs Equipment hire cannot be combined in a single order
        if (currentItems.length > 0) {
          const conflicting = currentItems.find((item) => item.purchaseType !== purchaseType);
          if (conflicting) {
            set({
              conflict: {
                isOpen: true,
                currentType: conflicting.purchaseType,
                attemptedType: purchaseType,
                incomingItem: params,
              },
            });
            return false;
          }
        }

        const hireWeeks = purchaseType === 'hire' ? (params.hireWeeks || 2) : undefined;
        const weeklyRate = purchaseType === 'hire' ? (params.weeklyRate || estimateWeeklyHireRate(params.price)) : undefined;
        const unitPrice = purchaseType === 'hire' && weeklyRate ? (weeklyRate * (hireWeeks || 2)) : params.price;

        // Unique identity covers the FULL variant configuration so different
        // sizes/colours/covers/extras never merge into one line item.
        const cartItemId = buildCartItemKey({
          id: params.id,
          purchaseType,
          hireWeeks,
          selectedSize: params.selectedSize,
          selectedColor: params.selectedColor,
          selectedAttributes: params.selectedAttributes,
          selectedExtras: params.selectedExtras,
        });
        const qtyToAdd = params.quantity && params.quantity > 0 ? params.quantity : 1;
        const gstType = params.gstType || 'gst-free';
        const gstRate = params.gstRate || 0;
        const deliveryFee = params.deliveryFee || 0;

        set((state) => {
          const existingIndex = state.items.findIndex((item) => item.cartItemId === cartItemId);
          if (existingIndex > -1) {
            const updated = [...state.items];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + qtyToAdd,
            };
            return { items: updated, isOpen: true };
          }

          const newItem: CartItem = {
            id: params.id,
            code: params.code || params.sku || params.id,
            sku: params.sku || params.code || params.id,
            detail: params.detail,
            cartItemId,
            slug: params.slug,
            name: params.name,
            price: unitPrice,
            quantity: qtyToAdd,
            image: params.image,
            purchaseType,
            selectedSize: params.selectedSize,
            selectedColor: params.selectedColor,
            selectedAttributes: params.selectedAttributes,
            selectedExtras: params.selectedExtras,
            weeklyRate,
            hireWeeks,
            gstType,
            gstRate,
            deliveryFee,
          };

          return { items: [...state.items, newItem], isOpen: true };
        });
        return true;
      },

      resolveConflict: (action: 'replace' | 'cancel') => {
        const conflict = get().conflict;
        if (!conflict) return;

        if (action === 'replace') {
          const pendingItem = conflict.incomingItem;
          // Clear previous items and add incoming item as a fresh single-type cart
          set({ items: [], appliedPromo: null, conflict: null });
          get().addItem(pendingItem);
        } else {
          set({ conflict: null });
        }
      },

      dismissConflict: () => set({ conflict: null }),

      separateCart: (keepType: 'buy' | 'hire') => {
        set((state) => ({
          items: state.items.filter((i) => i.purchaseType === keepType),
          appliedPromo: state.appliedPromo,
        }));
      },

      removeItem: (cartItemId: string) => {
        // Match ONLY the unique line-item key — never the shared product id,
        // otherwise removing one variant would delete all its siblings.
        set((state) => {
          const items = state.items.filter((item) => item.cartItemId !== cartItemId);
          return { items, appliedPromo: items.length > 0 ? state.appliedPromo : null };
        });
      },

      updateQuantity: (cartItemId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(cartItemId);
          return;
        }
        set((state) => ({
          items: state.items.map((item) =>
            item.cartItemId === cartItemId
              ? {...item, quantity }
              : item),
        }));
      },

      updateHireWeeks: (cartItemId: string, newWeeks: number) => {
        if (newWeeks < 1) return;
        set((state) => ({
          items: state.items.map((item) => {
            if (item.cartItemId === cartItemId && item.purchaseType === 'hire') {
              const weekly = item.weeklyRate || (item.price / (item.hireWeeks || 2));
              const newUnitPrice = weekly * newWeeks;
              // Rebuild the key with the SAME canonical builder so the line
              // keeps its variant identity (attributes included).
              const newCartItemId = buildCartItemKey({
                id: item.id,
                purchaseType: 'hire',
                hireWeeks: newWeeks,
                selectedSize: item.selectedSize,
                selectedColor: item.selectedColor,
                selectedAttributes: item.selectedAttributes,
                selectedExtras: item.selectedExtras,
              });

              return {
                ...item,
                cartItemId: newCartItemId,
                hireWeeks: newWeeks,
                price: newUnitPrice,
                weeklyRate: weekly,
              };
            }
            return item;
          }),
        }));
      },

      clearCart: () => set({ items: [], appliedPromo: null }),
      setPromo: (promo: AppliedPromo | null) => set({ appliedPromo: promo }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((state) => ({ isOpen: !state.isOpen })),

      hasMixedItems: () => {
        const items = get().items;
        const hasBuy = items.some((i) => i.purchaseType === 'buy');
        const hasHire = items.some((i) => i.purchaseType === 'hire');
        return hasBuy && hasHire;
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },

      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      getTotalDeliveryFee: () => {
        return get().items.reduce((sum, item) => sum + (item.deliveryFee || 0) * item.quantity, 0);
      },

      getTotalGst: () => {
        return get().items.reduce((sum, item) => {
          if (item.gstType === 'gst-free') return sum;
          const itemTotal = item.price * item.quantity;
          const rate = item.gstType === 'custom' && item.gstRate !== undefined ? item.gstRate : 10;
          if (rate <= 0) return sum;
          const rateFraction = rate / 100;
          return sum + (itemTotal * rateFraction) / (1 + rateFraction);
        }, 0);
      },

      getGrandTotal: () => {
        return get().getSubtotal() + get().getTotalDeliveryFee();
      },
    }),
    {
      name: 'at_specialists_cart_v4_canonical',
      storage: createJSONStorage(() => localStorage),
    }));
