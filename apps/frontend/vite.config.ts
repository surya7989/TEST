import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';
import type { IncomingMessage, ServerResponse } from 'http';
import https from 'https';

/**
 * Recursively copy files/dirs from src to dest, skipping listed skip dirs.
 */
function copyPublicSelective(src: string, dest: string, skipDirs: string[] = []) {
  if (!fs.existsSync(src)) return;
  const entries = fs.readdirSync(src, { withFileTypes: true });
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of entries) {
    if (skipDirs.includes(entry.name)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyPublicSelective(srcPath, destPath, skipDirs);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Dev image cache (mirrors production PHP cache): repeat views are served
// from disk and never re-hit the supplier firewall.
const IMG_CACHE_DIR = path.resolve(__dirname, 'node_modules/.cache/img-proxy');
const IMG_CACHE_TTL = 7 * 24 * 3600 * 1000;
try {
  fs.mkdirSync(IMG_CACHE_DIR, { recursive: true });
} catch { /* ignore */ }

function imgCachePaths(imageUrl: string) {
  const key = createHash('md5').update(imageUrl).digest('hex');
  const ext = (path.extname(new URL(imageUrl).pathname) || '.jpg').split('?')[0].slice(0, 5) || '.jpg';
  return {
    file: path.join(IMG_CACHE_DIR, key + ext),
    meta: path.join(IMG_CACHE_DIR, key + '.json'),
  };
}

export default defineConfig({
  plugins: [
    react(),
    // Copy public assets to dist EXCEPT the large images/products folder
    // (473 MB). The web server (Hostinger) serves images directly from
    // public/images/products/ so they don't need to be in dist/.
    {
      name: 'copy-public-selective',
      closeBundle() {
        const publicDir = path.resolve(__dirname, 'public');
        const distDir = path.resolve(__dirname, 'dist');
        // Skip the heavy images directory — web server handles it
        copyPublicSelective(publicDir, distDir, ['products']);
        console.log('✅ Copied public assets (skipped images/products) → dist/');
      },
    },
    {
      name: 'image-proxy',
      configureServer(server) {
        server.middlewares.use('/img-proxy/', (req: IncomingMessage, res: ServerResponse) => {
          // Guard helper – prevents ERR_HTTP_HEADERS_SENT crashes
          const safeEnd = (statusCode: number, body: string, contentType = 'text/plain') => {
            if (res.headersSent) return;
            res.writeHead(statusCode, { 'Content-Type': contentType });
            res.end(body);
          };
          const safePipe = (upstream: IncomingMessage) => {
            if (res.headersSent) { upstream.resume(); return; }
            res.writeHead(200, {
              'Content-Type': upstream.headers['content-type'] || 'image/jpeg',
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
            });
            upstream.pipe(res);
          };
          // Buffer upstream into dev cache, then serve from disk
          const serveBuffer = (data: Buffer, contentType: string, cachePaths: { file: string; meta: string }) => {
            if (res.headersSent) return;
            try {
              fs.writeFileSync(cachePaths.file, data);
              fs.writeFileSync(cachePaths.meta, JSON.stringify({ contentType }));
            } catch { /* cache write is best-effort */ }
            res.writeHead(200, {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=86400',
              'Access-Control-Allow-Origin': '*',
              'X-Cache': 'MISS',
            });
            res.end(data);
          };
          const collect = (upstream: IncomingMessage,
            onOk: (data: Buffer, contentType: string) => void,
            onBad: () => void) => {
            const chunks: Buffer[] = [];
            upstream.on('data', (c) => chunks.push(c as Buffer));
            upstream.on('end', () => {
              if (upstream.statusCode !== 200) {
                upstream.resume();
                onBad();
                return;
              }
              onOk(Buffer.concat(chunks), (upstream.headers['content-type'] as string) || 'image/jpeg');
            });
            upstream.on('error', onBad);
          };

          try {
            const reqUrl = new URL(req.url || '', 'http://localhost');
            const imageUrl = reqUrl.searchParams.get('url');
            
            if (!imageUrl || !imageUrl.includes('rehabhire.com.au')) {
              safeEnd(400, 'Invalid image URL');
              return;
            }

            const parsedUrl = new URL(imageUrl);

            // Serve from dev disk cache when fresh
            const cachePaths = imgCachePaths(imageUrl);
            try {
              const stat = fs.statSync(cachePaths.file);
              if (Date.now() - stat.mtimeMs < IMG_CACHE_TTL && stat.size > 0) {
                let ct = 'image/jpeg';
                try {
                  ct = JSON.parse(fs.readFileSync(cachePaths.meta, 'utf8')).contentType || ct;
                } catch { /* ignore */ }
                if (!res.headersSent) {
                  res.writeHead(200, {
                    'Content-Type': ct,
                    'Cache-Control': 'public, max-age=86400',
                    'Access-Control-Allow-Origin': '*',
                    'X-Cache': 'HIT',
                  });
                  fs.createReadStream(cachePaths.file).pipe(res);
                  return;
                }
              }
            } catch { /* cache miss — fetch upstream */ }
            
            const fetchArchiveFallback = (originalUrl: string) => {
              if (res.headersSent) return;
              const archiveUrl = 'https://web.archive.org/web/20240000000000id_/' + originalUrl;
              const followArchive = (url: string, depth = 0) => {
                if (res.headersSent) return;
                if (depth > 5) { safeEnd(502, 'Too many redirects'); return; }
                const aParsed = new URL(url);
                const aReq = https.get({
                  hostname: aParsed.hostname,
                  path: aParsed.pathname + aParsed.search,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'image/*,*/*;q=0.8',
                  },
                }, (aRes) => {
                  if (aRes.statusCode && [301, 302, 307, 308].includes(aRes.statusCode) && aRes.headers.location) {
                    aRes.resume();
                    return followArchive(new URL(aRes.headers.location, url).toString(), depth + 1);
                  }
                  if (aRes.statusCode !== 200) {
                    aRes.resume();
                    safeEnd(aRes.statusCode || 404, 'Image not found in archive');
                    return;
                  }
                  safePipe(aRes);
                });
                aReq.on('error', (err) => safeEnd(502, 'Archive fetch error: ' + err.message));
                aReq.setTimeout(15000, () => { aReq.destroy(); safeEnd(504, 'Archive timeout'); });
              };
              followArchive(archiveUrl);
            };

            const proxyReq = https.get({
              hostname: parsedUrl.hostname,
              path: parsedUrl.pathname + parsedUrl.search,
              headers: {
                // NOTE: do NOT send Referer/Origin — rehabhire Cloudflare 403s
                // requests carrying them; bare Googlebot UA loads reliably.
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Encoding': 'identity',
              },
            }, (proxyRes) => {
              // Follow redirects
              if (proxyRes.statusCode && [301, 302, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
                proxyRes.resume();
                const redirectUrl = proxyRes.headers.location;
                const redirectParsed = new URL(redirectUrl, imageUrl);
                const redirectReq = https.get({
                  hostname: redirectParsed.hostname,
                  path: redirectParsed.pathname + redirectParsed.search,
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
                    'Accept': 'image/*,*/*;q=0.8',
                  },
                }, (redirectRes) => {
                  if (redirectRes.statusCode !== 200) {
                    redirectRes.resume();
                    fetchArchiveFallback(imageUrl);
                    return;
                  }
                  collect(redirectRes,
                    (data, ct) => serveBuffer(data, ct, cachePaths),
                    () => fetchArchiveFallback(imageUrl));
                });
                redirectReq.on('error', () => fetchArchiveFallback(imageUrl));
                return;
              }

              if (proxyRes.statusCode !== 200) {
                proxyRes.resume();
                fetchArchiveFallback(imageUrl);
                return;
              }

              collect(proxyRes,
                (data, ct) => serveBuffer(data, ct, cachePaths),
                () => fetchArchiveFallback(imageUrl));
            });
            
            proxyReq.on('error', () => fetchArchiveFallback(imageUrl));
            proxyReq.setTimeout(10000, () => { proxyReq.destroy(); fetchArchiveFallback(imageUrl); });
          } catch (err) {
            safeEnd(500, 'Internal proxy error');
          }
        });
      },
    },
  ],
  envDir: path.resolve(__dirname, '../../'),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom', 'react-router-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'jspdf', 'html2canvas'],
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'https://new.atspecialists.com.au',
        changeOrigin: true,
        secure: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
    // Do NOT let Vite bulk-copy ALL of public/ into dist/ — the images/products
    // folder is 473 MB and is served directly by the web server (Hostinger).
    // We copy only the small static assets we actually need in dist/.
    copyPublicDir: false,
    // Homepage must NOT preload the 6MB+ catalog or the PDF engine — they load
    // on demand when shop/admin routes import them. Preloading them delays LCP.
    modulePreload: {
      resolveDependencies: (filename, deps) => {
        return deps.filter((d) => !d.includes('catalog-data') && !d.includes('vendor-pdf'));
      },
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('products.json')) {
            return 'catalog-data';
          }
          if (id.includes('node_modules/jspdf') || id.includes('node_modules/html2canvas')) {
            return 'vendor-pdf';
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/framer-motion') || id.includes('node_modules/lucide-react')) {
            return 'vendor-ui';
          }
          if (id.includes('node_modules/@paypal')) {
            return 'vendor-paypal';
          }
          if (id.includes('node_modules/react-hook-form') || id.includes('node_modules/zod')) {
            return 'vendor-forms';
          }
          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }
        },
      },
    },
  },
});