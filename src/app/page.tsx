"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mail,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Sparkles,
  Download,
  Inbox as InboxIcon,
  CheckCircle,
  FileText,
  Eye,
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

export default function HomePage() {
  const [domains, setDomains] = useState<string[]>(["ocmail.me", "oneclash.xyz"]);
  const [selectedDomain, setSelectedDomain] = useState<string>("ocmail.me");
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

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
    setLastChecked(new Date().toLocaleTimeString());
  }, []);

  // Fetch allowed domains on mount
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
        if (useCustom) {
          setCustomPrefix("");
        }
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
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  }

  async function handleDeleteCurrentInbox() {
    if (!confirm(`Hapus inbox ${activeAddress}? Semua email di dalamnya akan hilang.`)) return;
    try {
      await fetch(`/api/v1/inboxes/${encodeURIComponent(activeAddress)}`, { method: "DELETE" });
      localStorage.removeItem("ocmail_active_inbox");
      setActiveAddress("");
      setMessages([]);
      setSelectedMessage(null);
      handleCreateInbox(false);
    } catch (err) {
      console.error(err);
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
      {/* Top Banner / Generator Card */}
      <div className="rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8 border border-zinc-800/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                Live Inbox Active
              </span>
              <span className="text-xs text-zinc-400">
                Auto-refresh: 3s
              </span>
            </div>

            {/* Monospace Address Display */}
            <div className="flex flex-wrap items-center gap-3">
              <div
                onClick={copyAddress}
                className="cursor-pointer group flex items-center gap-3 px-4 py-3 rounded-2xl bg-zinc-950/80 border border-zinc-700 hover:border-cyan-500/60 transition shadow-inner"
              >
                <Mail className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition" />
                <span className="font-mono text-lg sm:text-xl font-bold tracking-tight text-white select-all">
                  {activeAddress || "Membuat inbox..."}
                </span>
                <button
                  type="button"
                  className="p-1.5 rounded-lg bg-zinc-800 text-zinc-300 group-hover:bg-cyan-500 group-hover:text-black transition"
                  title="Salin email"
                >
                  {copiedAddr ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchMessages(activeAddress)}
                  disabled={loadingMessages}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
                  title="Refresh inbox sekarang"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingMessages ? "animate-spin text-cyan-400" : ""}`} />
                </button>

                <button
                  onClick={handleDeleteCurrentInbox}
                  className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition"
                  title="Hapus inbox ini"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Generator Controls */}
          <div className="bg-zinc-950/90 p-4 sm:p-5 rounded-2xl border border-zinc-800/90 lg:w-[440px] space-y-4">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
              <span>Metode Pembuatan:</span>
              <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className={`px-3 py-1 rounded-md text-xs transition ${
                    !isCustomMode ? "bg-cyan-600 text-white font-medium" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Acak (Random)
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className={`px-3 py-1 rounded-md text-xs transition ${
                    isCustomMode ? "bg-cyan-600 text-white font-medium" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Kustom (Prefix)
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {isCustomMode ? (
                <div className="flex-1 flex items-center rounded-xl bg-zinc-900 border border-zinc-700/80 px-3 py-2 text-sm">
                  <input
                    type="text"
                    placeholder="nama-kamu"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                    className="w-full bg-transparent text-white font-mono placeholder-zinc-500 focus:outline-none"
                  />
                  <span className="text-zinc-500 text-xs font-mono">@</span>
                </div>
              ) : null}

              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700/80 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              >
                {domains.map((dom) => (
                  <option key={dom} value={dom}>
                    @{dom}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => handleCreateInbox(isCustomMode)}
                disabled={generating || (isCustomMode && !customPrefix.trim())}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-lg shadow-cyan-600/20 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {generating ? "Proses..." : isCustomMode ? "Buat Kustom" : "Acak Baru"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Mailbox Workspace: Master-Detail Widescreen Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Left Column: Inbox Message List (5 cols) */}
        <div className="lg:col-span-5 flex flex-col rounded-3xl bg-zinc-900/40 border border-zinc-800/80 overflow-hidden">
          <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between bg-zinc-950/40">
            <div className="flex items-center gap-2">
              <InboxIcon className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-white">Kotak Masuk</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-mono">
                {messages.length}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500">
              {mounted && lastChecked ? `Cek: ${lastChecked}` : ""}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 max-h-[620px]">
            {messages.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center h-full text-zinc-500 space-y-3">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/60 text-zinc-600 animate-pulse">
                  <Mail className="h-8 w-8" />
                </div>
                <div className="font-medium text-zinc-300 text-sm">Menunggu email masuk...</div>
                <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                  Kirim email ke alamat di atas atau gunakan untuk registrasi (misal: xAI/Grok, GitHub, dll). Email akan otomatis muncul dalam 3 detik.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-4 cursor-pointer transition flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-zinc-800/70 border-l-4 border-cyan-400"
                        : "hover:bg-zinc-800/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-zinc-200 truncate">
                        {msg.from}
                      </span>
                      <span className="text-[11px] text-zinc-500 whitespace-nowrap">
                        {mounted ? new Date(msg.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>

                    <div className="text-sm font-medium text-white truncate">
                      {msg.subject || "(Tanpa Subjek)"}
                    </div>

                    {/* Quick OTP badge on card if detected */}
                    {msg.otp && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                          <CheckCircle className="h-3 w-3" />
                          OTP: {msg.otp}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyOtp(msg.otp!);
                          }}
                          className="text-[11px] text-cyan-400 hover:text-cyan-300 underline"
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
        <div className="lg:col-span-7 flex flex-col rounded-3xl bg-zinc-900/40 border border-zinc-800/80 overflow-hidden">
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              {/* Message Header Bar */}
              <div className="p-6 border-b border-zinc-800/80 bg-zinc-950/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white tracking-tight">
                      {selectedMessage.subject || "(Tanpa Subjek)"}
                    </h3>
                    <div className="text-xs text-zinc-400">
                      Dari: <span className="text-zinc-200 font-medium">{selectedMessage.from}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Ke: <span className="text-zinc-300 font-mono">{selectedMessage.to}</span>
                    </div>
                  </div>

                  <a
                    href={`/api/v1/inboxes/${encodeURIComponent(selectedMessage.to)}/messages/${selectedMessage.id}/raw`}
                    download={`${selectedMessage.id}.eml`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition border border-zinc-700/60"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh .EML
                  </a>
                </div>

                {/* Big Prominent OTP Card Banner */}
                {selectedMessage.otp && (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-zinc-900 border border-emerald-500/50 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg shadow-emerald-950/30">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <CheckCircle className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                          Kode OTP Terdeteksi
                        </div>
                        <div className="text-2xl font-mono font-black text-white tracking-widest select-all">
                          {selectedMessage.otp}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyOtp(selectedMessage.otp!)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-500/20"
                    >
                      {copiedOtp ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedOtp ? "OTP Disalin!" : "Salin Kode OTP"}
                    </button>
                  </div>
                )}

                {/* View Tabs */}
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                  <button
                    onClick={() => setViewTab("preview")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      viewTab === "preview"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </button>
                  <button
                    onClick={() => setViewTab("raw")}
                    className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                      viewTab === "raw"
                        ? "bg-zinc-800 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Source (Raw)
                  </button>
                </div>
              </div>

              {/* Message Body Content */}
              <div className="flex-1 p-6 overflow-y-auto max-h-[500px]">
                {viewTab === "preview" ? (
                  selectedMessage.html ? (
                    <div className="rounded-xl overflow-hidden bg-white border border-zinc-800">
                      <iframe
                        srcDoc={selectedMessage.html}
                        title="Email Preview"
                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                        className="w-full min-h-[460px] border-0"
                      />
                    </div>
                  ) : (
                    <div className="prose prose-invert max-w-none text-zinc-300 text-sm whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedMessage.text || selectedMessage.body}
                    </div>
                  )
                ) : (
                  <pre className="p-4 rounded-xl bg-black/80 border border-zinc-800 text-xs font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                    {selectedMessage.body}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
              <Mail className="h-10 w-10 text-zinc-700" />
              <div className="text-sm font-medium text-zinc-400">Pilih email untuk membaca</div>
              <p className="text-xs text-zinc-600">
                Pilih salah satu pesan di sebelah kiri untuk melihat isi dan kode verifikasi.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
