import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db/database.js';
import { requireAdmin } from './auth.js';

const router = Router();

export interface Promotion {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrder: number;
  maxUsage: number | null;
  usageCount: number;
  expiresAt: string;
  active: boolean;
  description: string;
}

const DEFAULT_PROMOTIONS: Promotion[] = [
  { id: 'promo-ndis10', code: 'NDIS10', type: 'percentage', value: 10, minOrder: 200, maxUsage: null, usageCount: 0, expiresAt: '2026-12-31', active: true, description: '10% off for NDIS participants on orders over $200' },
  { id: 'promo-welcome50', code: 'WELCOME50', type: 'fixed', value: 50, minOrder: 300, maxUsage: null, usageCount: 0, expiresAt: '2026-12-31', active: true, description: '$50 off orders over $300' },
  { id: 'promo-freeship', code: 'FREESHIP', type: 'free_shipping', value: 0, minOrder: 100, maxUsage: null, usageCount: 0, expiresAt: '2026-12-31', active: true, description: 'Free shipping on orders over $100' },
];

function getPromotions(store: any): Promotion[] {
  // Seed factory defaults only on first boot (key absent). An intentionally
  // emptied list must stay empty — never resurrect deleted codes.
  if (!Array.isArray(store.promotions)) {
    store.promotions = DEFAULT_PROMOTIONS.map((p) => ({...p }));
    try { saveDb(); } catch { /* best-effort seed */ }
  }
  return store.promotions;
}

export interface PromoCheck {
  valid: boolean;
  message: string;
  promo?: Promotion;
  discount?: number;
  freeShipping?: boolean;
}

/** Shared coupon validation used by /validate and the cart pricer. */
export function checkPromotion(store: any, code: string, subtotal: number): PromoCheck {
  const normalized = String(code || '').trim().toUpperCase();
  if (!normalized) return { valid: false, message: 'Enter a coupon code.' };
  const promo = getPromotions(store).find((p) => String(p.code || '').toUpperCase() === normalized);
  if (!promo) return { valid: false, message: 'This code is not recognised.' };
  if (!promo.active) return { valid: false, message: 'This code is no longer active.' };
  if (promo.expiresAt) {
    const exp = new Date(promo.expiresAt + 'T23:59:59');
    if (!isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
      return { valid: false, message: 'This code has expired.' };
    }
  }
  if (promo.maxUsage !== null && promo.maxUsage !== undefined && promo.usageCount >= promo.maxUsage) {
    return { valid: false, message: 'This code has reached its usage limit.' };
  }
  if (subtotal < (promo.minOrder || 0)) {
    return { valid: false, message: `Requires a minimum order of $${Number(promo.minOrder).toFixed(2)}.` };
  }
  let discount = 0;
  let freeShipping = false;
  if (promo.type === 'percentage') discount = Math.round(subtotal * (Number(promo.value) || 0)) / 100;
  else if (promo.type === 'fixed') discount = Math.min(Number(promo.value) || 0, subtotal);
  else if (promo.type === 'free_shipping') freeShipping = true;
  discount = Math.round(discount * 100) / 100;
  return { valid: true, message: 'Code applied.', promo, discount, freeShipping };
}

// POST /api/promotions/validate — public coupon check used at checkout
router.post('/validate', (req: Request, res: Response) => {
  const store = getDb();
  const { code, subtotal } = (req.body || {}) as any;
  const result = checkPromotion(store, code, Number(subtotal) || 0);
  if (!result.valid) {
    res.status(400).json({ success: false, error: result.message });
    return;
  }
  res.json({
    success: true,
    code: result.promo!.code,
    type: result.promo!.type,
    value: result.promo!.value,
    discount: result.discount || 0,
    freeShipping: !!result.freeShipping,
    message: result.message,
  });
});

// POST /api/promotions/:code/redeem — increments usage after a completed order
router.post('/:code/redeem', (req: Request, res: Response) => {
  const store = getDb();
  const promos = getPromotions(store);
  const promo = promos.find((p) => String(p.code || '').toUpperCase() === String(req.params.code || '').toUpperCase());
  if (!promo) {
    res.status(404).json({ error: 'Unknown coupon code' });
    return;
  }
  if (promo.maxUsage === null || promo.maxUsage === undefined || promo.usageCount < promo.maxUsage) {
    promo.usageCount = (promo.usageCount || 0) + 1;
    saveDb();
  }
  res.json({ success: true, usageCount: promo.usageCount });
});

// GET /api/promotions — admin: full list
router.get('/', requireAdmin, (_req: Request, res: Response) => {
  res.json({ promotions: getPromotions(getDb()) });
});

// POST /api/promotions — admin: create
router.post('/', requireAdmin, (req: Request, res: Response) => {
  const b = (req.body || {}) as any;
  const code = String(b.code || '').trim().toUpperCase();
  if (!code) {
    res.status(400).json({ error: 'Coupon code is required' });
    return;
  }
  const store = getDb();
  const promos = getPromotions(store);
  if (promos.some((p) => String(p.code).toUpperCase() === code)) {
    res.status(409).json({ error: 'A promotion with this code already exists' });
    return;
  }
  const type = ['percentage', 'fixed', 'free_shipping'].includes(b.type) ? b.type : 'percentage';
  const promo: Promotion = {
    id: `promo-${Date.now()}`,
    code,
    type,
    value: Math.max(0, Number(b.value) || 0),
    minOrder: Math.max(0, Number(b.minOrder) || 0),
    maxUsage: b.maxUsage === null || b.maxUsage === undefined || b.maxUsage === '' ? null : Math.max(1, parseInt(b.maxUsage, 10)),
    usageCount: 0,
    expiresAt: typeof b.expiresAt === 'string' ? b.expiresAt.slice(0, 10) : '',
    active: b.active !== false,
    description: typeof b.description === 'string' ? b.description.slice(0, 200) : '',
  };
  promos.unshift(promo);
  saveDb();
  res.status(201).json({ success: true, promotion: promo });
});

// PUT /api/promotions/:id — admin: update
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const store = getDb();
  const promos = getPromotions(store);
  const promo = promos.find((p) => p.id === req.params.id);
  if (!promo) {
    res.status(404).json({ error: 'Promotion not found' });
    return;
  }
  const b = (req.body || {}) as any;
  if (b.code !== undefined) {
    const code = String(b.code).trim().toUpperCase();
    if (!code) {
      res.status(400).json({ error: 'Coupon code is required' });
      return;
    }
    if (promos.some((p) => p.id !== promo.id && String(p.code).toUpperCase() === code)) {
      res.status(409).json({ error: 'A promotion with this code already exists' });
      return;
    }
    promo.code = code;
  }
  if (b.type !== undefined && ['percentage', 'fixed', 'free_shipping'].includes(b.type)) promo.type = b.type;
  if (b.value !== undefined) promo.value = Math.max(0, Number(b.value) || 0);
  if (b.minOrder !== undefined) promo.minOrder = Math.max(0, Number(b.minOrder) || 0);
  if (b.maxUsage !== undefined) promo.maxUsage = b.maxUsage === null || b.maxUsage === '' ? null : Math.max(1, parseInt(b.maxUsage, 10));
  if (b.expiresAt !== undefined) promo.expiresAt = typeof b.expiresAt === 'string' ? b.expiresAt.slice(0, 10) : '';
  if (b.active !== undefined) promo.active = b.active !== false;
  if (b.description !== undefined) promo.description = typeof b.description === 'string' ? b.description.slice(0, 200) : '';
  saveDb();
  res.json({ success: true, promotion: promo });
});

// DELETE /api/promotions/:id — admin: delete
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const store = getDb();
  const promos = getPromotions(store);
  if (!promos.some((p) => p.id === req.params.id)) {
    res.status(404).json({ error: 'Promotion not found' });
    return;
  }
  store.promotions = promos.filter((p) => p.id !== req.params.id);
  saveDb();
  res.json({ success: true, message: 'Promotion deleted' });
});

export default router;
