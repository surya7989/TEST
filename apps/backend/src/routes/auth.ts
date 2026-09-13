import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dbGet, dbRun } from '../db/database.js';
import { getDb } from '../db/database.js';

// Load env before resolving secrets: route modules evaluate before index.ts
// body runs, so dotenv must be initialized here (works from src/ and dist/).
const __authFile = fileURLToPath(import.meta.url);
const __authDir = path.dirname(__authFile);
dotenv.config({ path: path.resolve(__authDir, '../../.env') });
dotenv.config({ path: path.resolve(__authDir, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const router = Router();

// Never ship a hardcoded JWT secret: prefer env, otherwise generate an
// ephemeral development secret (sessions reset on restart — set JWT_SECRET
// properly in production).
function resolveJwtSecret(): string {
  const fromEnv = (process.env.JWT_SECRET || '').trim();
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  const ephemeral = crypto.randomBytes(48).toString('hex');
  console.warn('⚠️ JWT_SECRET is missing or too short — using an ephemeral development secret. ' +
    'Set a strong JWT_SECRET environment variable for production.');
  return ephemeral;
}
const JWT_SECRET = resolveJwtSecret();
export function getJwtSecret(): string {
  return JWT_SECRET;
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  try {
    const user = jwt.verify(header.slice(7), JWT_SECRET) as any;
    if (user.role !== 'admin') {
      res.status(403).json({ success: false, error: 'Forbidden: administrators only' });
      return;
    }
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Unauthorized' });
  }
}

// Default initial admin credentials
const ADMIN_EMAIL = 'admin@atspecialists.com.au';
// BCrypt hash of Admin@2026!ChangeMe
const ADMIN_PASSWORD_HASH = '$2a$10$njU9RrmTN4RSsYN17TuWYe1knVwm/Wp0..E9EN5AEqgXiBNJbuNzu';

/**
 * POST /api/auth/login (Admin Login)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!normalizedEmail || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    // Check admin credentials (bcrypt hash only — no plaintext comparison)
    if (normalizedEmail === ADMIN_EMAIL && await bcrypt.compare(password || '', ADMIN_PASSWORD_HASH)) {
      const token = jwt.sign({ id: 1, email: ADMIN_EMAIL, name: 'Clinical Administrator', role: 'admin' },
        JWT_SECRET,
        { expiresIn: '7d' });

      res.json({
        success: true,
        token,
        user: {
          id: 1,
          name: 'Clinical Administrator',
          email: ADMIN_EMAIL,
          role: 'admin',
        },
      });
      return;
    }

    res.status(401).json({ success: false, error: 'Invalid email or password.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Authentication failed' });
  }
});

/**
 * POST /api/auth/customer-login
 */
router.post('/customer-login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!normalizedEmail || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required.' });
      return;
    }

    const customer = dbGet('SELECT * FROM customers WHERE email = ?', [normalizedEmail]);
    if (!customer?.password_hash || !(await bcrypt.compare(password, customer.password_hash))) {
      res.status(401).json({ success: false, error: 'Invalid customer credentials.' });
      return;
    }
    // Customer sessions stay valid until explicit sign-out (30 days)
    const token = jwt.sign({ id: customer.id, email: normalizedEmail, name: customer.name, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '30d' });

    res.json({
      success: true,
      token,
      user: {
        id: customer.id,
        name: customer.name,
        email: normalizedEmail,
        role: 'customer',
        hasPassword: true,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/customer-register
 */
router.post('/customer-register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, ndisNumber, planType } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    const trimmedName = (name || '').trim();

    if (!trimmedName || !normalizedEmail || !password) {
      res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      res.status(400).json({ success: false, error: 'Valid email address is required.' });
      return;
    }
    if (String(password).length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
      return;
    }

    const id = `CUST-${crypto.randomUUID()}`;
    if (dbGet('SELECT * FROM customers WHERE email = ?', [normalizedEmail])) {
      res.status(409).json({ success: false, error: 'An account with this email address already exists.' });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const b = req.body as any;
    dbRun('INSERT INTO customers (id, name, email, phone, address, city, state, postcode, ndis_number, orders_count, total_spent, password_hash, password_set) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, trimmedName, normalizedEmail, phone || '', b.address || '', b.city || '', b.state || '', b.postcode || '', ndisNumber || '', 0, 0, passwordHash, 1]);
    const token = jwt.sign({ id, email: normalizedEmail, name: trimmedName, role: 'customer' },
      JWT_SECRET,
      { expiresIn: '30d' });

    res.status(201).json({
      success: true,
      token,
      user: {
        id,
        name: trimmedName,
        email: normalizedEmail,
        phone: phone || '',
        address: b.address || '',
        city: b.city || '',
        state: b.state || '',
        postcode: b.postcode || '',
        ndisNumber: ndisNumber || '',
        planManager: b.planManager || '',
        planManagerEmail: b.planManagerEmail || '',
        planType: planType || 'plan_managed',
        role: 'customer',
        hasPassword: true,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/customer-order-session (dev-backend mirror of the PHP API)
 * Links a completed checkout to a customer record. Never mints a session for
 * an email that already has a user-chosen password.
 */
router.post('/customer-order-session', async (req: Request, res: Response) => {
  try {
    const b = req.body as any;
    const normalizedEmail = String(b.email || '').toLowerCase().trim();
    const name = String(b.name || '').trim();
    if (!normalizedEmail || !name || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      res.status(400).json({ success: false, error: 'Name and a valid email are required.' });
      return;
    }
    const existing = dbGet('SELECT * FROM customers WHERE email = ?', [normalizedEmail]);
    const existingFlag = (existing as any)?.password_set;
    const hasRealPassword = existing && (Number(existingFlag) === 1 || (existingFlag === undefined && !!(existing as any)?.password_hash));
    if (hasRealPassword) {
      res.status(409).json({ success: false, error: 'An account with this email already exists. Please sign in to link your order.', code: 'ACCOUNT_EXISTS_SIGN_IN' });
      return;
    }
    const id = (existing as any)?.id || `CUST-${crypto.randomUUID()}`;
    if (!existing) {
      dbRun('INSERT INTO customers (id, name, email, phone, address, city, state, postcode, ndis_number, orders_count, total_spent, password_hash, password_set) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, name, normalizedEmail, b.phone || '', b.address || '', b.city || '', b.state || 'VIC', b.postcode || '', b.ndisNumber || '', 1, 0, await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10), 0]);
    }
    const token = jwt.sign({ id, email: normalizedEmail, name, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      success: true,
      token,
      isNewAccount: !existing,
      user: {
        id,
        name,
        email: normalizedEmail,
        phone: b.phone || '',
        address: b.address || '',
        city: b.city || '',
        state: b.state || 'VIC',
        postcode: b.postcode || '',
        ndisNumber: b.ndisNumber || '',
        planType: b.planType || 'plan_managed',
        planManager: b.planManager || '',
        planManagerEmail: b.planManagerEmail || '',
        hasPassword: false,
        role: 'customer',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/auth/set-password (dev-backend mirror of the PHP API)
 * Activates a checkout-created account. Ownership proven by a live customer
 * JWT for the same email, or by a completed order id owned by that email.
 */
router.post('/set-password', async (req: Request, res: Response) => {
  try {
    const b = req.body as any;
    const normalizedEmail = String(b.email || '').toLowerCase().trim();
    const password = String(b.password || '');
    const orderRef = String(b.orderId || b.quoteId || '').trim();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      res.status(400).json({ success: false, error: 'Valid email address is required.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ success: false, error: 'Password must be between 8 and 128 characters.' });
      return;
    }
    let authed = false;
    const header = req.headers.authorization || '';
    if (header.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(header.slice(7), JWT_SECRET) as any;
        if (String(decoded.email || '').toLowerCase() === normalizedEmail && decoded.role === 'customer') authed = true;
      } catch { /* invalid token */ }
    }
    if (!authed && orderRef) {
      const order = dbGet('SELECT * FROM orders WHERE id = ? AND LOWER(customer_email) = ?', [orderRef, normalizedEmail]);
      if (order) {
        authed = true;
      } else {
        // Dev quotes live in the JSON store (not the SQL mock)
        try {
          const quotes = ((getDb() as any).quotes || []) as any[];
          if (quotes.some((q) => String(q.id) === orderRef && String(q.customerEmail || '').toLowerCase() === normalizedEmail)) {
            authed = true;
          }
        } catch { /* ignore */ }
      }
    }
    if (!authed) {
      res.status(403).json({ success: false, error: 'Could not verify account ownership. Please sign in or provide your order reference.', code: 'PROOF_REQUIRED' });
      return;
    }
    const customer = dbGet('SELECT * FROM customers WHERE email = ?', [normalizedEmail]);
    if (!customer) {
      res.status(404).json({ success: false, error: 'Account not found.' });
      return;
    }
    const alreadyFlag = (customer as any).password_set;
    const alreadySet = alreadyFlag === undefined ? !!(customer as any).password_hash : Number(alreadyFlag) === 1;
    if (alreadySet) {
      res.status(409).json({ success: false, error: 'A password is already set for this account. Please sign in instead.', code: 'ALREADY_SET' });
      return;
    }
    dbRun('UPDATE customers SET password_hash = ?, password_set = ? WHERE id = ?', [await bcrypt.hash(password, 12), 1, (customer as any).id]);
    const token = jwt.sign({ id: (customer as any).id, email: normalizedEmail, name: (customer as any).name, role: 'customer' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ success: true, token, user: { id: (customer as any).id, name: (customer as any).name, email: normalizedEmail, hasPassword: true, role: 'customer' } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded?.role === 'customer' && decoded?.email) {
      try {
        const customer = dbGet('SELECT * FROM customers WHERE email = ?', [String(decoded.email).toLowerCase()]);
        if (customer) {
          const flag = (customer as any).password_set;
          (decoded as any).hasPassword = flag === undefined ? !!(customer as any).password_hash : Number(flag) === 1;
        }
      } catch { /* keep token payload as-is */ }
    }
    res.json({ success: true, user: decoded });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

export default router;
