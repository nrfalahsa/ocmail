import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { getWorkerMessages } from "@/lib/cf-client";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  const { address } = await context.params;
  const cleanAddr = decodeURIComponent(address).toLowerCase().trim();
  const authCtx = await authenticateRequest(req);

  if (authCtx.isInvalidKey) {
    return NextResponse.json({ error: "API Key tidak valid atau tidak terdaftar." }, { status: 401 });
  }

  try {
    // Check ownership if inbox is registered to a user
    const dbInbox = await prisma.inbox.findUnique({
      where: { address: cleanAddr },
    }).catch(() => null);

    if (dbInbox && dbInbox.userId) {
      if (!authCtx.userId || (dbInbox.userId !== authCtx.userId && authCtx.role !== "ADMIN")) {
        return NextResponse.json(
          { error: "Forbidden: Anda tidak memiliki akses ke inbox ini." },
          { status: 403 }
        );
      }
    }

    const messages = await getWorkerMessages(cleanAddr);

    // Track every received message (deduplicated by unique messageId)
    const dbClient = prisma as unknown as {
      messageLog?: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    };

    for (const msg of messages) {
      if (msg.id && dbClient.messageLog) {
        dbClient.messageLog
          .upsert({
            where: { messageId: msg.id },
            update: {},
            create: {
              messageId: msg.id,
              inboxAddr: cleanAddr,
              hasOtp: Boolean(msg.otp),
            },
          })
          .catch(() => {});
      }
    }

    return NextResponse.json(messages, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch messages", details: String(err) }, { status: 500 });
  }
}
