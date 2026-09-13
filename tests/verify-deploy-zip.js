/**
 * AT Specialists Australia - Hostinger Deployment Package Validator
 * 
 * Verifies that deploy.zip is production-safe, contains all required assets & PHP endpoints,
 * contains zero secrets/development files, and uses forward-slash paths.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';

console.log('========================================================');
console.log(' DEPLOYMENT ZIP VERIFICATION & AUDIT');
console.log('========================================================\n');

const zipPath = path.resolve('deploy.zip');
assert.ok(fs.existsSync(zipPath), 'deploy.zip must exist');

const zipBuffer = fs.readFileSync(zipPath);
console.log(`📦 Archive Size: ${(zipBuffer.length / (1024 * 1024)).toFixed(2)} MB (${zipBuffer.length.toLocaleString()} bytes)`);

// Parse central directory headers to read filenames
const filenames = [];
let offset = 0;

while (offset < zipBuffer.length - 4) {
  const sig = zipBuffer.readUInt32LE(offset);
  if (sig === 0x02014b50) { // Central directory file header
    const nameLen = zipBuffer.readUInt16LE(offset + 28);
    const extraLen = zipBuffer.readUInt16LE(offset + 30);
    const commentLen = zipBuffer.readUInt16LE(offset + 32);
    const filename = zipBuffer.toString('utf8', offset + 46, offset + 46 + nameLen);
    filenames.push(filename);
    offset += 46 + nameLen + extraLen + commentLen;
  } else {
    offset++;
  }
}

console.log(`📑 Total files indexed in central directory: ${filenames.length}\n`);

let checksPassed = 0;

function check(title, condition) {
  assert.ok(condition, title);
  console.log(` ✅ PASS: ${title}`);
  checksPassed++;
}

// 1. Check required production files
check('Contains root index.html', filenames.includes('index.html'));
check('Contains root.htaccess', filenames.includes('.htaccess'));
check('Contains robots.txt', filenames.includes('robots.txt'));
check('Contains sitemap.xml', filenames.includes('sitemap.xml'));
check('Contains api/index.php', filenames.includes('api/index.php'));
check('Contains api/config.php', filenames.includes('api/config.php'));
check('Contains api/smtpHelper.php', filenames.includes('api/smtpHelper.php'));
check('Contains api/pdfHelper.php', filenames.includes('api/pdfHelper.php'));
check('Contains api/fpdf.php', filenames.includes('api/fpdf.php'));
check('Contains api/img-proxy.php', filenames.includes('api/img-proxy.php'));
check('Contains api/.htaccess', filenames.includes('api/.htaccess'));

// 2. Check strict forward-slash paths (Linux / Apache compatibility)
const hasBackslash = filenames.some(f => f.includes('\\'));
check('All ZIP entries use Unix forward-slash paths (no Windows backslashes)', !hasBackslash);

// 3. Check exclusions (No secrets, no node_modules, no git)
const hasEnv = filenames.some(f => f === '.env' || f.endsWith('/.env'));
check('Contains NO.env credentials file', !hasEnv);

const hasNodeModules = filenames.some(f => f.includes('node_modules'));
check('Contains NO node_modules directory', !hasNodeModules);

const hasGit = filenames.some(f => f.includes('.git'));
check('Contains NO.git version control files', !hasGit);

const hasSql = filenames.some(f => f.endsWith('.sql'));
check('Contains NO SQL database dumps in public web root', !hasSql);

console.log('\n========================================================');
console.log(`ALL ${checksPassed} DEPLOYMENT CHECKS PASSED SUCCESSFULLY!`);
console.log('========================================================\n');
