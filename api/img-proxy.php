<?php
/**
 * Local Asset Resolver for AT Specialists Australia
 * 
 * All product images are now stored locally in /images/products/.
 * No external proxying is needed.
 * 
 * If any client or legacy cache requests /img-proxy?url=...,
 * this script redirects to or serves the local static file directly.
 */

// CORS headers
$imgOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$imgAllowed = [
    'https://atspecialists.com.au',
    'https://www.atspecialists.com.au',
    'https://api.atspecialists.com.au',
    'https://new.atspecialists.com.au'
];
if ($imgOrigin !== '' && in_array($imgOrigin, $imgAllowed, true)) {
    header('Access-Control-Allow-Origin: ' . $imgOrigin);
    header('Vary: Origin');
}
header('Access-Control-Allow-Methods: GET');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'GET' && $_SERVER['REQUEST_METHOD'] !== 'HEAD') {
    http_response_code(405);
    echo 'Method not allowed';
    exit;
}

$imageUrl = '';
if (!empty($_GET['path'])) {
    $imageUrl = trim((string)$_GET['path']);
} elseif (!empty($_GET['b64'])) {
    $b64 = strtr((string)$_GET['b64'], '-_', '+/');
    $imageUrl = trim((string)base64_decode($b64));
} elseif (isset($_GET['url'])) {
    $imageUrl = trim((string)$_GET['url']);
}

// Extract the clean basename
$filename = '';
if ($imageUrl !== '') {
    $parsedPath = parse_url($imageUrl, PHP_URL_PATH);
    if ($parsedPath) {
        $rawBase = basename($parsedPath);
        $filename = preg_replace('/[^a-zA-Z0-9._-]/', '_', $rawBase);
    }
}

// Potential local paths for the image
$rootDir = dirname(__DIR__);
$searchPaths = [
    $rootDir . '/images/products/' . $filename,
    $rootDir . '/dist/images/products/' . $filename,
    $rootDir . '/apps/frontend/public/images/products/' . $filename,
];

$foundFile = null;
if ($filename !== '') {
    foreach ($searchPaths as $sp) {
        if (file_exists($sp) && is_file($sp) && filesize($sp) > 100) {
            $foundFile = $sp;
            break;
        }
    }
}

// Fallback to primary product image if not found
if (!$foundFile) {
    $fallbackFile = $rootDir . '/apps/frontend/public/images/products/Configura-Comfort-Black-Upright-2026.webp';
    if (file_exists($fallbackFile)) {
        $foundFile = $fallbackFile;
        $filename = 'Configura-Comfort-Black-Upright-2026.webp';
    }
}

if ($foundFile) {
    // 301 Permanent Redirect to local static asset for instant browser caching
    header('Location: /images/products/' . $filename, true, 301);
    exit;
}

http_response_code(404);
echo 'Image not found';
