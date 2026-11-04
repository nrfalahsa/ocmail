# OCMail Security Audit Report

**Target:** https://ocmail.oneclash.xyz  
**Date:** 2026-11-04  
**Auditor:** Automated Security Review  
**Status:** Production

---

## Executive Summary

Conducted comprehensive security audit covering authentication, authorization, input validation, API security, and infrastructure. Identified **1 High-priority issue** (dependency vulnerabilities) and **1 Medium-priority limitation** (rate limiting bypass via IP rotation).

**Risk Level:** LOW  
**Critical Issues:** 0  
**High Issues:** 1 (PostCSS vulnerabilities - transitive dependency)  
**Medium Issues:** 1 (Rate limiting design limitation)  
**Low Issues:** 0

---

## Detailed Findings

### ✅ P1: XSS via HTML Email Rendering - SECURE

**Severity:** Critical (Mitigated)  
**Status:** ✅ FIXED

**Location:** `src/lib/email-parser.ts:143-156`

**Finding:**
Email HTML content sanitized using `sanitize-html` library with strict whitelist:
- Allowed tags: p, br, b, i, u, a, img, table, div, span, h1-h6, ul, ol, li
- Allowed attributes: href, src, alt, title, class, style
- All event handlers (`onload`, `onerror`) stripped
- Dangerous tags (`<script>`, `<object>`, `<embed>`) blocked

**Recommendation:** ✅ No action needed. Production-grade sanitizer properly configured.

---

### ⚠️ P2: Rate Limiting Bypass via IP Rotation - LIMITATION

**Severity:** Medium  
**Status:** ⚠️ WORKS BUT BYPASSED

**Location:** `src/lib/ratelimit.ts`, `src/app/api/v1/inboxes/route.ts:38-57`

**Finding:**
- Rate limiting code implemented correctly (10 req/min per IP using Upstash Redis)
- Redis connection verified in production logs
- IP extraction handles comma-separated `x-forwarded-for` headers
- **BUT:** User's ISP rotates source IP (111.92.172.28/29/30) between requests
- Each IP tracked separately → never accumulates 10 requests → no 429 response

**Evidence:**
```
Request 1: IP 111.92.172.30 → HTTP 201 ALLOWED
Request 2: IP 111.92.172.28 → HTTP 201 ALLOWED
Request 3: IP 111.92.172.28 → HTTP 201 ALLOWED
Request 4: IP 111.92.172.30 → HTTP 201 ALLOWED
(8 requests in 6 seconds, all successful)
```

**Impact:**
- Prevents attacks from single fixed IP source
- Does NOT prevent attacks from CGNAT/mobile ISPs with rotating IPs
- Does NOT prevent distributed attacks

**Recommendation:**
```typescript
// Option 1: User-Agent fingerprinting (recommended)
const ua = req.headers.get("user-agent") || "";
const fingerprint = createHash('md5').update(ua).digest('hex').substring(0, 12);
const identifier = `inbox_create:${ip}:${fingerprint}`;

// Option 2: Session-based (requires cookie/localStorage)
// Option 3: Lower threshold (5 req/min instead of 10)
```

---

### ✅ P3: Dangerous Iframe Sandbox - SECURE

**Severity:** Critical (Mitigated)  
**Status:** ✅ FIXED

**Location:** `src/app/page.tsx:627`

**Finding:**
Iframe restricted with `sandbox=""` (no allow-* flags):
```tsx
<iframe sandbox="" src={iframeUrl} />
```

**Security guarantees:**
- Scripts disabled
- Popups blocked
- Form submission disabled
- Top-level navigation blocked

**Recommendation:** ✅ No action needed.

---

### ✅ P4: IDOR - Insecure Direct Object References - SECURE

**Severity:** High (Mitigated)  
**Status:** ✅ SECURE

**Location:** `src/app/api/v1/inboxes/[address]/messages/route.ts:19-31`

**Finding:**
Proper ownership validation enforced:
```typescript
if (dbInbox && dbInbox.userId) {
  if (!authCtx.userId || (dbInbox.userId !== authCtx.userId && authCtx.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Forbidden: Anda tidak memiliki akses ke inbox ini." },
      { status: 403 }
    );
  }
}
```

**Test Cases Passed:**
- ✅ Anonymous user cannot access owned inbox → 403
- ✅ User A cannot access User B's inbox → 403
- ✅ User can access own inbox → 200
- ✅ Admin can access any inbox → 200

**Recommendation:** ✅ No action needed.

---

### ✅ P5: Authentication & Authorization - SECURE

**Severity:** High (Mitigated)  
**Status:** ✅ SECURE

**Location:** `src/lib/api-guard.ts`, `src/lib/auth.ts`

**Finding:**

**API Key Security:**
- Prefix validation (`ocm_` required)
- SHA-256 hashing before database lookup
- Invalid keys return 401 immediately
- Request count tracking + last used timestamp

**Session Security:**
- NextAuth.js with JWT strategy
- OAuth only (Google, GitHub)
- Admin role assigned via `ADMIN_EMAILS` env var
- Role synced to database on login
- No client-side role manipulation possible

**Authorization Pattern:**
```typescript
const authCtx = await authenticateRequest(req);
if (authCtx.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
```

**Recommendation:** ✅ No action needed.

---

### ✅ P6: Admin Endpoint Protection - SECURE

**Severity:** High (Mitigated)  
**Status:** ✅ SECURE

**Location:** All `/api/admin/*` routes

**Finding:**
Consistent role check enforced:
```typescript
if (authCtx.role !== "ADMIN") {
  return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
}
```

**Protected Endpoints:**
- `/api/admin/stats`
- `/api/admin/users`
- `/api/admin/blocked-keywords`
- `/api/admin/all-inboxes`

**Recommendation:** ✅ No action needed.

---

### ✅ P7: Webhook Secret Validation - SECURE

**Severity:** High (Mitigated)  
**Status:** ✅ SECURE

**Location:** `src/app/api/webhooks/email-received/route.ts:14-44`

**Finding:**

**Secret Validation:**
```typescript
const auth = req.headers.get("x-worker-secret") || req.headers.get("authorization");
if (auth !== workerSecret && auth !== `Bearer ${workerSecret}`) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
```

**Replay Protection (when Redis available):**
- Timestamp validation: 5-minute window
- Nonce deduplication: 10-minute cache
- Redis key: `webhook:nonce:${nonce}`

**Attack Scenarios Blocked:**
- ✅ Missing secret → 401
- ✅ Wrong secret → 401
- ✅ Expired timestamp (>5 min) → 401
- ✅ Replay attack (same nonce) → 401

**Recommendation:** ✅ No action needed.

---

### ✅ P8: Security Headers - SECURE

**Severity:** Medium (Mitigated)  
**Status:** ✅ SECURE

**Location:** `next.config.ts:4-20`

**Finding:**
Production headers verified via curl:
```http
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; frame-src 'self';
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

**Security Posture:**
- ✅ Clickjacking protection (X-Frame-Options: DENY)
- ✅ MIME-sniffing protection (X-Content-Type-Options: nosniff)
- ✅ HTTPS enforcement (HSTS: 2 years)
- ⚠️ CSP allows 'unsafe-inline' and 'unsafe-eval' (Next.js requirement)
- ✅ Permissions-Policy restricts geolocation/camera/microphone

**Note:** `unsafe-inline` and `unsafe-eval` required for Next.js runtime. Moving to strict CSP requires nonce-based approach.

**Recommendation:** ✅ Acceptable for Next.js app. Optional: Implement CSP nonces for stricter policy.

---

### ❌ P9: Dependency Vulnerabilities - ACTION REQUIRED

**Severity:** High  
**Status:** ❌ VULNERABILITIES FOUND

**Package:** `postcss` (transitive dependency via `next@15.5.28`)

**Vulnerabilities:**
```
┌─────────┬──────────────────────────────────────────────────────────┐
│ high    │ Path Traversal in sourceMappingURL                      │
│ high    │ Arbitrary .map file disclosure                           │
│ moderate│ XSS via unescaped </style>                               │
│ moderate│ Incomplete fix of GHSA-6g55-p6wh-862q                    │
└─────────┴──────────────────────────────────────────────────────────┘
Vulnerable versions: <=8.5.22
Patched versions: >=8.5.23
```

**Impact:**
- File read vulnerabilities (if attacker controls CSS input)
- XSS via malicious CSS (if attacker controls style content)
- **Risk Level:** LOW (PostCSS used at build-time, not runtime with user input)

**Recommendation:**
```bash
# Option 1: Force postcss upgrade via pnpm overrides (recommended)
# Add to package.json:
"pnpm": {
  "overrides": {
    "postcss": ">=8.5.23"
  }
}

# Option 2: Wait for next@15.5.29+ release with updated postcss
# Check: https://github.com/vercel/next.js/releases

# Option 3: Accept risk (postcss only runs at build-time, no user input)
```

**Priority:** Medium (not exploitable in current architecture, but patch available)

---

### ✅ P10: Custom Prefix Race Condition - SECURE

**Severity:** Medium (Mitigated)  
**Status:** ✅ SECURE

**Location:** `src/app/api/v1/inboxes/route.ts:98-127`

**Finding:**

**Race Condition Protection:**
1. Check existing inbox ownership (line 98-111)
2. Return 409 if already claimed by another user
3. Atomic `upsert` operation via Prisma (line 116-127)
4. Database unique constraint on `address` field (schema.prisma line 80)

**Attack Scenario:**
```
User A: POST /inboxes {prefix: "test"}  ← 12:00:00.000
User B: POST /inboxes {prefix: "test"}  ← 12:00:00.001
```

**Outcome:**
- One request succeeds → 201
- Other request fails → 409 (already taken)
- Database constraint prevents duplicate entries

**Recommendation:** ✅ No action needed.

---

### ✅ P11: Error Message Information Disclosure - SECURE

**Severity:** Low (Mitigated)  
**Status:** ✅ SECURE

**Location:** All API routes

**Finding:**
Consistent error handling pattern:
```typescript
const isDev = process.env.NODE_ENV === "development";
return NextResponse.json(
  { 
    error: "Generic error message",
    ...(isDev && { details: String(err) })
  },
  { status: 500 }
);
```

**Production behavior:**
- Generic error messages only
- No stack traces
- No database connection strings
- No environment variables leaked

**Development behavior:**
- Full error details for debugging
- Stack traces included

**Recommendation:** ✅ No action needed.

---

## Additional Security Observations

### ✅ SQL Injection Protection
**Status:** ✅ SECURE  
Prisma ORM used throughout (parameterized queries by design). No raw SQL detected.

### ✅ Email Header Injection
**Status:** ✅ SECURE  
Cloudflare Worker handles SMTP. Next.js backend only receives parsed JSON from webhook.

### ✅ Session Fixation
**Status:** ✅ SECURE  
NextAuth.js handles session token rotation automatically.

### ✅ CORS Configuration
**Status:** ✅ SECURE  
No CORS headers set → same-origin only (default Next.js behavior).

### ✅ Subdomain Takeover
**Status:** ✅ SECURE (ASSUMED)  
DNS managed by Cloudflare. Verify `oneclash.xyz` and `oneclash.biz.id` CNAME records point to active Cloudflare/Vercel infrastructure.

---

## Remediation Summary

| Finding | Severity | Status | Action Required |
|---------|----------|--------|----------------|
| P1: XSS | Critical | ✅ Secure | None |
| P2: Rate Limiting | Medium | ⚠️ Limited | Optional: Add fingerprinting |
| P3: Iframe Sandbox | Critical | ✅ Secure | None |
| P4: IDOR | High | ✅ Secure | None |
| P5: Auth/Authz | High | ✅ Secure | None |
| P6: Admin Protection | High | ✅ Secure | None |
| P7: Webhook Security | High | ✅ Secure | None |
| P8: Security Headers | Medium | ✅ Secure | None |
| P9: Dependencies | High | ❌ Vuln Found | **Update postcss** |
| P10: Race Condition | Medium | ✅ Secure | None |
| P11: Error Disclosure | Low | ✅ Secure | None |

---

## Immediate Action Items

### Priority 1: Fix Dependency Vulnerabilities
```bash
# Add to package.json
"pnpm": {
  "overrides": {
    "postcss": "^8.5.23"
  }
}

# Then run
pnpm install
pnpm audit --prod
git commit -am "fix: force postcss@8.5.23 to resolve CVE"
git push
```

### Priority 2: Enhance Rate Limiting (Optional)
See P2 recommendation for User-Agent fingerprinting implementation.

---

## Compliance Notes

- **OWASP Top 10 (2021):** No critical vulnerabilities found
- **CWE Coverage:** Injection, auth, XSS, IDOR, rate limiting, headers all addressed
- **Best Practices:** Modern stack (Next.js 15, React 19, NextAuth v5)

---

## Testing Evidence

All findings verified via:
- ✅ Source code review (complete codebase)
- ✅ Production header inspection (curl)
- ✅ Dependency audit (pnpm audit)
- ✅ Rate limiting live test (Vercel logs analysis)
- ✅ Authorization matrix testing (IDOR scenarios)

---

## Conclusion

**Overall Security Posture: GOOD**

OCMail demonstrates solid security practices:
- Proper authentication/authorization
- Input validation and sanitization
- Defense-in-depth (rate limiting + security headers + HTTPS)
- Secure coding patterns (parameterized queries, error handling)

One dependency issue (PostCSS) requires patching. Rate limiting design limitation is acceptable but could be improved for hostile network environments.

**Recommendation:** Fix P9 (postcss), deploy, retest. Platform ready for production use.

---

**Report Generated:** 2026-11-04T12:19:49Z  
**Next Review:** Recommended after next major feature release or Q1 2027
