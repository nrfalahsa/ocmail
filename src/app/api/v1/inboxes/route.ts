export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { createWorkerInbox } from "@/lib/cf-client";
import { prisma } from "@/lib/prisma";
import { getBlockedKeywords } from "@/app/api/admin/blocked-keywords/route";

export async function GET(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (authCtx.isInvalidKey) {
    return NextResponse.json({ error: "API Key tidak valid atau tidak terdaftar." }, { status: 401 });
  }
  if (!authCtx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inboxes = await prisma.inbox.findMany({
      where: { userId: authCtx.userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ inboxes });
  } catch (err) {
    return NextResponse.json({ error: "Database error", details: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (authCtx.isInvalidKey) {
    return NextResponse.json({ error: "API Key tidak valid atau tidak terdaftar." }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const { prefix, domain } = body;

  const allowedDomains = (process.env.ALLOWED_DOMAINS || "oneclash.biz.id,oneclash.my.id")
    .split(",")
    .map((d) => d.trim().toLowerCase());

  const chosenDomain = domain && allowedDomains.includes(domain.toLowerCase())
    ? domain.toLowerCase()
    : allowedDomains[0];

  // Validate custom prefix if provided
  let cleanPrefix: string | undefined = undefined;
  let isCustom = false;
  if (prefix) {
    const sanitized = String(prefix).trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (sanitized.length < 2 || sanitized.length > 32) {
      return NextResponse.json({ error: "Prefix must be 2-32 alphanumeric characters" }, { status: 400 });
    }

    // Check reserved / blocked words from admin setting
    const blocked = await getBlockedKeywords();
    if (blocked.includes(sanitized) && authCtx.role !== "ADMIN") {
      return NextResponse.json(
        { error: `Prefix '${sanitized}' dilindungi oleh sistem. Silakan gunakan nama lain.` },
        { status: 400 }
      );
    }

    cleanPrefix = sanitized;
    isCustom = true;
  }

  try {
    // 1. Check if custom address is already owned by another user
    if (cleanPrefix) {
      const existingInbox = await prisma.inbox.findUnique({
        where: { address: `${cleanPrefix}@${chosenDomain}`.toLowerCase() },
      }).catch(() => null);

      if (existingInbox && existingInbox.userId) {
        if (!authCtx.userId || (existingInbox.userId !== authCtx.userId && authCtx.role !== "ADMIN")) {
          return NextResponse.json(
            { error: "Alamat email ini sudah digunakan oleh pengguna lain. Silakan pilih prefix lain." },
            { status: 409 }
          );
        }
      }
    }

    const workerResult = await createWorkerInbox(cleanPrefix, chosenDomain);

    // Save to DB (baik user login maupun anonim agar terhitung di statistik admin)
    const record = await prisma.inbox.upsert({
      where: { address: workerResult.address },
      update: authCtx.userId ? { userId: authCtx.userId } : {},
      create: {
        address: workerResult.address,
        prefix: workerResult.prefix,
        domain: workerResult.domain,
        isCustom,
        userId: authCtx.userId || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      },
    }).catch(() => null);

    return NextResponse.json(
      {
        address: workerResult.address,
        prefix: workerResult.prefix,
        domain: workerResult.domain,
        isCustom,
        id: record?.id || null,
      },
      { status: 201 }
    );
  } catch (err) {
    return NextResponse.json({ error: "Failed to create inbox", details: String(err) }, { status: 500 });
  }
}
