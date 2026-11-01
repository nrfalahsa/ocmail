import { NextResponse } from "next/server";

export async function GET() {
  const domains = (process.env.ALLOWED_DOMAINS || "ocmail.me,oneclash.xyz")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  return NextResponse.json({ domains });
}
