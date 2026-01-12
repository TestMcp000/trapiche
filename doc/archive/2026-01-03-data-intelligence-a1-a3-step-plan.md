# 2026-01-03 - Data Intelligence Drift A1/A2/A3 Step Plan (Archive)

> Status: **COMPLETE** ✅（All PRs implemented; tracking hygiene done 2026-01-03）  
> Source Inputs（以 SSoT 為準，drift 只當線索）：
>
> - Drift tracker: `doc/meta/AGENT_PROMPT__STEP_PLAN__DRIFT.md`（Appendix A/B; Drift A1–A4）
> - AI Analysis PRD: `doc/specs/completed/AI_ANALYSIS_v2.md`（Phase 3: Custom prompt + share links）
> - Data Intelligence PRD: `doc/specs/completed/DATA_INTELLIGENCE.md`（Decision #4: Page views）  
>   Last Updated: 2026-01-03  
>   Owner: Site Owner

## Summary (When / What / Why / How)

- When: 2026-01-03
- What: implemented A1 (page views ingestion), A2 (AI custom templates), A3 (AI share links), plus DB tooling alignment and tracking hygiene.
- Why: close tracked drift items and make the Data Intelligence platform’s shipped state match docs + guardrails.
- How: delivered via PR-1..PR-5 with DB tooling, runtime wiring, RBAC, security hardening (noindex + whitelist fields), and doc/index updates.
- Result: A1/A2/A3 shipped and reflected in SSoT/tracking docs; this file remains as the archived execution record.

## 0. TL;DR（3–7 行）

- ✅ 交付完成：A1 page views runtime、A2 AI custom templates、A3 AI share links，以及 A4 DB tooling alignment。
- PR 順序：PR-1（DB tooling ✅）→ PR-2（A1 runtime ✅）→ PR-3（A2 custom templates ✅）→ PR-4（A3 share links ✅）→ PR-5（tracking + docs hygiene ✅）
- 風險已處理：A1 環境變數 gated、A3 crypto random token + noindex + whitelist fields
- 文件已同步：`doc/ROADMAP.md`, `doc/TASKS.md`, `doc/SPEC.md`, `doc/SECURITY.md`, `README.md`

## 1. SSoT Map（先對齊：衝突以此為準）

- Architecture / global constraints: `ARCHITECTURE.md`
- Implemented behavior (what exists now): `doc/SPEC.md`
- Security / RLS / secrets / webhooks / cron: `doc/SECURITY.md`
- Ops / verification: `doc/RUNBOOK.md` + `doc/runbook/*`
- Docs SRP + update matrix: `doc/GOVERNANCE.md`
- Drift tracker + playbooks (stable `@see`): `uiux_refactor.md`
- Related proposals: `doc/specs/completed/AI_ANALYSIS_v2.md`, `doc/specs/completed/DATA_INTELLIGENCE.md`

## 2. Constraints（Non‑Negotiables）

> 只列「會影響這次設計/拆 PR」的規則；細節用檔案路徑指回 SSoT（避免重複敘述造成 drift）。

- API routes 禁止直接 Supabase 查詢／禁止直接用 service role：`ARCHITECTURE.md`（API Route IO Guardrails；對應測試 `tests/architecture-boundaries.test.ts`）
- server-only / secrets / SDK placement：`ARCHITECTURE.md`（Server-only 約束）+ `doc/SECURITY.md`（3.3/3.4/3.6）
- Cron endpoints 必須驗 `CRON_SECRET`：`doc/SECURITY.md`（3.5）
- RLS 是最終安全邊界；service_role bypass 時必須在 app layer 做嚴格 RBAC gate：`ARCHITECTURE.md` + `doc/SECURITY.md`
- Share links 安全設計：token 不可猜、預設 noindex、public fetch 只回傳必要欄位：`doc/SECURITY.md`（需新增章節補齊）+ 本計畫 PR-4
- Docs 更新遵循 SRP + update matrix：`doc/GOVERNANCE.md`

## 3. Boundaries（In Scope / Out of Scope）

### In Scope

#### A1 — Page View Analytics Runtime（落地到「可寫入」）

- DB：沿用既有聚合 schema（`supabase/02_add/16_page_views.sql`）— **只存 day/path/locale/count**（privacy-first）。
- Runtime：新增 public ingestion endpoint（`/api/analytics/pageview`）+ server-only IO（呼叫 `increment_page_view` RPC）+ client tracker（在 public navigation 時送一次）。
- Feature gating：新增 `NEXT_PUBLIC_ENABLE_PAGEVIEWS`（預設不啟用；production 需明確打開）。

#### A2 — AI Analysis Custom Templates（Owner CRUD + 可用於 report/schedule）

- DB：啟用 `ai_analysis_templates`（`supabase/02_add/15_ai_analysis_templates.sql`）並擴充 reports/schedules 支援 custom template ref（`custom_template_id` + constraint）。
- Backend：types/validators/IO/worker 全鏈路支援 `{ templateId: 'custom', customTemplateId: <uuid> }`。
- UI：Owner-only templates CRUD panel；report run form + schedule form 允許選 custom template；Editor 僅可讀/使用。
- Mode：custom templates 同時支援 `standard` + `rag`（若 RAG enabled）。

#### A3 — AI Analysis Share Links（public view + revoke/expiry + noindex）

- DB：新增 share table + secure fetch path（優先採用 `SECURITY DEFINER` RPC + `GRANT EXECUTE TO anon` 的「白名單欄位」設計）。
- Backend/UI：Owner 在 report detail 建立/複製/revoke share link（可選 expiry）。
- Public page：`/[locale]/ai-analysis/share/[token]` 可在未登入狀態下查看 report（read-only），並預設 `noindex`。

### Out of Scope

- A1：不做 per-user tracking、不存 IP/UA、不做 bot filtering/去重/轉換漏斗、也不做「完整 analytics dashboard」。
- A2：不做 templates versioning、分享模板給外部、多 Owner 的 multi-tenant 設計。
- A3：不做 share link 的搜尋/索引/瀏覽列表（除非驗收需要），不做 public 編輯/評論。

## 4. 現況（What exists now）

> 以 `doc/SPEC.md` 為準；下列 evidence 是「可查證的路徑」，不是推測。

### A1 — Page Views（只有 schema/RPC，runtime 未接）

- DB schema/RPC：`supabase/02_add/16_page_views.sql`（`page_view_daily` + `increment_page_view`）
- Drop script：`supabase/01_drop/16_page_views.sql`
- DB tooling/COMBINED 未收錄（導致 `db:add` 不會套用）：`scripts/db.mjs`, `supabase/COMBINED_ADD.sql`, `supabase/COMBINED_DROP.sql`
- Repo 無 runtime 呼叫點：搜尋 `increment_page_view` 僅命中 SQL（無 `app/api/**` / `lib/**` 呼叫）
- `doc/SPEC.md` 已標註為 Known Gap（Analytics → Page view tracking）

### A2 — AI Custom Templates（只有 table schema，且 constraint/validators 阻擋）

- Templates schema：`supabase/02_add/15_ai_analysis_templates.sql`
- Templates drop：`supabase/01_drop/15_ai_analysis_templates.sql`
- DB tooling/COMBINED 未收錄：`scripts/db.mjs`, `supabase/COMBINED_ADD.sql`
- Reports/Schedules template constraint 只允許內建模板：`supabase/02_add/12_ai_analysis.sql`（`template_id IN (...)`）
- App validators 只允許內建模板：`lib/validators/ai-analysis.ts`（`VALID_TEMPLATE_IDS`）
- 現有 AI Analysis 實作：`app/[locale]/admin/(data)/ai-analysis/*`, `lib/ai-analysis/**`, cron endpoints 皆不支援 custom templates

### A3 — AI Share Links（完全未落地）

- Repo 無 share schema：搜尋 `ai_analysis_report_shares` 無命中（目前 supabase 無對應檔案）
- Repo 無 share route：`app/**/share/**` 無相關 route
- Repo 無 share IO：`lib/ai-analysis/**` 無 share 相關模組

### A4 — DB 合併檔維護流程不足（root cause）

- `supabase/02_add/15_ai_analysis_templates.sql`、`supabase/02_add/16_page_views.sql` 已存在，但 `supabase/COMBINED_ADD.sql` 未更新收錄，造成 `npm run db:add` 無法套用。

## 5. 目標狀態（可驗收）

### A1 — Page Views（聚合寫入）

- [ ] 當 `NEXT_PUBLIC_ENABLE_PAGEVIEWS=true` 時：使用者進入任何 public page（含 client-side navigation）會觸發一次 `/api/analytics/pageview` 呼叫。
- [ ] `public.page_view_daily` 會出現對應 `day/path/locale` 的 `view_count` 遞增（SQL：`select * from public.page_view_daily order by day desc limit 20;`）。
- [ ] 不存 user identifiers（不存 email/user_id/anon_id/ip 等），僅存聚合欄位。
- [ ] 可隨時關閉：把 `NEXT_PUBLIC_ENABLE_PAGEVIEWS` 設為 false/移除即可停止送出。

### A2 — AI Custom Templates（Owner CRUD + report/schedule 可用）

- [ ] Owner 可在 AI Analysis admin UI 建立/更新/刪除/停用自訂模板（name + prompt_text）。
- [ ] Report run form 可選用自訂模板並成功產出 report（manual 或 cron worker 均可）。
- [ ] Schedule 可選用自訂模板，scheduler 產生 pending report 後，worker 能成功處理。
- [ ] Editor 僅能讀/使用 templates（不可 CRUD）。
- [ ] 既有 built-in templates / schedules / reports 行為不回歸。

### A3 — Share Links（public view + revoke/expiry + noindex）

- [ ] Owner 可在 report detail 建立 share link（token 不可猜）。
- [ ] 無登入狀態可開啟 `/[locale]/ai-analysis/share/[token]` 並看到 report markdown（read-only）。
- [ ] revoke 後 link 失效（回 404/410 擇一）；expiry 到期後同樣失效。
- [ ] Public page 預設 noindex（robots meta 或等效機制），避免 SEO 收錄。
- [ ] Public fetch 只回傳白名單欄位（不暴露 internal IDs/filters/userId 等）。

## 6. Step-by-step（拆 PR）

### PR-1 — DB Tooling Alignment（先修 A4 root cause；讓 schema 能被 `db:add` 套用）

- Goal: 修正「SQL 存在但 db tooling/COMBINED 未收錄」的 drift，讓 A1/A2 後續能在 fresh DB / reset 流程中可靠落地。
- Scope:
  - 把 `15_ai_analysis_templates.sql`、`16_page_views.sql` 納入 `scripts/db.mjs` + `supabase/COMBINED_ADD.sql`/`COMBINED_DROP.sql`
  - 補 runbook 說明（避免下一個人照 runbook 做卻缺 schema）
- Expected file touches:
  - `scripts/db.mjs`
  - `supabase/COMBINED_ADD.sql`
  - `supabase/COMBINED_DROP.sql`
  - `doc/runbook/database-ops.md`
- Steps:
  1. 更新 `scripts/db.mjs` feature map：
     - 方案 A（推薦）：把 templates 納入 `ai_analysis` feature：
       - add: `supabase/02_add/12_ai_analysis.sql`, `supabase/02_add/15_ai_analysis_templates.sql`
       - drop: `supabase/01_drop/15_ai_analysis_templates.sql`, `supabase/01_drop/12_ai_analysis.sql`
     - 新增 feature `page_views`：
       - add: `supabase/02_add/16_page_views.sql`
       - drop: `supabase/01_drop/16_page_views.sql`
       - dependencies 註明：`main`
  2. 更新 `supabase/COMBINED_ADD.sql`：
     - 依依賴關係加入 `02_add/15_ai_analysis_templates.sql`（在 `12_ai_analysis.sql` 之後）
     - 加入 `02_add/16_page_views.sql`（在 `01_main.sql` 之後任意位置皆可；建議放在 `15` 之後，方便維護）
     - 自檢：`rg ai_analysis_templates supabase/COMBINED_ADD.sql`、`rg page_view_daily supabase/COMBINED_ADD.sql`
  3. 更新 `supabase/COMBINED_DROP.sql`：
     - 加入 `01_drop/16_page_views.sql` 與 `01_drop/15_ai_analysis_templates.sql`（順序：先 drop 16/15，再 drop 12 相關表，避免依賴問題）
  4. 更新 runbook：`doc/runbook/database-ops.md`
     - Feature list 補上 `page_views`（與依賴/用途）
     - 說明 `ai_analysis` 現在包含 templates schema（避免漏跑）
- Verification:
  - Automated: `npm run docs:check-indexes`, `npm run lint:md-links`
  - Manual (no DB required): `npm run db -- list` 確認 feature 出現；`rg` 確認 COMBINED 收錄
  - Manual (with DB): `npm run db:add --feature ai_analysis` + `npm run db:add --feature page_views`，再用 SQL 驗證 tables/functions 存在
- Docs updates (per `doc/GOVERNANCE.md` update matrix):
  - `doc/runbook/database-ops.md`（DB scripts / feature list）
- Rollback:
  - revert 此 PR；或暫時僅使用 `psql -f supabase/02_add/15_*.sql`/`16_*.sql` 手動補跑（不建議長期）

### PR-2 — Page View Analytics Runtime（A1 落地）

- Goal: 讓 `page_view_daily` 的寫入真的發生（privacy-first、無 PII），並提供可關閉機制。
- Scope:
  - Public ingestion endpoint + server-only IO + client tracker
  - 不做 dashboard（只做到「可寫入 + 可驗證」）
- Expected file touches:
  - `lib/analytics/pageviews-io.ts`（new; `import 'server-only';`）
  - `app/api/analytics/pageview/route.ts`（new）
  - `components/analytics/PageViewTrackerClient.tsx`（new; client）
  - `app/[locale]/layout.tsx`（掛載 tracker；需排除 `/admin`）
  - `doc/SPEC.md`, `doc/SECURITY.md`, `README.md`（env template）
- Steps:
  1. 新增 server-only IO：`lib/analytics/pageviews-io.ts`
     - 以 `createAdminClient()` 呼叫 `increment_page_view(p_day, p_path, p_locale)`
     - day 以 UTC date（`YYYY-MM-DD`）計算，避免 timezone 漂移
  2. 新增 API route：`app/api/analytics/pageview/route.ts`
     - Method：POST（`sendBeacon` 友善）
     - Input：`{ path: string; locale: 'en'|'zh' }`
     - Validate：
       - `path` 必須為 canonical「去掉 locale 前綴」後的 path（例如 `/blog/foo`；首頁為 `/`）
       - `locale` 僅允許 `en|zh`
       - 明確拒絕 `/admin/*`、`/api/*` 等非 public paths（避免噪音）
     - 成功回應：204（避免 client retry spam）
     - 失敗回應：400（validation）/ 500（server）
  3. 新增 client tracker：`components/analytics/PageViewTrackerClient.tsx`
     - 以 `usePathname()` 監聽 SPA navigation（含第一次 mount）
     - 解析 locale 與 canonical path：
       - pathname `/en/blog/x` → locale `en` + path `/blog/x`
       - pathname `/en` → path `/`
     - 傳輸：`navigator.sendBeacon('/api/analytics/pageview', ...)`；fallback `fetch(..., { keepalive: true })`
     - Gate：僅當 `NEXT_PUBLIC_ENABLE_PAGEVIEWS === 'true'` 才送出（預設關）
     - 去抖：同一路徑短時間內不重複送（in-memory set）
  4. 掛載 tracker：`app/[locale]/layout.tsx`
     - 直接 render `<PageViewTrackerClient />`（但 tracker 內部必須忽略 admin 路徑）
  5. 文件同步：
     - `doc/SPEC.md`：Analytics 章節從 Known Gap 改成 “Implemented”（列出 route + modules）
     - `doc/SECURITY.md`：補 ingestion endpoint 的安全假設（無 auth；僅 input validation；無 PII）
     - `README.md`：env template 補上 `NEXT_PUBLIC_ENABLE_PAGEVIEWS`（Optional；預設不啟用）
- Verification:
  - Automated: `npm test`, `npm run type-check`, `npm run lint`
  - Manual:
    - 本機：`npm run dev` → 進站後看 Network / Logs 確認 `/api/analytics/pageview` 有 hit
    - DB：`select * from public.page_view_daily order by day desc limit 20;`
- Docs updates (per `doc/GOVERNANCE.md` update matrix):
  - `doc/SPEC.md`（新增/修改 feature 行為/路由/資料模型）
  - `doc/SECURITY.md`（新增 public endpoint 的安全假設）
  - `README.md`（新增 env var）
- Rollback:
  - 立即止血：移除/關閉 `NEXT_PUBLIC_ENABLE_PAGEVIEWS`（停止送出）
  - 需要回收 DB：`supabase/01_drop/16_page_views.sql`（僅在確定不需要資料時）

### PR-3 — AI Analysis Custom Templates（A2 落地）

- Goal: Owner 可 CRUD 自訂 prompt template；跑 report/schedule 時可選用（含 standard + rag）。
- Scope:
  - DB schema + constraint 調整 + IO + Admin UI + worker 支援
  - Editor：read/use only
- Expected file touches:
  - `supabase/02_add/17_ai_analysis_custom_template_refs.sql`（new; alters reports/schedules）
  - `scripts/db.mjs`（把 17 納入 `ai_analysis` feature）
  - `supabase/COMBINED_ADD.sql`（納入 17）
  - `lib/types/ai-analysis.ts`
  - `lib/validators/ai-analysis.ts`
  - `lib/ai-analysis/analysis-templates-io.ts`（new; server-only）
  - `lib/ai-analysis/analysis-prompts.ts`（新增 custom compose）
  - `lib/ai-analysis/openrouter-run-io.ts`（custom + rag prompt wiring）
  - `lib/ai-analysis/analysis-reports-*-io.ts`, `lib/ai-analysis/analysis-schedules-io.ts`（讀寫 custom_template_id）
  - `app/api/cron/ai-analysis/route.ts`
  - `app/api/cron/ai-analysis-scheduler/route.ts`
  - `app/[locale]/admin/(data)/ai-analysis/actions.ts`
  - `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`
  - `doc/SPEC.md`, `doc/specs/completed/AI_ANALYSIS_v2.md`
- Steps:
  1. DB（先確保 PR-1 已讓 templates table 可安裝）：
     - 新增 `supabase/02_add/17_ai_analysis_custom_template_refs.sql`：
       - `ALTER TABLE public.ai_analysis_reports ADD COLUMN IF NOT EXISTS custom_template_id UUID ...`
       - `ALTER TABLE public.ai_analysis_schedules ADD COLUMN IF NOT EXISTS custom_template_id UUID ...`
       - Drop 舊的 template_id CHECK（預期名稱：`ai_analysis_reports_template_id_check`, `ai_analysis_schedules_template_id_check`）
       - 新增新的 template_id CHECK：允許 built-ins + `'custom'`
       - 新增 cross-field CHECK：`template_id='custom'` ↔ `custom_template_id IS NOT NULL`（避免髒資料）
       - 補 index（`custom_template_id`）
  2. Types：`lib/types/ai-analysis.ts`
     - `AnalysisTemplateId` 擴成包含 `'custom'`
     - `AnalysisRequest` / schedules requests 增加 `customTemplateId?: string`
     - `AnalysisReport` / `AnalysisSchedule` 增加 `customTemplateId?: string | null`
     - 新增 `AnalysisCustomTemplate` type（id/name/promptText/isEnabled/createdAt/updatedAt）
  3. Validators：`lib/validators/ai-analysis.ts`
     - `VALID_TEMPLATE_IDS` 加上 `'custom'`
     - 新增規則：`templateId === 'custom'` 時必須提供 `customTemplateId`（UUID 格式）；反之必須為 undefined
     - 注意：ownership/role check 屬於 IO/app layer（validators 保持 pure）
  4. IO：新增 `lib/ai-analysis/analysis-templates-io.ts`（server-only）
     - list (Owner：all; Editor：enabled only)
     - create/update/delete/toggle enabled（Owner only）
     - fetchPromptTextById（給 worker 用；需處理 template 被刪除/停用）
  5. Report/Schedule IO 對齊：
     - `analysis-reports-write-io.ts`：createReport insert `custom_template_id`
     - `analysis-reports-read-io.ts`：select/mapper 帶回 `custom_template_id`
     - `analysis-schedules-io.ts`：create/update/list/get 帶回/寫入 `custom_template_id`
  6. Prompt composition：
     - `lib/ai-analysis/analysis-prompts.ts`：
       - 新增 `composeCustomAnalysisPrompt(promptText, data)`（仍需 `deidentifyData`）
       - 若 RAG enabled：新增 `composeCustomRagAnalysisPrompt(promptText, contextData, retrievalMetadata)`
  7. Worker/cron：
     - `app/api/cron/ai-analysis/route.ts`：
       - 當 `report.templateId === 'custom'`：先用 templates IO 拉 promptText，再 compose，再 run
       - 需同時支援 standard/rag（rag 時應使用 RAG prompt/system prompt）
     - `app/[locale]/admin/(data)/ai-analysis/actions.ts` 的 manual processing 同步支援 custom/rag
     - `app/api/cron/ai-analysis-scheduler/route.ts`：createReport 時帶入 `customTemplateId`（從 schedule）
  8. Admin UI：
     - Owner-only templates CRUD panel（同頁或 tab）
     - Report run form：
       - selector：Built-in / Custom
       - Custom 時：選 `customTemplateId`（只能選 enabled templates）
     - Schedule form（Owner-only）同上
  9. 文件同步：
     - `doc/SPEC.md`：AI Analysis 章節補上 custom templates 的 Data Model / UI / IO modules（並從 Known Gaps 移除）
     - `doc/specs/completed/AI_ANALYSIS_v2.md`：移除/更新 drift note（custom templates 已落地）
- Verification:
  - Automated: `npm test`, `npm run type-check`, `npm run lint`
  - Manual:
    - Owner 建立 template → 用 custom template 跑 report → 結果寫入且可檢視
    - Owner 建 schedule（custom template）→ scheduler 建 pending → worker 成功處理
    - Editor：可選用 templates（若設計如此），但無法 CRUD
- Docs updates (per `doc/GOVERNANCE.md` update matrix):
  - `doc/SPEC.md`（feature 行為/路由/資料模型）
  - `doc/specs/completed/AI_ANALYSIS_v2.md`（設計文件的 drift note 對齊）
- Rollback:
  - 立即止血：UI 隱藏 custom templates（保留 DB 不影響既有 built-in）
  - DB 回滾（不建議在有資料後做）：移除新 columns/constraints（需寫專用 SQL；或直接 DB reset）

### PR-4 — AI Analysis Share Links（A3 落地）

- Goal: Owner 可產生 share link，讓外部可在不登入狀態查看 report（可 revoke/expiry；預設 noindex）。
- Scope:
  - DB share table + secure fetch path + Admin UI + Public page
- Expected file touches:
  - `supabase/02_add/18_ai_analysis_report_shares.sql`（new）
  - `supabase/01_drop/18_ai_analysis_report_shares.sql`（new; 或更新 `01_drop/12_ai_analysis.sql`）
  - `scripts/db.mjs`（把 share schema 納入 `ai_analysis` feature）
  - `supabase/COMBINED_ADD.sql`, `supabase/COMBINED_DROP.sql`
  - `lib/ai-analysis/report-shares-io.ts`（new; server-only）
  - `app/[locale]/admin/(data)/ai-analysis/actions.ts`（新增 share actions；Owner only）
  - `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`（report detail 加 share panel）
  - `app/[locale]/ai-analysis/share/[token]/page.tsx`（new; public）
  - `doc/SECURITY.md`, `doc/SPEC.md`, `doc/runbook/ai-analysis.md`（可選）
- Steps:
  1. DB：
     - 新增 `public.ai_analysis_report_shares`（或同名）：
       - `token`（PK；default `encode(gen_random_bytes(32), 'hex')` 或等效 crypto random）
       - `report_id`（FK → `ai_analysis_reports.id`）
       - `created_by`（FK → `auth.users.id`）
       - `created_at`, `expires_at`, `revoked_at`
     - Public fetch（推薦方案 A）：
       - 建立 `SECURITY DEFINER` RPC：`get_shared_ai_report(token)`（只回傳白名單欄位：report markdown + created_at + template_id + status…）
       - `GRANT EXECUTE ON FUNCTION ... TO anon`
     - RLS：
       - share table 本身不對 anon 開 SELECT（避免 token 被掃）
       - Owner-only manage policy（Editor 不需讀 token）
  2. IO：`lib/ai-analysis/report-shares-io.ts`（server-only）
     - `createShare(reportId, createdBy, expiresAt?)` → 回傳 token + url
     - `revokeShare(token, createdBy)` → 設 `revoked_at`
     - `getActiveShareForReport(reportId)`（讓 UI 顯示現況；owner only）
     - `fetchSharedReport(token)`（server-side 用 anon client 呼叫 RPC）
  3. Admin UI（Owner only）：
     - Report detail panel 加入：
       - Create share link（可選 expiry）
       - Copy link
       - Revoke（失效後 UI 顯示 revoked）
  4. Public page：
     - `app/[locale]/ai-analysis/share/[token]/page.tsx`
       - token 格式驗證（hex 長度/字元）
       - 呼叫 `fetchSharedReport(token)`；不存在/expired/revoked → 404/410
       - Render markdown（read-only）
       - 設 `noindex`（Next.js metadata robots）
       - `dynamic = 'force-dynamic'` 或等效，避免 revoked 後仍被 cache 呈現
  5. 文件同步：
     - `doc/SECURITY.md`：補 share token threat model、noindex、RPC 設計、欄位白名單
     - `doc/SPEC.md`：AI Analysis 章節加入 share links feature + public route
     - `doc/runbook/ai-analysis.md`（可選）：補充 share link 管理（revoke/expiry）提示
- Verification:
  - Automated: `npm test`, `npm run type-check`, `npm run lint`
  - Manual:
    - Owner 建立 share link → 無登入可開啟（incognito）
    - revoke 後 link 失效（404/410）
    - noindex 生效（檢查 response meta/headers）
- Docs updates (per `doc/GOVERNANCE.md` update matrix):
  - `doc/SECURITY.md`（新增 public 分享能力的威脅模型）
  - `doc/SPEC.md`（新增 feature 行為/路由）
  - `doc/runbook/ai-analysis.md`（若新增 ops 指引）
- Rollback:
  - 立即止血：revoke 所有 active shares（bulk update），並隱藏 UI
  - 長期移除：移除 public route + 停止提供 createShare（DB 可保留或 drop）

### PR-5 — Tracking + Docs Hygiene（讓 drift 變成「可追蹤、可驗收」）[COMPLETE ✅]

- Goal: 把 A1/A2/A3 從「漂浮在 docs/SQL」變成「有 owner、有狀態、有驗收」的工作項，並確保 docs 不破。
- Expected file touches:
  - `doc/ROADMAP.md`
  - `doc/TASKS.md`
  - `doc/BLOCKERS.md`（若新增外部依賴）
  - `doc/specs/README.md`（若新增/調整 specs/PRD 檔案；本次預期不需）
- Steps:
  1. `doc/ROADMAP.md`：新增/更新 A1/A2/A3 items（what/why/status + links only；link 回 `doc/meta/STEP_PLAN.md`）
  2. `doc/TASKS.md`：把 PR-1..PR-4 的 steps 摘成 PR-ready bullets（每段連回 `doc/meta/STEP_PLAN.md`）
  3. `doc/BLOCKERS.md`：若 share link 需額外審核/合規（通常不需），才新增
  4. 跑 docs 檢查（依 `doc/GOVERNANCE.md`）：
     - `npm run docs:generate-indexes`
     - `npm run lint:md-links`
     - `npm run docs:check-indexes`
- Verification:
  - Docs: scripts 全綠；無 broken links；index blocks 無 drift
- Rollback:
  - revert tracking docs 變更即可
- **Completion note (2026-01-03)**:
  - `doc/ROADMAP.md` updated with A1/A2/A3 items (Complete status + links to STEP_PLAN.md)
  - `doc/TASKS.md` updated with PR-1..PR-4 as archived completed items
  - `doc/BLOCKERS.md` unchanged (no external dependencies for A1/A2/A3)
  - All docs checks passed: `npm run docs:generate-indexes`, `npm run lint:md-links`, `npm run docs:check-indexes`

## 7. Blockers / Risks

### Blockers（外部依賴）

- 無硬性 external blocker（A1/A2/A3 不依賴支付 provider）；但 A2 需要 `OPENROUTER_API_KEY` 才能做 end-to-end 驗證（見 `doc/runbook/ai-analysis.md`）。

### Risks（可控風險）

- A1 public ingestion 被濫用：影響為 DB 寫入噪音/成本 → 緩解：嚴格 validate path/locale、排除 admin/api、預設關閉（env gate），必要時再加 rate limiting。
- A2 custom prompt 造成內容品質/安全問題：影響為輸出不穩定或 prompt injection → 緩解：仍強制 deidentify、限制 promptText 長度、Owner-only CRUD、加 UI 警語（可選）。
- A3 token 外洩：影響為報告外流 → 緩解：token 長度足夠、支援 revoke/expiry、public 只回傳白名單欄位、noindex、必要時加「一次性 link」策略（不在本 scope）。

## 8. Open Questions（需要先澄清；本計畫已先做預設選擇）

- A1：是否要把 page views 也納入 AI Analysis 的 dataTypes（例如新增 `views`）？本次：不做（先完成純 analytics 寫入）。
- A3：share link 預設 expiry 要不要有值（例如 30 天）？本次：預設不設 expiry（由 Owner 選填）。

## 9. Tracking Sync（建議在 PR-5 一次做）

- `doc/TASKS.md`：把 PR-1..PR-4 摘要成可直接開工的 bullets（PR-ready）。
- `doc/ROADMAP.md`：只更新 what/why/status + links（不要貼 steps）。
- `doc/BLOCKERS.md`：只有遇到外部依賴才新增。
