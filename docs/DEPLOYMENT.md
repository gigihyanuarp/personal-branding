# DEPLOYMENT — Personal Branding Website (Node.js + Cloudflare Zero Trust Tunnel)

> **Catatan:** Dokumentasi ini untuk setup **saat ini** (Node.js + systemd + Cloudflare Tunnel via LXC). Versi lama untuk PHP-FPM + Nginx + Certbot tersedia di history git.

---

## Prasyarat Server (VM Ubuntu 24.04)

| Komponen | Versi / Catatan |
|----------|-----------------|
| OS | Ubuntu 24.04 LTS (atau Debian-based) |
| Node.js | v20+ (disarankan v22/v24 via NodeSource) |
| npm | bawaan Node.js |
| MariaDB/MySQL | 10.6+ / 8.0+ (opsional — hanya untuk PHP legacy / backup) |
| systemd | user services (`linger=yes`) |
| Cloudflare | Akun + domain `gigihgyp.my.id` sudah di Cloudflare |

---

## 1. Siapkan User & Direktori

```bash
# User OS: YOUR_USER
# Project sudah di-clone di: /path/to/personal-branding
# (atau lokasi yang sama persis)

cd /path/to/personal-branding
```

---

## 2. Install Node.js Dependencies

```bash
# Install dependencies production
npm ci --omit=dev

# Atau jika pertama kali
npm install --omit=dev
```

Dependencies (dari `package.json`):
- `express` — web framework
- `express-rate-limit` — rate limiting
- `express-session` — panel session
- `bcryptjs` — password hashing
- `multer` — file upload (portfolio image)
- `ua-parser-js` — device detection

---

## 3. Konfigurasi Environment

```bash
# Copy template
cp .env.example .env

# Edit .env dengan nilai produksi
nano .env
```

**Isi `.env` minimal:**
```env
# Server
PORT=3000
HOST=0.0.0.0
LAN_IP=YOUR_LAN_IP

# Panel Auth
PANEL_USER=panel@example.com
# PANEL_PASS=YOUR_PANEL_PASSWORD  (plain text — akan di-hash bcrypt di login)
# ATAU generate hash: node -e "console.log(require('bcryptjs').hashSync('PASSWORD_BARU'))"
# Lalu isi PANEL_PASS_HASH=$2y$10$... (server.js cek PANEL_PASS dulu, fallback ke hash)

# Session
SESSION_SECRET=ganti-dengan-string-random-32-char-min

# Database (opsional — untuk PHP legacy / manual backup)
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=personal_branding
DB_USERNAME=your_db_user
DB_PASSWORD=YOUR_DB_PASSWORD
```

---

## 4. Database (Opsional — untuk PHP legacy / manual query)

```bash
# Buat database & user jika belum
sudo mysql -u root -p <<EOF
CREATE DATABASE personal_branding CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'your_db_user'@'localhost' IDENTIFIED BY 'YOUR_DB_PASSWORD';
GRANT ALL PRIVILEGES ON personal_branding.* TO 'your_db_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Jika butuh tabel untuk PHP (legacy), jalankan seeder
# php database/seed.php
```

---

## 5. Systemd User Service (Auto-start)

**File sudah ada:** `.openclaw/workspace/personal-branding.service` (di home user)

```bash
# Pastikan file service di ~/.config/systemd/user/
mkdir -p ~/.config/systemd/user
cp /path/to/personal-branding/personal-branding.service ~/.config/systemd/user/

# Enable linger (supaya service jalan tanpa login)
loginctl enable-linger YOUR_USER

# Reload & enable
systemctl --user daemon-reload
systemctl --user enable personal-branding
systemctl --user start personal-branding

# Cek status
systemctl --user status personal-branding
```

**Isi `personal-branding.service`:**
```ini
[Unit]
Description=Personal Branding Node.js Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/personal-branding
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
Environment=NODE_ENV=production
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=default.target
```

---

## 6. Cloudflare Zero Trust Tunnel (LXC Terpisah)

> Tunnel berjalan di **LXC container terpisah** di host Proxmox yang sama.

### Di LXC cloudflared:

```bash
# Install cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Login & buat tunnel
cloudflared tunnel login
cloudflared tunnel create personal-branding
cloudflared tunnel route dns personal-branding gigihgyp.my.id

# Systemd service untuk tunnel
sudo tee /etc/systemd/system/cloudflared.service <<'EOF'
[Unit]
Description=cloudflared tunnel
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/cloudflared tunnel --no-autoupdate run --token <TOKEN_DARI_DASHBOARD>
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

### Verifikasi Tunnel

```bash
# Dari VM app, test koneksi ke tunnel
curl -I https://gigihgyp.my.id
# Harus 200 OK, header cf-ray ada
```

---

## 7. Firewall (UFW) di VM App

```bash
# Hanya izinkan dari subnet LXC/Proxmox + SSH
sudo ufw allow from YOUR_LAN_SUBNET to any port 3000
sudo ufw allow OpenSSH
sudo ufw --force enable
sudo ufw status numbered
```

---

## 8. Permission & Storage

```bash
cd /path/to/personal-branding

# Pastikan folder writable
chmod -R 755 storage/
chmod -R 755 public/assets/uploads/

# Owner user gigih
sudo chown -R gigih:gigih .
```

---

## 9. Ganti Password Panel (Wajib Setelah Login Pertama)

```bash
# Generate hash baru
node -e "console.log(require('bcryptjs').hashSync('PASSWORD_BARU_YANG_KUAT'))"
# Output contoh: $2y$10$AbCdEfGh...

# Update .env
# PANEL_PASS_HASH=$2y$10$AbCdEfGh...  (server.js prioritas cek PANEL_PASS_HASH)
```

Atau via MySQL (jika tabel users dipakai):
```bash
mysql -u gigih -p personal_branding -e "
UPDATE users SET password = '\$2y\$10\$AbCdEfGh...' WHERE email = 'panel@example.com';
"
```

---

## 10. Monitoring & Logrotate

### Logrotate untuk server.log

```bash
sudo tee /etc/logrotate.d/personal-branding <<'EOF'
/path/to/personal-branding/server.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 640 gigih gigih
    sharedscripts
    postrotate
        systemctl --user reload personal-branding > /dev/null 2>&1 || true
    endscript
}
EOF
```

### Health Check Endpoint (Opsional)

Tambah di `server/routes/public.js`:
```js
router.get('/healthz', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
```

Lalu monitor via Uptime Kuma / cron.

---

## 11. Backup Otomatis (Manual/Scheduled)

```bash
# Script backup manual
cat > ~/backup.sh <<'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR=~/backups
mkdir -p "$BACKUP_DIR"

# DB dump
mysqldump -u gigih -pYOUR_DB_PASSWORD personal_branding > "$BACKUP_DIR/db-$DATE.sql"

# Files (exclude node_modules, .git, logs, cache)
tar -czf "$BACKUP_DIR/files-$DATE.tar.gz" \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=server.log \
  --exclude=storage/logs/*.jsonl \
  --exclude=storage/logs/*.log \
  --exclude=storage/cache/* \
  -C /path/to/personal-branding .

# SHA256
sha256sum "$BACKUP_DIR/db-$DATE.sql" "$BACKUP_DIR/files-$DATE.tar.gz" > "$BACKUP_DIR/SHA256SUMS-$DATE.txt"

# Hapus backup > 30 hari
find "$BACKUP_DIR" -name "db-*.sql" -mtime +30 -delete
find "$BACKUP_DIR" -name "files-*.tar.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "SHA256SUMS-*.txt" -mtime +30 -delete
EOF

chmod +x ~/backup.sh

# Cron harian jam 02:00
(crontab -l 2>/dev/null; echo "0 2 * * * ~/backup.sh >> ~/backup.log 2>&1") | crontab -
```

---

## 12. Checklist Go-Live

- [ ] DNS `gigihgyp.my.id` & `www.gigihgyp.my.id` → proxied Cloudflare (orange cloud)
- [ ] Tunnel cloudflared LXC status `active` (hijau di dashboard Zero Trust)
- [ ] VM firewall izinkan port 3000 dari subnet LXC
- [ ] `systemctl --user status personal-branding` → `active (running)`
- [ ] Semua halaman publik load 200: `/`, `/about`, `/portfolio`, `/contact`
- [ ] Panel login & dashboard akses 200
- [ ] Form kontak kirim → masuk `storage/logs/messages.jsonl`
- [ ] Upload gambar portfolio < 2MB → tampil di `/portfolio`
- [ ] Tema gelap/terang ikut OS/browser (auto)
- [ ] Hamburger menu slide/overlay berfungsi di mobile (Android/iOS)
- [ ] Favicon GY muncul di tab browser
- [ ] `robots.txt` accessible
- [ ] Rate limiting aktif (test dengan `hey -n 200 -c 10 http://localhost:3000/`)
- [ ] Backup script jalan & file tersimpan di `~/backups/`

---

## Rollback / Recovery

```bash
# Restart cepat
systemctl --user restart personal-branding

# Restore DB dari backup
mysql -u gigih -p personal_branding < ~/backups/db-20261011-120000.sql

# Restore files
cd /path/to/personal-branding
tar -xzf ~/backups/files-20261011-120000.tar.gz

# Deploy ulang (git pull + npm ci + restart)
cd /path/to/personal-branding
git pull origin main
npm ci --omit=dev
systemctl --user restart personal-branding
```

---

## Quick Commands Cheatsheet

```bash
# Status service
systemctl --user status personal-branding

# Log real-time
journalctl --user -u personal-branding -f

# Restart
systemctl --user restart personal-branding

# Backup manual
~/backup.sh

# Cek tunnel LXC
ssh lxc-cloudflared "systemctl status cloudflared"

# Generate password hash
node -e "console.log(require('bcryptjs').hashSync('PASSWORD_BARU'))"
```