/**
 * Route publik: /, /about, /portfolio, /contact
 * Semua GET dirender dari template static (view) yang sama dengan PHP.
 */
const path = require('path');
const express = require('express');
const fs = require('fs');
const { escHtml } = require('../utils/helpers');
const { appendMessageLog } = require('../utils/messageLog');
const { readVisitorStats } = require('../utils/visitorLog');
const { readPortfolios, findPortfolio } = require('../utils/portfolioLog');

const router = express.Router();

// Helper: baca file view (src/View = versi lengkap), fallback ke views/
function readView(filename) {
  const candidates = [
    path.join(__dirname, '..', '..', 'src', 'View', filename),
    path.join(__dirname, '..', '..', 'views', filename)
  ];
  const f = candidates.find(p => fs.existsSync(p));
  return f ? fs.readFileSync(f, 'utf8') : null;
}

// Helper: render halaman HTML dari file view, fallback ke template inline
function renderPage(res, filename, title) {
  const html = readView(filename);
  if (html !== null) return res.type('html').send(html);
  return res.status(200).send(`<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escHtml(title)} | Gigih</title></head><body><h1>${escHtml(title)}</h1><p>Gigih Yanuar Prabawa — Jaringan, Infrastruktur Server, Hardware.</p></body></html>`);
}

/** Escape untuk atribut HTML */
function attr(v) {
  return escHtml(String(v == null ? '' : v));
}

/** Ringkas deskripsi jadi teks polos pendek */
function shortText(value, limit = 140) {
  const s = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  return s.length > limit ? s.slice(0, limit).replace(/\s+\S*$/, '') + '…' : s;
}

/** Satu kartu portfolio (HTML) */
function portfolioCard(p) {
  const techs = Array.isArray(p.technologies) ? p.technologies.filter(Boolean) : [];
  const techHtml = techs.length
    ? `<div class="project-tags">${techs.map(t => `<span class="tech-tag">${escHtml(t)}</span>`).join('')}</div>`
    : '';
  const img = p.image
    ? `<div class="project-image"><img src="${attr(p.image)}" alt="${attr(p.title)}" loading="lazy"></div>`
    : `<div class="project-image project-image-empty" aria-hidden="true">${escHtml((p.title || '?').trim().charAt(0).toUpperCase())}</div>`;
  const desc = shortText(p.short_description || p.description, 140);
  const url = p.project_url || p.github_url;
  return `<article class="project-card">
  ${img}
  <div class="project-content">
    <h3 class="project-title">${escHtml(p.title)}</h3>
    <p class="project-desc">${escHtml(desc)}</p>
    ${techHtml}
    <div class="project-footer">
      <a class="btn btn-sm btn-outline" href="/portfolio/${attr(p.slug)}">Detail</a>
      ${url ? `<a class="btn btn-sm btn-primary" href="${attr(url)}" target="_blank" rel="noopener noreferrer">Kunjungi</a>` : ''}
    </div>
  </div>
</article>`;
}

/** Grid portfolio lengkap, atau empty-state kalau belum ada isinya */
function portfolioGrid(list) {
  if (!list.length) {
    return `<div class="empty-state">
  <p><strong>Belum ada portfolio.</strong></p>
  <p>Proyek yang saya kerjakan akan tampil di halaman ini.</p>
</div>`;
  }
  return `<div class="projects-grid">\n${list.map(portfolioCard).join('\n')}\n</div>`;
}

/** Format tanggal ISO → "11 Okt 2026" */
function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '—';
  const bulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

/** Halaman detail portfolio: isi konten dari data JSONL ke template ring */
function renderPortfolioDetail(html, p) {
  const techs = Array.isArray(p.technologies) ? p.technologies.filter(Boolean) : [];
  const techItems = techs.map(t => `<span class="tech-tag">${escHtml(t)}</span>`).join('');
  const statusLabel = (p.status || 'published') === 'published' ? 'Published' : escHtml(p.status);
  const links = [
    p.project_url ? `<a href="${attr(p.project_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-block">🔗 Lihat Proyek</a>` : '',
    p.github_url ? `<a href="${attr(p.github_url)}" target="_blank" rel="noopener noreferrer" class="btn btn-outline btn-block">💻 GitHub Repository</a>` : ''
  ].filter(Boolean).join('\n                                ');

  let out = html;

  // Title & meta description dari data
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${escHtml(p.title)} | Gigih</title>`);
  out = out.replace(/(<meta name="description" content=")[\s\S]*?(")/, `$1${attr(shortText(p.short_description || p.description, 155))}$2`);

  // Isi slot template (data tidak ada → sembunyikan bloknya)
  out = out.replace(/(<span data-slot="breadcrumb-title">)[\s\S]*?(<\/span>)/, `$1${escHtml(p.title)}$2`);
  out = out.replace(/(<h1 data-slot="title">)[\s\S]*?(<\/h1>)/, `$1${escHtml(p.title)}$2`);
  out = out.replace(/(<div class="prose" data-slot="description">)[\s\S]*?(<\/div>)/,
    `$1${escHtml(p.description || p.short_description || '').replace(/\n/g, '<br>')}$2`);

  // Hero image
  if (p.image) {
    out = out.replace(/(<div class="project-hero-image" data-slot="hero-image")([^>]*)>([\s\S]*?)(<\/div>)/,
      `$1>
                            <img src="${attr(p.image)}" alt="${attr(p.title)}">
                        $4`);
  }

  // Teknologi — tampilkan hanya kalau ada
  if (techs.length) {
    out = out.replace(/(<div class="project-technologies" data-slot="technologies-block")([^>]*?)hidden([^>]*>)/, '$1$2$3');
    out = out.replace(/(<div class="tech-tags" data-slot="technologies">)[\s\S]*?(<\/div>)/, `$1${techItems}$2`);
  }

  // Sidebar: status, tanggal
  out = out.replace(/(<span class="badge badge-success" data-slot="status">)[\s\S]*?(<\/span>)/, `$1${statusLabel}$2`);
  out = out.replace(/(<dd data-slot="created">)[\s\S]*?(<\/dd>)/, `$1${formatDate(p.created_at)}$2`);
  out = out.replace(/(<dd data-slot="updated">)[\s\S]*?(<\/dd>)/, `$1${formatDate(p.updated_at)}$2`);

  // Kartu tautan — tampilkan hanya kalau ada URL valid
  if (links) {
    out = out.replace(/(<div class="project-links-card" data-slot="links-card")([^>]*?)hidden([^>]*>)/, '$1$2$3');
    out = out.replace(/(<div class="link-buttons" data-slot="links">)[\s\S]*?(<\/div>)/, `$1\n                                ${links}\n                            $2`);
  }

  return out;
}

// Home
router.get('/', (req, res) => renderPage(res, 'home.html', 'Beranda'));

// About
router.get('/about', (req, res) => renderPage(res, 'about.html', 'Tentang'));

// Portfolio list — render dinamis dari storage/logs/portfolio.jsonl
router.get('/portfolio', (req, res) => {
  const html = readView('portfolio.html');
  if (html === null) return renderPage(res, 'portfolio.html', 'Portfolio');

  const list = readPortfolios().filter(p => (p.status || 'published') === 'published');
  const grid = portfolioGrid(list);

  // Sisipkan grid ke dalam <section class="portfolio"> ... </section>
  const marker = /(<section class="portfolio">\s*<div class="container">)([\s\S]*?)(<\/div>\s*<\/section>)/;
  const out = marker.test(html)
    ? html.replace(marker, (m, a, _b, c) => `${a}\n${grid}\n            ${c}`)
    : html;

  return res.type('html').send(out);
});

// Portfolio detail by slug — cari data, file statis spesifik, atau 404 (tanpa konten palsu)
router.get('/portfolio/:slug', (req, res, next) => {
  const slug = String(req.params.slug || '').replace(/[^a-zA-Z0-9-_]/g, '');
  if (!slug) return next();

  const html = readView('portfolio-detail.html');
  if (html === null) return next();

  // 1. Data dari storage/logs/portfolio.jsonl
  const p = readPortfolios().find(x => String(x.slug) === slug);
  if (p) return res.type('html').send(renderPortfolioDetail(html, p));

  // 2. File view khusus (mis. portfolio-<slug>.html) sebagai override manual
  const specific = path.join(__dirname, '..', '..', 'src', 'View', `portfolio-${slug}.html`);
  if (fs.existsSync(specific)) return res.sendFile(specific);

  // 3. Tidak ada datanya → 404
  return next();
});

// Contact (GET) — dukung ?sent=1 (sukses) dan ?error=... (gagal)
router.get('/contact', (req, res) => {
  const html = readView('contact.html');
  if (html === null) return renderPage(res, 'contact.html', 'Kontak');
  const sent = req.query.sent === '1';
  const errKey = String(req.query.error || '');
  if (!sent && !errKey) return res.type('html').send(html);

  let out = html;
  if (sent) {
    const rawName = String(req.query.name || '').slice(0, 60);
    const greet = rawName ? `Terima kasih, ${escHtml(rawName)}!` : 'Terima kasih!';
    const success = `<div class="contact-success" role="status" aria-live="polite">
      <div class="contact-success-icon" aria-hidden="true">✓</div>
      <h2>${greet}</h2>
      <p>Pesan Anda sudah diterima dan akan dibalas dalam <strong>24 jam</strong> pada hari kerja.</p>
      <div class="contact-success-actions">
        <a class="btn btn-primary" href="/">Kembali ke Beranda</a>
        <a class="btn btn-outline" href="/contact">Kirim Pesan Lain</a>
      </div>
    </div>`;
    out = out.replace(/(<div class="contact-form-wrapper">)[\s\S]*?(<\/form>\s*<\/div>)/,
      (m, open, close) => `${open}\n${success}\n      ${close}`);
  }
  if (errKey) {
    const msg = errKey === 'missing'
      ? 'Nama, email, dan pesan wajib diisi. Silakan lengkapi formulir.'
      : 'Terjadi kesalahan. Silakan coba lagi.';
    out = out.replace(/(<div class="contact-form-wrapper">)/,
      `<div class="alert alert-error" role="alert">${escHtml(msg)}</div>\n      $1`);
  }
  return res.type('html').send(out);
});

// Contact (POST) — simpan pesan; JSON untuk fetch/AJAX, redirect rapi untuk form biasa
router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body || {};
  const accept = String(req.get('Accept') || '');
  const wantsJson = req.xhr || accept.includes('application/json');
  if (!name || !email || !message) {
    if (wantsJson) return res.status(400).json({ ok: false, error: 'Nama, email, dan pesan wajib diisi.' });
    return res.redirect('/contact?error=missing');
  }
  appendMessageLog({
    name: String(name).slice(0, 120),
    email: String(email).slice(0, 160),
    subject: String(subject || '').slice(0, 160),
    message: String(message).slice(0, 5000),
    ip_address: req.ip || '',
    visited_at: new Date().toISOString()
  });
  if (wantsJson) return res.json({ ok: true, message: 'Terima kasih, pesan Anda sudah diterima.' });
  const q = `sent=1&name=${encodeURIComponent(String(name).slice(0, 60))}`;
  return res.redirect(`/contact?${q}`);
});

module.exports = router;
module.exports.readVisitorStats = readVisitorStats;
