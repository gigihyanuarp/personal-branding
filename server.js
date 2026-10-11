/**
 * Entry point — Personal Branding Website (Node.js/Express).
 *
 * Semua setup app ada di `server/app.js` (modular: routes/, middleware/, utils/).
 * File ini hanya bertanggung jawab menyiapkan environment lalu listen().
 */
const path = require('path');
const fs = require('fs');

// --- Load .env (opsional, tanpa dependency tambahan) ---
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}
loadEnv();

const { createApp } = require('./server/app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const app = createApp();

app.listen(PORT, HOST, () => {
  const lanIp = process.env.LAN_IP || '';
  console.log('========================================');
  console.log('🚀 Personal Branding Server Berjalan');
  console.log('========================================');
  console.log(`📍 Local:    http://localhost:${PORT}`);
  if (lanIp) console.log(`🌐 Network:  http://${lanIp}:${PORT}`);
  console.log(`📁 Document Root: ${path.join(__dirname, 'public')}`);
  console.log('');
  console.log('⚠️  Login Admin:');
  console.log(`   Email: ${process.env.ADMIN_USER || 'admin@example.com'}`);
  console.log('   (password dari env ADMIN_PASS / default)');
  console.log('');
  console.log('Tekan Ctrl+C untuk menghentikan server');
  console.log('========================================');
});

module.exports = app;
