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

### 1. Database (PostgreSQL / Supabase / Neon)

1. Salin template env:
   ```bash
   cp .env.example .env
   ```

2. **Penting bagi pengguna Supabase:**
   - **Port 6543** adalah *Transaction Pooler (PgBouncer)*. Gunakan ini untuk `DATABASE_URL` aplikasi runtime (tambahkan `?pgbouncer=true`).
   - **Port 5432** adalah *Direct / Session Connection*. Masukkan ini ke `DIRECT_URL` agar perintah `prisma db push` tidak hang atau timeout:
     ```env
     DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
     DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"
     ```

3. Jalankan sinkronisasi schema database:
   ```bash
   pnpm exec prisma db push
   ```

---

### 2. Panduan Lengkap Cloudflare (Email Routing + Worker + KV)

Arsitektur ocmail memanfaatkan **Cloudflare Email Routing** untuk menangkap email masuk secara catch-all, menyimpannya di **Cloudflare KV**, dan menyediakannya via REST API ke Next.js.

```text
[ Pengirim Email ]
       │
       ▼
[ Cloudflare Email Routing (Catch-all) ]
       │
       ▼
[ Cloudflare Worker (cloudflare/worker.js) ]
       │
       ▼
[ Cloudflare KV Namespace: EMAILS ] ──(REST API)──► [ ocmail (Next.js di Vercel) ]
```

#### Langkah A: Aktifkan Cloudflare Email Routing pada Domain Anda
1. Buka [Cloudflare Dashboard](https://dash.cloudflare.com/) dan pilih domain Anda (misal: `domainanda.com`).
2. Masuk ke menu **Email** → **Email Routing**.
3. Klik tombol **Get started** atau **Enable Email Routing**.
4. Cloudflare akan mendeteksi DNS Anda. Klik tombol **Add records automatically** untuk memasukkan DNS records yang diperlukan:
   - 3 record **MX** (`route1.mx.cloudflare.net`, `route2.mx.cloudflare.net`, `route3.mx.cloudflare.net`).
   - 1 record **TXT** SPF (`v=spf1 include:_spf.mx.cloudflare.net ~all`).
5. Pastikan status Email Routing berubah menjadi **Configured / Active**.

#### Langkah B: Buat Cloudflare KV Namespace
1. Di sidebar kiri utama Cloudflare, buka **Storage & Databases** → **KV**.
2. Klik **Create namespace**.
3. Beri nama: `EMAILS` (huruf kapital semua).
4. Klik **Add**.

#### Langkah C: Deploy Cloudflare Worker
Tersedia dua opsi deployment:

##### Opsi 1: Lewat Dashboard Cloudflare (Tanpa CLI)
1. Buka menu **Compute (Workers)** → **Workers & Pages**.
2. Klik **Create application** → tab **Workers** → **Create Worker**.
3. Beri nama worker, misalnya: `ocmail-worker` → klik **Deploy**.
4. Klik **Edit code**:
   - Hapus semua template kode bawaan.
   - Buka file `cloudflare/worker.js` di proyek ini, copy seluruh kodenya, dan paste ke editor Cloudflare.
   - Klik **Deploy** di kanan atas.
5. Sambungkan KV Namespace:
   - Kembali ke halaman detail Worker `ocmail-worker`.
   - Masuk ke tab **Settings** → menu **Bindings** (atau **Variables and Secrets**).
   - Scroll ke bagian **KV Namespace Bindings** → klik **Add binding**:
     - **Variable name:** `EMAILS` *(Wajib persis huruf besar)*
     - **KV namespace:** Pilih `EMAILS` yang dibuat pada Langkah B.
   - Klik **Save and deploy**.
6. Ambil URL Worker:
   - Di tab **Settings** → **Domains & Routes**, pastikan route bawaan `workers.dev` aktif (misal: `https://ocmail-worker.subdomain.workers.dev`). Catat URL ini.

##### Opsi 2: Lewat Wrangler CLI (Untuk Developer)
1. Masuk ke direktori `cloudflare`:
   ```bash
   cd cloudflare
   cp wrangler.toml.example wrangler.toml
   ```
2. Login dan dapatkan ID KV:
   ```bash
   npx wrangler login
   npx wrangler kv:namespace list
   ```
3. Salin `id` dari namespace `EMAILS` ke `wrangler.toml`.
4. Deploy worker:
   ```bash
   npx wrangler deploy
   ```

#### Langkah D: Hubungkan Catch-all Email Routing ke Worker
1. Kembali ke menu domain Anda di Cloudflare Dashboard: **Email** → **Email Routing**.
2. Klik tab **Routing rules**.
3. Di baris **Catch-all address**:
   - Ubah toggle menjadi **Active**.
   - Klik **Edit** (ikon pensil).
   - Di kolom **Action**: pilih **Send to a Worker**.
   - Di kolom **Destination**: pilih worker Anda (`ocmail-worker`).
   - Klik **Save**.

#### Langkah E: Uji Coba Cloudflare Worker
1. **Uji Endpoint API:**
   Buka terminal dan request session mock:
   ```bash
   curl https://ocmail-worker.subdomain.workers.dev/api/session
   ```
   Harus mengembalikan: `{"sessionId":"ocm-session-..."}`.

2. **Uji Penerimaan Email:**
   Kirim email sembarang dari akun Gmail pribadi Anda ke alamat uji coba, misalnya:
   `testing123@domainanda.com`.

3. **Cek Email di Worker:**
   ```bash
   curl https://ocmail-worker.subdomain.workers.dev/api/inboxes/testing123@domainanda.com/messages
   ```
   Pesan email Anda akan muncul dalam format JSON lengkap dengan subject dan body.

---

### 3. Konfigurasi Variabel Lingkungan (`.env`)

Isi file `.env` di proyek Next.js:

```env
# Database PostgreSQL (Supabase / Neon)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-eu-west-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Auth.js / NextAuth
AUTH_SECRET="buat-secret-acak-32-karakter-dengan-openssl"
AUTH_URL="http://localhost:3000"

# OAuth Google & GitHub
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"
AUTH_GITHUB_ID="github-client-id"
AUTH_GITHUB_SECRET="github-client-secret"

# Email Admin (otomatis role ADMIN saat login)
ADMIN_EMAILS="emailanda@gmail.com"

# Bridge Cloudflare Worker dari Langkah C
CF_WORKER_URL="https://ocmail-worker.subdomain.workers.dev"

# Daftar Domain TempMail Cloudflare (pisahkan koma jika multi-domain)
ALLOWED_DOMAINS="domainanda.com,domain2.xyz"
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
