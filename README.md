# ocmail 📬

Platform *disposable email* / *tempmail* modern, berkinerja tinggi, dan dirancang untuk kebutuhan komunitas ratusan pengguna serta automasi skrip/bot (farm account, registrasi layanan AI, dan integrasi API). 

Menggunakan stack **Next.js 15 (App Router)** yang dideploy di **Vercel**, dipadukan dengan **Cloudflare Email Routing + Cloudflare KV** sebagai penampung email masuk instan, **PostgreSQL (Supabase/Neon)** via **Prisma ORM**, dan sistem otentikasi **Auth.js (Google & GitHub OAuth)**.

---

## ⚡ Fitur Utama

- **Inbox Instan (Random & Kustom):**
  - **Random:** Dapatkan alamat email acak berformat unik (misal: `ocm_a8f9x2@domain.com`) hanya dengan satu klik.
  - **Kustom:** Tentukan prefix sendiri (misal: `mybot@domain.com`) yang otomatis dikunci ke akun Anda.
- **Isolasi Kepemilikan & Anti-Hijacking:**
  - Prefix email kustom yang dibuat pengguna login akan dikunci eksklusif di database. Pengguna lain tidak dapat membuat atau mengintip pesan pada alamat yang sama.
- **Filter Kata Terlarang Dinamis (Reserved Keywords):**
  - Sistem secara default melindungi prefix administratif seperti `admin`, `support`, `billing`, `root`, `abuse`, dll.
  - Admin dapat memperbarui daftar kata terlarang langsung dari dashboard admin.
- **Deteksi Cerdas OTP / Kode Verifikasi:**
  - Mesin regex otomatis memindai kode OTP (4–8 digit, pola xAI `699-696`, format numerik berspasi/strip).
  - Tahan terhadap gangguan warna hex CSS (seperti `#333333`) pada body email.
  - Kartu salin OTP 1-klik untuk efisiensi registrasi.
- **Sandboxed HTML Email Viewer:**
  - Parsing otomatis MIME multipart (`quoted-printable`, `base64`, teks murni, dan HTML).
  - Merender tampilan visual email asli di dalam `iframe` terisolasi (*sandboxed*) untuk keamanan maksimal.
  - Ekspor/unduh format raw RFC822 asli (`.eml`).
- **Riwayat Email Akun (History, Switch & Delete):**
  - Pengguna login dapat melihat daftar email yang pernah dibuat.
  - Berpindah kotak masuk kapan saja dengan tombol *Gunakan* atau menghapusnya melalui modal konfirmasi kustom.
- **Manajemen API Key & Automasi:**
  - Generate token `ocm_...` dengan hashing SHA-256 untuk otentikasi bot skrip (Python, cURL, Node.js).
  - Pelacakan jumlah permintaan (*requests count*) dan timestamp penggunaan terakhir.
  - Validasi ketat: penolakan instan dengan status `401 Unauthorized` untuk token invalid/dummy.
- **Dashboard Admin:**
  - Statistik ringkasan: Total Users, Inboxes, Active API Keys, dan Total API Requests.
  - Manajemen Pengguna: Cari akun, ubah role (`USER` ⇄ `ADMIN`), dan hapus akun beserta datanya.
  - Konfigurasi kata terlarang dan pemantauan status bridge Cloudflare Worker.
- **Tema Minimalis Vercel:**
  - Mengadopsi sistem token warna resmi Vercel (OKLCH dark/light theme, font Geist / Geist Mono).

---

## 🏗️ Arsitektur Sistem

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
[ Cloudflare KV Namespace: EMAILS (TTL 24h) ]
       ▲
       │  (REST API Bridge via HTTPS)
       ▼
[ ocmail Core (Next.js 15 on Vercel) ]
       │
       ├─► PostgreSQL (Supabase / Neon via Prisma ORM)
       └─► Auth.js v5 (Google & GitHub OAuth)
```

---

## 📁 Struktur Direktori

```text
├── cloudflare/
│   ├── worker.js              # Script Cloudflare Worker (penangkap email & API bridge)
│   └── wrangler.toml.example  # Contoh konfigurasi deployment via Wrangler CLI
├── prisma/
│   └── schema.prisma          # Skema database (User, ApiKey, Inbox, Session, SystemSetting)
├── scripts/
│   └── test-core.mjs          # Unit test mandiri logika regex OTP & SHA-256 API key
├── src/
│   ├── app/
│   │   ├── admin/             # Dashboard Admin & manajemen kata terlarang
│   │   ├── api/               # Endpoint REST API (inboxes, messages, keys, admin)
│   │   ├── auth/              # Halaman autentikasi OAuth
│   │   ├── keys/              # Halaman manajemen API Key & dokumentasi cURL
│   │   ├── rules/             # Halaman panduan privasi & aturan platform
│   │   ├── globals.css        # Variabel tema OKLCH Vercel
│   │   ├── layout.tsx         # Root layout aplikasi
│   │   └── page.tsx           # Antarmuka utama TempMail & workspace pesan
│   ├── components/            # Komponen Navbar, Providers, Modal
│   └── lib/                   # Prisma client, OTP extractor, MIME parser, API guard
└── .env.example               # Template variabel lingkungan
```

---

## 🛠️ Panduan Instalasi & Setup

### 1. Database (PostgreSQL / Supabase / Neon)

1. Salin template variabel lingkungan:
   ```bash
   cp .env.example .env
   ```
2. **Khusus Pengguna Supabase:**
   - Gunakan port **6543** (*Transaction Pooler*) untuk `DATABASE_URL` runtime aplikasi (wajib sertakan `?pgbouncer=true`).
   - Gunakan port **5432** (*Direct Connection*) untuk `DIRECT_URL` agar perintah migrasi Prisma tidak mengalami timeout.
   ```env
   DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require"
   DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres?sslmode=require"
   ```
3. Sinkronisasikan skema tabel ke database:
   ```bash
   pnpm exec prisma db push
   ```

### 2. Setup Cloudflare Email Routing & Worker

1. **Buat KV Namespace:**
   - Buka Cloudflare Dashboard → **Storage & Databases** → **KV**.
   - Buat namespace baru bernama: `EMAILS`.
2. **Deploy Worker:**
   - Masuk ke **Compute (Workers)** → **Create application** → **Create Worker**.
   - Beri nama (misal: `ocmail-worker`) lalu Deploy.
   - Buka editor kode Worker, gantikan seluruh isinya dengan file `cloudflare/worker.js`, lalu deploy.
   - Buka tab **Settings** → **Bindings** → **Add binding**:
     - **Type:** `KV Namespace`
     - **Variable Name:** `EMAILS` *(Wajib huruf besar)*
     - **KV Namespace:** Pilih `EMAILS`.
   - Pastikan rute publik `workers.dev` aktif dan catat URL-nya (contoh: `https://ocmail-worker.subdomain.workers.dev`).
3. **Konfigurasi Routing Rules:**
   - Buka domain Anda di Cloudflare → menu **Email Routing**.
   - Pastikan DNS record otomatis (MX & SPF) telah terkonfigurasi.
   - Di tab **Routing Rules** → edit **Catch-all address**:
     - **Action:** `Send to a Worker`
     - **Destination:** Pilih `ocmail-worker`.

### 3. Konfigurasi Variabel Lingkungan (`.env`)

Isi file `.env` dengan kredensial yang valid:

```env
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Auth.js / NextAuth
AUTH_SECRET="buat-secret-acak-32-karakter-dengan-openssl"
AUTH_URL="http://localhost:3000"

# OAuth Providers
AUTH_GOOGLE_ID="google-client-id"
AUTH_GOOGLE_SECRET="google-client-secret"
AUTH_GITHUB_ID="github-client-id"
AUTH_GITHUB_SECRET="github-client-secret"

# Akses Admin
ADMIN_EMAILS="email-admin@domain.com"

# Bridge Cloudflare Worker
CF_WORKER_URL="https://ocmail-worker.subdomain.workers.dev"

# Domain Aktif (pisahkan koma)
ALLOWED_DOMAINS="oneclash.biz.id,oneclash.my.id"
```

### 4. Menjalankan di Lingkungan Lokal

```bash
# Install dependensi
pnpm install

# Jalankan unit test internal
node scripts/test-core.mjs

# Mulai server development
pnpm dev
```
Akses di browser: `http://localhost:3000`.

---

## 🚀 Deploy ke Vercel

1. Push repository ke GitHub:
   ```bash
   git push origin main
   ```
2. Buka [Vercel Dashboard](https://vercel.com/new) dan import repository `ocmail`.
3. Masukkan seluruh variabel dari `.env` ke bagian **Environment Variables** proyek di Vercel:
   - Perbarui `AUTH_URL` dengan domain produksi Vercel Anda (contoh: `https://ocmail.oneclash.xyz`).
4. Daftarkan callback URL produksi pada Google Cloud Console dan GitHub OAuth App:
   - `https://[DOMAIN-ANDA]/api/auth/callback/google`
   - `https://[DOMAIN-ANDA]/api/auth/callback/github`
5. Jalankan **Deploy**.

---

## 🤖 Referensi REST API & Otomatisasi

Gunakan header berikut pada setiap panggilan API:
```text
Authorization: Bearer ocm_YOUR_API_KEY
Content-Type: application/json
```

### 1. Cek Domain yang Tersedia
```bash
curl https://ocmail.oneclash.xyz/api/domains
```
**Respons:**
```json
{
  "domains": ["oneclash.biz.id", "oneclash.my.id"]
}
```

### 2. Buat Alamat Email (Random atau Kustom)
```bash
# Random
curl -X POST https://ocmail.oneclash.xyz/api/v1/inboxes \
  -H "Authorization: Bearer ocm_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": "oneclash.biz.id"}'

# Kustom (Otomatis terkunci ke akun API Key Anda)
curl -X POST https://ocmail.oneclash.xyz/api/v1/inboxes \
  -H "Authorization: Bearer ocm_YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prefix": "mybot", "domain": "oneclash.biz.id"}'
```
**Respons:**
```json
{
  "address": "mybot@oneclash.biz.id",
  "prefix": "mybot",
  "domain": "oneclash.biz.id",
  "isCustom": true,
  "id": "cmvy3of..."
}
```

### 3. Ambil Pesan Masuk & Kode OTP Otomatis
```bash
curl https://ocmail.oneclash.xyz/api/v1/inboxes/mybot@oneclash.biz.id/messages \
  -H "Authorization: Bearer ocm_YOUR_KEY"
```
**Respons:**
```json
[
  {
    "id": "msg_88a3de...",
    "to": "mybot@oneclash.biz.id",
    "from": "SpaceXSI <noreply@x.ai>",
    "subject": "Grok confirmation code: 247-857",
    "otp": "247857",
    "received_at": 1793537722587
  }
]
```

### 4. Riwayat Inbox (Reuse) & Hapus
```bash
# Mengambil seluruh inbox milik akun Anda
curl https://ocmail.oneclash.xyz/api/v1/inboxes \
  -H "Authorization: Bearer ocm_YOUR_KEY"

# Menghapus inbox
curl -X DELETE https://ocmail.oneclash.xyz/api/v1/inboxes/mybot@oneclash.biz.id \
  -H "Authorization: Bearer ocm_YOUR_KEY"
```

### 5. Tabel Kode Status & Pesan Error

| HTTP Status | Deskripsi | Format Error JSON |
|---|---|---|
| `400 Bad Request` | Prefix tidak valid (kurang dari 2 karakter) atau masuk kata terlarang (*reserved word*). | `{"error": "Prefix 'admin' dilindungi oleh sistem. Silakan gunakan nama lain."}` |
| `401 Unauthorized` | API Key tidak dikirim, format salah, atau token tidak terdaftar di database. | `{"error": "API Key tidak valid atau tidak terdaftar."}` |
| `403 Forbidden` | Mencoba membaca pesan dari email yang dimiliki oleh pengguna lain. | `{"error": "Forbidden: Anda tidak memiliki akses ke inbox ini."}` |
| `409 Conflict` | Prefix kustom yang diminta sudah diklaim oleh pengguna lain. | `{"error": "Alamat email ini sudah digunakan oleh pengguna lain. Silakan pilih prefix lain."}` |

---

## 🔒 Lisensi & Privasi

Proyek ini dibangun untuk kebutuhan email sementara dengan retensi data 24 jam pada storage Cloudflare KV. Seluruh email lama akan dibersihkan secara otomatis oleh Cloudflare TTL tanpa meninggalkan jejak raw data.
