/**
 * Middleware: proteksi halaman admin berbasis session.
 */
function isAdminLoggedIn(req) {
  return !!(req.session && req.session.adminLoggedIn === true);
}

/** Redirect ke login jika belum terautentikasi */
function authGuard(req, res, next) {
  if (isAdminLoggedIn(req)) return next();
  return res.redirect('/admin/login');
}

/** Redirect ke dashboard jika SUDAH login (untuk halaman login) */
function guestOnly(req, res, next) {
  if (isAdminLoggedIn(req)) return res.redirect('/admin/dashboard');
  return next();
}

module.exports = { isAdminLoggedIn, authGuard, guestOnly };
