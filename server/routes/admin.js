/**
 * Route admin: login, logout, dashboard, portfolio, messages, visitors.
 * Semua kecuali /admin/login dilindungi authGuard.
 */
const express = require('express');
const { authGuard, guestOnly, isAdminLoggedIn } = require('../middleware/auth');
const { readVisitorStats } = require('../utils/visitorLog');
const { readMessages, markMessageRead, deleteMessage } = require('../utils/messageLog');
const { escHtml, formatWIB } = require('../utils/helpers');
const { readPortfolios, createPortfolio, updatePortfolio, deletePortfolio, findPortfolio } = require('../utils/portfolioLog');

const router = express.Router();

const ADMIN_USER = process.env.ADMIN_USER || 'admin@example.com';
const ADMIN_PASS = process.env.ADMIN_PASS || '';

function dashboardStats() {
  const vs = readVisitorStats();
  const msgs = readMessages();
  const projects = readPortfolios();
  return {
    total_projects: projects.length,
    published_projects: projects.filter(p => p.status === 'published').length,
    draft_projects: projects.filter(p => p.status === 'draft').length,
    unread: msgs.filter(m => !m.is_read).length,
    visitors: vs
  };
}

/** Tulis flash message ke session, dibaca sekali oleh halaman tujuan */
function setFlash(req, type, text) {
  if (!req.session) return;
  req.session.flash = { type, text };
}

/** Ambil + hapus flash message */
function takeFlash(req) {
  if (!req.session || !req.session.flash) return '';
  const f = req.session.flash;
  delete req.session.flash;
  const color = f.type === 'error' ? '#b91c1c' : '#15803d';
  return `<div style="padding:.7rem 1rem;border-radius:6px;margin-bottom:1rem;background:${f.type === 'error' ? '#fef2f2' : '#f0fdf4'};color:${color};border:1px solid ${f.type === 'error' ? '#fecaca' : '#bbf7d0'}">${escHtml(f.text)}</div>`;
}

/** Cek apakah string berupa URL http(s) yang valid */
function isValidUrl(value) {
  if (!value) return true; // opsional: kosong artinya tidak diisi
  try {
    const u = new URL(value);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (e) {
    return false;
  }
}

/** Validasi input portfolio → array error */
function validatePortfolio(body) {
  const errors = [];
  const title = String(body.title || '').trim();
  const slug = String(body.slug || '').trim();
  const description = String(body.description || '').trim();
  const projectUrl = String(body.project_url || '').trim();
  const githubUrl = String(body.github_url || '').trim();
  if (title.length < 3) errors.push('Judul minimal 3 karakter.');
  if (slug.length < 3) errors.push('Slug minimal 3 karakter.');
  if (!/^[a-z0-9-]+$/.test(slug)) errors.push('Slug hanya boleh huruf kecil, angka, dan tanda hubung (-).');
  if (description.length < 20) errors.push('Deskripsi minimal 20 karakter.');
  if (!isValidUrl(projectUrl)) errors.push('URL Proyek harus berupa alamat lengkap, contoh: https://contoh.com/proyek');
  if (!isValidUrl(githubUrl)) errors.push('URL GitHub harus berupa alamat lengkap, contoh: https://github.com/username/repo');
  return errors;
}

/** Normalisasi body → objek data portfolio */
function normalizePortfolio(body) {
  return {
    title: String(body.title || '').trim(),
    slug: String(body.slug || '').trim().toLowerCase(),
    description: String(body.description || '').trim(),
    short_description: String(body.short_description || '').trim(),
    technologies: String(body.technologies || '').split(',').map(s => s.trim()).filter(Boolean),
    project_url: String(body.project_url || '').trim(),
    github_url: String(body.github_url || '').trim(),
    is_featured: !!body.is_featured,
    status: body.status === 'published' ? 'published' : 'draft',
    order: parseInt(body.order, 10) || 0
  };
}

function layout(title, body) {
  return `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(title)} | Admin Gigih</title>
<style>
:root{--primary:#1e40af;--primary-hover:#1e3a8a;--bg:#f8fafc;--text:#1e293b;--muted:#64748b;--border:#e2e8f0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:var(--bg);color:var(--text);line-height:1.5}
.wrap{max-width:1100px;margin:0 auto;padding:2rem 1rem}
h2{margin-bottom:1rem}
.nav{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem;padding-bottom:1rem;border-bottom:1px solid var(--border)}
.nav a{color:var(--primary);text-decoration:none;font-weight:500}
.nav a:hover{text-decoration:underline}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:1rem;margin:1.5rem 0}
.card{background:#fff;border:1px solid var(--border);border-radius:8px;padding:1.25rem;text-align:center}
.card .v{font-size:1.9rem;font-weight:700;color:var(--primary)}
.card .l{color:var(--muted);font-size:.85rem;margin-top:.35rem}
table{width:100%;border-collapse:collapse;margin:1.5rem 0;background:#fff}
th,td{padding:.7rem;border:1px solid var(--border);text-align:left;vertical-align:top}
th{background:var(--bg);font-size:.78rem;text-transform:uppercase;letter-spacing:.03em;color:var(--muted)}
.btn{display:inline-block;padding:.55rem 1.1rem;background:var(--primary);color:#fff;border:none;border-radius:6px;cursor:pointer;text-decoration:none;font-size:.9rem}
.btn:hover{background:var(--primary-hover)}
input,textarea{width:100%;padding:.6rem;border:1px solid var(--border);border-radius:6px;margin:.35rem 0;font-family:inherit}
label{font-size:.85rem;color:var(--muted)}
.badge{display:inline-block;padding:.15rem .5rem;border-radius:999px;font-size:.72rem;background:#e2e8f0;color:#475569}
.login{max-width:360px;margin:6rem auto}
.err{color:#b91c1c;font-size:.85rem;margin:.5rem 0}
</style></head><body><div class="wrap">${body}</div></body></html>`;
}

/** Form portfolio (dipakai ulang untuk create & edit) */
function portfolioForm(p, action, submitLabel) {
  const tech = Array.isArray(p.technologies) ? p.technologies.join(', ') : (p.technologies || '');
  return `
  <form method="POST" action="${escHtml(action)}" style="max-width:640px">
    <label>Judul *</label>
    <input type="text" name="title" value="${escHtml(p.title || '')}" required>
    <label>Slug * (huruf kecil, angka, tanda hubung)</label>
    <input type="text" name="slug" value="${escHtml(p.slug || '')}" required>
    <label>Deskripsi * (min. 20 karakter)</label>
    <textarea name="description" rows="5" required>${escHtml(p.description || '')}</textarea>
    <label>Deskripsi Singkat</label>
    <input type="text" name="short_description" value="${escHtml(p.short_description || '')}">
    <label>Teknologi (pisahkan dengan koma)</label>
    <input type="text" name="technologies" value="${escHtml(tech)}" placeholder="Jaringan, Mikrotik, Linux">
    <label>URL Proyek</label>
    <input type="text" name="project_url" value="${escHtml(p.project_url || '')}">
    <label>URL GitHub</label>
    <input type="text" name="github_url" value="${escHtml(p.github_url || '')}">
    <label>Urutan</label>
    <input type="number" name="order" value="${escHtml(p.order != null ? p.order : 0)}">
    <label style="display:block;margin-top:.75rem"><input type="checkbox" name="is_featured" value="1" ${p.is_featured ? 'checked' : ''} style="width:auto;margin-right:.4rem">Tampilkan sebagai unggulan</label>
    <label style="display:block;margin-top:.5rem">Status</label>
    <select name="status" style="width:100%;padding:.6rem;border:1px solid var(--border);border-radius:6px">
      <option value="draft" ${p.status !== 'published' ? 'selected' : ''}>Draft</option>
      <option value="published" ${p.status === 'published' ? 'selected' : ''}>Published</option>
    </select>
    <div style="margin-top:1rem;display:flex;gap:.5rem">
      <button class="btn" type="submit">${escHtml(submitLabel)}</button>
      <a class="btn" href="/admin/portfolio" style="background:#64748b">Batal</a>
    </div>
  </form>`;
}

// --- Login ---
router.get('/login', guestOnly, (req, res) => {
  res.send(layout('Masuk Admin', `
    <div class="login">
      <h2>Masuk Admin</h2>
      ${req.query.error ? '<p class="err">Email atau password salah.</p>' : ''}
      <form method="POST" action="/admin/login">
        <label>Email</label><input type="email" name="email" required autocomplete="username">
        <label>Password</label><input type="password" name="password" required autocomplete="current-password">
        <button class="btn" type="submit" style="margin-top:.75rem">Masuk</button>
      </form>
    </div>`));
});

router.post('/login', guestOnly, (req, res) => {
  const { email, password } = req.body || {};
  if (email === ADMIN_USER && password === ADMIN_PASS) {
    req.session.adminLoggedIn = true;
    req.session.adminEmail = email;
    return res.redirect('/admin/dashboard');
  }
  return res.redirect('/admin/login?error=1');
});

router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// --- Dashboard ---
router.get('/dashboard', authGuard, (req, res) => {
  const s = dashboardStats();
  const pages = Object.entries(s.visitors.byPage || {})
    .map(([p, c]) => `<tr><td>${escHtml(p)}</td><td>${c}</td></tr>`).join('') || '<tr><td colspan="2">Belum ada data</td></tr>';
  const msgs = readMessages().slice(0, 10);
  const msgRows = msgs.length ? msgs.map(m => `
    <tr style="background:${m.is_read ? '#fff' : '#eef2ff'}">
      <td><strong>${escHtml(m.name || '-')}</strong></td>
      <td>${escHtml(m.email || '-')}</td>
      <td>${escHtml(m.subject || '-')}</td>
      <td><span class="badge">${m.is_read ? 'Dibaca' : 'Baru'}</span></td>
      <td style="white-space:nowrap;font-size:.8rem">${escHtml(formatWIB(m.visited_at || ''))}</td>
    </tr>`).join('') : '<tr><td colspan="5">Belum ada pesan masuk.</td></tr>';

  res.send(layout('Dashboard', `
    <h2>Dashboard</h2>
    <div class="nav">
      <a href="/admin/dashboard">Dashboard</a>
      <a href="/admin/visitors">Pengunjung</a>
      <a href="/admin/messages">Pesan (${s.unread})</a>
      <a href="/admin/portfolio">Portfolio</a>
      <a href="/" target="_blank">Lihat Situs</a>
      <a href="/admin/logout">Keluar</a>
    </div>
    <div class="grid">
      <div class="card"><div class="v">${s.visitors.total}</div><div class="l">Total Kunjungan</div></div>
      <div class="card"><div class="v">${s.visitors.today}</div><div class="l">Kunjungan Hari Ini</div></div>
      <div class="card"><div class="v">${s.unread}</div><div class="l">Pesan Belum Dibaca</div></div>
      <div class="card"><div class="v">${s.total_projects}</div><div class="l">Portfolio</div></div>
    </div>
    <h3 style="margin:1.5rem 0 .5rem">Kunjungan per Halaman</h3>
    <table><thead><tr><th>Halaman</th><th>Jumlah</th></tr></thead><tbody>${pages}</tbody></table>
    <h3 style="margin:1.5rem 0 .5rem">Pesan Terbaru</h3>
    <table><thead><tr><th>Nama</th><th>Email</th><th>Subjek</th><th>Status</th><th>Waktu</th></tr></thead><tbody>${msgRows}</tbody></table>
    <p><a class="btn" href="/admin/messages">Lihat Semua Pesan</a></p>`));
});

// --- Visitors ---
router.get('/visitors', authGuard, (req, res) => {
  const vs = readVisitorStats();
  const rows = (vs.recent || []).map(v => `
    <tr>
      <td style="font-size:.8rem">${escHtml(formatWIB(v.visited_at || ''))}</td>
      <td>${escHtml(v.visited_page || '-')}</td>
      <td>${escHtml((v.device && v.device.detail) || v.device || '-')}</td>
      <td style="font-size:.8rem">${escHtml(v.ip_address || '-')}</td>
      <td style="font-size:.8rem;max-width:220px;word-break:break-all">${escHtml(v.referred_from || '-')}</td>
    </tr>`).join('') || '<tr><td colspan="5">Belum ada data</td></tr>';
  const daily = (vs.daily || []).map(d => `<tr><td>${escHtml(d.date)}</td><td>${d.count}</td></tr>`).join('');

  res.send(layout('Pengunjung', `
    <h2>Pengunjung</h2>
    <div class="nav">
      <a href="/admin/dashboard">Dashboard</a>
      <a href="/admin/visitors">Pengunjung</a>
      <a href="/admin/messages">Pesan</a>
      <a href="/admin/portfolio">Portfolio</a>
      <a href="/admin/logout">Keluar</a>
    </div>
    <div class="grid">
      <div class="card"><div class="v">${vs.total}</div><div class="l">Total (non-bot)</div></div>
      <div class="card"><div class="v">${vs.today}</div><div class="l">Hari Ini</div></div>
    </div>
    <h3 style="margin:1.5rem 0 .5rem">30 Hari Terakhir</h3>
    <table><thead><tr><th>Tanggal</th><th>Kunjungan</th></tr></thead><tbody>${daily}</tbody></table>
    <h3 style="margin:1.5rem 0 .5rem">20 Kunjungan Terakhir</h3>
    <table><thead><tr><th>Waktu</th><th>Halaman</th><th>Perangkat</th><th>IP</th><th>Referrer</th></tr></thead><tbody>${rows}</tbody></table>`));
});

// --- Messages ---
router.get('/messages', authGuard, (req, res) => {
  const msgs = readMessages();
  const rows = msgs.map(m => `
    <tr style="background:${m.is_read ? '#fff' : '#eef2ff'}">
      <td><strong>${escHtml(m.name || '-')}</strong><br><span style="font-size:.78rem;color:var(--muted)">${escHtml(m.email || '')}</span></td>
      <td>${escHtml(m.subject || '-')}</td>
      <td style="max-width:340px;white-space:pre-wrap;word-break:break-word;font-size:.875rem">${escHtml(m.message || '')}</td>
      <td>
        <span class="badge">${m.is_read ? 'Dibaca' : 'Baru'}</span>
        ${m.is_read ? '' : `<form method="POST" action="/admin/messages/${escHtml(m.id)}/read" style="margin-top:.4rem"><button class="btn" type="submit" style="padding:.3rem .6rem;font-size:.78rem">Tandai dibaca</button></form>`}
      </td>
      <td style="font-size:.78rem;white-space:nowrap">${escHtml(formatWIB(m.visited_at || ''))}<br>${escHtml(m.ip_address || '')}</td>
      <td style="white-space:nowrap">
        <form method="POST" action="/admin/messages/${escHtml(m.id)}/delete" style="display:inline" onsubmit="return confirm('Yakin ingin menghapus pesan ini?')">
          <button class="btn" type="submit" style="padding:.3rem .6rem;font-size:.78rem;background:#b91c1c">Hapus</button>
        </form>
      </td>
    </tr>`).join('') || '<tr><td colspan="6">Belum ada pesan masuk.</td></tr>';

  res.send(layout('Pesan Masuk', `
    <h2>Pesan Masuk</h2>
    <div class="nav">
      <a href="/admin/dashboard">Dashboard</a>
      <a href="/admin/visitors">Pengunjung</a>
      <a href="/admin/messages">Pesan</a>
      <a href="/admin/portfolio">Portfolio</a>
      <a href="/admin/logout">Keluar</a>
    </div>
    ${takeFlash(req)}
    <table><thead><tr><th>Pengirim</th><th>Subjek</th><th>Pesan</th><th>Status</th><th>Waktu / IP</th><th style="width:110px">Aksi</th></tr></thead><tbody>${rows}</tbody></table>`));
});

router.post('/messages/:id/read', authGuard, (req, res) => {
  markMessageRead(req.params.id);
  setFlash(req, 'success', 'Pesan ditandai sudah dibaca.');
  res.redirect('/admin/messages');
});

router.post('/messages/:id/delete', authGuard, (req, res) => {
  const ok = deleteMessage(req.params.id);
  setFlash(req, ok ? 'success' : 'error', ok ? 'Pesan berhasil dihapus.' : 'Pesan tidak ditemukan.');
  res.redirect('/admin/messages');
});

// --- Portfolio: daftar ---
router.get('/portfolio', authGuard, (req, res) => {
  const projects = readPortfolios();
  const rows = projects.map(p => `
    <tr>
      <td><strong>${escHtml(p.title)}</strong><br><span style="font-size:.78rem;color:var(--muted)">${escHtml(p.slug)}</span></td>
      <td><span class="badge" style="background:${p.status === 'published' ? '#dcfce7' : '#fef3c7'};color:${p.status === 'published' ? '#166534' : '#92400e'}">${p.status === 'published' ? 'Published' : 'Draft'}</span></td>
      <td>${p.is_featured ? 'Ya' : 'Tidak'}</td>
      <td>${p.order}</td>
      <td style="font-size:.78rem;white-space:nowrap">${escHtml(formatWIB(p.created_at || ''))}</td>
      <td style="white-space:nowrap">
        <a class="btn" href="/admin/portfolio/${p.id}/edit" style="padding:.3rem .6rem;font-size:.78rem">Edit</a>
        <form method="POST" action="/admin/portfolio/${p.id}/delete" style="display:inline" onsubmit="return confirm('Yakin ingin menghapus portfolio ini?')">
          <button class="btn" type="submit" style="padding:.3rem .6rem;font-size:.78rem;background:#b91c1c">Hapus</button>
        </form>
      </td>
    </tr>`).join('') || '<tr><td colspan="6">Belum ada portfolio. Tambah yang pertama.</td></tr>';

  res.send(layout('Portfolio', `
    <h2>Kelola Portfolio</h2>
    <div class="nav">
      <a href="/admin/dashboard">Dashboard</a>
      <a href="/admin/visitors">Pengunjung</a>
      <a href="/admin/messages">Pesan</a>
      <a href="/admin/portfolio">Portfolio</a>
      <a href="/admin/logout">Keluar</a>
    </div>
    ${takeFlash(req)}
    <p><a class="btn" href="/admin/portfolio/create">+ Tambah Portfolio</a></p>
    <table><thead><tr><th>Judul</th><th>Status</th><th>Unggulan</th><th>Urutan</th><th>Dibuat</th><th>Aksi</th></tr></thead><tbody>${rows}</tbody></table>`));
});

// --- Portfolio: form tambah ---
router.get('/portfolio/create', authGuard, (req, res) => {
  res.send(layout('Tambah Portfolio', `
    <h2>Tambah Portfolio</h2>
    <div class="nav">
      <a href="/admin/dashboard">Dashboard</a>
      <a href="/admin/portfolio">Portfolio</a>
      <a href="/admin/logout">Keluar</a>
    </div>
    ${takeFlash(req)}
    ${portfolioForm({}, '/admin/portfolio', 'Simpan')}`));
});

// --- Portfolio: simpan ---
router.post('/portfolio', authGuard, (req, res) => {
  const errors = validatePortfolio(req.body || {});
  if (errors.length) {
    setFlash(req, 'error', errors.join(' '));
    return res.redirect('/admin/portfolio/create');
  }
  createPortfolio(normalizePortfolio(req.body || {}));
  setFlash(req, 'success', 'Portfolio berhasil ditambahkan.');
  res.redirect('/admin/portfolio');
});

// --- Portfolio: form edit ---
router.get('/portfolio/:id/edit', authGuard, (req, res) => {
  const p = findPortfolio(req.params.id);
  if (!p) return res.status(404).send(layout('Tidak Ditemukan', '<h2>Portfolio tidak ditemukan</h2><p><a class="btn" href="/admin/portfolio">Kembali</a></p>'));
  res.send(layout('Edit Portfolio', `
    <h2>Edit Portfolio</h2>
    <div class="nav">
      <a href="/admin/dashboard">Dashboard</a>
      <a href="/admin/portfolio">Portfolio</a>
      <a href="/admin/logout">Keluar</a>
    </div>
    ${takeFlash(req)}
    ${portfolioForm(p, `/admin/portfolio/${p.id}`, 'Perbarui')}`));
});

// --- Portfolio: update ---
router.post('/portfolio/:id', authGuard, (req, res) => {
  const p = findPortfolio(req.params.id);
  if (!p) return res.redirect('/admin/portfolio');
  const errors = validatePortfolio(req.body || {});
  if (errors.length) {
    setFlash(req, 'error', errors.join(' '));
    return res.redirect(`/admin/portfolio/${p.id}/edit`);
  }
  updatePortfolio(p.id, normalizePortfolio(req.body || {}));
  setFlash(req, 'success', 'Portfolio berhasil diperbarui.');
  res.redirect('/admin/portfolio');
});

// --- Portfolio: hapus ---
router.post('/portfolio/:id/delete', authGuard, (req, res) => {
  deletePortfolio(req.params.id);
  setFlash(req, 'success', 'Portfolio berhasil dihapus.');
  res.redirect('/admin/portfolio');
});

module.exports = router;
