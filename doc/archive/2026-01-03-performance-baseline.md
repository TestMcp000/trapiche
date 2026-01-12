# 2026-01-03 - Performance Baseline (Archive)

> Status: ARCHIVED / COMPLETE  
> Last Updated: 2026-01-03  
> Scope: Performance baseline measurement for go-live readiness (PR-5)

## Summary

- **Bundle analysis completed**: Webpack build with `@next/bundle-analyzer` generated reports for nodejs, edge, and client bundles.
- **Drift checks passed**: No admin-only dependencies (recharts) leaked into public UI, no AI SDK in client bundle, no hardcoded domains.
- **Build status**: 124 pages generated (61 static, 63 dynamic), all tests passing (866/866).
- **Scrollytelling client**: Correctly lazy-loaded only when `enableAnimations=true` (per ARCHITECTURE.md §3.2).

## Context

- Related constraints: `../../ARCHITECTURE.md` (§4.5 Bundle / Dependency Guardrails)
- Implemented behavior (SSoT): `../SPEC.md`
- Ops / verification: `../RUNBOOK.md`
- Security / RLS / secrets: `../SECURITY.md`
- Drift tracker / stable `@see`: `../../uiux_refactor.md` (§2 merge checklist)

## Measurements

### 1) Bundle Analysis

- **Reports location**: `.next/analyze/`

  - `nodejs.html` — Server-side bundle
  - `edge.html` — Edge runtime bundle
  - `client.html` — Client-side bundle

- **Command**: `npx cross-env ANALYZE=true next build --webpack`

- **Key observations**:
  - Admin-heavy dependencies (`recharts`, `react-image-crop`) isolated to admin routes
  - AI SDKs (`openai`, `openrouter`) not present in client bundle
  - Heavy import/export deps (`gray-matter`, `jszip`, `papaparse`, `exceljs`) server-only

### 2) Build Output

| Metric               | Value   |
| -------------------- | ------- |
| Next.js Version      | 16.0.10 |
| Pages (Total)        | 124     |
| Static Pages (○/●)   | ~61     |
| Dynamic Pages (ƒ)    | ~63     |
| Build Time (webpack) | ~120s   |

### 3) Drift Checks (uiux_refactor.md §2)

| Check                            | Expected | Result    |
| -------------------------------- | -------- | --------- |
| `recharts` in public UI          | 0 hits   | ✅ 0 hits |
| `openrouter` in components       | 0 hits   | ✅ 0 hits |
| `.vercel.app` hardcoded          | 0 hits   | ✅ 0 hits |
| OpenAI SDK in app/components/lib | 0 hits   | ✅ 0 hits |
| Heavy deps in app/components     | 0 hits   | ✅ 0 hits |

### 4) Test Results

```
# tests 866
# suites 217
# pass 866
# fail 0
# cancelled 0
# skipped 0
# duration_ms ~2065
```

## Verification

- Commands:
  - `npm test` — 866/866 passed
  - `npm run type-check` — 0 errors
  - `npm run lint` — 0 errors (1 unrelated warning)
  - `npm run build` — exit code 0
- Bundle analysis:
  - Ran `npx cross-env ANALYZE=true next build --webpack`
  - Reports generated at `.next/analyze/`

## Lighthouse Baseline (Deferred)

> Note: Lighthouse measurements require a running dev server and browser automation.
> For production baseline, run Lighthouse via Chrome DevTools on deployed site.
> Key pages to measure: `/`, `/en/blog`, `/en/gallery`, `/en/shop`

Recommended metrics to track:

- LCP (Largest Contentful Paint): Target < 2.5s
- TTFB (Time to First Byte): Target < 800ms
- CLS (Cumulative Layout Shift): Target < 0.1

## No Regression Found

Based on the drift checks and bundle analysis:

- No admin dependencies leaked into public bundle
- No AI SDK leaked into client bundle
- Theme/scrollytelling correctly lazy-loaded
- All architecture boundaries maintained

## Related Documents

- Docs hub: `../README.md`
- Specs / PRDs index: `../specs/README.md`
- Archive index: `README.md`
- Step Plan: `../meta/STEP_PLAN.md` (PR-5)
