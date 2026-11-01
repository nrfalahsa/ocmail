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

  const snippet1 = `curl -X POST https://your-ocmail.vercel.app/api/v1/inboxes \\
  -H "Authorization: Bearer ocm_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"prefix": "mybot", "domain": "oneclash.xyz"}'`;

  const snippet2 = `curl https://your-ocmail.vercel.app/api/v1/inboxes/mybot@oneclash.xyz/messages \\
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
          onClick={() => signIn()}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition"
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
            <Key className="h-6 w-6 text-cyan-400" />
            API Keys & Automation
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gunakan API Key untuk mengintegrasikan script bot/farm (seperti grok.py atau tempik_client.py) langsung ke ocmail.
          </p>
        </div>
      </div>

      {/* Generated Token Alert */}
      {generatedRawKey && (
        <div className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/40 space-y-3 animate-in fade-in">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
            <ShieldAlert className="h-5 w-5 text-cyan-400" />
            API Key Baru Berhasil Dibuat!
          </div>
          <p className="text-xs text-cyan-200/80">
            Salin sekarang. Demi keamanan, token ini <strong>tidak akan pernah ditampilkan lagi</strong>.
          </p>
          <div className="flex items-center gap-2 bg-black/60 p-3 rounded-xl border border-cyan-500/30">
            <code className="text-sm font-mono text-cyan-300 break-all flex-1 select-all">
              {generatedRawKey}
            </code>
            <button
              onClick={() => copyToClipboard(generatedRawKey)}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition"
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
            placeholder="Contoh: Grok Farm Script, Server Alpha"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-sm focus:outline-none focus:border-cyan-500 transition"
            required
          />
          <button
            type="submit"
            disabled={creating}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-sm font-medium flex items-center justify-center gap-2 transition disabled:opacity-50"
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
                    <td className="py-3.5 px-4 text-center font-mono text-cyan-400">
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
      <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-base">
          <Terminal className="h-5 w-5 text-cyan-400" />
          Contoh Penggunaan API (cURL & Python)
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono">1. Buat Custom atau Random Inbox</span>
              <button
                type="button"
                onClick={() => copySnippet("snip1", snippet1)}
                className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition"
              >
                {copiedSnippet === "snip1" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet === "snip1" ? "Disalin" : "Salin"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-black/80 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto">
{snippet1}
            </pre>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 font-mono">2. Ambil Pesan & Auto-OTP</span>
              <button
                type="button"
                onClick={() => copySnippet("snip2", snippet2)}
                className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition"
              >
                {copiedSnippet === "snip2" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedSnippet === "snip2" ? "Disalin" : "Salin"}</span>
              </button>
            </div>
            <pre className="p-3 rounded-xl bg-black/80 border border-zinc-800 text-xs font-mono text-zinc-300 overflow-x-auto">
{snippet2}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
