"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { ShieldCheck, Users, Mail, Key, Activity, Trash2, UserCog, Search, AlertTriangle } from "lucide-react";

interface AdminStats {
  totalUsers: number;
  totalInboxes: number;
  totalKeys: number;
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
  const [activeTab, setActiveTab] = useState<"users" | "system">("users");

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    if (isAdmin) {
      loadData();
    } else if (status !== "loading") {
      setLoading(false);
    }
  }, [isAdmin, status]);

  async function loadData() {
    setLoading(true);
    try {
      const [resStats, resUsers] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch(`/api/admin/users?q=${encodeURIComponent(search)}`),
      ]);

      if (resStats.ok) {
        const d = await resStats.json();
        setStats(d.stats);
      }
      if (resUsers.ok) {
        const d = await resUsers.json();
        setUsers(d.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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

  async function handleDeleteUser(userId: string) {
    if (!confirm("Hapus user ini beserta seluruh inbox dan key mereka?")) return;
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="py-20 flex justify-center items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
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
            <ShieldCheck className="h-6 w-6 text-cyan-400" />
            Admin Dashboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Monitoring sistem, user management, dan status bridge Cloudflare Worker ocmail.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs uppercase font-medium">Total Users</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalUsers.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs uppercase font-medium">Total Inboxes</span>
            <Mail className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalInboxes.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs uppercase font-medium">Active API Keys</span>
            <Key className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {stats?.totalKeys.toLocaleString() ?? 0}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs uppercase font-medium">API Requests Handled</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">
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
              ? "border-cyan-500 text-white"
              : "border-transparent text-zinc-400 hover:text-white"
          }`}
        >
          Manajemen User ({users.length})
        </button>
        <button
          onClick={() => setActiveTab("system")}
          className={`pb-3 px-4 text-sm font-medium border-b-2 transition ${
            activeTab === "system"
              ? "border-cyan-500 text-white"
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
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
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
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800 transition"
                            title="Ganti Role (USER / ADMIN)"
                          >
                            <UserCog className="h-4 w-4" />
                          </button>
                          {u.id !== session?.user?.id && (
                            <button
                              onClick={() => handleDeleteUser(u.id)}
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
      ) : (
        <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
          <h3 className="text-base font-semibold text-white">Status Bridge Cloudflare Worker</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">Cloudflare Worker Script</span>
              <span className="font-mono text-xs text-cyan-400">cloudflare/worker.js</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800">
              <span className="text-zinc-400">Mode Bridge</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Cloudflare Email Routing + KV Store
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
