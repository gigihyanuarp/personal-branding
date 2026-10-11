/**
 * Route error: 404 dan 500 handler.
 */
const { escHtml } = require('../utils/helpers');

function notFound(req, res) {
  res.status(404).send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>404 | Gigih</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
h1{font-size:4rem;color:#1e40af;margin:0} p{color:#64748b} a{color:#1e40af}</style></head>
<body><div><h1>404</h1><p>Halaman tidak ditemukan.</p><p><a href="/">Kembali ke Beranda</a></p></div></body></html>`);
}

function serverError(err, req, res, next) {
  console.error('[server error]', err && err.message ? err.message : err);
  if (res.headersSent) return next(err);
  res.status(500).send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>500 | Gigih</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;background:#f8fafc;color:#1e293b;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center}
h1{font-size:4rem;color:#b91c1c;margin:0} p{color:#64748b} a{color:#1e40af}</style></head>
<body><div><h1>500</h1><p>Terjadi kesalahan pada server.</p><p><a href="/">Kembali ke Beranda</a></p></div></body></html>`);
}

module.exports = { notFound, serverError, escHtml };
