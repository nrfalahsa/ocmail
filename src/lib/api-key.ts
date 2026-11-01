import { createHash, randomBytes } from "crypto";

export function generateApiKey(): { key: string; keyPrefix: string; keyHash: string } {
  const secret = randomBytes(24).toString("hex");
  const key = `ocm_${secret}`;
  const keyPrefix = `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
  const keyHash = hashApiKey(key);

  return { key, keyPrefix, keyHash };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key.trim()).digest("hex");
}
