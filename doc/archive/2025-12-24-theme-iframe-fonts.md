# 2025-12-24 - Theme Preview iframe crash + Fonts Console (system fonts only) (Archive)

> Date: 2025-12-24  
> Status: COMPLETE  
> Scope: fix admin theme preview reliability in production and add font switching via allowlisted system font stacks

## Summary (When / What / Why / How)

- When: 2025-12-24
- What: fixed admin Theme preview crashes caused by blocked iframes, and added a Fonts console to control `--theme-font` (system fonts only).
- Why: production security headers blocked same-site framing (preview), and uncaught cross-origin iframe access caused “Application error”; font switching needed to stay within `ARCHITECTURE.md` rules (no external web fonts).
- How:
  - Allowed same-origin framing (`X-Frame-Options: SAMEORIGIN`) and hardened iframe operations with defensive access patterns.
  - Stored font override in `site_config.custom_overrides['--theme-font']` using an allowlist defined in a pure module.
- Result: theme preview stays stable in prod; fonts can be switched without loading external resources.

## Root Cause

- Security header `X-Frame-Options: DENY` blocks all framing (including same-origin) → admin preview iframe fails to load.
- Preview code touched `iframe.contentWindow/location` and `iframe.contentDocument` without guarding → blocked/error documents become cross-origin → `SecurityError` crashes the admin page.

## Fixes (Implemented)

### 1) Allow same-origin preview framing

- `next.config.ts`: `X-Frame-Options` set to `SAMEORIGIN`

### 2) Make preview iframe operations resilient

- `app/[locale]/admin/theme/ThemePreviewIframe.tsx`
  - guard iframe reload + document writes so blocked/failed frames don’t crash the page

### 3) Fonts console (system fonts only)

- Pure allowlist + stacks: `lib/theme/fonts.ts`
- Admin UI: `app/[locale]/admin/theme/FontsClient.tsx` + route `app/[locale]/admin/theme/fonts/page.tsx`
- Persistence: `site_config.custom_overrides['--theme-font']` (override string or `null`)

## Verification

- Manual (production): theme preview loads; saving theme/tokens does not crash the page.
- Commands:
  - `npm run type-check`
  - `npm test`
  - `npm run build`

## References

- Constraints: `../../ARCHITECTURE.md` (system fonts only; server-only IO)
- Theme system SSoT: `../SPEC.md` (Theme System)
- Drift tracker/playbooks: `../../uiux_refactor.md`

