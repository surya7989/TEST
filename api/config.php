<?php
// ============================================================================
// AT SPECIALISTS AUSTRALIA - HOSTINGER NATIVE PHP REST API CONFIGURATION
// ============================================================================

declare(strict_types=1);

require_once __DIR__. '/smtpHelper.php';

// ----------------------------------------------------------------------------
// 1. Load Environment Variables (.env file or System/Host Environment)
// ----------------------------------------------------------------------------
$envCandidates = [
    __DIR__ . '/.env',
    __DIR__ . '/../.env',
    __DIR__ . '/../../.env',
    dirname(__DIR__) . '/.env'
];

$envVars = [];
foreach ($envCandidates as $envFile) {
    if (file_exists($envFile) && is_readable($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        if ($lines !== false) {
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '' || strpos($line, '#') === 0 || strpos($line, '=') === false) continue;
                list($k, $v) = explode('=', $line, 2);
                $k = trim($k);
                $v = trim($v);
                $v = trim($v, '"\'');
                $envVars[$k] = $v;
                if (!isset($_ENV[$k])) $_ENV[$k] = $v;
            }
            break;
        }
    }
}

// ----------------------------------------------------------------------------
// 2. CORS & Security Headers
// ----------------------------------------------------------------------------
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
// Production allowlist: only the live storefront domains. Local development
// origins are ONLY permitted when explicitly enabled via DEV_CORS=true.
$allowed_origins = [
    'https://atspecialists.com.au',
    'https://www.atspecialists.com.au',
    'https://api.atspecialists.com.au',
    'https://new.atspecialists.com.au'
];

$clientUrl = $envVars['CLIENT_URL'] ?? $_ENV['CLIENT_URL'] ?? (getenv('CLIENT_URL') ?: '');
if (!empty($clientUrl) && !in_array($clientUrl, $allowed_origins, true)) {
    $allowed_origins[] = rtrim($clientUrl, '/');
}

$devCors = $envVars['DEV_CORS'] ?? $_ENV['DEV_CORS'] ?? (getenv('DEV_CORS') ?: 'false');
if ($devCors === 'true') {
    $allowed_origins = array_merge($allowed_origins, [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:4000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4000'
    ]);
}

// Strict Origin Matching (No substring wildcards)
if ($origin !== '' && in_array($origin, $allowed_origins, true)) {
    header("Access-Control-Allow-Origin: " . $origin);
    header("Vary: Origin");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Content-Type, Authorization, Accept, X-Requested-With, X-Order-Token");
header("X-Content-Type-Options: nosniff");
header("X-Frame-Options: SAMEORIGIN");
header("Referrer-Policy: strict-origin-when-cross-origin");

// Handle preflight OPTIONS requests immediately
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ----------------------------------------------------------------------------
// 3. Database Credentials (Hostinger MySQL / MariaDB)
// ----------------------------------------------------------------------------
$db_host = $envVars['DB_HOST'] ?? $_ENV['DB_HOST'] ?? (getenv('DB_HOST') ?: 'localhost');
$db_port = $envVars['DB_PORT'] ?? $_ENV['DB_PORT'] ?? (getenv('DB_PORT') ?: '3306');
$db_user = $envVars['DB_USER'] ?? $_ENV['DB_USER'] ?? (getenv('DB_USER') ?: '');
$db_pass = $envVars['DB_PASSWORD'] ?? $envVars['DB_PASS'] ?? $_ENV['DB_PASSWORD'] ?? $_ENV['DB_PASS'] ?? (getenv('DB_PASSWORD') ?: getenv('DB_PASS') ?: '');
$db_name = $envVars['DB_NAME'] ?? $_ENV['DB_NAME'] ?? (getenv('DB_NAME') ?: '');
$jwt_secret = $envVars['JWT_SECRET'] ?? $_ENV['JWT_SECRET'] ?? (getenv('JWT_SECRET') ?: '');
// Fail closed: never sign tokens with a weak or default secret. Set JWT_SECRET
// (min 32 chars) in the server environment before deploying.
if (strlen($jwt_secret) < 32 || stripos($jwt_secret, 'default') !== false || stripos($jwt_secret, 'change_in_prod') !== false || stripos($jwt_secret, 'replace_with') !== false) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['success' => false, 'error' => 'Server signing key is not configured. Set JWT_SECRET (min 32 chars).', 'code' => 'SIGNING_KEY_MISSING']);
    exit;
}
$admin_email = $envVars['ADMIN_NOTIFICATION_EMAIL'] ?? $envVars['SMTP_FROM_EMAIL'] ?? $_ENV['ADMIN_NOTIFICATION_EMAIL'] ?? (getenv('ADMIN_NOTIFICATION_EMAIL') ?: getenv('SMTP_FROM_EMAIL') ?: 'admin@atspecialists.com.au');

// SMTP Server Configuration (Zoho Mail)
$smtp_host = $envVars['SMTP_HOST'] ?? $_ENV['SMTP_HOST'] ?? (getenv('SMTP_HOST') ?: 'smtp.zoho.in');
$smtp_port = $envVars['SMTP_PORT'] ?? $_ENV['SMTP_PORT'] ?? (getenv('SMTP_PORT') ?: '465');
$smtp_secure = $envVars['SMTP_SECURE'] ?? $_ENV['SMTP_SECURE'] ?? (getenv('SMTP_SECURE') ?: 'ssl');
$smtp_user = $envVars['SMTP_USER'] ?? $_ENV['SMTP_USER'] ?? (getenv('SMTP_USER') ?: 'admin@atspecialists.com.au');
$smtp_pass = $envVars['SMTP_PASS'] ?? $_ENV['SMTP_PASS'] ?? (getenv('SMTP_PASS') ?: '');
$smtp_from_name = $envVars['SMTP_FROM_NAME'] ?? $_ENV['SMTP_FROM_NAME'] ?? (getenv('SMTP_FROM_NAME') ?: 'AT Specialists Australia');
$smtp_from_email = $envVars['SMTP_FROM_EMAIL'] ?? $_ENV['SMTP_FROM_EMAIL'] ?? (getenv('SMTP_FROM_EMAIL') ?: 'admin@atspecialists.com.au');

// PayPal Configuration
$paypal_client_id = $envVars['PAYPAL_CLIENT_ID'] ?? $_ENV['PAYPAL_CLIENT_ID'] ?? (getenv('PAYPAL_CLIENT_ID') ?: '');
$paypal_secret = $envVars['PAYPAL_SECRET'] ?? $_ENV['PAYPAL_SECRET'] ?? (getenv('PAYPAL_SECRET') ?: '');
$paypal_mode = strtolower($envVars['PAYPAL_MODE'] ?? $_ENV['PAYPAL_MODE'] ?? (getenv('PAYPAL_MODE') ?: 'sandbox'));
$currency = $envVars['CURRENCY'] ?? $_ENV['CURRENCY'] ?? (getenv('CURRENCY') ?: 'AUD');

// AT Specialists Company Constants
define('ATS_COMPANY_NAME', 'Assistive Technology Specialists Pty Ltd');
define('ATS_TRADING_NAME', 'AT Specialists Australia');
define('ATS_ABN', '48 123 456 789');
define('ATS_NDIS_NUMBER', '4-3M19KL2-PROV');
define('ATS_PHONE', '0494 767 409');
define('ATS_EMAIL', 'admin@atspecialists.com.au');
define('ATS_ACCOUNTS_EMAIL', 'accounts@atspecialists.com.au');
define('ATS_ADDRESS', 'Level 2, 88 Holmes Road, Moonee Ponds VIC 3039, Australia');
define('ATS_BANK_NAME', 'Commonwealth Bank of Australia (CBA)');
define('ATS_BANK_BSB', '063-000');
define('ATS_BANK_ACC', '1088 4422');
define('ATS_BANK_ACC_NAME', 'Assistive Technology Specialists Trust Account');

// ----------------------------------------------------------------------------
// 4. Initialize PDO Database Connection (Canonical Database Authority)
// ----------------------------------------------------------------------------
/** @var PDO|null $pdo */
$pdo = null;
$db_error = null;

if (!empty($db_name) && !empty($db_user)) {
    try {
        $dsn = "mysql:host={$db_host};port={$db_port};dbname={$db_name};charset=utf8mb4";
        $pdo = new PDO($dsn, $db_user, $db_pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
        ]);
    } catch (Exception $e) {
        $pdo = null;
        $db_error = $e->getMessage();
        error_log("Database connection error: ". $e->getMessage());
    }
}

// ----------------------------------------------------------------------------
// 5. Response & Body Helpers
// ----------------------------------------------------------------------------
function sendJson(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function getRequestBody(): array {
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

// ----------------------------------------------------------------------------
// 6. JWT & Authentication Helpers
// ----------------------------------------------------------------------------
function base64UrlEncode(string $data): string {
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64UrlDecode(string $data): string {
    return base64_decode(strtr($data, '-_', '+/'));
}

function generateToken(array $user, int $expirySeconds = 86400 * 7): string {
    global $jwt_secret;
    // Admin sessions are capped at 12 hours even if a longer expiry is passed.
    if (($user['role'] ?? '') === 'admin') {
        $expirySeconds = min($expirySeconds, 43200);
    }
    $header = base64UrlEncode((string)json_encode(['typ' => 'JWT', 'alg' => 'HS256']));
    $payload = base64UrlEncode((string)json_encode([
        'id' => $user['id'] ?? 1,
        'email' => $user['email'] ?? '',
        'name' => $user['name'] ?? 'User',
        'role' => $user['role'] ?? 'customer',
        'iat' => time(),
        'exp' => time() + $expirySeconds
    ]));
    $signature = base64UrlEncode(hash_hmac('sha256', "$header.$payload", $jwt_secret, true));
    return "$header.$payload.$signature";
}

function verifyToken(?string $token): ?array {
    global $jwt_secret;
    if (!$token) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;
    list($header, $payload, $signature) = $parts;
    
    $expected = base64UrlEncode(hash_hmac('sha256', "$header.$payload", $jwt_secret, true));
    if (!hash_equals($expected, $signature)) return null;

    $decoded = json_decode(base64UrlDecode($payload), true);
    if (!is_array($decoded) || !isset($decoded['exp']) || $decoded['exp'] < time()) {
        return null;
    }
    return $decoded;
}

function getBearerToken(): ?string {
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (!$authHeader && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
        return trim($matches[1]);
    }
    return null;
}

function getAdminFromToken(): ?array {
    $token = getBearerToken();
    if (!$token) return null;
    $decoded = verifyToken($token);
    if ($decoded && isset($decoded['role']) && $decoded['role'] === 'admin') {
        return $decoded;
    }
    return null;
}

function requireAdminAuth(): array {
    $admin = getAdminFromToken();
    if (!$admin) {
        sendJson(['success' => false, 'error' => 'Unauthorized. Admin authentication required.'], 401);
    }
    return $admin;
}

function getCustomerFromToken(): ?array {
    $token = getBearerToken();
    if (!$token) return null;
    $decoded = verifyToken($token);
    return is_array($decoded) ? $decoded : null;
}

function generateOrderAccessToken(string $orderId, string $customerEmail): string {
    global $jwt_secret;
    return hash_hmac('sha256', "ORDER_ACCESS:{$orderId}:". strtolower(trim($customerEmail)), $jwt_secret);
}

function verifyOrderAccessToken(string $orderId, string $customerEmail, string $token): bool {
    $expected = generateOrderAccessToken($orderId, $customerEmail);
    return hash_equals($expected, $token);
}

// ----------------------------------------------------------------------------
// 7. Lightweight persistent rate limiter (file-backed, per-IP + action key)
// ----------------------------------------------------------------------------
function clientIp(): string {
    $candidates = [
        $_SERVER['HTTP_CF_CONNECTING_IP'] ?? '',
        $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '',
        $_SERVER['REMOTE_ADDR'] ?? 'unknown'
    ];
    $ip = trim(explode(',', (string)$candidates[1])[0] ?? '');
    if ($ip === '' || !filter_var($ip, FILTER_VALIDATE_IP)) {
        $ip = (string)($candidates[0] !== '' && filter_var($candidates[0], FILTER_VALIDATE_IP) ? $candidates[0] : $candidates[2]);
    }
    return substr($ip, 0, 64);
}

/**
 * Fixed-window throttle. Sends HTTP 429 when $maxAttempts is exceeded within
 * $windowSeconds for the given $action + client IP. State lives in the system
 * temp dir so it works on shared hosting without extra extensions.
 */
function throttle(string $action, int $maxAttempts = 5, int $windowSeconds = 60): void {
    $dir = sys_get_temp_dir() . '/ats_throttle';
    if (!is_dir($dir)) @mkdir($dir, 0700, true);
    $key = preg_replace('/[^a-z0-9_-]/i', '', $action) . '_' . md5(clientIp());
    $file = $dir . '/' . $key . '.json';
    $now = time();
    $state = ['count' => 0, 'reset' => $now + $windowSeconds];
    if (is_file($file)) {
        $parsed = json_decode((string)@file_get_contents($file), true);
        if (is_array($parsed) && isset($parsed['count'], $parsed['reset'])) {
            $state = $parsed;
        }
    }
    if ($now >= (int)$state['reset']) {
        $state = ['count' => 0, 'reset' => $now + $windowSeconds];
    }
    $state['count']++;
    @file_put_contents($file, json_encode($state), LOCK_EX);
    if ($state['count'] > $maxAttempts) {
        $retry = max(1, (int)$state['reset'] - $now);
        http_response_code(429);
        header('Content-Type: application/json; charset=utf-8');
        header('Retry-After: ' . $retry);
        echo json_encode(['success' => false, 'error' => 'Too many requests. Please wait a moment and try again.', 'code' => 'RATE_LIMITED', 'retryAfter' => $retry]);
        exit;
    }
}

/**
 * Canonical public base URL. Never falls back to the request Host header
 * (prevents Host-header poisoning of emailed links). Configure CLIENT_URL.
 */
function publicBaseUrl(): string {
    global $envVars;
    $url = rtrim((string)($envVars['CLIENT_URL'] ?? $_ENV['CLIENT_URL'] ?? ''), '/');
    if ($url !== '' && preg_match('#^https://([a-z0-9-]+\.)*atspecialists\.com\.au$#i', $url)) {
        return $url;
    }
    return 'https://atspecialists.com.au';
}
