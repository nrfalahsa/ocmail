# Security Audit & Penetration Testing Prompt

**Target:** https://ocmail.oneclash.xyz  
**Date:** 2026-11-04  
**Scope:** Full-stack temporary email service (Next.js + Cloudflare Worker + PostgreSQL)

---

## Objective

Perform comprehensive security audit and penetration testing on ocmail platform. Identify vulnerabilities, assess attack surfaces, and provide remediation recommendations.

---

## System Architecture Overview

- **Frontend/Backend:** Next.js 15 (App Router) deployed on Vercel
- **Email Bridge:** Cloudflare Worker + KV Store + Email Routing
- **Database:** PostgreSQL (Supabase/Neon) via Prisma ORM
- **Authentication:** NextAuth.js (OAuth: Google, GitHub)
- **API:** RESTful endpoints under `/api/v1/` and `/api/admin/`

---

## Test Scope

### 1. Authentication & Authorization
- [ ] OAuth flow manipulation (CSRF, token theft)
- [ ] Session hijacking and fixation
- [ ] Role escalation (USER → ADMIN)
- [ ] API key bypass and privilege escalation
- [ ] JWT/session token security
- [ ] Account enumeration via login/signup
- [ ] Unauthorized access to admin endpoints (`/api/admin/*`)

### 2. API Security
- [ ] REST endpoint authorization bypass
- [ ] Mass assignment vulnerabilities
- [ ] Rate limiting effectiveness
- [ ] CORS misconfiguration
- [ ] API key leakage in responses/errors
- [ ] Insecure direct object references (IDOR)
  - Access other users' inboxes via `/api/v1/inboxes/[address]/messages`
  - Modify/delete other users' API keys
  - View/delete other users' inbox history

### 3. Input Validation & Injection
- [ ] SQL injection (Prisma ORM safety)
- [ ] NoSQL injection (KV store queries)
- [ ] XSS (stored, reflected, DOM-based)
  - Email subject/body rendering
  - Custom prefix creation
  - User profile fields
- [ ] HTML injection in email preview
- [ ] Command injection in worker scripts
- [ ] Path traversal in file operations
- [ ] SSRF via webhook URLs or email proxying

### 4. Email Security
- [ ] Email spoofing and header injection
- [ ] SMTP smuggling via Cloudflare Worker
- [ ] Malicious email content (XSS, phishing links)
- [ ] OTP/verification code extraction manipulation
- [ ] Raw email (.eml) download abuse
- [ ] Email routing bypass (send to unowned inboxes)

### 5. Business Logic Flaws
- [ ] Inbox ownership claim race conditions
- [ ] Custom prefix collision and takeover
- [ ] Reserved keyword bypass (admin, support, etc.)
- [ ] Expired inbox access after TTL
- [ ] Anonymous inbox data retention beyond 24h
- [ ] API key request count manipulation
- [ ] Webhook replay attacks

### 6. Data Exposure
- [ ] Sensitive data in API responses (password hashes, tokens)
- [ ] PII leakage (email addresses, user IDs)
- [ ] Error messages revealing stack traces
- [ ] Database connection strings in source maps
- [ ] Environment variable exposure
- [ ] Cloudflare Worker secrets leakage
- [ ] Admin dashboard cross-user data visibility

### 7. Infrastructure Security
- [ ] Subdomain takeover (oneclash.xyz, oneclash.biz.id)
- [ ] DNS spoofing for email routing
- [ ] TLS/SSL configuration weaknesses
- [ ] HTTP security headers (CSP, HSTS, X-Frame-Options)
- [ ] CDN/cache poisoning
- [ ] Vercel deployment security
- [ ] Database direct access exposure (port 5432 vs 6543)

### 8. Frontend Security
- [ ] Client-side secrets exposure (API keys in JS)
- [ ] LocalStorage token theft
- [ ] React hydration vulnerabilities
- [ ] Prototype pollution
- [ ] Clickjacking (iframe embedding)
- [ ] Open redirect vulnerabilities

### 9. Denial of Service
- [ ] Mass inbox creation abuse
- [ ] Email flooding to single inbox
- [ ] Worker KV exhaustion
- [ ] Database connection pool exhaustion
- [ ] Expensive queries (no pagination limits)
- [ ] Webhook spam to Next.js backend

### 10. Third-Party Dependencies
- [ ] Outdated npm packages with CVEs
- [ ] Prisma Client vulnerabilities
- [ ] NextAuth.js security advisories
- [ ] Cloudflare Worker runtime exploits

---

## Testing Methodology

### Reconnaissance
1. **Information Gathering:**
   - GitHub repository analysis (check if public)
   - DNS/subdomain enumeration
   - Technology fingerprinting
   - robots.txt, sitemap.xml, .well-known/
   - Wayback Machine historical data

2. **Source Code Review (if accessible):**
   - Hardcoded secrets/credentials
   - Unsafe API patterns
   - Missing input validation
   - Authorization logic flaws

### Active Testing
1. **Manual Testing:**
   - Use Burp Suite/OWASP ZAP for request interception
   - Test authentication flows with multiple accounts
   - Attempt IDOR via UUID/address manipulation
   - Fuzz input fields (email, prefix, search)

2. **Automated Scanning:**
   - Nuclei templates for known vulnerabilities
   - SQLMap for injection testing
   - OWASP ZAP automated scan
   - npm audit / Snyk for dependency checks

3. **Custom Exploits:**
   - Craft malicious emails with XSS payloads
   - Test race conditions in inbox claiming
   - Attempt webhook poisoning
   - Bypass rate limits with distributed requests

---

## Expected Vulnerabilities (Hypothesis)

### High-Risk Areas
1. **IDOR in inbox messages:** `/api/v1/inboxes/{any_address}/messages` might not validate ownership
2. **Admin privilege leak:** Check if `authCtx.role` can be manipulated client-side
3. **XSS in email preview:** HTML sanitization might miss edge cases
4. **Webhook secret bypass:** `WORKER_WEBHOOK_SECRET` validation could be weak
5. **Custom prefix takeover:** Race condition when multiple users claim same prefix

### Medium-Risk Areas
1. **API key enumeration:** Predictable key formats or brute-forceable prefixes
2. **Session fixation:** NextAuth cookies might not rotate on privilege change
3. **CORS misconfiguration:** Cloudflare Worker allows all origins
4. **Email header injection:** Subject/from fields in admin preview

---

## Reporting Format

For each finding, provide:

```markdown
### [SEVERITY] Vulnerability Title

**CVSS Score:** X.X (Low/Medium/High/Critical)

**Description:**
Brief explanation of the vulnerability and how it can be exploited.

**Steps to Reproduce:**
1. Navigate to [URL]
2. Authenticate as [role]
3. Send request: `[HTTP request]`
4. Observe [impact]

**Impact:**
- Data exposure: [what data]
- Privilege escalation: [from X to Y]
- Service disruption: [how]

**Proof of Concept:**
```http
POST /api/v1/inboxes/victim@oneclash.biz.id/messages HTTP/1.1
Host: ocmail.oneclash.xyz
Cookie: [attacker_session]
...
```

**Remediation:**
- Short-term: [immediate fix]
- Long-term: [architectural improvement]

**References:**
- CWE-XXX: [link]
- OWASP: [link]
```

---

## Out of Scope

- Physical security testing
- Social engineering attacks on real users
- DDoS attacks that impact service availability
- Testing on production user data without consent
- Exploiting vulnerabilities after discovery without disclosure

---

## Compliance & Ethics

- Follow responsible disclosure: report critical issues privately before public disclosure
- Do not access/modify/delete other users' real data
- Do not disrupt service for legitimate users
- Obtain explicit permission before aggressive testing
- Respect rate limits and avoid resource exhaustion

---

## Deliverables

1. **Executive Summary** (1-2 pages)
   - High-level findings
   - Risk assessment
   - Business impact

2. **Technical Report** (detailed)
   - All vulnerabilities with PoC
   - CVSS scores and risk ratings
   - Remediation roadmap

3. **Remediation Checklist**
   - Prioritized action items
   - Code patches (if applicable)
   - Configuration changes

4. **Retest Results** (after fixes)
   - Verification of patched vulnerabilities
   - Regression testing report

---

## Tools & Environment

**Recommended Tools:**
- Burp Suite Professional / Community
- OWASP ZAP
- Postman / Insomnia
- curl / httpie
- sqlmap
- nuclei
- subfinder / amass
- jwt.io (JWT debugging)
- Browser DevTools (Network, Console, Storage)

**Test Accounts:**
- Create multiple accounts (Google OAuth, GitHub OAuth)
- One ADMIN account (if configured in `ADMIN_EMAILS`)
- Multiple USER accounts for cross-account testing
- Anonymous sessions (no login)

---

## Start Testing

Begin with reconnaissance, then proceed through each test category systematically. Document everything. Good luck!
