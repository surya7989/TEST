/**
 * Orders Routes
 * 
 * GET /api/orders → List all orders
 * GET /api/orders/:id → Get single order with items
 * PATCH /api/orders/:id/status → Update order status
 * PATCH /api/orders/:id/tracking → Update tracking number
 */

import { Router, Request, Response } from 'express';
import { dbAll, dbGet, dbRun } from '../db/database.js';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { requireAdmin, getJwtSecret } from './auth.js';

const router = Router();

router.get('/', requireAdmin, (_req: Request, res: Response) => {
  try {
    const orders = dbAll('SELECT * FROM orders ORDER BY created_at DESC').map((order: any) => ({
      ...order,
      items: dbAll('SELECT * FROM order_items WHERE order_id = ?', [order.id]),
    }));
    res.json({ orders });
  } catch (error: any) {
    console.error('Get orders error:', error.message);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const order = dbGet('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    // Admin bearer OR the guest access token issued at lookup time.
    let isAdmin = false;
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : '';
    if (bearer) {
      try {
        const user = jwt.verify(bearer, getJwtSecret()) as any;
        isAdmin = user.role === 'admin';
      } catch { /* fall through to token check */ }
    }
    if (!isAdmin) {
      const token = String(req.query.token || req.headers['x-order-token'] || '');
      const expected = crypto
        .createHmac('sha256', getJwtSecret())
        .update(`${order.id}:${String(order.customer_email || '').toLowerCase().trim()}`)
        .digest('hex');
      const a = Buffer.from(token);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
    }
    const items = dbAll('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);
    const paymentLogs = dbAll('SELECT * FROM payment_logs WHERE order_id = ?', [req.params.id]);
    // Guests never receive raw gateway responses.
    const safeLogs = isAdmin
      ? paymentLogs
      : paymentLogs.map((l: any) => {
          const { raw_response,...rest } = l;
          return rest;
        });
    res.json({ order, items, paymentLogs: safeLogs });
  } catch (error: any) {
    console.error('Get order error:', error.message);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

router.patch('/:id/status', requireAdmin, (req: Request, res: Response) => {
  try {
    const { status, paymentStatus } = req.body;
    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const existing = dbGet('SELECT id FROM orders WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    if (paymentStatus) {
      dbRun('UPDATE orders SET status = ?, payment_status = ? WHERE id = ?', [status, paymentStatus, req.params.id]);
    } else {
      dbRun('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    }

    res.json({ success: true, message: `Order ${req.params.id} status updated to ${status}` });
  } catch (error: any) {
    console.error('Update order status error:', error.message);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

router.patch('/:id/tracking', requireAdmin, (req: Request, res: Response) => {
  try {
    const { trackingNumber } = req.body;
    if (!trackingNumber) {
      res.status(400).json({ error: 'Tracking number is required' });
      return;
    }

    const existing = dbGet('SELECT id FROM orders WHERE id = ?', [req.params.id]);
    if (!existing) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    dbRun('UPDATE orders SET tracking_number = ? WHERE id = ?', [trackingNumber, req.params.id]);
    res.json({ success: true, message: `Tracking updated for order ${req.params.id}` });
  } catch (error: any) {
    console.error('Update tracking error:', error.message);
    res.status(500).json({ error: 'Failed to update tracking number' });
  }
});

/**
 * POST /api/orders/guest-lookup
 * Allows unauthenticated users to look up their order by order ID + billing email
 */
router.post('/guest-lookup', (req: Request, res: Response) => {
  try {
    const { orderId, email } = req.body;
    if (!orderId || !email) {
      res.status(400).json({ success: false, error: 'Order ID and email are required.' });
      return;
    }

    const normalizedEmail = (email as string).toLowerCase().trim();
    const order = dbGet('SELECT * FROM orders WHERE id = ? AND LOWER(customer_email) = ?',
      [orderId.trim(), normalizedEmail]);

    if (!order) {
      res.status(404).json({ success: false, error: 'No matching order found for the provided details.' });
      return;
    }

    // Generate a short-lived access token for invoice download
    const accessToken = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${order.id}:${normalizedEmail}`)
      .digest('hex');

    res.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        payment_status: order.payment_status,
        total: order.total,
        subtotal: order.subtotal,
        delivery_fee: order.delivery_fee,
        gst_total: order.gst_total,
        tracking_number: order.tracking_number,
        delivery_method: order.delivery_method,
        created_at: order.created_at,
        customer_name: order.customer_name,
      },
      accessToken,
    });
  } catch (error: any) {
    console.error('Guest lookup error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to look up order.' });
  }
});

/**
 * GET /api/orders/:id/invoice-pdf
 * Generates a simple invoice text response (placeholder for real PDF generation)
 */
router.get('/:id/invoice-pdf', (req: Request, res: Response) => {
  try {
    const order = dbGet('SELECT * FROM orders WHERE id = ?', [req.params.id]) as any;
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const token = String(req.query.token || req.headers['x-order-token'] || '');
    const expectedToken = crypto
      .createHmac('sha256', getJwtSecret())
      .update(`${order.id}:${String(order.customer_email || '').toLowerCase().trim()}`)
      .digest('hex');
    let authenticated = false;
    const bearer = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : '';
    if (bearer) {
      try {
        const user = jwt.verify(bearer,
          getJwtSecret()) as any;
        authenticated = user.role === 'admin'
          || (user.role === 'customer'
            && String(user.email || '').toLowerCase() === String(order.customer_email || '').toLowerCase());
      } catch {
        authenticated = false;
      }
    }
    const tokenMatches = token.length === expectedToken.length
      && crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
    if (!authenticated && !tokenMatches) {
      res.status(403).json({ error: 'Unauthorized to download this invoice.' });
      return;
    }

    const items = dbAll('SELECT * FROM order_items WHERE order_id = ?', [req.params.id]);

    // Generate a plain text invoice (a real implementation would use a PDF library)
    const invoiceLines = [
      '=================================================================',
      ' AT SPECIALISTS AUSTRALIA PTY LTD',
      ' ABN: 12 345 678 901',
      ' TAX INVOICE',
      '=================================================================',
      '',
      `Invoice / Order No: ${order.id}`,
      `Date: ${order.created_at || new Date().toISOString().split('T')[0]}`,
      `Customer: ${order.customer_name || 'N/A'}`,
      `Email: ${order.customer_email || 'N/A'}`,
      `Phone: ${order.customer_phone || 'N/A'}`,
      `Shipping Address: ${order.shipping_address || 'N/A'}`,
      `Delivery Method: ${(order.delivery_method || 'standard').replace(/_/g, ' ')}`,
      `Tracking Number: ${order.tracking_number || 'Pending'}`,
      '',
      '-----------------------------------------------------------------',
      'ITEM QTY UNIT PRICE TOTAL',
      '-----------------------------------------------------------------',
      ...(items as any[]).map((it: any) =>
        `${(it.name || it.product_id || 'Product').padEnd(34)}${String(it.quantity).padEnd(8)}$${Number(it.price || 0).toFixed(2).padStart(10)} $${(Number(it.price || 0) * Number(it.quantity || 1)).toFixed(2).padStart(10)}`),
      '-----------------------------------------------------------------',
      `${'Subtotal:'.padStart(44)} $${Number(order.subtotal || 0).toFixed(2).padStart(10)}`,
      `${'Delivery Fee:'.padStart(44)} $${Number(order.delivery_fee || 0).toFixed(2).padStart(10)}`,
      `${'GST (included):'.padStart(44)} $${Number(order.gst_total || 0).toFixed(2).padStart(10)}`,
      `${'TOTAL AUD:'.padStart(44)} $${Number(order.total || 0).toFixed(2).padStart(10)}`,
      '',
      `Payment Status: ${order.payment_status || 'Paid'}`,
      `Payment Method: ${order.payment_method || 'PayPal'}`,
      `PayPal Order ID: ${order.paypal_order_id || 'N/A'}`,
      `PayPal Capture ID: ${order.paypal_capture_id || 'N/A'}`,
      '',
      '=================================================================',
      'Thank you for choosing AT Specialists Australia.',
      'For support: admin@atspecialists.com.au | 1300 AT SPEC',
      '=================================================================',
    ];

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="AT-Specialists-Invoice-${order.id}.txt"`);
    res.send(invoiceLines.join('\n'));
  } catch (error: any) {
    console.error('Invoice PDF error:', error.message);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
});

export default router;
