import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";
import { deleteWorkerInbox } from "@/lib/cf-client";
import { prisma } from "@/lib/prisma";

export async function DELETE(
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
    // If authenticated, check ownership or admin
    if (authCtx.userId && authCtx.role !== "ADMIN") {
      const existing = await prisma.inbox.findUnique({
        where: { address: cleanAddr },
      }).catch(() => null);

      if (existing && existing.userId && existing.userId !== authCtx.userId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    await deleteWorkerInbox(cleanAddr);
    await prisma.inbox.deleteMany({ where: { address: cleanAddr } }).catch(() => {});

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return NextResponse.json({ error: "Failed to delete inbox", details: String(err) }, { status: 500 });
  }
}
