"use client";

import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { Mail, Key, ShieldCheck, LogIn, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import NextLink from "next/link";

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isAdmin = session?.user?.role === "ADMIN";

  // Redirect to home if user was in admin and logged out
  useEffect(() => {
    if (status === "unauthenticated" && pathname.startsWith("/admin")) {
      window.location.href = "/";
    }
  }, [status, pathname]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <NextLink href="/" className="flex items-center gap-2 font-semibold text-sm tracking-tight text-zinc-100 hover:text-white transition">
            <div className="h-6 w-6 rounded-md bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-300">
              <Mail className="h-3.5 w-3.5" />
            </div>
            <span>ocmail</span>
          </NextLink>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <NextLink
              href="/"
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-2 ${
                pathname === "/"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Mail className="h-4 w-4" />
              TempMail
            </NextLink>

            <NextLink
              href="/keys"
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-2 ${
                pathname === "/keys"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <Key className="h-4 w-4" />
              API Keys
            </NextLink>

            <NextLink
              href="/rules"
              className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-2 ${
                pathname === "/rules"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-900"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Aturan & Keamanan
            </NextLink>

            {isAdmin && (
              <NextLink
                href="/admin"
                className={`px-3.5 py-1.5 rounded-lg transition flex items-center gap-2 ${
                  pathname.startsWith("/admin")
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                    : "text-zinc-400 hover:text-cyan-400 hover:bg-zinc-900"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin Dashboard
              </NextLink>
            )}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {status === "loading" ? (
            <div className="h-8 w-8 rounded-full bg-zinc-800 animate-pulse" />
          ) : session?.user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-xs text-zinc-300 bg-zinc-900 hover:bg-zinc-800/80 px-3 py-1.5 rounded-lg border border-zinc-800 transition"
              >
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-5 w-5 rounded-full"
                  />
                ) : (
                  <UserIcon className="h-4 w-4 text-zinc-400" />
                )}
                <span className="font-medium max-w-[130px] truncate">
                  {session.user.name || session.user.email}
                </span>
                {session.user.role === "ADMIN" && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                    ADMIN
                  </span>
                )}
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              </button>

              {/* Custom Profile Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-800 shadow-xl py-1.5 z-50 text-xs">
                  <div className="px-3.5 py-2 border-b border-zinc-800/80">
                    <p className="font-medium text-white truncate">{session.user.name || "User"}</p>
                    <p className="text-[11px] text-zinc-400 font-mono truncate">{session.user.email}</p>
                  </div>

                  <div className="py-1">
                    <NextLink
                      href="/keys"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2 px-3.5 py-2 text-zinc-300 hover:text-white hover:bg-zinc-800/60 transition"
                    >
                      <Key className="h-3.5 w-3.5 text-zinc-400" />
                      Kelola API Keys
                    </NextLink>

                    {isAdmin && (
                      <NextLink
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2 px-3.5 py-2 text-blue-400 hover:bg-zinc-800/60 transition"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        Admin Dashboard
                      </NextLink>
                    )}
                  </div>

                  <div className="border-t border-zinc-800/80 pt-1">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        signOut({ callbackUrl: "/" });
                      }}
                      className="w-full flex items-center gap-2 px-3.5 py-2 text-red-400 hover:text-red-300 hover:bg-zinc-800/60 transition text-left"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Keluar / Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="flex items-center gap-2 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-lg transition"
            >
              <LogIn className="h-3.5 w-3.5" />
              Masuk
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
