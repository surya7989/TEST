import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db/database.js';
import { requireAdmin } from './auth.js';

const router = Router();

// GET /api/products — list all products from store
router.get('/', (_req: Request, res: Response) => {
  const store = getDb();
  const products = (store as any).products || [];
  res.json({ products });
});

// GET /api/products/:id — single product by id or slug (used by storefront getProduct)
router.get('/:id', (req: Request, res: Response) => {
  const store = getDb();
  const products = (store as any).products || [];
  const key = String(req.params.id || '').toLowerCase();
  const found = products.find((p: any) =>
      String(p.id || '').toLowerCase() === key ||
      String(p.slug || '').toLowerCase() === key ||
      String(p.sku || '').toLowerCase() === key);
  if (!found) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  res.json({ product: found });
});

function sanitizeProductInput(body: any): { ok: boolean; error?: string; data?: any } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid product payload' };
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return { ok: false, error: 'Product name is required' };
  const rawPrice = body.price !== undefined ? body.price : body.buyPrice;
  const price = Number(rawPrice ?? 0);
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: 'Price must be a non-negative number' };
  const id = body.id || `eq-${Date.now()}`;
  return { ok: true, data: {...body, id, name, price, buyPrice: price } };
}

// POST /api/products — add new product
router.post('/', requireAdmin, (req: Request, res: Response) => {
  const store = getDb();
  if (!(store as any).products) {
    (store as any).products = [];
  }
  const parsed = sanitizeProductInput(req.body);
  if (!parsed.ok) {
    res.status(400).json({ error: parsed.error });
    return;
  }
  const newProduct = {
    ...parsed.data,
    slug: parsed.data.slug || parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    sku: parsed.data.sku || String(parsed.data.id).toUpperCase(),
    brand: parsed.data.brand || 'AT Specialists',
    category: parsed.data.category || (parsed.data.categories?.[0] ?? 'General'),
    categories: parsed.data.categories || [parsed.data.category || 'General'],
    image: parsed.data.image || (parsed.data.galleryImages?.[0] ?? ''),
    galleryImages: parsed.data.galleryImages || (parsed.data.image ? [parsed.data.image] : []),
    stock: parsed.data.stock !== undefined ? Number(parsed.data.stock) : 25,
    is_active: parsed.data.available !== false ? 1 : 0,
    available: parsed.data.available !== false,
  };
  (store as any).products.unshift(newProduct);
  saveDb();
  res.status(201).json({ success: true, product: newProduct });
});

// DELETE /api/products/clear-all — clear all products (Admin reset)
router.delete('/clear-all', requireAdmin, (_req: Request, res: Response) => {
  const store = getDb();
  (store as any).products = [];
  saveDb();
  res.json({ success: true, message: 'All products cleared successfully' });
});

// PUT /api/products/:id — update product (matches id, slug, or sku)
router.put('/:id', requireAdmin, (req: Request, res: Response) => {
  const store = getDb();
  if (!(store as any).products) {
    (store as any).products = [];
  }
  const products = (store as any).products;
  const { id } = req.params;
  const key = String(id).toLowerCase();
  const idx = products.findIndex((p: any) =>
      String(p.id || '').toLowerCase() === key ||
      String(p.slug || '').toLowerCase() === key ||
      String(p.sku || '').toLowerCase() === key);

  const updates = (req.body || {}) as any;
  if (updates.price !== undefined) updates.buyPrice = Number(updates.price);
  if (updates.buyPrice !== undefined && updates.price === undefined) updates.price = Number(updates.buyPrice);

  if (idx === -1) {
    // If the product was not in store.products yet (e.g. built-in catalogue item being updated), insert it
    const created = {
      id,
      ...updates,
      updated_at: new Date().toISOString()
    };
    products.unshift(created);
    saveDb();
    res.json({ success: true, product: created });
    return;
  }

  products[idx] = {...products[idx],...updates, id: products[idx].id };
  saveDb();
  res.json({ success: true, product: products[idx] });
});

// DELETE /api/products/:id — delete single product (matches id, slug, or sku)
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const store = getDb();
  const { id } = req.params;
  const key = String(id).toLowerCase();
  const products = (store as any).products || [];
  (store as any).products = products.filter((p: any) =>
      String(p.id || '').toLowerCase() !== key &&
      String(p.slug || '').toLowerCase() !== key &&
      String(p.sku || '').toLowerCase() !== key);
  saveDb();
  res.json({ success: true, message: 'Product deleted' });
});

export default router;
// Backend Products & Quotes synchronized with 8 exact manufacturer gallery images

