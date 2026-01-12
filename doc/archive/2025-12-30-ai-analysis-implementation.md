# 2025-12-30 - AI Analysis（Module B）Implementation Notes

> Date: 2025-12-30  
> Status: IMPLEMENTED (Phase 1 backend + minimal Admin UI; follow-ups tracked in `uiux_refactor.md` §6.2.2)  
> Scope: code map for Module B implementation (archive snapshot)

本文件記錄 AI Analysis（Module B）在程式碼中的落地位置（以 2025-12-30 的 repo 狀態為準），用於後續維護與追溯。

---

## Summary (When / What / Why / How)

- When: 2025-12-30
- What: shipped Phase 1 AI Analysis backend + minimal admin UI + cron worker.
- Why: enable owner-run analysis with controlled cost and safe data shaping (PII de-identification).
- How: split pure/IO modules (`analysis-pure.ts`, `openrouter-*-io.ts`, report/usage IO) and drove background execution via `/api/cron/ai-analysis`.
- Result: end-to-end “request → pending report → cron worker → completed report” flow exists; remaining UX hardening tracked elsewhere.

## What Exists (Code Map)

### App Layer（Admin UI + Worker）

- Admin route：`app/[locale]/admin/(data)/ai-analysis/`
  - `page.tsx`：role gate + initial state（reports/usage/models）
  - `actions.ts`：start/list/delete + budget/config helpers
  - `AIAnalysisClient.tsx`：最小 UI（start job + reports list + usage）
- Background worker（Cron endpoint）：`app/api/cron/ai-analysis/route.ts`
  - `CRON_SECRET` header validation（支援 `x-cron-secret` 或 Vercel Cron `Authorization: Bearer ...`）
  - 每次最多處理 5 筆 pending reports

### Lib Layer（AI Analysis domain）

- SSOT types：`lib/types/ai-analysis.ts`
- Validators：`lib/validators/ai-analysis.ts`
- Pure helpers（token/cost + PII 去識別化 + sampling）：`lib/ai-analysis/analysis-pure.ts`
- Prompts（pure）：`lib/ai-analysis/analysis-prompts.ts`
- OpenRouter integration（server-only）：
  - `lib/ai-analysis/openrouter-run-io.ts`
  - `lib/ai-analysis/openrouter-models-io.ts`
- Report IO（server-only）：`lib/ai-analysis/analysis-report-io.ts`
- Usage IO（server-only）：`lib/ai-analysis/analysis-usage-io.ts`
- Data collection layer（server-only + pure mappers）：
  - `lib/ai-analysis/analysis-data-io.ts`（facade）
  - `lib/ai-analysis/analysis-products-io.ts`
  - `lib/ai-analysis/analysis-orders-io.ts`
  - `lib/ai-analysis/analysis-members-io.ts`
  - `lib/ai-analysis/analysis-comments-io.ts`
  - `lib/ai-analysis/analysis-data-mappers.ts`（pure）
- Facade：`lib/ai-analysis/io.ts`

### Database（Schema / RPC）

- `supabase/02_add/12_ai_analysis.sql`
  - `ai_analysis_reports`（報告 storage）
  - `ai_usage_monthly`（用量統計）
  - `increment_ai_usage(year_month, cost_usd)`（atomic upsert RPC；service_role only）
- `supabase/01_drop/12_ai_analysis.sql`

### Tests

- `tests/ai-analysis/ai-analysis-pure.test.ts`
- `tests/ai-analysis/analysis-data-mappers.test.ts`

---

## Completed Milestones (Phase 1)

- DB schema/RPC 落地：`12_ai_analysis.sql`（tables/indexes/RLS/GRANT + RPC）
- Data collection layer 落地：4 dataTypes 的 IO fetchers + pure mappers + facade
- Background worker 落地：`/api/cron/ai-analysis` 可處理 pending → running → completed/incomplete/failed
- IO bloat refactor（Phase 1）：`analysis-run-io.ts` 已改為 facade；OpenRouter execution/Models 拆出獨立 modules

---

## Follow-ups (Active Tracker)

- Active TODOs / 修復步驟請以 `uiux_refactor.md` §6.2.2 為準（避免 archive 與現況漂移）。

