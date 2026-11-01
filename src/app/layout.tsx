import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Navbar } from "@/components/navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ocmail — Disposable TempMail Platform",
  description: "Platform disposable email cepat, modern, dan scalable dengan OTP extractor & API key automation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-100 min-h-screen flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300`}
      >
        <Providers>
          <Navbar />
          <main className="flex-1 w-full max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="border-t border-zinc-900 py-6 text-center text-xs text-zinc-500">
            <p>ocmail &copy; {new Date().getFullYear()}</p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
