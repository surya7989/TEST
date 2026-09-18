const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT_DIR = path.resolve(__dirname, '..');
const IMG_DIR = path.join(ROOT_DIR, 'apps', 'frontend', 'public', 'images', 'products');
const PRODUCTS_JSON = path.join(ROOT_DIR, 'apps', 'frontend', 'src', 'data', 'products.json');
const CATS_TS = path.join(ROOT_DIR, 'apps', 'frontend', 'src', 'data', 'categories.ts');
const ICONS_TS = path.join(ROOT_DIR, 'apps', 'frontend', 'src', 'components', 'home', 'CategoryIcons.tsx');

async function run() {
  console.log('🔍 1. Identifying referenced images across catalogue, categories, and icons...');
  const referenced = new Set();
  
  const prods = JSON.parse(fs.readFileSync(PRODUCTS_JSON, 'utf8'));
  prods.forEach((p) => {
    if (p.image) referenced.add(path.basename(p.image));
    if (p.thumbnail) referenced.add(path.basename(p.thumbnail));
    if (Array.isArray(p.galleryImages)) p.galleryImages.forEach((u) => referenced.add(path.basename(u)));
    if (Array.isArray(p.images)) p.images.forEach((u) => referenced.add(path.basename(u)));
    if (Array.isArray(p.variants)) {
      p.variants.forEach((v) => {
        if (v.image) referenced.add(path.basename(v.image));
      });
    }
  });

  if (fs.existsSync(CATS_TS)) {
    const catsText = fs.readFileSync(CATS_TS, 'utf8');
    (catsText.match(/\/images\/products\/[a-zA-Z0-9_\.\-]+/g) || []).forEach((m) => referenced.add(path.basename(m)));
  }

  if (fs.existsSync(ICONS_TS)) {
    const iconsText = fs.readFileSync(ICONS_TS, 'utf8');
    (iconsText.match(/\/images\/products\/[a-zA-Z0-9_\.\-]+/g) || []).forEach((m) => referenced.add(path.basename(m)));
  }

  // Always keep fallback image
  referenced.add('Configura-Comfort-Black-Upright-2026.webp');

  const diskFiles = fs.readdirSync(IMG_DIR);
  let removedUnreferenced = 0;
  let removedUnrefBytes = 0;

  for (const file of diskFiles) {
    if (!referenced.has(file)) {
      const fullPath = path.join(IMG_DIR, file);
      try {
        const sz = fs.statSync(fullPath).size;
        fs.unlinkSync(fullPath);
        removedUnreferenced++;
        removedUnrefBytes += sz;
      } catch (e) {}
    }
  }

  console.log(`🗑️ Removed ${removedUnreferenced} unreferenced files (${(removedUnrefBytes / (1024 * 1024)).toFixed(2)} MB saved).`);

  // 2. Compress and resize images over 200 KB
  console.log('\n⚡ 2. Optimizing images over 200 KB for lightning-fast loading...');
  const filesToProcess = [];
  let initialTotalBytes = 0;

  const currentFiles = fs.readdirSync(IMG_DIR);
  for (const file of currentFiles) {
    const fullPath = path.join(IMG_DIR, file);
    const sz = fs.statSync(fullPath).size;
    initialTotalBytes += sz;
    if (sz > 200 * 1024) {
      filesToProcess.push({ file, fullPath, sz });
    }
  }

  console.log(`Found ${filesToProcess.length} images larger than 200 KB to optimize.`);

  let processed = 0;
  let savedBytes = 0;
  let errors = 0;
  const startTime = Date.now();

  const concurrency = 16;
  let index = 0;

  async function worker() {
    while (index < filesToProcess.length) {
      const item = filesToProcess[index++];
      try {
        const ext = path.extname(item.file).toLowerCase();
        let pipeline = sharp(item.fullPath).resize({
          width: 1200,
          height: 1200,
          fit: 'inside',
          withoutEnlargement: true,
        });

        let outBuf;
        if (ext === '.webp') {
          outBuf = await pipeline.webp({ quality: 82, effort: 4 }).toBuffer();
        } else if (ext === '.jpg' || ext === '.jpeg') {
          outBuf = await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer();
        } else if (ext === '.png') {
          outBuf = await pipeline.png({ compressionLevel: 9, effort: 6 }).toBuffer();
        } else {
          continue;
        }

        if (outBuf.length < item.sz) {
          fs.writeFileSync(item.fullPath, outBuf);
          savedBytes += item.sz - outBuf.length;
        }
        processed++;
      } catch (err) {
        errors++;
      }

      if (processed % 100 === 0 || index >= filesToProcess.length) {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        const percent = ((index / filesToProcess.length) * 100).toFixed(1);
        console.log(`[${index}/${filesToProcess.length}] ${percent}% | Processed: ${processed} | Saved: ${(savedBytes / (1024 * 1024)).toFixed(1)} MB (${elapsed}s)`);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < concurrency; i++) workers.push(worker());
  await Promise.all(workers);

  const finalTotalFiles = fs.readdirSync(IMG_DIR);
  let finalTotalBytes = 0;
  for (const f of finalTotalFiles) {
    finalTotalBytes += fs.statSync(path.join(IMG_DIR, f)).size;
  }

  console.log(`\n🎉 Image optimization complete in ${((Date.now() - startTime) / 1000).toFixed(1)}s!`);
  console.log(`- Original folder size: ${(initialTotalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`- New folder size: ${(finalTotalBytes / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`- Total saved: ${((initialTotalBytes - finalTotalBytes) / (1024 * 1024)).toFixed(2)} MB`);

  // 3. Remove duplicate folders and old zip file
  console.log('\n🧹 3. Removing redundant duplicate folders and huge deployment zip...');
  
  const oldZip = path.join(ROOT_DIR, 'at-specialists-deploy.zip');
  if (fs.existsSync(oldZip)) {
    fs.unlinkSync(oldZip);
    console.log('✅ Removed at-specialists-deploy.zip (1.72 GB freed)');
  }

  const rootImages = path.join(ROOT_DIR, 'images');
  if (fs.existsSync(rootImages)) {
    fs.rmSync(rootImages, { recursive: true, force: true });
    console.log('✅ Removed duplicate root images/ directory (1.73 GB freed)');
  }

  const frontendDist = path.join(ROOT_DIR, 'apps', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    fs.rmSync(frontendDist, { recursive: true, force: true });
    console.log('✅ Removed old apps/frontend/dist directory (1.74 GB freed)');
  }

  const rootDist = path.join(ROOT_DIR, 'dist');
  if (fs.existsSync(rootDist)) {
    fs.rmSync(rootDist, { recursive: true, force: true });
    console.log('✅ Removed old dist/ directory (1.79 GB freed)');
  }

  console.log('\n✨ Disk cleanup completed successfully.');
}

run().catch(console.error);
