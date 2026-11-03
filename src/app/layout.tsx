import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
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
  title: "ocmail — Disposable Email Platform",
  description:
    "Platform disposable email / tempmail dirancang untuk kebutuhan automasi skrip/bot dengan OTP extractor & API key automation.",
  icons: {
    icon: [
      { url: "/brand/ocmail-icon-color.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/brand/ocmail-icon-color.svg",
    apple: "/brand/ocmail-icon-color-2048.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#090d16] text-slate-100 min-h-screen flex flex-col selection:bg-blue-600/30 selection:text-blue-200`}
      >
        <Providers>
          <Navbar />
          <main className="flex-1 w-full max-w-[1500px] mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Image src="/brand/ocmail-icon-color.svg" alt="ocmail" width={16} height={16} className="h-4 w-4 opacity-70" />
              <span className="font-medium text-slate-400">ocmail</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Disposable Email Platform for Communities & Automation &copy; {new Date().getFullYear()}
            </p>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
