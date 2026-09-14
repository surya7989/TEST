<?php
/**
 * Image Proxy for AT Specialists Australia
 * 
 * Proxies product images from rehabhire.com.au to bypass hotlink protection.
 * Caches images locally for 24 hours to reduce upstream requests.
 * 
 * Usage: /api/img-proxy.php?url=https://www.rehabhire.com.au/wp-content/uploads/...
 */

// CORS: allowlist policy for production and development storefronts
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

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo 'Method not allowed';
    exit;
}

$imageUrl = isset($_GET['url']) ? trim((string)$_GET['url']) : '';

if ($imageUrl === '') {
    http_response_code(400);
    echo 'Missing URL';
    exit;
}

// Parse URL components (handles UTF-8 paths)
$parts = parse_url($imageUrl);
if (!$parts || empty($parts['host'])) {
    http_response_code(400);
    echo 'Malformed URL';
    exit;
}

$scheme = strtolower($parts['scheme'] ?? '');
$host = strtolower($parts['host'] ?? '');
$allowedHosts = ['www.rehabhire.com.au', 'rehabhire.com.au'];
if (($scheme !== 'http' && $scheme !== 'https') || !in_array($host, $allowedHosts, true)) {
    http_response_code(400);
    echo 'Invalid image host';
    exit;
}

// Safely encode any non-ASCII characters in the path (e.g. ®, ™) so upstream HTTP request succeeds
$path = $parts['path'] ?? '';
$encodedPath = preg_replace_callback('/[^\x20-\x7e]/', function ($matches) {
    return rawurlencode($matches[0]);
}, $path);

$upstreamUrl = $scheme . '://' . $host . $encodedPath;
if (!empty($parts['query'])) {
    $upstreamUrl .= '?' . $parts['query'];
}

// Only raster product photos — never proxy SVG (scriptable) or unexpected types.
$ext = strtolower(pathinfo($path, PATHINFO_EXTENSION));
if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
    $ext = 'jpg';
}

// Cache directory (+ lightweight LRU pruning so unbounded query strings
// cannot fill the disk: cap at ~2000 entries, evict oldest first)
$cacheDir = __DIR__. '/data/img-cache';
if (!is_dir($cacheDir)) {
    mkdir($cacheDir, 0755, true);
}
try {
    $cached = glob($cacheDir . '/*.jpg') ?: [];
    foreach (['jpeg', 'png', 'gif', 'webp'] as $e) {
        $cached = array_merge($cached, glob($cacheDir . '/*.' . $e) ?: []);
    }
    if (count($cached) > 2000) {
        usort($cached, function ($a, $b) { return filemtime($a) - filemtime($b); });
        foreach (array_slice($cached, 0, count($cached) - 2000) as $old) {
            @unlink($old);
            @unlink(preg_replace('/\.[^.]+$/', '.meta', (string)$old));
        }
    }
} catch (Exception $e) {}

// Generate cache key from normalized upstream URL
$cacheKey = md5($upstreamUrl);
$cacheFile = $cacheDir. '/'. $cacheKey. '.'. $ext;
$cacheMetaFile = $cacheDir. '/'. $cacheKey. '.meta';

// Check cache (24 hour TTL)
$cacheTTL = 86400;
if (file_exists($cacheFile) && file_exists($cacheMetaFile) && (time() - filemtime($cacheFile)) < $cacheTTL) {
    $meta = json_decode(file_get_contents($cacheMetaFile), true);
    $contentType = isset($meta['content_type']) ? $meta['content_type'] : 'image/jpeg';
    
    header('Content-Type: '. $contentType);
    header('Cache-Control: public, max-age=86400');
    header('X-Cache: HIT');
    readfile($cacheFile);
    exit;
}

// Fetch from upstream
// NOTE: do NOT send Referer/Origin — rehabhire Cloudflare 403s requests
// carrying them; a bare crawler UA loads reliably.
$ch = curl_init();
// Abort oversized responses (disk-fill protection): 12MB cap.
$maxBytes = 12 * 1024 * 1024;
curl_setopt_array($ch, [
    CURLOPT_URL => $upstreamUrl,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3,
    CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
    CURLOPT_TIMEOUT => 15,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_NOPROGRESS => false,
    CURLOPT_PROGRESSFUNCTION => function ($ch, $dlTotal, $dlNow) use ($maxBytes) {
        return ($dlNow > $maxBytes) ? 1 : 0;
    },
    CURLOPT_USERAGENT => 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    CURLOPT_HTTPHEADER => [
        'Accept: image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language: en-AU,en;q=0.9',
    ],
]);

$data = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
$error = curl_error($ch);
curl_close($ch);

// If upstream failed (e.g. Cloudflare 403 / 404), fallback to web archive cache
if ($httpCode !== 200 || empty($data)) {
    $archiveUrl = 'https://web.archive.org/web/20240000000000id_/'. $upstreamUrl;
    $chArch = curl_init();
    curl_setopt_array($chArch, [
        CURLOPT_URL => $archiveUrl,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_MAXREDIRS => 3,
        CURLOPT_REDIR_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_NOPROGRESS => false,
        CURLOPT_PROGRESSFUNCTION => function ($ch, $dlTotal, $dlNow) use ($maxBytes) {
            return ($dlNow > $maxBytes) ? 1 : 0;
        },
        CURLOPT_USERAGENT => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        CURLOPT_HTTPHEADER => [
            'Accept: image/*,*/*;q=0.8',
        ],
    ]);
    $data = curl_exec($chArch);
    $httpCode = curl_getinfo($chArch, CURLINFO_HTTP_CODE);
    $contentType = curl_getinfo($chArch, CURLINFO_CONTENT_TYPE);
    curl_close($chArch);
}

if ($httpCode !== 200 || empty($data)) {
    http_response_code(404);
    echo "Image not found (HTTP $httpCode)";
    exit;
}

// Validate content type: raster images only (SVG is scriptable — never proxy it).
if (strpos($contentType, 'image') === false || stripos($contentType, 'svg') !== false) {
    http_response_code(502);
    echo 'Upstream did not return a raster image';
    exit;
}

// Save to cache
file_put_contents($cacheFile, $data);
file_put_contents($cacheMetaFile, json_encode([
    'content_type' => $contentType,
    'url' => $upstreamUrl,
    'cached_at' => date('c'),
]));

// Serve the image
header('Content-Type: '. $contentType);
header('Cache-Control: public, max-age=86400');
header('X-Cache: MISS');
echo $data;
