/**
 * Lightweight Store for AT Specialists Backend
 * 
 * Simple, fast, zero-dependency persistence store matching the Hostinger MySQL schema.
 * Replaces heavy sql.js / SQLite3 compilation overhead with native JSON storage.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../../data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  ndis_number?: string;
  orders_count?: number;
  total_spent?: number;
  password_hash?: string;
  password_set?: number;
  created_at?: string;
}

export interface OrderItemRecord {
  id?: number;
  order_id: string;
  product_id: string;
  name: string;
  detail?: string;
  selected_extras?: string;
  quantity: number;
  price: number;
  purchase_type?: string;
  hire_weeks?: number;
  gst_type?: string;
  gst_rate?: number;
  delivery_fee?: number;
}

export interface OrderRecord {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  shipping_address?: string;
  delivery_method?: string;
  delivery_notes?: string;
  subtotal: number;
  delivery_fee?: number;
  gst_total?: number;
  total: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  paypal_order_id?: string;
  paypal_capture_id?: string;
  paypal_payer_id?: string;
  paypal_payer_email?: string;
  tracking_number?: string;
  ndis_number?: string;
  notes?: string;
  created_at?: string;
}

export interface PaymentLogRecord {
  id?: number;
  order_id: string;
  paypal_order_id?: string;
  paypal_capture_id?: string;
  amount: number;
  currency?: string;
  status: string;
  payer_email?: string;
  payer_id?: string;
  raw_response?: string;
  created_at?: string;
}

export interface AppStore {
  customers: CustomerRecord[];
  orders: OrderRecord[];
  order_items: OrderItemRecord[];
  payment_logs: PaymentLogRecord[];
  products: any[];
  categories: any[];
  quotes: any[];
  inquiries: any[];
  reviews: any[];
  promotions: any[];
}

let store: AppStore = {
  customers: [],
  orders: [],
  order_items: [],
  payment_logs: [],
  products: [],
  categories: [],
  quotes: [],
  inquiries: [],
  reviews: [],
  promotions: [],
};

/**
 * Initialize store from disk or create default
 */
export async function initDb(): Promise<AppStore> {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf-8');
      const loaded = JSON.parse(raw);
      store = {
        customers: loaded.customers || [],
        orders: loaded.orders || [],
        order_items: loaded.order_items || [],
        payment_logs: loaded.payment_logs || [],
        products: loaded.products || [],
        categories: loaded.categories || [],
        quotes: loaded.quotes || [],
        inquiries: loaded.inquiries || [],
        reviews: loaded.reviews || [],
        promotions: loaded.promotions || [],
      };
      console.log(`✅ Lightweight store loaded from: ${STORE_PATH}`);
    } else {
      store = {
        customers: [],
        orders: [],
        order_items: [],
        payment_logs: [],
        products: [],
        categories: [],
        quotes: [],
        inquiries: [],
        reviews: [],
        promotions: [],
      };
      saveDb();
      console.log(`✅ Initialized new store at: ${STORE_PATH}`);
    }
  } catch (err) {
    console.warn('Store init warning (using in-memory default):', err);
    store = {
      customers: [],
      orders: [],
      order_items: [],
      payment_logs: [],
      products: [],
      categories: [],
      quotes: [],
      inquiries: [],
      reviews: [],
      promotions: [],
    };
  }
  return store;
}

/**
 * Persist store to disk
 */
export function saveDb(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save store to disk:', err);
  }
}

/**
 * Get direct reference to store
 */
export function getDb(): AppStore {
  return store;
}

/**
 * Query runner for SQL-like commands (dbAll)
 */
export function dbAll(sql: string, params: any[] = []): any[] {
  const query = sql.trim().toLowerCase().replace(/\s+/g, ' ');

  // 1. SELECT * FROM orders
  if (query.startsWith('select * from orders')) {
    if ((query.includes('where id = ? and lower(customer_email) = ?') || query.includes('where id=? and lower(customer_email)=?'))) {
      const [id, email] = params;
      return store.orders.filter((o) => o.id === id && String(o.customer_email || '').toLowerCase() === String(email).toLowerCase());
    }
    if (query.includes('where id = ?') || query.includes('where id=?')) {
      const id = params[0];
      return store.orders.filter((o) => o.id === id);
    }
    if (query.includes('where customer_id = ?') || query.includes('where customer_id=?')) {
      const custId = params[0];
      return store.orders.filter((o) => o.customer_id === custId);
    }
    return [...store.orders].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  // 2. SELECT * FROM order_items
  if (query.startsWith('select * from order_items')) {
    if (query.includes('where order_id = ?') || query.includes('where order_id=?')) {
      const orderId = params[0];
      return store.order_items.filter((item) => item.order_id === orderId);
    }
    return [...store.order_items];
  }

  // 3. SELECT * FROM payment_logs
  if (query.startsWith('select * from payment_logs')) {
    if (query.includes('where order_id = ?') || query.includes('where order_id=?')) {
      const orderId = params[0];
      return store.payment_logs.filter((log) => log.order_id === orderId);
    }
    return [...store.payment_logs];
  }

  // 4. SELECT * FROM customers
  if (query.startsWith('select * from customers')) {
    if (query.includes('where id = ?') || query.includes('where id=?')) {
      const id = params[0];
      return store.customers.filter((c) => c.id === id);
    }
    if (query.includes('where email = ?') || query.includes('where email=?')) {
      const email = params[0];
      return store.customers.filter((c) => c.email.toLowerCase() === String(email).toLowerCase());
    }
    return [...store.customers].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
  }

  return [];
}

/**
 * Query runner returning a single row (dbGet)
 */
export function dbGet(sql: string, params: any[] = []): any | undefined {
  const rows = dbAll(sql, params);
  return rows.length > 0 ? rows[0] : undefined;
}

/**
 * Execute statement (INSERT / UPDATE / DELETE) (dbRun)
 */
export function dbRun(sql: string, params: any[] = []): void {
  const query = sql.trim().toLowerCase().replace(/\s+/g, ' ');

  // 1. INSERT INTO customers
  if (query.startsWith('insert or replace into customers') || query.startsWith('insert into customers')) {
    // Expected params: [id, name, email, phone, address, city, state, postcode, ndis_number, orders_count, total_spent]
    const [id, name, email, phone, address, city, state, postcode, ndis_number, orders_count, total_spent, password_hash, password_set] = params;
    const existingIdx = store.customers.findIndex((c) => c.id === id || c.email.toLowerCase() === String(email).toLowerCase());
    const customerRecord: CustomerRecord = {
      id: id || `CUST-${Date.now()}`,
      name: name || '',
      email: email || '',
      phone: phone || '',
      address: address || '',
      city: city || '',
      state: state || '',
      postcode: postcode || '',
      ndis_number: ndis_number || '',
      orders_count: orders_count || 1,
      total_spent: total_spent || 0,
      ...(password_hash ? { password_hash: String(password_hash) } : {}),
      ...(password_set !== undefined ? { password_set: Number(password_set) } : {}),
      created_at: new Date().toISOString(),
    };
    if (existingIdx >= 0) {
      store.customers[existingIdx] = {...store.customers[existingIdx],...customerRecord };
    } else {
      store.customers.push(customerRecord);
    }
    saveDb();
    return;
  }

  // 2. INSERT INTO orders
  if (query.startsWith('insert into orders') || query.startsWith('insert or replace into orders')) {
    // Expected params: [id, customer_id, customer_name, customer_email, customer_phone, shipping_address, delivery_method, delivery_notes, subtotal, delivery_fee, gst_total, total, status, payment_status, payment_method, paypal_order_id, paypal_capture_id, paypal_payer_id, paypal_payer_email, tracking_number, ndis_number, notes]
    const [
      id,
      customer_id,
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      delivery_method,
      delivery_notes,
      subtotal,
      delivery_fee,
      gst_total,
      total,
      status,
      payment_status,
      payment_method,
      paypal_order_id,
      paypal_capture_id,
      paypal_payer_id,
      paypal_payer_email,
      tracking_number,
      ndis_number,
      notes,
    ] = params;

    const orderRecord: OrderRecord = {
      id,
      customer_id,
      customer_name,
      customer_email,
      customer_phone: customer_phone || '',
      shipping_address: shipping_address || '',
      delivery_method: delivery_method || 'standard',
      delivery_notes: delivery_notes || '',
      subtotal: Number(subtotal || 0),
      delivery_fee: Number(delivery_fee || 0),
      gst_total: Number(gst_total || 0),
      total: Number(total || 0),
      status: status || 'confirmed',
      payment_status: payment_status || 'paid',
      payment_method: payment_method || 'paypal',
      paypal_order_id: paypal_order_id || '',
      paypal_capture_id: paypal_capture_id || '',
      paypal_payer_id: paypal_payer_id || '',
      paypal_payer_email: paypal_payer_email || '',
      tracking_number: tracking_number || '',
      ndis_number: ndis_number || '',
      notes: notes || '',
      created_at: new Date().toISOString(),
    };

    const existingIdx = store.orders.findIndex((o) => o.id === id);
    if (existingIdx >= 0) {
      store.orders[existingIdx] = orderRecord;
    } else {
      store.orders.unshift(orderRecord);
    }
    saveDb();
    return;
  }

  // 3. INSERT INTO order_items
  if (query.startsWith('insert into order_items')) {
    // Expected params: [order_id, product_id, name, quantity, price, purchase_type, hire_weeks, gst_type, gst_rate, delivery_fee, detail?, selected_extras?]
    const [order_id, product_id, name, quantity, price, purchase_type, hire_weeks, gst_type, gst_rate, delivery_fee, detail, selected_extras] = params;
    store.order_items.push({
      id: store.order_items.length + 1,
      order_id,
      product_id: product_id || `EQ-${Date.now()}`,
      name: name || '',
      detail: detail || '',
      selected_extras: selected_extras ? (typeof selected_extras === 'string' ? selected_extras : JSON.stringify(selected_extras)) : '',
      quantity: Number(quantity || 1),
      price: Number(price || 0),
      purchase_type: purchase_type || 'buy',
      hire_weeks: Number(hire_weeks || 0),
      gst_type: gst_type || 'standard',
      gst_rate: Number(gst_rate || 0),
      delivery_fee: Number(delivery_fee || 0),
    });
    saveDb();
    return;
  }

  // 4. INSERT INTO payment_logs
  if (query.startsWith('insert into payment_logs')) {
    // Expected params: [order_id, paypal_order_id, paypal_capture_id, amount, currency, status, payer_email, payer_id, raw_response]
    const [order_id, paypal_order_id, paypal_capture_id, amount, currency, status, payer_email, payer_id, raw_response] = params;
    store.payment_logs.push({
      id: store.payment_logs.length + 1,
      order_id,
      paypal_order_id: paypal_order_id || '',
      paypal_capture_id: paypal_capture_id || '',
      amount: Number(amount || 0),
      currency: currency || 'AUD',
      status: status || 'COMPLETED',
      payer_email: payer_email || '',
      payer_id: payer_id || '',
      raw_response: raw_response || '',
      created_at: new Date().toISOString(),
    });
    saveDb();
    return;
  }

  // 5. UPDATE orders SET status =..., payment_status =... WHERE id =...
  if (query.startsWith('update orders')) {
    if (query.includes('status = ?, payment_status = ? where id = ?')) {
      const [status, paymentStatus, orderId] = params;
      const order = store.orders.find((o) => o.id === orderId);
      if (order) {
        order.status = status;
        order.payment_status = paymentStatus;
        saveDb();
      }
      return;
    }

    if (query.includes('status = ? where id = ?')) {
      const [status, orderId] = params;
      const order = store.orders.find((o) => o.id === orderId);
      if (order) {
        order.status = status;
        saveDb();
      }
      return;
    }

    if (query.includes('tracking_number = ? where id = ?')) {
      const [trackingNumber, orderId] = params;
      const order = store.orders.find((o) => o.id === orderId);
      if (order) {
        order.tracking_number = trackingNumber;
        saveDb();
      }
      return;
    }
  }

  // 6. UPDATE customers
  if (query.startsWith('update customers')) {
    if (query.includes('set password_hash = ?') && query.includes('where id = ?')) {
      const [passwordHash, passwordSet, customerId] = params;
      const cust = store.customers.find((c) => c.id === customerId);
      if (cust) {
        cust.password_hash = String(passwordHash);
        cust.password_set = Number(passwordSet);
        saveDb();
      }
      return;
    }
    if (query.includes('name = ?, phone = ?, address = ?, city = ?, state = ?, postcode = ?') && query.includes('where id = ?')) {
      const [name, phone, address, city, state, postcode, ndisNumber, amount, customerId] = params;
      const cust = store.customers.find((c) => c.id === customerId);
      if (cust) {
        cust.name = name || cust.name;
        cust.phone = phone || '';
        cust.address = address || '';
        cust.city = city || '';
        cust.state = state || '';
        cust.postcode = postcode || '';
        if (ndisNumber) cust.ndis_number = ndisNumber;
        cust.orders_count = (cust.orders_count || 0) + 1;
        cust.total_spent = (cust.total_spent || 0) + Number(amount || 0);
        saveDb();
      }
      return;
    }
    if (query.includes('orders_count = orders_count + 1, total_spent = total_spent + ? where id = ?')) {
      const [amount, customerId] = params;
      const cust = store.customers.find((c) => c.id === customerId);
      if (cust) {
        cust.orders_count = (cust.orders_count || 0) + 1;
        cust.total_spent = (cust.total_spent || 0) + Number(amount || 0);
        saveDb();
      }
      return;
    }
  }
}

/**
 * Close store (noop for JSON store)
 */
export function closeDb(): void {
  saveDb();
}
