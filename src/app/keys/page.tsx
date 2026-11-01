"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { Key, Plus, Trash2, Copy, Check, Terminal, ShieldAlert } from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  requestsCount: number;
  lastUsedAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedRawKey, setGeneratedRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  function copySnippet(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  }

  const snippet1 = `# Ambil domain aktif yang tersedia
curl https://your-ocmail.vercel.app/api/domains`;

  const snippet2 = `# 1. Buat Alamat Random
curl -X POST https://your-ocmail.vercel.app/api/v1/inboxes \\
  -H "Authorization: Bearer ocm_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"domain": "oneclash.xyz"}'

# 2. Buat Alamat Kustom (Eksklusif terkunci ke akun Anda)
curl -X POST https://your-ocmail.vercel.app/api/v1/inboxes \\
  -H "Authorization: Bearer ocm_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prefix": "mybot", "domain": "oneclash.xyz"}'`;

  const snippet3 = `# Ambil pesan & kode OTP otomatis
curl https://your-ocmail.vercel.app/api/v1/inboxes/mybot@oneclash.xyz/messages \\
  -H "Authorization: Bearer ocm_YOUR_KEY"`;

  const snippet4 = `# 1. Lihat daftar email milik Anda (Reuse)
curl https://your-ocmail.vercel.app/api/v1/inboxes \\
  -H "Authorization: Bearer ocm_YOUR_KEY"

# 2. Hapus email dari akun & server
curl -X DELETE https://your-ocmail.vercel.app/api/v1/inboxes/mybot@oneclash.xyz \\
  -H "Authorization: Bearer ocm_YOUR_KEY"`;

  useEffect(() => {
    if (session?.user) {
      loadKeys();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [session, status]);

  async function loadKeys() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data.keys || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateKey(e: React.FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);

    try {
      const res = await fetch("/api/v1/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedRawKey(data.rawKey);
        setNewKeyName("");
        loadKeys();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleRevokeKey(id: string) {
    if (!confirm("Apakah Anda yakin ingin mencabut API Key ini? Tindakan ini tidak dapat dibatalkan.")) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/keys?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setKeys((prev) => prev.filter((k) => k.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }

  if (status === "loading" || loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
      </div>
    );
  }

  if (!session?.user) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
        <div className="inline-flex p-3 rounded-xl bg-zinc-800 text-zinc-300 mb-4">
          <Key className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Login Diperlukan</h2>
        <p className="text-sm text-zinc-400 mb-6">
          Anda perlu login untuk membuat dan mengelola API Key untuk integrasi otomatisasi (Python, Node.js, CLI).
        </p>
        <button
          onClick={() => signIn(undefined, { callbackUrl: "/" })}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium text-xs transition"
        >
          Masuk Sekarang
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Key className="h-6 w-6 text-blue-400" />
            API Keys & Automation
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gunakan API Key untuk mengintegrasikan script bot/farm ke ocmail.
          </p>
        </div>
      </div>

      {/* Generated Token Alert */}
      {generatedRawKey && (
        <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/30 space-y-2.5 animate-in fade-in">
          <div className="flex items-center gap-2 text-blue-300 font-semibold text-xs">
            <ShieldAlert className="h-4 w-4 text-blue-400" />
            API Key Baru Berhasil Dibuat
          </div>
          <p className="text-[11px] text-blue-200/80">
            Salin sekarang. Demi keamanan, token ini <strong>tidak akan pernah ditampilkan lagi</strong>.
          </p>
          <div className="flex items-center gap-2 bg-black/60 p-2.5 rounded-lg border border-blue-500/20">
            <code className="text-xs font-mono text-blue-300 break-all flex-1 select-all">
              {generatedRawKey}
            </code>
            <button
              onClick={() => copyToClipboard(generatedRawKey)}
              className="px-3 py-1 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center gap-1.5 transition"
            >
              {copiedKey ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedKey ? "Disalin!" : "Salin"}
            </button>
          </div>
        </div>
      )}

      {/* Create Key Form */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800">
        <h2 className="text-base font-semibold text-white mb-4">Buat API Key Baru</h2>
        <form onSubmit={handleCreateKey} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Contoh: Farm Script"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-cyan-500 transition"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Membuat..." : "Buat Key"}
          </button>
        </form>
      </div>

      {/* Keys Table */}
      <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/30">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-200">Daftar API Key Aktif ({keys.length})</h2>
        </div>
        {keys.length === 0 ? (
          <div className="p-8 text-center text-sm text-zinc-500">
            Belum ada API Key. Buat yang pertama di atas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-950/60 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-3 px-4">Nama</th>
                  <th className="py-3 px-4">Prefix Token</th>
                  <th className="py-3 px-4 text-center">Total Panggilan</th>
                  <th className="py-3 px-4">Terakhir Digunakan</th>
                  <th className="py-3 px-4">Dibuat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {keys.map((k) => (
                  <tr key={k.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 px-4 font-medium text-white">{k.name}</td>
                    <td className="py-3.5 px-4">
                      <code className="text-xs font-mono bg-zinc-800 px-2 py-1 rounded text-zinc-300">
                        {k.keyPrefix}
                      </code>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-blue-400">
                      {k.requestsCount.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-400">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString() : "Belum pernah"}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-zinc-400">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
                        title="Cabut API Key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Code Snippets & Documentation */}
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-6">
        <div>
          <div className="flex items-center gap-2 text-white font-semibold text-base">
            <Terminal className="h-5 w-5 text-blue-400" />
            Dokumentasi & Referensi API Lengkap
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Format autentikasi: sertakan header <code>Authorization: Bearer ocm_...</code> pada setiap request.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Card 1: Domains */}
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">1. Domain yang Tersedia</span>
              <button
                type="button"
                onClick={() => copySnippet("snip1", snippet1)}
                className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition"
              >
                {copiedSnippet === "snip1" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet === "snip1" ? "Disalin" : "Salin"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-black/90 border border-zinc-800/80 text-xs font-mono text-zinc-300 overflow-x-auto">
{snippet1}
            </pre>
            <p className="text-[11px] text-zinc-500">
              Response: <code>{`{"domains": ["oneclash.xyz", "ocmail.me"]}`}</code>
            </p>
          </div>

          {/* Card 2: Create Random / Custom */}
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">2. Buat Email (Random & Kustom)</span>
              <button
                type="button"
                onClick={() => copySnippet("snip2", snippet2)}
                className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition"
              >
                {copiedSnippet === "snip2" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet === "snip2" ? "Disalin" : "Salin"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-black/90 border border-zinc-800/80 text-xs font-mono text-zinc-300 overflow-x-auto">
{snippet2}
            </pre>
            <p className="text-[11px] text-zinc-500">
              Status <code>201 Created</code>. Prefix yang dibuat otomatis terikat ke akun API Key Anda.
            </p>
          </div>

          {/* Card 3: Poll Messages & OTP */}
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">3. Ambil Pesan & Auto OTP</span>
              <button
                type="button"
                onClick={() => copySnippet("snip3", snippet3)}
                className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition"
              >
                {copiedSnippet === "snip3" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet === "snip3" ? "Disalin" : "Salin"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-black/90 border border-zinc-800/80 text-xs font-mono text-zinc-300 overflow-x-auto">
{snippet3}
            </pre>
            <p className="text-[11px] text-zinc-500">
              Response berupa array pesan. Field <code>&quot;otp&quot;: &quot;123456&quot;</code> terisi otomatis jika ditemukan kode verifikasi.
            </p>
          </div>

          {/* Card 4: Reuse & Delete */}
          <div className="space-y-2 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-200">4. Reuse (Riwayat) & Hapus</span>
              <button
                type="button"
                onClick={() => copySnippet("snip4", snippet4)}
                className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition"
              >
                {copiedSnippet === "snip4" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet === "snip4" ? "Disalin" : "Salin"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-lg bg-black/90 border border-zinc-800/80 text-xs font-mono text-zinc-300 overflow-x-auto">
{snippet4}
            </pre>
            <p className="text-[11px] text-zinc-500">
              <code>GET /api/v1/inboxes</code> mengambil daftar email milik Anda untuk dipakai ulang.
            </p>
          </div>
        </div>

        {/* Error Codes Reference Table */}
        <div className="space-y-3 pt-2">
          <div className="text-xs font-semibold text-zinc-200">Daftar Kode Status & Pesan Error API</div>
          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-900/60 text-zinc-400 font-mono text-[11px] border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3 w-28">Status</th>
                  <th className="py-2.5 px-3 w-40">Penyebab</th>
                  <th className="py-2.5 px-3">Contoh Respons JSON</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                <tr>
                  <td className="py-2.5 px-3 font-mono text-amber-400 font-semibold">400 Bad Request</td>
                  <td className="py-2.5 px-3 text-zinc-400">Prefix tidak valid / terlarang</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">
                    {`{"error": "Prefix 'admin' dilindungi oleh sistem. Silakan gunakan nama lain."}`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono text-red-400 font-semibold">401 Unauthorized</td>
                  <td className="py-2.5 px-3 text-zinc-400">API Key salah atau tidak ada</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">
                    {`{"error": "Unauthorized"}`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono text-red-400 font-semibold">403 Forbidden</td>
                  <td className="py-2.5 px-3 text-zinc-400">Email milik user lain</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">
                    {`{"error": "Forbidden: Anda tidak memiliki akses ke inbox ini."}`}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-mono text-amber-400 font-semibold">409 Conflict</td>
                  <td className="py-2.5 px-3 text-zinc-400">Prefix sudah diklaim user lain</td>
                  <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-400">
                    {`{"error": "Alamat email ini sudah digunakan oleh pengguna lain. Silakan pilih prefix lain."}`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
