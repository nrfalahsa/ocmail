import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { getWorkerRawMessage } from "@/lib/cf-client";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ address: string; id: string }> }
) {
  const { address, id } = await context.params;
  const cleanAddr = decodeURIComponent(address).toLowerCase().trim();
  const authCtx = await authenticateRequest(req);

  if (authCtx.isInvalidKey) {
    return NextResponse.json({ error: "API Key tidak valid atau tidak terdaftar." }, { status: 401 });
  }

  try {
    const dbInbox = await prisma.inbox.findUnique({
      where: { address: cleanAddr },
    }).catch(() => null);

    if (dbInbox && dbInbox.userId) {
      if (!authCtx.userId || (dbInbox.userId !== authCtx.userId && authCtx.role !== "ADMIN")) {
        return new NextResponse("Forbidden", { status: 403 });
      }
    }

    const raw = await getWorkerRawMessage(cleanAddr, id);
    if (!raw) {
      return new NextResponse("Message not found", { status: 404 });
    }

    return new NextResponse(raw, {
      headers: {
        "Content-Type": "message/rfc822; charset=utf-8",
        "Content-Disposition": `attachment; filename="${id}.eml"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to download raw message", details: String(err) }, { status: 500 });
  }
}
