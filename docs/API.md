# API Reference — Personal Branding Website (Node.js/Express)

Runtime aktif: **Node.js (Express)** — file `server.js` entry point. PHP & MySQL tidak dipakai untuk request HTTP.

---

## Public Routes (GET)

| Route | Handler | Deskripsi |
|-------|---------|-----------|
| `/` | `public.js` → `renderPage('home.html')` | Beranda: hero, foto profil, stats, keahlian, proyek unggulan |
| `/about` | `public.js` → `renderPage('about.html')` | Tentang saya: profil, filosofi, tech stack, education |
| `/portfolio` | `public.js` → `renderPage('portfolio.html')` + inject grid | Daftar portfolio **dinamis** dari `storage/logs/portfolio.jsonl` (filter status=published) |
| `/portfolio/:slug` | `public.js` → `renderPortfolioDetail()` | Detail portfolio: cari di JSONL → file spesifik `src/View/portfolio-{slug}.html` → **404** |
| `/contact` | `public.js` → `renderPage('contact.html')` | Form kontak (GET) — dukung `?sent=1&name=...` & `?error=missing` |

---

## Public Routes (POST)

| Route | Handler | Deskripsi |
|-------|---------|-----------|
| `/contact` | `public.js` | Simpan pesan ke `storage/logs/messages.jsonl`. **Response:** JSON (AJAX) atau **redirect** ke `/contact?sent=1&name=...` (form biasa). Error → `/contact?error=missing` |

### POST /contact — Request

| Field | Tipe | Wajib | Catatan |
|-------|------|-------|---------|
| `name` | string | ✅ | max 120 char |
| `email` | string | ✅ | format email, max 160 char |
| `subject` | string | ❌ | max 160 char |
| `message` | string | ✅ | max 5000 char |

### POST /contact — Response (JSON / AJAX)

```json
// Sukses
{ "ok": true, "message": "Terima kasih, pesan Anda sudah diterima." }

// Gagal validasi
{ "ok": false, "error": "Nama, email, dan pesan wajib diisi." }
```

### POST /contact — Response (Form biasa)

| Kondisi | Redirect ke |
|---------|-------------|
| Sukses | `/contact?sent=1&name=<encodeURIComponent(name)>` |
| Validasi gagal | `/contact?error=missing` |

---

## Admin Routes (Require Session Auth — `express-session`)

| Route | Method | Handler | Deskripsi |
|-------|--------|---------|-----------|
| `/admin/login` | GET | `admin.js` | Form login |
| `/admin/login` | POST | `admin.js` | Proses login (bcrypt), set `session.adminLoggedIn=true` |
| `/admin/logout` | GET | `admin.js` | Destroy session, redirect `/admin/login` |
| `/admin/dashboard` | GET | `admin.js` | Dashboard: stats visitors, messages, portfolio counts |
| `/admin/visitors` | GET | `admin.js` | Visitor stats: total, today, daily 30 hari, 20 terakhir |
| `/admin/messages` | GET | `admin.js` | List pesan (sort: unread dulu, created_at desc) |
| `/admin/messages/:id/read` | POST | `admin.js` | Tandai pesan dibaca (flash success) |
| `/admin/messages/:id/delete` | POST | `admin.js` | **Hapus pesan** dari JSONL (flash success/error) |
| `/admin/portfolio` | GET | `admin.js` | List portfolio (semua status, pakai `readPortfolios()`) |
| `/admin/portfolio/create` | GET | `admin.js` | Form create portfolio |
| `/admin/portfolio` | POST | `admin.js` | Simpan portfolio baru (validasi URL, flash) |
| `/admin/portfolio/:id/edit` | GET | `admin.js` | Form edit portfolio |
| `/admin/portfolio/:id` | POST | `admin.js` | Update portfolio (validasi URL, flash) |
| `/admin/portfolio/:id/delete` | POST | `admin.js` | Hapus portfolio (flash) |

---

## Data Models (JSONL)

### Message (`storage/logs/messages.jsonl`)

```json
{
  "id": "mv3ssp2b4h7a",
  "name": "Pengirim",
  "email": "pengirim@email.com",
  "subject": "Subjek",
  "message": "Isi pesan...",
  "is_read": false,
  "ip_address": "192.168.x.x",
  "user_agent": "Mozilla/5.0...",
  "visited_at": "2026-10-11T12:27:09.155Z"
}
```

### Portfolio (`storage/logs/portfolio.jsonl`)

```json
{
  "id": 1,
  "title": "Setup Server Linux",
  "slug": "setup-server-linux",
  "description": "Deskripsi lengkap...",
  "short_description": "Ringkasan 140 char",
  "image": "/assets/uploads/xyz.jpg",
  "technologies": ["Ubuntu", "Nginx", "Docker"],
  "project_url": "https://github.com/user/repo",
  "github_url": "https://github.com/user/repo",
  "is_featured": true,
  "status": "published",
  "order": 0,
  "created_at": "2026-10-11T11:37:52.346Z",
  "updated_at": "2026-10-11T11:37:52.346Z"
}
```

### Visitor Log (`storage/logs/visitors.jsonl`)

```json
{
  "ip_address": "192.168.x.x",
  "visited_page": "/portfolio",
  "device": { "type": "Mobile", "detail": "Android 14 (Samsung A55)", "vendor": "Samsung", "model": "Samsung Galaxy A55", "os": "Android", "osVersion": "14", "browser": "Chrome", "browserVersion": "120" },
  "visited_at": "2026-10-11T12:30:45+07:00",
  "referred_from": "https://google.com/"
}
```

---

## Environment Variables (.env)

```env
# Server
PORT=3000
HOST=0.0.0.0
LAN_IP=YOUR_LAN_IP

# Admin Auth (bcrypt hash di .env.example hanya placeholder)
ADMIN_USER=admin@example.com
ADMIN_PASS=YOUR_ADMIN_PASSWORD

# Session
SESSION_SECRET=your-session-secret

# Database (idle — tidak dipakai runtime Node.js, tersedia untuk PHP legacy)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=personal_branding
DB_USERNAME=your_db_user
DB_PASSWORD=YOUR_DB_PASSWORD
```

---

## Rate Limiting

- **100 request / 15 menit** per IP (via `express-rate-limit` di `server/app.js`)
- Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`
- Response 429: `"Terlalu banyak request, coba lagi nanti"`

---

## Session Auth

- Driver: `express-session` (MemoryStore default)
- Cookie: `connect.sid`
- Lifetime: 24 jam (`maxAge: 24 * 60 * 60 * 1000`)
- HttpOnly, SameSite=lax
- Guard: `authGuard` middleware cek `req.session.adminLoggedIn === true`

---

## XSS Protection

- Server-side: fungsi `escHtml()` di `server/utils/helpers.js` → `htmlspecialchars(..., ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8')`
- Client-side: semua output dinamis di template pakai `${escHtml(...)}` sebelum disisipkan

---

## Device Detection

- Library: `ua-parser-js` → `UAParser`
- Output: `type`, `category`, `detail`, `vendor`, `model`, `os`, `osVersion`, `browser`, `browserVersion`
- Android model friendly name: fungsi `friendlyAndroidModel(raw, vendor)` — mendukung Samsung A/S, Xiaomi/Redmi/POCO, OPPO CPH*, Realme RMX*, Infinix, dll