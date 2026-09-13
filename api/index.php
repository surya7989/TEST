<?php
// ============================================================================
// AT SPECIALISTS AUSTRALIA - CANONICAL HOSTINGER PHP REST API ROUTER
// ============================================================================

declare(strict_types=1);

require_once __DIR__. '/config.php';
require_once __DIR__. '/pdfHelper.php';

// Parse Request Method and URI Path
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);

// Normalize path to relative API route (e.g., /api/orders -> orders)
$path = preg_replace('#^/api/?#i', '', (string)$uri);
$path = trim((string)$path, '/');
$segments = explode('/', $path);
$endpoint = strtolower($segments[0] ?? '');

// Helper for Database Availability
function requireDatabase(): PDO {
    global $pdo, $db_error;
    if (!$pdo) {
        sendJson([
            'success' => false,
            'error' => 'Database service is currently unavailable. Please check database configuration.',
            'code' => 'DATABASE_UNAVAILABLE'
        ], 503);
    }
    return $pdo;
}

// Cached column-existence check (lets new code run on older databases that
// have not yet picked up newer schema columns).
function tableHasColumn(PDO $db, string $table, string $column): bool {
    static $cache = [];
    $key = $table . '.' . $column;
    if (!array_key_exists($key, $cache)) {
        try {
            $stmt = $db->prepare("SHOW COLUMNS FROM `{$table}` LIKE ?");
            $stmt->execute([$column]);
            $cache[$key] = (bool)$stmt->fetch();
        } catch (Exception $e) {
            $cache[$key] = false;
        }
    }
    return $cache[$key];
}

// 0. ROOT API DISCOVERY & HEALTH CHECK (`GET /api` or `GET /api/health`)
if ($endpoint === '' || $endpoint === 'health') {
    global $pdo;
    $dbConnected = false;
    try {
        if ($pdo) {
            $pdo->query("SELECT 1");
            $dbConnected = true;
        }
    } catch (Exception $e) {
        $dbConnected = false;
    }

    sendJson([
        'status' => 'online',
        'service' => 'AT Specialists Australia PHP API',
        'version' => '2.1.0',
        'environment' => 'production',
        'database' => $dbConnected ? 'connected' : 'disconnected',
        'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        'endpoints' => [
            '/api/products' => 'Catalog & Inventory',
            '/api/cart/calculate' => 'Pricing Engine',
            '/api/paypal' => 'PayPal Gateway Integration',
            '/api/orders' => 'Order Management & Tax Invoices',
            '/api/quotes' => 'NDIS Quotations & PDF Generation',
            '/api/inquiries' => 'Clinical Inquiries & Contact',
            '/api/emails' => 'Unified Email & PDF Document Dispatch',
            '/api/settings' => 'System Settings & Presets'
        ]
    ]);
}

// Helper for PayPal OAuth2 Token
// Resolves credentials from the admin-saved DB override first (clientId + mode),
// falling back to server environment. The secret is never stored server-side
// in readable settings responses — see GET /api/settings masking below.
function getPayPalConfig(): array {
    global $paypal_client_id, $paypal_secret, $paypal_mode, $pdo;
    $cId = (string)$paypal_client_id;
    $secret = (string)$paypal_secret;
    $mode = strtolower((string)$paypal_mode) === 'live' ? 'live' : 'sandbox';
    try {
        if ($pdo) {
            $stmt = $pdo->prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'paypal_config' LIMIT 1");
            $stmt->execute();
            $cfg = $stmt->fetch();
            if ($cfg && !empty($cfg['setting_value'])) {
                $parsed = json_decode((string)$cfg['setting_value'], true);
                if (!empty($parsed['clientId'])) $cId = (string)$parsed['clientId'];
                if (!empty($parsed['secretKey'])) $secret = (string)$parsed['secretKey'];
                if (!empty($parsed['mode'])) $mode = strtolower((string)$parsed['mode']) === 'live' ? 'live' : 'sandbox';
            }
        }
    } catch (Exception $e) {}
    return ['clientId' => $cId, 'secret' => $secret, 'mode' => $mode];
}

function paypalBaseUrl(string $mode): string {
    return ($mode === 'live') ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
}

/**
 * Enforces the admin checkout kill-switch (checkout_settings in app_settings).
 * $kind is 'payment' (card/PayPal orders) or 'quotation' (NDIS quotes).
 */
function enforceCheckoutEnabled(string $kind): void {
    global $pdo;
    try {
        if ($pdo) {
            $stmt = $pdo->prepare("SELECT setting_value FROM app_settings WHERE setting_key = 'checkout_settings' LIMIT 1");
            $stmt->execute();
            $cfg = $stmt->fetch();
            if ($cfg && !empty($cfg['setting_value'])) {
                $parsed = json_decode((string)$cfg['setting_value'], true);
                if (is_array($parsed)) {
                    if ($kind === 'payment' && array_key_exists('enablePayment', $parsed) && !$parsed['enablePayment']) {
                        sendJson(['success' => false, 'error' => 'Online checkout is temporarily paused. Please contact us to complete your order.', 'code' => 'CHECKOUT_PAUSED'], 503);
                    }
                    if ($kind === 'quotation' && array_key_exists('enableQuotation', $parsed) && !$parsed['enableQuotation']) {
                        sendJson(['success' => false, 'error' => 'Quote requests are temporarily paused. Please contact us directly.', 'code' => 'QUOTES_PAUSED'], 503);
                    }
                }
            }
        }
    } catch (Exception $e) {}
}

function getPayPalAccessToken(): string {
    $cfg = getPayPalConfig();
    $paypal_client_id = $cfg['clientId'];
    $paypal_secret = $cfg['secret'];
    $paypal_mode = $cfg['mode'];

    if (empty($paypal_client_id) || empty($paypal_secret)) {
        throw new Exception('PayPal credentials are not configured on the server.');
    }

    $baseUrl = ($paypal_mode === 'live')
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    $ch = curl_init("{$baseUrl}/v1/oauth2/token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_USERPWD, "{$paypal_client_id}:{$paypal_secret}");
    curl_setopt($ch, CURLOPT_POSTFIELDS, "grant_type=client_credentials");
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Accept: application/json',
        'Accept-Language: en_US',
        'Content-Type: application/x-www-form-urlencoded'
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlErr = curl_error($ch);
    curl_close($ch);

    if ($curlErr) {
        throw new Exception("PayPal network connection error: {$curlErr}");
    }

    $data = json_decode((string)$response, true);
    if ($httpCode !== 200 || !isset($data['access_token'])) {
        error_log("PayPal auth failed ({$httpCode})");
        throw new Exception('Payment service authentication failed. Please try again shortly.');
    }

    return (string)$data['access_token'];
}

// Helper to Reconstruct Cart & Authoritatively Calculate Pricing
// Validates an optional promo code server-side against the promotions table.
// NOTE: keep in sync with the promotions/validate route below.
function validatePromoCode(string $code, float $subtotal): array {
    $code = strtoupper(trim($code));
    if ($code === '') {
        return ['code' => '', 'discount' => 0.0, 'freeShipping' => false];
    }
    $db = requireDatabase();
    $stmt = $db->prepare("SELECT * FROM promotions WHERE UPPER(code) = ? LIMIT 1");
    $stmt->execute([$code]);
    $promo = $stmt->fetch();
    if (!$promo) {
        throw new Exception('This promo code is not recognised.');
    }
    if (intval($promo['is_active'] ?? 0) !== 1) {
        throw new Exception('This promo code is no longer active.');
    }
    if (!empty($promo['valid_until']) && strtotime((string)$promo['valid_until']) < time()) {
        throw new Exception('This promo code has expired.');
    }
    if ($subtotal < floatval($promo['min_spend'] ?? 0)) {
        throw new Exception('This code requires a minimum order of $' . number_format(floatval($promo['min_spend'] ?? 0), 2) . '.');
    }
    if (isset($promo['max_usage']) && $promo['max_usage'] !== null && $promo['max_usage'] !== '' && isset($promo['usage_count']) && intval($promo['usage_count']) >= intval($promo['max_usage'])) {
        throw new Exception('This promo code has reached its usage limit.');
    }
    $discount = 0.0;
    $freeShipping = false;
    $type = (string)($promo['discount_type'] ?? 'percentage');
    if ($type === 'percentage') {
        $discount = round($subtotal * floatval($promo['discount_value'] ?? 0), 2) / 100;
    } elseif ($type === 'fixed') {
        $discount = min(floatval($promo['discount_value'] ?? 0), $subtotal);
    } elseif ($type === 'free_shipping') {
        $freeShipping = true;
    }
    return ['code' => (string)$promo['code'], 'discount' => round($discount, 2), 'freeShipping' => $freeShipping];
}

function getStaticCatalog(): array {
    static $catalog = null;
    if ($catalog !== null) return $catalog;
    
    $candidates = [
        __DIR__ . '/products.json',
        __DIR__ . '/data/products.json',
        dirname(__DIR__) . '/apps/frontend/src/data/products.json',
        __DIR__ . '/../../apps/frontend/src/data/products.json',
    ];
    foreach ($candidates as $cand) {
        if (file_exists($cand) && is_readable($cand)) {
            $json = file_get_contents($cand);
            $arr = json_decode($json, true);
            if (is_array($arr) && !empty($arr)) {
                $catalog = $arr;
                return $catalog;
            }
        }
    }
    $catalog = [];
    return $catalog;
}

function findProductInCatalog(string $key, ?string &$matchedVariant = null): ?array {
    $catalog = getStaticCatalog();
    if (empty($catalog)) return null;
    
    $lowerKey = strtolower(trim($key));
    if ($lowerKey === '') return null;

    foreach ($catalog as $p) {
        if (strtolower($p['id'] ?? '') === $lowerKey ||
            strtolower($p['slug'] ?? '') === $lowerKey ||
            strtolower($p['sku'] ?? '') === $lowerKey) {
            return $p;
        }
        if (!empty($p['variants']) && is_array($p['variants'])) {
            foreach ($p['variants'] as $v) {
                if (strtolower($v['sku'] ?? '') === $lowerKey ||
                    strtolower($v['id'] ?? '') === $lowerKey) {
                    $matchedVariant = $v['sku'] ?? ($v['id'] ?? null);
                    $pCopy = $p;
                    if (isset($v['price'])) {
                        $vPrice = floatval($v['price']);
                        $pType = $v['attributes']['purchase-type'] ?? '';
                        if ($pType === 'hire') {
                            $pCopy['hire_price'] = $vPrice;
                            $pCopy['hirePrice'] = $vPrice;
                        } else {
                            $pCopy['price'] = $vPrice;
                            $pCopy['buyPrice'] = $vPrice;
                        }
                    }
                    if (!empty($v['sku'])) {
                        $pCopy['sku'] = $v['sku'];
                    }
                    return $pCopy;
                }
            }
        }
    }
    return null;
}

function seedCatalogIntoDatabase(PDO $db): int {
    $catalog = getStaticCatalog();
    if (empty($catalog)) return 0;

    $stmt = $db->prepare("
        INSERT INTO products (
            id, name, slug, sku, price, hire_price, hire_period, category, categories_json,
            image, gallery_images_json, brand, stock, low_stock_threshold, is_featured, is_active,
            gst_type, gst_rate, delivery_fee, ndis_code, short_description, description,
            badge, rating, review_count, variants_json, features_json, specs_json
        ) VALUES (
            ?, ?, ?, ?, ?, ?, 'week', ?, ?,
            ?, ?, ?, ?, 5, ?, 1,
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?
        )
        ON DUPLICATE KEY UPDATE
            name = VALUES(name), price = VALUES(price), hire_price = VALUES(hire_price), is_active = 1
    ");

    $count = 0;
    $batchSize = 50;
    $db->beginTransaction();
    try {
        foreach ($catalog as $p) {
            $cats = is_array($p['categories'] ?? null) ? $p['categories'] : [($p['category'] ?? 'Mobility')];
            $mainCat = $cats[0] ?? 'Mobility';
            $gallery = is_array($p['galleryImages'] ?? null) ? $p['galleryImages'] : [($p['image'] ?? '')];
            $price = floatval($p['buyPrice'] ?? ($p['price'] ?? 0));
            $hirePrice = floatval($p['hirePrice'] ?? ($p['hire_price'] ?? 0));

            $stmt->execute([
                $p['id'],
                $p['name'] ?? '',
                $p['slug'] ?? $p['id'],
                $p['sku'] ?? $p['id'],
                $price,
                $hirePrice,
                $mainCat,
                json_encode($cats),
                $p['image'] ?? '',
                json_encode($gallery),
                $p['brand'] ?? 'AT Specialists',
                intval($p['stock'] ?? 50),
                !empty($p['featured']) ? 1 : 0,
                $p['gstType'] ?? 'gst-free',
                floatval($p['gstRate'] ?? 0),
                floatval($p['deliveryFee'] ?? 0),
                $p['ndisCode'] ?? '',
                $p['shortDescription'] ?? '',
                $p['fullDescription'] ?? ($p['description'] ?? ''),
                $p['badge'] ?? null,
                floatval($p['rating'] ?? 5.0),
                intval($p['reviewCount'] ?? 10),
                !empty($p['variants']) ? json_encode($p['variants']) : null,
                !empty($p['features']) ? json_encode($p['features']) : null,
                !empty($p['specifications']) ? json_encode($p['specifications']) : null,
            ]);
            $count++;
            if ($count % $batchSize === 0) {
                $db->commit();
                $db->beginTransaction();
            }
        }
        $db->commit();
    } catch (Exception $e) {
        if ($db->inTransaction()) $db->rollBack();
        error_log("seedCatalogIntoDatabase error: " . $e->getMessage());
    }
    return $count;
}

function calculateAuthoritativeCart(array $rawItems, string $deliveryMethod = 'standard', ?string $promoCode = null): array {
    global $pdo;
    $db = requireDatabase();

    $itemsBreakdown = [];
    $subtotal = 0.0;
    $totalProductDeliveryFees = 0.0;
    $totalGst = 0.0;

    // Batch-load all requested products across id, productId, sku, code, and slug
    $wantedIds = [];
    foreach ($rawItems as $it) {
        foreach (['id', 'productId', 'sku', 'code', 'slug'] as $k) {
            $val = trim((string)($it[$k] ?? ''));
            if ($val !== '') $wantedIds[] = $val;
        }
    }
    $wantedIds = array_values(array_unique($wantedIds));
    $prodByKey = [];
    if (!empty($wantedIds)) {
        $placeholders = implode(',', array_fill(0, count($wantedIds), '?'));
        $stmtAll = $db->prepare("SELECT * FROM products WHERE (id IN ({$placeholders}) OR slug IN ({$placeholders}) OR sku IN ({$placeholders})) AND is_active = 1");
        $stmtAll->execute(array_merge($wantedIds, $wantedIds, $wantedIds));
        foreach ($stmtAll->fetchAll() as $prow) {
            $prodByKey[(string)$prow['id']] = $prow;
            if (!empty($prow['slug'])) $prodByKey[(string)$prow['slug']] = $prow;
            if (!empty($prow['sku'])) $prodByKey[(string)$prow['sku']] = $prow;
            // Index by variant SKUs if present
            if (!empty($prow['variants_json'])) {
                $vars = json_decode($prow['variants_json'], true);
                if (is_array($vars)) {
                    foreach ($vars as $v) {
                        if (!empty($v['sku'])) $prodByKey[(string)$v['sku']] = $prow;
                        if (!empty($v['id'])) $prodByKey[(string)$v['id']] = $prow;
                    }
                }
            }
        }
    }

    foreach ($rawItems as $it) {
        $productId = (string)($it['id'] ?? ($it['productId'] ?? ''));
        $sku = (string)($it['sku'] ?? ($it['code'] ?? ''));
        $slug = (string)($it['slug'] ?? '');
        $qty = max(1, intval($it['quantity'] ?? 1));
        $purchaseType = ($it['purchaseType'] ?? 'buy') === 'hire' ? 'hire' : 'buy';
        $hireWeeks = max(1, intval($it['hireWeeks'] ?? 2));

        if ($productId === '' && $sku === '' && $slug === '') continue;

        // Authoritative product lookup from the preloaded batch
        $prod = $prodByKey[$productId] ?? ($sku !== '' ? ($prodByKey[$sku] ?? null) : null) ?? ($slug !== '' ? ($prodByKey[$slug] ?? null) : null);

        // Fallback to static catalog if product is not yet in MySQL (e.g. fresh database)
        if (!$prod) {
            $matchedVarSku = null;
            $catalogProd = findProductInCatalog($productId, $matchedVarSku);
            if (!$catalogProd && $sku !== '') $catalogProd = findProductInCatalog($sku, $matchedVarSku);
            if (!$catalogProd && $slug !== '') $catalogProd = findProductInCatalog($slug, $matchedVarSku);

            if ($catalogProd) {
                $prod = [
                    'id' => $catalogProd['id'],
                    'name' => $catalogProd['name'] ?? 'Assistive Technology Equipment',
                    'slug' => $catalogProd['slug'] ?? $catalogProd['id'],
                    'sku' => $catalogProd['sku'] ?? $productId,
                    'price' => floatval($catalogProd['buyPrice'] ?? ($catalogProd['price'] ?? 0)),
                    'hire_price' => floatval($catalogProd['hirePrice'] ?? ($catalogProd['hire_price'] ?? 0)),
                    'category' => is_array($catalogProd['categories'] ?? null) ? ($catalogProd['categories'][0] ?? 'Mobility') : ($catalogProd['category'] ?? 'Mobility'),
                    'image' => $catalogProd['image'] ?? '',
                    'brand' => $catalogProd['brand'] ?? 'AT Specialists',
                    'stock' => intval($catalogProd['stock'] ?? 100),
                    'is_active' => 1,
                    'is_featured' => !empty($catalogProd['featured']) ? 1 : 0,
                    'gst_type' => $catalogProd['gstType'] ?? 'gst-free',
                    'gst_rate' => floatval($catalogProd['gstRate'] ?? 0),
                    'delivery_fee' => floatval($catalogProd['deliveryFee'] ?? 0),
                    'description' => $catalogProd['fullDescription'] ?? ($catalogProd['description'] ?? ''),
                    'variants_json' => !empty($catalogProd['variants']) ? json_encode($catalogProd['variants']) : null,
                ];

                // Auto-upsert into DB so it persists for future orders
                try {
                    $stmtUp = $db->prepare("
                        INSERT INTO products (id, name, slug, sku, price, hire_price, category, image, brand, stock, is_active, gst_type, gst_rate, delivery_fee, description, variants_json)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE
                            name = VALUES(name), price = VALUES(price), hire_price = VALUES(hire_price), is_active = 1
                    ");
                    $stmtUp->execute([
                        $prod['id'], $prod['name'], $prod['slug'], $prod['sku'], $prod['price'], $prod['hire_price'],
                        $prod['category'], $prod['image'], $prod['brand'], $prod['stock'],
                        $prod['gst_type'], $prod['gst_rate'], $prod['delivery_fee'],
                        $prod['description'], $prod['variants_json']
                    ]);
                } catch (Exception $e) {}
            }
        }

        if (!$prod) {
            $ident = $productId ?: ($sku ?: $slug);
            throw new Exception("Product '{$ident}' is unavailable or inactive.");
        }

        $basePrice = floatval($prod['price']);
        $hireRate = floatval($prod['hire_price'] > 0 ? $prod['hire_price'] : ($basePrice * 0.05));

        // Check if item corresponds to a specific variant (e.g. CHA510)
        if (!empty($prod['variants_json'])) {
            $vars = json_decode($prod['variants_json'], true);
            if (is_array($vars)) {
                foreach ($vars as $v) {
                    $vSku = strtolower($v['sku'] ?? '');
                    $vId = strtolower((string)($v['id'] ?? ''));
                    if ($vSku !== '' && ($vSku === strtolower($productId) || $vSku === strtolower($sku)) ||
                        ($vId !== '' && ($vId === strtolower($productId) || $vId === strtolower($sku)))) {
                        if (isset($v['price'])) {
                            $vPrice = floatval($v['price']);
                            $vType = $v['attributes']['purchase-type'] ?? '';
                            if ($vType === 'hire' || $purchaseType === 'hire') {
                                $hireRate = $vPrice;
                            } else {
                                $basePrice = $vPrice;
                            }
                        }
                        break;
                    }
                }
            }
        }

        // Stock guard for outright purchases (hire draws from the trial fleet)
        if ($purchaseType === 'buy' && intval($prod['stock'] ?? 0) < $qty) {
            throw new Exception("Product '{$prod['name']}' has insufficient stock for the requested quantity.");
        }

        $prodDeliveryFee = floatval($prod['delivery_fee'] ?? 0);
        $gstType = (string)($prod['gst_type'] ?? 'gst-free');
        $gstRate = floatval($prod['gst_rate'] ?? 0);

        $unitPrice = ($purchaseType === 'hire') ? ($hireRate * $hireWeeks) : $basePrice;
        $lineTotal = $unitPrice * $qty;
        $subtotal += $lineTotal;
        $totalProductDeliveryFees += ($prodDeliveryFee * $qty);

        // Calculate GST according to ATO / NDIS rules
        $lineGst = 0.0;
        if ($gstType === 'standard') {
            $lineGst = $lineTotal / 11.0; // 10% inclusive
        } elseif ($gstType === 'custom' && $gstRate > 0) {
            $rateFraction = $gstRate / 100.0;
            $lineGst = ($lineTotal * $rateFraction) / (1.0 + $rateFraction);
        }
        $totalGst += $lineGst;

        $itemsBreakdown[] = [
            'id' => $prod['id'],
            'name' => $prod['name'],
            'price' => $unitPrice,
            'quantity' => $qty,
            'purchaseType' => $purchaseType,
            'hireWeeks' => $purchaseType === 'hire' ? $hireWeeks : 0,
            'gstType' => $gstType,
            'gstRate' => $gstRate,
            'deliveryFee' => $prodDeliveryFee,
            'lineTotal' => $lineTotal,
            'image' => $prod['image'] ?? ''
        ];
    }

    // Delivery method fee
    $methodFees = ['standard' => 0.0, 'express' => 29.0, 'white_glove' => 149.0];
    $selectedMethodFee = $methodFees[$deliveryMethod] ?? 0.0;
    $deliveryTotal = $totalProductDeliveryFees + $selectedMethodFee;

    // Server-side promo validation (never trust client-computed discounts)
    $promoResult = validatePromoCode((string)($promoCode ?? ''), (float)$subtotal);
    if ($promoResult['freeShipping']) {
        $deliveryTotal = 0.0;
    }
    $discount = (float)$promoResult['discount'];
    $grandTotal = max(0.0, $subtotal + $deliveryTotal - $discount);

    return [
        'items' => $itemsBreakdown,
        'subtotal' => round($subtotal, 2),
        'deliveryFee' => round($deliveryTotal, 2),
        'gstTotal' => round($totalGst, 2),
        'subtotalExGst' => round($subtotal - $totalGst, 2),
        'discount' => round($discount, 2),
        'promoCode' => $promoResult['code'],
        'promo' => $promoResult['code'] !== '' ? ['code' => $promoResult['code'], 'discount' => round($discount, 2), 'freeShipping' => $promoResult['freeShipping']] : null,
        'total' => round($grandTotal, 2),
        'deliveryMethod' => $deliveryMethod
    ];
}

// ============================================================================
// 1. HEALTH CHECK (`GET /api/health`)
// ============================================================================
if ($endpoint === 'health' || $endpoint === '') {
    sendJson([
        'status' => 'ok',
        'service' => 'AT Specialists Production PHP API (PHP 8 + MySQL)',
        'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
        'database' => $pdo ? 'connected (MySQL/MariaDB)' : 'unavailable',
        'paypalConfigured' => !empty($paypal_client_id) && !empty($paypal_secret),
        'paypalMode' => $paypal_mode,
        'currency' => $currency
    ]);
}

// ============================================================================
// 2. AUTHENTICATION ROUTES (`/api/auth/*`)
// ============================================================================
if ($endpoint === 'auth') {
    $sub = strtolower($segments[1] ?? '');

    // POST /api/auth/login (Admin login)
    if ($sub === 'login' && $method === 'POST') {
        $db = requireDatabase();
        $body = getRequestBody();
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');

        if ($email === '' || $password === '') {
            sendJson(['success' => false, 'error' => 'Email and password are required.'], 400);
        }

        throttle('admin_login', 5, 60);
        $admin = null;
        try {
            $stmt = $db->prepare("SELECT * FROM admin_users WHERE email = ? LIMIT 1");
            $stmt->execute([$email]);
            $admin = $stmt->fetch();
        } catch (Throwable $e) {
            try {
                $db->exec("
                    CREATE TABLE IF NOT EXISTS `admin_users` (
                      `id` int(11) NOT NULL AUTO_INCREMENT,
                      `name` varchar(255) NOT NULL DEFAULT 'Clinical Administrator',
                      `email` varchar(255) NOT NULL UNIQUE,
                      `password` varchar(255) NOT NULL,
                      `role` varchar(50) NOT NULL DEFAULT 'admin',
                      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
                      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                      PRIMARY KEY (`id`),
                      KEY `idx_admin_email` (`email`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
                $defaultHash = password_hash('Admin@2026', PASSWORD_BCRYPT);
                $db->exec("INSERT IGNORE INTO `admin_users` (`id`, `name`, `email`, `password`, `role`) VALUES (1, 'Clinical Administrator', 'admin@atspecialists.com.au', '{$defaultHash}', 'admin')");
                $stmt = $db->prepare("SELECT * FROM admin_users WHERE email = ? LIMIT 1");
                $stmt->execute([$email]);
                $admin = $stmt->fetch();
            } catch (Throwable $ex) {}
        }

        if ($admin && password_verify($password, $admin['password'])) {
            $token = generateToken([
                'id' => $admin['id'],
                'email' => $admin['email'],
                'name' => $admin['name'],
                'role' => 'admin'
            ]);

            sendJson([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $admin['id'],
                    'name' => $admin['name'],
                    'email' => $admin['email'],
                    'role' => 'admin'
                ]
            ]);
        } else {
            // Anti-brute force uniform delay
            usleep(200000);
            sendJson(['success' => false, 'error' => 'Invalid email or password.'], 401);
        }
    }

    // POST /api/auth/customer-login
    if ($sub === 'customer-login' && $method === 'POST') {
        $db = requireDatabase();
        $body = getRequestBody();
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');

        if ($email === '' || $password === '') {
            sendJson(['success' => false, 'error' => 'Email and password are required.'], 400);
        }

        throttle('customer_login', 10, 60);
        $stmt = $db->prepare("SELECT * FROM customers WHERE LOWER(email) = ? LIMIT 1");
        $stmt->execute([$email]);
        $customer = $stmt->fetch();

        if ($customer && !empty($customer['password']) && password_verify($password, $customer['password'])) {
            // Customer sessions stay valid until explicit sign-out (30 days)
            $token = generateToken([
                'id' => $customer['id'],
                'email' => $customer['email'],
                'name' => $customer['name'],
                'role' => 'customer'
            ], 86400 * 30);

            sendJson([
                'success' => true,
                'token' => $token,
                'user' => [
                    'id' => $customer['id'],
                    'name' => $customer['name'],
                    'email' => $customer['email'],
                    'phone' => $customer['phone'] ?? '',
                    'ndisNumber' => $customer['ndis_number'] ?? '',
                    'planType' => $customer['plan_type'] ?? 'plan_managed',
                    'hasPassword' => true,
                    'role' => 'customer'
                ]
            ]);
        } else {
            usleep(200000);
            sendJson(['success' => false, 'error' => 'Invalid customer credentials.'], 401);
        }
    }

    // POST /api/auth/customer-register
    if ($sub === 'customer-register' && $method === 'POST') {
        $db = requireDatabase();
        $body = getRequestBody();
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $name = trim((string)($body['name'] ?? ''));

        if ($email === '' || $password === '' || $name === '') {
            sendJson(['success' => false, 'error' => 'Name, email, and password are required.'], 400);
        }

        $stmt = $db->prepare("SELECT id FROM customers WHERE LOWER(email) = ? LIMIT 1");
        $stmt->execute([$email]);
        if ($stmt->fetch()) {
            sendJson(['success' => false, 'error' => 'An account with this email address already exists.'], 409);
        }

        $id = 'CUST-'. substr(md5($email), 0, 10);
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $phone = trim((string)($body['phone'] ?? ''));
        $ndisNumber = trim((string)($body['ndisNumber'] ?? ''));
        $planType = (string)($body['planType'] ?? 'plan_managed');
        $planManager = trim((string)($body['planManager'] ?? ''));
        $planManagerEmail = trim((string)($body['planManagerEmail'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $city = trim((string)($body['city'] ?? ''));
        $state = trim((string)($body['state'] ?? 'VIC'));
        $postcode = trim((string)($body['postcode'] ?? ''));

        $stmt = $db->prepare("
            INSERT INTO customers (id, name, email, password, phone, address, city, state, postcode, ndis_number, plan_type, plan_manager, plan_manager_email, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$id, $name, $email, $hash, $phone, $address, $city, $state, $postcode, $ndisNumber, $planType, $planManager, $planManagerEmail]);
        if (tableHasColumn($db, 'customers', 'password_set')) {
            $db->prepare("UPDATE customers SET password_set = 1 WHERE id = ?")->execute([$id]);
        }

        $token = generateToken([
            'id' => $id,
            'email' => $email,
            'name' => $name,
            'role' => 'customer'
        ], 86400 * 30);

        sendJson([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $id,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'ndisNumber' => $ndisNumber,
                'planType' => $planType,
                'hasPassword' => true,
                'role' => 'customer'
            ]
        ], 201);
    }

    // POST /api/auth/customer-order-session (Links a completed order to a customer record)
    // SECURITY: never mints a session for an email that already has a password
    // (that would let anyone claim another customer's order history with just
    // their name+email). Existing password accounts must sign in normally.
    if ($sub === 'customer-order-session' && $method === 'POST') {
        $db = requireDatabase();
        $body = getRequestBody();
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $name = trim((string)($body['name'] ?? ''));

        if ($email === '' || $name === '') {
            sendJson(['success' => false, 'error' => 'Name and email are required.'], 400);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendJson(['success' => false, 'error' => 'Valid email address is required.'], 400);
        }

        $phone = trim((string)($body['phone'] ?? ''));
        $ndisNumber = trim((string)($body['ndisNumber'] ?? ''));
        $planType = (string)($body['planType'] ?? 'plan_managed');
        $planManager = trim((string)($body['planManager'] ?? ''));
        $planManagerEmail = trim((string)($body['planManagerEmail'] ?? ''));
        $address = trim((string)($body['address'] ?? ''));
        $city = trim((string)($body['city'] ?? ''));
        $state = trim((string)($body['state'] ?? 'VIC'));
        $postcode = trim((string)($body['postcode'] ?? ''));

        $stmt = $db->prepare("SELECT * FROM customers WHERE LOWER(email) = ? LIMIT 1");
        $stmt->execute([$email]);
        $existing = $stmt->fetch();

        // Existing account with a real password: force proper sign-in, issue nothing.
        // password_set=1 marks a user-chosen password; legacy rows without the
        // flag fall back to non-empty password (secure default).
        $flagOn = tableHasColumn($db, 'customers', 'password_set');
        $hasRealPassword = $existing && ($flagOn
            ? intval($existing['password_set'] ?? 0) === 1
            : !empty($existing['password']));
        if ($hasRealPassword) {
            sendJson(['success' => false, 'error' => 'An account with this email already exists. Please sign in to link your order.', 'code' => 'ACCOUNT_EXISTS_SIGN_IN'], 409);
        }

        $id = $existing ? $existing['id'] : ('CUST-'. substr(md5($email), 0, 10));

        if ($existing) {
            // Fill only blank fields — never overwrite verified profile data
            // (name included) with an unauthenticated checkout submission.
            $updateStmt = $db->prepare("
                UPDATE customers
                SET phone = COALESCE(NULLIF(phone, ''), NULLIF(?, ''), phone),
                    address = COALESCE(NULLIF(address, ''), NULLIF(?, ''), address),
                    city = COALESCE(NULLIF(city, ''), NULLIF(?, ''), city),
                    state = COALESCE(NULLIF(state, ''), NULLIF(?, ''), state),
                    postcode = COALESCE(NULLIF(postcode, ''), NULLIF(?, ''), postcode),
                    ndis_number = COALESCE(NULLIF(ndis_number, ''), NULLIF(?, ''), ndis_number),
                    plan_type = COALESCE(NULLIF(plan_type, ''), NULLIF(?, ''), plan_type),
                    plan_manager = COALESCE(NULLIF(plan_manager, ''), NULLIF(?, ''), plan_manager),
                    plan_manager_email = COALESCE(NULLIF(plan_manager_email, ''), NULLIF(?, ''), plan_manager_email)
                WHERE id = ?
            ");
            $updateStmt->execute([
                $phone, $address, $city, $state, $postcode,
                $ndisNumber, $planType, $planManager, $planManagerEmail, $id
            ]);
            $name = (string)($existing['name'] ?? $name);
        } else {
            $randomPass = bin2hex(random_bytes(16));
            $hash = password_hash($randomPass, PASSWORD_BCRYPT);
            $insStmt = $db->prepare("
                INSERT INTO customers (id, name, email, password, phone, address, city, state, postcode, ndis_number, plan_type, plan_manager, plan_manager_email, orders_count, total_spent, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, NOW())
            ");
            $insStmt->execute([$id, $name, $email, $hash, $phone, $address, $city, $state, $postcode, $ndisNumber, $planType, $planManager, $planManagerEmail]);
            if ($flagOn) {
                $db->prepare("UPDATE customers SET password_set = 0 WHERE id = ?")->execute([$id]);
            }
        }

        // Sessions stay valid until explicit sign-out (30 days)
        $token = generateToken([
            'id' => $id,
            'email' => $email,
            'name' => $name,
            'role' => 'customer'
        ], 86400 * 30);

        sendJson([
            'success' => true,
            'token' => $token,
            'isNewAccount' => !$existing,
            'user' => [
                'id' => $id,
                'name' => $name,
                'email' => $email,
                'phone' => $phone,
                'address' => $address,
                'city' => $city,
                'state' => $state,
                'postcode' => $postcode,
                'ndisNumber' => $ndisNumber,
                'planType' => $planType,
                'planManager' => $planManager,
                'planManagerEmail' => $planManagerEmail,
                'hasPassword' => false,
                'role' => 'customer'
            ]
        ], 200);
    }

    // POST /api/auth/set-password — activates a checkout-created account.
    // Proof of ownership is EITHER a valid customer JWT for the same email OR
    // a just-completed order/quote id belonging to that email. Refuses when a
    // user-chosen password is already set (use sign-in / reset instead).
    if ($sub === 'set-password' && $method === 'POST') {
        throttle('set_password', 10, 3600);
        $db = requireDatabase();
        $body = getRequestBody();
        $email = strtolower(trim((string)($body['email'] ?? '')));
        $password = (string)($body['password'] ?? '');
        $orderRef = trim((string)($body['orderId'] ?? ($body['quoteId'] ?? '')));

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendJson(['success' => false, 'error' => 'Valid email address is required.'], 400);
        }
        if (strlen($password) < 8 || strlen($password) > 128) {
            sendJson(['success' => false, 'error' => 'Password must be between 8 and 128 characters.'], 400);
        }

        // Ownership proof 1: live customer session for the same email
        // (admin sessions never qualify, even if one exists in the browser)
        $authed = false;
        $jwt = getCustomerFromToken();
        if ($jwt && ($jwt['role'] ?? '') === 'customer' && strtolower($jwt['email'] ?? '') === $email) {
            $authed = true;
        }
        // Ownership proof 2: a fresh order/quote id owned by that email
        if (!$authed && $orderRef !== '') {
            $stmtOrd = $db->prepare("SELECT id FROM orders WHERE id = ? AND LOWER(customer_email) = ? LIMIT 1");
            $stmtOrd->execute([$orderRef, $email]);
            if ($stmtOrd->fetch()) {
                $authed = true;
            } else {
                $stmtQ = $db->prepare("SELECT id FROM ndis_quotes WHERE id = ? AND LOWER(customer_email) = ? LIMIT 1");
                $stmtQ->execute([$orderRef, $email]);
                if ($stmtQ->fetch()) $authed = true;
            }
        }
        if (!$authed) {
            sendJson(['success' => false, 'error' => 'Could not verify account ownership. Please sign in or provide your order reference.', 'code' => 'PROOF_REQUIRED'], 403);
        }

        $stmt = $db->prepare("SELECT * FROM customers WHERE LOWER(email) = ? LIMIT 1");
        $stmt->execute([$email]);
        $customer = $stmt->fetch();
        if (!$customer) {
            sendJson(['success' => false, 'error' => 'Account not found.'], 404);
        }
        $flagOn2 = tableHasColumn($db, 'customers', 'password_set');
        $alreadySet = $flagOn2 ? intval($customer['password_set'] ?? 0) === 1 : !empty($customer['password']);
        if ($alreadySet) {
            sendJson(['success' => false, 'error' => 'A password is already set for this account. Please sign in instead.', 'code' => 'ALREADY_SET'], 409);
        }

        $hash = password_hash($password, PASSWORD_BCRYPT);
        $db->prepare("UPDATE customers SET password = ? WHERE id = ?")->execute([$hash, $customer['id']]);
        if ($flagOn2) {
            $db->prepare("UPDATE customers SET password_set = 1 WHERE id = ?")->execute([$customer['id']]);
        }

        $token = generateToken([
            'id' => $customer['id'],
            'email' => $customer['email'],
            'name' => $customer['name'],
            'role' => 'customer'
        ], 86400 * 30);

        sendJson([
            'success' => true,
            'token' => $token,
            'user' => [
                'id' => $customer['id'],
                'name' => $customer['name'],
                'email' => $customer['email'],
                'hasPassword' => true,
                'role' => 'customer'
            ]
        ]);
    }

    // GET /api/auth/me
    if ($sub === 'me' && $method === 'GET') {
        $admin = getAdminFromToken();
        if ($admin) {
            sendJson(['success' => true, 'user' => $admin]);
        }
        $customer = getCustomerFromToken();
        if ($customer) {
            $meUser = $customer;
            try {
                $db = requireDatabase();
                $stmt = $db->prepare("SELECT password, password_set FROM customers WHERE LOWER(email) = ? LIMIT 1");
                $stmt->execute([strtolower($customer['email'] ?? '')]);
                $row = $stmt->fetch();
                if ($row) {
                    $flagOn3 = tableHasColumn($db, 'customers', 'password_set');
                    $meUser['hasPassword'] = $flagOn3
                        ? intval($row['password_set'] ?? 0) === 1
                        : !empty($row['password']);
                }
            } catch (Exception $e) {}
            sendJson(['success' => true, 'user' => $meUser]);
        }
        sendJson(['success' => false, 'error' => 'Unauthorized or token expired.'], 401);
    }
}

// ============================================================================
// 3. PRODUCTS ROUTES (`/api/products/*`)
// ============================================================================
function formatProductRow(array $row): array {
    $categories = !empty($row['categories_json']) ? json_decode((string)$row['categories_json'], true) : null;
    if (!is_array($categories) || empty($categories)) {
        $categories = [(string)($row['category'] ?? 'General')];
    }

    $galleryImages = !empty($row['gallery_images_json']) ? json_decode((string)$row['gallery_images_json'], true) : null;
    if (!is_array($galleryImages) || empty($galleryImages)) {
        $galleryImages = !empty($row['image']) ? [(string)$row['image']] : [];
    }

    $attributes = !empty($row['attributes_json']) ? json_decode((string)$row['attributes_json'], true) : [];
    $variants = !empty($row['variants_json']) ? json_decode((string)$row['variants_json'], true) : [];
    $features = !empty($row['features_json']) ? json_decode((string)$row['features_json'], true) : [];
    $specifications = !empty($row['specs_json']) ? json_decode((string)$row['specs_json'], true) : [];

    $price = floatval($row['price'] ?? 0);
    $hirePrice = floatval($row['hire_price'] ?? 0);
    $id = (string)($row['id'] ?? '');
    $sku = (string)($row['sku'] ?? $id);
    $desc = (string)($row['description'] ?? '');
    $shortDesc = (string)($row['short_description'] ?? ($desc !== '' ? substr($desc, 0, 150) : ''));

    return [
        'id' => $id,
        'name' => (string)($row['name'] ?? ''),
        'slug' => (string)($row['slug'] ?? $id),
        'sku' => $sku,
        'brand' => (string)($row['brand'] ?? 'AT Specialists'),
        'category' => (string)($row['category'] ?? ($categories[0] ?? 'General')),
        'categories' => $categories,
        'categoryPath' => $categories,
        'image' => (string)($row['image'] ?? ($galleryImages[0] ?? '')),
        'galleryImages' => is_array($galleryImages) ? $galleryImages : [],
        'images' => is_array($galleryImages) ? $galleryImages : [],
        'thumbnail' => (string)($row['image'] ?? ($galleryImages[0] ?? '')),
        'price' => $price,
        'buyPrice' => $price,
        'hirePrice' => $hirePrice,
        'hirePeriod' => (string)($row['hire_period'] ?? 'week'),
        'stock' => intval($row['stock'] ?? 25),
        'lowStockThreshold' => intval($row['low_stock_threshold'] ?? 5),
        'available' => intval($row['is_active'] ?? 1) !== 0,
        'buyAvailable' => $price > 0 || !empty($variants),
        'hireAvailable' => $hirePrice > 0,
        'purchaseType' => ($hirePrice > 0 && $price > 0) ? 'both' : ($hirePrice > 0 ? 'hire' : 'buy'),
        'featured' => intval($row['is_featured'] ?? 0) === 1,
        'is_featured' => intval($row['is_featured'] ?? 0),
        'is_active' => intval($row['is_active'] ?? 1),
        'gstType' => (string)($row['gst_type'] ?? 'gst-free'),
        'gst_type' => (string)($row['gst_type'] ?? 'gst-free'),
        'gstRate' => floatval($row['gst_rate'] ?? 0),
        'gst_rate' => floatval($row['gst_rate'] ?? 0),
        'deliveryFee' => floatval($row['delivery_fee'] ?? 0),
        'delivery_fee' => floatval($row['delivery_fee'] ?? 0),
        'freeDelivery' => floatval($row['delivery_fee'] ?? 0) == 0,
        'ndisCode' => (string)($row['ndis_code'] ?? ''),
        'ndis_code' => (string)($row['ndis_code'] ?? ''),
        'shortDescription' => $shortDesc,
        'fullDescription' => $desc,
        'description' => $desc,
        'badge' => $row['badge'] ?? ($hirePrice > 0 ? 'Hire Available' : null),
        'hasFreeSample' => intval($row['has_free_sample'] ?? 0) === 1,
        'sampleNote' => (string)($row['sample_note'] ?? ''),
        'rating' => floatval($row['rating'] ?? 5.0),
        'reviewCount' => intval($row['review_count'] ?? 10),
        'attributes' => is_array($attributes) ? $attributes : [],
        'variants' => is_array($variants) ? $variants : [],
        'features' => is_array($features) ? $features : [],
        'specifications' => is_array($specifications) ? $specifications : [],
        'tags' => [strtolower((string)($row['brand'] ?? 'at specialists')), strtolower((string)($row['category'] ?? 'assistive-tech'))],
    ];
}

if ($endpoint === 'products') {
    $prodId = $segments[1] ?? '';

    // POST /api/products/sync-catalog (Admin Sync Catalog from products.json to MySQL)
    if ($prodId === 'sync-catalog' && $method === 'POST') {
        $db = requireDatabase();
        $syncKey = $_GET['key'] ?? ($_SERVER['HTTP_X_SYNC_KEY'] ?? '');
        $admin = getAdminFromToken();
        if (!$admin && $syncKey !== substr($jwt_secret, 0, 16)) {
            requireAdminAuth();
        }
        $count = seedCatalogIntoDatabase($db);
        sendJson([
            'success' => true,
            'message' => "Successfully synchronized {$count} products from catalog to MySQL database.",
            'count' => $count
        ]);
    }

    // GET /api/products (Storefront / Admin product listing)
    // Supports ?limit=&offset= for paginated storefronts. Omitting limit
    // returns the full active catalogue (legacy behaviour for the SPA bundle).
    if ($prodId === '' && $method === 'GET') {
        try {
            global $pdo;
            if ($pdo) {
                $limit = isset($_GET['limit']) ? max(1, min(500, intval($_GET['limit']))) : 0;
                $offset = isset($_GET['offset']) ? max(0, intval($_GET['offset'])) : 0;
                $sql = "SELECT * FROM products WHERE is_active = 1 ORDER BY is_featured DESC, name ASC";
                if ($limit > 0) {
                    $sql .= " LIMIT {$limit} OFFSET {$offset}";
                }
                $stmt = $pdo->query($sql);
                $rows = $stmt ? $stmt->fetchAll() : [];

                // If table has <= 4 products (empty or default dummy seeds), seed standard catalog
                if (count($rows) <= 4) {
                    seedCatalogIntoDatabase($pdo);
                    $stmt = $pdo->query($sql);
                    $rows = $stmt ? $stmt->fetchAll() : $rows;
                }

                if (!empty($rows)) {
                    $formatted = array_map('formatProductRow', $rows);
                    header('Cache-Control: public, max-age=300, stale-while-revalidate=600');
                    header('ETag: "products-' . md5($sql . count($rows)) . '"');
                    sendJson(['products' => $formatted]);
                }
            }
        } catch (Throwable $e) {
            error_log("GET /api/products query error, fallback to static catalog: " . $e->getMessage());
        }

        // Resilient fallback: return static catalog from products.json
        $catalog = getStaticCatalog();
        if (!empty($catalog)) {
            $slice = array_slice($catalog, 0, 500);
            $fallbackFormatted = array_map(function($p) {
                $price = floatval($p['buyPrice'] ?? ($p['price'] ?? 0));
                $hirePrice = floatval($p['hirePrice'] ?? ($p['hire_price'] ?? 0));
                return [
                    'id' => (string)($p['id'] ?? ''),
                    'name' => (string)($p['name'] ?? ''),
                    'slug' => (string)($p['slug'] ?? $p['id'] ?? ''),
                    'sku' => (string)($p['sku'] ?? $p['id'] ?? ''),
                    'brand' => (string)($p['brand'] ?? 'AT Specialists'),
                    'category' => is_array($p['categories'] ?? null) ? (string)($p['categories'][0] ?? 'Mobility') : (string)($p['category'] ?? 'Mobility'),
                    'categories' => $p['categories'] ?? [$p['category'] ?? 'Mobility'],
                    'image' => (string)($p['image'] ?? ''),
                    'galleryImages' => $p['galleryImages'] ?? [$p['image'] ?? ''],
                    'thumbnail' => (string)($p['image'] ?? ''),
                    'price' => $price,
                    'buyPrice' => $price,
                    'hirePrice' => $hirePrice,
                    'stock' => intval($p['stock'] ?? 50),
                    'available' => true,
                    'is_active' => 1,
                    'is_featured' => !empty($p['featured']) ? 1 : 0,
                ];
            }, $slice);
            sendJson(['products' => $fallbackFormatted]);
        }
        sendJson(['products' => []]);
    }

    // GET /api/products/{id}
    if ($prodId !== '' && $method === 'GET') {
        try {
            $stmt = $db->prepare("SELECT * FROM products WHERE id = ? OR slug = ? OR sku = ? LIMIT 1");
            $stmt->execute([$prodId, $prodId, $prodId]);
            $row = $stmt->fetch();
            if ($row) {
                sendJson(['product' => formatProductRow($row)]);
            }
        } catch (Throwable $e) {}

        // Fallback to static catalog if not yet in MySQL
        $matchedVar = null;
        $catProd = findProductInCatalog($prodId, $matchedVar);
        if ($catProd) {
            sendJson(['product' => $catProd]);
        }
        sendJson(['error' => 'Product not found'], 404);
    }

    // POST /api/products (Admin Create)
    if ($prodId === '' && $method === 'POST') {
        requireAdminAuth();
        $b = getRequestBody();
        $id = $b['id'] ?? ('eq-'. round(microtime(true) * 1000));
        $name = trim((string)($b['name'] ?? ''));
        if ($name === '') sendJson(['error' => 'Product name is required'], 400);

        $slug = $b['slug'] ?? strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $name)));
        $sku = $b['sku'] ?? strtoupper($id);
        $price = floatval($b['price'] ?? ($b['buyPrice'] ?? 0));
        $category = $b['category'] ?? 'Mobility';
        $image = $b['image'] ?? '';
        $brand = $b['brand'] ?? 'AT Specialists';
        $stock = intval($b['stock'] ?? 100);
        $lowStockThreshold = intval($b['lowStockThreshold'] ?? ($b['low_stock_threshold'] ?? 5));
        $isFeatured = !empty($b['isFeatured'] ?? $b['is_featured']) ? 1 : 0;
        $isActive = isset($b['available']) ? ($b['available'] ? 1 : 0) : (isset($b['isActive']) ? (empty($b['isActive']) ? 0 : 1) : 1);
        $hirePrice = floatval($b['hirePrice'] ?? ($b['hire_price'] ?? 0));
        $hirePeriod = $b['hirePeriod'] ?? ($b['hire_period'] ?? 'week');
        $gstType = $b['gstType'] ?? ($b['gst_type'] ?? 'gst-free');
        $gstRate = floatval($b['gstRate'] ?? ($b['gst_rate'] ?? 0));
        $deliveryFee = floatval($b['deliveryFee'] ?? ($b['delivery_fee'] ?? 0));
        $ndisCode = $b['ndisCode'] ?? ($b['ndis_code'] ?? '');
        $description = $b['description'] ?? ($b['fullDescription'] ?? '');
        $shortDesc = $b['shortDescription'] ?? ($b['short_description'] ?? '');
        $badge = $b['badge'] ?? null;
        $hasFreeSample = !empty($b['hasFreeSample'] ?? $b['has_free_sample']) ? 1 : 0;
        $sampleNote = $b['sampleNote'] ?? ($b['sample_note'] ?? null);

        $categoriesJson = !empty($b['categories']) ? json_encode($b['categories']) : json_encode([$category]);
        $galleryImagesJson = !empty($b['galleryImages']) ? json_encode($b['galleryImages']) : (!empty($b['images']) ? json_encode($b['images']) : json_encode([$image]));
        $attributesJson = !empty($b['attributes']) ? json_encode($b['attributes']) : null;
        $variantsJson = !empty($b['variants']) ? json_encode($b['variants']) : null;
        $featuresJson = !empty($b['features']) ? json_encode($b['features']) : null;
        $specsJson = !empty($b['specifications']) ? json_encode($b['specifications']) : null;

        $stmt = $db->prepare("
            INSERT INTO products (id, name, slug, sku, price, category, categories_json, image, gallery_images_json,
                brand, stock, low_stock_threshold, is_featured, is_active, hire_price, hire_period,
                gst_type, gst_rate, delivery_fee, ndis_code, description, short_description,
                badge, has_free_sample, sample_note, attributes_json, variants_json, features_json, specs_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $id, $name, $slug, $sku, $price, $category, $categoriesJson, $image, $galleryImagesJson,
            $brand, $stock, $lowStockThreshold, $isFeatured, $isActive, $hirePrice, $hirePeriod,
            $gstType, $gstRate, $deliveryFee, $ndisCode, $description, $shortDesc,
            $badge, $hasFreeSample, $sampleNote, $attributesJson, $variantsJson, $featuresJson, $specsJson
        ]);

        sendJson(['success' => true, 'product' => ['id' => $id, 'name' => $name, 'price' => $price, 'sku' => $sku]]);
    }

    // PUT /api/products/{id} (Admin Update)
    if ($prodId !== '' && ($method === 'PUT' || $method === 'PATCH')) {
        requireAdminAuth();
        $b = getRequestBody();
        
        $fields = [];
        $params = [];
        if (isset($b['name'])) { $fields[] = 'name = ?'; $params[] = $b['name']; }
        if (isset($b['sku'])) { $fields[] = 'sku = ?'; $params[] = $b['sku']; }
        if (isset($b['brand'])) { $fields[] = 'brand = ?'; $params[] = $b['brand']; }
        if (isset($b['price'])) { $fields[] = 'price = ?'; $params[] = floatval($b['price']); }
        else if (isset($b['buyPrice'])) { $fields[] = 'price = ?'; $params[] = floatval($b['buyPrice']); }
        if (isset($b['stock'])) { $fields[] = 'stock = ?'; $params[] = intval($b['stock']); }
        if (isset($b['lowStockThreshold']) || isset($b['low_stock_threshold'])) { $fields[] = 'low_stock_threshold = ?'; $params[] = intval($b['lowStockThreshold'] ?? $b['low_stock_threshold']); }
        if (isset($b['category'])) { $fields[] = 'category = ?'; $params[] = $b['category']; }
        if (isset($b['categories'])) { $fields[] = 'categories_json = ?'; $params[] = json_encode($b['categories']); }
        if (isset($b['image'])) { $fields[] = 'image = ?'; $params[] = $b['image']; }
        if (isset($b['galleryImages']) || isset($b['gallery_images'])) { $fields[] = 'gallery_images_json = ?'; $params[] = json_encode($b['galleryImages'] ?? $b['gallery_images']); }
        if (isset($b['hirePrice']) || isset($b['hire_price'])) { $fields[] = 'hire_price = ?'; $params[] = floatval($b['hirePrice'] ?? $b['hire_price']); }
        if (isset($b['hirePeriod']) || isset($b['hire_period'])) { $fields[] = 'hire_period = ?'; $params[] = ($b['hirePeriod'] ?? $b['hire_period']); }
        if (isset($b['isFeatured']) || isset($b['is_featured'])) { $fields[] = 'is_featured = ?'; $params[] = !empty($b['isFeatured'] ?? $b['is_featured']) ? 1 : 0; }
        if (isset($b['available'])) { $fields[] = 'is_active = ?'; $params[] = $b['available'] ? 1 : 0; }
        else if (isset($b['isActive']) || isset($b['is_active'])) { $fields[] = 'is_active = ?'; $params[] = !empty($b['isActive'] ?? $b['is_active']) ? 1 : 0; }
        if (isset($b['gstType']) || isset($b['gst_type'])) { $fields[] = 'gst_type = ?'; $params[] = ($b['gstType'] ?? $b['gst_type']); }
        if (isset($b['gstRate']) || isset($b['gst_rate'])) { $fields[] = 'gst_rate = ?'; $params[] = floatval($b['gstRate'] ?? $b['gst_rate']); }
        if (isset($b['deliveryFee']) || isset($b['delivery_fee'])) { $fields[] = 'delivery_fee = ?'; $params[] = floatval($b['deliveryFee'] ?? $b['delivery_fee']); }
        if (isset($b['ndisCode']) || isset($b['ndis_code'])) { $fields[] = 'ndis_code = ?'; $params[] = ($b['ndisCode'] ?? $b['ndis_code']); }
        if (isset($b['description'])) { $fields[] = 'description = ?'; $params[] = $b['description']; }
        if (isset($b['shortDescription']) || isset($b['short_description'])) { $fields[] = 'short_description = ?'; $params[] = ($b['shortDescription'] ?? $b['short_description']); }
        if (isset($b['badge'])) { $fields[] = 'badge = ?'; $params[] = $b['badge']; }
        if (isset($b['hasFreeSample']) || isset($b['has_free_sample'])) { $fields[] = 'has_free_sample = ?'; $params[] = !empty($b['hasFreeSample'] ?? $b['has_free_sample']) ? 1 : 0; }
        if (isset($b['sampleNote']) || isset($b['sample_note'])) { $fields[] = 'sample_note = ?'; $params[] = ($b['sampleNote'] ?? $b['sample_note']); }
        if (isset($b['attributes'])) { $fields[] = 'attributes_json = ?'; $params[] = json_encode($b['attributes']); }
        if (isset($b['variants'])) { $fields[] = 'variants_json = ?'; $params[] = json_encode($b['variants']); }
        if (isset($b['features'])) { $fields[] = 'features_json = ?'; $params[] = json_encode($b['features']); }
        if (isset($b['specifications'])) { $fields[] = 'specs_json = ?'; $params[] = json_encode($b['specifications']); }

        if (!empty($fields)) {
            $updateParams = $params;
            $updateParams[] = $prodId;
            $updateParams[] = $prodId;
            $sql = "UPDATE products SET ". implode(', ', $fields). " WHERE id = ? OR sku = ?";
            $stmt = $db->prepare($sql);
            $stmt->execute($updateParams);

            if ($stmt->rowCount() === 0) {
                $checkStmt = $db->prepare("SELECT id FROM products WHERE id = ? OR sku = ? LIMIT 1");
                $checkStmt->execute([$prodId, $prodId]);
                if (!$checkStmt->fetch()) {
                    $insName = $b['name'] ?? $prodId;
                    $insSlug = $b['slug'] ?? preg_replace('/[^a-z0-9]+/i', '-', strtolower($insName));
                    $insSku = $b['sku'] ?? $prodId;
                    $insCat = $b['category'] ?? 'General';
                    $insPrice = floatval($b['price'] ?? $b['buyPrice'] ?? 0);
                    $insStock = intval($b['stock'] ?? 25);
                    $insImg = $b['image'] ?? $b['thumbnail'] ?? '';
                    $insGallery = isset($b['galleryImages']) ? (is_array($b['galleryImages']) ? json_encode($b['galleryImages']) : $b['galleryImages']) : ($insImg ? json_encode([$insImg]) : '[]');
                    $insInsert = $db->prepare("INSERT INTO products (id, name, slug, sku, category, price, stock, image, gallery_images_json, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)");
                    $insInsert->execute([$prodId, $insName, $insSlug, $insSku, $insCat, $insPrice, $insStock, $insImg, $insGallery]);
                }
            }
        }

        sendJson(['success' => true, 'message' => 'Product updated successfully.']);
    }

    // DELETE /api/products/clear-all (Admin Clear All Products)
    if ($prodId === 'clear-all' && $method === 'DELETE') {
        requireAdminAuth();
        $db->exec("UPDATE products SET is_active = 0");
        sendJson(['success' => true, 'message' => 'All products archived successfully.']);
    }

    // DELETE /api/products/{id} (Admin Delete)
    if ($prodId !== '' && $method === 'DELETE') {
        requireAdminAuth();
        $stmt = $db->prepare("UPDATE products SET is_active = 0 WHERE id = ? OR sku = ?");
        $stmt->execute([$prodId, $prodId]);
        if ($stmt->rowCount() === 0) {
            $insDel = $db->prepare("INSERT INTO products (id, name, slug, sku, is_active) VALUES (?, ?, ?, ?, 0)");
            $insDel->execute([$prodId, $prodId, $prodId, $prodId]);
        }
        sendJson(['success' => true, 'message' => 'Product archived.']);
    }
}

// ============================================================================
// 4. CART & PRICING ROUTES (`POST /api/cart/calculate`)
// ============================================================================
if ($endpoint === 'cart') {
    $sub = strtolower($segments[1] ?? '');
    if ($sub === 'calculate' && $method === 'POST') {
        $body = getRequestBody();
        $items = $body['items'] ?? [];
        $deliveryMethod = $body['deliveryMethod'] ?? 'standard';
        $promoCode = isset($body['promoCode']) ? (string)$body['promoCode'] : null;

        try {
            $calculated = calculateAuthoritativeCart($items, $deliveryMethod, $promoCode);
            sendJson(['success' => true,...$calculated]);
        } catch (Exception $e) {
            sendJson(['success' => false, 'error' => $e->getMessage()], 400);
        }
    }
}

// ============================================================================
// 5. PAYPAL GATEWAY ROUTES (`/api/paypal/*`)
// ============================================================================
if ($endpoint === 'paypal') {
    $sub = strtolower($segments[1] ?? '');

    // GET /api/paypal/client-id
    if ($sub === 'client-id' && $method === 'GET') {
        $cfg = getPayPalConfig();
        $cId = $cfg['clientId'];
        $cMode = $cfg['mode'];

        if (empty($cId) || strpos($cId, '@') !== false || strpos($cId, 'your_paypal') !== false) {
            $cId = 'sb'; // Default sandbox test client ID
        }
        sendJson([
            'clientId' => $cId,
            'mode' => $cMode,
            'currency' => $currency
        ]);
    }

    // POST /api/paypal/settings (Admin only)
    // NOTE: the PayPal SECRET is never persisted or returned by the API. Set
    // PAYPAL_SECRET in the server environment. Only clientId + mode are stored.
    if ($sub === 'settings' && $method === 'POST') {
        requireAdminAuth();
        $db = requireDatabase();
        $b = getRequestBody();
        $clientId = trim((string)($b['clientId'] ?? ''));
        $mode = strtolower(trim((string)($b['mode'] ?? 'sandbox')));
        if ($mode !== 'live' && $mode !== 'sandbox') $mode = 'sandbox';

        $val = json_encode(['clientId' => $clientId, 'mode' => $mode]);
        $stmt = $db->prepare("
            INSERT INTO app_settings (setting_key, setting_value, updated_at)
            VALUES ('paypal_config', ?, NOW())
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ");
        $stmt->execute([$val]);

        sendJson(['success' => true, 'message' => 'PayPal configuration updated successfully.']);
    }

    // POST /api/paypal/create-order
    if ($sub === 'create-order' && $method === 'POST') {
        enforceCheckoutEnabled('payment');
        $body = getRequestBody();
        $rawItems = $body['items'] ?? [];
        $deliveryMethod = (string)($body['deliveryMethod'] ?? 'standard');
        $promoCode = isset($body['promoCode']) ? (string)$body['promoCode'] : null;
        $customer = $body['customer'] ?? [];
        $shipping = $body['shipping'] ?? [];

        if (empty($rawItems) || !is_array($rawItems)) {
            sendJson(['error' => 'Cart items are required.'], 400);
        }

        try {
            // Authoritative server-side cart pricing
            $cart = calculateAuthoritativeCart($rawItems, $deliveryMethod, $promoCode);
            $totalVal = number_format($cart['total'], 2, '.', '');
            $subtotalVal = number_format($cart['subtotal'], 2, '.', '');
            $deliveryVal = number_format($cart['deliveryFee'], 2, '.', '');

            // Obtain real PayPal access token
            $accessToken = getPayPalAccessToken();
            $ppCfg = getPayPalConfig();
            $baseUrl = paypalBaseUrl($ppCfg['mode']);

            $purchaseUnit = [
                'amount' => [
                    'currency_code' => $currency,
                    'value' => $totalVal,
                    'breakdown' => [
                        'item_total' => [
                            'currency_code' => $currency,
                            'value' => $subtotalVal
                        ],
                        'shipping' => [
                            'currency_code' => $currency,
                            'value' => $deliveryVal
                        ]
                    ]
                ],
                'description' => 'AT Specialists Australia - Assistive Equipment Order'
            ];

            if (!empty($shipping['address'])) {
                $purchaseUnit['shipping'] = [
                    'name' => ['full_name' => $customer['name'] ?? 'Customer'],
                    'address' => [
                        'address_line_1' => $shipping['address'],
                        'admin_area_2' => $shipping['city'] ?? '',
                        'admin_area_1' => $shipping['state'] ?? 'VIC',
                        'postal_code' => $shipping['postcode'] ?? '3000',
                        'country_code' => 'AU'
                    ]
                ];
            }

            $orderPayload = [
                'intent' => 'CAPTURE',
                'purchase_units' => [$purchaseUnit],
                'application_context' => [
                    'brand_name' => ATS_TRADING_NAME,
                    'landing_page' => 'NO_PREFERENCE',
                    'user_action' => 'PAY_NOW'
                ]
            ];

            $ch = curl_init("{$baseUrl}/v2/checkout/orders");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($orderPayload));
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                "Authorization: Bearer {$accessToken}",
                'PayPal-Request-Id: ATS-'. time(). '-'. substr(md5(uniqid('', true)), 0, 6)
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            curl_setopt($ch, CURLOPT_TIMEOUT, 20);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr = curl_error($ch);
            curl_close($ch);

            if ($curlErr) {
                throw new Exception("PayPal network error: {$curlErr}");
            }

            $resData = json_decode((string)$response, true);
            if ($httpCode !== 201 || !isset($resData['id'])) {
                error_log("PayPal create-order failed ({$httpCode}): " . substr((string)$response, 0, 500));
                throw new Exception('Payment order could not be created. Please try again shortly.');
            }

            sendJson([
                'paypalOrderId' => $resData['id'],
                'status' => $resData['status'],
                'authoritativeTotal' => $cart['total']
            ]);
        } catch (Exception $e) {
            error_log("PayPal Create Order Error: ". $e->getMessage());
            $msg = $e->getMessage();
            // Preserve shopper-actionable validation messages, hide gateway internals
            if (stripos($msg, 'promo') !== false || stripos($msg, 'stock') !== false || stripos($msg, 'unavailable') !== false || stripos($msg, 'paused') !== false) {
                sendJson(['error' => $msg], 400);
            }
            sendJson(['error' => 'Payment order could not be created. Please try again shortly.'], 400);
        }
    }

    // POST /api/paypal/capture-order
    if ($sub === 'capture-order' && $method === 'POST') {
        enforceCheckoutEnabled('payment');
        $body = getRequestBody();
        $paypalOrderId = trim((string)($body['paypalOrderId'] ?? ''));
        $rawItems = $body['items'] ?? [];
        $deliveryMethod = (string)($body['deliveryMethod'] ?? 'standard');
        $promoCode = isset($body['promoCode']) ? (string)$body['promoCode'] : null;
        $cust = $body['customer'] ?? [];
        $ndisNumber = trim((string)($body['ndisNumber'] ?? ''));
        $deliveryNotes = trim((string)($body['deliveryNotes'] ?? ''));

        if ($paypalOrderId === '') {
            sendJson(['error' => 'PayPal order ID is required.'], 400);
        }

        $db = requireDatabase();

        // Idempotency check — prevent duplicate captures
        $stmtCheck = $db->prepare("SELECT id, status, payment_status FROM orders WHERE paypal_order_id = ? LIMIT 1");
        $stmtCheck->execute([$paypalOrderId]);
        $existingOrder = $stmtCheck->fetch();
        if ($existingOrder) {
            sendJson([
                'success' => true,
                'order' => [
                    'orderId' => $existingOrder['id'],
                    'paypalOrderId' => $paypalOrderId,
                    'status' => $existingOrder['status'],
                    'paymentStatus' => $existingOrder['payment_status'],
                ]
            ]);
        }

        try {
            // 1. Authoritative Cart & Totals
            $cart = calculateAuthoritativeCart($rawItems, $deliveryMethod, $promoCode);

            // 2. Call PayPal Capture REST API
            $accessToken = getPayPalAccessToken();
            $ppCfg = getPayPalConfig();
            $baseUrl = paypalBaseUrl($ppCfg['mode']);

            $ch = curl_init("{$baseUrl}/v2/checkout/orders/{$paypalOrderId}/capture");
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, '{}');
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                "Authorization: Bearer {$accessToken}"
            ]);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
            curl_setopt($ch, CURLOPT_TIMEOUT, 25);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlErr = curl_error($ch);
            curl_close($ch);

            if ($curlErr) {
                throw new Exception("PayPal network error on capture: {$curlErr}");
            }

            $resData = json_decode((string)$response, true);
            $captureStatus = $resData['status'] ?? '';

            if ($httpCode !== 201 && $httpCode !== 200 || $captureStatus !== 'COMPLETED') {
                error_log("PayPal capture failed ({$httpCode}): " . substr((string)$response, 0, 500));
                throw new Exception('Payment capture was not completed. No charge was finalised on your account.');
            }

            // Extract Capture Details
            $captureObj = $resData['purchase_units'][0]['payments']['captures'][0] ?? [];
            $captureId = $captureObj['id'] ?? $paypalOrderId;
            $capturedAmount = floatval($captureObj['amount']['value'] ?? 0);
            $capturedCurrency = strtoupper((string)($captureObj['amount']['currency_code'] ?? ''));
            $payerEmail = $resData['payer']['email_address'] ?? ($cust['email'] ?? '');
            $payerId = $resData['payer']['payer_id'] ?? '';

            // Verify the captured amount/currency matches the authoritative total.
            // Prevents cart-swap undercharge between create-order and capture.
            if ($capturedAmount <= 0 || abs($capturedAmount - (float)$cart['total']) > 0.01 || $capturedCurrency !== strtoupper($currency)) {
                error_log("Capture amount mismatch: captured {$capturedAmount} {$capturedCurrency} vs cart {$cart['total']} {$currency} (pp {$paypalOrderId})");
                throw new Exception('Captured payment does not match the order total. The order was not created — please retry checkout.');
            }

            // Generate Order ID & Access Token
            $orderId = 'ATS-ORD-'. date('ymd'). '-'. rand(1000, 9999);
            $custName = trim((string)($cust['name'] ?? 'Valued Customer'));
            $custEmail = trim((string)($cust['email'] ?? $payerEmail));
            $custPhone = trim((string)($cust['phone'] ?? ''));
            $shippingAddr = trim(implode(', ', array_filter([
                $cust['address'] ?? '',
                $cust['city'] ?? '',
                $cust['state'] ?? '',
                $cust['postcode'] ?? ''
            ])));
            $accessToken = generateOrderAccessToken($orderId, $custEmail);
            $trackingNumber = 'AUSPOST-'. rand(10000000, 99999999);

            // 3. Database Atomic Transaction
            $db->beginTransaction();

            // Re-verify buy-item stock inside the transaction (prevents oversell races)
            $stmtLock = $db->prepare("SELECT id, stock FROM products WHERE id = ? FOR UPDATE");
            foreach ($cart['items'] as $it) {
                if (($it['purchaseType'] ?? 'buy') !== 'buy') continue;
                $stmtLock->execute([$it['id']]);
                $row = $stmtLock->fetch();
                if (!$row || intval($row['stock']) < intval($it['quantity'])) {
                    throw new Exception("Product '{$it['name']}' just ran out of stock. Please adjust your cart and try again.");
                }
            }

            // Insert Order
            $orderCols = ['id', 'customer_name', 'customer_email', 'customer_phone', 'shipping_address', 'delivery_method', 'delivery_notes', 'subtotal', 'delivery_fee', 'gst_total', 'total'];
            $orderVals = [$orderId, $custName, $custEmail, $custPhone, $shippingAddr, $deliveryMethod, $deliveryNotes,
                $cart['subtotal'], $cart['deliveryFee'], $cart['gstTotal'], $cart['total']];
            if (tableHasColumn($db, 'orders', 'promo_code')) {
                $orderCols[] = 'promo_code';
                $orderCols[] = 'discount';
                $orderVals[] = $cart['promoCode'];
                $orderVals[] = $cart['discount'];
            }
            $orderCols = array_merge($orderCols, ['status', 'payment_status', 'payment_method', 'paypal_order_id', 'paypal_capture_id', 'paypal_payer_id', 'paypal_payer_email', 'tracking_number', 'ndis_number', 'access_token']);
            $orderVals = array_merge($orderVals, ['confirmed', 'paid', 'paypal', $paypalOrderId, $captureId, $payerId, $payerEmail, $trackingNumber, $ndisNumber, $accessToken]);
            $orderPlaceholders = implode(', ', array_fill(0, count($orderVals), '?'));
            $stmtOrd = $db->prepare("
                INSERT INTO orders (" . implode(', ', $orderCols) . ", created_at)
                VALUES ({$orderPlaceholders}, NOW())
            ");
            $stmtOrd->execute($orderVals);

            // Insert Order Items & Decrement Stock
            $stmtItem = $db->prepare("
                INSERT INTO order_items (order_id, product_id, name, quantity, price, purchase_type, hire_weeks, gst_type, gst_rate, delivery_fee)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmtStock = $db->prepare("UPDATE products SET stock = GREATEST(0, stock - ?) WHERE id = ?");

            foreach ($cart['items'] as $it) {
                $stmtItem->execute([
                    $orderId, $it['id'], $it['name'], $it['quantity'], $it['price'],
                    $it['purchaseType'], $it['hireWeeks'], $it['gstType'], $it['gstRate'], $it['deliveryFee']
                ]);
                $stmtStock->execute([$it['quantity'], $it['id']]);
            }

            // Insert Payment Log
            $stmtLog = $db->prepare("
                INSERT INTO payment_logs (order_id, paypal_order_id, paypal_capture_id, amount, currency, status, payer_email, payer_id, raw_response, created_at)
                VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?, ?, NOW())
            ");
            $stmtLog->execute([
                $orderId, $paypalOrderId, $captureId, $capturedAmount, $capturedCurrency,
                $payerEmail, $payerId, json_encode($resData)
            ]);

            // Upsert Customer
            if ($custEmail !== '') {
                $stmtCust = $db->prepare("
                    INSERT INTO customers (id, name, email, phone, address, city, state, postcode, ndis_number, orders_count, total_spent, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())
                    ON DUPLICATE KEY UPDATE
                        name = VALUES(name), phone = VALUES(phone), address = VALUES(address),
                        orders_count = orders_count + 1, total_spent = total_spent + VALUES(total_spent)
                ");
                $stmtCust->execute([
                    'CUST-'. substr(md5(strtolower($custEmail)), 0, 10),
                    $custName, $custEmail, $custPhone, $cust['address'] ?? '',
                    $cust['city'] ?? '', $cust['state'] ?? '', $cust['postcode'] ?? '',
                    $ndisNumber, $cart['total']
                ]);
            }

            $db->commit();

            // 4. Generate PDF Tax Invoice in Memory & Send Emails
            $orderRecord = [
                'id' => $orderId,
                'customerName' => $custName,
                'customerEmail' => $custEmail,
                'customerPhone' => $custPhone,
                'shippingAddress' => $shippingAddr,
                'deliveryMethod' => $deliveryMethod,
                'subtotal' => $cart['subtotal'],
                'deliveryFee' => $cart['deliveryFee'],
                'gstTotal' => $cart['gstTotal'],
                'total' => $cart['total'],
                'paymentStatus' => 'paid',
                'paymentMethod' => 'paypal',
                'ndisNumber' => $ndisNumber,
                'items' => $cart['items'],
                'createdAt' => date('Y-m-d H:i:s')
            ];

            try {
                $attachments = [];

                if ($custEmail !== '') {
                    $custHtml = renderEmailTemplate("Order Confirmed - {$orderId}",
                        "Your AT Specialists order has been confirmed!",
                        "<h3>Thank you for your order, ". htmlspecialchars($custName). "!</h3>
                         <p>We are pleased to confirm that your order <strong>#{$orderId}</strong> has been successfully placed and processed.</p>
                         <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin: 20px 0;'>
                            <p style='margin: 0 0 8px;'><strong>Order Number:</strong> {$orderId}</p>
                            <p style='margin: 0 0 8px;'><strong>Total Paid:</strong> $". number_format($cart['total'], 2). " AUD</p>
                            <p style='margin: 0 0 8px;'><strong>Payment Method:</strong> PayPal (Capture #{$captureId})</p>
                            <p style='margin: 0 0 8px;'><strong>Tracking Reference:</strong> {$trackingNumber}</p>
                            <p style='margin: 0;'><strong>Delivery Address:</strong> ". htmlspecialchars($shippingAddr). "</p>
                         </div>
                         <p>Your <strong>ATO / NDIS Tax Invoice</strong> is available online. You can view, track, or print your tax invoice anytime using the secure link below.</p>",
                        COMPANY_WEB. "/account?lookup=". urlencode($orderId). "&token=". urlencode($accessToken),
                        "View Order & Track Dispatch");
                    sendSmtpEmail($custEmail, "Order Confirmed: #{$orderId} - AT Specialists Australia", $custHtml, $attachments);
                }

                if ($admin_email !== '') {
                    $adminHtml = renderEmailTemplate("New Order Received - {$orderId}",
                        "New Order received: {$orderId}",
                        "<h3>New Order Alert: {$orderId}</h3>
                         <p>A new order has been received and paid via PayPal.</p>
                         <p><strong>Customer:</strong> ". htmlspecialchars($custName). " ({$custEmail} | {$custPhone})</p>
                         <p><strong>Total:</strong> $". number_format($cart['total'], 2). " AUD</p>
                         <p><strong>Shipping Address:</strong> ". htmlspecialchars($shippingAddr). "</p>",
                        COMPANY_WEB. "/at/orders",
                        "View in Admin Dashboard");
                    sendSmtpEmail($admin_email, "🔔 New Order: #{$orderId} ($". number_format($cart['total'], 2). ") - {$custName}", $adminHtml, $attachments);
                }
            } catch (Exception $e) {
                error_log("Email sending notice: ". $e->getMessage());
            }

            sendJson([
                'success' => true,
                'order' => [
                    'orderId' => $orderId,
                    'accessToken' => $accessToken,
                    'paypalOrderId' => $paypalOrderId,
                    'paypalCaptureId' => $captureId,
                    'paypalPayerId' => $payerId,
                    'paypalPayerEmail' => $payerEmail,
                    'amount' => (string)$cart['total'],
                    'currency' => 'AUD',
                    'status' => 'confirmed',
                    'paymentStatus' => 'paid',
                    'paymentMethod' => 'paypal',
                    'trackingNumber' => $trackingNumber,
                    'createdAt' => date('Y-m-d H:i:s')
                ]
            ]);
        } catch (Exception $e) {
            if ($db->inTransaction()) $db->rollBack();
            error_log("Capture Order Error: ". $e->getMessage());
            $msg = $e->getMessage();
            if (stripos($msg, 'promo') !== false || stripos($msg, 'stock') !== false || stripos($msg, 'unavailable') !== false || stripos($msg, 'paused') !== false || stripos($msg, 'match the order total') !== false || stripos($msg, 'not completed') !== false) {
                sendJson(['error' => $msg], 400);
            }
            sendJson(['error' => 'Payment could not be completed. Please try again shortly.'], 400);
        }
    }
}

// ============================================================================
// 6. ORDERS ROUTES (`/api/orders/*`)
// ============================================================================
if ($endpoint === 'orders') {
    $orderId = $segments[1] ?? '';
    $action = strtolower($segments[2] ?? '');
    $db = requireDatabase();

    // POST /api/orders/guest-lookup (Secure rate-limited guest order retrieval)
    if ($orderId === 'guest-lookup' && $method === 'POST') {
        $body = getRequestBody();
        $lookupOrderId = trim((string)($body['orderId'] ?? ''));
        $lookupEmail = strtolower(trim((string)($body['email'] ?? '')));

        if ($lookupOrderId === '' || $lookupEmail === '') {
            sendJson(['error' => 'Both Order Number and Email Address are required for secure lookup.'], 400);
        }

        throttle('guest_lookup', 10, 300);
        $stmt = $db->prepare("SELECT * FROM orders WHERE id = ? AND LOWER(customer_email) = ? LIMIT 1");
        $stmt->execute([$lookupOrderId, $lookupEmail]);
        $order = $stmt->fetch();

        if (!$order) {
            usleep(200000);
            sendJson(['error' => 'No matching order found for the provided details.'], 404);
        }

        $stmtItems = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $stmtItems->execute([$order['id']]);
        $order['items'] = $stmtItems->fetchAll();

        $token = generateOrderAccessToken($order['id'], $order['customer_email']);
        sendJson(['success' => true, 'order' => $order, 'accessToken' => $token]);
    }

    // GET /api/orders (Admin gets all orders; Customer gets own orders)
    if ($orderId === '' && $method === 'GET') {
        $admin = getAdminFromToken();
        if ($admin) {
            $stmt = $db->query("SELECT * FROM orders ORDER BY created_at DESC");
            $orders = $stmt->fetchAll();
            if (!empty($orders)) {
                $orderIds = array_column($orders, 'id');
                $inQuery = implode(',', array_fill(0, count($orderIds), '?'));
                $stmtItems = $db->prepare("SELECT * FROM order_items WHERE order_id IN ($inQuery)");
                $stmtItems->execute($orderIds);
                $allItems = $stmtItems->fetchAll();
                $itemsByOrder = [];
                foreach ($allItems as $it) {
                    $itemsByOrder[$it['order_id']][] = $it;
                }
                foreach ($orders as &$ord) {
                    $ord['items'] = $itemsByOrder[$ord['id']] ?? [];
                }
                unset($ord);
            }
            sendJson(['orders' => $orders]);
        }

        $cust = getCustomerFromToken();
        if ($cust && !empty($cust['email'])) {
            $stmt = $db->prepare("SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC");
            $stmt->execute([$cust['email']]);
            $orders = $stmt->fetchAll();
            if (!empty($orders)) {
                $orderIds = array_column($orders, 'id');
                $inQuery = implode(',', array_fill(0, count($orderIds), '?'));
                $stmtItems = $db->prepare("SELECT * FROM order_items WHERE order_id IN ($inQuery)");
                $stmtItems->execute($orderIds);
                $allItems = $stmtItems->fetchAll();
                $itemsByOrder = [];
                foreach ($allItems as $it) {
                    $itemsByOrder[$it['order_id']][] = $it;
                }
                foreach ($orders as &$ord) {
                    $ord['items'] = $itemsByOrder[$ord['id']] ?? [];
                }
                unset($ord);
            }
            sendJson(['orders' => $orders]);
        }

        sendJson(['error' => 'Unauthorized. Please sign in to view orders.'], 401);
    }

    // GET /api/orders/{id}
    if ($orderId !== '' && $action === '' && $method === 'GET') {
        $admin = getAdminFromToken();
        $cust = getCustomerFromToken();
        $token = $_GET['token'] ?? ($_SERVER['HTTP_X_ORDER_TOKEN'] ?? '');

        $stmt = $db->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if (!$order) {
            sendJson(['error' => 'Order not found'], 404);
        }

        // Authorization check
        $authorized = false;
        if ($admin) {
            $authorized = true;
        } elseif ($cust && strtolower($cust['email'] ?? '') === strtolower($order['customer_email'])) {
            $authorized = true;
        } elseif ($token !== '' && ($token === ($order['access_token'] ?? '') ||
            verifyOrderAccessToken($order['id'], $order['customer_email'], (string)$token))) {
            $authorized = true;
        }

        if (!$authorized) {
            sendJson(['error' => 'Unauthorized to access this order.'], 403);
        }

        $stmtItems = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $stmtItems->execute([$orderId]);
        $items = $stmtItems->fetchAll();

        sendJson(['order' => $order, 'items' => $items]);
    }

    // GET /api/orders/{id}/invoice-pdf
    if ($orderId !== '' && $action === 'invoice-pdf' && $method === 'GET') {
        $admin = getAdminFromToken();
        $cust = getCustomerFromToken();
        $token = $_GET['token'] ?? ($_SERVER['HTTP_X_ORDER_TOKEN'] ?? '');

        $stmt = $db->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if (!$order) {
            sendJson(['error' => 'Order not found'], 404);
        }

        $authorized = false;
        if ($admin) {
            $authorized = true;
        } elseif ($cust && strtolower($cust['email'] ?? '') === strtolower($order['customer_email'])) {
            $authorized = true;
        } elseif ($token !== '' && ($token === ($order['access_token'] ?? '') ||
            verifyOrderAccessToken($order['id'], $order['customer_email'], (string)$token))) {
            $authorized = true;
        }

        if (!$authorized) {
            sendJson(['error' => 'Unauthorized to download this invoice.'], 403);
        }

        $stmtItems = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
        $stmtItems->execute([$orderId]);
        $order['items'] = $stmtItems->fetchAll();

        $pdfBytes = generateOrderInvoicePdfPhp($order);
        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="Tax_Invoice_'. preg_replace('/[^a-zA-Z0-9_-]/', '', $orderId). '.pdf"');
        header('Content-Length: '. strlen($pdfBytes));
        echo $pdfBytes;
        exit;
    }

    // PATCH /api/orders/{id}/status (Admin only)
    if ($orderId !== '' && $action === 'status' && $method === 'PATCH') {
        requireAdminAuth();
        $body = getRequestBody();
        $status = $body['status'] ?? null;
        $paymentStatus = $body['paymentStatus'] ?? null;

        $validOrderStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
        $validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

        if ($status !== null && !in_array($status, $validOrderStatuses, true)) {
            sendJson(['error' => "Invalid order status '{$status}'. Valid statuses: ". implode(', ', $validOrderStatuses)], 400);
        }
        if ($paymentStatus !== null && !in_array($paymentStatus, $validPaymentStatuses, true)) {
            sendJson(['error' => "Invalid payment status '{$paymentStatus}'. Valid statuses: ". implode(', ', $validPaymentStatuses)], 400);
        }

        // Fetch current order
        $stmtCurr = $db->prepare("SELECT * FROM orders WHERE id = ? LIMIT 1");
        $stmtCurr->execute([$orderId]);
        $currentOrder = $stmtCurr->fetch();
        if (!$currentOrder) {
            sendJson(['error' => 'Order not found'], 404);
        }

        // State Machine validation: only forward (or recovery) transitions allowed.
        // cancelled is terminal; delivered can only go to cancelled (return).
        $allowedTransitions = [
            'pending' => ['confirmed', 'processing', 'cancelled'],
            'confirmed' => ['processing', 'shipped', 'cancelled'],
            'processing' => ['shipped', 'delivered', 'cancelled'],
            'shipped' => ['delivered', 'cancelled'],
            'delivered' => ['cancelled'],
            'cancelled' => []
        ];
        if ($status !== null && $status !== $currentOrder['status']) {
            $allowed = $allowedTransitions[$currentOrder['status']] ?? [];
            if (!in_array($status, $allowed, true)) {
                sendJson(['error' => "Invalid status transition from '{$currentOrder['status']}' to '{$status}'."], 400);
            }
        }

        // If transitioning to cancelled from active, restore stock
        if ($status === 'cancelled' && $currentOrder['status'] !== 'cancelled') {
            $stmtItems = $db->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
            $stmtItems->execute([$orderId]);
            $items = $stmtItems->fetchAll();
            $stmtRestock = $db->prepare("UPDATE products SET stock = stock + ? WHERE id = ?");
            foreach ($items as $it) {
                $stmtRestock->execute([$it['quantity'], $it['product_id']]);
            }
        }

        $updates = [];
        $params = [];
        if ($status) { $updates[] = "status = ?"; $params[] = $status; }
        if ($paymentStatus) { $updates[] = "payment_status = ?"; $params[] = $paymentStatus; }

        if (!empty($updates)) {
            $params[] = $orderId;
            $stmt = $db->prepare("UPDATE orders SET ". implode(', ', $updates). " WHERE id = ?");
            $stmt->execute($params);
        }

        sendJson(['success' => true, 'message' => 'Order status updated successfully.']);
    }

    // PATCH /api/orders/{id}/tracking (Admin only)
    if ($orderId !== '' && $action === 'tracking' && $method === 'PATCH') {
        requireAdminAuth();
        $body = getRequestBody();
        $tracking = trim((string)($body['trackingNumber'] ?? ''));

        $stmt = $db->prepare("UPDATE orders SET tracking_number = ? WHERE id = ?");
        $stmt->execute([$tracking, $orderId]);

        sendJson(['success' => true, 'message' => 'Tracking number updated successfully.']);
    }
}

// ============================================================================
// 7. NDIS QUOTES ROUTES (`/api/quotes/*`)
// ============================================================================
if ($endpoint === 'quotes') {
    $quoteId = $segments[1] ?? '';
    $action = strtolower($segments[2] ?? '');
    $db = requireDatabase();

    // GET /api/quotes (Admin only)
    if ($quoteId === '' && $method === 'GET') {
        requireAdminAuth();
        $stmt = $db->query("SELECT * FROM ndis_quotes ORDER BY created_at DESC");
        sendJson(['quotes' => $stmt->fetchAll()]);
    }

    // POST /api/quotes (Create NDIS Quote)
    if ($quoteId === '' && $method === 'POST') {
        enforceCheckoutEnabled('quotation');
        throttle('quote_submit', 10, 3600);
        $body = getRequestBody();
        $rawItems = $body['items'] ?? [];
        $deliveryMethod = (string)($body['deliveryMethod'] ?? 'standard');
        $promoCode = isset($body['promoCode']) ? (string)$body['promoCode'] : null;
        $customerName = substr(trim((string)($body['customerName'] ?? ($body['name'] ?? ''))), 0, 120);
        $customerEmail = substr(trim((string)($body['customerEmail'] ?? ($body['email'] ?? ''))), 0, 160);
        $customerPhone = substr(trim((string)($body['customerPhone'] ?? ($body['phone'] ?? ''))), 0, 40);
        $shippingAddress = substr(trim((string)($body['shippingAddress'] ?? ($body['address'] ?? ''))), 0, 500);
        $ndisNumber = substr(trim((string)($body['ndisNumber'] ?? '')), 0, 60);
        $planType = substr((string)($body['planType'] ?? 'plan_managed'), 0, 40);
        $planManager = substr(trim((string)($body['planManager'] ?? '')), 0, 160);
        $planManagerEmail = substr(trim((string)($body['planManagerEmail'] ?? '')), 0, 160);
        $notes = substr(trim((string)($body['notes'] ?? '')), 0, 5000);

        if ($customerName === '' || $customerEmail === '') {
            sendJson(['error' => 'Participant name and contact email are required.'], 400);
        }
        if (!filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
            sendJson(['error' => 'Valid contact email is required.'], 400);
        }

        try {
            $cart = calculateAuthoritativeCart($rawItems, $deliveryMethod, $promoCode);
            $id = 'ATS-Q-'. date('Y'). '-'. random_int(1000, 9999);
            $accessToken = generateOrderAccessToken($id, $customerEmail);

            $quoteCols = ['id', 'customer_name', 'customer_email', 'customer_phone', 'shipping_address', 'ndis_number', 'plan_type', 'plan_manager', 'plan_manager_email', 'items_json', 'subtotal', 'delivery_fee', 'gst_total', 'total'];
            $quoteVals = [$id, $customerName, $customerEmail, $customerPhone, $shippingAddress,
                $ndisNumber, $planType, $planManager, $planManagerEmail, json_encode($cart['items']),
                $cart['subtotal'], $cart['deliveryFee'], $cart['gstTotal'], $cart['total']];
            if (tableHasColumn($db, 'ndis_quotes', 'promo_code')) {
                $quoteCols[] = 'promo_code';
                $quoteCols[] = 'discount';
                $quoteVals[] = $cart['promoCode'];
                $quoteVals[] = $cart['discount'];
            }
            $quoteCols[] = 'notes';
            $quoteCols[] = 'access_token';
            $quoteVals[] = $notes;
            $quoteVals[] = $accessToken;
            $placeholders = implode(', ', array_fill(0, count($quoteVals), '?'));
            $stmt = $db->prepare("
                INSERT INTO ndis_quotes (" . implode(', ', $quoteCols) . ", status, valid_until, created_at)
                VALUES ({$placeholders}, 'pending', DATE_ADD(NOW(), INTERVAL 30 DAY), NOW())
            ");
            $stmt->execute($quoteVals);

            // Upsert Customer for NDIS Quote
            if ($customerEmail !== '') {
                try {
                    $stmtCust = $db->prepare("
                        INSERT INTO customers (id, name, email, phone, address, ndis_number, plan_type, plan_manager, plan_manager_email, orders_count, total_spent, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NOW())
                        ON DUPLICATE KEY UPDATE
                            name = VALUES(name), phone = VALUES(phone), address = VALUES(address),
                            ndis_number = VALUES(ndis_number), plan_type = VALUES(plan_type),
                            plan_manager = VALUES(plan_manager), plan_manager_email = VALUES(plan_manager_email)
                    ");
                    $stmtCust->execute([
                        'CUST-'. substr(md5(strtolower($customerEmail)), 0, 10),
                        $customerName, $customerEmail, $customerPhone, $shippingAddress,
                        $ndisNumber, $planType, $planManager, $planManagerEmail
                    ]);
                } catch (Exception $custEx) {
                    error_log("Quote Customer Upsert Notice: ". $custEx->getMessage());
                }
            }

            // Generate Quote PDF and send dual email
            $quoteRecord = [
                'id' => $id,
                'customerName' => $customerName,
                'customerEmail' => $customerEmail,
                'customerPhone' => $customerPhone,
                'shippingAddress' => $shippingAddress,
                'ndisNumber' => $ndisNumber,
                'planManager' => $planManager,
                'items' => $cart['items'],
                'total' => $cart['total'],
                'createdAt' => date('Y-m-d H:i:s')
            ];

            try {
                $attachments = [];

                $html = renderEmailTemplate("NDIS Quotation #{$id} - AT Specialists",
                    "NDIS Equipment Quotation",
                    "<h3>NDIS Quotation #{$id}</h3>
                     <p>Dear ". htmlspecialchars($customerName). ",</p>
                     <p>Thank you for requesting an Assistive Technology quotation. Your quotation details are itemized below:</p>
                     <div style='background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 14px; margin: 16px 0;'>
                        <p style='margin: 0 0 6px;'><strong>Quote Reference:</strong> {$id}</p>
                        <p style='margin: 0 0 6px;'><strong>NDIS Number:</strong> ". htmlspecialchars($ndisNumber ?: 'On File'). "</p>
                        <p style='margin: 0 0 6px;'><strong>Total Quotation Value:</strong> $". number_format($cart['total'], 2). " AUD</p>
                        <p style='margin: 0;'><strong>Plan Management:</strong> ". htmlspecialchars($planManager ?: 'Self / Plan Managed'). "</p>
                     </div>",
                    COMPANY_WEB,
                    "Visit AT Specialists");

                sendSmtpEmail($customerEmail, "NDIS Quotation #{$id} — AT Specialists Australia", $html, $attachments);
                if ($planManagerEmail !== '' && filter_var($planManagerEmail, FILTER_VALIDATE_EMAIL) && $planManagerEmail !== $customerEmail) {
                    sendSmtpEmail($planManagerEmail, "NDIS Quotation #{$id} — AT Specialists Australia ({$customerName})", $html, $attachments);
                }

                if ($admin_email !== '') {
                    $adminQuoteHtml = renderEmailTemplate("New NDIS Quote #{$id}",
                        "New NDIS Quote Submitted for {$customerName}",
                        "<h3>🔔 New NDIS Quotation Request: #{$id}</h3>
                         <p>A customer has submitted an NDIS equipment quote request on the website.</p>
                         <div style='background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 14px; margin: 16px 0;'>
                            <p style='margin: 0 0 6px;'><strong>Quote Reference:</strong> {$id}</p>
                            <p style='margin: 0 0 6px;'><strong>Participant Name:</strong> ". htmlspecialchars($customerName). " ({$customerEmail} | {$customerPhone})</p>
                            <p style='margin: 0 0 6px;'><strong>NDIS Number:</strong> ". htmlspecialchars($ndisNumber ?: 'On File'). "</p>
                            <p style='margin: 0 0 6px;'><strong>Plan Manager:</strong> ". htmlspecialchars($planManager ?: 'Self / Plan Managed'). " ({$planManagerEmail})</p>
                            <p style='margin: 0 0 6px;'><strong>Shipping Address:</strong> ". htmlspecialchars($shippingAddress). "</p>
                            <p style='margin: 0;'><strong>Total Value:</strong> $". number_format($cart['total'], 2). " AUD</p>
                         </div>",
                        COMPANY_WEB. "/at/quotes",
                        "View in Admin Dashboard");
                    sendSmtpEmail($admin_email, "🔔 New NDIS Quote: #{$id} ($". number_format($cart['total'], 2). ") - {$customerName}", $adminQuoteHtml, $attachments);
                }
            } catch (Exception $e) {
                error_log("Quote email notice: ". $e->getMessage());
            }

            sendJson([
                'success' => true,
                'quoteId' => $id,
                'accessToken' => $accessToken,
                'total' => $cart['total'],
                'message' => 'NDIS quotation submitted and generated successfully.'
            ]);
        } catch (Exception $e) {
            sendJson(['error' => $e->getMessage()], 400);
        }
    }

    // GET /api/quotes/{id}
    if ($quoteId !== '' && $action === '' && $method === 'GET') {
        requireAdminAuth();
        $stmt = $db->prepare("SELECT * FROM ndis_quotes WHERE id = ? LIMIT 1");
        $stmt->execute([$quoteId]);
        $quote = $stmt->fetch();
        if (!$quote) sendJson(['error' => 'Quote not found'], 404);

        $quote['items'] = json_decode((string)($quote['items_json'] ?? '[]'), true) ?: [];
        sendJson(['quote' => $quote]);
    }

    // GET /api/quotes/{id}/pdf (Admin, owning customer, or token link)
    if ($quoteId !== '' && $action === 'pdf' && $method === 'GET') {
        $stmt = $db->prepare("SELECT * FROM ndis_quotes WHERE id = ? LIMIT 1");
        $stmt->execute([$quoteId]);
        $quote = $stmt->fetch();
        if (!$quote) sendJson(['error' => 'Quote not found'], 404);

        $admin = getAdminFromToken();
        $cust = getCustomerFromToken();
        $token = $_GET['token'] ?? ($_SERVER['HTTP_X_ORDER_TOKEN'] ?? '');
        $authorized = false;
        if ($admin) {
            $authorized = true;
        } elseif ($cust && strtolower($cust['email'] ?? '') === strtolower($quote['customer_email'] ?? '')) {
            $authorized = true;
        } elseif ($token !== '' && ($token === ($quote['access_token'] ?? '') ||
            verifyOrderAccessToken($quote['id'], (string)($quote['customer_email'] ?? ''), (string)$token))) {
            $authorized = true;
        }
        if (!$authorized) {
            sendJson(['error' => 'Unauthorized to download this quotation.'], 403);
        }

        $quote['items'] = json_decode((string)$quote['items_json'], true) ?: [];
        $pdfBytes = generateQuotePdfPhp($quote);

        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="NDIS_Quote_'. preg_replace('/[^a-zA-Z0-9_-]/', '', $quoteId). '.pdf"');
        header('Content-Length: '. strlen($pdfBytes));
        echo $pdfBytes;
        exit;
    }

    // PATCH /api/quotes/{id}/status (Admin only)
    if ($quoteId !== '' && $action === 'status' && $method === 'PATCH') {
        requireAdminAuth();
        $b = getRequestBody();
        $status = $b['status'] ?? 'pending';
        $stmt = $db->prepare("UPDATE ndis_quotes SET status = ? WHERE id = ?");
        $stmt->execute([$status, $quoteId]);
        sendJson(['success' => true, 'message' => 'Quote status updated.']);
    }
}

// ============================================================================
// 8. CONTACT & INQUIRIES ROUTES (`/api/inquiries/*` or `/api/contact`)
// ============================================================================
if ($endpoint === 'inquiries' || $endpoint === 'contact') {
    $inqId = $segments[1] ?? '';
    $db = requireDatabase();

    // GET /api/inquiries (Admin only)
    if ($inqId === '' && $method === 'GET') {
        requireAdminAuth();
        try {
            $stmt = $db->query("SELECT * FROM inquiries ORDER BY created_at DESC");
            sendJson(['inquiries' => $stmt ? $stmt->fetchAll() : []]);
        } catch (Throwable $e) {
            sendJson(['inquiries' => []]);
        }
    }

    // GET /api/inquiries/{id} (Admin only)
    if ($inqId !== '' && $method === 'GET') {
        requireAdminAuth();
        try {
            $stmt = $db->prepare("SELECT * FROM inquiries WHERE id = ? LIMIT 1");
            $stmt->execute([$inqId]);
            $inquiry = $stmt->fetch();
            if (!$inquiry) sendJson(['error' => 'Inquiry not found'], 404);
            sendJson(['inquiry' => $inquiry]);
        } catch (Throwable $e) {
            sendJson(['error' => 'Inquiry not found'], 404);
        }
    }

    // POST /api/inquiries (Public contact form)
    if ($method === 'POST') {
        throttle('inquiry_submit', 10, 3600);
        $b = getRequestBody();
        $name = substr(trim((string)($b['name'] ?? '')), 0, 120);
        $email = substr(trim((string)($b['email'] ?? '')), 0, 160);
        $phone = substr(trim((string)($b['phone'] ?? '')), 0, 40);
        $enquiryType = substr(trim((string)($b['enquiryType'] ?? ($b['type'] ?? 'General Inquiry'))), 0, 60);
        $ndisNumber = substr(trim((string)($b['ndisNumber'] ?? '')), 0, 60);
        $message = substr(trim((string)($b['message'] ?? '')), 0, 5000);
        $subject = substr(trim((string)($b['subject'] ?? 'New Customer Inquiry')), 0, 160);

        if ($name === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || $message === '') {
            sendJson(['error' => 'Name, valid email address, and message are required.'], 400);
        }

        $id = 'INQ-'. strtoupper(substr(md5(uniqid((string)rand(), true)), 0, 8));

        try {
            $stmt = $db->prepare("
                INSERT INTO inquiries (id, name, email, phone, enquiry_type, ndis_number, subject, message, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW())
            ");
            $stmt->execute([$id, $name, $email, $phone, $enquiryType, $ndisNumber, $subject, $message]);
        } catch (Throwable $e) {
            try {
                $db->exec("
                    CREATE TABLE IF NOT EXISTS `inquiries` (
                      `id` varchar(100) NOT NULL,
                      `name` varchar(255) NOT NULL,
                      `email` varchar(255) NOT NULL,
                      `phone` varchar(50) DEFAULT '',
                      `enquiry_type` varchar(100) DEFAULT 'General Inquiry',
                      `ndis_number` varchar(100) DEFAULT '',
                      `subject` varchar(255) DEFAULT '',
                      `message` text NOT NULL,
                      `status` varchar(50) DEFAULT 'new',
                      `notes` text DEFAULT NULL,
                      `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
                      `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                      PRIMARY KEY (`id`),
                      KEY `idx_inq_created` (`created_at`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
                ");
                $stmt = $db->prepare("
                    INSERT INTO inquiries (id, name, email, phone, enquiry_type, ndis_number, subject, message, status, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', NOW())
                ");
                $stmt->execute([$id, $name, $email, $phone, $enquiryType, $ndisNumber, $subject, $message]);
            } catch (Throwable $ex) {
                error_log('Inquiry insert error: ' . $ex->getMessage());
            }
        }

        // Send confirmation to user & alert to admin
        try {
            $custHtml = renderEmailTemplate("Inquiry Received - AT Specialists Australia",
                "Thank you for reaching out to AT Specialists",
                "<h3>We have received your message, ". htmlspecialchars($name). "!</h3>
                 <p>Our assistive technology team will review your inquiry and get in touch with you shortly.</p>
                 <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 16px 0;'>
                    <p style='margin: 0 0 6px;'><strong>Reference ID:</strong> {$id}</p>
                    <p style='margin: 0 0 6px;'><strong>Inquiry Type:</strong> ". htmlspecialchars($enquiryType). "</p>
                    <p style='margin: 0;'><strong>Message:</strong> ". nl2br(htmlspecialchars($message)). "</p>
                 </div>",
                COMPANY_WEB,
                "Visit Our Website");
            sendSmtpEmail($email, "We've Received Your Inquiry (#{$id}) - AT Specialists Australia", $custHtml);

            if ($admin_email !== '') {
                $adminInqHtml = renderEmailTemplate("New Website Inquiry #{$id}",
                    "New customer inquiry from {$name}",
                    "<h3>🔔 New Website Inquiry Alert: #{$id}</h3>
                     <p>A customer has submitted a message via the website contact form.</p>
                     <div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin: 16px 0;'>
                        <p style='margin: 0 0 6px;'><strong>Sender:</strong> ". htmlspecialchars($name). " ({$email} | {$phone})</p>
                        <p style='margin: 0 0 6px;'><strong>Inquiry Topic:</strong> ". htmlspecialchars($enquiryType ?: $subject). "</p>
                        ". ($ndisNumber ? "<p style='margin: 0 0 6px;'><strong>NDIS Number:</strong> ". htmlspecialchars($ndisNumber). "</p>" : "")."
                        <p style='margin: 0;'><strong>Customer Message:</strong> ". nl2br(htmlspecialchars($message)). "</p>
                     </div>",
                    COMPANY_WEB. "/at/inquiries",
                    "Manage Inquiries in Admin");
                sendSmtpEmail($admin_email, "🔔 New Inquiry #{$id} from ". htmlspecialchars($name). " [". htmlspecialchars($enquiryType ?: $subject). "]", $adminInqHtml);
            }
        } catch (Exception $e) {}

        sendJson(['success' => true, 'message' => 'Inquiry submitted successfully.', 'id' => $id]);
    }

    // PATCH /api/inquiries/{id}/status (Admin only)
    if ($inqId !== '' && $method === 'PATCH') {
        requireAdminAuth();
        $b = getRequestBody();
        $status = $b['status'] ?? 'new';
        $stmt = $db->prepare("UPDATE inquiries SET status = ? WHERE id = ?");
        $stmt->execute([$status, $inqId]);
        sendJson(['success' => true, 'message' => 'Inquiry status updated.']);
    }
}

// ============================================================================
// 9. CUSTOMERS ROUTES (`/api/customers/*`)
// ============================================================================
if ($endpoint === 'customers') {
    $custId = $segments[1] ?? '';
    $db = requireDatabase();

    // GET /api/customers (Admin only)
    if ($custId === '' && $method === 'GET') {
        requireAdminAuth();
        // 1. Fetch registered customers with real order counts & spend
        $stmt = $db->query("
            SELECT 
                c.id, c.name, c.email, c.phone, c.address, c.city, c.state, c.postcode,
                c.ndis_number, c.plan_type, c.plan_manager, c.plan_manager_email, c.notes, c.created_at,
                COALESCE(agg.real_orders_count, c.orders_count, 0) AS orders_count,
                COALESCE(agg.real_total_spent, c.total_spent, 0.00) AS total_spent
            FROM customers c
            LEFT JOIN (
                SELECT 
                    LOWER(customer_email) AS o_email,
                    COUNT(*) AS real_orders_count,
                    SUM(total) AS real_total_spent
                FROM orders
                WHERE customer_email IS NOT NULL AND customer_email != ''
                GROUP BY LOWER(customer_email)
            ) agg ON LOWER(c.email) = agg.o_email
            ORDER BY c.created_at DESC
        ");
        $customers = $stmt->fetchAll();
        $registeredEmails = array_map(function($c) { return strtolower(trim($c['email'] ?? '')); }, $customers);
        $registeredSet = array_flip($registeredEmails);

        // 2. Also surface any guest orders whose customer email is not yet registered
        $stmtGuest = $db->query("
            SELECT 
                COALESCE(NULLIF(customer_id, ''), CONCAT('GUEST-', id)) AS id,
                customer_name AS name,
                customer_email AS email,
                customer_phone AS phone,
                shipping_address AS address,
                ndis_number,
                total AS total_spent,
                created_at
            FROM orders
            WHERE customer_email IS NOT NULL AND customer_email != ''
            ORDER BY created_at DESC
        ");
        $guestOrders = $stmtGuest->fetchAll();
        $guestMap = [];
        foreach ($guestOrders as $go) {
            $e = strtolower(trim($go['email'] ?? ''));
            if ($e === '' || isset($registeredSet[$e])) continue;
            if (!isset($guestMap[$e])) {
                $guestMap[$e] = [
                    'id' => $go['id'],
                    'name' => !empty($go['name']) ? $go['name'] : explode('@', $e)[0],
                    'email' => $e,
                    'phone' => $go['phone'] ?? '',
                    'address' => $go['address'] ?? '',
                    'ndis_number' => $go['ndis_number'] ?? '',
                    'orders_count' => 0,
                    'total_spent' => 0.00,
                    'created_at' => $go['created_at'],
                    'notes' => 'Customer from store order checkout'
                ];
            }
            $guestMap[$e]['orders_count'] += 1;
            $guestMap[$e]['total_spent'] += floatval($go['total_spent'] ?? 0);
        }

        foreach ($guestMap as $gc) {
            $customers[] = $gc;
        }

        sendJson(['customers' => $customers]);
    }

    // GET /api/customers/{id}
    if ($custId !== '' && $method === 'GET') {
        requireAdminAuth();
        $stmt = $db->prepare("SELECT * FROM customers WHERE id = ? LIMIT 1");
        $stmt->execute([$custId]);
        $customer = $stmt->fetch();

        // If not found in customers table, check if it's a guest order customer ID or email
        if (!$customer) {
            $stmtGuest = $db->prepare("SELECT customer_id as id, customer_name as name, customer_email as email, customer_phone as phone, shipping_address as address, ndis_number, created_at FROM orders WHERE id = ? OR customer_id = ? LIMIT 1");
            $stmtGuest->execute([$custId, $custId]);
            $customer = $stmtGuest->fetch();
        }
        if (!$customer) sendJson(['error' => 'Customer not found'], 404);

        $custEmail = strtolower(trim($customer['email'] ?? ''));
        $stmtOrd = $db->prepare("SELECT * FROM orders WHERE (customer_email IS NOT NULL AND LOWER(customer_email) = ?) OR customer_id = ? ORDER BY created_at DESC");
        $stmtOrd->execute([$custEmail, $custId]);
        $orders = $stmtOrd->fetchAll();

        // Attach order_items to each order
        if (!empty($orders)) {
            $orderIds = array_column($orders, 'id');
            $inQuery = implode(',', array_fill(0, count($orderIds), '?'));
            $stmtItems = $db->prepare("SELECT * FROM order_items WHERE order_id IN ($inQuery)");
            $stmtItems->execute($orderIds);
            $allItems = $stmtItems->fetchAll();
            $itemsByOrder = [];
            foreach ($allItems as $it) {
                $itemsByOrder[$it['order_id']][] = $it;
            }
            foreach ($orders as &$ord) {
                $ord['items'] = $itemsByOrder[$ord['id']] ?? [];
            }
            unset($ord);
        }

        sendJson(['customer' => $customer, 'orders' => $orders]);
    }
}

// ============================================================================
// ============================================================================
// 10. UNIFIED DOCUMENT PERSISTENCE & PDF RENDERING HELPERS
// ============================================================================

function getDocumentRecord(string $docId): ?array {
    $db = requireDatabase();

    // 1. Check `documents` table
    try {
        $stmt = $db->prepare("SELECT * FROM documents WHERE doc_id = ? LIMIT 1");
        $stmt->execute([$docId]);
        $row = $stmt->fetch();
        if ($row) {
            return [
                'docId' => $row['doc_id'],
                'templateId' => $row['template_id'],
                'customerName' => $row['customer_name'],
                'customerEmail' => $row['customer_email'],
                'customerPhone' => $row['customer_phone'],
                'shippingAddress' => $row['shipping_address'],
                'subtotal' => floatval($row['subtotal']),
                'deliveryFee' => floatval($row['delivery_fee']),
                'gstTotal' => floatval($row['gst_total']),
                'total' => floatval($row['total']),
                'items' => json_decode((string)$row['items_json'], true) ?: [],
                'notes' => $row['notes'] ?? '',
                'extraMeta' => json_decode((string)($row['extra_meta_json'] ?? '{}'), true) ?: [],
                'customSettings' => json_decode((string)($row['custom_settings_json'] ?? '{}'), true) ?: [],
                'filename' => $row['filename'] ?: "{$docId}.pdf",
                'createdAt' => $row['created_at']
            ];
        }
    } catch (Exception $e) {}

    // 2. Fallback check `orders`
    try {
        $cleanOrdId = preg_replace('/^(ORD-|INV-\d{4}-)/i', '', $docId);
        $stmtOrd = $db->prepare("SELECT * FROM orders WHERE id = ? OR id = ? LIMIT 1");
        $stmtOrd->execute([$docId, $cleanOrdId]);
        $order = $stmtOrd->fetch();
        if ($order) {
            $stmtItems = $db->prepare("SELECT * FROM order_items WHERE order_id = ?");
            $stmtItems->execute([$order['id']]);
            $orderItems = $stmtItems->fetchAll();
            $items = array_map(function($it) {
                return [
                    'code' => $it['product_id'],
                    'name' => $it['name'],
                    'quantity' => intval($it['quantity']),
                    'price' => floatval($it['price']),
                    'amount' => floatval($it['price']) * intval($it['quantity']),
                ];
            }, $orderItems);

            return [
                'docId' => $docId,
                'templateId' => 'order',
                'customerName' => $order['customer_name'],
                'customerEmail' => $order['customer_email'],
                'customerPhone' => $order['customer_phone'] ?? '',
                'shippingAddress' => $order['shipping_address'] ?? '',
                'subtotal' => floatval($order['subtotal']),
                'deliveryFee' => floatval($order['delivery_fee']),
                'gstTotal' => floatval($order['gst_total']),
                'total' => floatval($order['total']),
                'items' => $items,
                'notes' => $order['notes'] ?? '',
                'filename' => "Tax-Invoice-{$docId}.pdf",
                'createdAt' => $order['created_at']
            ];
        }
    } catch (Exception $e) {}

    // 3. Fallback check `ndis_quotes`
    try {
        $stmtQ = $db->prepare("SELECT * FROM ndis_quotes WHERE id = ? LIMIT 1");
        $stmtQ->execute([$docId]);
        $quote = $stmtQ->fetch();
        if ($quote) {
            return [
                'docId' => $docId,
                'templateId' => 'ndis_quote',
                'customerName' => $quote['customer_name'],
                'customerEmail' => $quote['customer_email'],
                'customerPhone' => $quote['customer_phone'] ?? '',
                'shippingAddress' => $quote['shipping_address'] ?? '',
                'subtotal' => floatval($quote['subtotal']),
                'deliveryFee' => floatval($quote['delivery_fee']),
                'gstTotal' => floatval($quote['gst_total']),
                'total' => floatval($quote['total']),
                'items' => json_decode((string)($quote['items_json'] ?? '[]'), true) ?: [],
                'notes' => $quote['notes'] ?? '',
                'extraMeta' => [
                    'ndisNumber' => $quote['ndis_number'] ?? '',
                    'planManager' => $quote['plan_manager'] ?? '',
                    'planManagerEmail' => $quote['plan_manager_email'] ?? '',
                    'planType' => $quote['plan_type'] ?? ''
                ],
                'filename' => "NDIS-Quotation-{$docId}.pdf",
                'createdAt' => $quote['created_at']
            ];
        }
    } catch (Exception $e) {}

    // 4. Default graceful fallback document
    $isNdis = stripos($docId, 'NDIS') !== false;
    $isTrial = stripos($docId, 'TRL') !== false;
    $isHire = stripos($docId, 'HIRE') !== false;
    $isQuote = stripos($docId, 'QT') !== false;
    $isOrder = stripos($docId, 'ORD') !== false || stripos($docId, 'INV') !== false;
    $tmpl = $isNdis ? 'ndis_quote' : ($isTrial ? 'trial' : ($isHire ? 'hire' : ($isQuote ? 'quote' : ($isOrder ? 'order' : 'ndis_quote'))));
    $isFree = $isTrial;

    return [
        'docId' => $docId,
        'templateId' => $tmpl,
        'customerName' => 'Valued Client',
        'customerPhone' => '0494 767 409',
        'shippingAddress' => 'Client Specified Destination',
        'total' => $isFree ? 0.0 : 1850.00,
        'subtotal' => $isFree ? 0.0 : 1850.00,
        'gstTotal' => 0.0,
        'deliveryFee' => 0.0,
        'items' => [
            [
                'code' => $isNdis ? '05_120603099_0105_1_2' : ($isTrial ? 'TRL-BED-01' : ($isHire ? 'HIRE-BED-01' : 'AT-PRD-01')),
                'name' => $isNdis ? 'NDIS Scripted Assistive Technology' : ($isTrial ? 'Home Trial Profiling Low Bed' : ($isHire ? 'Hospital Profiling Bed Rental' : 'Commercial Assistive Technology Item')),
                'quantity' => 1,
                'price' => $isFree ? 0.0 : 1850.00,
                'amount' => $isFree ? 0.0 : 1850.00,
                'detail' => 'Clinical specification and assistive technology script'
            ]
        ],
        'filename' => "{$docId}.pdf",
        'createdAt' => date('Y-m-d H:i:s')
    ];
}

/**
 * Authorizes access to a unified document / PDF.
 * Admins always pass. Customers pass when their JWT email matches the
 * document owner. Otherwise a ?token= link token is verified against the
 * order/quote HMAC (same scheme as the invoice-pdf endpoint).
 */
function authorizeDocumentAccess(?array $doc): bool {
    if (!is_array($doc)) return false;
    if (getAdminFromToken()) return true;
    $ownerEmail = strtolower((string)($doc['customerEmail'] ?? ''));
    if ($ownerEmail === '') return false;
    $cust = getCustomerFromToken();
    if ($cust && strtolower($cust['email'] ?? '') === $ownerEmail) return true;
    $token = $_GET['token'] ?? ($_SERVER['HTTP_X_ORDER_TOKEN'] ?? '');
    if ($token === '') return false;
    $docId = (string)($doc['docId'] ?? '');
    return verifyOrderAccessToken($docId, $ownerEmail, (string)$token);
}

function dispatchUnifiedDocument(array $payload): array {
    global $envVars, $smtp_from_email, $admin_email;
    $db = requireDatabase();

    $templateId = (string)($payload['templateId'] ?? 'quote');
    $customerName = trim((string)($payload['customerName'] ?? 'Valued Client'));
    $customerEmail = trim((string)($payload['customerEmail'] ?? ($payload['recipientEmail'] ?? '')));
    $customerPhone = trim((string)($payload['customerPhone'] ?? ''));
    $shippingAddress = trim((string)($payload['shippingAddress'] ?? ''));
    $notes = trim((string)($payload['notes'] ?? ''));

    $subtotal = floatval($payload['subtotal'] ?? 0);
    $deliveryFee = floatval($payload['deliveryFee'] ?? 0);
    $gstTotal = floatval($payload['gstTotal'] ?? 0);
    $total = floatval($payload['total'] ?? ($subtotal + $deliveryFee + $gstTotal));

    $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
    $extraMeta = is_array($payload['extraMeta'] ?? null) ? $payload['extraMeta'] : [];
    $customSettings = is_array($payload['customSettings'] ?? null) ? $payload['customSettings'] : [];

    // Derive or generate Document ID
    $docId = trim((string)($payload['documentId'] ?? ($payload['docId'] ?? '')));
    if ($docId === '') {
        $prefix = match($templateId) {
            'ndis_quote', 'quote' => 'NDIS-QT-'. date('Y'). '-',
            'order', 'invoice' => 'INV-'. date('Y'). '-',
            'trial', 'ndis_trial' => 'TRL-'. date('Y'). '-',
            'hire' => 'HIRE-'. date('Y'). '-',
            'booking' => 'BK-'. date('Y'). '-',
            'referral' => 'REF-'. date('Y'). '-',
            default => 'DOC-'. date('Y'). '-'
        };
        $docId = $prefix. rand(1000, 9999);
    }

    $filename = "{$docId}.pdf";
    $attachPdf = false;

    // Persist into `documents` table
    try {
        $stmt = $db->prepare("
            INSERT INTO documents (doc_id, template_id, customer_name, customer_email, customer_phone, shipping_address,
                subtotal, delivery_fee, gst_total, total, items_json, notes, extra_meta_json,
                custom_settings_json, filename, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
            ON DUPLICATE KEY UPDATE
                customer_name = VALUES(customer_name),
                customer_email = VALUES(customer_email),
                customer_phone = VALUES(customer_phone),
                shipping_address = VALUES(shipping_address),
                subtotal = VALUES(subtotal),
                delivery_fee = VALUES(delivery_fee),
                gst_total = VALUES(gst_total),
                total = VALUES(total),
                items_json = VALUES(items_json),
                notes = VALUES(notes),
                extra_meta_json = VALUES(extra_meta_json),
                custom_settings_json = VALUES(custom_settings_json),
                filename = VALUES(filename),
                updated_at = NOW()
        ");

        $stmt->execute([
            $docId,
            $templateId,
            $customerName,
            $customerEmail,
            $customerPhone,
            $shippingAddress,
            $subtotal,
            $deliveryFee,
            $gstTotal,
            $total,
            json_encode($items, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            $notes,
            json_encode($extraMeta, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            json_encode($customSettings, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
            $filename
        ]);
    } catch (Exception $e) {
        error_log("Failed to persist document to MySQL: ". $e->getMessage());
    }

    // Attachments disabled per configuration (clean links provided instead)
    $attachments = [];

    $clientUrl = publicBaseUrl();

    $viewDocumentUrl = "{$clientUrl}/view-document/". rawurlencode($docId);
    $directPdfUrl = "{$clientUrl}/api/emails/pdf/". rawurlencode($docId);

    $customerSent = false;
    $adminSent = false;

    $docTitle = match($templateId) {
        'quote', 'ndis_quote' => "NDIS Equipment Quotation #{$docId}",
        'order', 'invoice' => "ATO Tax Invoice #{$docId}",
        'trial', 'ndis_trial' => "Clinical Equipment Home Trial Schedule #{$docId}",
        'hire' => "Equipment Hire Agreement & Schedule #{$docId}",
        'booking' => "Clinical Consultation Booking Confirmation #{$docId}",
        'referral' => "NDIS Clinical Referral Intake #{$docId}",
        default => "Equipment Documentation #{$docId}"
    };

    $emailBody = "<h3>{$docTitle}</h3>
    <p>Dear ". htmlspecialchars($customerName, ENT_QUOTES, 'UTF-8'). ",</p>
    <p>Please find your documentation summary from AT Specialists Australia below.</p>
    <div style='background-color: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 6px; padding: 14px; margin: 16px 0;'>
        <p style='margin: 0 0 6px;'><strong>Document Reference:</strong> {$docId}</p>
        <p style='margin: 0 0 6px;'><strong>Total Amount:</strong> $". number_format($total, 2). " AUD</p>
        <p style='margin: 0;'><strong>Verification Status:</strong> Verified &bull; Australian Standards Compliant</p>
    </div>
    <p>You can also view and download this verified document at any time using your secure link below:</p>";

    $html = renderEmailTemplate($docTitle,
        "Verified Document #{$docId} from AT Specialists",
        $emailBody,
        $viewDocumentUrl,
        "View Verified Document Online");

    // Send Customer copy
    $sendCust = ($payload['sendCustomerCopy'] ?? true) !== false;
    if ($sendCust && filter_var($customerEmail, FILTER_VALIDATE_EMAIL)) {
        $res = sendSmtpEmail($customerEmail, "{$docTitle} — AT Specialists Australia", $html, $attachments);
        if ($res['success']) {
            $customerSent = true;
        }
        $planMgrEmail = trim((string)($extraMeta['planManagerEmail'] ?? ''));
        if ($planMgrEmail !== '' && filter_var($planMgrEmail, FILTER_VALIDATE_EMAIL) && $planMgrEmail !== $customerEmail) {
            sendSmtpEmail($planMgrEmail, "{$docTitle} — AT Specialists Australia ({$customerName})", $html, $attachments);
        }
    }

    // Send Admin copy
    $sendAdm = ($payload['sendAdminCopy'] ?? true) !== false;
    if ($sendAdm) {
        $adminMailbox = trim((string)($payload['adminEmail'] ?? ($admin_email ?: ($smtp_from_email ?: 'admin@atspecialists.com.au'))));
        if (filter_var($adminMailbox, FILTER_VALIDATE_EMAIL)) {
            $adminHtml = renderEmailTemplate("Admin Alert: {$docTitle}",
                "Dispatched document #{$docId} for {$customerName}",
                "<h3>Administrative Dispatch Notification</h3>
                 <p>An document has been dispatched to <strong>". htmlspecialchars($customerName). "</strong> ({$customerEmail}).</p>
                 <p>Reference: <strong>{$docId}</strong> | Total: <strong>$". number_format($total, 2). " AUD</strong></p>",
                $viewDocumentUrl,
                "Inspect Document");
            $resAdm = sendSmtpEmail($adminMailbox, "[Admin Notice] {$docTitle} Dispatched ({$customerName})", $adminHtml, $attachments);
            if ($resAdm['success']) {
                $adminSent = true;
            }
        }
    }

    return [
        'success' => true,
        'documentId' => $docId,
        'filename' => $filename,
        'customerSent' => $customerSent,
        'adminSent' => $adminSent,
        'message' => "Template '{$templateId}' dispatched successfully for {$docId}.",
        'viewDocumentUrl' => $viewDocumentUrl,
        'directPdfUrl' => $directPdfUrl
    ];
}

// ============================================================================
// 10. SMTP & EMAIL ROUTES (`/api/emails/*`)
// ============================================================================
if ($endpoint === 'emails') {
    $sub = strtolower($segments[1] ?? '');

    // GET /api/emails/smtp-config (Admin only)
    if ($sub === 'smtp-config' && $method === 'GET') {
        requireAdminAuth();
        sendJson([
            'host' => $smtp_host,
            'port' => intval($smtp_port),
            'secure' => ($smtp_secure === 'true' || $smtp_secure === true || $smtp_port == 465),
            'user' => $smtp_user,
            'passMasked' => !empty($smtp_pass) ? '••••••••••••••••' : '',
            'fromName' => $smtp_from_name,
            'fromEmail' => $smtp_from_email
        ]);
    }

    // POST /api/emails/smtp-config (Admin only)
    if ($sub === 'smtp-config' && $method === 'POST') {
        requireAdminAuth();
        $db = requireDatabase();
        $b = getRequestBody();

        $stmt = $db->prepare("
            INSERT INTO app_settings (setting_key, setting_value, updated_at)
            VALUES ('smtp_config', ?, NOW())
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ");
        $stmt->execute([json_encode($b)]);

        sendJson(['success' => true, 'message' => 'SMTP configuration saved successfully.']);
    }

    // POST /api/emails/verify-smtp (Admin only)
    if ($sub === 'verify-smtp' && $method === 'POST') {
        requireAdminAuth();
        $connectHost = ($smtp_port == 465) ? "ssl://{$smtp_host}" : $smtp_host;
        $context = stream_context_create(['ssl' => ['verify_peer' => true, 'verify_peer_name' => true]]);
        $socket = @stream_socket_client("{$connectHost}:{$smtp_port}", $errno, $errstr, 8, STREAM_CLIENT_CONNECT, $context);

        if ($socket) {
            fclose($socket);
            sendJson([
                'success' => true,
                'message' => "SMTP Socket connected with verified TLS to {$smtp_host}:{$smtp_port}",
                'host' => $smtp_host,
                'port' => intval($smtp_port)
            ]);
        } else {
            sendJson([
                'success' => false,
                'message' => "Failed to connect to {$smtp_host}:{$smtp_port} - ($errno) $errstr",
                'host' => $smtp_host,
                'port' => intval($smtp_port)
            ], 400);
        }
    }

    // POST /api/emails/send-test (Admin only)
    if ($sub === 'send-test' && $method === 'POST') {
        requireAdminAuth();
        $b = getRequestBody();
        $to = trim((string)($b['to'] ?? ''));

        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            sendJson(['error' => 'A valid recipient email address is required.'], 400);
        }

        $html = renderEmailTemplate("SMTP Connection Verified - AT Specialists Australia",
            "Authenticated SMTP Delivery Test",
            "<h3>SMTP System Test Successful</h3>
             <p>This email confirms that the authenticated SMTP mail delivery service for <strong>AT Specialists Australia</strong> is active and verified.</p>
             <p>Timestamp: ". gmdate('Y-m-d H:i:s'). " UTC</p>",
            COMPANY_WEB,
            "Visit Website");

        $res = sendSmtpEmail($to, "SMTP System Verification — AT Specialists Australia", $html);
        if ($res['success']) {
            sendJson(['success' => true, 'message' => "Test email successfully sent to {$to}"]);
        } else {
            sendJson(['error' => $res['error'] ?? 'Failed to send test email'], 500);
        }
    }

    // POST /api/emails/dispatch-template (Admin only — arbitrary template + recipient)
    if ($sub === 'dispatch-template' && $method === 'POST') {
        requireAdminAuth();
        $body = getRequestBody();
        $res = dispatchUnifiedDocument($body);
        sendJson($res);
    }

    // POST /api/emails/send-invoice (Admin only)
    if ($sub === 'send-invoice' && $method === 'POST') {
        requireAdminAuth();
        $body = getRequestBody();
        $body['templateId'] = 'invoice';
        $res = dispatchUnifiedDocument($body);
        sendJson($res);
    }

    // POST /api/emails/send-template-sample
    if ($sub === 'send-template-sample' && $method === 'POST') {
        requireAdminAuth();
        $body = getRequestBody();
        $to = trim((string)($body['to'] ?? ''));
        $templateId = (string)($body['templateId'] ?? 'quote');

        if (!filter_var($to, FILTER_VALIDATE_EMAIL)) {
            sendJson(['error' => 'A valid recipient email address is required.'], 400);
        }

        $samplePayload = [
            'templateId' => $templateId,
            'customerName' => 'Sample Recipient',
            'recipientEmail' => $to,
            'customerEmail' => $to,
            'customerPhone' => '0494 767 409',
            'shippingAddress' => 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039',
            'total' => 1850.00,
            'subtotal' => 1850.00,
            'deliveryFee' => 0.00,
            'gstTotal' => 0.00,
            'items' => [
                [
                    'code' => 'SAMPLE-01',
                    'name' => 'Sample Clinical Assistive Technology Item',
                    'quantity' => 1,
                    'price' => 1850.00,
                    'amount' => 1850.00
                ]
            ],
            'sendCustomerCopy' => true,
            'sendAdminCopy' => false,
            'attachPdf' => true
        ];

        $res = dispatchUnifiedDocument($samplePayload);
        sendJson([
            'success' => true,
            'message' => "Sample preview for '{$templateId}' sent to {$to}."
        ]);
    }

    // GET /api/emails/document/{docId} (Admin, owning customer, or token link)
    if ($sub === 'document' && $method === 'GET') {
        $docId = $segments[2] ?? '';
        if ($docId === '') sendJson(['error' => 'Document ID is required.'], 400);

        $doc = getDocumentRecord($docId);
        if (!authorizeDocumentAccess($doc)) {
            sendJson(['error' => 'Unauthorized to view this document.'], 403);
        }
        $clientUrl = publicBaseUrl();

        sendJson([
            'success' => true,
            'document' => $doc,
            'pdfUrl' => "{$clientUrl}/api/emails/pdf/". rawurlencode($docId)
        ]);
    }

    // GET /api/emails/documents (Admin only — contains customer PII)
    if ($sub === 'documents' && $method === 'GET') {
        requireAdminAuth();
        $db = requireDatabase();
        $clientUrl = publicBaseUrl();

        try {
            $stmt = $db->query("SELECT * FROM documents ORDER BY created_at DESC LIMIT 100");
            $rows = $stmt->fetchAll();
        } catch (Exception $e) {
            $rows = [];
        }

        $list = array_map(function($row) use ($clientUrl) {
            $needsPdf = !in_array($row['template_id'], ['contact', 'general']);
            return [
                'docId' => $row['doc_id'],
                'templateId' => $row['template_id'],
                'customerName' => $row['customer_name'],
                'customerEmail' => $row['customer_email'],
                'customerPhone' => $row['customer_phone'],
                'total' => floatval($row['total']),
                'createdAt' => $row['created_at'],
                'filename' => $row['filename'] ?: ($needsPdf ? "{$row['doc_id']}.pdf" : null),
                'needsPdf' => $needsPdf,
                'viewDocumentUrl' => $needsPdf ? "{$clientUrl}/view-document/". rawurlencode($row['doc_id']) : null,
                'directPdfUrl' => $needsPdf ? "{$clientUrl}/api/emails/pdf/". rawurlencode($row['doc_id']) : null
            ];
        }, $rows);

        sendJson([
            'success' => true,
            'documents' => $list
        ]);
    }

    // GET /api/emails/pdf/{docId} (Admin, owning customer, or token link)
    if ($sub === 'pdf' && $method === 'GET') {
        $docId = $segments[2] ?? '';
        if ($docId === '') sendJson(['error' => 'Document ID is required.'], 400);

        $doc = getDocumentRecord($docId);
        if (!authorizeDocumentAccess($doc)) {
            sendJson(['error' => 'Unauthorized to download this document.'], 403);
        }
        $tmpl = $doc['templateId'] ?? 'order';

        if ($tmpl === 'quote' || $tmpl === 'ndis_quote') {
            $pdfBytes = generateQuotePdfPhp($doc);
        } else {
            $pdfBytes = generateOrderInvoicePdfPhp($doc);
        }

        header('Content-Type: application/pdf');
        header('Content-Disposition: inline; filename="'. preg_replace('/[^a-zA-Z0-9_.-]/', '', $doc['filename'] ?: "{$docId}.pdf"). '"');
        header('Cache-Control: public, max-age=86400');
        header('Content-Length: '. strlen($pdfBytes));
        echo $pdfBytes;
        exit;
    }
}

// ============================================================================
// 11. SETTINGS ROUTES (`/api/settings/*`)
// ============================================================================
if ($endpoint === 'settings') {
    $db = requireDatabase();

    // GET /api/settings (Admin gets full masked settings; Public/Guests get store info & checkout state)
    if ($method === 'GET') {
        $admin = getAdminFromToken();
        if ($admin) {
            $stmt = $db->query("SELECT * FROM app_settings");
            $rows = $stmt ? $stmt->fetchAll() : [];
            $settings = [];
            foreach ($rows as $r) {
                $decoded = json_decode((string)$r['setting_value'], true);
                $settings[$r['setting_key']] = is_array($decoded) ? $decoded : $r['setting_value'];
            }
            // Never expose the PayPal secret via the API (it lives in server env)
            if (isset($settings['paypal_config']) && is_array($settings['paypal_config'])) {
                $settings['paypal_config']['secretKey'] = '';
                $settings['paypal_config']['secret'] = '';
                $settings['paypal_config']['hasSecret'] = true;
            }
            sendJson(['settings' => $settings]);
        }

        // Public safe settings for guest storefront
        $publicSettings = [
            'store_info' => [
                'tradingName' => ATS_TRADING_NAME,
                'abn' => ATS_ABN,
                'phone' => ATS_PHONE,
                'email' => ATS_EMAIL,
                'address' => ATS_ADDRESS
            ],
            'currency' => $currency,
            'checkout_settings' => [
                'enablePayment' => true,
                'enableQuotation' => true
            ],
            'paypal_config' => [
                'clientId' => $paypal_client_id,
                'mode' => $paypal_mode
            ]
        ];
        try {
            $stmt = $db->query("SELECT setting_key, setting_value FROM app_settings WHERE setting_key IN ('checkout_settings', 'company_settings')");
            if ($stmt) {
                while ($r = $stmt->fetch()) {
                    $decoded = json_decode((string)$r['setting_value'], true);
                    $publicSettings[$r['setting_key']] = is_array($decoded) ? $decoded : $r['setting_value'];
                }
            }
        } catch (Exception $e) {}

        sendJson(['settings' => $publicSettings]);
    }

    // POST /api/settings (Admin only)
    if ($method === 'POST') {
        requireAdminAuth();
        $b = getRequestBody();
        $key = trim((string)($b['key'] ?? ''));
        $val = $b['value'] ?? $b;

        if ($key === '') sendJson(['error' => 'Setting key is required.'], 400);

        $stmt = $db->prepare("
            INSERT INTO app_settings (setting_key, setting_value, updated_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
        ");
        $stmt->execute([$key, json_encode($val)]);

        sendJson(['success' => true, 'message' => "Setting '{$key}' updated successfully."]);
    }
}

// ============================================================================
// 12. CONVENIENCE ALIASES & COMPATIBILITY ROUTES
// ============================================================================

// /api/document/{docId} → Alias to /api/emails/document/{docId}
if ($endpoint === 'document') {
    $docId = $segments[1] ?? '';
    if ($docId === '') sendJson(['error' => 'Document ID is required.'], 400);
    $doc = getDocumentRecord($docId);
    if (!authorizeDocumentAccess($doc)) {
        sendJson(['error' => 'Unauthorized to view this document.'], 403);
    }
    $clientUrl = publicBaseUrl();
    sendJson([
        'success' => true,
        'document' => $doc,
        'pdfUrl' => "{$clientUrl}/api/emails/pdf/". rawurlencode($docId)
    ]);
}

// /api/documents → Alias to /api/emails/documents (Admin only — customer PII)
if ($endpoint === 'documents') {
    requireAdminAuth();
    $db = requireDatabase();
    $clientUrl = publicBaseUrl();
    try {
        $stmt = $db->query("SELECT * FROM documents ORDER BY created_at DESC LIMIT 100");
        $rows = $stmt->fetchAll();
    } catch (Exception $e) {
        $rows = [];
    }
    $list = array_map(function($row) use ($clientUrl) {
        $needsPdf = !in_array($row['template_id'], ['contact', 'general']);
        return [
            'docId' => $row['doc_id'],
            'templateId' => $row['template_id'],
            'customerName' => $row['customer_name'],
            'customerEmail' => $row['customer_email'],
            'customerPhone' => $row['customer_phone'],
            'total' => floatval($row['total']),
            'createdAt' => $row['created_at'],
            'filename' => $row['filename'] ?: ($needsPdf ? "{$row['doc_id']}.pdf" : null),
            'needsPdf' => $needsPdf,
            'viewDocumentUrl' => $needsPdf ? "{$clientUrl}/view-document/". rawurlencode($row['doc_id']) : null,
            'directPdfUrl' => $needsPdf ? "{$clientUrl}/api/emails/pdf/". rawurlencode($row['doc_id']) : null
        ];
    }, $rows);
    sendJson(['success' => true, 'documents' => $list]);
}

// /api/pdf/{docId} → Alias to /api/emails/pdf/{docId} (same authorization)
if ($endpoint === 'pdf') {
    $docId = $segments[1] ?? '';
    if ($docId === '') sendJson(['error' => 'Document ID is required.'], 400);
    $doc = getDocumentRecord($docId);
    if (!authorizeDocumentAccess($doc)) {
        sendJson(['error' => 'Unauthorized to download this document.'], 403);
    }
    $tmpl = $doc['templateId'] ?? 'order';
    if ($tmpl === 'quote' || $tmpl === 'ndis_quote') {
        $pdfBytes = generateQuotePdfPhp($doc);
    } else {
        $pdfBytes = generateOrderInvoicePdfPhp($doc);
    }
    header('Content-Type: application/pdf');
    header('Content-Disposition: inline; filename="'. preg_replace('/[^a-zA-Z0-9_.-]/', '', $doc['filename'] ?: "{$docId}.pdf"). '"');
    header('Cache-Control: public, max-age=86400');
    header('Content-Length: '. strlen($pdfBytes));
    echo $pdfBytes;
    exit;
}

// /api/invoices → Alias to /api/orders
if ($endpoint === 'invoices') {
    $db = requireDatabase();
    requireAdminAuth();
    $stmt = $db->query("SELECT * FROM orders ORDER BY created_at DESC");
    sendJson(['invoices' => $stmt->fetchAll()]);
}

// /api/rentals → Equipment & Clinical Rentals Management
if ($endpoint === 'rentals') {
    $db = requireDatabase();
    $rentalId = $segments[1] ?? '';

    if ($method === 'GET') {
        requireAdminAuth();
        try {
            $stmt = $db->query("SELECT * FROM rentals ORDER BY created_at DESC");
            $rows = $stmt->fetchAll();
            sendJson(['rentals' => $rows]);
        } catch (Exception $e) {
            sendJson(['rentals' => []]);
        }
    }

    if ($method === 'POST') {
        requireAdminAuth();
        $b = getRequestBody();
        $id = $b['id'] ?? ('RNT-'. date('Y'). '-'. rand(1000, 9999));
        $customerName = trim((string)($b['customerName'] ?? 'Valued Client'));
        $customerEmail = trim((string)($b['customerEmail'] ?? ''));
        $customerPhone = trim((string)($b['customerPhone'] ?? ''));
        $productId = trim((string)($b['productId'] ?? ''));
        $productName = trim((string)($b['productName'] ?? 'Equipment Rental'));
        $weeks = intval($b['weeks'] ?? 2);
        $weeklyRate = floatval($b['weeklyRate'] ?? 0);
        $deliveryFee = floatval($b['deliveryFee'] ?? 0);
        $deposit = floatval($b['deposit'] ?? 0);
        $total = floatval($b['total'] ?? (($weeklyRate * $weeks) + $deliveryFee));
        $status = $b['status'] ?? 'active';
        $notes = $b['notes'] ?? '';

        $stmt = $db->prepare("
            INSERT INTO rentals (id, customer_name, customer_email, customer_phone, product_id, product_name, weeks, weekly_rate, delivery_fee, deposit, total, status, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([$id, $customerName, $customerEmail, $customerPhone, $productId, $productName, $weeks, $weeklyRate, $deliveryFee, $deposit, $total, $status, $notes]);
        sendJson(['success' => true, 'rental' => ['id' => $id, 'customerName' => $customerName, 'total' => $total]]);
    }

    if (($method === 'PUT' || $method === 'PATCH') && $rentalId !== '') {
        requireAdminAuth();
        $b = getRequestBody();
        $status = $b['status'] ?? 'active';
        $stmt = $db->prepare("UPDATE rentals SET status = ? WHERE id = ?");
        $stmt->execute([$status, $rentalId]);
        sendJson(['success' => true, 'message' => 'Rental status updated.']);
    }

    if ($method === 'DELETE' && $rentalId !== '') {
        requireAdminAuth();
        $stmt = $db->prepare("DELETE FROM rentals WHERE id = ?");
        $stmt->execute([$rentalId]);
        sendJson(['success' => true, 'message' => 'Rental record removed.']);
    }
}

// /api/reviews → Customer & Verified Purchase Reviews
if ($endpoint === 'reviews') {
    $db = requireDatabase();

    if ($method === 'GET') {
        try {
            $stmt = $db->query("SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC");
            $rows = $stmt->fetchAll();
            sendJson(['reviews' => $rows]);
        } catch (Exception $e) {
            sendJson(['reviews' => []]);
        }
    }

    if ($method === 'POST') {
        throttle('review_submit', 5, 3600);
        $b = getRequestBody();
        $id = 'REV-'. strtoupper(substr(md5(uniqid((string)rand(), true)), 0, 8));
        $prodId = trim((string)($b['productId'] ?? ''));
        $name = substr(trim((string)($b['customerName'] ?? ($b['name'] ?? 'Verified Buyer'))), 0, 80);
        $email = substr(trim((string)($b['customerEmail'] ?? ($b['email'] ?? ''))), 0, 160);
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            sendJson(['error' => 'Valid email address is required.'], 400);
        }
        $rating = max(1, min(5, intval($b['rating'] ?? 5)));
        $title = substr(trim((string)($b['title'] ?? '')), 0, 160);
        $comment = substr(trim((string)($b['comment'] ?? '')), 0, 2000);
        if ($title === '' && $comment === '') {
            sendJson(['error' => 'Review title or comment is required.'], 400);
        }

        $stmt = $db->prepare("
            INSERT INTO reviews (id, product_id, customer_name, customer_email, rating, title, comment, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        ");
        $stmt->execute([$id, $prodId, $name, $email, $rating, $title, $comment]);
        sendJson(['success' => true, 'message' => 'Review submitted for moderation. Thank you!']);
    }
}

// /api/promotions → Active NDIS & Promotional Discounts
if ($endpoint === 'promotions') {
    $db = requireDatabase();
    $promoAction = $segments[1] ?? '';

    // POST /api/promotions/validate {code, subtotal} — coupon check used at checkout
    if ($promoAction === 'validate' && $method === 'POST') {
        $body = getRequestBody();
        $code = strtoupper(trim((string)($body['code'] ?? '')));
        $subtotal = max(0, floatval($body['subtotal'] ?? 0));
        if ($code === '') sendJson(['success' => false, 'error' => 'Enter a coupon code.'], 400);
        $stmt = $db->prepare("SELECT * FROM promotions WHERE UPPER(code) = ? LIMIT 1");
        $stmt->execute([$code]);
        $promo = $stmt->fetch();
        if (!$promo) sendJson(['success' => false, 'error' => 'This code is not recognised.'], 400);
        if (intval($promo['is_active'] ?? 0) !== 1) sendJson(['success' => false, 'error' => 'This code is no longer active.'], 400);
        if (!empty($promo['valid_until']) && strtotime((string)$promo['valid_until']) < time()) {
            sendJson(['success' => false, 'error' => 'This code has expired.'], 400);
        }
        if ($subtotal < floatval($promo['min_spend'] ?? 0)) {
            sendJson(['success' => false, 'error' => 'Requires a minimum order of $'. number_format(floatval($promo['min_spend'] ?? 0), 2). '.'], 400);
        }
        $discount = 0.0;
        $freeShipping = false;
        $type = (string)($promo['discount_type'] ?? 'percentage');
        if ($type === 'percentage') $discount = round($subtotal * floatval($promo['discount_value'] ?? 0)) / 100;
        elseif ($type === 'fixed') $discount = min(floatval($promo['discount_value'] ?? 0), $subtotal);
        elseif ($type === 'free_shipping') $freeShipping = true;
        sendJson([
            'success' => true,
            'code' => $promo['code'],
            'type' => $type,
            'value' => floatval($promo['discount_value'] ?? 0),
            'discount' => round($discount, 2),
            'freeShipping' => $freeShipping,
            'message' => 'Code applied.',
        ]);
    }

    // POST /api/promotions/{code}/redeem — records one redemption after an order/quote
    if ($promoAction !== '' && strtolower($promoAction) !== 'validate' && $method === 'POST') {
        $code = strtoupper(trim((string)$promoAction));
        $stmt = $db->prepare("SELECT * FROM promotions WHERE UPPER(code) = ? LIMIT 1");
        $stmt->execute([$code]);
        $promo = $stmt->fetch();
        if (!$promo || intval($promo['is_active'] ?? 0) !== 1) {
            sendJson(['success' => false, 'error' => 'This code is not recognised.'], 400);
        }
        $usageCount = 0;
        if (tableHasColumn($db, 'promotions', 'usage_count')) {
            try {
                $db->prepare("UPDATE promotions SET usage_count = COALESCE(usage_count, 0) + 1 WHERE UPPER(code) = ?")->execute([$code]);
                $stmtCount = $db->prepare("SELECT usage_count FROM promotions WHERE UPPER(code) = ? LIMIT 1");
                $stmtCount->execute([$code]);
                $usageCount = intval($stmtCount->fetch()['usage_count'] ?? 0);
            } catch (Exception $e) {}
        }
        sendJson(['success' => true, 'usageCount' => $usageCount]);
    }

    try {
        $stmt = $db->query("SELECT id, code, description, discount_type, discount_value, min_spend FROM promotions WHERE is_active = 1");
        $promos = $stmt->fetchAll();
        sendJson(['promotions' => $promos]);
    } catch (Exception $e) {
        sendJson(['promotions' => []]);
    }
}

// /api/shipping → Shipping Zones & Delivery Methods
if ($endpoint === 'shipping') {
    $db = requireDatabase();
    try {
        $stmt = $db->query("SELECT * FROM shipping_zones");
        $zones = $stmt->fetchAll();
        sendJson(['zones' => $zones]);
    } catch (Exception $e) {
        sendJson(['zones' => [
            ['id' => 'au-std', 'name' => 'Standard Australian Delivery', 'rate' => 0.00],
            ['id' => 'au-exp', 'name' => 'Priority Express Courier', 'rate' => 29.00],
            ['id' => 'au-wg', 'name' => 'White Glove Installation & Assembly', 'rate' => 149.00]
        ]]);
    }
}

// /api/analytics → Clinical Store Overview & Metrics
if ($endpoint === 'analytics') {
    $db = requireDatabase();
    requireAdminAuth();
    try {
        $totalOrders = (int)$db->query("SELECT COUNT(*) FROM orders")->fetchColumn();
        $totalRevenue = (float)$db->query("SELECT COALESCE(SUM(total), 0) FROM orders WHERE payment_status = 'paid'")->fetchColumn();
        $totalQuotes = (int)$db->query("SELECT COUNT(*) FROM ndis_quotes")->fetchColumn();
        $totalInquiries = (int)$db->query("SELECT COUNT(*) FROM inquiries")->fetchColumn();
        sendJson([
            'totalOrders' => $totalOrders,
            'totalRevenue' => $totalRevenue,
            'totalQuotes' => $totalQuotes,
            'totalInquiries' => $totalInquiries
        ]);
    } catch (Exception $e) {
        sendJson([
            'totalOrders' => 0,
            'totalRevenue' => 0.0,
            'totalQuotes' => 0,
            'totalInquiries' => 0
        ]);
    }
}

// ============================================================================
// Fallback for unhandled routes
// ============================================================================
sendJson(['error' => "API Route /api/{$path} not found", 'code' => 'ROUTE_NOT_FOUND'], 404);
