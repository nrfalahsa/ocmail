export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const deleted = await prisma.inbox.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        userId: null, // Anonymous only
      },
    });

    return NextResponse.json({ deleted: deleted.count });
  } catch (err) {
    console.error("[Cron Error - Cleanup]", err);
    const isDev = process.env.NODE_ENV === "development";
    return NextResponse.json(
      { 
        error: "Cleanup failed",
        ...(isDev && { details: String(err) })
      },
      { status: 500 }
    );
  }
}
