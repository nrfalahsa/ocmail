import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { createWorkerInbox } from "@/lib/cf-client";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const inboxes = await prisma.inbox.findMany({
      where: authCtx.role === "ADMIN" ? {} : { userId: authCtx.userId },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ inboxes });
  } catch (err) {
    return NextResponse.json({ error: "Database error", details: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  const body = await req.json().catch(() => ({}));
  const { prefix, domain } = body;

  const allowedDomains = (process.env.ALLOWED_DOMAINS || "ocmail.me,oneclash.xyz")
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
    cleanPrefix = sanitized;
    isCustom = true;
  }

  try {
    const workerResult = await createWorkerInbox(cleanPrefix, chosenDomain);

    // Save to DB if user is logged in
    let record = null;
    if (authCtx.userId) {
      record = await prisma.inbox.upsert({
        where: { address: workerResult.address },
        update: { userId: authCtx.userId },
        create: {
          address: workerResult.address,
          prefix: workerResult.prefix,
          domain: workerResult.domain,
          isCustom,
          userId: authCtx.userId,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
        },
      }).catch(() => null);
    }

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
