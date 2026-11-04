export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.inbox.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
        userId: null, // only cleanup anonymous inboxes
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Cleanup failed", details: String(err) },
      { status: 500 }
    );
  }
}
