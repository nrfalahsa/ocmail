export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (authCtx.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const userFilter = searchParams.get("userId") || "";
  const search = searchParams.get("q") || "";

  try {
    const inboxes = await prisma.inbox.findMany({
      where: {
        ...(userFilter ? { userId: userFilter === "null" ? null : userFilter } : {}),
        ...(search
          ? {
              OR: [
                { address: { contains: search, mode: "insensitive" } },
                { prefix: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ inboxes });
  } catch (err) {
    return NextResponse.json({ error: "Database error", details: String(err) }, { status: 500 });
  }
}
