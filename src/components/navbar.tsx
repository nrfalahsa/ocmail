"use client";

import { usePathname } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import { Mail, Key, ShieldCheck, LogIn, LogOut, User as UserIcon } from "lucide-react";
import NextLink from "next/link";

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isAdmin = session?.user?.role === "ADMIN";

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
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-zinc-300 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800">
                {session.user.image ? (
                  <img
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    className="h-6 w-6 rounded-full"
                  />
                ) : (
                  <UserIcon className="h-4 w-4 text-zinc-400" />
                )}
                <span className="font-medium max-w-[140px] truncate">
                  {session.user.name || session.user.email}
                </span>
                {session.user.role === "ADMIN" && (
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                    ADMIN
                  </span>
                )}
              </div>

              <button
                onClick={() => signOut()}
                className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-900 border border-zinc-800 transition"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn()}
              className="flex items-center gap-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-4 py-2 rounded-lg transition shadow-md shadow-cyan-600/20"
            >
              <LogIn className="h-4 w-4" />
              Masuk / Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
