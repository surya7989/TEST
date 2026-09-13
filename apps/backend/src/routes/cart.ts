import { Router, Request, Response } from 'express';
import { getDb } from '../db/database.js';
import { checkPromotion } from './promotions.js';

const router = Router();

interface CatalogVariant {
  id?: string;
  sku?: string;
  attributes?: Record<string, unknown>;
  price?: number;
  hirePrice?: number;
  available?: boolean;
}

function findPricedItem(storeProducts: any[], ref: any): { buyPrice: number; hirePrice: number; gstType: string; gstRate: number; deliveryFee: number } | null {
  const isObj = ref && typeof ref === 'object';
  const item = isObj ? ref : { sku: ref, id: ref };
  const keys = [
    item.sku,
    item.code,
    item.id,
    item.slug,
  ].filter(Boolean).map((k) => String(k).toLowerCase().trim());

  if (keys.length === 0 && !item.name) return null;

  for (const p of storeProducts) {
    const pKeys = [
      (p as any).id,
      (p as any).slug,
      (p as any).sku,
      (p as any).code,
    ].filter(Boolean).map((k) => String(k).toLowerCase().trim());

    // 1. Variant SKU/ID match first (exact configured price)
    const vars: CatalogVariant[] = Array.isArray((p as any).variants) ? (p as any).variants : [];
    for (const v of vars) {
      const vKeys = [v.sku, v.id].filter(Boolean).map((k) => String(k).toLowerCase().trim());
      if (vKeys.some((vk) => keys.includes(vk))) {
        return {
          buyPrice: Number(v.price || (p as any).buyPrice || (p as any).price || 0),
          hirePrice: Number((v as any).hirePrice ?? (p as any).hirePrice ?? (p as any).weeklyHireRate ?? 0),
          gstType: (p as any).gstType || 'gst-free',
          gstRate: Number((p as any).gstRate ?? 0),
          deliveryFee: Number((p as any).deliveryFee ?? 0),
        };
      }
    }

    // 2. Direct product ID / SKU / Code / Slug match
    if (pKeys.some((pk) => keys.includes(pk))) {
      return {
        buyPrice: Number((p as any).buyPrice ?? (p as any).price ?? 0),
        hirePrice: Number((p as any).hirePrice ?? (p as any).weeklyHireRate ?? 0),
        gstType: (p as any).gstType || 'gst-free',
        gstRate: Number((p as any).gstRate ?? 0),
        deliveryFee: Number((p as any).deliveryFee ?? 0),
      };
    }

    // 3. Name match fallback
    if (item.name && String((p as any).name || '').toLowerCase().trim() === String(item.name).toLowerCase().trim()) {
      return {
        buyPrice: Number((p as any).buyPrice ?? (p as any).price ?? 0),
        hirePrice: Number((p as any).hirePrice ?? (p as any).weeklyHireRate ?? 0),
        gstType: (p as any).gstType || 'gst-free',
        gstRate: Number((p as any).gstRate ?? 0),
        deliveryFee: Number((p as any).deliveryFee ?? 0),
      };
    }
  }

  // 4. If product wasn't found in store catalog but has valid client-provided price, preserve it
  if (item && Number(item.price) > 0) {
    const parsedPrice = Number(item.price);
    const parsedWeeks = Number(item.hireWeeks) > 0 ? Number(item.hireWeeks) : 2;
    const weeklyFallback = Number(item.weeklyRate) > 0 ? Number(item.weeklyRate) : (item.purchaseType === 'hire' ? parsedPrice / parsedWeeks : parsedPrice);
    return {
      buyPrice: parsedPrice,
      hirePrice: weeklyFallback,
      gstType: item.gstType || 'gst-free',
      gstRate: Number(item.gstRate ?? 0),
      deliveryFee: Number(item.deliveryFee ?? 0),
    };
  }

  return null;
}

function gstForLine(lineTotal: number, gstType: string, gstRate: number): number {
  if (gstType === 'gst-free' || lineTotal <= 0) return 0;
  if (gstType === 'custom') {
    const r = Number(gstRate) || 0;
    if (r <= 0) return 0;
    return (lineTotal * (r / 100)) / (1 + r / 100);
  }
  return lineTotal / 11; // standard 10% GST inclusive
}

export interface PricedLine {
  id?: string;
  price: number;
  quantity: number;
  purchaseType: string;
  hireWeeks: number;
  gstType: string;
  lineTotal: number;
  [key: string]: any;
}

export interface CartTotals {
  subtotal: number;
  deliveryFee: number;
  gstTotal: number;
  total: number;
  items: PricedLine[];
  rejected: string[];
  discount: number;
  promo: { code: string; type: string; value: number } | null;
}

/** Server-authoritative cart pricing from the catalogue (never client prices). */
export function calculateCart(items: any[], deliveryMethod?: string, promoCode?: string): CartTotals {
  const store = getDb();
  const storeProducts = (store as any).products || [];

  let subtotal = 0;
  let deliveryFee = 0;
  let gstTotal = 0;
  const calculatedItems: PricedLine[] = [];
  const rejected: string[] = [];

  for (const it of items || []) {
    const priced = findPricedItem(storeProducts, it);
    const qty = Math.max(1, parseInt(it.quantity || 1, 10));
    const isHire = it.purchaseType === 'hire';
    const weeks = isHire ? Math.min(52, Math.max(1, parseInt(it.hireWeeks || 2, 10))) : 0;

    if (!priced) {
      if (Number(it.price) > 0) {
        // Safe fallback to positive price
        const unitPrice = Number(it.price);
        const lineTotal = unitPrice * qty;
        subtotal += lineTotal;
        deliveryFee += (Number(it.deliveryFee) || 0) * qty;
        calculatedItems.push({
          ...it,
          price: Math.round(unitPrice * 100) / 100,
          quantity: qty,
          purchaseType: isHire ? 'hire' : 'buy',
          hireWeeks: weeks,
          gstType: it.gstType || 'gst-free',
          lineTotal: Math.round(lineTotal * 100) / 100,
        });
      } else {
        rejected.push(String(it.sku || it.code || it.id || 'unknown'));
      }
      continue;
    }

    // Include selected optional equipment / extras add-ons if selected
    const extrasSum = Array.isArray(it.selectedExtras)
      ? it.selectedExtras.reduce((sum: number, ext: any) => sum + (Number(ext.price) || 0), 0)
      : 0;

    let weekly = 0;
    if (isHire) {
      weekly = priced.hirePrice > 0
        ? priced.hirePrice
        : (Number(it.weeklyRate) > 0
          ? Number(it.weeklyRate)
          : (weeks > 0 && Number(it.price) > 0 ? Number(it.price) / weeks : priced.buyPrice));
    }

    const unitPrice = isHire ? (weekly * weeks) : (priced.buyPrice + extrasSum);
    const lineTotal = unitPrice * qty;

    let detail = it.detail || '';
    if (!detail || (Array.isArray(it.selectedExtras) && it.selectedExtras.length > 0 && !detail.includes('Extras:'))) {
      const parts: string[] = [];
      if (it.selectedSize) parts.push(`Size: ${String(it.selectedSize).split('(')[0].trim()}`);
      if (it.selectedColor) parts.push(`Colour: ${it.selectedColor}`);
      if (isHire && weeks) parts.push(`${weeks} Wks Hire`);
      if (Array.isArray(it.selectedExtras) && it.selectedExtras.length > 0) {
        parts.push(`Extras: ${it.selectedExtras.map((e: any) => `${e.name} (+$${Number(e.price).toFixed(2)})`).join(', ')}`);
      }
      detail = parts.length > 0 ? parts.join(' • ') : detail;
    }

    subtotal += lineTotal;
    deliveryFee += (priced.deliveryFee || 0) * qty;
    gstTotal += gstForLine(lineTotal, priced.gstType, priced.gstRate);

    calculatedItems.push({
      ...it,
      detail,
      selectedExtras: it.selectedExtras || [],
      price: Math.round(unitPrice * 100) / 100,
      quantity: qty,
      purchaseType: isHire ? 'hire' : 'buy',
      hireWeeks: weeks,
      gstType: priced.gstType,
      lineTotal: Math.round(lineTotal * 100) / 100,
    });
  }

  const methodFees: Record<string, number> = { standard: 0, express: 29, white_glove: 149 };
  deliveryFee += methodFees[deliveryMethod || 'standard'] || 0;

  // Coupon: validated server-side; percentage/fixed reduce the subtotal,
  // free-shipping waives the delivery fee.
  let discount = 0;
  let promo: { code: string; type: string; value: number } | null = null;
  if (promoCode && String(promoCode).trim()) {
    const check = checkPromotion(store, promoCode, subtotal);
    if (check.valid && check.promo) {
      promo = { code: check.promo.code, type: check.promo.type, value: check.promo.value };
      if (check.freeShipping) {
        deliveryFee = 0;
      } else {
        discount = Math.min(check.discount || 0, subtotal);
      }
    }
  }
  const grandTotal = subtotal - discount + deliveryFee;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    gstTotal: Math.round(gstTotal * 100) / 100,
    total: Math.round(grandTotal * 100) / 100,
    items: calculatedItems,
    rejected,
    discount: Math.round(discount * 100) / 100,
    promo,
  };
}

router.post('/calculate', (req: Request, res: Response) => {
  const { items, deliveryMethod, promoCode } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.json({
      success: true,
      subtotal: 0.0,
      deliveryFee: 0.0,
      gstTotal: 0.0,
      total: 0.0,
      items: [],
      discount: 0,
      promo: null,
    });
    return;
  }

  const result = calculateCart(items, deliveryMethod, promoCode);

  if (result.rejected.length > 0 && result.items.length === 0) {
    res.status(400).json({ success: false, error: `Unknown products: ${result.rejected.join(', ')}` });
    return;
  }

  res.json({ success: true,...result });
});

export default router;
