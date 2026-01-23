# 2026-01-23 - Step Plan V13（IO Module Split + Guardrails）(Archive)

> Date: 2026-01-23  
> Status: COMPLETE ✅ (Archived snapshot; active plan lives in `../meta/STEP_PLAN.md`)  
> Scope: IO module size drift prevention + splitting oversized IO modules  
> Implemented behavior (SSoT): `../SPEC.md`  
> Constraints: `../../ARCHITECTURE.md`

## Archived Snapshot（verbatim）
# Step-by-Step Execution Plan — V13（Active: IO Module Split + Guardrails）

> 狀態: Active（Drift/clean-code repair plan；本檔只寫「修復方案/步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-23  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> Repo 驗證（2026-01-23）：`npm test`（1140 pass）, `npm run lint`, `npm run type-check`, `npm run docs:check-indexes`, `npm run lint:md-links` 通過；`npm run build` 通過（需 `.env.local` 或至少設定 `NEXT_PUBLIC_SITE_URL` + Supabase public env；若 Supabase URL 無法連線會看到 `fetch failed` logs，但 build 可完成）  
> 歷史 snapshots（已完成只留 archive）：`doc/archive/README.md`（最新：`doc/archive/2026-01-23-step-plan-v12-doc-code-hygiene-proxy.md`）

---

## 0) 必讀（SSoT / Guardrails）

- Architecture / 全域約束：`ARCHITECTURE.md`
- 已落地行為（SSoT）：`doc/SPEC.md`
- Security / RBAC / RLS / secrets：`doc/SECURITY.md`
- Ops / DB / go-live：`doc/RUNBOOK.md`（細節：`doc/runbook/*`）
- 文件分工 / update matrix：`doc/GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see` index）：`uiux_refactor.md`

---

## 1) Drift / Clean-code 問題清單（Active）

> 本節只列「尚未修復」的飄移/技術債；已完成項一律歸檔到 `doc/archive/*`。

1. **[P2] Maintenance risk — IO module bloat（>300 lines）** ✅ ALL RESOLVED
   - Violates：`ARCHITECTURE.md` §3.4（IO modules：>300 行必須拆分；允許薄 aggregator）
   - 現況（2026-01-23；全部已拆分完成）：
     - ~~`lib/modules/safety-risk-engine/assessments-admin-io.ts`（374）~~ ✅ PR-43 完成（29 lines）
     - ~~`lib/modules/preprocessing/preprocess-use-case-io.ts`（370）~~ ✅ PR-39 完成（287 lines）
     - ~~`lib/modules/user/users-list-admin-io.ts`（365）~~ ✅ PR-38 完成（82 lines）
     - ~~`lib/modules/preprocessing/judge-io.ts`（339）~~ ✅ PR-40 完成（29 lines）
     - ~~`lib/modules/import-export/jobs-io.ts`（329）~~ ✅ PR-42 完成（36 lines）
     - ~~`lib/modules/embedding/embedding-search-io.ts`（316）~~ ✅ PR-41 完成（28 lines）
     - ~~`lib/modules/content/hamburger-nav-publish-io.ts`（310）~~ ✅ PR-37 完成（98 lines）

2. **[P3] Guardrail gap — 缺少自動化檢查避免 IO module size drift** ✅ RESOLVED（PR-44）
   - 現況：`tests/architecture-boundaries.test.ts` 已守 client/server boundary、forbidden SDK imports，**以及 `ARCHITECTURE.md` §3.4 的 size/export 限制**
   - 新增守衛：
     - `scripts/inspect-io-module-size.mjs`：獨立腳本，可用 `--check` 快速掃描 142 個 IO modules
     - `tests/architecture-boundaries.test.ts` 新增 `IO modules stay within size/export constraints` 測試
     - Thin Facade 例外：允許 aggregator 模組（≤3 direct exports + 主要 re-exports）超過 12 exported functions

---

## 2) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

新增 PR item 的最小格式（**務必寫死到檔名/函式/指令；避免模糊**）：

1. Title：`PR-XX — <Domain>：<1 句話描述 drift 修復>`
2. Evidence（必填）：列出 `rg` 指令與命中的檔案路徑（至少 1 個）
3. Violates（必填）：引用 `ARCHITECTURE.md`/`doc/SPEC.md`/對應 spec 的章節或 anchor
4. Fix steps（必填）：
   - 明確列出要新增/修改的檔案路徑（逐一列出）
   - 明確列出要移除的舊呼叫點（逐一列出）
5. DoD（必填）：
   - `npm test`, `npm run lint`, `npm run type-check`
   - 針對 drift 的 grep 應為 0 命中（列出指令）
6. Post-merge（必填）：
   - 更新 `uiux_refactor.md` §4 item 狀態（不得改號；若是 docs/clean-code 類型可新增新 item）
   - `npm run docs:generate-indexes` + `npm run lint:md-links`

---

### PR-37 — Content：拆分 `hamburger-nav-publish-io.ts`（>300 lines） ✅ COMPLETE

> **Status**: COMPLETE（2026-01-23）
> **Result**: 310 lines → 98 lines（主檔）+ 94 lines（blog）+ 138 lines（gallery）

1. Evidence
   - `rg -n "deepValidateHamburgerNav\\(" lib/modules/content/hamburger-nav-publish-io.ts`
   - `rg -n "async function validate(BlogPost|BlogCategory|GalleryItem|GalleryCategory)" lib/modules/content/hamburger-nav-publish-io.ts`
2. Violates
   - `ARCHITECTURE.md` §3.4（IO module splitting：>300 lines 必拆）
3. Fix steps
   - 新增檔案（拆分 DB validation 職責；檔名需保持 `*-io.ts`；保留 server-only）：
     - `lib/modules/content/hamburger-nav-publish-blog-validate-io.ts`（`validateBlogPost`, `validateBlogCategory`）
     - `lib/modules/content/hamburger-nav-publish-gallery-validate-io.ts`（`validateGalleryItem`, `validateGalleryCategory`）
   - 修改 `lib/modules/content/hamburger-nav-publish-io.ts`
     - 保留單一 public export：`deepValidateHamburgerNav(nav)`
     - `validateTarget()` 改為呼叫新的 `*-validate-io.ts`
   - 測試更新
     - `tests/hamburger-nav-publish-io.test.ts`：若 table-name assertions 分散，改成掃描 `lib/modules/content/hamburger-nav-publish*.ts`（多檔）而不是單檔
4. DoD
   - `npm test`, `npm run lint`, `npm run type-check`
   - `Get-Content lib/modules/content/hamburger-nav-publish-io.ts | Measure-Object -Line` 應 `< 300`

---

### PR-38 — Users(Admin)：拆分 `users-list-admin-io.ts`（>300 lines；同時提高可測試性） ✅ COMPLETE

> **Status**: COMPLETE（2026-01-23）
> **Result**: 365 lines → 82 lines（主檔 facade）+ 53 lines（transform pure）+ 232 lines（query IO）

1. Evidence
   - `rg -n "export async function getUserList" lib/modules/user/users-list-admin-io.ts`
   - `rg -n "transformDirectoryToSummary\\(" lib/modules/user/users-list-admin-io.ts`
2. Violates
   - `ARCHITECTURE.md` §3.4（IO module splitting：>300 lines 必拆）
3. Fix steps
   - 新增 pure module（可單測；無 DB/Next）：
     - `lib/modules/user/users-list-transform.ts`（移出 `transformDirectoryToSummary` 與任何 row→summary mapping）
   - 新增 IO submodule（維持 `*-admin-io.ts` 語意）：
     - `lib/modules/user/users-list-query-admin-io.ts`（只做 Supabase query；回傳 raw rows + total）
   - 修改 `lib/modules/user/users-list-admin-io.ts`
     - 成為薄 facade：import query + transform，並保留原本 export API（避免改動 callsites）
   - 測試補強
     - 新增 `tests/user-directory-transform.test.ts`：測 `transformDirectoryToSummary()`（pure; 無 DB）
4. DoD
   - `npm test`, `npm run lint`, `npm run type-check`
   - `Get-Content lib/modules/user/users-list-admin-io.ts | Measure-Object -Line` 應 `< 300`

---

### PR-39 — Preprocessing：拆分 `preprocess-use-case-io.ts`（>300 lines；降低單檔 orchestration 複雜度） ✅ COMPLETE

> **Status**: COMPLETE（2026-01-23）
> **Result**: 370 lines → 287 lines（主檔）+ 66 lines（idempotency pure）+ 97 lines（embedding-batch IO）

1. Evidence
   - `rg -n "export async function runPreprocessUseCase\\(" lib/modules/preprocessing/preprocess-use-case-io.ts`
2. Violates
   - `ARCHITECTURE.md` §3.4（IO module splitting：>300 lines 必拆）
3. Fix steps
   - 新增 pure module：
     - `lib/modules/preprocessing/idempotency.ts`（移出 `compareChunksForIdempotency()` 與 `ChunkHashPair`/`ExistingChunkInfo` types；不得 import Supabase/Next/console）
   - 新增 IO submodule：
     - `lib/modules/preprocessing/embedding-batch-io.ts`（移出 batch embedding generation 邏輯與 concurrency control）
   - 修改 `lib/modules/preprocessing/preprocess-use-case-io.ts`
     - 保留 `runPreprocessUseCase(input)` 作為唯一 entry point
     - import 並使用新的 `idempotency.ts` 和 `embedding-batch-io.ts`
   - 測試補強
     - 新增 `tests/preprocessing-idempotency.test.ts`：測 `compareChunksForIdempotency()`（pure; 無 DB）
4. DoD
   - `npm test`, `npm run lint`, `npm run type-check`
   - `Get-Content lib/modules/preprocessing/preprocess-use-case-io.ts | Measure-Object -Line` 應 `< 300`（實際 287 lines）

---

### PR-40 — Preprocessing：拆分 `judge-io.ts`（>300 lines；分離 invoke / metrics / persistence） ✅ COMPLETE

> **Status**: COMPLETE（2026-01-23）
> **Result**: 339 lines → 29 lines（主檔 facade）+ 137 lines（invoke）+ 110 lines（metrics）+ 96 lines（write）

1. Evidence
   - `rg -n "export async function judgeChunk\\(" lib/modules/preprocessing/judge-io.ts`
   - `rg -n "export async function getQualityMetrics\\(" lib/modules/preprocessing/judge-io.ts`
2. Violates
   - `ARCHITECTURE.md` §3.4（IO module splitting：>300 lines 必拆）
3. Fix steps
   - 新增檔案（按職責拆分）：
     - `lib/modules/preprocessing/judge-invoke-io.ts`（`judgeChunk`, `judgeChunksForContent`, `shouldSampleContent`）
     - `lib/modules/preprocessing/judge-metrics-io.ts`（`getQualityMetrics`, `getFailedSamples`, `QualityMetrics`, `FailedSample`）
     - `lib/modules/preprocessing/judge-write-io.ts`（`updateEmbeddingQualityScore`, `updateEmbeddingQualityScoresBatch`）
   - 修改 `lib/modules/preprocessing/judge-io.ts`
     - 變成薄 facade（re-export public API；保留原 import surface）
4. DoD
   - `npm test`, `npm run lint`, `npm run type-check`
   - `Get-Content lib/modules/preprocessing/judge-io.ts | Measure-Object -Line` 應 `< 300`（實際 29 lines）

---

### PR-41 — Embeddings(Admin): 拆分 `embedding-search-io.ts`（>300 lines；降低耦合與回歸風險） ✅ COMPLETE

> **Status**: COMPLETE（2026-01-23）
> **Result**: 316 lines → 28 lines（主檔 facade）+ 118 lines（semantic）+ 56 lines（keyword）+ 103 lines（hybrid）+ 89 lines（similar-items）

1. Evidence
   - `rg -n "export async function (semanticSearch|getSimilarItems|keywordSearch|hybridSearch)" lib/modules/embedding/embedding-search-io.ts`
2. Violates
   - `ARCHITECTURE.md` §3.4（IO module splitting：>300 lines 必拆）
3. Fix steps
   - 新增 `*-io.ts` 檔案（按 query type 拆分；保留 `createAdminClient()` 使用）：
     - `lib/modules/embedding/semantic-search-io.ts`（`semanticSearch`, `isSemanticSearchEnabled`）
     - `lib/modules/embedding/keyword-search-io.ts`（`keywordSearch`）
     - `lib/modules/embedding/hybrid-search-io.ts`（`hybridSearch`）
     - `lib/modules/embedding/similar-items-io.ts`（`getSimilarItems`, `updateSimilarItems`）
   - 修改 `lib/modules/embedding/embedding-search-io.ts`
     - 保留原本 exports 但改為 re-export（避免改 callsites）
4. DoD
   - `npm test`, `npm run lint`, `npm run type-check`
   - `Get-Content lib/modules/embedding/embedding-search-io.ts | Measure-Object -Line` 應 `< 300`（實際 28 lines）

---

### PR-42 — Import/Export(Admin): 拆分 `jobs-io.ts`（>300 lines；拆分 lifecycle / storage / audit） ✅ COMPLETE

> **Status**: COMPLETE（2026-01-23）
> **Result**: 329 lines → 36 lines（主檔 facade）+ 192 lines（lifecycle）+ 105 lines（storage）+ 35 lines（audit）

1. Evidence
   - `rg -n "export async function (createJob|markJob|listJobs|uploadToStorageWithJob|writeAuditLog)" lib/modules/import-export/jobs-io.ts`
2. Violates
   - `ARCHITECTURE.md` §3.4（IO module splitting：>300 lines 必拆）
3. Fix steps
   - 新增 `*-io.ts` 檔案：
     - `lib/modules/import-export/jobs-lifecycle-io.ts`（create/mark/get/list/delete）
     - `lib/modules/import-export/jobs-storage-io.ts`（upload/signed url/download url）
     - `lib/modules/import-export/jobs-audit-io.ts`（writeAuditLog）
   - 修改 `lib/modules/import-export/jobs-io.ts`
     - 薄 facade（re-export）
4. DoD
   - `npm test`, `npm run lint`, `npm run type-check`
   - `Get-Content lib/modules/import-export/jobs-io.ts | Measure-Object -Line` 應 `< 300`（實際 36 lines）

---

### PR-43 — Safety Risk Engine(Admin): 拆分 `assessments-admin-io.ts`（>300 lines；拆分 read/write） ✅ COMPLETE

> **Status**: COMPLETE（2026-01-23）
> **Result**: 374 lines → 29 lines（主檔 facade）+ 190 lines（read）+ 205 lines（write）

1. Evidence
   - `rg -n "export async function (getSafetyQueueItems|getSafetyAssessmentDetail|persistSafetyAssessment)" lib/modules/safety-risk-engine/assessments-admin-io.ts`
2. Violates
   - `ARCHITECTURE.md` §3.4（IO module splitting：>300 lines 必拆）
3. Fix steps
   - 新增 `*-admin-io.ts` 檔案：
     - `lib/modules/safety-risk-engine/assessments-read-admin-io.ts`（queue/detail reads）
     - `lib/modules/safety-risk-engine/assessments-write-admin-io.ts`（insert/update/persist）
   - 修改 `lib/modules/safety-risk-engine/assessments-admin-io.ts`
     - 薄 facade（re-export）
4. DoD
   - `npm test`, `npm run lint`, `npm run type-check`
   - `Get-Content lib/modules/safety-risk-engine/assessments-admin-io.ts | Measure-Object -Line` 應 `< 300`（實際 29 lines）

---

### PR-44 — Guardrails: 新增自動化檢查避免 IO module size drift（`ARCHITECTURE.md` §3.4） ✅ COMPLETE

> **Status**: COMPLETE（2026-01-23）
> **Result**: 新增 `scripts/inspect-io-module-size.mjs` 腳本 + `tests/architecture-boundaries.test.ts` 測試
> **Pre-req**：PR-37..PR-43 合併後再做（否則測試會因既有違規而 fail）。

1. Evidence
   - `rg -n "IO 模組不可變成雜物抽屜" ARCHITECTURE.md`
2. Violates
   - `ARCHITECTURE.md` §3.4（目前缺 guardrail test）
3. Fix steps
   - 新增 script：`scripts/inspect-io-module-size.mjs`
     - 掃描 `lib/**/{io.ts,*-io.ts,admin-io.ts,*-admin-io.ts}`
     - 對每個檔案輸出：行數、export function count、export const count（只計算 public API；排除 type exports）
     - `--check` mode：任一檔案 `lines > 300` 或 `exported functions > 12` → exit(1) 並列出檔案
     - **Thin Facade Exception**：符合 ARCHITECTURE.md §3.4「薄 aggregator」的 facade 模組（≤3 direct exports + 主要 re-exports）允許超過 12 exported functions
   - 新增測試（或納入既有 guardrail）
     - 選項 A（推薦）：`tests/architecture-boundaries.test.ts` 增加 `test('IO modules stay within size/export constraints', ...)`
     - DoD 補一條：`node scripts/inspect-io-module-size.mjs --check`
4. DoD
   - `npm test`, `npm run lint`, `npm run type-check`
   - `node scripts/inspect-io-module-size.mjs --check` 應通過（0 violations）

---

## 3) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- Docs：`npm run docs:generate-indexes`, `npm run lint:md-links`
- `npm run build`（先確認 `.env.local` 已設 `NEXT_PUBLIC_SITE_URL` + Supabase public env）
