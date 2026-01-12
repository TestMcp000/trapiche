# Step-by-Step Execution Plan — Go‑Live Readiness + Drift Alignment

> Status: **ARCHIVED / COMPLETE**  
> Last Updated: 2026-01-04  
> Owner: Site Owner  
> Scope: execution plan (PR‑granular). Implemented behavior is SSoT in `doc/SPEC.md`.  
> Audience: executor agent（照本檔逐 PR 執行；每個 PR merge 後更新本檔）  
> Mode: **B — Alignment gate**（偵測 drift/歧義/衝突時：先對齊再規劃 PR）  
> PRD Input: `doc/PRD_ACTIVE.md`（目前仍為 template；本次以 SSoT 對齊 + bundle/DRY 檢查為主）

## Inputs（以 SSoT 為準；tracking docs 只當線索）

- Architecture / global constraints: `ARCHITECTURE.md`
- Implemented behavior (what exists now): `doc/SPEC.md`
- Security / RLS / secrets / cron: `doc/SECURITY.md`
- Ops / verification: `doc/RUNBOOK.md`（details: `doc/runbook/*`）
- Docs SRP + update matrix: `doc/GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see`）: `uiux_refactor.md`
- Tracking (unblocked steps): `doc/TASKS.md`
- Tracking (external deps): `doc/BLOCKERS.md`
- Tracking (what/why/status only): `doc/ROADMAP.md`

## Historical / Completed References（不要再當成 active plan）

- Data Intelligence A1/A2/A3 completed plan (archived): `doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md`

---

## 0. TL;DR（執行順序）

1. **PR-0（P0）** ✅：清理 drift（SITE_URL 單一來源 + docs 同步 + 歸檔/清理 tracking docs）— COMPLETE
2. **PR-1（P2）** ✅：`robots.txt`（SEO + admin isolation）— COMPLETE
3. **PR-2（P2）** ✅：Inventory cleanup cron（釋放過期 reservations）— COMPLETE
4. **PR-3（P1）** ✅：Error monitoring（Sentry integration）— COMPLETE
5. **PR-4（P3）** ✅：刪除/處理 `NextStepsCTA` dead code — COMPLETE
6. **PR-5（P2）** ✅：Performance baseline（Lighthouse + bundle analyze）並歸檔報告 — COMPLETE
7. **PR-6（P3）** ✅：Server-only guardrails（防止重型 server modules 誤入 client bundle）— COMPLETE
8. **PR-7（P3）** ✅：DRY locale content picker（收斂重複 locale 分支）— COMPLETE

Ops gates（不一定需要 code PR，但必須在 go‑live 前完成）：

- **OPS-1（P0）**：Production DB alignment（依 `doc/runbook/database-ops.md`）
- **OPS-2（P0）**：Theme console manual verification（依 `doc/ROADMAP.md` + `doc/SPEC.md` Theme System）
- **OPS-3（P0）**：Pre‑release guardrails（依 `uiux_refactor.md` §2 checklist）

Blocked（外部依賴；不要塞在本 plan 內重複寫）：

- **Stripe Checkout Session（P1）**：見 [`doc/BLOCKERS.md#stripe`](../BLOCKERS.md#stripe), [`doc/specs/proposed/payments-initiation-spec.md#stripe-checkout-session`](../specs/proposed/payments-initiation-spec.md#stripe-checkout-session)

---

## 1. Constraints（Non‑Negotiables）

- API routes 只做 parse/validate → call `lib/**` → return（禁止 `.from('...')` / `createAdminClient()`）：`ARCHITECTURE.md`（§4.6）+ `tests/architecture-boundaries.test.ts`
- 所有 IO modules 必須 `import 'server-only';` 且集中在 `lib/**/io.ts` / `lib/**/*-io.ts`：`ARCHITECTURE.md`（§3.0, §3.4, §4.6）
- Secrets 不進 `NEXT_PUBLIC_*`；cron 必須驗 `CRON_SECRET`：`doc/SECURITY.md`（§3.3, §3.5）
- RLS 是最終安全邊界（service_role bypass 時必須有嚴格 RBAC gate）：`ARCHITECTURE.md` + `doc/SECURITY.md`
- Docs SRP / update matrix（改 code 要同步哪些 docs）：`doc/GOVERNANCE.md`

---

## 2. Alignment Check（現況 + drift）

### What exists now（evidence paths）

- URL single source 已落地：`lib/site/site-url.ts`（唯一讀 `NEXT_PUBLIC_SITE_URL`）；`lib/seo/hreflang.ts` 僅 re-export `SITE_URL`
- Cron dispatcher 使用 canonical `SITE_URL`：`app/api/cron/embedding-queue/route.ts`
- Admin heavy deps 已 lazy load（避免污染 public bundle）：
  - `components/admin/shop/ShopDashboardCharts.tsx`（dynamic import `recharts`）
  - `components/admin/common/ImageUploader.tsx`（dynamic import `react-image-crop`）
- Bundle baseline（已歸檔）：`doc/archive/2026-01-03-performance-baseline.md`

### Drift List（ACTIVE）

- ✅ No active drift found for audited checks (SEO URL single source, API route IO guardrails, heavy deps leak).
  - Evidence: `rg -n "NEXT_PUBLIC_SITE_URL" app components lib` 只命中 `lib/site/site-url.ts`
  - Evidence: `rg -n "\.from\('\w" app components` 0 hits
  - Evidence: `rg --files-without-match "import 'server-only';" lib --glob "**/io.ts" --glob "**/*-io.ts"` 0 hits
  - Evidence: `rg -n "\brecharts\b" app components` 只命中 `components/admin/**`

### Drift List（RESOLVED / ARCHIVED）

#### Drift D1 — `SITE_URL` 單一來源（Resolved）

- Doc claim: `ARCHITECTURE.md` §3.11（SEO / URL 單一來源）
- Evidence (now):
  - `lib/site/site-url.ts`
  - `lib/seo/hreflang.ts`（re-export `SITE_URL`）
  - `app/api/cron/embedding-queue/route.ts`（worker url uses `SITE_URL`）
- 分類：implementation drift（已修復）+ doc drift（已同步）

#### Drift D2 — AI Analysis contracts/flows location（Resolved）

- Evidence:
  - `doc/specs/completed/ai-analysis-spec.md`
  - `doc/SPEC.md`（AI Analysis section links to specs; no duplicated contracts）
- 分類：doc drift（已修復；SRP/DRY）

#### Drift D3 — Docs tracking hygiene（Resolved）

- Evidence: `doc/TASKS.md` / `doc/BLOCKERS.md` / `doc/ROADMAP.md` 維持 tracking-only；completed logs 在 `doc/archive/*`
- 分類：doc drift（已修復）

---

## 3. Step Plan（以 PR 為粒度）

> 每個 PR 都要能獨立 merge；每個 PR 結尾都要跑 docs 檢查與基本測試（至少 type-check + lint）。

---

## PR-0 — Drift Alignment（SITE_URL 單一來源 + docs 同步 + 歸檔/清理）【P0】✅ COMPLETE

### Status

- ✅ Completed: 2026-01-03
- ✅ Verified: `rg -n "NEXT_PUBLIC_SITE_URL" app components lib` 只命中 `lib/site/site-url.ts`

### Goal

- 讓 `doc/SPEC.md` / `doc/SECURITY.md` / `doc/specs/completed/*` 與現況一致，並把「已完成」內容移出 tracking docs。
- 落實 `SITE_URL` 單一來源（避免 `NEXT_PUBLIC_SITE_URL` 被多處讀取造成 drift）。

### Scope

- ✅ Create `lib/site/site-url.ts`（唯一允許讀 `NEXT_PUBLIC_SITE_URL`）
- ✅ Refactor `lib/seo/hreflang.ts` / `app/api/cron/embedding-queue/route.ts` 走 single source
- ✅ Docs sync: `doc/SPEC.md`, `doc/SECURITY.md`, `doc/specs/completed/AI_ANALYSIS_v2.md`
- ✅ Archive / cleanup: `doc/TASKS.md`, `doc/meta/AGENT_PROMPT__STEP_PLAN__DRIFT.md`
- ✅ Update references to archived plan: `doc/ROADMAP.md` + code `@see`

### Expected file touches

- Code:
  - `lib/site/site-url.ts` (new)
  - `lib/seo/hreflang.ts`
  - `app/api/cron/embedding-queue/route.ts`
  - `lib/ai-analysis/report-shares-io.ts`（comment link）
  - `lib/ai-analysis/analysis-templates-io.ts`（comment link）
  - `app/[locale]/ai-analysis/share/[token]/page.tsx`（comment link）
- Docs:
  - `doc/SPEC.md`
  - `doc/SECURITY.md`
  - `doc/specs/completed/AI_ANALYSIS_v2.md`
  - `doc/TASKS.md`
  - `doc/ROADMAP.md`
  - `doc/meta/AGENT_PROMPT__STEP_PLAN__DRIFT.md`
  - `doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md`（已存在；只當歷史）

### Steps

1. **Archive 完成的 plan**
   - 確認 `doc/meta/STEP_PLAN.md`（舊的 Data Intelligence plan）已移至 `doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md`
2. **建立 `SITE_URL` single source**
   - 新增 `lib/site/site-url.ts`
   - 行為要求：
     - dev：`NEXT_PUBLIC_SITE_URL` 缺省時 fallback `http://localhost:3000`
     - prod：缺少 `NEXT_PUBLIC_SITE_URL` 必須 fail fast（避免 SEO/worker URL 默默錯）
     - strip trailing slash
3. **Refactor 讀取點**
   - `lib/seo/hreflang.ts`：移除直接讀 `process.env.NEXT_PUBLIC_SITE_URL`，改 import `SITE_URL`（re-export 保持相容）
   - `app/api/cron/embedding-queue/route.ts`：`getWorkerUrl()` 改用 `SITE_URL`（僅在無法取 public URL 時才 fallback `new URL(request.url)`）
4. **Docs 同步（SSoT）**
   - `doc/SPEC.md`：
     - Data Intelligence modules（Import/Export / AI Analysis / Embeddings / Preprocessing）：只保留 implemented inventory + links（contracts/flows 以 `specs/*` 為準）
     - Known Gaps：保留真正未完成項（例如 analytics dashboard、payments initiation）
     - SEO URL single source：避免重複抄規則；改 link 到 `ARCHITECTURE.md` §3.11
   - `doc/SECURITY.md`：
     - Analytics ingestion / share links：改成 link 到 `doc/specs/completed/page-views-analytics-spec.md` + `doc/specs/completed/ai-analysis-spec.md#share-links`
   - `doc/specs/completed/AI_ANALYSIS_v2.md`：
     - PRD 瘦身：只保留 why/decisions/acceptance；technical spec link 到 `doc/specs/completed/ai-analysis-spec.md`
5. **Tracking docs cleanup**

- `doc/TASKS.md`：移除 Completed 區塊（歷史請改 link 到 `doc/archive/*`）
- `doc/ROADMAP.md`：Data Intelligence 的 links 改指向 `doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md`

6. **Meta doc cleanup**
   - `doc/meta/AGENT_PROMPT__STEP_PLAN.md` / `doc/meta/AGENT_PROMPT__STEP_PLAN__DRIFT.md`：補上「單一功能契約/流程 → specs/\*」路由規則
7. **Docs validation**
   - `npm run docs:generate-indexes`
   - `npm run lint:md-links`
   - `npm run docs:check-indexes`
8. **Code validation**
   - `npm test`
   - `npm run type-check`
   - `npm run lint`
9. **Drift re-check**
   - `rg -n "process\.env\.NEXT_PUBLIC_SITE_URL" app lib components` 應只命中 `lib/site/site-url.ts`

### Verification（Acceptance）

- `SITE_URL` 的來源只剩 `lib/site/site-url.ts`
- `doc/SPEC.md` / `doc/SECURITY.md` / `doc/specs/completed/AI_ANALYSIS_v2.md` 不再宣稱 A1/A2/A3 未實作
- `doc/TASKS.md` 僅保留未完成項
- docs scripts 全綠（indexes + links）

### Docs updates（per `doc/GOVERNANCE.md`）

- 變更 SEO/URL single source：`doc/SPEC.md`（SEO）+ 必要時 `doc/runbook/deployment.md`
- 變更 share links 安全設計：`doc/specs/completed/ai-analysis-spec.md#share-links`（`doc/SECURITY.md` 只留連結）
- 變更已落地行為：`doc/SPEC.md`

### Rollback

- revert PR-0（docs + code refactor 皆可回滾；archive 檔案保留即可）

---

## PR-1 — `robots.txt`（MetadataRoute）【P2】✅ COMPLETE

### Status

- ✅ Completed: 2026-01-03
- ✅ Verified: type-check + lint + tests (866/866)

### Goal

- 增加 `robots.txt`，預設阻擋 `/admin/*`（SEO isolation）。

### Scope

- ✅ 新增 `app/robots.ts`（Next.js MetadataRoute）

### Expected file touches

- ✅ `app/robots.ts` (new)
- ✅ `doc/SPEC.md`（SEO features 更新）
- ✅ `doc/ROADMAP.md`（robots status 更新）
- ✅ `doc/TASKS.md`（移除已完成項目）

### Steps

1. ✅ 新增 `app/robots.ts`
2. ✅ 預設策略：
   - allow public pages
   - disallow `/admin/*`
3. ✅ 本機驗證：
   - `npm run dev`
   - `GET /robots.txt`（確認內容與 status）
4. ✅ 文件同步：
   - `doc/SPEC.md`（SEO 章節：robots shipped）
   - `doc/ROADMAP.md`（robots item status → Complete）
   - `doc/TASKS.md`（移除 §1 Robots.txt；重新編號後續 sections）

### Verification

- ✅ `/robots.txt` 可取得且內容符合預期
- ✅ type-check: 0 errors
- ✅ lint: 0 errors (1 unrelated warning)
- ✅ tests: 866/866 passed

### Rollback

- revert PR-1

---

## PR-2 — Inventory Cleanup Job（釋放過期 reservations）【P2】✅ COMPLETE

### Status

- ✅ Completed: 2026-01-03
- ✅ Verified: type-check + lint + tests (866/866)

### Goal

- 把既有 `release_expired_reservations()` RPC 接到 cron，避免 reservations 堆積。

### Scope

- ✅ 新增 `app/api/cron/inventory-cleanup/route.ts`（cron endpoint）
- ✅ 新增 `lib/shop/inventory-cleanup-io.ts`（server-only IO）

### Expected file touches

- ✅ `app/api/cron/inventory-cleanup/route.ts` (new)
- ✅ `lib/shop/inventory-cleanup-io.ts` (new)
- ✅ `doc/meta/STEP_PLAN.md`（本檔；status 更新）
- ✅ `doc/TASKS.md`（移除已完成項目）
- ✅ `doc/ROADMAP.md`（status → Complete）

### Steps

1. ✅ 新增 cron endpoint（`/api/cron/inventory-cleanup`）
2. ✅ `CRON_SECRET` 驗證（對齊 `doc/SECURITY.md` §3.5）
3. ✅ 新增 `lib/shop/inventory-cleanup-io.ts`（`import 'server-only';`）
4. ✅ endpoint 只做 validate → call IO → return JSON
5. 部署後排程：
   - Vercel Cron（`vercel.json` 或 Dashboard）：`*/5 * * * *`（每 5 分鐘）
   - 或 Supabase pg_cron（已在 DB 內設定）

### Verification

- ✅ type-check: 0 errors
- ✅ lint: 0 errors (1 unrelated warning)
- ✅ tests: 866/866 passed
- endpoint 401/200 行為：已實作（手動測試需部署或本機 dev server）

### Rollback

- 先停 cron；再 revert PR

---

## PR-3 — Error Monitoring（Provider Integration）【P1】✅ COMPLETE

### Status

- ✅ Completed: 2026-01-03
- ✅ Verified: type-check + lint + tests (866/866)

### Goal

- production 能快速看到/追蹤錯誤（server + client），具備最小 triage 能力。

### Scope

- ✅ 選定 Sentry 作為 provider
- ✅ 安裝 `@sentry/nextjs`
- ✅ 新增 `sentry.client.config.ts`（client-side init）
- ✅ 新增 `sentry.server.config.ts`（server-side init）
- ✅ 新增 `sentry.edge.config.ts`（edge runtime init）
- ✅ 新增 `instrumentation.ts`（Next.js instrumentation hook）
- ✅ 新增 `lib/monitoring/sentry.ts`（server-only wrapper）
- ✅ 新增 `app/global-error.tsx`（error boundary）
- ✅ 更新 `next.config.ts`（withSentryConfig wrapper）

### Expected file touches

- ✅ `sentry.client.config.ts` (new)
- ✅ `sentry.server.config.ts` (new)
- ✅ `sentry.edge.config.ts` (new)
- ✅ `instrumentation.ts` (new)
- ✅ `lib/monitoring/sentry.ts` (new)
- ✅ `app/global-error.tsx` (new)
- ✅ `next.config.ts` (modified)
- ✅ `README.md` (env template)
- ✅ `doc/RUNBOOK.md` (verification entry)
- ✅ `doc/ROADMAP.md` (status → Complete)
- ✅ `doc/TASKS.md` (removed completed item)

### Verification

- ✅ type-check: 0 errors
- ✅ lint: 0 errors (1 unrelated warning)
- ✅ tests: 866/866 passed
- secrets 不進 `NEXT_PUBLIC_*`（✅ SENTRY_AUTH_TOKEN 是 server-only）

### Rollback

- `npm uninstall @sentry/nextjs`
- 刪除 `sentry.*.config.ts`, `instrumentation.ts`, `lib/monitoring/`, `app/global-error.tsx`
- 還原 `next.config.ts`

---

## PR-4 — Cleanup `components/blog/NextStepsCTA.tsx`【P3】✅ COMPLETE

### Status

- ✅ Completed: 2026-01-03
- ✅ Verified: type-check + lint + tests

### Goal

- 移除未使用元件（或重新接回並寫清楚用途），避免維護誤判與 bundle drift。

### Steps

1. ✅ `rg -n "NextStepsCTA" app components` 確認引用點 — 無引用
2. ✅ 刪除 `components/blog/NextStepsCTA.tsx`
3. ✅ 更新 `doc/TASKS.md`（移除 §2）
4. ✅ 更新 `doc/ROADMAP.md`（Cleanup → Complete）
5. ✅ 驗證：`npm test` + `npm run type-check` + `npm run lint`

### Verification

- ✅ type-check: 0 errors
- ✅ lint: 0 errors
- ✅ tests: all passed

---

## PR-5 — Performance Re‑measurement（baseline + 歸檔）【P2】✅ COMPLETE

### Status

- ✅ Completed: 2026-01-03
- ✅ Verified: bundle analysis + drift checks + tests (866/866)

### Goal

- 建立新的效能 baseline，並確認 scrollytelling client 僅在需要時載入。

### Scope

- ✅ Bundle analysis with `@next/bundle-analyzer`
- ✅ Drift checks (uiux_refactor.md §2 grep checklist)
- ✅ Archive report creation

### Expected file touches

- ✅ `.next/analyze/*.html` (bundle reports)
- ✅ `doc/archive/2026-01-03-performance-baseline.md` (new)
- ✅ `doc/meta/STEP_PLAN.md` (本檔；status 更新)

### Steps

1. ✅ Bundle analysis (`npx cross-env ANALYZE=true next build --webpack`)
   - Reports generated: `nodejs.html`, `edge.html`, `client.html`
2. ✅ Drift checks (uiux_refactor.md §2):
   - `recharts` in public UI: 0 hits ✅
   - `openrouter` in components: 0 hits ✅
   - `.vercel.app` hardcoded: 0 hits ✅
   - Admin heavy deps leak: none ✅
3. ✅ No regression found — all architecture boundaries maintained
4. ✅ Archive report created:
   - `doc/archive/2026-01-03-performance-baseline.md`

### Verification

- ✅ type-check: 0 errors
- ✅ lint: 0 errors (1 unrelated warning)
- ✅ tests: 866/866 passed
- ✅ build: exit code 0 (124 pages)

### Rollback

- Delete `doc/archive/2026-01-03-performance-baseline.md`

---

## PR-6 — Server-only Guardrails（heavy server modules）【P3】✅ COMPLETE

### Status

- ✅ Completed: 2026-01-04
- ✅ Verified: type-check + lint + tests (866/866)

### Goal

- 防止重型 server-only modules（remark/rehype、gray-matter 等）被誤 import 到 client components，導致一次性載入 bundle 過大或 build/runtime 問題。

### Scope

- ✅ 將以下模組明確標記為 server-only：
  - `lib/markdown/server.ts`（remark/rehype pipeline）
  - `lib/import-export/parsers/blog-post-markdown.ts`（gray-matter）

### Expected file touches

- ✅ `lib/markdown/server.ts`
- ✅ `lib/import-export/parsers/blog-post-markdown.ts`
- ✅ `scripts/test-alias.cjs`（added server-only mock for test environment）

### Steps

1. ✅ 在上述檔案頂部加入 `import 'server-only';`
2. ✅ 確認沒有 client components 直接 import 這些模組：
   - `TextSection.tsx`, `TextImageSection.tsx`, `CtaSection.tsx` 皆為 server components（無 'use client'）
3. ✅ 更新 `scripts/test-alias.cjs` 以 mock `server-only` 避免測試失敗
4. ✅ 驗證：`npm test` + `npm run type-check` + `npm run lint`

### Verification（Acceptance）

- ✅ `lib/markdown/server.ts` / `lib/import-export/parsers/blog-post-markdown.ts` 皆有 `import 'server-only';`
- ✅ type-check: 0 errors
- ✅ lint: 0 errors (1 unrelated warning)
- ✅ tests: 866/866 passed

### Docs updates（per `doc/GOVERNANCE.md`）

- None（行為不變；僅加強 guardrails）

### Rollback

- revert 兩個 `server-only` marker 變更 + `scripts/test-alias.cjs` 變更

---

## PR-7 — DRY Locale Content Picker（避免重複造輪子）【P3】✅ COMPLETE

### Status

- ✅ Completed: 2026-01-04
- ✅ Verified: type-check (0 errors) + lint (0 errors) + tests (874/874)

### Goal

- 收斂多處重複的 `locale === 'zh' ? content_zh : content_en` 分支，降低 drift 風險並讓 fallback 策略一致。

### Scope

- ✅ 新增 pure helper：`lib/i18n/pick-locale.ts`
- ✅ 新增 unit tests：`tests/i18n/pick-locale.test.ts`
- ✅ Refactor 既有使用點：
  - `components/Header.tsx`
  - `components/Footer.tsx`
  - `app/[locale]/page.tsx`

### Expected file touches

- ✅ `lib/i18n/pick-locale.ts` (new)
- ✅ `tests/i18n/pick-locale.test.ts` (new)
- ✅ `components/Header.tsx`
- ✅ `components/Footer.tsx`
- ✅ `app/[locale]/page.tsx`

### Steps

1. ✅ 建立 helper `pickLocaleContent<T>` 與 `pickLocale<T>`
2. ✅ 將 `Header` / `Footer` / `HomePage` 的 locale 分支改用 helper
3. ✅ 驗證：`npm test` + `npm run type-check` + `npm run lint`

### Verification（Acceptance）

- ✅ 三個使用點不再各自手寫 locale 分支
- ✅ type-check: 0 errors
- ✅ lint: 0 errors (1 unrelated warning)
- ✅ tests: 874/874 passed (including 8 new pick-locale tests)

### Docs updates（per `doc/GOVERNANCE.md`）

- None（行為不變；純 refactor / DRY）

### Rollback

- revert helper 與三個使用點 refactor

---

## 4. Tracking Sync（每個 PR 結尾）

- `doc/ROADMAP.md`：只更新 status/risks + links（不要塞 steps）
- `doc/TASKS.md`：只保留「未完成 + 可立即開始」項目
- `doc/BLOCKERS.md`：外部依賴（keys/approval）才放進來
- 跑 docs scripts：
  - `npm run docs:generate-indexes`
  - `npm run lint:md-links`
  - `npm run docs:check-indexes`
