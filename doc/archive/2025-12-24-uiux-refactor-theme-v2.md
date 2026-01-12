# 2025-12-24 - Theme v2 (Layouts + Custom Tokens + Correct Preview) (Archive)

> Date: 2025-12-24  
> Status: COMPLETE ✅  
> Scope: Theme v2 implementation log (admin UX + DB model + resolver/preview alignment)

## Summary (When / What / Why / How)

- When: 2025-12-24
- What: delivered Theme v2 with (1) layout-level themes, (2) per-theme customizable tokens, and (3) reliable admin preview that matches runtime injection behavior.
- Why: v1 preview was misleading (wrong injection target) and customization needed to be per-layout without leaking into public client bundles.
- How: aligned preview injection target with runtime (`body`/`.theme-scope`), added an admin-only preview route, and introduced `site_config.theme_overrides` (per-theme JSON) with typed allowlisted CSS vars.
- Result: admins can preview and customize themes safely; public remains server-first with SSR-injected vars (no FOUC).

## Root Causes / Fixes

### 1) Preview mismatch (P0)

- Root cause: runtime vars were injected on `<body>` / `.theme-scope`, but admin preview injected on `<html>` → inheritance lost due to inline overrides.
- Fix: preview writes to the same target the runtime uses (and clears previous allowlisted vars before applying new ones).

### 2) Layout vs token presets (P1)

- Clarified that `ThemeKey` represents a layout type; tokens are customizable parameters layered on top.

## Key Changes (Technical)

### 1) Admin-only preview route (noindex)

- Route: `app/[locale]/admin/theme/preview/page.tsx` (server; forces noindex)
- Preview scope component: `components/theme/ThemePreviewScope.tsx`
- Iframe logic: `app/[locale]/admin/theme/ThemePreviewIframe.tsx` (loads preview route + client token injection)

### 2) DB model: per-theme overrides

- Schema: `supabase/02_add/10_theme.sql` adds `theme_overrides` JSONB (per `ThemeKey`)
- Seed: `supabase/03_seed/07_theme.sql`

### 3) Types + allowlists

- Types / keys: `lib/types/theme.ts`
  - `CUSTOMIZABLE_CSS_VARS` + `CustomizableCssVar`
  - `ThemeOverrides` shape
- Fonts allowlist (system fonts only): `lib/theme/fonts.ts`

### 4) Resolver merge priority

- Resolver: `lib/theme/resolve.ts`
- Priority (conceptual): preset vars → `theme_overrides[themeKey]` → legacy overrides → global accent → derived vars

### 5) Admin UI entrypoints

- Theme pages: `app/[locale]/admin/theme/*` (global theme, per-page themes, customize tokens, fonts)

## Verification

- `npm run type-check`
- `npm run lint`
- `npm test`

## References

- Architecture constraints (theme SSR + fonts): `../../ARCHITECTURE.md`
- Implemented behavior (SSoT): `../SPEC.md` (Theme System)
- Drift tracker/playbooks: `../../uiux_refactor.md`

