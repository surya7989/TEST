const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Creating Hostinger production deployment zip...');

// 1. Run build if dist does not exist
const distDir = path.resolve(__dirname, 'dist');
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.log('📦 Running build first...');
  execSync('npm run build', { stdio: 'inherit', cwd: __dirname });
}

// 2. Output zip path
const zipPath = path.resolve(__dirname, 'at-specialists-deploy.zip');
if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// 3. Use PowerShell Compress-Archive on Windows or zip on Linux/Mac
try {
  if (process.platform === 'win32') {
    const psCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipPath}' -Force"`;
    execSync(psCmd, { stdio: 'inherit' });
  } else {
    execSync(`cd "${distDir}" && zip -r "${zipPath}" ./*`, { stdio: 'inherit' });
  }

  const stat = fs.statSync(zipPath);
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 Success! Deployment archive created at:`);
  console.log(`📁 ${zipPath} (${sizeMB} MB)`);
  console.log(`👉 Upload this zip file directly to your Hostinger public_html directory and Extract it.`);
} catch (err) {
  console.error('❌ Failed to create zip archive:', err.message);
  process.exit(1);
}
