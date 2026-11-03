"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Sparkles,
  Download,
  CheckCircle,
  FileText,
  Eye,
  AlertCircle,
  X,
  ChevronDown,
  History
} from "lucide-react";

interface Message {
  id: string;
  to: string;
  from: string;
  subject: string;
  date: string;
  body: string;
  html?: string;
  text?: string;
  isHtml?: boolean;
  received_at: number;
  otp?: string;
}

interface SavedInbox {
  id: string;
  address: string;
  prefix: string;
  domain: string;
  isCustom: boolean;
  createdAt: string;
}

export default function HomePage() {
  const { data: session } = useSession();
  const [domains, setDomains] = useState<string[]>(["oneclash.biz.id", "oneclash.my.id"]);
  const [selectedDomain, setSelectedDomain] = useState<string>("oneclash.biz.id");
  const [customPrefix, setCustomPrefix] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [activeAddress, setActiveAddress] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);
  const [copiedOtp, setCopiedOtp] = useState<boolean>(false);
  const [viewTab, setViewTab] = useState<"preview" | "raw">("preview");
  const [lastChecked, setLastChecked] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [userInboxes, setUserInboxes] = useState<SavedInbox[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const domainDropdownRef = useRef<HTMLDivElement>(null);

  // Close domain dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (domainDropdownRef.current && !domainDropdownRef.current.contains(e.target as Node)) {
        setDomainDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setMounted(true);
    setLastChecked(new Date().toLocaleTimeString());
  }, []);

  // Load user's saved inboxes if logged in
  useEffect(() => {
    if (session?.user) {
      loadUserInboxes();
    } else {
      setUserInboxes([]);
    }
  }, [session]);

  async function loadUserInboxes() {
    setLoadingHistory(true);
    try {
      const res = await fetch("/api/v1/inboxes");
      if (res.ok) {
        const d = await res.json();
        setUserInboxes(d.inboxes || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleSelectSavedInbox(inbox: SavedInbox) {
    setActiveAddress(inbox.address);
    localStorage.setItem("ocmail_active_inbox", inbox.address);
    setHistoryModalOpen(false);
    setMessages([]);
    setSelectedMessage(null);
  }

  async function confirmDeleteInbox() {
    if (!deleteTarget) return;
    setDeleting(true);
    const addr = deleteTarget;
    try {
      const res = await fetch(`/api/v1/inboxes/${encodeURIComponent(addr)}`, { method: "DELETE" });
      if (res.ok) {
        setUserInboxes((prev) => prev.filter((i) => i.address !== addr));
        if (activeAddress.toLowerCase() === addr.toLowerCase()) {
          localStorage.removeItem("ocmail_active_inbox");
          handleCreateInbox(false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function requestDeleteInbox(addr: string, e?: React.MouseEvent) {
    if (e) e.stopPropagation();
    setDeleteTarget(addr);
  }

  async function handleDeleteCurrentInbox() {
    if (activeAddress) {
      requestDeleteInbox(activeAddress);
    }
  }
  useEffect(() => {
    async function loadDomains() {
      try {
        const res = await fetch("/api/domains");
        if (res.ok) {
          const data = await res.json();
          if (data.domains && data.domains.length > 0) {
            setDomains(data.domains);
            setSelectedDomain(data.domains[0]);
          }
        }
      } catch {
        // fallback to defaults
      }
    }
    loadDomains();

    // Check localStorage for saved active inbox
    const saved = localStorage.getItem("ocmail_active_inbox");
    if (saved) {
      setActiveAddress(saved);
    } else {
      handleCreateInbox(false);
    }
  }, []);

  // Poll messages when activeAddress changes
  useEffect(() => {
    if (!activeAddress) return;

    fetchMessages(activeAddress);

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      fetchMessages(activeAddress, true);
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [activeAddress]);

  async function handleCreateInbox(useCustom = isCustomMode) {
    setGenerating(true);
    try {
      const res = await fetch("/api/v1/inboxes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefix: useCustom && customPrefix.trim() ? customPrefix.trim() : undefined,
          domain: selectedDomain,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setActiveAddress(data.address);
        localStorage.setItem("ocmail_active_inbox", data.address);
        setMessages([]);
        setSelectedMessage(null);
        setErrorMessage(null);
        if (useCustom) {
          setCustomPrefix("");
        }
        if (session?.user) {
          loadUserInboxes();
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMessage(errData.error || "Gagal membuat inbox. Silakan coba lagi.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGenerating(false);
    }
  }

  async function fetchMessages(addr: string, isSilent = false) {
    if (!isSilent) setLoadingMessages(true);
    try {
      const res = await fetch(`/api/v1/inboxes/${encodeURIComponent(addr)}/messages?_t=${Date.now()}`);
      if (res.ok) {
        const list: Message[] = await res.json();
        setMessages(list);
        setLastChecked(new Date().toLocaleTimeString());

        // Update selected message if open
        if (selectedMessage) {
          const found = list.find((m) => m.id === selectedMessage.id);
          if (found) setSelectedMessage(found);
        } else if (list.length > 0) {
          setSelectedMessage(list[0]);
        }
      } else if (res.status === 403) {
        setMessages([]);
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  }

  function copyAddress() {
    if (!activeAddress) return;
    navigator.clipboard.writeText(activeAddress);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  }

  function copyOtp(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedOtp(true);
    setTimeout(() => setCopiedOtp(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Interactive Custom Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start justify-between gap-3 animate-in fade-in">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <div className="text-xs font-semibold text-red-300">Peringatan Alamat Email</div>
              <div className="text-xs text-red-200/90 leading-relaxed">{errorMessage}</div>
              <div className="pt-1">
                <a href="/rules" className="text-[11px] font-medium text-red-400 hover:text-red-300 underline">
                  Pelajari aturan kepemilikan inbox &rarr;
                </a>
              </div>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="p-1 rounded-md text-red-400 hover:text-red-300 hover:bg-red-900/40 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Top Banner / Generator Card */}
      <div className="rounded-2xl bg-[#0f172a] p-5 sm:p-6 border border-slate-800/90 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                Live Inbox
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                auto-refresh 3s
              </span>

              {session?.user && (
                <button
                  type="button"
                  onClick={() => setHistoryModalOpen(true)}
                  className="ml-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 transition"
                  title="Lihat riwayat email yang pernah dibuat"
                >
                  <History className="h-3 w-3 text-blue-400" />
                  Riwayat ({userInboxes.length})
                </button>
              )}
            </div>

            {/* Monospace Address Display */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                onClick={copyAddress}
                className="cursor-pointer group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#090d16] border border-slate-800 hover:border-blue-500/60 transition shadow-inner"
              >
                <img src="/brand/ocmail-icon-color.svg" alt="" className="h-4 w-4" />
                <span className="font-mono text-base font-semibold text-white select-all">
                  {activeAddress || "Membuat inbox..."}
                </span>
                <button
                  type="button"
                  className="p-1 rounded text-slate-400 hover:text-white transition"
                  title="Salin email"
                >
                  {copiedAddr ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchMessages(activeAddress)}
                  disabled={loadingMessages}
                  className="p-2.5 rounded-xl bg-[#090d16] border border-slate-800 text-slate-400 hover:text-white transition"
                  title="Refresh inbox"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingMessages ? "animate-spin text-blue-400" : ""}`} />
                </button>

                <button
                  onClick={handleDeleteCurrentInbox}
                  className="p-2.5 rounded-xl bg-[#090d16] border border-slate-800 text-slate-400 hover:text-red-400 transition"
                  title="Hapus inbox"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Generator Controls */}
          <div className="bg-[#090d16] p-4 rounded-xl border border-slate-800/80 lg:w-[440px] space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-slate-400">
              <span className="text-[11px] text-slate-400">Mode Alamat:</span>
              <div className="flex rounded-lg bg-slate-900 p-0.5 border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className={`px-3 py-1 rounded-md transition text-xs ${!isCustomMode ? "bg-blue-600 text-white font-medium" : "text-slate-400 hover:text-white"
                    }`}
                >
                  Random
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className={`px-3 py-1 rounded-md transition text-xs ${isCustomMode ? "bg-blue-600 text-white font-medium" : "text-slate-400 hover:text-white"
                    }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {isCustomMode ? (
                <div className="flex-1 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs">
                  <input
                    type="text"
                    placeholder="nama-kamu"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                    className="w-full bg-transparent text-white font-mono placeholder-slate-500 focus:outline-none"
                  />
                </div>
              ) : null}

              {/* Custom Domain Selector Dropdown */}
              <div className="relative" ref={domainDropdownRef}>
                <button
                  type="button"
                  onClick={() => setDomainDropdownOpen(!domainDropdownOpen)}
                  className="w-full sm:w-auto px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono flex items-center justify-between gap-2 hover:bg-slate-800 transition"
                >
                  <span>@{selectedDomain}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>

                {domainDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-slate-900 border border-slate-800 shadow-xl py-1 z-40 text-xs font-mono">
                    <div className="px-3 py-1 text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-800/80 font-sans">
                      Pilih Domain
                    </div>
                    {domains.map((dom) => (
                      <button
                        key={dom}
                        type="button"
                        onClick={() => {
                          setSelectedDomain(dom);
                          setDomainDropdownOpen(false);
                        }}
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between transition ${selectedDomain === dom
                          ? "bg-blue-600/15 text-blue-400 font-semibold"
                          : "text-slate-300 hover:bg-slate-800/60"
                          }`}
                      >
                        <span>@{dom}</span>
                        {selectedDomain === dom && <Check className="h-3 w-3 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleCreateInbox(isCustomMode)}
                disabled={generating || (isCustomMode && !customPrefix.trim())}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generating ? "..." : isCustomMode ? "Buat" : "Baru"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Mailbox Workspace: Master-Detail Widescreen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[560px]">
        {/* Left Column: Inbox Message List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-2xl bg-[#0f172a] border border-slate-800/90 shadow-lg overflow-hidden">
          <div className="px-4 py-3.5 border-b border-slate-800 bg-[#090d16]/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/brand/ocmail-icon-color.svg" alt="" className="h-4 w-4" />
              <h2 className="text-xs font-semibold text-slate-200 uppercase tracking-wider font-sans">Kotak Masuk</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-blue-300 font-mono font-medium">
                {messages.length}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">
              {mounted && lastChecked ? `Cek: ${lastChecked}` : ""}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 max-h-[620px]">
            {messages.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
                <div className="p-3.5 rounded-2xl bg-[#090d16] border border-slate-800 text-slate-500">
                  <img src="/brand/ocmail-icon-color.svg" alt="" className="h-7 w-7 opacity-30 mx-auto" />
                </div>
                <div className="font-medium text-slate-300 text-xs">Menunggu email masuk...</div>
                <p className="text-[11px] text-slate-500 max-w-xs leading-relaxed">
                  Email yang dikirim ke alamat aktif akan langsung muncul di sini dalam 3 detik.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-4 cursor-pointer transition flex flex-col gap-1.5 ${isSelected
                      ? "bg-blue-600/10 border-l-4 border-blue-500"
                      : "hover:bg-slate-800/30"
                      }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-200 truncate">
                        {msg.from}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap">
                        {mounted ? new Date(msg.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-white truncate">
                      {msg.subject || "(Tanpa Subjek)"}
                    </div>

                    {/* Quick OTP badge on card if detected */}
                    {msg.otp && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                          <CheckCircle className="h-3 w-3 text-blue-400" />
                          OTP: {msg.otp}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyOtp(msg.otp!);
                          }}
                          className="text-[11px] text-blue-400 hover:text-blue-300 font-medium transition"
                        >
                          Salin
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Message Inspector (7 cols) */}
        <div className="lg:col-span-7 flex flex-col rounded-2xl bg-[#0f172a] border border-slate-800/90 shadow-lg overflow-hidden">
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              {/* Message Header Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#090d16]/70 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold text-white tracking-tight">
                      {selectedMessage.subject || "(Tanpa Subjek)"}
                    </h3>
                    <div className="text-xs text-slate-400">
                      Dari: <span className="text-slate-200">{selectedMessage.from}</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      Ke: <span className="text-slate-300 font-mono">{selectedMessage.to}</span>
                    </div>
                  </div>

                  <a
                    href={`/api/v1/inboxes/${encodeURIComponent(selectedMessage.to)}/messages/${selectedMessage.id}/raw`}
                    download={`${selectedMessage.id}.eml`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition border border-slate-700/80 shadow-sm"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh .eml
                  </a>
                </div>

                {/* Big Prominent OTP Card Banner */}
                {selectedMessage.otp && (
                  <div className="p-3.5 rounded-xl bg-gradient-to-r from-blue-950/60 to-slate-900 border border-blue-500/30 flex items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                        <CheckCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-mono font-semibold text-blue-400 tracking-wider">
                          Kode Verifikasi Terdeteksi
                        </div>
                        <div className="text-2xl font-mono font-bold text-white tracking-widest select-all">
                          {selectedMessage.otp}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyOtp(selectedMessage.otp!)}
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-sm"
                    >
                      {copiedOtp ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedOtp ? "Disalin!" : "Salin Kode"}
                    </button>
                  </div>
                )}

                {/* View Tabs */}
                <div className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
                  <button
                    onClick={() => setViewTab("preview")}
                    className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${viewTab === "preview"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                      }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => setViewTab("raw")}
                    className={`px-3 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition ${viewTab === "raw"
                      ? "bg-slate-800 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                      }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Source (Raw)
                  </button>
                </div>
              </div>

              {/* Message Body Content */}
              <div className="flex-1 p-5 overflow-y-auto max-h-[500px]">
                {viewTab === "preview" ? (
                  selectedMessage.html ? (
                    <div className="rounded-xl overflow-hidden bg-white border border-slate-800 shadow-sm">
                      <iframe
                        srcDoc={selectedMessage.html}
                        title="Email Preview"
                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                        className="w-full min-h-[460px] border-0"
                      />
                    </div>
                  ) : (
                    <div className="text-slate-200 text-xs whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedMessage.text || selectedMessage.body}
                    </div>
                  )
                ) : (
                  <pre className="p-4 rounded-xl bg-[#090d16] border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre-wrap">
                    {selectedMessage.body}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center h-full text-slate-500 space-y-3">
              <img src="/brand/ocmail-icon-color.svg" alt="" className="h-10 w-10 opacity-20 mx-auto" />
              <div className="text-xs font-medium text-slate-400">Pilih pesan di samping untuk membaca</div>
            </div>
          )}
        </div>
      </div>
      {/* Modal Riwayat Email Pengguna */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-white">Riwayat Akun Email Anda</h3>
                <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                  {userInboxes.length}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHistoryModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingHistory ? (
                <div className="py-12 text-center text-xs text-zinc-500">Memuat riwayat...</div>
              ) : userInboxes.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500">
                  Belum ada riwayat email. Buat email kustom atau random untuk menyimpannya di sini.
                </div>
              ) : (
                userInboxes.map((item) => {
                  const isCurrent = activeAddress.toLowerCase() === item.address.toLowerCase();
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSavedInbox(item)}
                      className={`group p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${isCurrent
                        ? "bg-blue-950/20 border-blue-500/40 text-blue-300"
                        : "bg-zinc-950/60 border-zinc-800/80 hover:bg-zinc-800/40 hover:border-zinc-700 text-zinc-200"
                        }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-white truncate">
                            {item.address}
                          </span>
                          {item.isCustom ? (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-blue-400 font-medium">
                              Custom
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400">
                              Random
                            </span>
                          )}
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-medium">
                              Sedang Digunakan
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          Dibuat: {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectSavedInbox(item);
                            }}
                            className="px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition"
                            title="Gunakan email ini"
                          >
                            Gunakan
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => requestDeleteInbox(item.address, e)}
                          className="p-1.5 rounded-md text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
                          title="Hapus dari akun"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-zinc-950/80 border-t border-zinc-800/80 text-[11px] text-zinc-500 text-center">
              Klik &quot;Gunakan&quot; untuk mengalihkan kotak masuk ke alamat tersebut.
            </div>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deletion */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Konfirmasi Hapus Email</h3>
                <p className="text-[11px] text-zinc-400">Tindakan ini tidak dapat dibatalkan.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Apakah Anda yakin ingin menghapus inbox{" "}
              <strong className="font-mono text-white">{deleteTarget}</strong>? Seluruh pesan di dalamnya akan dibersihkan.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmDeleteInbox}
                disabled={deleting}
                className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition disabled:opacity-50"
              >
                {deleting ? "Menghapus..." : "Hapus Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
