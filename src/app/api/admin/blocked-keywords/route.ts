export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

export const DEFAULT_BLOCKED_WORDS = [
  "admin",
  "administrator",
  "root",
  "support",
  "help",
  "billing",
  "finance",
  "postmaster",
  "hostmaster",
  "webmaster",
  "abuse",
  "security",
  "mailer-daemon",
  "noreply",
  "no-reply",
  "system",
  "official",
  "contact",
];

export async function getBlockedKeywords(): Promise<string[]> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "blocked_keywords" },
    });
    if (setting?.value) {
      return setting.value
        .split(",")
        .map((w: string) => w.trim().toLowerCase())
        .filter(Boolean);
    }
  } catch (err) {
    console.warn("Failed to get blocked keywords from DB, using fallback:", err);
  }
  return DEFAULT_BLOCKED_WORDS;
}

export async function GET(req: NextRequest) {
  try {
    const authCtx = await authenticateRequest(req);
    if (authCtx.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const keywords = await getBlockedKeywords();
    return NextResponse.json({ keywords, raw: keywords.join(", ") });
  } catch (err) {
    console.error("GET blocked-keywords error:", err);
    return NextResponse.json({
      keywords: DEFAULT_BLOCKED_WORDS,
      raw: DEFAULT_BLOCKED_WORDS.join(", "),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authCtx = await authenticateRequest(req);
    if (authCtx.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const rawInput = String(body.keywords || "");

    const cleanList = Array.from(
      new Set(
        rawInput
          .split(/[\n,]+/)
          .map((w) => w.trim().toLowerCase().replace(/[^a-z0-9._-]/g, ""))
          .filter((w) => w.length >= 2)
      )
    );

    const updated = await prisma.systemSetting.upsert({
      where: { key: "blocked_keywords" },
      update: { value: cleanList.join(",") },
      create: { key: "blocked_keywords", value: cleanList.join(",") },
    });

    return NextResponse.json({
      success: true,
      keywords: cleanList,
      raw: updated.value,
    });
  } catch (err) {
    console.error("POST blocked-keywords error:", err);
    return NextResponse.json(
      { error: "Tabel SystemSetting belum ada di database. Silakan jalankan 'pnpm exec prisma db push'.", details: String(err) },
      { status: 500 }
    );
  }
}
