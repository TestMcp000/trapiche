# Admin UI/UX Cleanup Playbook（後台）— Drift Tracker / 修復手冊

> Last Updated: 2025-12-31
> Status: ARCHIVED SNAPSHOT（canonical active doc: `../../uiux_refactor.md`）  
> Assumption: 專案尚未上線，DB 可直接 `reset`（遷移成本 ≈0，不保留相容性）。
> Note (2026-01-03): 部分 2025-12-30 的 code map archive 已整合進 `doc/specs/*` 並刪除；請改查 `../specs/README.md` 與 `README.md`。

本文件的定位：**用來追蹤「目前專案狀態 vs 規格約束」的飄移點，並提供可照做的修復步驟**。  
已完成任務的歷史記錄請看：`doc/archive/`（或 `ARCHITECTURE.md` §3.13）。

---

## Summary (When / What / Why / How)

- When: 2025-12-31 (snapshot)
- What: archived snapshot of the Admin UI/UX cleanup playbook (drift tracker + merge checklist + fix playbooks).
- Why: keep historical context while the canonical active doc moved to `../../uiux_refactor.md` for SRP and stability.
- How: this file is read-only reference; new drift and fixes should be tracked in `../../uiux_refactor.md` and logged in newer `doc/archive/*`.
- Result: use this doc only for historical reference; do not treat it as current SSoT.

## 0. Non‑Negotiables（與 `ARCHITECTURE.md` 對齊）

1. **Server‑first**：public 頁面預設 server component；client 只做互動。
2. **Theme single source**：preset 只來自 `lib/theme/presets.ts`；token allowlist 只來自 `lib/types/theme.ts`；SSR 以 inline CSS vars 套用並設 `data-theme`。
3. **IO boundaries**：所有 DB / 外部 API I/O 集中於 `lib/**/io.ts` 與 `lib/**/*-io.ts`（包含 `admin-io.ts` / `payment-io.ts` / `cache-io.ts` / `<feature>-io.ts`）；app layer（page/action/route handler）只做 **parse/validate → call lib → revalidate**。
4. **Service role 最小化**：
   - `createAdminClient()` 只能出現在 `lib/**/io.ts` 或 `lib/**/*-io.ts`
   - 且檔案必須 `import 'server-only';`
   - 由 `tests/architecture-boundaries.test.ts` 守門
5. **避免不必要 client bundle**：public UI 禁止 admin-only heavy deps（例如 `recharts`），重型依賴只在 admin routes 並 dynamic import。
6. **Public SSR cached reads**：public server components 讀取（含 `sitemap.ts` / canonical resolve）必須優先使用 `lib/*/cached.ts`（`cachedQuery` + anon client），避免 cookies 影響 cache key、保持 TTFB/LCP 穩定。
7. **IO 模組不可變成雜物抽屜**：任何 `io.ts` / `admin-io.ts` / `*-io.ts` 超過 **300 行**或 `export` functions > **12** 必須拆分成更語意化 submodules（規範見 `ARCHITECTURE.md`）。

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
   - `rg -n "\bcreateAdminClient\s*\(" lib app components --glob "!lib/supabase/admin.ts"`（只能在 `lib/**/io.ts` 或 `lib/**/*-io.ts`；排除 factory 本身；注意 grep 會命中註解，需人工確認是否為呼叫）
   - `rg -n "\.from\('\w" app components`（app/components 不應出現 Supabase `.from('table')`）
   - `rg --files-without-match "import 'server-only';" lib --glob "**/io.ts" --glob "**/*-io.ts"`（所有 IO 模組都必須標記 server-only，避免誤入 client bundle）
   - `rg -n "fonts\.googleapis\.com" app components lib`（禁止引入外部 fonts）
   - `rg -n "NEXT_PUBLIC_SITE_URL" app components lib`（預期：只命中 `lib/seo/hreflang.ts`；其他命中視為 drift，代表有繞過 `SITE_URL` 單一來源）
   - `rg -n "\.vercel\.app" app components lib`（預期：無輸出；若有輸出代表硬編部署網域）
   - `rg -n "\brecharts\b" app components`（預期：只命中 admin UI；public UI 命中視為 drift，代表不必要 client bundle 風險）
   - `rg -n "@/app/\[locale\]/admin" components/admin`（預期：無輸出；若有輸出代表 `components/admin/**` 反向依賴 `app/**`）
   - `rg --files --glob "app/[[]locale]/admin/**" | rg -- '-action\.ts$|-actions\.ts$'`（admin server actions 必須統一為 `actions.ts`；禁止遺留 `*-action(s).ts`）
   - **AI/Embedding SDK bundle guard（預防性）**：
     - `rg -n 'from\s+[''"]openai[''"]' app components lib`（預期：無輸出；OpenAI SDK 只允許存在於 `supabase/functions/**`）
     - `rg -n "openrouter" components`（預期：無輸出；OpenRouter SDK/clients 不得進 client bundle）
   - **Import/Export heavy deps bundle guard（預防性）**：
     - `rg -n "\b(gray-matter|jszip|papaparse|exceljs)\b" app components`（預期：無輸出；這些 heavy deps 必須 server-only，且只能存在於 `lib/import-export/**`（或 scripts），不得進 client bundle）
   - **IO bloat（>300 行）**：
   - PowerShell：`$root=(Get-Location).Path; Get-ChildItem lib -Recurse -File -Filter "*.ts" | Where-Object { $_.FullName -notmatch "\\\\lib\\\\supabase\\\\" } | Where-Object { ($_.FullName -replace "\\\\","/") -match "(^|/)(io|admin-io|payment-io|cache-io|.+-io)\\.ts$" } | ForEach-Object { $lines=(Get-Content $_.FullName).Count; if ($lines -gt 300) { \"{0} {1}\" -f $lines.ToString().PadLeft(4), $_.FullName.Substring($root.Length+1) } } | Sort-Object -Descending`
   - Bash：`find lib -name "*.ts" -not -path "lib/supabase/*" | rg "(/|^)(io|admin-io|payment-io|cache-io|.+-io)\\.ts$" | while read -r f; do echo \"$(wc -l < \"$f\") $f\"; done | awk '$1>300' | sort -nr`

---

## 3. 修復手冊（Playbooks）

> 目的：把常見 drift 類型的修復流程固定下來，避免每次都重新做架構決策。

### 3.1 IO boundaries：app/components 出現 DB query（`.from('...')`）

**觸發條件（任一即為 drift）**

- `rg -n "\.from\('" app components` 有輸出（注意排除 `Array.from`）
- `rg -n "createAdminClient\(" app components` 有輸出

**修復步驟（照順序做）**

1. 確認這段 query 的 domain（blog/gallery/shop/comment/...），並在 `lib/<domain>/` 補齊對應 IO 檔案：
   - Public reads：`io.ts`（anon client, server-only）＋必要時 `cached.ts`（`cachedQuery`）
   - Admin reads/writes：`admin-io.ts`（cookie-based server client; RLS）
   - 系統/金流/需要 service role：`*-io.ts`（`createAdminClient()`；檔案首行必須 `import 'server-only';`）
2. 把 `.from('table')` query 從 app/components 移到 `lib/<domain>/*-io.ts`，回傳 typed result（type 來源：`lib/types/*`）。
3. app layer 只保留：`parse/validate → call lib → revalidate`，不要在 app/components 留任何 `.from()`。
4. Public SSR 的讀取一律改呼叫 `lib/<domain>/cached.ts`（避免把 cookie-based client 的結果錯誤快取，造成跨使用者資料污染）。
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

- Public server components 直接 import `lib/<domain>/io.ts` 做列表/詳細頁讀取（例外：user-specific/auth gating）
- `lib/<domain>/cached.ts` 的 fetcher 內出現 `createClient()` / `cookies()` / `headers()`（會導致錯誤快取或 cache key 污染）

**修復步驟**

1. 把 public 讀取函數保留在 `lib/<domain>/io.ts`（使用 `lib/supabase/anon.ts`；檔案 `import 'server-only';`）。
2. 在 `lib/<domain>/cached.ts` 用 `cachedQuery` 包裝（tag 對齊 domain，例：`['blog']` / `['gallery']` / `['shop']`）。
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

1. 選定拆分目標檔案（例如 `lib/shop/admin-io.ts`），先做「責任切片」清單：
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
   - 優先抽到同一 domain 的 pure module（`lib/<domain>/*.ts`）或 `lib/types/*`
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

---

## 4. 已知飄移（需要修復）

> 只列「未完成」項目；完成後請從本節移除。

**（2025-12-31 Review）目前無架構 guardrail drift（已跑 §2 grep checklist + IO bloat 檢查）。**

---

## 5. DB Reset（仍保留：因為 DB 視為全新空值）

```bash
node scripts/db.mjs reset
```

---

## 6. Clean Code / UX Debt（目前無未完成；保留作為後續擴充路徑圖）

> 本節列的不是 architecture guardrail drift（目前 guardrails 已通過），而是會影響後續擴充的「一致性 / 可維護性 / 可測試性」欠債。
>
> 完成某一項後請從本節移除（或搬到 `doc/archive/`），避免把「已完成」混在 ACTIVE 文件裡（已完成項目：見 `doc/archive/2025-12-30-admin-dx-cleanup.md`）。

### 6.1 Data Intelligence Platform（Module A: Import/Export）— Post‑implementation hardening

> 需求來源：`doc/specs/completed/IMPORT_EXPORT.md`（v2.4, 2025-12-30）  
> 歷史（preflight）：`doc/archive/2025-12-30-data-intelligence-preflight.md`  
> 實作落地（Code map）：`doc/archive/2025-12-30-import-export-implementation.md`

**Stable `@see`（已完成；僅保留連結避免 in-code 文件漂移）**

- Admin Server Actions：統一 Result type + error codes（ARCHIVED）→ `doc/archive/2025-12-30-admin-dx-cleanup.md`（§1）
- Users Admin Notes：可選 Markdown preview（ARCHIVED）→ `doc/archive/2025-12-29-users-v1-cleanup.md`（§1）

**功能狀態（以程式碼為準）**

- Admin route：`app/[locale]/admin/(data)/import-export/`
  - Export UI：Blog / Gallery / Shop / Content / Comments
  - Import UI：Blog (ZIP) + Gallery / Shop / Content (JSON)
- Server actions：`app/[locale]/admin/(data)/import-export/actions.ts`
  - Export：Blog / Gallery Items & Categories / Products & Coupons / Orders & Members / Site Content & Landing Sections / Comments
  - Import（preview/apply）：Blog (ZIP) / Gallery Items & Categories / Products & Coupons / Site Content & Landing Sections
- Lib modules：`lib/import-export/*`（formatters/parsers/validators + server-only IO）
- Tests：`tests/import-export/*`（Markdown/JSON formatters/parsers/validators）
- RBAC：Export = owner/editor; Import = owner only

**Deferred（暫不實作；文件已同步）**

- CSV export：規格已定義於 PRD，但目前優先使用 JSON。如需 CSV 可於未來 Phase 擴充。
- Job history：匯入/匯出工作歷史紀錄（audit trail、重新下載）。目前為即時操作模式（stub 已清理；見 `doc/archive/2025-12-31-import-export-stub-cleanup.md`）。

#### 6.1.1–6.1.4（Archived links only; keep for stable `@see`）

> 本小節只保留連結（不保留完成細節），避免 ACTIVE 文件混入已完成項目；同時避免 code comment 的 `@see uiux_refactor.md §6.1.*` 失效造成 in-code 文件漂移。

#### 6.1.1 Phase 0: Preflight skeleton（ARCHIVED）

- 詳細記錄：`doc/archive/2025-12-30-data-intelligence-preflight.md`

#### 6.1.2 Phase 1: Blog MVP（ARCHIVED）

- 詳細記錄：`doc/archive/2025-12-30-import-export-implementation.md`

#### 6.1.3 Phase 2–3: Gallery/Shop/Content/Comments（ARCHIVED）

- 詳細記錄：`doc/archive/2025-12-30-import-export-implementation.md`

#### 6.1.4 JSON Import UI (Gallery/Shop/Content)（ARCHIVED）

- 詳細記錄：`doc/archive/2025-12-30-import-export-implementation.md`

#### 6.1.5 待修復清單（Clean Code / 維護性）

> 只列「未完成」項目；完成後請從本節移除（完成記錄移至 `doc/archive/`）。

- （2025-12-31）目前無未完成項目；完成記錄：
  - `doc/archive/2025-12-31-import-export-stub-cleanup.md`
  - `doc/archive/2025-12-30-io-bloat-refactor.md`
  - `doc/archive/2025-12-30-import-export-implementation.md`

#### 6.1.6 Deferred（CSV export / Job history）— 建議拆解（可逐步交付）

> 目的：把 PRD 的 Deferred 需求拆成「一小步一小步可跟做」的路徑，降低之後啟動時的設計成本。

1. **CSV export（先做 Products/Coupons）**
   - Pure formatters：新增 `lib/import-export/formatters/csv/*`（SSOT: header/escape/ISO time/cents/nulls 規則），並加上 `tests/import-export/csv/*`
   - Domain mapping：在 `lib/import-export/export-*-io.ts` 補上「CSV row schema」pure mapper（避免在 actions/client 做資料 reshape）
   - Admin action：擴充 `app/[locale]/admin/(data)/import-export/actions.ts` 支援 `format: 'csv'`（validate → call lib → return）
   - UI：`app/[locale]/admin/(data)/import-export/ImportExportClient.tsx` 加上 format selector（依 domain 顯示可用格式）
2. **CSV export（Orders/Members/Comments 等其餘 domain）**
   - 逐 domain 擴充 mapper + tests（每次只新增一種資料類型，避免一次 diff 過大）
   - 若需要多檔輸出：統一 ZIP 包裝（避免一次性下載多檔造成 DX/瀏覽器限制）
3. **Job history（audit trail + re-download）**
   - DB：新增 `import_export_jobs`（或 `admin_jobs`）表 + indexes（`supabase/02_add/*`）；只存 metadata（type/domain/format/status/created_by/created_at/error），避免把大檔塞 DB
   - IO：新增 `lib/import-export/job-history-io.ts`（server-only）封裝 insert/update/list
   - Actions：在 `actions.ts` 的 export/import pipeline 中加上「開始/成功/失敗」狀態寫入（注意冪等：同一 requestId 重跑不產生重複 job）
   - UI：Import/Export 頁面加上 history panel（Owner/Editor 只看；Owner 才能重跑 import）
   - Storage（可選）：若要支援下載舊檔，需把 export artifact 存到 Supabase Storage，並在 job record 存 object path（避免 Vercel ephemeral FS）

### 6.2 Data Intelligence Platform（Module B: AI Analysis）— Phase 1（COMPLETE）/ Phase 2+ Roadmap

> 需求來源：`doc/specs/completed/AI_ANALYSIS_v2.md`（v2.2, 2025-12-27）
> 實作落地（Code map / 完成記錄）：`doc/archive/2025-12-30-ai-analysis-implementation.md`

**Stable `@see`（Users Tag Filter UI；已完成）**

- `doc/archive/2025-12-29-users-v1-cleanup.md`（§2, §4）

#### 6.2.1 現況（Phase 1 end-to-end 已落地）

- App layer（Admin UI）：`app/[locale]/admin/(data)/ai-analysis/`（`page.tsx`, `actions.ts`, `AIAnalysisClient.tsx`）
- Background worker：`app/api/cron/ai-analysis/route.ts`（Cron endpoint）
- Lib layer：
  - SSOT types：`lib/types/ai-analysis.ts`
  - Validators：`lib/validators/ai-analysis.ts`
  - Pure helpers（token/cost + PII 去識別化 + sampling）：`lib/ai-analysis/analysis-pure.ts`
  - Server-only IO：`lib/ai-analysis/analysis-run-io.ts`（facade）, `lib/ai-analysis/openrouter-run-io.ts`, `lib/ai-analysis/openrouter-models-io.ts`, `lib/ai-analysis/analysis-report-io.ts`, `lib/ai-analysis/analysis-usage-io.ts`（main facade：`lib/ai-analysis/io.ts`）
  - Data collection layer：`lib/ai-analysis/analysis-data-io.ts` + `analysis-*-io.ts` + `analysis-data-mappers.ts`（pure）
  - Pure prompts：`lib/ai-analysis/analysis-prompts.ts`
- Tests：`tests/ai-analysis/ai-analysis-pure.test.ts`

#### 6.2.2 End-to-End hardening（ARCHIVED）

> 只列「未完成」項目；已完成的 Phase 1 落地記錄已移至 `doc/archive/`，此處只保留連結避免 `@see uiux_refactor.md §6.2.2 ...` 漂移。

**Stable `@see`（已完成；ARCHIVED links only）**

- DB schema / RPC（ARCHIVED）→ `doc/archive/2025-12-30-ai-analysis-implementation.md`
- Data collection layer（ARCHIVED）→ `doc/archive/2025-12-30-ai-analysis-implementation.md`
- Background worker（ARCHIVED）→ `doc/archive/2025-12-30-ai-analysis-implementation.md`
- IO bloat（ARCHIVED）→ `doc/archive/2025-12-31-ai-analysis-e2e-hardening.md`

**待修復（仍未達到 PRD 的 end-to-end 體驗）**

- （2025-12-31）Phase 1 end-to-end hardening 已完成；詳細記錄：`doc/archive/2025-12-31-ai-analysis-e2e-hardening.md`

#### 6.2.3 Deferred（Phase 2+）

> 下面以「一個功能 = 一個可獨立 PR」為原則拆解；每一步都遵守 app layer 只做 validate → call lib → revalidate 的 IO boundary。

1. **特定用戶分析入口（短 ID + Users list entrypoint）**
   - DB：為 `user_directory` 增加 `short_id`（例如 `C001`）或建立對應表（避免用 row_number 造成不穩定）
   - IO：新增 `lib/user/user-short-id-io.ts`（server-only）提供 `getUserByShortId()` / `ensureShortIdForUser()`
   - UI：在 `/[locale]/admin/users` 增加「Analyze」入口，帶 query params 到 `/[locale]/admin/(data)/ai-analysis`
   - Validator：`lib/validators/ai-analysis.ts` 支援 `subjectShortId`（或只用 userId，但 UI 顯示 short id）
2. **智能採樣（購買優先保留）**
   - Pure：在 `lib/ai-analysis/analysis-pure.ts` 補上 deterministic sampling（seeded）+ “keep purchases” 策略
   - UI：`AIAnalysisClient.tsx` 顯示「原始筆數/採樣後筆數/被保留規則」並提供 toggle（Phase gate）
   - Tests：`tests/ai-analysis/ai-analysis-pure.test.ts` 加上 sampling 行為測試（確保 purchases 不被抽掉）
3. **月度預算強制限制（Phase 3）**
   - DB：在 `site_config`（或獨立表）增加 `ai_monthly_budget_usd` + usage 聚合欄位（或每次從 reports sum）
   - IO：新增 `lib/ai-analysis/budget-io.ts`（server-only）提供 `getBudgetStatus()` / `assertBudgetAvailable()`
   - Actions：run request 前呼叫 `assertBudgetAvailable()`；若超額回傳明確 errorCode（UI 顯示）
4. **匯出（PDF/分享連結）與排程**
   - PDF：先以「Server-rendered HTML + Print CSS」達成（避免引入 heavyweight PDF runtime）；必要時再導入 headless renderer
   - 排程：新增 `ai_analysis_schedules` + cron endpoint（沿用 `CRON_SECRET` 模式），逐筆 enqueue 到既有 worker pipeline
   - UI：在 Reports list 增加 “Export” 與 “Schedule” entry（admin-only；避免進 public bundle）

### 6.3 Data Intelligence Platform（Module C: Supabase AI / pgvector）— 具體實作路徑（P3）

> 需求來源：`doc/specs/completed/SUPABASE_AI.md`（v1.3, 2025-12-30）
> 實作落地（Code map / 完成記錄）：`doc/archive/2025-12-30-supabase-ai-implementation.md`

#### 6.3.1 Phase 5: 基礎建設（ARCHIVED）

- 完成記錄：`doc/archive/2025-12-30-supabase-ai-implementation.md`

#### 6.3.2 Phase 6（RAG + 推薦）[COMPLETE]

> 需求來源：`doc/specs/completed/SUPABASE_AI.md` §Phase 6-7。以下拆成可逐步交付的小步驟（每一項可獨立 PR）。

- （2025-12-31）Phase 6 已完成；詳細記錄：`doc/archive/2025-12-31-supabase-ai-phase-6-implementation.md`

#### 6.3.3 Deferred（Phase 7: Hybrid Search / Analytics）— 建議拆解

> 需求來源：`doc/specs/completed/SUPABASE_AI.md` §Phase 7。

1. **Keyword search（Postgres full-text search）**
   - DB：為 `embeddings.chunk_content` 新增 `tsvector`（generated column）+ GIN index（migration under `supabase/02_add/*`）
   - IO：新增 `lib/embedding/keyword-search-io.ts`（server-only）提供 `keywordSearch()`（tsquery + rank）
2. **Hybrid scoring（semantic + keyword）**
   - Pure：新增 `lib/embedding/hybrid-score.ts`（pure）實作 `final_score = semantic*α + keyword*β`
   - IO：新增 `lib/embedding/hybrid-search-io.ts` 組合 `semanticSearch()` + `keywordSearch()`（同一 query 產生兩套候選集再 merge）
   - UI：Control Center 增加「Search mode: semantic/keyword/hybrid」與 α/β sliders（admin-only）
3. **Search analytics（查詢品質回饋）**
   - DB：新增 `semantic_search_logs` 表（query/targetType/resultCount/topScore/latency/created_at）
   - IO：`lib/embedding/search-analytics-io.ts` 寫入 logs（注意：可採 sample rate，避免寫入量）
   - UI：Control Center 增加簡易 report（top queries with low results / low score）

### 6.4 Data Preprocessing Pipeline（Module C Extension）— 具體實作路徑（P3）

> 需求來源：`doc/specs/completed/DATA_PREPROCESSING.md`（v1.2, 2025-12-30）
> 實作落地（Code map / 完成記錄）：`doc/archive/2025-12-30-data-preprocessing-implementation.md`

#### 6.4.1 Phase 5.5: 基礎 Pipeline（ARCHIVED）

- 完成記錄：`doc/archive/2025-12-30-data-preprocessing-implementation.md`

#### 6.4.2 Phase 6.5（進階 Pipeline）[COMPLETE]

> 需求來源：`doc/specs/completed/DATA_PREPROCESSING.md` §Phase 6.5+。以下拆成可逐步交付的小步驟（每一項可獨立 PR）。

- （2025-12-31）Phase 6.5 已完成；詳細記錄：`doc/archive/2025-12-31-data-preprocessing-phase-6-5-implementation.md`

#### 6.4.3 Deferred（Phase 7+: 可配置 Pipeline）— 建議拆解

> 需求來源：`doc/specs/completed/DATA_PREPROCESSING.md` §Phase 7+。

1. **Config schema（單一真相）**
   - DB：在 `site_config` 增加 `preprocessing_config`（chunk size/overlap/quality thresholds/sampling）
   - Types：新增 `lib/types/preprocessing-config.ts`（SSOT）+ `lib/validators/preprocessing-config.ts`（pure）
2. **Pipeline wiring（以 config 驅動）**
   - IO：`lib/preprocessing/preprocess-io.ts` 讀取 config 並傳入 pure pipeline（避免在 action/client 設定）
   - Judge/Rerank：將 sampling rate / rerank enablement 也納入 config（預設 safe）
3. **Admin UI（Config editor）**
   - 在 `/[locale]/admin/(data)/preprocessing` 增加 Config tab（owner-only）
   - Server actions：validate → persist config → revalidate
4. **Guardrails**
   - Tests：補上 validator tests（invalid config 不可寫入）
   - Performance：新增一條簡單的 “config read is cached” 規則（避免每次 request 都 hit DB）
