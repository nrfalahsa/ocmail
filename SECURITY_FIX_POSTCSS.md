# Fix: PostCSS Dependency Vulnerabilities

## Problem
`pnpm audit` detected 4 vulnerabilities in `postcss` package:
- 2 High severity
- 2 Moderate severity

Current version: <=8.5.22 (transitive dependency from next@15.5.28)  
Patched version: >=8.5.23

## Solution: Force Resolution via pnpm Overrides

pnpm allows forcing dependency versions via `overrides` field in package.json.

## Implementation

### Step 1: Add Override
```bash
# Edit package.json, add this section:
"pnpm": {
  "overrides": {
    "postcss": "^8.5.23"
  }
}
```

### Step 2: Reinstall Dependencies
```bash
pnpm install
```

### Step 3: Verify Fix
```bash
pnpm audit --prod
# Should report 0 vulnerabilities
```

### Step 4: Test Build
```bash
pnpm run build
# Ensure no breaking changes
```

### Step 5: Commit & Deploy
```bash
git add package.json pnpm-lock.yaml
git commit -m "fix: force postcss@8.5.23 to resolve security vulnerabilities

- GHSA-6g55-p6wh-862q: Path traversal in sourceMappingURL
- GHSA-r28c-9q8g-f849: Arbitrary .map file disclosure
- GHSA-qx2v-qp2m-jg93: XSS via unescaped </style>
- GHSA-fxqj-rqcc-2cmp: Incomplete fix regression

Impact: Low (postcss only used at build-time)
Fix: Force upgrade via pnpm overrides to >=8.5.23"

git push
```

## Alternative: Wait for Next.js Update

Next.js 15.5.29+ will likely include updated postcss dependency.  
Monitor: https://github.com/vercel/next.js/releases

## Risk Assessment

**Current Risk:** LOW  
- PostCSS vulnerabilities require attacker-controlled CSS input
- OCMail uses postcss only at build-time (no runtime CSS processing)
- No user-supplied CSS accepted
- Build environment trusted (Vercel)

**Recommendation:** Apply fix during next maintenance window (not emergency).
