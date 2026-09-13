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

  // 2. Copy index.html and assets directly to root so Apache finds index.html regardless of web root
  const items = fs.readdirSync(distDir);
  for (const item of items) {
    const src = path.join(distDir, item);
    const dest = path.join(rootDir, item);
    // Don't overwrite package.json or git files
    if (['package.json', 'package-lock.json', '.git', 'api'].includes(item)) continue;
    fs.cpSync(src, dest, { recursive: true, force: true });
  }

  console.log('✅ Post-build: index.html and assets successfully published to root and dist/.');
} else {
  console.warn('⚠️ Post-build: apps/frontend/dist not found.');
}
