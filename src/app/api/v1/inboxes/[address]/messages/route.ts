import { NextRequest, NextResponse } from "next/server";
import { getWorkerMessages } from "@/lib/cf-client";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  const { address } = await context.params;
  const cleanAddr = decodeURIComponent(address).toLowerCase().trim();

  try {
    const messages = await getWorkerMessages(cleanAddr);
    return NextResponse.json(messages, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch messages", details: String(err) }, { status: 500 });
  }
}
