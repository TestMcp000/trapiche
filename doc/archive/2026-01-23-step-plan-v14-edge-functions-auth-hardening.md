# 2026-01-23 - Step Plan V14（Edge Functions Auth Hardening）(Archive)

> Date: 2026-01-23  
> Status: ARCHIVED / COMPLETE  
> Scope: security hardening + ops docs alignment (not SSoT)

## Summary (When / What / Why / How)

- When: 2026-01-23
- What:
  - Harden Supabase Edge Functions (`generate-embedding`, `judge-preprocessing`) to **service_role-only** (reject anon/authenticated JWT)
  - Switch Next.js judge invocation to `createAdminClient().functions.invoke(...)` (no anon direct fetch)
  - Update security + runbooks + deployment docs to document the new constraint
  - Local hygiene: remove dead empty folder `app/[locale]/shop/` (scope reduction residue; no tracked files)
- Why:
  - Prevent public anon key abuse from triggering OpenAI cost, and prevent DB pollution through Edge Functions that internally use service role for writes
- How:
  - Edge Functions: decode JWT payload role and reject non-`service_role`
  - Server callers: use service role client for Edge Functions invocation
- Result:
  - Edge Functions become privileged, server-only cost endpoints
  - Ops team has explicit steps and verification points in runbooks

## Context

- Related constraints: `../../ARCHITECTURE.md`
- Implemented behavior (SSoT): `../SPEC.md`
- Ops / verification: `../RUNBOOK.md`
- Security / RLS / secrets: `../SECURITY.md`
- Drift tracker / stable `@see`: `../../uiux_refactor.md`

## Changes

### 1) Edge Functions (service_role-only)

- Files touched:
  - `supabase/functions/generate-embedding/index.ts`
  - `supabase/functions/judge-preprocessing/index.ts`
- Notes:
  - Add request auth hardening: extract JWT from `Authorization`/`apikey`, decode payload, and require `role === 'service_role'`.
  - Keep CORS preflight behavior unchanged (`OPTIONS` allowed).

### 2) Next.js server invocation (Judge)

- Files touched:
  - `lib/modules/preprocessing/judge-invoke-io.ts`
- Notes:
  - Replace anon-key direct HTTP call with `createAdminClient().functions.invoke('judge-preprocessing', { body })`.

### 3) Documentation (Security + Ops)

- Files touched:
  - `doc/SECURITY.md`
  - `doc/runbook/embeddings-preprocessing.md`
  - `doc/runbook/deployment.md`
  - `doc/SPEC.md`
  - `../../ARCHITECTURE.md`
- Notes:
  - Document the new invariant: Edge Functions that call OpenAI are **service_role-only** and must keep JWT verification enabled.
  - Deployment doc now lists env vars by feature (Vercel + Supabase + Google OAuth).

## Verification

- Commands:
  - `npm test`
  - `npm run type-check`
  - `npm run lint`
  - `npm run docs:generate-indexes`
  - `npm run docs:check-indexes`
  - `npm run lint:md-links`
- Manual checks:
  - Supabase Edge Function requests using anon JWT should return 401.
  - Admin-only flows (preprocessing/embeddings) still work via service role callers.

## Related Documents

- Docs hub: `../README.md`
- Specs / PRDs index: `../specs/README.md`
- Archive index: `README.md`

