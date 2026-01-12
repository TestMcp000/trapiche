# AI Analysis — End-to-End UX Hardening

> **Date**: 2025-12-31  
> **Status**: COMPLETE  
> **Related**: `uiux_refactor.md` §6.2.2, `doc/specs/completed/AI_ANALYSIS_v2.md`

## Summary

Completed Phase 1 end-to-end UX hardening for AI Analysis Admin module: report viewing, model selection + cost estimation, cron deployment visibility, and IO module bloat refactor.

## Changes

### 1) Reports UI (detail view + polling)

- Added a server action to load report details and render Markdown → HTML server-side (via existing `markdownToHtml()`).
- Updated `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx` to provide:
  - Report detail modal/panel (click to view)
  - Status badge, tokens/costUsd/modelId, dataTypes/filters, errorMessage
  - Auto-polling for pending/running reports
  - Cost shown in list rows

### 2) Model / pricing / cost estimation drift fix

- Types/DB: `modelId` is persisted on reports and enforced by validation allowlist.
- Worker: cron processing computes cost via model pricing (`getModelPricing()`), matching UI estimation.
- UI: model dropdown is fed from initial server data; adds cost warnings for expensive models.
- Tests updated to cover `validateAnalysisRequest` with model selection.

### 3) Deployment readiness (cron visibility + manual processing)

- Added deployment guide: `doc/RUNBOOK.md` (AI Analysis) (`OPENROUTER_API_KEY`, `CRON_SECRET`, cron config example).
- Added `getCronStatus()` and related server actions to:
  - Detect missing cron configuration / suspiciously stuck pending queue
  - Allow owner-only manual processing trigger (rate-limited)
- UI shows cron warnings and exposes “Process Pending Report Now” for owner when needed.

### 4) IO module bloat refactor

- Split report IO into capability-scoped modules:
  - `lib/ai-analysis/analysis-reports-read-io.ts` (queries + cron status)
  - `lib/ai-analysis/analysis-reports-write-io.ts` (mutations)
- Converted `lib/ai-analysis/analysis-report-io.ts` into a facade re-export (keeps stable import path).

## Verification

- `npm test`
- `npm run type-check`
- `npm run lint`

