export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/api-guard";

export async function GET(req: NextRequest) {
  const authCtx = await authenticateRequest(req);
  
  // Only admin can check env status
  if (authCtx.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const hasRedisUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasRedisToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;
  
  return NextResponse.json({
    redis_configured: hasRedisUrl && hasRedisToken,
    redis_url_set: hasRedisUrl,
    redis_token_set: hasRedisToken,
    node_env: process.env.NODE_ENV,
    vercel_env: process.env.VERCEL_ENV,
  });
}
