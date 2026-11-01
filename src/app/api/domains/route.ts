import { NextResponse } from "next/server";

export async function GET() {
  const domains = (process.env.ALLOWED_DOMAINS || "oneclash.biz.id,oneclash.my.id")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  return NextResponse.json({ domains });
}
