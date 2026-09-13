const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.resolve(rootDir, 'apps', 'frontend', 'dist');
const rootDist = path.resolve(rootDir, 'dist');

if (fs.existsSync(distDir)) {
  console.log('📦 Post-build: Copying build output to repository root and dist/...');
  
  // 1. Copy to root dist/
  if (!fs.existsSync(rootDist)) {
    fs.mkdirSync(rootDist, { recursive: true });
  }
  fs.cpSync(distDir, rootDist, { recursive: true });

  // 2. Ensure api/ and backend files are available in dist/ (for when Hostinger serves from dist)
  const apiDir = path.join(rootDir, 'api');
  const distApi = path.join(rootDist, 'api');
  if (fs.existsSync(apiDir)) {
    fs.cpSync(apiDir, distApi, { recursive: true, force: true });
  }

  // 3. Copy .htaccess to dist/
  const htaccessFile = path.join(rootDir, '.htaccess');
  const distHtaccess = path.join(rootDist, '.htaccess');
  if (fs.existsSync(htaccessFile)) {
    fs.copyFileSync(htaccessFile, distHtaccess);
  }

  // 4. Copy images/ to dist/
  const imagesDir = path.join(rootDir, 'images');
  const distImages = path.join(rootDist, 'images');
  if (fs.existsSync(imagesDir)) {
    fs.cpSync(imagesDir, distImages, { recursive: true, force: true });
  }

  // 5. Copy hostinger_schema.sql to dist/
  const schemaFile = path.join(rootDir, 'hostinger_schema.sql');
  const distSchema = path.join(rootDist, 'hostinger_schema.sql');
  if (fs.existsSync(schemaFile)) {
    fs.copyFileSync(schemaFile, distSchema);
  }

  // 6. Copy index.html and assets directly to root so Apache finds index.html regardless of web root
  const items = fs.readdirSync(distDir);
  for (const item of items) {
    const src = path.join(distDir, item);
    const dest = path.join(rootDir, item);
    // Don't overwrite package.json or git files or api
    if (['package.json', 'package-lock.json', '.git', 'api'].includes(item)) continue;
    fs.cpSync(src, dest, { recursive: true, force: true });
  }

  console.log('✅ Post-build: index.html, assets, api/, and .htaccess successfully published to root and dist/.');
} else {
  console.warn('⚠️ Post-build: apps/frontend/dist not found.');
}
