import { Router, Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { getDb, saveDb } from '../db/database.js';
import { requireAdmin } from './auth.js';
import { dispatchNdisQuoteEmails } from './emails.js';

const router = Router();

router.get('/', requireAdmin, (_req: Request, res: Response) => {
  const store = getDb();
  const quotes = (store as any).quotes || [];
  res.json({ quotes });
});

router.get('/:id', (req: Request, res: Response) => {
  const store = getDb();
  const quotes = (store as any).quotes || [];
  const quote = quotes.find((q: any) => q.id === req.params.id);
  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' });
  }
  // Private quote: admin token or the per-quote access token issued at creation.
  const token = String((req.query as any).token || '');
  const authHeader = String(req.headers.authorization || '');
  if (token && quote.accessToken && token !== quote.accessToken) {
    return res.status(403).json({ error: 'Invalid quote access token' });
  }
  if (!token && !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  res.json({ quote });
});

router.get('/:id/pdf', (req: Request, res: Response) => {
  res.redirect(`/api/emails/pdf/${encodeURIComponent(req.params.id)}`);
});

router.post('/', async (req: Request, res: Response) => {
  const store = getDb();
  if (!(store as any).quotes) {
    (store as any).quotes = [];
  }
  const body = (req.body || {}) as any;
  const customerEmail = String(body.customerEmail || body.email || '').trim();
  const customerName = String(body.customerName || body.name || '').trim();
  if (!customerName) {
    res.status(400).json({ error: 'Customer name is required' });
    return;
  }
  if (!customerEmail || !/^\S+@\S+\.\S+$/.test(customerEmail)) {
    res.status(400).json({ error: 'Valid customer email is required' });
    return;
  }
  const items = Array.isArray(body.items) ? body.items : [];
  const isHireQuote = body.quoteType === 'hire' || 
    (typeof body.id === 'string' && body.id.toUpperCase().startsWith('HIR')) ||
    items.some((it: any) => it.isRental || it.type === 'hire' || (it.purchaseType || '').toLowerCase() === 'hire');

  // Server-authoritative totals: never trust client-supplied amounts.
  const subtotal = items.reduce((s: number, it: any) => s + Number(it.price || 0) * Math.max(1, parseInt(it.quantity || 1, 10)), 0);
  const deliveryFee = Number(body.deliveryFee) || 0;
  const gstTotal = Number(body.gstTotal) || 0;
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;
  
  const idPrefix = isHireQuote ? 'HIR-QT' : 'NDIS-QT';
  const quote = {
    id: `${idPrefix}-${Date.now().toString().substring(6)}`,
    quoteType: isHireQuote ? 'hire' : 'purchase',
    customerName,
    customerEmail,
    customerPhone: body.customerPhone || '',
    shippingAddress: body.shippingAddress || '',
    ndisNumber: body.ndisNumber || '',
    participantDob: body.participantDob || '',
    planManager: body.planManager || '',
    planManagerEmail: body.planManagerEmail || '',
    planType: body.planType || 'plan_managed',
    // Prescribing Clinician / OT fields
    prescriberName: body.prescriberName || '',
    prescriberOrg: body.prescriberOrg || '',
    prescriberPhone: body.prescriberPhone || '',
    prescriberEmail: body.prescriberEmail || '',
    clinicalRationale: body.clinicalRationale || '',
    // Hire Schedule fields (Rehab Hire standards)
    hireStartDate: body.hireStartDate || '',
    hireDurationWeeks: body.hireDurationWeeks ? Number(body.hireDurationWeeks) : (isHireQuote ? 2 : null),
    hireReturnDate: body.hireReturnDate || '',
    hireLocationType: body.hireLocationType || 'residence',
    hireFacilityName: body.hireFacilityName || '',
    hireFacilityWard: body.hireFacilityWard || '',
    hireFacilityRoom: body.hireFacilityRoom || '',
    hireDischargeDate: body.hireDischargeDate || '',
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee,
    gstTotal,
    total,
    notes: typeof body.notes === 'string' ? body.notes.slice(0, 2000) : '',
    status: 'pending',
    created_at: new Date().toISOString(),
    accessToken: randomBytes(24).toString('hex'),
  };
  (store as any).quotes.unshift(quote);
  saveDb();

  // Automatically dispatch NDIS Quote / Hire Agreement emails to customer, plan manager, and admin
  try {
    const customerEmail = quote.customerEmail || req.body.customerEmail || req.body.email;
    if (customerEmail && customerEmail.includes('@')) {
      await dispatchNdisQuoteEmails({
        to: customerEmail,
        quoteId: quote.id,
        quoteType: quote.quoteType,
        customerName: quote.customerName || req.body.name || 'Valued Participant',
        customerEmail,
        customerPhone: quote.customerPhone,
        shippingAddress: quote.shippingAddress,
        ndisNumber: quote.ndisNumber,
        participantDob: quote.participantDob,
        planManager: quote.planManager,
        planManagerEmail: quote.planManagerEmail,
        planType: quote.planType,
        prescriberName: quote.prescriberName,
        prescriberOrg: quote.prescriberOrg,
        prescriberPhone: quote.prescriberPhone,
        prescriberEmail: quote.prescriberEmail,
        clinicalRationale: quote.clinicalRationale,
        hireStartDate: quote.hireStartDate,
        hireDurationWeeks: quote.hireDurationWeeks,
        hireReturnDate: quote.hireReturnDate,
        hireLocationType: quote.hireLocationType,
        hireFacilityName: quote.hireFacilityName,
        hireFacilityWard: quote.hireFacilityWard,
        hireFacilityRoom: quote.hireFacilityRoom,
        hireDischargeDate: quote.hireDischargeDate,
        items: quote.items,
        subtotal: quote.subtotal,
        deliveryFee: quote.deliveryFee,
        gstTotal: quote.gstTotal,
        total: quote.total,
        notes: quote.notes,
      });
      console.log(`📧 ${isHireQuote ? 'Equipment Hire Agreement' : 'NDIS Quote'} emails dispatched for ${quote.id} to ${customerEmail}`);
    }
  } catch (mailErr: any) {
    console.warn(`⚠️ Quote email notification notice for ${quote.id}:`, mailErr.message);
  }

  res.status(201).json({ success: true, quoteId: quote.id, accessToken: quote.accessToken, total: quote.total, quote });
});

router.patch('/:id/status', requireAdmin, (req: Request, res: Response) => {
  const store = getDb();
  const quotes = (store as any).quotes || [];
  const { id } = req.params;
  const { status } = req.body;
  const q = quotes.find((it: any) => it.id === id);
  if (q) {
    q.status = status;
    saveDb();
  }
  res.json({ success: true, message: 'Quote status updated' });
});

router.put('/:id', requireAdmin, async (req: Request, res: Response) => {
  const store = getDb();
  const quotes = (store as any).quotes || [];
  const { id } = req.params;
  const qIndex = quotes.findIndex((it: any) => it.id === id);
  if (qIndex === -1) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  const existing = quotes[qIndex];
  const body = req.body || {};
  const items = Array.isArray(body.items) ? body.items : existing.items || [];
  const subtotal = items.reduce((s: number, it: any) => s + Number(it.price || 0) * Math.max(1, parseInt(it.quantity || 1, 10)), 0);
  const deliveryFee = body.deliveryFee !== undefined ? Number(body.deliveryFee) : (existing.deliveryFee || 0);
  const gstTotal = body.gstTotal !== undefined ? Number(body.gstTotal) : (existing.gstTotal || 0);
  const total = Math.round((subtotal + deliveryFee) * 100) / 100;

  const updatedQuote = {
    ...existing,
    customerName: body.customerName !== undefined ? body.customerName : existing.customerName,
    customerEmail: body.customerEmail !== undefined ? body.customerEmail : existing.customerEmail,
    customerPhone: body.customerPhone !== undefined ? body.customerPhone : existing.customerPhone,
    shippingAddress: body.shippingAddress !== undefined ? body.shippingAddress : existing.shippingAddress,
    ndisNumber: body.ndisNumber !== undefined ? body.ndisNumber : existing.ndisNumber,
    participantDob: body.participantDob !== undefined ? body.participantDob : existing.participantDob,
    planManager: body.planManager !== undefined ? body.planManager : existing.planManager,
    planManagerEmail: body.planManagerEmail !== undefined ? body.planManagerEmail : existing.planManagerEmail,
    planType: body.planType !== undefined ? body.planType : existing.planType,
    prescriberName: body.prescriberName !== undefined ? body.prescriberName : existing.prescriberName,
    prescriberOrg: body.prescriberOrg !== undefined ? body.prescriberOrg : existing.prescriberOrg,
    prescriberPhone: body.prescriberPhone !== undefined ? body.prescriberPhone : existing.prescriberPhone,
    prescriberEmail: body.prescriberEmail !== undefined ? body.prescriberEmail : existing.prescriberEmail,
    clinicalRationale: body.clinicalRationale !== undefined ? body.clinicalRationale : existing.clinicalRationale,
    hireStartDate: body.hireStartDate !== undefined ? body.hireStartDate : existing.hireStartDate,
    hireDurationWeeks: body.hireDurationWeeks !== undefined ? Number(body.hireDurationWeeks) : existing.hireDurationWeeks,
    hireReturnDate: body.hireReturnDate !== undefined ? body.hireReturnDate : existing.hireReturnDate,
    hireLocationType: body.hireLocationType !== undefined ? body.hireLocationType : existing.hireLocationType,
    hireFacilityName: body.hireFacilityName !== undefined ? body.hireFacilityName : existing.hireFacilityName,
    hireFacilityWard: body.hireFacilityWard !== undefined ? body.hireFacilityWard : existing.hireFacilityWard,
    hireFacilityRoom: body.hireFacilityRoom !== undefined ? body.hireFacilityRoom : existing.hireFacilityRoom,
    hireDischargeDate: body.hireDischargeDate !== undefined ? body.hireDischargeDate : existing.hireDischargeDate,
    items,
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee,
    gstTotal,
    total: body.total !== undefined ? Number(body.total) : total,
    notes: body.notes !== undefined ? body.notes : existing.notes,
    status: body.status !== undefined ? body.status : existing.status,
    updated_at: new Date().toISOString(),
  };

  quotes[qIndex] = updatedQuote;
  saveDb();

  // If sendEmail is requested
  if (body.sendEmail) {
    try {
      const isHireQuote = updatedQuote.quoteType === 'hire' || updatedQuote.id.toUpperCase().startsWith('HIR');
      await dispatchNdisQuoteEmails({
        to: updatedQuote.customerEmail,
        quoteId: updatedQuote.id,
        quoteType: updatedQuote.quoteType,
        customerName: updatedQuote.customerName,
        customerEmail: updatedQuote.customerEmail,
        customerPhone: updatedQuote.customerPhone,
        shippingAddress: updatedQuote.shippingAddress,
        ndisNumber: updatedQuote.ndisNumber,
        participantDob: updatedQuote.participantDob,
        planManager: updatedQuote.planManager,
        planManagerEmail: updatedQuote.planManagerEmail,
        planType: updatedQuote.planType,
        prescriberName: updatedQuote.prescriberName,
        prescriberOrg: updatedQuote.prescriberOrg,
        prescriberPhone: updatedQuote.prescriberPhone,
        prescriberEmail: updatedQuote.prescriberEmail,
        clinicalRationale: updatedQuote.clinicalRationale,
        hireStartDate: updatedQuote.hireStartDate,
        hireDurationWeeks: updatedQuote.hireDurationWeeks,
        hireReturnDate: updatedQuote.hireReturnDate,
        hireLocationType: updatedQuote.hireLocationType,
        hireFacilityName: updatedQuote.hireFacilityName,
        hireFacilityWard: updatedQuote.hireFacilityWard,
        hireFacilityRoom: updatedQuote.hireFacilityRoom,
        hireDischargeDate: updatedQuote.hireDischargeDate,
        items: updatedQuote.items,
        subtotal: updatedQuote.subtotal,
        deliveryFee: updatedQuote.deliveryFee,
        gstTotal: updatedQuote.gstTotal,
        total: updatedQuote.total,
        notes: updatedQuote.notes,
      });
    } catch (e: any) {
      console.warn(`Email resend notice for ${updatedQuote.id}:`, e.message);
    }
  }

  res.json({ success: true, quote: updatedQuote, message: 'Quote updated successfully' });
});

router.post('/:id/convert', requireAdmin, (req: Request, res: Response) => {
  const store = getDb();
  const quotes = (store as any).quotes || [];
  const { id } = req.params;
  const quote = quotes.find((it: any) => it.id === id);
  if (!quote) {
    return res.status(404).json({ error: 'Quote not found' });
  }

  const isHire = quote.quoteType === 'hire' || quote.id.toUpperCase().startsWith('HIR') ||
    (Array.isArray(quote.items) && quote.items.some((it: any) => it.isRental || it.type === 'hire' || (it.purchaseType || '').toLowerCase() === 'hire'));

  const orderId = isHire
    ? quote.id.replace(/^HIR-QT-/, 'HIR-')
    : quote.id.replace(/^NDIS-QT-/, 'NDIS-ORD-');

  if (!(store as any).orders) {
    (store as any).orders = [];
  }

  const newOrder = {
    id: orderId || `ORD-${Date.now().toString().slice(-6)}`,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone,
    shippingAddress: quote.shippingAddress,
    items: quote.items.map((it: any) => ({
      ...it,
      purchaseType: isHire ? 'hire' : (it.purchaseType || 'buy'),
      hireWeeks: isHire ? (quote.hireDurationWeeks || it.hireWeeks || 2) : undefined,
    })),
    subtotal: quote.subtotal,
    deliveryFee: quote.deliveryFee,
    gstTotal: quote.gstTotal,
    total: quote.total,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentMethod: isHire ? 'Hire Agreement Payment (Confirmed)' : `NDIS Funding (${quote.planManager || 'Plan Managed'})`,
    ndisNumber: quote.ndisNumber,
    notes: `Converted from Quote #${quote.id}. ${quote.notes || ''}`.trim(),
    created_at: new Date().toISOString(),
    hireStartDate: quote.hireStartDate,
    hireDurationWeeks: quote.hireDurationWeeks,
    hireReturnDate: quote.hireReturnDate,
    hireLocationType: quote.hireLocationType,
    hireFacilityName: quote.hireFacilityName,
    hireFacilityWard: quote.hireFacilityWard,
    hireFacilityRoom: quote.hireFacilityRoom,
    hireDischargeDate: quote.hireDischargeDate,
  };

  quote.status = 'approved';
  (store as any).orders.unshift(newOrder);
  saveDb();

  res.json({ success: true, order: newOrder, message: 'Quote successfully converted to confirmed order' });
});

export default router;
