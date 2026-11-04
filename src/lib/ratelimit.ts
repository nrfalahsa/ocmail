import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ponytail: requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars
// if missing, returns success (no-op mode for local dev)

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 req/min
    analytics: true,
  });
}

export async function checkRateLimit(identifier: string): Promise<{ success: boolean }> {
  if (!ratelimit) {
    return { success: true }; // no-op if Redis not configured
  }
  return await ratelimit.limit(identifier);
}
