export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  if (authCtx.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const [totalUsers, totalInboxes, totalKeys, aggregateRequests, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.inbox.count(),
      prisma.apiKey.count(),
      prisma.apiKey.aggregate({
        _sum: { requestsCount: true },
      }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      stats: {
        totalUsers,
        totalInboxes,
        totalKeys,
        totalApiRequests: aggregateRequests._sum.requestsCount || 0,
      },
      recentUsers,
    });
  } catch (err) {
    return NextResponse.json({ error: "Database error", details: String(err) }, { status: 500 });
  }
}
