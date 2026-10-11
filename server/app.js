/**
 * Ekspres app setup — semua middleware dan routing di-rakit di sini.
 * Entry point (server.js) hanya memanggil createApp() dan listen().
 */
const path = require('path');
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');

const visitorLog = require('./middleware/visitorLog');
const publicRoutes = require('./routes/public');
const panelRoutes = require('./routes/panel');
const { notFound, serverError } = require('./routes/errors');

function createApp() {
  const app = express();

  // View engine tidak dipakai — semua HTML disusun inline/static.
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Rate limiting: 100 request / 15 menit per IP
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Terlalu banyak request, coba lagi nanti'
  });
  app.use(limiter);

  // Session panel
  app.use(session({
    secret: process.env.SESSION_SECRET || require('crypto').randomBytes(32).toString('hex'),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true, sameSite: 'lax' }
  }));

  // Log kunjungan publik (GET non-asset non-panel)
  app.use(visitorLog);

  // Route publik → panel
  app.use('/', publicRoutes);
  app.use('/panel', panelRoutes);

  // 404 + error handler (harus paling akhir)
  app.use(notFound);
  app.use(serverError);

  return app;
}

module.exports = { createApp };
