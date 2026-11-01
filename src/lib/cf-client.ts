import { extractOtp } from "./otp";

export interface MailMessage {
  id: string;
  to: string;
  from: string;
  subject: string;
  date: string;
  body: string;
  received_at: number;
  otp?: string;
}

// In-memory fallback for local dev when CF_WORKER_URL is unset
const localMockStorage = new Map<string, MailMessage[]>();

export async function createWorkerInbox(prefix?: string, domain?: string): Promise<{ address: string; prefix: string; domain: string }> {
  const workerUrl = process.env.CF_WORKER_URL?.replace(/\/$/, "");
  const defaultDomain = (process.env.ALLOWED_DOMAINS || "ocmail.me,oneclash.xyz").split(",")[0].trim();
  const targetDomain = domain || defaultDomain;

  if (workerUrl) {
    try {
      const res = await fetch(`${workerUrl}/api/inboxes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, domain: targetDomain }),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        return {
          address: data.address.toLowerCase(),
          prefix: data.prefix || data.address.split("@")[0],
          domain: data.domain || targetDomain,
        };
      }
    } catch (err) {
      console.warn("Failed to contact Cloudflare Worker, falling back to local simulation:", err);
    }
  }

  // Fallback simulation
  const safePrefix = prefix
    ? prefix.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")
    : "ocm_" + Math.random().toString(36).substring(2, 10);
  const address = `${safePrefix}@${targetDomain}`.toLowerCase();

  // Populate an initial welcome email in simulation mode
  if (!localMockStorage.has(address)) {
    localMockStorage.set(address, [
      {
        id: "msg_welcome_" + Date.now(),
        to: address,
        from: "system@ocmail.me",
        subject: "Welcome to ocmail! Your verification code is 849-204",
        date: new Date().toISOString(),
        body: `Hello!

Your ocmail inbox is active.
Your verification code is: 849-204

Thank you for using ocmail.`,
        received_at: Date.now(),
      },
    ]);
  }

  return { address, prefix: safePrefix, domain: targetDomain };
}

export async function getWorkerMessages(address: string): Promise<MailMessage[]> {
  const cleanAddr = address.toLowerCase().trim();
  const workerUrl = process.env.CF_WORKER_URL?.replace(/\/$/, "");

  let rawMessages: MailMessage[] = [];

  if (workerUrl) {
    try {
      const res = await fetch(`${workerUrl}/api/inboxes/${encodeURIComponent(cleanAddr)}/messages`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });
      if (res.ok) {
        rawMessages = await res.json();
      }
    } catch (err) {
      console.warn("Worker fetch error, falling back to local simulation:", err);
    }
  }

  if (rawMessages.length === 0 && localMockStorage.has(cleanAddr)) {
    rawMessages = localMockStorage.get(cleanAddr) || [];
  }

  // Attach extracted OTP
  return rawMessages.map((msg) => ({
    ...msg,
    otp: extractOtp(msg.subject, msg.body),
  }));
}

export async function deleteWorkerInbox(address: string): Promise<boolean> {
  const cleanAddr = address.toLowerCase().trim();
  const workerUrl = process.env.CF_WORKER_URL?.replace(/\/$/, "");

  if (workerUrl) {
    try {
      await fetch(`${workerUrl}/api/inboxes/${encodeURIComponent(cleanAddr)}`, {
        method: "DELETE",
      });
    } catch {
      // ignore
    }
  }

  localMockStorage.delete(cleanAddr);
  return true;
}

export async function getWorkerRawMessage(address: string, messageId: string): Promise<string | null> {
  const cleanAddr = address.toLowerCase().trim();
  const workerUrl = process.env.CF_WORKER_URL?.replace(/\/$/, "");

  if (workerUrl) {
    try {
      const res = await fetch(`${workerUrl}/api/inboxes/${encodeURIComponent(cleanAddr)}/messages/${messageId}/raw`);
      if (res.ok) {
        return await res.text();
      }
    } catch {
      // ignore
    }
  }

  const msgs = localMockStorage.get(cleanAddr) || [];
  const found = msgs.find((m) => m.id === messageId);
  return found ? found.body : null;
}
