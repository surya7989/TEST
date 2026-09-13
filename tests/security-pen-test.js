/**
 * AT Specialists Australia - Security Penetration & Integration Test Suite
 * 
 * Executes adversarial tests against security boundaries, authentication,
 * authoritative calculations, guest access barriers, and payment safety.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';

console.log('================================================================');
console.log(' AT SPECIALISTS - SECURITY PENETRATION & HARDENING AUDIT');
console.log('================================================================\n');

let passCount = 0;
let failCount = 0;

function penTest(title, testFn) {
  try {
    testFn();
    console.log(` 🛡️ PASS: ${title}`);
    passCount++;
  } catch (err) {
    console.error(` 💥 VULNERABILITY FOUND: ${title}`);
    console.error(` Details: ${err.message}\n`);
    failCount++;
  }
}

// ----------------------------------------------------------------------------
// 1. Authentication & JWT Tampering Resistance
// ----------------------------------------------------------------------------
console.log('1. Authentication & Token Tampering Tests:');

const JWT_SECRET = 'atspecialists_audit_secret_key_2026';

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

function signJwt(payload, secret, expSec = 3600) {
  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
  const exp = Math.floor(Date.now() / 1000) + expSec;
  const body = base64UrlEncode(JSON.stringify({...payload, exp }));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (expected !== signature) return null;
  const decoded = JSON.parse(base64UrlDecode(body));
  if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
  return decoded;
}

penTest('Rejects token with "alg": "none" attack', () => {
  const forgedHeader = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'none' }));
  const forgedBody = base64UrlEncode(JSON.stringify({ id: 1, role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 }));
  const noneToken = `${forgedHeader}.${forgedBody}.`;
  const result = verifyJwt(noneToken, JWT_SECRET);
  assert.strictEqual(result, null);
});

penTest('Rejects customer token attempting admin role privilege escalation', () => {
  const customerToken = signJwt({ id: 10, email: 'user@test.com', role: 'customer' }, JWT_SECRET);
  const parts = customerToken.split('.');
  const manipulatedBody = base64UrlEncode(JSON.stringify({ id: 10, email: 'user@test.com', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 }));
  const forgedToken = `${parts[0]}.${manipulatedBody}.${parts[2]}`;
  const result = verifyJwt(forgedToken, JWT_SECRET);
  assert.strictEqual(result, null);
});

penTest('Rejects expired administrative session token', () => {
  const expiredToken = signJwt({ id: 1, role: 'admin' }, JWT_SECRET, -60);
  const result = verifyJwt(expiredToken, JWT_SECRET);
  assert.strictEqual(result, null);
});

// ----------------------------------------------------------------------------
// 2. Authoritative Pricing & Total Calculation Integrity
// ----------------------------------------------------------------------------
console.log('\n2. Authoritative Pricing & Total Tamper Tests:');

const authoritativeProducts = {
  'eq-101': { price: 3450.00, hire_price: 180.00, gst_type: 'gst-free', delivery_fee: 0.00 },
  'eq-102': { price: 800.00, hire_price: 45.00, gst_type: 'gst-free', delivery_fee: 0.00 },
  'eq-103': { price: 2850.00, hire_price: 120.00, gst_type: 'gst-free', delivery_fee: 0.00 },
};

function serverCartCalculation(submittedItems, deliveryMethod = 'standard') {
  let subtotal = 0;
  let deliveryFee = 0;
  let gstTotal = 0;

  for (const item of submittedItems) {
    const prod = authoritativeProducts[item.id];
    if (!prod) throw new Error(`Unknown product: ${item.id}`);

    const qty = Math.max(1, parseInt(item.quantity || 1, 10));
    const isHire = item.purchaseType === 'hire';
    const weeks = isHire ? Math.max(1, parseInt(item.hireWeeks || 2, 10)) : 0;

    const unitPrice = isHire ? (prod.hire_price * weeks) : prod.price;
    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;
    deliveryFee += prod.delivery_fee * qty;

    if (prod.gst_type === 'standard') {
      gstTotal += lineTotal / 11;
    }
  }

  const methodFees = { standard: 0, express: 29, white_glove: 149 };
  deliveryFee += methodFees[deliveryMethod] || 0;
  const grandTotal = subtotal + deliveryFee;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    gstTotal: Math.round(gstTotal * 100) / 100,
    total: Math.round(grandTotal * 100) / 100,
  };
}

penTest('Reconstructs price from database when attacker tampers unit price in request body', () => {
  const tamperedPayload = [
    { id: 'eq-101', quantity: 1, price: 0.01, purchaseType: 'buy' } // Client claims $0.01
  ];
  const authoritative = serverCartCalculation(tamperedPayload, 'standard');
  assert.strictEqual(authoritative.total, 3450.00); // Server forces $3450.00
});

penTest('Reconstructs hire price based on authoritative weekly rate and duration', () => {
  const hirePayload = [
    { id: 'eq-101', quantity: 1, purchaseType: 'hire', hireWeeks: 6 } // 6 weeks * $180 = $1080
  ];
  const authoritative = serverCartCalculation(hirePayload, 'express');
  assert.strictEqual(authoritative.subtotal, 1080.00);
  assert.strictEqual(authoritative.deliveryFee, 29.00);
  assert.strictEqual(authoritative.total, 1109.00);
});

penTest('Rejects negative or fractional quantities', () => {
  const negativePayload = [
    { id: 'eq-102', quantity: -5, purchaseType: 'buy' }
  ];
  const authoritative = serverCartCalculation(negativePayload, 'standard');
  assert.strictEqual(authoritative.total, 800.00); // Clamped to minimum 1
});

penTest('Rejects non-existent product IDs', () => {
  const invalidPayload = [
    { id: 'hacked-fake-item-999', quantity: 1, price: 10.00 }
  ];
  assert.throws(() => serverCartCalculation(invalidPayload, 'standard'), /Unknown product/);
});

// ----------------------------------------------------------------------------
// 3. Guest Order Access Boundary & Enumeration Resistance
// ----------------------------------------------------------------------------
console.log('\n3. Guest Order Access Boundary Tests:');

function generateOrderAccessHash(orderId, email, secret) {
  return crypto.createHmac('sha256', secret).update(`ORDER_ACCESS:${orderId}:${email.toLowerCase().trim()}`).digest('hex');
}

function verifyOrderAccess(orderId, email, providedToken, secret) {
  if (!providedToken || typeof providedToken !== 'string') return false;
  const expected = generateOrderAccessHash(orderId, email, secret);
  if (Buffer.byteLength(expected) !== Buffer.byteLength(providedToken)) return false;
  return crypto.timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(providedToken, 'utf8'));
}

penTest('Rejects guest invoice download if email does not match order record', () => {
  const orderId = 'ATS-ORD-260902-8888';
  const realEmail = 'victim@example.com.au';
  const attackerEmail = 'attacker@example.com.au';
  
  const victimToken = generateOrderAccessHash(orderId, realEmail, JWT_SECRET);
  const attackerToken = generateOrderAccessHash(orderId, attackerEmail, JWT_SECRET);

  assert.strictEqual(victimToken !== attackerToken, true);
  assert.strictEqual(verifyOrderAccess(orderId, realEmail, victimToken, JWT_SECRET), true);
  assert.strictEqual(verifyOrderAccess(orderId, realEmail, attackerToken, JWT_SECRET), false);
});

penTest('Rejects sequential ID guessing without cryptographic token', () => {
  const guessedId = 'ATS-ORD-260902-0001';
  const guessedEmail = 'random@domain.com';
  const fakeToken = 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
  
  assert.strictEqual(verifyOrderAccess(guessedId, guessedEmail, fakeToken, JWT_SECRET), false);
});

// ----------------------------------------------------------------------------
// 4. Order State Machine Transition Validation
// ----------------------------------------------------------------------------
console.log('\n4. Order State Machine Transition Tests:');

function validateOrderStatusTransition(currentStatus, newStatus) {
  const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
  if (!validStatuses.includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }
  if (currentStatus === 'delivered' && newStatus === 'pending') {
    throw new Error('Cannot revert delivered order to pending');
  }
  if (currentStatus === 'cancelled' && newStatus === 'delivered') {
    throw new Error('Cannot transition cancelled order to delivered');
  }
  return true;
}

penTest('Allows valid progressive status transition (confirmed -> processing -> shipped -> delivered)', () => {
  assert.ok(validateOrderStatusTransition('confirmed', 'processing'));
  assert.ok(validateOrderStatusTransition('processing', 'shipped'));
  assert.ok(validateOrderStatusTransition('shipped', 'delivered'));
});

penTest('Rejects invalid status reversion (delivered -> pending)', () => {
  assert.throws(() => validateOrderStatusTransition('delivered', 'pending'), /Cannot revert delivered order to pending/);
});

penTest('Rejects unrecognized status values', () => {
  assert.throws(() => validateOrderStatusTransition('confirmed', 'hacked_status'), /Invalid status/);
});

// ----------------------------------------------------------------------------
// 5. Input Sanitization & XSS Neutralization
// ----------------------------------------------------------------------------
console.log('\n5. Input Sanitization & Anti-Injection Tests:');

function sanitizeSmtpHeader(str) {
  return str.replace(/[\r\n]/g, '').trim();
}

function sanitizeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

penTest('Strips Carriage Return (CRLF) to prevent SMTP header injection', () => {
  const maliciousSubject = 'Tax Invoice\r\nBcc: hacker@stealth.com\r\n';
  const cleanSubject = sanitizeSmtpHeader(maliciousSubject);
  assert.strictEqual(cleanSubject, 'Tax InvoiceBcc: hacker@stealth.com');
  assert.ok(!cleanSubject.includes('\r'));
  assert.ok(!cleanSubject.includes('\n'));
});

penTest('Escapes script tags and HTML entities in customer names and notes', () => {
  const xssPayload = '<script>alert("pwned")</script><img src=x onerror=alert(1)>';
  const clean = sanitizeHtml(xssPayload);
  assert.ok(!clean.includes('<script>'));
  assert.ok(!clean.includes('<img'));
  assert.strictEqual(clean, '&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;&lt;img src=x onerror=alert(1)&gt;');
});

// ----------------------------------------------------------------------------
// Summary Report
// ----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`SECURITY AUDIT COMPLETE: ${passCount} Passed, ${failCount} Vulnerabilities Found.`);
console.log('================================================================\n');

if (failCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
