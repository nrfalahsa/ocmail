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
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(errData.error || "Gagal membuat inbox");
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
      <div className="rounded-xl bg-zinc-900/50 p-5 sm:p-6 border border-zinc-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Active
              </span>
              <span className="text-[11px] text-zinc-500 font-mono">
                auto-refresh 3s
              </span>
            </div>

            {/* Monospace Address Display */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                onClick={copyAddress}
                className="cursor-pointer group flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition"
              >
                <Mail className="h-4 w-4 text-zinc-400 group-hover:text-zinc-200 transition" />
                <span className="font-mono text-base font-semibold text-zinc-100 select-all">
                  {activeAddress || "Membuat inbox..."}
                </span>
                <button
                  type="button"
                  className="p-1 rounded text-zinc-400 hover:text-white transition"
                  title="Salin email"
                >
                  {copiedAddr ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => fetchMessages(activeAddress)}
                  disabled={loadingMessages}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                  title="Refresh inbox"
                >
                  <RefreshCw className={`h-4 w-4 ${loadingMessages ? "animate-spin text-zinc-200" : ""}`} />
                </button>

                <button
                  onClick={handleDeleteCurrentInbox}
                  className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-red-400 transition"
                  title="Hapus inbox"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Generator Controls */}
          <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800/80 lg:w-[420px] space-y-3">
            <div className="flex items-center justify-between text-xs font-medium text-zinc-400">
              <span className="text-zinc-400 text-[11px]">Mode Alamat:</span>
              <div className="flex rounded-md bg-zinc-900 p-0.5 border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className={`px-2.5 py-1 rounded transition text-xs ${
                    !isCustomMode ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Random
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomMode(true)}
                  className={`px-2.5 py-1 rounded transition text-xs ${
                    isCustomMode ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Custom
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              {isCustomMode ? (
                <div className="flex-1 flex items-center rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-xs">
                  <input
                    type="text"
                    placeholder="nama-kamu"
                    value={customPrefix}
                    onChange={(e) => setCustomPrefix(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                    className="w-full bg-transparent text-white font-mono placeholder-zinc-500 focus:outline-none"
                  />
                  <span className="text-zinc-500 font-mono">@</span>
                </div>
              ) : null}

              <select
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs font-mono focus:outline-none focus:border-zinc-700"
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
                className="px-3.5 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-zinc-900 text-xs font-medium flex items-center justify-center gap-1.5 transition disabled:opacity-50"
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
        <div className="lg:col-span-5 flex flex-col rounded-xl bg-zinc-900/30 border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
            <div className="flex items-center gap-2">
              <InboxIcon className="h-4 w-4 text-zinc-400" />
              <h2 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider">Kotak Masuk</h2>
              <span className="text-[11px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                {messages.length}
              </span>
            </div>
            <span className="text-[11px] text-zinc-500 font-mono">
              {mounted && lastChecked ? `Cek: ${lastChecked}` : ""}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/60 max-h-[620px]">
            {messages.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center h-full text-zinc-500 space-y-2.5">
                <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-500">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="font-medium text-zinc-300 text-xs">Menunggu email masuk...</div>
                <p className="text-[11px] text-zinc-500 max-w-xs leading-relaxed">
                  Email yang dikirim ke alamat aktif akan langsung muncul di sini.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-3.5 cursor-pointer transition flex flex-col gap-1 ${
                      isSelected
                        ? "bg-zinc-800/80 border-l-2 border-zinc-200"
                        : "hover:bg-zinc-800/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {msg.from}
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono whitespace-nowrap">
                        {mounted ? new Date(msg.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-zinc-100 truncate">
                      {msg.subject || "(Tanpa Subjek)"}
                    </div>

                    {/* Quick OTP badge on card if detected */}
                    {msg.otp && (
                      <div className="mt-1 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle className="h-3 w-3" />
                          OTP: {msg.otp}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyOtp(msg.otp!);
                          }}
                          className="text-[11px] text-zinc-400 hover:text-white transition"
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
        <div className="lg:col-span-7 flex flex-col rounded-xl bg-zinc-900/30 border border-zinc-800 overflow-hidden">
          {selectedMessage ? (
            <div className="flex flex-col h-full">
              {/* Message Header Bar */}
              <div className="p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <h3 className="text-base font-semibold text-zinc-100 tracking-tight">
                      {selectedMessage.subject || "(Tanpa Subjek)"}
                    </h3>
                    <div className="text-xs text-zinc-400">
                      Dari: <span className="text-zinc-200">{selectedMessage.from}</span>
                    </div>
                    <div className="text-xs text-zinc-400">
                      Ke: <span className="text-zinc-300 font-mono">{selectedMessage.to}</span>
                    </div>
                  </div>

                  <a
                    href={`/api/v1/inboxes/${encodeURIComponent(selectedMessage.to)}/messages/${selectedMessage.id}/raw`}
                    download={`${selectedMessage.id}.eml`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-300 transition border border-zinc-700/80"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Unduh .eml
                  </a>
                </div>

                {/* Big Prominent OTP Card Banner */}
                {selectedMessage.otp && (
                  <div className="p-3 rounded-lg bg-zinc-900 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                        <CheckCircle className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-mono font-medium text-emerald-400">
                          Kode Verifikasi
                        </div>
                        <div className="text-xl font-mono font-semibold text-white tracking-wider select-all">
                          {selectedMessage.otp}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => copyOtp(selectedMessage.otp!)}
                      className="px-3.5 py-1.5 rounded-md bg-zinc-100 hover:bg-white text-zinc-900 font-medium text-xs flex items-center gap-1.5 transition"
                    >
                      {copiedOtp ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedOtp ? "Disalin" : "Salin Kode"}
                    </button>
                  </div>
                )}

                {/* View Tabs */}
                <div className="flex items-center gap-1 pt-1 border-t border-zinc-800/80">
                  <button
                    onClick={() => setViewTab("preview")}
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition ${
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
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition ${
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
              <div className="flex-1 p-5 overflow-y-auto max-h-[500px]">
                {viewTab === "preview" ? (
                  selectedMessage.html ? (
                    <div className="rounded-lg overflow-hidden bg-white border border-zinc-800">
                      <iframe
                        srcDoc={selectedMessage.html}
                        title="Email Preview"
                        sandbox="allow-popups allow-popups-to-escape-sandbox"
                        className="w-full min-h-[460px] border-0"
                      />
                    </div>
                  ) : (
                    <div className="text-zinc-300 text-xs whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedMessage.text || selectedMessage.body}
                    </div>
                  )
                ) : (
                  <pre className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs font-mono text-zinc-400 overflow-x-auto whitespace-pre-wrap">
                    {selectedMessage.body}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center flex flex-col items-center justify-center h-full text-zinc-500 space-y-2">
              <Mail className="h-8 w-8 text-zinc-700" />
              <div className="text-xs font-medium text-zinc-400">Pilih pesan di samping untuk membaca</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
