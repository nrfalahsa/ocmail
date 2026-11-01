import { NextRequest, NextResponse } from "next/server";
import { getWorkerRawMessage } from "@/lib/cf-client";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ address: string; id: string }> }
) {
  const { address, id } = await context.params;
  const cleanAddr = decodeURIComponent(address).toLowerCase().trim();

  try {
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
