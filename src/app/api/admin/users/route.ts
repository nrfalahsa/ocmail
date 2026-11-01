export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (authCtx.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";

  try {
    const users = await prisma.user.findMany({
      where: q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            inboxes: true,
            apiKeys: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (err) {
    return NextResponse.json({ error: "Database error", details: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (authCtx.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { userId, role } = body;

  if (!userId || !["USER", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
    return NextResponse.json({ user: updated });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update user", details: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (authCtx.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  // Prevent self-deletion
  if (userId === authCtx.userId) {
    return NextResponse.json({ error: "Cannot delete your own admin account" }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete user", details: String(err) }, { status: 500 });
  }
}
