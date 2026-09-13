/**
 * Customers Routes
 * 
 * GET /api/customers → List all customers
 * GET /api/customers/:id → Get single customer with order history
 */

import { Router, Request, Response } from 'express';
import { dbAll, dbGet } from '../db/database.js';
import { requireAdmin } from './auth.js';

const router = Router();

router.get('/', requireAdmin, (_req: Request, res: Response) => {
  try {
    const rawCustomers = dbAll('SELECT * FROM customers ORDER BY created_at DESC');
    const allOrders = dbAll('SELECT * FROM orders');

    // Aggregate orders by customer email and ID
    const statsByEmail = new Map<string, { count: number; total: number }>();
    const statsById = new Map<string, { count: number; total: number }>();

    for (const o of allOrders) {
      const email = (o.customer_email || '').trim().toLowerCase();
      const cid = o.customer_id;
      const t = parseFloat(o.total || 0);

      if (email) {
        const cur = statsByEmail.get(email) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += t;
        statsByEmail.set(email, cur);
      }
      if (cid) {
        const cur = statsById.get(cid) || { count: 0, total: 0 };
        cur.count += 1;
        cur.total += t;
        statsById.set(cid, cur);
      }
    }

    const registeredEmails = new Set<string>();
    const customers = rawCustomers.map((c: any) => {
      const email = (c.email || '').trim().toLowerCase();
      registeredEmails.add(email);
      const emailStats = statsByEmail.get(email);
      const idStats = statsById.get(c.id);
      const realCount = Math.max(emailStats?.count || 0, idStats?.count || 0, parseInt(c.orders_count ?? 0, 10));
      const realTotal = Math.max(emailStats?.total || 0, idStats?.total || 0, parseFloat(c.total_spent ?? 0));

      return {
        ...c,
        orders_count: realCount,
        total_spent: realTotal,
      };
    });

    // Also include guest orders with unregistered emails
    const guestMap = new Map<string, any>();
    for (const o of allOrders) {
      const email = (o.customer_email || '').trim().toLowerCase();
      if (!email || registeredEmails.has(email)) continue;

      if (!guestMap.has(email)) {
        guestMap.set(email, {
          id: o.customer_id || `GUEST-${o.id}`,
          name: o.customer_name || email.split('@')[0],
          email: email,
          phone: o.customer_phone || '',
          address: o.shipping_address || '',
          city: '',
          state: '',
          postcode: '',
          ndis_number: o.ndis_number || '',
          orders_count: 0,
          total_spent: 0,
          created_at: o.created_at,
          notes: 'Customer from store order checkout',
        });
      }
      const g = guestMap.get(email);
      g.orders_count += 1;
      g.total_spent += parseFloat(o.total || 0);
    }

    for (const guest of guestMap.values()) {
      customers.push(guest);
    }

    res.json({ customers });
  } catch (error: any) {
    console.error('Get customers error:', error.message);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.get('/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    let customer = dbGet('SELECT * FROM customers WHERE id = ?', [req.params.id]);
    if (!customer) {
      // Check if it's a guest order customer ID or email
      const guestOrder = dbGet('SELECT * FROM orders WHERE id = ? OR customer_id = ? LIMIT 1', [req.params.id, req.params.id]);
      if (guestOrder) {
        customer = {
          id: guestOrder.customer_id || `GUEST-${guestOrder.id}`,
          name: guestOrder.customer_name || 'Guest Customer',
          email: guestOrder.customer_email || '',
          phone: guestOrder.customer_phone || '',
          address: guestOrder.shipping_address || '',
          ndis_number: guestOrder.ndis_number || '',
          created_at: guestOrder.created_at,
          orders_count: 1,
          total_spent: parseFloat(guestOrder.total || 0),
        };
      }
    }
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const custEmail = (customer.email || '').trim().toLowerCase();
    const rawOrders = dbAll(
      'SELECT * FROM orders WHERE customer_id = ? OR (customer_email IS NOT NULL AND LOWER(customer_email) = ?) ORDER BY created_at DESC',
      [customer.id, custEmail]
    );

    const orders = rawOrders.map((o: any) => ({
      ...o,
      items: dbAll('SELECT * FROM order_items WHERE order_id = ?', [o.id]),
    }));

    res.json({ customer, orders });
  } catch (error: any) {
    console.error('Get customer error:', error.message);
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

export default router;
