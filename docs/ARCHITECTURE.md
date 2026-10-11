# ARCHITECTURE — Personal Branding Website

## Overview
Personal branding website sederhana untuk Gigih Yanuar Prabawa (IT Support Specialist). Tujuan: perkenalan pribadi, tidak ada iklan, daftar layanan, atau panggilan penjualan.

---

## Tech Stack (Runtime Aktif)

| Layer | Teknologi |
|-------|-----------|
| **Server** | Node.js 24 + Express.js (`server.js` → `server/app.js`) |
| **Admin Auth** | `express-session` (MemoryStore) + bcrypt password |
| **Rate Limit** | `express-rate-limit` (100 req / 15 min per IP) |
| **Data Storage** | JSONL files di `storage/logs/` (messages, portfolios, visitors) |
| **Device Detection** | `ua-parser-js` (UAParser) — output: type, category, detail, vendor, model, os, osVersion, browser, browserVersion |
| **Frontend** | HTML di `src/View/`, CSS/JS di `public/assets/` (tanpa bundler) |
| **Tema** | Auto `prefers-color-scheme` device, live-update via `matchMedia`, **tanpa tombol manual**, tanpa `localStorage` |
| **Static Assets** | `express.static('public')` |
| **Backup** | Manual `mysqldump` + `tar -czf` (exclude node_modules, .git, server.log, JSONL logs) |

---

## Struktur Direktori (Versi Aktif)

```
personal-branding/
├── public/                      # Document root
│   ├── index.php               # Idle (PHP legacy)
│   ├── assets/
│   │   ├── css/app.css         # ~3000 baris, CSS variables + media queries
│   │   ├── js/app.js           # ~280 baris: theme, mobile menu, form validation, toast
│   │   └── images/profile.jpg  # Foto profil (57 KB)
│   └── assets/uploads/         # Upload portfolio (JPG/PNG/WebP, max 2MB)
├── src/
│   ├── Core/helpers.php        # PHP helpers (str_limit, escHtml) — idle
│   └── View/                   # HTML views (disediakan server Node.js)
│       ├── home.html
│       ├── about.html
│       ├── portfolio.html
│       ├── portfolio-detail.html
│       ├── contact.html
│       └── layouts/app.php     # Layout utama (footer, nav, theme-init)
├── server/
│   ├── app.js                  # Entry modular: middleware, routes, error handlers
│   ├── routes/
│   │   ├── public.js           # Route publik (/, /about, /portfolio, /contact)
│   │   ├── admin.js            # Route admin (login, dashboard, CRUD)
│   │   └── errors.js           # 404 & 500 handler
│   ├── middleware/
│   │   ├── auth.js             # authGuard, guestOnly
│   │   └── visitorLog.js       # Log visitor stats (JSONL)
│   └── utils/
│       ├── helpers.js          # parseDevice, friendlyAndroidModel, escHtml
│       ├── portfolioLog.js     # CRUD portfolio JSONL
│       ├── messageLog.js       # CRUD messages JSONL + deleteMessage
│       └── visitorLog.js       # Stats visitor JSONL
├── storage/
│   └── logs/
│       ├── visitors.jsonl      # Auto-diisi server
│       ├── messages.jsonl      # Form kontak + admin
│       └── portfolio.jsonl     # Admin CRUD
├── composer.json               # PHP dependencies (idle)
├── package.json                # Node.js dependencies
├── .env.example
└── .gitignore
```

---

## Keamanan

| Fitur | Implementasi |
|-------|--------------|
| **Password hashing** | bcrypt (via `bcryptjs`) di admin login |
| **Session** | `express-session` + `httpOnly`, `sameSite=lax`, 24h maxAge |
| **Rate limiting** | 100 req / 15 min per IP (express-rate-limit) |
| **XSS Protection** | `escHtml()` → `htmlspecialchars(..., ENT_QUOTES \| ENT_SUBSTITUTE, 'UTF-8')` di server utils |
| **Input Validation** | Server-side: required fields, slug format, URL format (http/https), deskripsi min 20 char |
| **Upload** | Max 2MB, whitelist JPG/PNG/WebP, simpan di `public/assets/uploads/` |
| **Sensitive files** | `.env`, `storage/`, `server/` tidak disajikan via static |

---

## Alur Data

### Visitor Logging
```
Request → visitorLog middleware → parseDevice(UA) → append visitors.jsonl
```
Hanya GET non-asset non-admin yang dilog. Bot (UA mengandung bot/crawler) di-skip.

### Contact Form
```
POST /contact → validate → append messages.jsonl → redirect /contact?sent=1 (atau JSON)
```

### Portfolio CRUD (Admin)
```
GET    /admin/portfolio          → readPortfolios() → render table
POST   /admin/portfolio          → validate + normalize → createPortfolio()
POST   /admin/portfolio/:id      → validate + normalize → updatePortfolio()
POST   /admin/portfolio/:id/delete → deletePortfolio()
```

### Portfolio Detail (Publik)
```
GET /portfolio/:slug
  1. Cari di portfolio.jsonl by slug → renderPortfolioDetail()
  2. File override: src/View/portfolio-{slug}.html → sendFile
  3. Tidak ada → 404 (TIDAK fallback ke konten contoh hardcoded)
```

---

## Tema (Dark/Light)

- **Auto-detect**: `window.matchMedia('(prefers-color-scheme: dark)')`
- **Live update**: `matchMedia.addEventListener('change', applyTheme)` — berubah tanpa reload
- **Anti-flash**: Inline script di `<head>` setiap halaman set `data-theme` sebelum paint
- **Tidak ada**: tombol toggle manual, `localStorage` penyimpanan preferensi

---

## Infrastruktur (Production)

```
Internet (HTTPS)
    │
    ▼
Cloudflare Edge (gigihgyp.my.id — proxied)
    │  (Cloudflare Zero Trust Tunnel)
    ▼
LXC: cloudflared  ──(LAN)──►  VM: YOUR_LAN_IP:3000 (Node.js — personal-branding.service)
                              └─ systemd --user, enabled + linger=yes + Restart=always
                              └─ listen 0.0.0.0:3000, auto-start saat host boot tanpa login
```

| Komponen | Lokasi | Catatan |
|----------|--------|---------|
| Proxmox VE host | Bare metal | Menjalankan VM + LXC di jaringan LAN yang sama |
| LXC — cloudflared | Container Proxmox | `cloudflared tunnel` forward ke `YOUR_LAN_IP:3000` |
| VM — App | VM Proxmox | Node.js `server.js` via `personal-branding.service` (user systemd) |
| Domain | `gigihgyp.my.id` | DNS proxied Cloudflare, TLS terminasi di edge |

**Implikasi:**
- Di VM **tidak perlu** Nginx/Certbot untuk produksi selama lewat tunnel
- Pastikan firewall VM izinkan koneksi dari subnet LXC/Proxmox
- Auto-start: `systemctl --user is-enabled personal-branding` → `enabled`, `loginctl show-user YOUR_USER` → `Linger=yes`

---

## Code Organization Principles

1. **Modular routes** — `public.js` & `admin.js` pisah, register di `app.js`
2. **Utils terpisah** — `helpers.js`, `portfolioLog.js`, `messageLog.js`, `visitorLog.js`
3. **Middleware ringan** — `auth.js` (authGuard), `visitorLog.js` (stats)
3. **Template rendering** — `readView()` baca `src/View/*.html`, `renderPage()` / `renderPortfolioDetail()` sisipkan data
4. **Progressive enhancement** — Form jalan tanpa JS, dengan JS jadi AJAX + toast
5. **No build step** — CSS/JS dikirim apa adanya (untuk project skala ini cukup)