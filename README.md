# Personal Branding Website - Gigih

Website personal branding untuk Gigih Yanuar Prabawa — IT Support Specialist.

**Status runtime saat ini: Node.js (Express) + Cloudflare Tunnel.** PHP & MySQL ada tapi idle (structural legacy).

---

## 🚀 Tech Stack (runtime aktif)

| Area | Teknologi |
|------|-----------|
| **Server runtime** | Node.js v24 + Express.js (file `server.js`) |
| **Panel session** | `express-session` (file store) |
| **Router & routes** | `server/routes/public.js` + `server/routes/panel.js` |
| **Helpers** | `src/Core/helpers.php` (PHP fitur helper), `server/utils/*.js` |
| **Data storage** | `storage/logs/*.jsonl` (messages, portfolios, visitors) |
| **Frontend** | HTML di `src/View/`, CSS/JS di `public/assets/` |
| **Tema** | `prefers-color-scheme` device auto, tanpa tombol manual |
| **Device detection** | `ua-parser-js` di `server/utils/helpers.js` |
| **Backup** | Manual: `mysqldump` + `tar -czf` (exclude `node_modules`, `.git`, `server.log`) |
| **Domain** | `gigihgyp.my.id` (tunnel Cloudflare Zero Trust LXC) |
| **Deploy** | `systemctl --user personal-branding.service` (auto-start boot) |

---

## 📁 Struktur Project (versi terkini)

```
personal-branding/
├── public/                     # Document root (web accessible)
│   ├── index.php               # Idle (tidak dipakai server utama)
│   ├── assets/
│   │   ├── css/app.css         # 1 file, ~3000 baris CSS
│   │   ├── js/app.js           # 1 file, ~280 baris JS (main client)
│   │   └── images/
│   └── assets/uploads/         # Upload gambar portfolio (JPG/PNG/WebP, max 2MB)
├── src/                        # Source code (diluar web root)
│   ├── Core/                   # PHP helpers (tersedia tapi idle)
│   │   └── helpers.php         # fungsi `str_limit()`, `escHtml()`
│   ├── View/                   # HTML views (yang server sajikan)
│   │   ├── home.html           # Beranda lengkap (hero, foto, grid)
│   │   ├── about.html          # Tentang saya
│   │   ├── portfolio.html      # Daftar portfolio (dinamis dari JSONL)
│   │   ├── portfolio-detail.html # Detail portfolio
│   │   ├── contact.html        # Form kontak
│   │   └── layouts/app.php     # Layout utama (footer, theme toggle)
│   └── Controller/             # Idle (PHP) — tidak dipakai saat ini
│       └── PanelController.php
├── server/
│   ├── app.js                  # Entry: load .env → createApp() → listen()
│   ├── routes/
│   │   ├── public.js           # Route publik: /, /about, /portfolio, /contact
│   │   ├── panel.js            # Route admin: login, dashboard, portfolio CRUD, messages
│   │   └── errors.js           # 404 & 500 handler
│   ├── middleware/
│   │   ├── auth.js             # authGuard cek session panelLoggedIn
│   │   └── visitorLog.js       # Log visitor stats (JSONL)
│   └── utils/
│       ├── helpers.js          # parseDevice(), friendlyAndroidModel(), escHtml()
│       ├── portfolioLog.js     # CRUD JSONL portfolio
│       ├── messageLog.js       # CRUD JSONL messages + deleteMessage()
│       └── visitorLog.js       # Log visitor stats JSONL
├── storage/
│   ├── logs/
│   │   ├── visitors.jsonl      # Log kunjungan (auto diisi server)
│   │   ├── messages.jsonl      # Pesan masuk (dapat dihapus via panel)
│   │   └── portfolio.jsonl     # Portfolio (dapat CRUD via panel)
│   └── cache/                  # Cache files (bisa dibersihkan)
├── composer.json               # PHP composer — idle, tidak dipakai runtime
├── package.json                # Dependencies Node.js (express, bcrypt, rate-limit, ua-parser-js)
├── .env.example              # Contoh environment variables
└── .gitignore                # 401 B — ignore /node_modules, .env, *.log, dll
```

---

## ⚙️ Instalasi & Menjalankan Secara Lokal

```bash
# 1. Clone / pastikan project ada di folder
cd /path/to/personal-branding

# 2. Install dependencies Node.js
npm install  # atau: npm ci

# 3. Setup file .env (copy dari .env.example)
cp .env.example .env
# Edit .env jika butuh sesuaikan port, DB, panel cred

# 4. Jalankan server Node.js (preview/production)
npm start   # atau: node server.js

# 5. Akses di browser
#   Local:   http://localhost:3000
#   Network: http://YOUR_LAN_IP:3000 (LAN)
#   Tunnel:  https://gigihgyp.my.id (via Cloudflare Zero Trust)

# 6. Login panel (path rahasia, lihat .env)
#   Email: panel@example.com
#   Password: YOUR_DB_PASSWORD  (default dari .env.example, ganti dulu!)
```

### Script backup manual (opsional)

```bash
DATE=$(date +%Y%m%d-%H%M%S)
mysqldump -u your_db_user -pYOUR_DB_PASSWORD personal_branding > ~/backups/db-$DATE.sql
tar -czf ~/backups/files-$DATE.tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=server.log \
  --exclude=storage/logs/*.jsonl \
  --exclude=storage/logs/*.log \
  --exclude=storage/cache/* \
  . 2>/dev/null
sha256sum ~/backups/db-$DATE.sql ~/backups/files-$DATE.tar.gz
```

---

## 🛠️ Development — Menambah Fitur

### Menambah Portfolio Baru (via Panel)

1. Buka `https://gigihgyp.my.id/panel/login (path rahasia)`
2. Login dengan kredensial panel
3. Klik **Portfolio** → **+ Tambah Portfolio**
4. Isi form: Judul, Slug, Deskripsi, Teknologi, URL, Gambar (max 2MB)
5. Status: `Published` atau `Draft`
6. Klik **Simpan** → data langsung ke `storage/logs/portfolio.jsonl`

### Menambah Pesan Masuk (via Form Kontak)

1. Buka `/contact`
2. Isi: Nama, Email, Subjek, Pesan
3. Klik **Kirim Pesan** → data ke `storage/logs/messages.jsonl`
4. Di panel `/panel/messages` → bisa dilihat, ditandai baca, atau dihapus

### Menambah Validasi di Form

Semua validasi dijalankan server-side di `server/routes/public.js`. Client-side di `public/assets/js/app.js` hanyalah enhancements tambahan.

---

## 🛠️ Maintenance & Troubleshooting

### Menghapus Pesan di Panel

1. Buka `/panel/messages` (butuh login panel)
2. Temukan pesan yang ingin dihapus
3. Klik tombol **Hapus** (icon tangות)
4. Konfirmasi `Yakin ingin menghapus pesan ini?`
5. Pesan terhapus dari `storage/logs/messages.jsonl`
6. Flash message muncul: *"Pesan berhasil dihapus"*

### Tema tidak berubah

- Website ikut setelan OS/browser pengunjung (`prefers-color-scheme`)
- Tidak ada tombol manual (sesuai permintaan Gigih)
- Jika ingin paksa terang/gelap, hapus `localStorage` dari devtools

### Port/Servis tidak bisa diakses

```bash
# Cek service status
systemctl --user status personal-branding

# Cek port yang dipakai
netstat -tlnp | grep 3000

# Restart service
systemctl --user restart personal-branding
```

### Lupa password panel

```bash
# Edit .env lalu restart service
# Atau langsung ke DB
mysql -u your_db_user -pYOUR_DB_PASSWORD personal_branding -e "
UPDATE users SET password = '\$2y\$10\$NEWHASH...' WHERE email = 'panel@example.com';
"
# Atau generate hash: node -e "console.log(require('bcryptjs').hashSync('PASSWORD_BARU'))"
```

---

## 📦 Lisensi

Proyek pribadi — digunakan untuk perkenalkan diri dan kemampuan teknologi.