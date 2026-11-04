export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { generateApiKey } from "@/lib/api-key";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/ratelimit";

export async function GET(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: authCtx.userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        requestsCount: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ keys });
  } catch (err) {
    console.error("[API Error - Keys GET]", err);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { 
        error: "Database error",
        ...(isDev && { details: String(err) })
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { success } = await checkRateLimit(`key_create:${authCtx.userId}`);
  if (!success) {
    return NextResponse.json({ error: "Rate limit exceeded. Try again later." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "Default Key").trim().slice(0, 50);

  const { key, keyPrefix, keyHash } = generateApiKey();

  try {
    const created = await prisma.apiKey.create({
      data: {
        name,
        keyPrefix,
        keyHash,
        userId: authCtx.userId,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        keyPrefix: created.keyPrefix,
        rawKey: key, // plain key shown once
        createdAt: created.createdAt,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[API Error - Keys POST]", err);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { 
        error: "Failed to create API key",
        ...(isDev && { details: String(err) })
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (!authCtx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Key id required" }, { status: 400 });
  }

  try {
    await prisma.apiKey.deleteMany({
      where: { id, userId: authCtx.userId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[API Error - Keys DELETE]", err);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { 
        error: "Failed to revoke key",
        ...(isDev && { details: String(err) })
      },
      { status: 500 }
    );
  }
}
