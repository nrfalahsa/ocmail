"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, Users, Mail, Key, Activity, Trash2, UserCog, Search, AlertTriangle, RefreshCw, Eye, X, CheckCircle } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalInboxes: number;
  totalKeys: number;
  totalMessages: number;
  totalApiRequests: number;
}

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  role: "USER" | "ADMIN";
  createdAt: string;
  _count: {
    inboxes: number;
    apiKeys: number;
  };
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"users" | "inboxes" | "system">("users");
  const [blockedWordsInput, setBlockedWordsInput] = useState("");
  const [savingKeywords, setSavingKeywords] = useState(false);
  const [keywordStatus, setKeywordStatus] = useState<string | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<UserItem | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);
  const [allInboxes, setAllInboxes] = useState<Array<{
    id: string;
    address: string;
    prefix: string;
    domain: string;
    isCustom: boolean;
    userId: string | null;
    createdAt: string;
    expiresAt: string | null;
    user: { id: string; name: string | null; email: string | null } | null;
  }>>([]);
  const [inboxSearch, setInboxSearch] = useState("");
  const [loadingInboxes, setLoadingInboxes] = useState(false);
  const [previewInbox, setPreviewInbox] = useState<string | null>(null);
  const [previewMessages, setPreviewMessages] = useState<Array<{
    id: string;
    subject: string;
    from: string;
    received_at: number;
    otp?: string;
  }>>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    if (isAdmin) {
      loadData();
    } else if (status !== "loading") {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, status]);

  async function loadData() {
    setLoading(true);
    try {
      const [resStats, resUsers, resKeywords] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch(`/api/admin/users?q=${encodeURIComponent(search)}`),
        fetch("/api/admin/blocked-keywords"),
      ]);

      if (resStats.ok) {
        const d = await resStats.json();
        setStats(d.stats);
      }
      if (resUsers.ok) {
        const d = await resUsers.json();
        setUsers(d.users || []);
      }
      if (resKeywords.ok) {
        const d = await resKeywords.json();
        setBlockedWordsInput(d.raw || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveKeywords(e: React.FormEvent) {
    e.preventDefault();
    setSavingKeywords(true);
    setKeywordStatus(null);
    try {
      const res = await fetch("/api/admin/blocked-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords: blockedWordsInput }),
      });
      if (res.ok) {
        const d = await res.json();
        setBlockedWordsInput(d.raw || "");
        setKeywordStatus("Daftar kata terlarang berhasil disimpan.");
        setTimeout(() => setKeywordStatus(null), 3000);
      }
    } catch {
      setKeywordStatus("Gagal menyimpan perubahan.");
    } finally {
      setSavingKeywords(false);
    }
  }

  async function handleToggleRole(userId: string, currentRole: "USER" | "ADMIN") {
    const nextRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: nextRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: nextRole } : u))
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTargetUser) return;
    setDeletingUser(true);
    const userId = deleteTargetUser.id;
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingUser(false);
      setDeleteTargetUser(null);
    }
  }

  async function loadAllInboxes() {
    setLoadingInboxes(true);
    try {
      const res = await fetch(`/api/admin/all-inboxes?q=${encodeURIComponent(inboxSearch)}`);
      if (res.ok) {
        const d = await res.json();
        setAllInboxes(d.inboxes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingInboxes(false);
    }
  }

  useEffect(() => {
    if (isAdmin && activeTab === "inboxes") {
      loadAllInboxes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin]);

  async function openInboxPreview(address: string) {
    setPreviewInbox(address);
    setLoadingPreview(true);
    try {
      const res = await fetch(`/api/v1/inboxes/${encodeURIComponent(address)}/messages`);
      if (res.ok) {
        const msgs = await res.json();
        setPreviewMessages(msgs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPreview(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 rounded-2xl bg-zinc-900 border border-red-500/30 text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-white mb-2">Akses Ditolak</h2>
        <p className="text-sm text-zinc-400">
          Halaman ini khusus akun dengan role ADMIN. Pastikan email Anda terdaftar di <code>ADMIN_EMAILS</code> environment variable.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-blue-400" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Monitoring sistem, user management, dan status bridge Cloudflare Worker ocmail.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-medium">Total Users</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalUsers.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-medium">Total Inboxes</span>
            <Mail className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalInboxes.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-medium">Pesan Masuk</span>
            <Mail className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
            {stats?.totalMessages.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-medium">Active API Keys</span>
            <Key className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalKeys.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs uppercase font-medium">API Requests</span>
            <Activity className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400 font-mono">
            {stats?.totalApiRequests.toLocaleString() ?? 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === "users"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Manajemen User ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("inboxes")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === "inboxes"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Monitor Inbox ({stats?.totalInboxes ?? 0})
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === "system"
              ? "border-blue-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Konfigurasi & Worker
        </button>
      </div>

      {activeTab === "users" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2.5 rounded-xl border border-zinc-800">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari user berdasarkan email atau nama..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadData()}
              className="bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none flex-1"
            />
          </div>

          <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/30">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950/60 text-zinc-400 text-xs uppercase tracking-wider border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Inboxes</th>
                    <th className="py-3 px-4 text-center">API Keys</th>
                    <th className="py-3 px-4">Terdaftar</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{u.name || "Tanpa Nama"}</div>
                        <div className="text-xs text-zinc-400 font-mono">{u.email}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            u.role === "ADMIN"
                              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                              : "bg-zinc-800 text-zinc-300"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                        {u._count.inboxes}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono text-zinc-300">
                        {u._count.apiKeys}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-zinc-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleToggleRole(u.id, u.role)}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition"
                            title="Ganti Role (USER / ADMIN)"
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                          {u.id !== session?.user?.id && (
                            <button
                              onClick={() => setDeleteTargetUser(u)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
                              title="Hapus User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : activeTab === "inboxes" ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-zinc-900 px-4 py-2.5 rounded-xl border border-zinc-800">
            <Search className="h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Cari inbox berdasarkan alamat atau prefix..."
              value={inboxSearch}
              onChange={(e) => setInboxSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadAllInboxes()}
              className="bg-transparent text-sm text-white placeholder-zinc-500 focus:outline-none flex-1"
            />
            <button
              onClick={loadAllInboxes}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {loadingInboxes ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
            </div>
          ) : allInboxes.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-500">
              Tidak ada inbox ditemukan
            </div>
          ) : (
            <div className="grid gap-3">
              {allInboxes.map((inbox) => (
                <button
                  key={inbox.id}
                  onClick={() => openInboxPreview(inbox.address)}
                  className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 transition group text-left w-full"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono text-sm text-white group-hover:text-blue-400 transition truncate">
                        {inbox.address}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-zinc-500">
                        {inbox.user ? (
                          <span>
                            {inbox.user.name || inbox.user.email}
                          </span>
                        ) : (
                          <span>Anonim</span>
                        )}
                        <span>•</span>
                        <span className={inbox.isCustom ? "text-purple-400" : ""}>
                          {inbox.isCustom ? "Custom" : "Random"}
                        </span>
                        <span>•</span>
                        <span>
                          {new Date(inbox.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        {inbox.expiresAt && new Date(inbox.expiresAt) < new Date() && (
                          <>
                            <span>•</span>
                            <span className="text-red-400">Expired</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Eye className="h-4 w-4 text-zinc-600 group-hover:text-blue-400 transition shrink-0" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Blocked Keywords Config Card */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-md space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Filter Prefix Kustom Terlarang (Reserved Words)</h3>
              <p className="text-xs text-slate-400 mt-1">
                Kata-kata di bawah ini tidak dapat digunakan sebagai prefix email kustom oleh pengguna umum (misal: <code>admin@...</code>, <code>support@...</code>). Pisahkan kata dengan tanda koma atau baris baru.
              </p>
            </div>

            <form onSubmit={handleSaveKeywords} className="space-y-3">
              <textarea
                rows={4}
                value={blockedWordsInput}
                onChange={(e) => setBlockedWordsInput(e.target.value)}
                placeholder="admin, support, billing, root, abuse..."
                className="w-full p-3.5 rounded-xl bg-[#090d16] border border-slate-800 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-blue-400 font-medium">
                  {keywordStatus || ""}
                </span>
                <button
                  type="submit"
                  disabled={savingKeywords}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition disabled:opacity-50 shadow-sm"
                >
                  {savingKeywords ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>

          {/* Cloudflare Worker Status */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-md space-y-4">
            <h3 className="text-sm font-semibold text-white">Status Bridge Cloudflare Worker</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#090d16] border border-slate-800">
                <span className="text-slate-400">Cloudflare Worker Script</span>
                <span className="font-mono text-slate-300">cloudflare/worker.js</span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#090d16] border border-slate-800">
                <span className="text-slate-400">Mode Bridge</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  Cloudflare Email Routing + KV Store
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting User */}
      {deleteTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Hapus Akun Pengguna</h3>
                <p className="text-[11px] text-zinc-400">Tindakan ini permanen.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus akun{" "}
              <strong className="text-white">{deleteTargetUser.email || deleteTargetUser.name}</strong>? Seluruh data
              inbox yang diklaim dan API key milik user ini akan ikut dihapus.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetUser(null)}
                disabled={deletingUser}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                disabled={deletingUser}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition disabled:opacity-50"
              >
                {deletingUser ? "Menghapus..." : "Hapus Pengguna"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inbox Preview Modal */}
      {previewInbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-5xl h-[85vh] rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold text-white">Preview Inbox</h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">{previewInbox}</p>
              </div>
              <button
                onClick={() => setPreviewInbox(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              {loadingPreview ? (
                <div className="py-12 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
                </div>
              ) : previewMessages.length === 0 ? (
                <div className="py-12 text-center">
                  <Mail className="h-12 w-12 text-zinc-700 mx-auto mb-3" />
                  <p className="text-sm text-zinc-500">Belum ada pesan masuk</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {previewMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {msg.subject || "(No Subject)"}
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 truncate">
                            Dari: {msg.from}
                          </div>
                          {msg.otp && (
                            <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20">
                              <CheckCircle className="h-3 w-3 text-blue-400" />
                              <span className="text-xs font-mono text-blue-400">{msg.otp}</span>
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-600">
                          {new Date(msg.received_at).toLocaleString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span>{previewMessages.length} pesan</span>
                <a
                  href={`/?inbox=${encodeURIComponent(previewInbox)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition"
                >
                  Buka di tab baru →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
