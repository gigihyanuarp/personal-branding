/**
 * Middleware: proteksi halaman panel berbasis session.
 */
function isPanelLoggedIn(req) {
  return !!(req.session && req.session.panelLoggedIn === true);
}

/** Redirect ke login jika belum terautentikasi */
function authGuard(req, res, next) {
  if (isPanelLoggedIn(req)) return next();
  return res.redirect('/panel/login');
}

/** Redirect ke dashboard jika SUDAH login (untuk halaman login) */
function guestOnly(req, res, next) {
  if (isPanelLoggedIn(req)) return res.redirect('/panel/dashboard');
  return next();
}

module.exports = { isPanelLoggedIn, authGuard, guestOnly };
