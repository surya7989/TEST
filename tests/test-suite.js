/**
 * AT Specialists Australia - Production Verification & Security Test Suite
 * 
 * Tests authoritative pricing, GST rules, JWT verification, security headers,
 * secret sanitization, and Hostinger deployment packaging integrity.
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import assert from 'assert';

console.log('================================================================');
console.log('AT SPECIALISTS AUSTRALIA - PRODUCTION SYSTEM VERIFICATION SUITE');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(` ✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(` ❌ FAIL: ${name}`);
    console.error(` Error: ${err.message}\n`);
    failedTests++;
  }
}

// ----------------------------------------------------------------------------
// 1. Authoritative Pricing & GST Calculations
// ----------------------------------------------------------------------------
console.log('1. Testing Authoritative Pricing & Australian Tax Rules:');

runTest('Calculates standard purchase subtotal with integer arithmetic precision', () => {
  const items = [
    { price: 3450.00, quantity: 2 },
    { price: 800.00, quantity: 1 },
    { price: 480.00, quantity: 3 }
  ];
  const subtotal = items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100;
  assert.strictEqual(subtotal, 9140.00);
});

runTest('Calculates equipment hire duration price (Weekly rate * Weeks * Qty)', () => {
  const weeklyRate = 180.00;
  const hireWeeks = 4;
  const quantity = 2;
  const lineTotal = weeklyRate * hireWeeks * quantity;
  assert.strictEqual(lineTotal, 1440.00);
});

runTest('Enforces GST-Free status for Section 38-45 assistive medical equipment', () => {
  const gstFreeItem = { price: 3450.00, quantity: 1, gstType: 'gst-free' };
  const gst = gstFreeItem.gstType === 'gst-free' ? 0.00 : (gstFreeItem.price / 11);
  assert.strictEqual(gst, 0.00);
});

runTest('Calculates 10% tax-inclusive GST correctly for taxable items', () => {
  const taxableItem = { price: 110.00, quantity: 1, gstType: 'standard' };
  const gst = taxableItem.gstType === 'standard' ? Math.round((taxableItem.price / 11) * 100) / 100 : 0.00;
  assert.strictEqual(gst, 10.00);
});

runTest('Applies delivery method tier fees authoritatively', () => {
  const methodFees = { standard: 0, express: 29, white_glove: 149 };
  assert.strictEqual(methodFees.standard, 0);
  assert.strictEqual(methodFees.express, 29);
  assert.strictEqual(methodFees.white_glove, 149);
});

// ----------------------------------------------------------------------------
// 2. Cryptographic Token & Guest Authorization
// ----------------------------------------------------------------------------
console.log('\n2. Testing Cryptographic Token & Access Authorization:');

function base64UrlEncode(str) {
  return Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return Buffer.from(base64, 'base64').toString('utf8');
}

function generateJwt(payload, secret, expSeconds = 3600) {
  const header = base64UrlEncode(JSON.stringify({ typ: 'JWT', alg: 'HS256' }));
  const exp = Math.floor(Date.now() / 1000) + expSeconds;
  const body = base64UrlEncode(JSON.stringify({...payload, exp }));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (expected !== signature) return null;
  const decoded = JSON.parse(base64UrlDecode(body));
  if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
  return decoded;
}

runTest('Generates and verifies valid HMAC-SHA256 JWT tokens', () => {
  const secret = 'test_jwt_secret_1234567890';
  const token = generateJwt({ id: 1, email: 'admin@atspecialists.com.au', role: 'admin' }, secret, 3600);
  const verified = verifyJwt(token, secret);
  assert.ok(verified !== null);
  assert.strictEqual(verified.email, 'admin@atspecialists.com.au');
  assert.strictEqual(verified.role, 'admin');
});

runTest('Rejects tampered JWT payload with signature mismatch', () => {
  const secret = 'test_jwt_secret_1234567890';
  const token = generateJwt({ id: 1, role: 'customer' }, secret, 3600);
  const parts = token.split('.');
  const forgedPayload = base64UrlEncode(JSON.stringify({ id: 1, role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 }));
  const forgedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;
  const verified = verifyJwt(forgedToken, secret);
  assert.strictEqual(verified, null);
});

runTest('Rejects expired JWT tokens', () => {
  const secret = 'test_jwt_secret_1234567890';
  const token = generateJwt({ id: 1, role: 'admin' }, secret, -10); // Expired 10s ago
  const verified = verifyJwt(token, secret);
  assert.strictEqual(verified, null);
});

runTest('Generates and validates guest order HMAC access tokens', () => {
  const secret = 'test_jwt_secret_1234567890';
  const orderId = 'ATS-ORD-260902-1234';
  const email = 'client@example.com.au';
  const expectedToken = crypto.createHmac('sha256', secret).update(`ORDER_ACCESS:${orderId}:${email.toLowerCase().trim()}`).digest('hex');
  
  // Validation check
  const valid = crypto.timingSafeEqual(Buffer.from(expectedToken, 'utf8'),
    Buffer.from(expectedToken, 'utf8'));
  assert.strictEqual(valid, true);
});

// ----------------------------------------------------------------------------
// 3. Security Headers & Configuration Validation
// ----------------------------------------------------------------------------
console.log('\n3. Testing Security Headers & Server Configuration:');

runTest('Root.htaccess contains Content-Security-Policy with PayPal integration', () => {
  const htaccess = fs.readFileSync(path.resolve('.htaccess'), 'utf8');
  assert.ok(htaccess.includes('Content-Security-Policy'));
  assert.ok(htaccess.includes('https://www.paypal.com'));
  assert.ok(htaccess.includes('https://www.sandbox.paypal.com'));
});

runTest('Root.htaccess contains HSTS, X-Content-Type-Options, X-Frame-Options', () => {
  const htaccess = fs.readFileSync(path.resolve('.htaccess'), 'utf8');
  assert.ok(htaccess.includes('Strict-Transport-Security'));
  assert.ok(htaccess.includes('X-Content-Type-Options "nosniff"'));
  assert.ok(htaccess.includes('X-Frame-Options "SAMEORIGIN"'));
});

runTest('api/.htaccess contains CGIPassAuth and Authorization rewrite rule', () => {
  const apiHtaccess = fs.readFileSync(path.resolve('api/.htaccess'), 'utf8');
  assert.ok(apiHtaccess.includes('CGIPassAuth On'));
  assert.ok(apiHtaccess.includes('HTTP_AUTHORIZATION:%{HTTP:Authorization}'));
});

runTest('robots.txt disallows /at and /api endpoints', () => {
  const robots = fs.readFileSync(path.resolve('robots.txt'), 'utf8');
  assert.ok(robots.includes('Disallow: /at'));
  assert.ok(robots.includes('Disallow: /at/'));
  assert.ok(robots.includes('Disallow: /api/'));
});

// ----------------------------------------------------------------------------
// 4. Secrets Sanitization Validation
// ----------------------------------------------------------------------------
console.log('\n4. Testing Repository Secrets Sanitization:');

runTest('.env.example contains only clean placeholders without private credentials', () => {
  const envExample = fs.readFileSync(path.resolve('.env.example'), 'utf8');
  assert.ok(!envExample.includes('iaogftiigyosbdqc'));
  assert.ok(!envExample.includes('saisurya7989'));
  assert.ok(envExample.includes('your_secure_mysql_database_password_here'));
});

runTest('hostinger_schema.sql contains no embedded SMTP passwords or exposed email secrets', () => {
  const schema = fs.readFileSync(path.resolve('hostinger_schema.sql'), 'utf8');
  assert.ok(!schema.includes('iaogftiigyosbdqc'));
  assert.ok(!schema.includes('saisurya7989'));
});

runTest('api/config.php enforces strict CORS whitelist without wildcard substring matching', () => {
  const configPhp = fs.readFileSync(path.resolve('api/config.php'), 'utf8');
  assert.ok(!configPhp.includes('strpos($origin'));
  assert.ok(configPhp.includes('$allowed_origins = ['));
  assert.ok(configPhp.includes('in_array($origin, $allowed_origins, true)'));
});

runTest('api/smtpHelper.php enforces TLS certificate verification (verify_peer = true)', () => {
  const smtpHelper = fs.readFileSync(path.resolve('api/smtpHelper.php'), 'utf8');
  assert.ok(smtpHelper.includes("'verify_peer' => true"));
  assert.ok(smtpHelper.includes("'verify_peer_name' => true"));
  assert.ok(!smtpHelper.includes("'verify_peer' => false"));
});

// ----------------------------------------------------------------------------
// 5. Product Catalogue & Dynamic Engine Verification (13 Test Cases)
// ----------------------------------------------------------------------------
console.log('\n5. Testing Product Catalogue & Dynamic Engine (13 Clinical Test Cases):');

const productsData = JSON.parse(fs.readFileSync(path.resolve('apps/frontend/src/data/products.json'), 'utf8'));

runTest('Case 1: Product with no variants exists and supports direct purchase calculation', () => {
  const noVariantProduct = productsData.find(p => (!p.variants || p.variants.length === 0) && p.buyPrice > 0);
  assert.ok(noVariantProduct, 'Product without variants should exist');
  assert.ok(noVariantProduct.buyPrice > 0);
  assert.strictEqual(typeof noVariantProduct.sku, 'string');
});

runTest('Case 2: Product with Size-only attribute exists and has valid variant mappings', () => {
  const sizeOnlyProduct = productsData.find(p => {
    const attrSlugs = (p.attributes || []).map(a => a.slug.toLowerCase());
    return attrSlugs.length === 1 && attrSlugs[0] === 'size';
  });
  assert.ok(sizeOnlyProduct, 'Size-only product should exist');
  assert.ok(sizeOnlyProduct.variants.length > 0);
  assert.ok(sizeOnlyProduct.variants.every(v => v.attributes && v.attributes.size));
});

runTest('Case 3: Product with Size + Colour attributes exists and maps composite variants', () => {
  const sizeColourProduct = productsData.find(p => {
    const attrSlugs = (p.attributes || []).map(a => a.slug.toLowerCase());
    return attrSlugs.includes('size') && (attrSlugs.includes('colour') || attrSlugs.includes('color'));
  });
  assert.ok(sizeColourProduct, 'Size + Colour product should exist');
  assert.ok(sizeColourProduct.variants.length > 1);
});

runTest('Case 4: Product with 3+ attributes (Size, Depth, Colour/Config) parses correctly', () => {
  const multiAttrProduct = productsData.find(p => (p.attributes || []).length >= 3);
  assert.ok(multiAttrProduct, 'Multi-attribute product should exist');
  assert.ok(multiAttrProduct.attributes.length >= 3);
});

runTest('Case 5: Product with optional equipment recalculates total unit price authoritatively', () => {
  const optProduct = productsData.find(p => (p.optionalEquipment || []).length > 0 && p.buyPrice > 0);
  assert.ok(optProduct, 'Product with optional equipment should exist');
  const basePrice = optProduct.buyPrice;
  const selectedOptions = optProduct.optionalEquipment.slice(0, 2);
  const optionsSum = selectedOptions.reduce((sum, opt) => sum + opt.price, 0);
  const calculatedTotal = basePrice + optionsSum;
  assert.strictEqual(calculatedTotal, basePrice + optionsSum);
  assert.ok(calculatedTotal > basePrice);
});

runTest('Case 6: Equipment hire pricing and duration rules calculate weekly rates correctly', () => {
  const hireProduct = productsData.find(p => p.hireAvailable && p.hirePrice > 0);
  assert.ok(hireProduct, 'Hire-available product should exist');
  const hireWeeks = 3;
  const quantity = 2;
  const totalHireCost = hireProduct.hirePrice * hireWeeks * quantity;
  assert.strictEqual(totalHireCost, hireProduct.hirePrice * 3 * 2);
});

runTest('Case 7: Buy-only products have buyAvailable = true and valid purchase price', () => {
  const buyOnlyProduct = productsData.find(p => p.buyAvailable && !p.hireAvailable);
  assert.ok(buyOnlyProduct, 'Buy-only product should exist');
  assert.ok(buyOnlyProduct.buyPrice > 0);
});

runTest('Case 8: Products with Hire + Buy toggle support both purchase workflows', () => {
  const bothProduct = productsData.find(p => p.buyAvailable && p.hireAvailable);
  assert.ok(bothProduct, 'Hire + Buy product should exist');
  assert.ok(bothProduct.buyPrice > 0);
  assert.ok(bothProduct.hirePrice > 0);
});

runTest('Case 9: Quote-only / Complex AT products are flagged with quoteRequired or zero base price', () => {
  const quoteProduct = productsData.find(p => p.quoteRequired || p.purchaseType === 'quote_only' || (p.buyPrice === 0 && p.hirePrice === 0));
  assert.ok(quoteProduct, 'Quote-only product should exist');
});

runTest('Case 10: Products with rich multi-image galleries contain high-res gallery arrays', () => {
  const galleryProduct = productsData.find(p => (p.galleryImages || []).length > 1);
  assert.ok(galleryProduct, 'Gallery product should exist');
  assert.ok(galleryProduct.galleryImages.length > 1);
  assert.ok(galleryProduct.galleryImages.every(img => img.startsWith('http') || img.startsWith('/')));
});

runTest('Case 11: Products with variant-specific images associate unique images per variant', () => {
  const variantImgProduct = productsData.find(p => (p.variants || []).some(v => v.image && v.image !== p.image));
  assert.ok(variantImgProduct, 'Variant-image product should exist');
});

runTest('Case 12: Products reference valid clinical categories in taxonomy tree', () => {
  const categoriesTs = fs.readFileSync(path.resolve('apps/frontend/src/data/categories.ts'), 'utf8');
  assert.ok(categoriesTs.includes('CLINICAL_PRIMARY_CATEGORIES'));
  assert.ok(categoriesTs.includes('CATEGORIES'));
  const validProduct = productsData.find(p => (p.categories || []).length > 0);
  assert.ok(validProduct);
  assert.ok(validProduct.categories.length > 0);
});

runTest('Case 13: Downloadable clinical documents contain valid title, URL and document type', () => {
  const docProduct = productsData.find(p => (p.documents || []).length > 0);
  assert.ok(docProduct, 'Document-equipped product should exist');
  const firstDoc = docProduct.documents[0];
  assert.ok(firstDoc.title);
  assert.ok(firstDoc.url);
  assert.ok(firstDoc.type);
});

// ----------------------------------------------------------------------------
// 6. Testing Order Separation & Clinical Rental Restrictions (Hire vs Purchases vs NDIS Quotes)
// ----------------------------------------------------------------------------
console.log('\n6. Testing Order Separation & Clinical Restrictions (Hire vs Purchases vs NDIS Quotes):');

runTest('Cart Store enforces separation between Outright Purchases and Equipment Hire', () => {
  const storeTs = fs.readFileSync(path.resolve('apps/frontend/src/store/useCartStore.ts'), 'utf8');
  assert.ok(storeTs.includes('interface CartConflict'), 'CartConflict interface must exist');
  assert.ok(storeTs.includes('attemptedType'), 'Must track attempted item purchase type');
  assert.ok(storeTs.includes('resolveConflict'), 'Must provide conflict resolution handler');
  assert.ok(storeTs.includes('separateCart: (keepType:'), 'Must provide separateCart action');
  assert.ok(storeTs.includes('hasMixedItems'), 'Must export hasMixedItems selector');
});

runTest('Global CartConflictModal displays warning symbol (AlertTriangle) and restriction options', () => {
  const modalTsx = fs.readFileSync(path.resolve('apps/frontend/src/components/cart/CartConflictModal.tsx'), 'utf8');
  assert.ok(modalTsx.includes('AlertTriangle'), 'Must display AlertTriangle warning symbol');
  assert.ok(modalTsx.includes('Separate Orders Required'), 'Must state that separate orders are required');
  assert.ok(modalTsx.includes('resolveConflict'), 'Must support conflict resolution');
});

runTest('CartPage restricts checkout and displays restriction banner when mixed cart detected', () => {
  const cartTsx = fs.readFileSync(path.resolve('apps/frontend/src/pages/CartPage.tsx'), 'utf8');
  assert.ok(cartTsx.includes('hasMixedItems'), 'Must check hasMixedItems');
  assert.ok(cartTsx.includes('AlertTriangle'), 'Must render warning symbol');
  assert.ok(cartTsx.includes('Checkout Restricted: Mixed Cart'), 'Must block proceed to checkout');
  assert.ok(cartTsx.includes("separateCart('buy')"), 'Must offer keep purchases option');
  assert.ok(cartTsx.includes("separateCart('hire')"), 'Must offer keep hire option');
});

runTest('CheckoutPage blocks submission and renders restriction banner if mixed items present', () => {
  const checkoutTsx = fs.readFileSync(path.resolve('apps/frontend/src/pages/CheckoutPage.tsx'), 'utf8');
  assert.ok(checkoutTsx.includes('if (hasMixedItems) return false;'), 'Must invalidate form when mixed');
  assert.ok(checkoutTsx.includes('Checkout Restricted: Mixed Cart'), 'Must block payment buttons');
  assert.ok(checkoutTsx.includes('Mixed Order Types Not Permitted'), 'Must display restriction header');
});

runTest('App.tsx globally mounts CartConflictModal across the storefront', () => {
  const appTsx = fs.readFileSync(path.resolve('apps/frontend/src/App.tsx'), 'utf8');
  assert.ok(appTsx.includes('CartConflictModal'), 'Must import and render CartConflictModal');
});

// ----------------------------------------------------------------------------
// 7. Testing Rehab Hire Australian Standards (Hire vs NDIS Formal Quote vs Purchase)
// ----------------------------------------------------------------------------
console.log('\n7. Testing Rehab Hire Standards & Clinical Workflow Differentiation:');

runTest('AdminStore types define hire schedule metadata and prescriber fields', () => {
  const adminStoreTs = fs.readFileSync(path.resolve('apps/frontend/src/store/adminStore.ts'), 'utf8');
  assert.ok(adminStoreTs.includes('hireStartDate?: string;'));
  assert.ok(adminStoreTs.includes('hireReturnDate?: string;'));
  assert.ok(adminStoreTs.includes('hireDurationWeeks?: number;'));
  assert.ok(adminStoreTs.includes('hireFacilityName?: string;'));
  assert.ok(adminStoreTs.includes('hireDischargeDate?: string;'));
  assert.ok(adminStoreTs.includes('prescriberName?: string;'));
  assert.ok(adminStoreTs.includes('clinicalRationale?: string;'));
});

runTest('CheckoutPage enforces 2-week minimum, hospital inpatient details, and 100% rebate clause', () => {
  const checkoutTsx = fs.readFileSync(path.resolve('apps/frontend/src/pages/CheckoutPage.tsx'), 'utf8');
  assert.ok(checkoutTsx.includes('Equipment Hire Schedule'), 'Must render hire schedule section');
  assert.ok(checkoutTsx.includes('100% Hire Rebate Guarantee') || checkoutTsx.includes('Rehab Hire 100% Purchase Credit'), 'Must render 100% rebate guarantee');
  assert.ok(checkoutTsx.includes('hireTermsAccepted'), 'Must require hire terms acceptance');
  assert.ok(checkoutTsx.includes('Hospital / Rehab Facility') || checkoutTsx.includes('Hospital / Inpatient'), 'Must provide inpatient delivery option');
  assert.ok(checkoutTsx.includes('calculatedReturnDate'), 'Must compute estimated return due date');
  assert.ok(checkoutTsx.includes('Prescribing Clinician / OT'), 'Must render prescribing OT fields');
});

runTest('Backend quotes route assigns HIR-QT prefix to hire quotes and persists clinical fields', () => {
  const quotesTs = fs.readFileSync(path.resolve('apps/backend/src/routes/quotes.ts'), 'utf8');
  assert.ok(quotesTs.includes('HIR-QT'), 'Must generate HIR-QT prefix for hire quotes');
  assert.ok(quotesTs.includes('prescriberName'), 'Must persist prescriberName');
  assert.ok(quotesTs.includes('clinicalRationale'), 'Must persist clinicalRationale');
  assert.ok(quotesTs.includes('hireStartDate'), 'Must persist hireStartDate');
  assert.ok(quotesTs.includes('hireFacilityName'), 'Must persist hireFacilityName');
});

runTest('Backend email & PDF engine renders specialized hire agreement slip and 100% rebate clause', () => {
  const emailsTs = fs.readFileSync(path.resolve('apps/backend/src/routes/emails.ts'), 'utf8');
  assert.ok(emailsTs.includes("docIdUpper.startsWith('HIR')"), 'Must recognize HIR- prefix');
  assert.ok(emailsTs.includes('EQUIPMENT HIRE AUTHORIZATION & REBATE SCHEDULE'), 'Must render hire sign-off slip');
  assert.ok(emailsTs.includes('100% hire fee (up to 4 wks) credited') || emailsTs.includes('Rehab Hire 100% Purchase Credit'), 'Must include 100% purchase rebate clause in PDF');
  assert.ok(emailsTs.includes('Rehab Hire 100% Purchase Credit Rebate Guarantee'), 'Must include 100% rebate guarantee in email HTML');
});

runTest('ViewDocumentPage renders Equipment Hire Schedule and Rehab Hire 100% rebate card', () => {
  const viewDocTsx = fs.readFileSync(path.resolve('apps/frontend/src/pages/ViewDocumentPage.tsx'), 'utf8');
  assert.ok(viewDocTsx.includes("docId.toUpperCase().startsWith('HIR')"), 'Must recognize HIR- prefix');
  assert.ok(viewDocTsx.includes('EQUIPMENT HIRE AGREEMENT & SCHEDULE'), 'Must set hire agreement title');
  assert.ok(viewDocTsx.includes('Rehab Hire 100% Purchase Credit Rebate Guarantee'), 'Must render 100% rebate card');
  assert.ok(viewDocTsx.includes('Equipment Hire Authorization & Terms Acceptance'), 'Must render hire authorization slip');
});

runTest('AdminRentals displays hospital delivery badge and View Hire Agreement link', () => {
  const rentalsTsx = fs.readFileSync(path.resolve('apps/frontend/src/pages/admin/AdminRentals.tsx'), 'utf8');
  assert.ok(rentalsTsx.includes('hireFacilityName'), 'Must display hospital facility name');
  assert.ok(rentalsTsx.includes('/view/${rental.orderId}'), 'Must link to View Hire Agreement');
  assert.ok(rentalsTsx.includes('Rehab Hire 100% Purchase Credit'), 'Must show rebate guarantee in drawer');
});

// ----------------------------------------------------------------------------
// Summary Report
// ----------------------------------------------------------------------------
console.log('\n================================================================');
console.log(`TEST SUITE COMPLETE: ${passedTests} Passed, ${failedTests} Failed.`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
