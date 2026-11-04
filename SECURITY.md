# Security Notes

## Known Issues

### PostCSS Dependency Vulnerabilities (Accepted Risk)

**Status:** ACCEPTED - LOW RISK  
**Date:** 2026-11-04  
**CVEs:** GHSA-6g55-p6wh-862q, GHSA-r28c-9q8g-f849, GHSA-qx2v-qp2m-jg93, GHSA-fxqj-rqcc-2cmp

**Affected Package:** `postcss` <=8.5.22 (transitive dependency from `next@15.5.28` and `next-auth@5.0.0-beta.32`)

**Why Accepted:**
1. PostCSS only runs at **build-time** on trusted developer machines and CI
2. No user-supplied CSS is processed at runtime
3. Vulnerabilities require attacker-controlled CSS input (not possible in our architecture)
4. pnpm v12 `overrides` feature broken - cannot force upgrade transitive dependencies
5. Waiting for upstream fix in Next.js 15.6.x

**Mitigation:**
- Build environment secured (Vercel CI)
- No runtime CSS processing
- Regular dependency audits scheduled

**Revalidation:** Check after Next.js 15.6.x release or quarterly review (2027-02-01)

---

## Fixed Vulnerabilities

All P1-P3 security issues from audit resolved:

- ✅ XSS via email HTML (sanitize-html library)
- ✅ Iframe sandbox hardening (no popups)
- ✅ Rate limiting (10 req/min via Upstash Redis)
- ✅ Security headers (CSP, X-Frame-Options, etc)
- ✅ Error message sanitization (production)
- ✅ Webhook replay protection (timestamp + nonce)
- ✅ IDOR protection (ownership validation)
- ✅ Admin endpoint protection (role checks)

**Last Full Audit:** 2026-11-04  
**Next Scheduled Audit:** 2027-02-01
