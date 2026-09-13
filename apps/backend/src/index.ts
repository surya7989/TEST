/**
 * AT Specialists Unified Single-Server
 * 
 * Express server serving:
 * - Full React Frontend Application (Storefront + Admin Panel)
 * - Complete REST API v2 (/api/*): PayPal, Orders, Customers, Invoices, NDIS Quotes, Emails
 * - Lightweight zero-dependency persistence store matching Hostinger MySQL schema
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDb, closeDb } from './db/database.js';
import authRoutes from './routes/auth.js';
import productsRoutes from './routes/products.js';
import cartRoutes from './routes/cart.js';
import paypalRoutes from './routes/paypal.js';
import ordersRoutes from './routes/orders.js';
import customersRoutes from './routes/customers.js';
import quotesRoutes from './routes/quotes.js';
import inquiriesRoutes from './routes/inquiries.js';
import settingsRoutes from './routes/settings.js';
import reviewsRoutes from './routes/reviews.js';
import promotionsRoutes from './routes/promotions.js';
import emailsRoutes from './routes/emails.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load unified root environment variables (.env)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// ========================================
// 1. MIDDLEWARE
// ========================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Allows React frontend scripts, styles, and PayPal SDK
}));

app.use(cors({
  // Never reflect arbitrary origins with credentials: explicit allow-list only
  // (local dev ports + production domains; extend via CORS_ORIGIN env).
  origin: (origin, callback) => {
    const allowed = (process.env.CORS_ORIGIN || 'http://localhost:5173')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const defaults = [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5176',
      'http://127.0.0.1:5176',
      'https://atspecialists.com.au',
      'https://www.atspecialists.com.au',
      'https://api.atspecialists.com.au',
    ];
    if (!origin || allowed.includes(origin) || defaults.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('CORS origin not allowed'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '1mb' }));

// Brute-force protection on sensitive endpoints (login, register, payments, mail)
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/auth', strictLimiter);
app.use('/api/paypal', strictLimiter);
app.use('/api/emails/send-test', strictLimiter);
app.use('/api/emails/dispatch-template', strictLimiter);
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ========================================
// 2. API ROUTES
// ========================================

app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/paypal', paypalRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/invoices', ordersRoutes); // Alias
app.use('/api/customers', customersRoutes);
app.use('/api/quotes', quotesRoutes);
app.use('/api/inquiries', inquiriesRoutes);
app.use('/api/contact', inquiriesRoutes); // Alias
app.use('/api/settings', settingsRoutes);
app.use('/api/reviews', reviewsRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/emails', emailsRoutes);

// Direct document & PDF viewer aliases
app.use('/api/documents', emailsRoutes);
app.get('/api/document/:docId', (req: express.Request, res: express.Response) => {
  res.redirect(`/api/emails/document/${encodeURIComponent(req.params.docId)}`);
});
app.get('/api/pdf/:docId', (req: express.Request, res: express.Response) => {
  res.redirect(`/api/emails/pdf/${encodeURIComponent(req.params.docId)}`);
});

// Admin section endpoints (Rentals, Shipping, Analytics)
// (Reviews & Promotions are served by their routers above.)
app.get('/api/rentals', (_req: express.Request, res: express.Response) => {
  res.json({ success: true, rentals: [] });
});
app.get('/api/shipping', (_req: express.Request, res: express.Response) => {
  res.json({ success: true, zones: [] });
});
app.get('/api/analytics', (_req: express.Request, res: express.Response) => {
  res.json({ success: true, metrics: { revenue: 0, orders: 0, customers: 0 } });
});

// Root API Endpoint & Health check (`/api`, `/api/`, `/api/health`)
app.all(['/api', '/api/', '/api/health'], (_req: express.Request, res: express.Response) => {
  res.json({
    status: 'ok',
    service: 'AT Specialists Unified Server (Frontend + Backend API)',
    timestamp: new Date().toISOString(),
    store: 'Hostinger Schema Aligned',
    paypalMode: process.env.PAYPAL_MODE || 'sandbox',
    availableEndpoints: [
      '/api/health',
      '/api/products',
      '/api/orders',
      '/api/quotes',
      '/api/inquiries',
      '/api/customers',
      '/api/settings',
      '/api/emails',
      '/api/paypal',
      '/api/cart',
      '/api/auth',
      '/api/documents'
    ],
  });
});

// ========================================
// 3. FRONTEND STATIC SERVING (SINGLE SERVER)
// ========================================

const frontendDistCandidates = [
  path.resolve(__dirname, '../../frontend/dist'),
  path.resolve(__dirname, '../../../apps/frontend/dist'),
  path.resolve(process.cwd(), 'apps/frontend/dist'),
  path.resolve(process.cwd(), 'dist'),
];

const frontendDist = frontendDistCandidates.find((dir) => fs.existsSync(dir));

if (frontendDist) {
  app.use(express.static(frontendDist));
  
  // SPA Fallback for all non-API routes
  app.get('*', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.resolve(frontendDist, 'index.html'));
  });
}

// 404 Handler for unmatched API routes
app.all(['/api', '/api/*', '/api/**'], (req: express.Request, res: express.Response) => {
  console.warn(`[404] Unmatched API route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    error: 'API route not found',
    method: req.method,
    path: req.originalUrl,
    message: `The requested endpoint '${req.originalUrl}' does not exist on this server.`
  });
});

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err && String(err.message || '').toLowerCase().includes('cors')) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  console.error('Unhandled server error:', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

// ========================================
// 4. START SERVER
// ========================================

async function start() {
  // Initialize lightweight store
  await initDb();

  const HOST = process.env.HOST || '0.0.0.0';
  const server = app.listen(PORT, HOST, () => {
    console.log('');
    console.log('======================================================');
    console.log(' AT Specialists Unified Server (Frontend & Backend)');
    console.log('======================================================');
    console.log(` 🚀 Single URL: http://127.0.0.1:${PORT}`);
    console.log(` 📦 Frontend: ${frontendDist ? 'Attached (Serving SPA)' : 'Dist building...'}`);
    console.log(` ⚡ API Router: http://127.0.0.1:${PORT}/api/*`);
    console.log(` 💳 PayPal: ${process.env.PAYPAL_MODE || 'sandbox'} mode`);
    console.log('======================================================');
    console.log('');
  });
  // Friendly failure instead of an unhandled crash dump when another
  // instance already owns the port (e.g. two terminals running dev).
  server.on('error', (err: any) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error('');
      console.error(`❌ Port ${PORT} is already in use — another API server is running.`);
      console.error(' Stop the other terminal/process first, then start again.');
      console.error('');
      process.exit(1);
    }
    throw err;
  });
}

start().catch((err) => {
  console.error('Failed to start unified server:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  closeDb();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDb();
  process.exit(0);
});

export default app;
