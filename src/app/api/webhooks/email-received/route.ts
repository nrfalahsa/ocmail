export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Optional secret check if configured
    const workerSecret = process.env.WORKER_WEBHOOK_SECRET;
    if (workerSecret) {
      const auth = req.headers.get("x-worker-secret") || req.headers.get("authorization");
      if (auth !== workerSecret && auth !== `Bearer ${workerSecret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json().catch(() => ({}));
    const { id, to, hasOtp } = body;

    if (!id || !to) {
      return NextResponse.json({ error: "id and to are required" }, { status: 400 });
    }

    const cleanAddr = String(to).toLowerCase().trim().replace(/^<|>$/g, "");
    const cleanId = String(id).trim();

    // 1. Ensure inbox exists in DB so it counts in Total Inboxes
    await prisma.inbox
      .upsert({
        where: { address: cleanAddr },
        update: {},
        create: {
          address: cleanAddr,
          prefix: cleanAddr.split("@")[0] || "ocm",
          domain: cleanAddr.split("@")[1] || "domain",
          isCustom: false,
          userId: null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      })
      .catch(() => {});

    // 2. Log message to MessageLog so Total Messages increments immediately
    const dbClient = prisma as unknown as {
      messageLog?: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    };

    if (dbClient.messageLog) {
      await dbClient.messageLog
        .upsert({
          where: { messageId: cleanId },
          update: {},
          create: {
            messageId: cleanId,
            inboxAddr: cleanAddr,
            hasOtp: Boolean(hasOtp),
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("Email webhook error:", err);
    return NextResponse.json({ error: "Internal error", details: String(err) }, { status: 500 });
  }
}
