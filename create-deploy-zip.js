/**
 * AT Specialists Australia - Hostinger Production Deployment Packager
 * 
 * Packages:
 * - Frontend production build (apps/frontend/dist) -> public_html/
 * - Native PHP API (api/) -> public_html/api/
 * -.htaccess, robots.txt, sitemap.xml
 * 
 * Strict Exclusions:
 * - NEVER packages real.env credentials
 * - NEVER packages node_modules, tests, git directories, or temporary scratch files
 * - Formats all ZIP directory entries with Unix forward slashes for Linux/Apache/Hostinger compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT_DIR = __dirname;
const SOURCE_DIR = path.join(ROOT_DIR, 'hostinger_public_html');
const OUTPUT_ZIP = path.join(ROOT_DIR, 'deploy.zip');
const FRONTEND_DIST = path.join(ROOT_DIR, 'apps', 'frontend', 'dist');
const API_DIR = path.join(ROOT_DIR, 'api');

console.log('');
console.log('========================================================');
console.log(' AT SPECIALISTS - HOSTINGER DEPLOYMENT BUILD & ZIP');
console.log('========================================================');
console.log('');

// 1. Build Frontend
console.log('⚙️ Ensuring fresh frontend production build...');
try {
  execSync('npm run build:frontend', { stdio: 'inherit', cwd: ROOT_DIR });
} catch (err) {
  console.error('❌ Failed to build frontend:', err.message);
  process.exit(1);
}

// 2. Prepare hostinger_public_html directory
if (fs.existsSync(SOURCE_DIR)) {
  fs.rmSync(SOURCE_DIR, { recursive: true, force: true });
}
fs.mkdirSync(SOURCE_DIR, { recursive: true });

function copyDir(src, dest, ignoreList = []) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (ignoreList.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(s, d, ignoreList);
    } else {
      fs.copyFileSync(s, d);
    }
  }
}

// 3. Sync frontend dist to hostinger_public_html
console.log('📦 Copying frontend build to hostinger_public_html...');
copyDir(FRONTEND_DIST, SOURCE_DIR);

// 4. Sync PHP api directory (excluding local data or logs)
console.log('📦 Copying PHP API to hostinger_public_html/api...');
copyDir(API_DIR, path.join(SOURCE_DIR, 'api'), ['.env', '.git', 'data', 'temp']);

// 5. Copy root configuration & SEO files (excluding sensitive SQL dumps from public web root)
const filesToCopy = ['.htaccess', 'robots.txt', 'sitemap.xml'];
for (const file of filesToCopy) {
  const srcFile = path.join(ROOT_DIR, file);
  if (fs.existsSync(srcFile)) {
    fs.copyFileSync(srcFile, path.join(SOURCE_DIR, file));
    console.log(`📄 Copied ${file} -> hostinger_public_html/${file}`);
  }
}

// 6. Collect all files recursively for ZIP with forward-slash paths
function getAllFiles(dir, baseDir, fileList = []) {
  const entries = fs.readdirSync(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      getAllFiles(fullPath, baseDir, fileList);
    } else {
      fileList.push({ fullPath, relativePath, size: stat.size });
    }
  }
  return fileList;
}

const files = getAllFiles(SOURCE_DIR, SOURCE_DIR);
console.log(`\n🔍 Found ${files.length} files ready for packaging.`);

// 7. Pure JavaScript PKZip 2.0 Binary Encoder (Forward-slash Linux compatible)
function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[i] = c;
    }
    crc32.table = table;
  }
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    c = table[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  }
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function createZipBuffer(fileEntries) {
  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of fileEntries) {
    const content = fs.readFileSync(file.fullPath);
    const nameBuf = Buffer.from(file.relativePath, 'utf8');
    const checksum = crc32(content);
    const size = content.length;

    // DOS Time & Date
    const d = new Date();
    const dosTime = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
    const dosDate = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;

    // Local file header (30 bytes + filename)
    const localHdr = Buffer.alloc(30);
    localHdr.writeUInt32LE(0x04034B50, 0);
    localHdr.writeUInt16LE(20, 4);
    localHdr.writeUInt16LE(0x0800, 6); // UTF-8 filename flag
    localHdr.writeUInt16LE(0, 8); // Uncompressed
    localHdr.writeUInt16LE(dosTime, 10);
    localHdr.writeUInt16LE(dosDate, 12);
    localHdr.writeUInt32LE(checksum, 14);
    localHdr.writeUInt32LE(size, 18);
    localHdr.writeUInt32LE(size, 22);
    localHdr.writeUInt16LE(nameBuf.length, 26);
    localHdr.writeUInt16LE(0, 28);

    const localEntry = Buffer.concat([localHdr, nameBuf, content]);
    localHeaders.push(localEntry);

    // Central directory header (46 bytes + filename)
    const centralHdr = Buffer.alloc(46);
    centralHdr.writeUInt32LE(0x02014B50, 0);
    centralHdr.writeUInt16LE(20, 4);
    centralHdr.writeUInt16LE(20, 6);
    centralHdr.writeUInt16LE(0x0800, 8);
    centralHdr.writeUInt16LE(0, 10);
    centralHdr.writeUInt16LE(dosTime, 12);
    centralHdr.writeUInt16LE(dosDate, 14);
    centralHdr.writeUInt32LE(checksum, 16);
    centralHdr.writeUInt32LE(size, 20);
    centralHdr.writeUInt32LE(size, 24);
    centralHdr.writeUInt16LE(nameBuf.length, 28);
    centralHdr.writeUInt16LE(0, 30);
    centralHdr.writeUInt16LE(0, 32);
    centralHdr.writeUInt16LE(0, 34);
    centralHdr.writeUInt32LE(0, 36);
    centralHdr.writeUInt32LE(offset, 42);

    centralHeaders.push(Buffer.concat([centralHdr, nameBuf]));
    offset += localEntry.length;
  }

  const centralDir = Buffer.concat(centralHeaders);
  const centralDirOffset = offset;
  const centralDirSize = centralDir.length;

  // End of Central Directory (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054B50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(fileEntries.length, 8);
  eocd.writeUInt16LE(fileEntries.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localHeaders, centralDir, eocd]);
}

console.log('🗜️ Generating deploy.zip archive...');
const zipBuffer = createZipBuffer(files);
fs.writeFileSync(OUTPUT_ZIP, zipBuffer);

// 8. Clean up intermediate staging directory
if (fs.existsSync(SOURCE_DIR)) {
  fs.rmSync(SOURCE_DIR, { recursive: true, force: true });
  console.log('🧹 Cleaned up temporary staging directory: hostinger_public_html');
}

const zipStats = fs.statSync(OUTPUT_ZIP);
const zipMb = (zipStats.size / (1024 * 1024)).toFixed(2);

console.log('');
console.log('========================================================');
console.log(`✅ DEPLOYMENT PACKAGE CREATED SUCCESSFULLY!`);
console.log(` File: ${OUTPUT_ZIP}`);
console.log(` Size: ${zipMb} MB (${zipStats.size.toLocaleString()} bytes)`);
console.log(` Files bundled: ${files.length}`);
console.log('========================================================');
console.log('');
console.log('🚀 Hostinger 1-Click Deployment Instructions:');
console.log(' 1. Log in to Hostinger hPanel -> File Manager.');
console.log(' 2. Navigate to public_html/.');
console.log(' 3. Upload deploy.zip and click Extract.');
console.log(' 4. In phpMyAdmin, import hostinger_schema.sql.');
console.log(' 5. Create.env with real DB and PayPal credentials outside public_html.');
console.log('');
