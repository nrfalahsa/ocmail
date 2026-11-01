# ocmail 📬

Platform disposable email / tempmail modern, cepat, dan terintegrasi Cloudflare Email Routing + KV Store untuk ratusan pengguna dan bot automation.

---

## ⚡ Fitur Utama

- **Inbox Instan (Random & Kustom):** Buat email acak atau tentukan prefix kustom (misal: `bot-1@domain.com`).
- **Dukungan Multi-Domain:** Pilih domain aktif dari konfigurasi dropdown.
- **Deteksi Otomatis OTP / Kode Verifikasi:** Regex ekstraksi kode (4–8 digit, format xAI `699-696`, anti-CSS hex `#333333`) dengan tombol 1-klik salin.
- **Polling Otomatis (3 Detik):** Pesan masuk otomatis tanpa reload halaman manual.
- **Ekspor Email Mentah (.EML):** Unduh format RFC822 asli atau baca tampilan preview/raw text.
- **Manajemen API Key:** Token `ocm_...` untuk integrasi bot/farm (Python, cURL, headless browser).
- **Dashboard Admin:**
  - Metrik: total pengguna, inbox aktif, API key, dan total permintaan API.
  - Manajemen User: daftar user, pencarian, switch role (USER / ADMIN), dan hapus akun.
  - Monitoring status bridge Cloudflare Worker.
- **Autentikasi OAuth:** Login / logout menggunakan Google & GitHub via Auth.js (NextAuth v5).
- **Fallback Simulation:** Otomatis aktif di localhost bila Cloudflare Worker belum diatur.

---

## 📁 Struktur Direktori

```text
├── cloudflare/
│   └── worker.js             # Worker penangkap email masuk & API bridge KV
├── prisma/
│   └── schema.prisma         # Schema database (User, ApiKey, Inbox, Session)
├── scripts/
│   └── test-core.mjs         # Assert test mandiri untuk regex OTP & hashing
├── src/
│   ├── app/
│   │   ├── admin/            # Dashboard Admin & manajemen pengguna
│   │   ├── api/              # Endpoint REST API (v1 inboxes, messages, keys, admin)
│   │   ├── auth/             # Halaman Sign In OAuth
│   │   └── keys/             # Halaman manajemen API Key
│   ├── components/           # Navbar, Providers, UI
│   └── lib/                  # Prisma client, OTP regex, Cloudflare bridge, API guard
└── .env.example              # Template variabel lingkungan
```

---

## 🛠️ Panduan Setup Lengkap

### 1. Database (PostgreSQL)

Buat instance PostgreSQL di Neon, Supabase, atau Vercel Postgres:
```bash
# Salin template env
cp .env.example .env

# Jalankan migrasi schema ke database
pnpm exec prisma db push
```

### 2. Cloudflare Worker & Email Routing (Sekali Saja)

1. **Buat KV Namespace:**
   - Masuk Dashboard Cloudflare → **Workers & Pages** → **KV**.
   - Buat namespace bernama `EMAILS`.
2. **Deploy Worker:**
   - Buat Worker baru (misal: `ocmail-worker`).
   - Salin isi `cloudflare/worker.js` ke script Worker.
   - Buka **Settings** → **Bindings** → **Add Binding**:
     - Type: `KV Namespace`
     - Variable Name: `EMAILS`
     - KV Namespace: Pilih `EMAILS`.
   - Simpan & Deploy.
3. **Konfigurasi Email Routing:**
   - Buka domain Anda di Cloudflare → **Email Routing**.
   - Pastikan record DNS (MX & SPF) aktif.
   - Di tab **Routing Rules** → **Catch-all address**:
     - Action: `Send to a Worker`
     - Destination: Pilih worker yang baru dibuat (`ocmail-worker`).
4. Catat URL Worker (misal: `https://ocmail-worker.subdomain.workers.dev`).

### 3. Konfigurasi Variabel Lingkungan (`.env`)

Isi file `.env` dengan kredensial:

```env
# Database
DATABASE_URL="postgresql://user:password@host/ocmail?sslmode=require"

# Auth.js / NextAuth
AUTH_SECRET="buat-secret-acak-32-karakter"
AUTH_URL="http://localhost:3000"

# OAuth Google & GitHub
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"
AUTH_GITHUB_ID="github-client-id"
AUTH_GITHUB_SECRET="github-client-secret"

# Email Admin (otomatis role ADMIN saat login)
ADMIN_EMAILS="emailanda@gmail.com"

# Bridge Cloudflare Worker
CF_WORKER_URL="https://ocmail-worker.subdomain.workers.dev"

# Daftar Domain TempMail (pisahkan dengan koma)
ALLOWED_DOMAINS="domain1.com,domain2.xyz"
```

### 4. Menjalankan di Lokal

```bash
# Install dependensi
pnpm install

# Jalankan test mandiri logika OTP & Hash
node scripts/test-core.mjs

# Jalankan server development
pnpm dev
```
Buka `http://localhost:3000`.

---

## 🚀 Deploy ke Vercel

1. Push repository ke GitHub:
   ```bash
   git push origin main
   ```
2. Buka [Vercel Dashboard](https://vercel.com/new) dan import repository `ocmail`.
3. Tambahkan semua Environment Variables dari file `.env` di pengaturan proyek Vercel:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `AUTH_URL` (URL produksi Vercel, misal: `https://ocmail.vercel.app`)
   - `AUTH_GOOGLE_ID` & `AUTH_GOOGLE_SECRET`
   - `AUTH_GITHUB_ID` & `AUTH_GITHUB_SECRET`
   - `ADMIN_EMAILS`
   - `CF_WORKER_URL`
   - `ALLOWED_DOMAINS`
4. Di Google Cloud Console & GitHub OAuth Apps, daftarkan callback URL produksi:
   - `https://your-domain.vercel.app/api/auth/callback/google`
   - `https://your-domain.vercel.app/api/auth/callback/github`
5. Klik **Deploy**.

---

## 🤖 Integrasi API & Otomatisasi (Bot / Farm)

Gunakan API Key yang digenerate di halaman `/keys` (`Authorization: Bearer ocm_...`):

### 1. Buat Inbox (Kustom atau Acak)
```bash
curl -X POST https://your-domain.vercel.app/api/v1/inboxes \
  -H "Authorization: Bearer ocm_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prefix": "bot123", "domain": "domain1.com"}'
```

### 2. Ambil Pesan & OTP Otomatis
```bash
curl https://your-domain.vercel.app/api/v1/inboxes/bot123@domain1.com/messages \
  -H "Authorization: Bearer ocm_YOUR_KEY"
```

Response JSON:
```json
[
  {
    "id": "msg_xxx",
    "to": "bot123@domain1.com",
    "from": "verify@x.ai",
    "subject": "SpaceXAI confirmation code: 699-696",
    "otp": "699696",
    "received_at": 1730456000000
  }
]
```

### 3. Hapus Inbox
```bash
curl -X DELETE https://your-domain.vercel.app/api/v1/inboxes/bot123@domain1.com \
  -H "Authorization: Bearer ocm_YOUR_KEY"
```
