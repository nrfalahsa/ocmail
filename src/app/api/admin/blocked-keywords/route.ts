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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = prisma as any;
    const setting = await client.systemSetting.findUnique({
      where: { key: "blocked_keywords" },
    });
    if (setting?.value) {
      return (setting.value as string)
        .split(",")
        .map((w: string) => w.trim().toLowerCase())
        .filter(Boolean);
    }
  } catch {
    // fallback
  }
  return DEFAULT_BLOCKED_WORDS;
}

export async function GET(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (authCtx.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const keywords = await getBlockedKeywords();
  return NextResponse.json({ keywords, raw: keywords.join(", ") });
}

export async function POST(req: NextRequest) {
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

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = prisma as any;
    const updated = await client.systemSetting.upsert({
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
    return NextResponse.json(
      { error: "Failed to update blocked keywords", details: String(err) },
      { status: 500 }
    );
  }
}
