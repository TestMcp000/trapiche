# Step-by-Step Execution Plan — V6（Architecture Hardening：IO boundaries + IO module split）

> 狀態: Active（Drift repair plan；本檔只寫「修復方案/步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-21  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> 目標 PRD（約束/合約）: `doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`（Implementation Contract）  
> 歷史完成紀錄：
>
> - V2 snapshot（PR-9..PR-12）：`doc/archive/2026-01-21-step-plan-v2-home-uiux-gallery-hotspots-hamburger-nav.md`
> - V3 snapshot（PR-13..PR-16）：`doc/archive/2026-01-21-step-plan-v3-home-uiux-gallery-hero-hotspots-hamburger-nav.md`
> - V4 snapshot（PR-17..PR-18）：`doc/archive/2026-01-21-step-plan-v4-seo-hotspots-clean.md`
> - V5 snapshot（PR-19..PR-21）：`doc/archive/2026-01-21-step-plan-v5-drift-hardening-site-url-cta-settings-cleanup.md`

---

## 0) 必讀（SSoT / Guardrails）

- Architecture / 全域約束：`ARCHITECTURE.md`
- 已落地行為（SSoT）：`doc/SPEC.md`
- 目標 PRD（contract）：`doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`
- Security / RBAC / RLS / secrets：`doc/SECURITY.md`
- Ops / DB / go-live：`doc/RUNBOOK.md`（細節：`doc/runbook/*`）
- AI / OpenRouter ops：`doc/runbook/ai-analysis.md`
- 文件分工 / update matrix：`doc/GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see` index）：`uiux_refactor.md`

---

## 1) Drift / Clean-code 問題清單（Active）

> 本節只列「尚未修復」的飄移/技術債；已完成項一律歸檔到 `doc/archive/*`。

### Drift-IO-1（✅ RESOLVED by PR-22）：`app/` 出現直接 DB query（Supabase `.from('...')`）

- Evidence：
  - `app/[locale]/admin/(blog)/comments/safety/[commentId]/actions.ts` 內直接查詢：
    - `.from('comments')`
    - `.from('comment_moderation')`
    - `.from('safety_settings')`
- Violates：
  - `ARCHITECTURE.md` §3.4 / §3.5（IO 只能存在於 `lib/modules/**`）
  - `uiux_refactor.md` §3.1（IO boundaries drift playbook）
- Impact：
  - actions.ts 變成「資料擁有者」→ 耦合 DB schema、難以單測、易擴散（未來更難做統一 cache/revalidate）
- Resolution：新增 `lib/modules/safety-risk-engine/safety-detail-admin-io.ts`，重構 actions.ts 只保留 orchestration，並加 guardrail test 防止回歸。

### Clean-IO-2（✅ RESOLVED by PR-24）：IO modules 超過 300 行（需拆分，避免巨石檔案）

- Evidence（行數統計，僅列 `*-io.ts`/`admin-io.ts`）：
  - ~~`lib/modules/safety-risk-engine/admin-io.ts`（799）~~ → ✅ RESOLVED by PR-23（拆分為 5 個子模組 + 薄 aggregator）
  - ~~`lib/modules/user/users-admin-io.ts`（414）~~ → ✅ RESOLVED by PR-24（拆分為 2 個子模組 + 薄 aggregator）
  - ~~`lib/modules/embedding/embedding-generate-io.ts`（348）~~ → ✅ RESOLVED by PR-24（拆分為 2 個子模組 + 薄 aggregator）
  - ~~`lib/modules/ai-analysis/analysis-schedules-io.ts`（325）~~ → ✅ RESOLVED by PR-24（拆分為 2 個子模組 + 薄 aggregator）
  - `lib/modules/preprocessing/preprocess-use-case-io.ts`（371）→ ✅ EXCEPTION DOCUMENTED（single export cohesive use case）
- Violates：`ARCHITECTURE.md` §3.4（IO module bloat 規則）
- Impact：
  - 可維護性下降、合併衝突增加、難以建立清楚的測試切面（高耦合/低內聚）

### Clean-Lint-1（✅ RESOLVED by PR-25）：Lint warning（unused const）

- Evidence：
  - ~~`npm run lint` 警告：`lib/validators/gallery-hotspots.ts` 的 `ALLOWED_URL_PROTOCOLS` 未使用（`@typescript-eslint/no-unused-vars`）~~
- Resolution：移除已標註 deprecated 且未使用的 `ALLOWED_URL_PROTOCOLS` 常數，lint warning 清零。

---

## 2) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

### PR-22 — Architecture：移除 app 內直接 DB query（Safety detail）✅ COMPLETED 2026-01-21

目標：讓 `app/[locale]/admin/(blog)/comments/safety/[commentId]/actions.ts` 只保留「授權 + orchestration」，所有 `.from('...')` 移到 `lib/modules/**`（server-only）。

**Completed：**

1. ✅ 新增 IO module：`lib/modules/safety-risk-engine/safety-detail-admin-io.ts`
   - `getSafetyDetailCommentContent(commentId)` → `{ content: string } | null`
   - `getSafetyLatestAssessmentIdByCommentId(commentId)` → `string | null`
   - `getSafetyTrainingActiveBatch()` → `string | null`
   - `getSafetyDetailPageData(commentId)` → 組合以上三個結果
2. ✅ 重構 actions.ts：移除所有 `.from('...')` 呼叫與 `createAdminClient` dynamic import
3. ✅ 加 guardrail：`tests/architecture-boundaries.test.ts` 新增 "Server actions in app/ do not contain direct Supabase queries" 測試
4. ✅ 驗證：`npm test`（1083 pass）, `npm run lint`, `npm run type-check` 全通過

### PR-23 — Clean-code：拆分 `lib/modules/safety-risk-engine/admin-io.ts`（924 lines）✅ COMPLETED 2026-01-21

目標：依語意拆成多個 `*-admin-io.ts`，保留 `admin-io.ts` 作為薄的 aggregator（維持 import surface、降低 ripple）。

**Completed：**

1. ✅ 新增 5 個子模組檔案（全部 `import 'server-only';`）：
   - `lib/modules/safety-risk-engine/assessments-admin-io.ts`（~310 lines）— 評估記錄持久化 + 佇列讀取
   - `lib/modules/safety-risk-engine/moderation-admin-io.ts`（~115 lines）— 標記、核准/拒絕
   - `lib/modules/safety-risk-engine/training-dataset-admin-io.ts`（~135 lines）— 訓練資料集 promote
   - `lib/modules/safety-risk-engine/corpus-admin-io.ts`（~195 lines）— Corpus CRUD + promote
   - `lib/modules/safety-risk-engine/settings-admin-io.ts`（~85 lines）— 設定讀寫
2. ✅ 將原 `admin-io.ts`（924 lines）改為薄 aggregator（~60 lines），re-export 所有子模組
3. ✅ 對外 import surface 不變（外部仍可 `import from '.../admin-io'`）
4. ✅ 驗證：`npm run type-check`（✓）, `npm run lint`（✓）, `npm test`（1083 pass）

### PR-24 — Clean-code：拆分其餘 oversized IO modules ✅ COMPLETED 2026-01-21

目標：依語意拆成多個 `*-io.ts`，保留原檔案作為薄的 aggregator（維持 import surface、降低 ripple）。

**Completed：**

1. ✅ Users admin：
   - `lib/modules/user/users-list-admin-io.ts`（~300 lines）— 列表/過濾/分頁
   - `lib/modules/user/users-detail-admin-io.ts`（~120 lines）— 用戶詳情
   - `lib/modules/user/users-admin-io.ts`（~50 lines）— 薄 aggregator
2. ✅ Embeddings：
   - `lib/modules/embedding/embedding-queue-io.ts`（~160 lines）— 佇列操作
   - `lib/modules/embedding/embedding-lease-io.ts`（~160 lines）— Lease-based 操作
   - `lib/modules/embedding/embedding-generate-io.ts`（~110 lines）— 核心生成 + 薄 aggregator
3. ✅ AI Analysis schedules：
   - `lib/modules/ai-analysis/analysis-schedule-crud-io.ts`（~260 lines）— CRUD 操作
   - `lib/modules/ai-analysis/analysis-schedule-run-io.ts`（~180 lines）— Cron worker 操作
   - `lib/modules/ai-analysis/analysis-schedules-io.ts`（~40 lines）— 薄 aggregator
4. ✅ Preprocessing use-case：
   - 維持原檔（371 lines, 1 export）— 例外記錄：single export 的完整 use case 流程，符合單一職責
5. ✅ 驗證：`npm run type-check`（✓）, `npm run lint`（✓）, `npm test`（1083 pass）

### PR-25 — Clean-code：清掉 lint warning（unused const）✅ COMPLETED 2026-01-21

目標：清除所有 lint warning，保持乾淨的 lint 輸出。

**Completed：**

1. ✅ 移除未使用常數：`lib/validators/gallery-hotspots.ts` 的 `ALLOWED_URL_PROTOCOLS`（已標註 deprecated 且未被使用）
2. ✅ 驗證：`npm run lint`（0 warning）, `npm run type-check`（✓）, `npm test`（1083 pass）

---

## 3) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- `npm run build`（routes/SEO/redirect 相關 PR 必跑；先確認 `.env.local` 已設 `NEXT_PUBLIC_SITE_URL` + Supabase public env）
