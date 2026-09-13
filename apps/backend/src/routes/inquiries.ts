import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db/database.js';
import { requireAdmin } from './auth.js';
import { dispatchUnifiedTemplateEmail } from './emails.js';

const router = Router();

const VALID_STATUSES = ['new', 'contacted', 'in_progress', 'resolved', 'archived', 'quote_sent'];

function getInquiries(store: any): any[] {
  if (!Array.isArray(store.inquiries)) store.inquiries = [];
  return store.inquiries;
}

router.get('/', requireAdmin, (_req: Request, res: Response) => {
  const store = getDb();
  res.json({ inquiries: getInquiries(store) });
});

router.get('/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const inquiry = getInquiries(getDb()).find((it) => it.id === id);
  if (!inquiry) {
    return res.status(404).json({ error: 'Inquiry not found' });
  }
  res.json({ inquiry });
});

router.post('/', async (req: Request, res: Response) => {
  const body = (req.body || {}) as any;
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!name) {
    res.status(400).json({ error: 'Name is required' });
    return;
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    res.status(400).json({ error: 'Valid email address is required' });
    return;
  }
  if (!message) {
    res.status(400).json({ error: 'Message is required' });
    return;
  }
  const inq = {
    id: `INQ-${Date.now().toString().substring(6)}`,
    name,
    email,
    phone: typeof body.phone === 'string' ? body.phone.slice(0, 40) : '',
    enquiryType: typeof body.enquiryType === 'string' ? body.enquiryType.slice(0, 80) : 'General',
    ndisNumber: typeof body.ndisNumber === 'string' ? body.ndisNumber.slice(0, 40) : '',
    subject: typeof body.subject === 'string' ? body.subject.slice(0, 160) : '',
    message: message.slice(0, 5000),
    preferredContact: ['email', 'phone', 'any'].includes(body.preferredContact) ? body.preferredContact : 'email',
    status: 'new',
    created_at: new Date().toISOString(),
  };
  const store = getDb();
  getInquiries(store).unshift(inq);
  saveDb();

  // Automatically dispatch unified template email (Customer copy + Clinic Staff alert)
  try {
    const rawType = (inq.enquiryType || '').toLowerCase();
    let templateId = 'contact';
    if (rawType.includes('hire')) templateId = 'hire';
    else if (rawType.includes('trial') || rawType.includes('booking')) templateId = 'booking';
    else if (rawType.includes('referral')) templateId = 'referral';
    else if (rawType.includes('aged') || rawType.includes('hcp')) templateId = 'aged_care';
    else if (rawType.includes('ndis') || rawType.includes('quote')) templateId = 'ndis_quote';

    await dispatchUnifiedTemplateEmail({
      templateId,
      documentId: inq.id,
      customerName: inq.name || 'Valued Client',
      customerEmail: inq.email,
      customerPhone: inq.phone,
      notes: inq.message,
      extraMeta: {
        enquiryType: inq.enquiryType,
        subject: inq.subject,
        ndisNumber: inq.ndisNumber,
      },
      sendCustomerCopy: true,
      sendAdminCopy: true,
    });
    console.log(`📧 Unified inquiry email (${templateId}) dispatched for ${inq.id} to ${inq.email}`);
  } catch (mailErr: any) {
    console.warn(`⚠️ Failed to dispatch inquiry email for ${inq.id}:`, mailErr.message);
  }

  res.status(201).json({ success: true, message: 'Inquiry received', id: inq.id, inquiry: inq });
});

router.patch('/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    return;
  }
  const store = getDb();
  const inq = getInquiries(store).find((it) => it.id === id);
  if (!inq) {
    res.status(404).json({ error: 'Inquiry not found' });
    return;
  }
  inq.status = status;
  saveDb();
  res.json({ success: true, message: 'Inquiry status updated' });
});

export default router;
