/**
 * PayPal Payment Routes
 * 
 * POST /api/paypal/create-order → Creates a PayPal order for checkout
 * POST /api/paypal/capture-order → Captures payment after customer approval → money goes to YOUR PayPal
 * GET /api/paypal/client-id → Returns PayPal client ID for frontend SDK
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, saveDb } from '../db/database.js';
import {
  createPayPalOrder,
  capturePayPalOrder,
  getPayPalClientId,
  getPayPalMode,
} from '../services/paypal.js';
import { requireAdmin } from './auth.js';
import { dispatchOrderConfirmationEmails } from './emails.js';

const router = Router();

/**
 * GET /api/paypal/client-id
 * Frontend needs the PayPal Client ID to load the PayPal JS SDK
 */
router.get('/client-id', (_req: Request, res: Response) => {
  let clientId = getPayPalClientId();
  if (!clientId || clientId.includes('@') || clientId.includes('your_paypal') || clientId.includes('placeholder')) {
    clientId = 'sb'; // Default sandbox test client ID
  }
  res.json({
    clientId,
    mode: getPayPalMode(),
    currency: process.env.CURRENCY || 'AUD',
  });
});

/**
 * POST /api/paypal/settings
 * Admin updates PayPal Client ID, Secret, and Mode dynamically
 */
router.post('/settings', requireAdmin, async (req: Request, res: Response) => {
  try {
    const { clientId, secretKey, mode } = req.body;

    const { setPayPalConfig } = await import('../services/paypal.js');
    setPayPalConfig(clientId || '', secretKey || '', mode || 'sandbox');

    res.json({ success: true, message: 'PayPal settings updated successfully' });
  } catch (error: any) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update PayPal settings' });
  }
});

/**
 * POST /api/paypal/create-order
 * Called when customer clicks "Pay" — creates a PayPal order for approval
 */
// Server-side product pricing for authoritative total calculation
const PRODUCT_PRICES: Record<string, { price: number; hire_price: number; gst_type: string; name: string }> = {
  'eq-101': { price: 3450.00, hire_price: 180.00, gst_type: 'gst-free', name: 'Tilite Aero Z Ultra-Light Wheelchair' },
  'eq-102': { price: 800.00, hire_price: 45.00, gst_type: 'gst-free', name: 'ErgoFlex Premium Pressure Cushion' },
  'eq-103': { price: 2850.00, hire_price: 120.00, gst_type: 'gst-free', name: 'Invacare TDX SP2 Power Chair' },
  'eq-104': { price: 480.00, hire_price: 30.00, gst_type: 'gst-free', name: 'Days Healthcare Shower Commode' },
};

const DELIVERY_FEES: Record<string, number> = { standard: 0, express: 29, white_glove: 149 };

router.post('/create-order', async (req: Request, res: Response) => {
  try {
    const { items, deliveryMethod, promoCode, customer, shipping } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Cart items are required' });
      return;
    }

    if (!customer?.name || !customer?.email) {
      res.status(400).json({ error: 'Customer name and email are required' });
      return;
    }

    // ========================================
    // Server-authoritative price calculation (catalogue + coupon)
    // ========================================
    const { calculateCart } = await import('./cart.js');
    const serverTotals = calculateCart(items, deliveryMethod, promoCode);
    if (serverTotals.items.length === 0) {
      res.status(400).json({ error: 'No valid purchasable items in this order.' });
      return;
    }
    const authSubtotal = serverTotals.subtotal - serverTotals.discount;
    const authDeliveryFee = serverTotals.deliveryFee;
    const authTotal = serverTotals.total;
    const orderItems = serverTotals.items.map((it) => ({
      name: it.name,
      quantity: it.quantity,
      unitPrice: it.price,
    }));

    if (authTotal <= 0) {
      res.status(400).json({ error: 'Order total must be greater than zero' });
      return;
    }

    const paypalOrder = await createPayPalOrder({
      items: orderItems,
      subtotal: Math.round(authSubtotal * 100) / 100,
      deliveryFee: authDeliveryFee,
      total: authTotal,
      customerName: customer.name,
      customerEmail: customer.email,
      shippingAddress: shipping
        ? {
            address: shipping.address,
            city: shipping.city,
            state: shipping.state,
            postcode: shipping.postcode,
            country: shipping.country || 'AU',
          }
        : undefined,
    });

    console.log(`📦 Order created for ${customer.email}: PayPal ID ${paypalOrder.id} | Total: $${authTotal} AUD`);

    res.json({
      paypalOrderId: paypalOrder.id,
      status: paypalOrder.status,
      authoritativeTotal: authTotal,
    });
  } catch (error: any) {
    console.error('❌ Create order error:', error.message);
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});

/**
 * POST /api/paypal/capture-order
 * Called AFTER customer approves payment — CAPTURES REAL MONEY and saves to SQLite
 */
router.post('/capture-order', async (req: Request, res: Response) => {
  try {
    const {
      paypalOrderId,
      customer,
      items,
      subtotal,
      deliveryFee,
      gstTotal,
      total,
      deliveryMethod,
      ndisNumber,
      deliveryNotes,
    } = req.body;

    if (!paypalOrderId) {
      res.status(400).json({ error: 'PayPal order ID is required' });
      return;
    }

    // ========================================
    // IDEMPOTENCY CHECK — prevent duplicate captures
    // ========================================
    const existingOrder = dbGet('SELECT id, status, payment_status FROM orders WHERE paypal_order_id = ?', [paypalOrderId]);
    if (existingOrder) {
      console.log(`♻️ Idempotent capture: order ${existingOrder.id} already exists for PayPal ${paypalOrderId}`);
      res.json({
        success: true,
        order: {
          orderId: existingOrder.id,
          paypalOrderId,
          status: existingOrder.status,
          paymentStatus: existingOrder.payment_status,
        },
      });
      return;
    }

    // ========================================
    // 1. CAPTURE THE PAYMENT — REAL MONEY NOW
    // ========================================
    const captureResult = await capturePayPalOrder(paypalOrderId);

    if (captureResult.status !== 'COMPLETED') {
      console.warn(`⚠️ Payment capture status: ${captureResult.status}`);
      res.status(400).json({
        error: `Payment was not completed. Status: ${captureResult.status}`,
        status: captureResult.status,
      });
      return;
    }

    // ========================================
    // 2. SERVER-AUTHORITATIVE TOTALS — recompute from the catalogue and
    // cross-check against what PayPal actually captured. Client-supplied
    // amounts are never trusted for money records.
    // ========================================
    const { calculateCart } = await import('./cart.js');
    const serverTotals = calculateCart(items || [], deliveryMethod, (req.body as any).promoCode);
    if (serverTotals.items.length === 0) {
      res.status(400).json({ error: 'No valid purchasable items in this order.' });
      return;
    }
    const capturedAmount = Number(captureResult.amount) || 0;
    if (captureResult.currency && captureResult.currency !== 'AUD') {
      res.status(400).json({ error: `Unsupported capture currency: ${captureResult.currency}` });
      return;
    }
    if (Math.abs(capturedAmount - serverTotals.total) > 0.05) {
      console.warn(`⚠️ Capture amount mismatch for PayPal ${paypalOrderId}: captured ${capturedAmount} vs server ${serverTotals.total}`);
      res.status(400).json({
        error: 'Captured payment does not match the order total. Please retry checkout.',
      });
      return;
    }
    const orderSubtotal = serverTotals.subtotal;
    const orderDeliveryFee = serverTotals.deliveryFee;
    const orderGstTotal = serverTotals.gstTotal;
    const orderTotal = serverTotals.total;
    const orderItems = serverTotals.items;
    const orderId = `ATS-${Math.floor(100000 + Math.random() * 900000)}`;
    const trackingNumber = `AUSPOST-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const shippingAddress = customer
      ? `${customer.address || ''}, ${customer.city || ''} ${customer.state || ''} ${customer.postcode || ''}`
      : '';

    let paymentMethodDesc = 'PayPal';
    if (captureResult.payerEmail) {
      paymentMethodDesc = `PayPal (${captureResult.payerEmail})`;
    }

    // Upsert customer
    let customerId = '';
    if (customer?.email) {
      const existingCustomer = dbGet('SELECT id, orders_count, total_spent FROM customers WHERE email = ?', [customer.email]);

      if (existingCustomer) {
        customerId = existingCustomer.id as string;
        dbRun(`UPDATE customers 
           SET name = ?, phone = ?, address = ?, city = ?, state = ?, postcode = ?,
               ndis_number = COALESCE(NULLIF(?, ''), ndis_number),
               orders_count = orders_count + 1,
               total_spent = total_spent + ?
           WHERE id = ?`,
          [
            customer.name,
            customer.phone || '',
            customer.address || '',
            customer.city || '',
            customer.state || '',
            customer.postcode || '',
            ndisNumber || '',
            orderTotal,
            customerId,
          ]);
      } else {
        customerId = `CUST-${uuidv4().substring(0, 8).toUpperCase()}`;
        dbRun(`INSERT INTO customers (id, name, email, phone, address, city, state, postcode, ndis_number, orders_count, total_spent)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
          [
            customerId,
            customer.name,
            customer.email,
            customer.phone || '',
            customer.address || '',
            customer.city || '',
            customer.state || '',
            customer.postcode || '',
            ndisNumber || '',
            orderTotal,
          ]);
      }
    }

    // Insert order
    dbRun(`INSERT INTO orders (id, customer_id, customer_name, customer_email, customer_phone,
        shipping_address, delivery_method, delivery_notes,
        subtotal, delivery_fee, gst_total, total,
        status, payment_status, payment_method,
        paypal_order_id, paypal_capture_id, paypal_payer_id, paypal_payer_email,
        tracking_number, ndis_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', 'paid', ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        customerId,
        customer?.name || '',
        customer?.email || '',
        customer?.phone || '',
        shippingAddress,
        deliveryMethod || 'standard',
        deliveryNotes || '',
        orderSubtotal,
        orderDeliveryFee,
        orderGstTotal,
        orderTotal,
        paymentMethodDesc,
        captureResult.paypalOrderId,
        captureResult.captureId,
        captureResult.payerId,
        captureResult.payerEmail,
        trackingNumber,
        ndisNumber || '',
        `Payment captured: ${captureResult.amount} ${captureResult.currency}`,
      ]);

    // Insert order items
    for (const item of orderItems) {
        dbRun(`INSERT INTO order_items (order_id, product_id, name, quantity, price, purchase_type, hire_weeks, gst_type, gst_rate, delivery_fee, detail, selected_extras)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.code || item.sku || item.id || item.productId || '',
            item.name,
            item.quantity,
            item.price,
            item.purchaseType || 'buy',
            item.hireWeeks || 0,
            item.gstType || 'gst-free',
            item.gstRate || 0,
            item.deliveryFee || 0,
            item.detail || '',
            item.selectedExtras ? JSON.stringify(item.selectedExtras) : '',
          ]);
    }

    // Insert payment log
    dbRun(`INSERT INTO payment_logs (order_id, paypal_order_id, paypal_capture_id, amount, currency, status, payer_email, payer_id, raw_response)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        captureResult.paypalOrderId,
        captureResult.captureId,
        parseFloat(captureResult.amount),
        captureResult.currency,
        captureResult.status,
        captureResult.payerEmail,
        captureResult.payerId,
        JSON.stringify(captureResult.rawResponse),
      ]);

    // Ensure everything is saved to disk
    saveDb();

    console.log(`✅ Order ${orderId} saved to database | Payment: ${captureResult.captureId} | Amount: $${captureResult.amount} AUD`);

    // Dispatch automated transactional emails (Customer Tax Invoice + Admin Alert)
    try {
      await dispatchOrderConfirmationEmails({
        orderId,
        customerName: customer?.name || 'Valued Customer',
        customerEmail: customer?.email || '',
        customerPhone: customer?.phone || '',
        shippingAddress,
        items: orderItems,
        subtotal: orderSubtotal,
        deliveryFee: orderDeliveryFee,
        gstTotal: orderGstTotal,
        total: orderTotal,
        paymentMethod: paymentMethodDesc,
        trackingNumber,
      });
      console.log(`📧 Order emails dispatched for ${orderId} to ${customer?.email} and admin`);
    } catch (mailErr: any) {
      console.warn(`⚠️ Failed to dispatch order emails for ${orderId}:`, mailErr.message);
    }

    // ========================================
    // 3. RETURN SUCCESS RESPONSE TO FRONTEND
    // ========================================
    res.json({
      success: true,
      order: {
        orderId,
        customerId,
        paypalOrderId: captureResult.paypalOrderId,
        paypalCaptureId: captureResult.captureId,
        paypalPayerId: captureResult.payerId,
        paypalPayerEmail: captureResult.payerEmail,
        amount: captureResult.amount,
        currency: captureResult.currency,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentMethod: paymentMethodDesc,
        trackingNumber,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error('❌ Capture order error:', error.message);
    res.status(500).json({
      error: 'Payment processing failed. If money was deducted, it will be refunded automatically.',
      details: error.message,
    });
  }
});

export default router;
