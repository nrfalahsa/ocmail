// Cloudflare Worker for ocmail (Email Routing -> KV -> API Bridge)
// Compatible with grok tempik architecture + custom prefixes + raw RFC822

export default {
  // 1. Capture incoming email from Cloudflare Email Routing
  async email(message, env, ctx) {
    const to = (message.to || "").toLowerCase().replace(/^<|>$/g, "").trim();
    const from = message.headers.get("from") || message.from || "unknown@sender";
    const subject = message.headers.get("subject") || "(No Subject)";
    const date = message.headers.get("date") || new Date().toISOString();
    const rawBody = await new Response(message.raw).text();

    const emailId = "msg_" + crypto.randomUUID().replace(/-/g, "").substring(0, 16);

    const emailData = {
      id: emailId,
      to,
      from,
      subject,
      date,
      body: rawBody,
      received_at: Date.now(),
    };

    // Store in KV with 24 hours TTL (86400s)
    const existing = (await env.EMAILS.get(to, { type: "json" })) || [];
    existing.unshift(emailData); // newest first
    await env.EMAILS.put(to, JSON.stringify(existing), { expirationTtl: 86400 });

    // Notify Next.js backend asynchronously via waitUntil so stats increment immediately
    if (env.APP_URL) {
      const webhookUrl = `${env.APP_URL.replace(/\/$/, "")}/api/webhooks/email-received`;
      const hasOtp = /(?:code|verification|otp|kode|security|confirmation|pin)[^0-9]{0,25}(\b\d{3}[-\s]?\d{3}\b|\b\d{4,8}\b)/i.test(
        `${subject} ${rawBody.slice(0, 4000)}`
      );

      ctx.waitUntil(
        fetch(webhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(env.WORKER_WEBHOOK_SECRET ? { "x-worker-secret": env.WORKER_WEBHOOK_SECRET } : {}),
          },
          body: JSON.stringify({
            id: emailId,
            to,
            hasOtp,
          }),
        }).catch(() => {})
      );
    }
  },

  // 2. HTTP API for Next.js backend & clients
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    const corsHeaders = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, x-worker-secret",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Optional worker secret verification
    if (env.WORKER_SECRET) {
      const auth = request.headers.get("x-worker-secret") || request.headers.get("authorization");
      if (auth !== env.WORKER_SECRET && auth !== `Bearer ${env.WORKER_SECRET}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401, headers: corsHeaders });
      }
    }

    // Session mock
    if (path === "/api/session" && request.method === "GET") {
      return Response.json({ sessionId: "ocm-session-" + crypto.randomUUID() }, { headers: corsHeaders });
    }

    // Create inbox (random or custom)
    if (path === "/api/inboxes" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const domain = body.domain || url.hostname;
      
      let prefix = body.prefix ? String(body.prefix).trim().toLowerCase().replace(/[^a-z0-9._-]/g, "") : "";
      if (!prefix) {
        prefix = "ocm_" + Math.random().toString(36).substring(2, 10);
      }
      
      const address = `${prefix}@${domain}`.toLowerCase();
      return Response.json({ address, prefix, domain }, { headers: corsHeaders });
    }

    // Polling messages
    const msgMatch = path.match(/^\/api\/inboxes\/([^/]+)\/messages$/);
    if (msgMatch && request.method === "GET") {
      const addr = decodeURIComponent(msgMatch[1]).toLowerCase().replace(/^<|>$/g, "").trim();
      const messages = (await env.EMAILS.get(addr, { type: "json" })) || [];
      return Response.json(messages, { headers: corsHeaders });
    }

    // Get single raw message
    const rawMatch = path.match(/^\/api\/inboxes\/([^/]+)\/messages\/([^/]+)\/raw$/);
    if (rawMatch && request.method === "GET") {
      const addr = decodeURIComponent(rawMatch[1]).toLowerCase().replace(/^<|>$/g, "").trim();
      const msgId = rawMatch[2];
      const messages = (await env.EMAILS.get(addr, { type: "json" })) || [];
      const found = messages.find((m) => m.id === msgId);
      if (!found) {
        return new Response("Message not found", { status: 404 });
      }
      return new Response(found.body, {
        headers: {
          "Content-Type": "message/rfc822; charset=utf-8",
          "Content-Disposition": `attachment; filename="${msgId}.eml"`,
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Delete inbox
    const inboxMatch = path.match(/^\/api\/inboxes\/([^/]+)$/);
    if (inboxMatch && request.method === "DELETE") {
      const addr = decodeURIComponent(inboxMatch[1]).toLowerCase().replace(/^<|>$/g, "").trim();
      await env.EMAILS.delete(addr);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    return new Response("Not Found", { status: 404 });
  },
};
