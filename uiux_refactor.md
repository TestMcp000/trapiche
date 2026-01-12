# Admin UI/UX Cleanup Playbook（後台）— Drift Tracker / 修復手冊

 > Last Updated: 2026-01-11
> Status: **ACTIVE**（維護中：只保留「飄移/未完成」項目；修復流程模板固定保留）  
> Assumption: 專案尚未上線，DB 可直接 `reset`（遷移成本 ≈0，不保留相容性）。
> Archive: `doc/archive/2025-12-31-uiux-refactor-archive.md`（舊版全文 + roadmap）
> Important: `§4` item numbers and `§6.*` headings are referenced by in-code `@see`; do not renumber.

本文件的定位：**用來追蹤「目前專案狀態 vs 規格約束」的飄移點，並提供可照做的修復步驟**。  
已完成任務的歷史記錄請看：`doc/archive/`（索引：`doc/archive/README.md`）。

為了避免跟其他文件職責混淆：

- **不要把新功能的 backlog/拆 PR steps 寫在這裡**：放 `doc/TASKS.md`（unblocked）/ `doc/BLOCKERS.md`（blocked）/ `doc/ROADMAP.md`（status）。
- **不要把「現況」寫在這裡**：現況（what exists now）以 `doc/SPEC.md` 為準。
- **本檔只保留**：drift tracker、merge 前 checklist、可重用的修復手冊、以及 stable `@see` 索引（`§4` item / `§6.*` headings 不能改號）。

---

## 0. Non‑Negotiables（與 `ARCHITECTURE.md` 對齊）

> 權威（SSoT）：`ARCHITECTURE.md`。本節只保留「對應關係 + 修復入口」，避免在這裡重複抄規則造成 drift。

1. **Server‑first / client boundary** → `ARCHITECTURE.md`（§2, §4.5）
2. **Theme single source / SSR injection** → `ARCHITECTURE.md`（§2）
3. **IO boundaries（app layer 只做 parse/validate → call lib → revalidate）** → `ARCHITECTURE.md`（§3.0, §3.4, §4.6）
4. **Service role 最小化 + `server-only`** → `ARCHITECTURE.md`（§4.6, §5；守門員：`tests/architecture-boundaries.test.ts`）+ 本檔 §3.5
5. **Bundle / heavy deps guardrails（避免不必要 client bundle）** → `ARCHITECTURE.md`（§4.5）
6. **Public SSR cached reads（`cachedQuery`）** → `ARCHITECTURE.md`（§2, §6）
7. **IO module bloat / 拆分規範（>300 行或 exports >12）** → `ARCHITECTURE.md`（§3.4）+ 本檔 §3.7

---

## 1. 目標：乾淨的模組化路由（Admin）

每個 admin 模組路由必須長得一致（可擴充、好測試、低耦合）：

```
app/[locale]/admin/<module>/
  layout.tsx         # (可選) module tabs / shared chrome
  page.tsx           # Server: fetch + permission gate + props
  actions.ts         # Server Actions: validate → call lib/**/io.ts or lib/**/*-io.ts → revalidate
  <Module>Client.tsx # Client: UI state & interactions only
  components/        # Route-local presentational components
```

禁止把 DB queries / `.from('...')` / `createAdminClient()` 塞進 client components 或 app layer。

**補充（避免耦合/路徑漂移）**

- **Route-bound client（需要 import 同層 `./actions` 的 Client）**：請放在對應 route 資料夾內（`app/[locale]/admin/**/<Module>Client.tsx`），讓 `actions.ts` 與 client 形成「同層局部封裝」，避免 `components/admin/**` 反向依賴 `app/**`。
- `components/admin/**` 保留給「可重用的 admin-only UI 元件」或「不需要 import route `actions.ts` 的 client components」（例如 `AdminTabs`, `AdminSidebar`, Upload/Cropper 等）。
- Guard（必做）：`rg -n "@/app/\[locale\]/admin" components/admin` 預期 **0** 命中；若有命中視為 clean-code debt（修復流程見 §3.3）。

---

## 2. Drift 檢查清單（每次合併前）

1. 必跑測試
   - `npm test`
   - `npm run type-check`
   - `npm run lint`
2. 快速 grep（抓最常見飄移）
   - `rg -n "\bcreateAdminClient\s*\(" lib app components --glob "!lib/infrastructure/supabase/admin.ts"`（只能在 `lib/**/io.ts` 或 `lib/**/*-io.ts`；排除 factory 本身；注意 grep 會命中註解，需人工確認是否為呼叫）
   - `rg -n "\.from\('\w" app components`（app/components 不應出現 Supabase `.from('table')`）
   - `rg --files-without-match "import 'server-only';" lib --glob "**/io.ts" --glob "**/*-io.ts"`（所有 IO 模組都必須標記 server-only，避免誤入 client bundle）
   - `rg -n "fonts\.googleapis\.com" app components lib`（禁止引入外部 fonts）
   - `rg -n "NEXT_PUBLIC_SITE_URL" app components lib`（預期：只命中 `lib/site/site-url.ts`；其他命中視為 drift，代表有繞過 URL single source）
   - `rg -n "\.vercel\.app" app components lib`（預期：無輸出；若有輸出代表硬編部署網域）
   - `rg -n "\brecharts\b" app components`（預期：只命中 admin UI；public UI 命中視為 drift，代表不必要 client bundle 風險）
   - `rg -n "@/app/\[locale\]/admin" components/admin`（預期：無輸出；若有輸出代表 `components/admin/**` 反向依賴 `app/**`）
   - `rg --files --glob "app/[[]locale]/admin/**" | rg -- '-action\.ts$|-actions\.ts$'`（admin server actions 必須統一為 `actions.ts`；禁止遺留 `*-action(s).ts`）
   - **AI/Embedding SDK bundle guard（預防性）**：
     - `rg -n 'from\s+[''"]openai[''"]' app components lib`（預期：無輸出；OpenAI SDK 只允許存在於 `supabase/functions/**`）
     - `rg -n "openrouter" components`（預期：無輸出；OpenRouter SDK/clients 不得進 client bundle）
   - **Import/Export heavy deps bundle guard（預防性）**：
     - `rg -n "\b(gray-matter|jszip|papaparse|exceljs)\b" app components`（預期：無輸出；這些 heavy deps 必須 server-only，且只能存在於 `lib/modules/import-export/**`（或 scripts），不得進 client bundle）
   - **IO bloat（>300 行）**：
   - PowerShell：`$root=(Get-Location).Path; Get-ChildItem lib -Recurse -File -Filter "*.ts" | Where-Object { $_.FullName -notmatch "\\\\lib\\\\infrastructure\\\\supabase\\\\" } | Where-Object { ($_.FullName -replace "\\\\","/") -match "(^|/)(io|admin-io|payment-io|cache-io|.+-io)\\.ts$" } | ForEach-Object { $lines=(Get-Content $_.FullName).Count; if ($lines -gt 300) { \"{0} {1}\" -f $lines.ToString().PadLeft(4), $_.FullName.Substring($root.Length+1) } } | Sort-Object -Descending`
   - Bash：`find lib -name "*.ts" -not -path "lib/infrastructure/supabase/*" | rg "(/|^)(io|admin-io|payment-io|cache-io|.+-io)\\.ts$" | while read -r f; do echo \"$(wc -l < \"$f\") $f\"; done | awk '$1>300' | sort -nr`

---

## 3. 修復手冊（Playbooks）

> 目的：把常見 drift 類型的修復流程固定下來，避免每次都重新做架構決策。

### 3.1 IO boundaries：app/components 出現 DB query（`.from('...')`）

**觸發條件（任一即為 drift）**

- `rg -n "\.from\('" app components` 有輸出（注意排除 `Array.from`）
- `rg -n "createAdminClient\(" app components` 有輸出

**修復步驟（照順序做）**

1. 確認這段 query 的 domain（blog/gallery/shop/comment/...），並在 `lib/modules/<domain>/` 補齊對應 IO 檔案：
   - Public reads：`io.ts`（anon client, server-only）＋必要時 `cached.ts`（`cachedQuery`）
   - Admin reads/writes：`admin-io.ts`（cookie-based server client; RLS）
   - 系統/金流/需要 service role：`*-io.ts`（`createAdminClient()`；檔案首行必須 `import 'server-only';`）
2. 把 `.from('table')` query 從 app/components 移到 `lib/modules/<domain>/*-io.ts`，回傳 typed result（type 來源：`lib/types/*`）。
3. app layer 只保留：`parse/validate → call lib → revalidate`，不要在 app/components 留任何 `.from()`。
4. Public SSR 的讀取一律改呼叫 `lib/modules/<domain>/cached.ts`（避免把 cookie-based client 的結果錯誤快取，造成跨使用者資料污染）。
5. 寫入後必做 revalidate（依 domain 選擇 tag/path）：
   - `revalidateTag('<domain>')`（例如 `blog`/`gallery`/`shop`/`site-content`）
   - `revalidatePath('/sitemap.xml')`（任何會影響 sitemap 的變更都要做）
6. 驗證（必做）：
   - `npm test`（含 `tests/architecture-boundaries.test.ts`）
   - `npm run type-check`
   - `npm run lint`
   - 重跑本節「觸發條件」grep，確認無輸出

### 3.2 Public SSR cached reads：public 路由讀取未走 `lib/*/cached.ts`

**觸發條件**

- Public server components 直接 import `lib/modules/<domain>/io.ts` 做列表/詳細頁讀取（例外：user-specific/auth gating）
- `lib/modules/<domain>/cached.ts` 的 fetcher 內出現 `createClient()` / `cookies()` / `headers()`（會導致錯誤快取或 cache key 污染）

**修復步驟**

1. 把 public 讀取函數保留在 `lib/modules/<domain>/io.ts`（使用 `lib/infrastructure/supabase/anon.ts`；檔案 `import 'server-only';`）。
2. 在 `lib/modules/<domain>/cached.ts` 用 `cachedQuery` 包裝（tag 對齊 domain，例：`['blog']` / `['gallery']` / `['shop']`）。
3. page/layout/sitemap/canonical resolve 改用 cached 版本（`*Cached`）。
4. 確保 cached fetcher **不讀 cookies/headers**，也不使用 cookie-based client（避免跨使用者快取污染）。
5. 寫入端（server actions/admin-io）完成後：`revalidateTag('<domain>')` + 必要 `revalidatePath()`。
6. 驗證：`npm test` + 針對 sitemap/canonical 做 `rg` 確認不再 import `io.ts`。

### 3.3 新增/重構 Admin 模組路由（保持一致性 + 最小 client bundle）

**新增模組的固定步驟**

1. 建立路由骨架（參考本檔 §1）：
   - `page.tsx`：server component（fetch + permission gate + props）
   - `actions.ts`：server actions（validate → call `lib/**/io.ts` / `lib/**/*-io.ts` → revalidate）
   - `<Module>Client.tsx`：client component（UI state/interaction only）
   - `components/`：route-local presentational components
2. Permission gate 固定流程：
   - `const supabase = await createClient()` → `isSiteAdmin(supabase)`（Owner/Editor）
   - 任何寫入 action 都要再次做 gate（不要只在 page gate）
3. 互動元件才使用 `'use client'`；page/layout 不要濫用（避免擴大 client bundle）。
4. Admin-only heavy deps（例如 `recharts`）只允許：
   - 放在 `components/admin/**`
   - 且以 dynamic import（或分離 Inner component）避免不必要載入
5. 任何影響 public SEO/導航/sitemap 的設定變更：務必 revalidate sitemap（`/sitemap.xml`）。

### 3.4 文件同步（避免「文件 vs 現況」飄移）

**觸發條件**

- `ARCHITECTURE.md` 的「目前專案狀態 / 已知飄移」與 `uiux_refactor.md` 不一致
- `doc/SPEC.md` 仍描述已被修復/移除的行為

**同步步驟（PR 必做）**

1. 修復 code 後，先跑：`npm test` / `npm run type-check` / `npm run lint`，以輸出為準。
2. 更新 `ARCHITECTURE.md`：
   - 「目前專案狀態」的 drift 清單只保留未完成項目
   - 測試狀態更新為最新輸出（tests 數量與 lint warnings 允許政策）
3. 更新 `doc/SPEC.md`：
   - 只描述「已實作/現況」行為；未完成或刻意 gated 的敘述集中放在 SPEC 的 `Known Gaps`，並連到 `doc/ROADMAP.md`
   - 若新增/拆分了 modules，務必同步更新 SPEC 的 `Module Inventory (Single Source)`（避免檔名/入口 drift）
4. 最後更新本檔（`uiux_refactor.md`）：
   - 刪除已完成 drift 項目（本檔只保留未完成）
   - 觸發條件/修復步驟若有新模式，補到 §3 Playbooks

### 3.5 IO modules：缺少 `import 'server-only';`（硬化 client bundle 邊界）

**觸發條件**

- `rg --files-without-match "import 'server-only';" lib --glob "**/io.ts" --glob "**/*-io.ts"` 有輸出（代表存在未標記的 IO 模組）

**修復步驟（照順序做）**

1. 先跑觸發條件指令，拿到「缺少 server-only」的檔案清單（保留輸出作為 PR 描述的一部分）。
2. 逐一在該清單中的檔案**第一個 import 位置**加上：`import 'server-only';`
3. 檢查該檔案是否被 client components 直接 import（避免修了 server-only 後才發現 client 依賴）：
   - `rg -n "@/lib/.*/(io|admin-io|.*-io)" components app`
   - 若命中 client component：必須先把該呼叫搬回 server layer（page/server action/route handler）或改走 API。
4. 更新守門員測試（`tests/architecture-boundaries.test.ts`）：
   - 新增一條規則：所有 `lib/**/io.ts` 與 `lib/**/*-io.ts` 必須包含 `import 'server-only';`
   - 例外（若需要）：列出白名單並在本檔與測試同時註明理由（避免未來 drift）
5. 驗證（必做）：`npm test` / `npm run type-check` / `npm run lint`，並重跑觸發條件指令確認無輸出。

### 3.6 Admin server actions：檔名/放置一致化（路由骨架固定化）

> 目標：每個 admin 路由 segment 的寫入入口都長得一致（降低認知負擔、好 grep、好測試）。

**觸發條件**

- 同一個 module 內出現多種 action 檔名風格（例如 `actions.ts`、`*-actions.ts`、`*-action.ts` 混用）
- page.tsx 內直接 inline 大量 server action（難以重用/測試/審查）

**修復步驟（建議採「低風險遷移」）**

1. 先盤點 `app/[locale]/admin/**` 內所有 server action 檔案（包含 `*-action(s).ts`）：
   - `rg -n "^'use server'" app/[locale]/admin`
2. 選定唯一命名規則：**每個 route directory 一律使用 `actions.ts`**（與本檔 §1 範本對齊）。
3. 對每個 route directory（含 `shop/*`、`content/*` 等）新增 `actions.ts`，內容只做 re-export（避免一次改太大）：
   - `export { someAction } from './old-action-file';`
   - 確保最終被 import 的檔案（實際宣告 action 的檔案）具有 `'use server';`
4. 逐一把 `page.tsx`/client component 中的 import，改成只從同層 `./actions` 匯入（固定入口、便於 grep）。
5. 全部路由完成後，再做第二階段清理：
   - 把舊的 `*-action(s).ts` 內容搬進 `actions.ts`（或保留拆分，但入口仍是 `actions.ts`）
   - 刪除舊檔並更新 import
6. 驗證（必做）：`npm test` / `npm run type-check` / `npm run lint`；並用 `rg -n -- "-action\.ts|-actions\.ts" app/[locale]/admin` 確認已收斂（或只留下你刻意保留的例外）。

### 3.7 IO module bloat：`*-io.ts` / `admin-io.ts` 變巨石檔案（可維護性下降）

**觸發條件（任一即需拆分）**

- 任一 IO 檔案（`io.ts` / `admin-io.ts` / `*-io.ts`）行數 > 300
- 或 `export` functions > 12

**拆分步驟（建議採「可回滾、可逐步」）**

1. 選定拆分目標檔案（例如 `lib/modules/shop/admin-io.ts`），先做「責任切片」清單：
   - Config / Settings
   - CRUD（products/orders/coupons/members/...）
   - Reporting / Dashboard
   - Payment / Webhook
2. 以 capability 建立新檔（命名必須語意化）：
   - 例：`products-admin-io.ts`, `orders-admin-io.ts`, `coupons-admin-io.ts`, `members-admin-io.ts`
3. 每次只搬一個 cohesive 區塊（1~3 個 functions）：
   - 保持 function signature 不變
   - 原檔改成 re-export 或 thin wrapper（避免一次性大改造成 diff 難 review）
4. 更新所有 import（優先從「同一層 route 的 `actions.ts`」開始改），避免跨層直接抓舊檔
5. 若拆分後需要共用 helper：
  - 優先抽到同一 domain 的 pure module（`lib/modules/<domain>/*.ts`）或 `lib/types/*`
   - 禁止在多個 IO 檔內複製同一段 query/validation（Single source）
6. 驗證（必做）：`npm test` / `npm run type-check` / `npm run lint`
7. 收尾：回寫 `ARCHITECTURE.md`（若新增了新的 IO 檔命名模式）與本檔 §2 的檢查清單（若需要新增新的 grep）。

### 3.8 In-code 文件漂移（@see/路徑）Playbook

> 目的：避免「檔案已搬家，但註解/連結仍指向舊路徑」造成誤導；這類 drift 不會被 types/tests 抓到，但會降低可維護性。

**觸發條件**

- `@see` / doc comment 指向不存在的路徑（例如曾經把 route-local client 從 `components/admin/**` 搬回 `app/**`，但註解未更新）

**修復步驟（可逐筆處理，單一 PR 只修一個模組也可）**

1. 找出所有可疑引用：
   - `rg -n "@see components/admin" app components lib`
   - `rg -n "components/admin/.*\\.tsx" app components lib`
2. 對每一筆命中，逐一確認引用目標是否存在：
   - 若目標檔案不存在：更新為正確路徑（例如 `./CategoriesClient.tsx`）
   - 若目標檔案存在但已不符合分層（例如 route-local client 仍放在 `components/admin/**` 且需 import `./actions`）：依 `ARCHITECTURE.md` 與本檔 §1 / §3.3 的規範搬回 route 內
3. 驗證（必做）：
   - 重新跑 `rg -n "@see components/admin" app components lib`，預期僅剩「真的存在且合理」的引用（或 0 命中）
   - `npm test` / `npm run type-check`

### 3.9 P0 上線前必做（Lint / Production DB / Theme Console / Secrets）

> 目的：把 `doc/ROADMAP.md` 的 P0 拆成「可直接照做」的 runbook，避免上線前才發現 lint/DB/RBAC/Theme/Secrets 任一環節未對齊。

**完成定義（P0：全部必須滿足）**

1. `npm run lint` **exit code = 0**（不能有 error）
2. Production Supabase DB 已完整對齊 `supabase/COMBINED_ADD.sql` + `supabase/COMBINED_SEED.sql`
3. RBAC 生效：Owner/Editor JWT `app_metadata.role` 正確；Editor 不能寫入 owner-only 資料（Theme/Preprocessing/Embeddings 等）
4. Theme Console 手動驗證完成（Owner/Editor flows）且 public 無 FOUC
5. Secrets 已配置：
   - 必填：`SUPABASE_SERVICE_ROLE_KEY`
   - 若啟用 AI Analysis 排程：`CRON_SECRET` + `OPENROUTER_API_KEY`

---

**Canonical references (avoid duplication)**

- Go-live / ops verification: `doc/runbook/go-live.md`
- Unblocked tasks: `doc/TASKS.md`
- External dependencies / blockers: `doc/BLOCKERS.md`
- Historical step-by-step (archived snapshot): `doc/archive/2025-12-31-uiux-refactor-archive.md` (§3.9)

---

## 4. 已知飄移（需要修復）

> 本節的 item 編號（尤其是 item 2/3/6/8）已被多處 in-code `@see uiux_refactor.md §4 item ...` 引用；請勿改號。
> 本檔只保留「當前狀態 + 待修復 / 待落地」的最小資訊；詳細落地記錄請放/參照 `doc/archive/*`。

**狀態（2026-01-11）**

- Open drift items：目前無（若新增 drift，請先補 `Evidence`：rg output + file paths，再拆 PR）

1. **[ARCHIVED ✅] Import/Export：Import rollback / atomicity 與 PRD drift** → `doc/specs/completed/import-export-spec.md`
2. **[ARCHIVED ✅] Import/Export：CSV 匯出（Products/Coupons/Orders/Members/Comments）** → `doc/specs/completed/import-export-spec.md`
3. **[ARCHIVED ✅] Import/Export：Job History / Audit Trail / 重新下載** → `doc/specs/completed/import-export-spec.md`
4. **[ARCHIVED ✅] AI Analysis：短 ID（C1）與 Users list entrypoint** → `doc/archive/2025-12-30-ai-analysis-implementation.md`
5. **[ARCHIVED ✅] AI Analysis：Smart Sampling（購買優先保留）** → `doc/archive/2025-12-30-ai-analysis-implementation.md`
6. **[ARCHIVED ✅] AI Analysis：PDF 匯出（Print CSS）與定期報告排程** → `doc/archive/2025-12-31-ai-analysis-e2e-hardening.md`
7. **[ARCHIVED ✅] Supabase AI：Keyword Search（tsvector）與 Hybrid Scoring** → `doc/specs/completed/embeddings-semantic-search-spec.md`
8. **[ARCHIVED ✅] Supabase AI：Search Analytics（日誌表 + 低品質查詢追蹤）** → `doc/specs/completed/embeddings-semantic-search-spec.md`
9. **[ARCHIVED ✅] Data Preprocessing：動態配置（DB SSOT + Config Editor）** → `doc/specs/completed/data-preprocessing-pipeline-spec.md`
10. **[ARCHIVED ✅] Admin i18n Toggle：inline branching / legacy translations island** → `doc/meta/STEP_PLAN.md`
 
 ### 4.1 Admin routes must use `actions.ts`（ARCHIVED; keep for stable `@see`）

- Guardrail enforced by `tests/architecture-boundaries.test.ts`；修復流程請看本檔 §3.6。

---

## 6. 修復手冊附錄：Stable `@see` Index（請勿刪除/改號）

> 本節只為了維持 in-code `@see uiux_refactor.md §...` 連結穩定；不要改號/搬動。
> 詳細實作記錄請一律放 `doc/archive/*`，本檔只保留「索引 + 約束」。

### 6.1 Import/Export / Admin DX（Stable `@see`）

- Unified Result type + error codes（ARCHIVED）→ `doc/archive/2025-12-30-admin-dx-cleanup.md`（§1）
- Users Admin Notes：Markdown preview（ARCHIVED）→ `doc/archive/2025-12-29-users-v1-cleanup.md`（§1）
- Import/Export code map（ARCHIVED）→ `doc/specs/completed/import-export-spec.md`
- Import/Export job history notes（ARCHIVED）→ `doc/specs/completed/import-export-spec.md`

#### 6.1.1 Heavy deps bundle guard（ARCHIVED）

- Guardrail tests：`tests/architecture-boundaries.test.ts`（import/export heavy deps must not leak into `app/**` / `components/**`）

#### 6.1.2 Phase 1: Blog MVP（ARCHIVED; keep anchors like Phase 1 B.3）

**Phase 1 B — Blog ZIP Import**

- B.1 Preview（unzip + extract posts/categories）→ `lib/modules/import-export/import-blog-preview-io.ts`
- B.2 Validate（SSOT types + validators）→ `lib/types/import-export.ts`, `lib/modules/import-export/validators/blog/*`
- B.3 Transaction-safe batch apply（RPC; atomic rollback）→ `supabase/COMBINED_ADD.sql`（`import_blog_bundle_atomic`）
- B.4 Apply（DB writes; current path）→ `lib/modules/import-export/import-blog-apply-io.ts`

**Phase 1 C — Admin wiring**

- C.1 Server actions + RBAC gate → `app/[locale]/admin/(data)/import-export/actions.ts`

#### 6.1.3 Phase 2–3: Gallery/Shop/Content/Comments（ARCHIVED; keep anchors like Phase 2/3）

- Phase 2（Gallery/Shop）：`lib/modules/import-export/*gallery*`, `lib/modules/import-export/*shop*`
- Phase 3（Content/Comments）：`lib/modules/import-export/*content*`, `lib/modules/import-export/export-comments-io.ts`
- Code map：`doc/specs/completed/import-export-spec.md`

#### 6.1.4 JSON Import UI (Gallery/Shop/Content)（ARCHIVED）

- UI entrypoint：`app/[locale]/admin/(data)/import-export/ImportExportClient.tsx`

### 6.2 AI Analysis（Stable `@see`）

- Phase 1 code map（ARCHIVED）→ `doc/archive/2025-12-30-ai-analysis-implementation.md`
- Phase 1 end-to-end hardening（ARCHIVED）→ `doc/archive/2025-12-31-ai-analysis-e2e-hardening.md`
- Deployment：`doc/runbook/ai-analysis.md`
- Users Tag Filter UI（ARCHIVED）→ `doc/archive/2025-12-29-users-v1-cleanup.md`（§2, §4）

#### 6.2.2 Phase 1 implementation index（ARCHIVED; referenced by multiple `@see`）

- Data collection layer → `doc/archive/2025-12-30-ai-analysis-implementation.md`
- Background worker implementation → `app/api/cron/ai-analysis/route.ts`（+ `doc/archive/2025-12-30-ai-analysis-implementation.md`）
- Reports viewer / model pricing / cron visibility / IO split → `doc/archive/2025-12-31-ai-analysis-e2e-hardening.md`

### 6.3 Supabase AI / pgvector（Stable `@see`）

- Spec（SSoT code map）→ `doc/specs/completed/embeddings-semantic-search-spec.md`

#### 6.3.2 Phase 6（RAG + 推薦）— stable item numbers

1. Control Center：Admin 語意搜尋 UI → `app/[locale]/admin/(data)/control-center/*`
2. similar_items 定期更新（Cron + IO）→ `app/api/cron/similar-items/route.ts`, `lib/modules/embedding/similar-items-worker-io.ts`
3. Public UI：Similar*（Server Components）→ `components/*/Similar\*.tsx`, `lib/modules/embedding/similar-items-public-io.ts`
4. RAG 整合 AI Analysis → `lib/modules/ai-analysis/analysis-rag-io.ts`, `lib/modules/ai-analysis/analysis-prompts.ts`
5. Admin：Embedding 管理 UI（Owner-only）→ `app/[locale]/admin/(data)/embeddings/*`

### 6.4 Data Preprocessing（Stable `@see`）

- Spec（SSoT code map）→ `doc/specs/completed/data-preprocessing-pipeline-spec.md`

#### 6.4.2 Phase 6.5（進階 Pipeline）— stable item numbers

1. IO 與 queue wiring → `lib/modules/preprocessing/preprocess-io.ts`, `app/api/cron/embedding-queue/route.ts`, `lib/modules/embedding/embedding-target-content-io.ts`
2. LLM-as-a-Judge（品質評分）→ `supabase/functions/judge-preprocessing/*`, `lib/modules/preprocessing/judge-io.ts`
3. Cohere Re-ranker（SDK/API access boundary）→ `lib/rerank/*`, `lib/validators/rerank.ts`
4. Admin monitoring dashboard → `lib/modules/preprocessing/monitoring-io.ts`, `app/[locale]/admin/(data)/preprocessing/*`
