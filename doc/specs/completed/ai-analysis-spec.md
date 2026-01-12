# AI Analysis Spec（Admin-only）

> Status: Stable  
> Last Updated: 2026-01-11  
> Note: if referenced by in-code `@see`, keep headings stable (avoid renumbering/moving sections).

## 1. Purpose

定義 AI Analysis（後台）的**技術契約與流程**：report 產生、資料蒐集/去識別化、成本估算、排程執行、以及 share links 的公開讀取模型。

PRD（why/決策/產品邊界）請看：`doc/specs/completed/AI_ANALYSIS_v2.md`  
Ops enablement（env/cron/驗證）請看：`doc/runbook/ai-analysis.md`

## 2. Components（SSoT paths）

- Schema / DB scripts:
  - `supabase/02_add/12_ai_analysis.sql`（reports/usage/schedules + RPC）
  - `supabase/02_add/15_ai_analysis_templates.sql`（custom templates）
  - `supabase/02_add/17_ai_analysis_custom_template_refs.sql`（custom_template_id constraints）
  - `supabase/02_add/18_ai_analysis_report_shares.sql`（share links + public RPC）
- App endpoints:
  - Admin UI: `app/[locale]/admin/(data)/ai-analysis/*`, `app/[locale]/admin/reports/*`
  - Cron:
    - `app/api/cron/ai-analysis-scheduler/route.ts`（schedule → pending reports）
    - `app/api/cron/ai-analysis/route.ts`（process pending reports）
  - Public share page: `app/[locale]/ai-analysis/share/[token]/page.tsx`
- IO modules:
  - Facade: `lib/modules/ai-analysis/io.ts`
  - Execution: `lib/modules/ai-analysis/analysis-run-io.ts`, `lib/infrastructure/openrouter/openrouter-run-io.ts`
  - Data collection: `lib/modules/ai-analysis/analysis-data-io.ts`
  - De-identification + cost: `lib/modules/ai-analysis/analysis-pure.ts`
  - Reports: `lib/modules/ai-analysis/analysis-report-io.ts`, `lib/modules/ai-analysis/analysis-reports-read-io.ts`, `lib/modules/ai-analysis/analysis-reports-write-io.ts`
  - Schedules: `lib/modules/ai-analysis/analysis-schedules-io.ts`
  - Templates: `lib/modules/ai-analysis/analysis-templates-io.ts`
  - Share links: `lib/modules/ai-analysis/report-shares-io.ts`
- Types / validators:
  - Types (SSoT): `lib/types/ai-analysis.ts`
  - Validators: `lib/validators/ai-analysis.ts`, `lib/validators/reports.ts`
- Historical code maps (non-SSoT):
  - `doc/archive/2025-12-30-ai-analysis-implementation.md`
  - `doc/archive/2025-12-31-ai-analysis-e2e-hardening.md`

## 3. Security Model（summary）

- Secrets:
  - OpenRouter key：`OPENROUTER_API_KEY`（server-only env）
  - Cron auth：`CRON_SECRET`（protects `/api/cron/*`）
- RLS & service role:
  - Admin UI / CRUD：cookie-based server client + RLS（Owner/Editor roles）
  - Background processing / usage increments：service role client（`SECURITY DEFINER` RPCs）
- Data privacy:
- 送往 LLM 的資料必須先去識別化（`lib/modules/ai-analysis/analysis-pure.ts`）
  - 禁止把 PII（email/姓名/電話/地址/IP 等）送進 prompt 或 dataset

## 4. Data Model / Contracts

### 4.1 Core tables（概念）

- Reports: `public.ai_analysis_reports`
  - key fields: `template_id`, `custom_template_id`, `filters`, `data_types`, `mode`, `model_id`, `status`, `result`, `cost_usd`
- Usage: `public.ai_usage_monthly`
  - key fields: `year_month`, `total_cost_usd`, `analysis_count`
- Schedules: `public.ai_analysis_schedules`
  - key fields: `schedule_cron`, `timezone`, `next_run_at`, `is_enabled`, `template_id`, `custom_template_id`
- Custom templates: `public.ai_analysis_templates`
  - key fields: `name`, `prompt_text`, `is_enabled`

### 4.2 Custom templates（cross-field invariants）

DB constraints（see `supabase/02_add/17_ai_analysis_custom_template_refs.sql`）：

- `template_id='custom'` ↔ `custom_template_id IS NOT NULL`
- `template_id!='custom'` ↔ `custom_template_id IS NULL`

### 4.3 Share links（public read）

<a id="share-links"></a>

- Table: `public.ai_analysis_report_shares`
  - token: 64-char hex（256-bit entropy）
  - supports: `expires_at`, `revoked_at`
- Public fetch RPC: `public.get_shared_ai_report(p_token)`
  - `GRANT EXECUTE TO anon`
  - **whitelist-only return**（no internal IDs / filters / user identifiers）
- Public page requirements:
  - `robots: noindex`
  - `dynamic = 'force-dynamic'`（避免 revoke/expiry 後讀到 stale cache）

<a id="templates-data-types"></a>

### 4.4 Templates / Data Types（selection contract）

- Template IDs（SSoT types）：`lib/types/ai-analysis.ts` → `AnalysisTemplateId`
  - built-in: `user_behavior`, `sales`, `rfm`, `content_recommendation`
  - custom: `custom` + `customTemplateId` / `custom_template_id`
- Required/optional data types（SSoT constants）：
  - `lib/types/ai-analysis.ts` → `ANALYSIS_TEMPLATES`
- Control Center auto-selection:
  - When analysis is launched from Control Center, required data types must be auto-selected (UI behavior; enforced by request composition).

### 4.5 Cost control（estimate + sampling）

- Cost estimate must be computed before execution:
  - Estimation/pure functions: `lib/modules/ai-analysis/analysis-pure.ts`
  - Thresholds/types: `lib/types/ai-analysis.ts` (`COST_THRESHOLDS`, warnings)
- Pricing source:
  - Models/pricing fetch: `lib/infrastructure/openrouter/openrouter-models-io.ts` (with fallback pricing to avoid manual drift)
- Sampling is allowed to cap cost for large datasets:
  - Deterministic sampling seed: report id (see cron worker usage)
  - Sampling strategy must keep high-priority records first (e.g. orders) before sampling the rest.

### 4.6 De-identification（no PII to LLM）

- All datasets must be de-identified before composing prompts:
  - `lib/modules/ai-analysis/analysis-pure.ts` → `deidentifyData` / `deidentifyRecord`
- Do not send the following to LLM:
  - email / name / phone / address
  - IP / device fingerprint
  - any share tokens
- Admin UI may show user-friendly identifiers (e.g. short ids), but LLM input must only contain anonymized user keys.

<a id="member-short-id"></a>

#### Member Short ID（admin-only display）

- Storage: `customer_profiles.short_id`（DB schema: `supabase/02_add/07_shop.sql`）
- Format rules (UI/ops contract):
  - Prefix `C` + increasing integer (no zero-padding), e.g. `C1`, `C2`, `C1234`
  - Not reused after deletion (avoid ambiguity)
- Usage:
  - Admin UI can use short id for selection/deep links (e.g. `?memberShortId=C1`)
  - AI input must still be de-identified (short id is for admin UX, not LLM identity)

## 5. Flows

### 5.1 Manual (Admin UI)

1. Admin selects template + filters + dataTypes + mode + modelId
2. Server creates a pending report row (`ai_analysis_reports`)
3. Background execution runs:
   - fetch dataset (with sampling when needed)
   - de-identify → compose prompt → call OpenRouter
4. Update report status/result and record usage (`ai_usage_monthly`)

#### 5.1.1 Admin UI i18n / icon policy（cross-cutting）

- Admin UI 文案需支援 `adminLocale`（UI preference）且不依賴 URL locale（see: `doc/specs/proposed/admin-i18n-toggle-spec.md`）。
- 專有名詞不翻譯：`Prompt`, `Data Types`, `RAG`, `Embedding`, `Token` 等維持英文。
- 除 AdminSidebar 導航 icon 外，AI Analysis panel content 不使用 icon/emoji/svg（避免 UI/文案 drift）。

#### 5.1.2 Template selection contract（built-in + custom）

- Built-in templates：
  - Template IDs（SSoT types）：`lib/types/ai-analysis.ts` → `AnalysisTemplateId`
  - UI 顯示需以 `messages/*` 定義的文案為準（避免 hard-coded drift）
- Custom templates：
  - `templateId === 'custom'` 時，UI 必須要求 `customTemplateId`（UUID）
  - selection list：Owner 可看所有 templates；Editor 只能看 `is_enabled=true` templates（以 RLS/IO 角色規則為準）
  - disabled template 不可用於建立新 report/schedule（避免 worker fetch promptText 時回 `null`）

#### 5.1.3 Data Types selection contract

- Built-in templates：
  - required data types 必須 auto-selected + locked（UI behavior；見 `lib/types/ai-analysis.ts` → `ANALYSIS_TEMPLATES`）
  - optional data types 可由 Admin 勾選
- Custom templates：
  - 不存在 required data types（DB schema 不包含這個維度）
  - UI 必須要求至少選 1 個 `dataTypes`（避免送出空 dataset）

#### 5.1.4 Custom templates management contract（Owner-only）

- CRUD fields:
  - `name`, `prompt_text`, `is_enabled`
- Access control:
  - Owner: create/update/delete/toggle enabled
  - Editor: read enabled templates only（for selection）
- Safety:
  - 仍強制 de-identification（custom Prompt 只是「指令」，資料仍需先 `deidentifyData`）
  - UI 需提示：禁止輸入 PII 到 Prompt（但不在 panel content 使用 icon/emoji）

### 5.2 Scheduled Reports (Cron)

<a id="scheduled-reports"></a>

1. Scheduler: `/api/cron/ai-analysis-scheduler`
   - finds due schedules (`next_run_at`)
   - creates pending reports for each due schedule
   - advances schedule `next_run_at`
2. Worker: `/api/cron/ai-analysis`
   - processes pending reports (bounded per invocation)
   - updates report rows + records monthly usage

Enablement + smoke test: `doc/runbook/ai-analysis.md`

### 5.3 RAG Mode（optional）

- When `mode='rag'`, context retrieval must follow:
  - RAG retrieval contracts: `doc/specs/completed/embeddings-semantic-search-spec.md#33-rag檢索增強生成`
  - Build analysis dataset from retrieved chunks（whitelisted, de-identified）

### 5.4 Public Share Link（read-only）

1. Owner creates share link for a report (RLS owner-only)
2. Token is inserted into `ai_analysis_report_shares`
3. Public viewer opens `/<locale>/ai-analysis/share/<token>`
4. Page validates token format and calls `get_shared_ai_report`
5. Viewer renders report markdown (read-only, noindex)

## 6. Idempotency / Concurrency（operational）

- Cron processing must be bounded per invocation（avoid long-running timeouts）
- Scheduled report creation must be safe under retries (scheduler may be called multiple times)
- Share tokens are immutable; revocation/expiry must be enforced in RPC (not UI)

## 7. Related Docs

- Implemented behavior (SSoT): `../../SPEC.md`（AI Analysis section）
- Constraints: `../../../ARCHITECTURE.md`（Data Intelligence / server-only / IO boundaries）
- Security policies: `../../SECURITY.md`
- Ops / verification: `../../RUNBOOK.md` → `../../runbook/ai-analysis.md`
- Proposals (why): `AI_ANALYSIS_v2.md`
- Implementation logs: `../../archive/README.md`
