import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db/database.js';
import { requireAdmin } from './auth.js';

const router = Router();

const VALID_STATUSES = ['approved', 'pending', 'flagged', 'rejected'];

function getReviews(store: any): any[] {
  if (!Array.isArray(store.reviews)) store.reviews = [];
  return store.reviews;
}

// GET /api/reviews — public storefront feed: approved only, optional ?productId=
router.get('/', (req: Request, res: Response) => {
  const store = getDb();
  const productId = String((req.query as any).productId || '');
  const list = getReviews(store).filter((r) => r.status === 'approved' && (!productId || r.productId === productId));
  res.json({ reviews: list });
});

// GET /api/reviews/admin/all — admin: everything for moderation
router.get('/admin/all', requireAdmin, (_req: Request, res: Response) => {
  res.json({ reviews: getReviews(getDb()) });
});

// POST /api/reviews — customer submission (goes to moderation queue)
router.post('/', (req: Request, res: Response) => {
  const b = (req.body || {}) as any;
  const productId = String(b.productId || '').trim();
  const customerName = String(b.customerName || b.name || '').trim().slice(0, 80);
  const customerEmail = String(b.customerEmail || b.email || '').trim().slice(0, 160);
  const rating = Math.max(1, Math.min(5, parseInt(b.rating, 10) || 0));
  const title = String(b.title || '').trim().slice(0, 160);
  const comment = String(b.comment || '').trim().slice(0, 2000);
  if (!productId) {
    res.status(400).json({ error: 'Product reference is required' });
    return;
  }
  if (!customerName) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  if (!rating) {
    res.status(400).json({ error: 'Star rating is required' });
    return;
  }
  if (!title && !comment) {
    res.status(400).json({ error: 'Review title or comment is required' });
    return;
  }
  const review = {
    id: `rev-${Date.now()}`,
    productId,
    productName: String(b.productName || '').slice(0, 160),
    productImage: String(b.productImage || ''),
    customerName,
    customerEmail,
    rating,
    title,
    comment,
    date: new Date().toISOString().split('T')[0],
    status: 'pending',
    verifiedBuyer: false,
    ndisParticipant: !!b.ndisParticipant,
    featured: false,
  };
  const store = getDb();
  getReviews(store).unshift(review);
  saveDb();
  res.status(201).json({ success: true, message: 'Review submitted for moderation.', review });
});

// PATCH /api/reviews/:id/status — admin moderation (status + flags)
router.patch('/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { status, featured, verifiedBuyer } = (req.body || {}) as any;
  const store = getDb();
  const review = getReviews(store).find((r) => r.id === req.params.id);
  if (!review) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
      return;
    }
    review.status = status;
  }
  if (featured !== undefined) review.featured = !!featured;
  if (verifiedBuyer !== undefined) review.verifiedBuyer = !!verifiedBuyer;
  saveDb();
  res.json({ success: true, review });
});

// DELETE /api/reviews/:id — admin
router.delete('/:id', requireAdmin, (req: Request, res: Response) => {
  const store = getDb();
  const list = getReviews(store);
  if (!list.some((r) => r.id === req.params.id)) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }
  store.reviews = list.filter((r) => r.id !== req.params.id);
  saveDb();
  res.json({ success: true, message: 'Review deleted' });
});

export default router;
