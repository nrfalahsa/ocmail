"use client";

import { useSession } from "next-auth/react";
import { Shield, ShieldAlert, Lock, Unlock, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function RulesPage() {
  const { data: session } = useSession();
  return (
    <div className="max-w-4xl mx-auto py-6 space-y-10">
      {/* Title */}
      <div className="space-y-2 border-b border-zinc-800 pb-6">
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-400">
          <Shield className="h-3.5 w-3.5 text-zinc-300" />
          Aturan & Keamanan Platform
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Panduan Penggunaan & Privasi Inbox
        </h1>
        <p className="text-sm text-zinc-400">
          Pelajari bagaimana sistem pembagian kepemilikan inbox dan isolasi keamanan OTP bekerja di ocmail.
        </p>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Public / Unauthenticated */}
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-md space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
              <Unlock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Mode Anonim / Tanpa Login</h2>
              <span className="text-[11px] text-slate-500 font-mono">Bebas & Cepat</span>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>Bisa langsung menggunakan email acak (Random) tanpa batasan.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>Bisa membuat alamat kustom selama nama tersebut belum diklaim user login.</span>
            </li>
            <li className="flex items-start gap-2 text-amber-300/90">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Perhatian:</strong> Alamat kustom tanpa login berstatus publik. Siapa saja yang mengetahui nama prefix yang sama dapat membaca pesan masuk.
              </span>
            </li>
          </ul>
        </div>

        {/* Authenticated / User Lock */}
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-blue-500/30 shadow-md space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Mode Pengguna Terdaftar (Login)</h2>
              <span className="text-[11px] text-blue-400 font-mono">Terkunci & Aman</span>
            </div>
          </div>

          <ul className="space-y-2.5 text-xs text-slate-300">
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Isolasi Kepemilikan:</strong> Saat Anda login dan membuat email kustom, alamat tersebut dikunci hanya untuk akun Anda.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>Pengguna lain atau pihak luar tidak bisa membuat alamat yang sama (ditolak sistem).</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>Kode OTP dan isi pesan Anda terlindungi dari intipan user lain.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
              <span>Dapat membuat API Key untuk otomatisasi skrip bot / Python.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* FAQ & Rules */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-white font-sans">Hal-Hal Penting</h2>

        <div className="divide-y divide-slate-800/80 rounded-2xl border border-slate-800 bg-[#0f172a] p-2 shadow-md">
          <div className="p-4 space-y-1">
            <h3 className="text-sm font-medium text-slate-200">Berapa lama email disimpan?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Email disimpan di Cloudflare KV selama 24 jam secara otomatis sebelum dibersihkan oleh sistem. Anda dapat mengunduh email dalam format <code>.eml</code> kapan saja sebelum batas waktu berakhir.
            </p>
          </div>

          <div className="p-4 space-y-1">
            <h3 className="text-sm font-medium text-slate-200">Apa yang terjadi jika saya membuat email kustom yang sudah dipakai orang lain?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sistem akan menampilkan notifikasi peringatan bahwa nama tersebut telah dimiliki oleh akun lain. Silakan pilih kombinasi prefix lain yang unik untuk akun Anda.
            </p>
          </div>

          <div className="p-4 space-y-1">
            <h3 className="text-sm font-medium text-slate-200">Bagaimana jika saya ingin mengamankan alamat penting?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cukup masuk/login menggunakan Google atau GitHub di pojok kanan atas, lalu buat alamat kustom yang Anda inginkan.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Box - Only visible when user is NOT logged in */}
      {!session?.user && (
        <div className="p-6 rounded-2xl bg-[#0f172a] border border-blue-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
          <div>
            <h3 className="text-sm font-semibold text-white">Mulai Lindungi Inbox Kustom Anda</h3>
            <p className="text-xs text-slate-400">Masuk dengan akun OAuth untuk mengklaim prefix kustom eksklusif.</p>
          </div>
          <Link
            href="/auth/signin"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5 transition whitespace-nowrap shadow-sm"
          >
            Masuk Sekarang
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
