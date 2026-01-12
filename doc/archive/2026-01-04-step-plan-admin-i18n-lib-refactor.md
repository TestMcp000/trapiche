# [ARCHIVED] Step-by-Step Execution Plan — Drift Cleanup (Admin i18n gaps) + `lib/` Restructure

> Archived from `doc/meta/STEP_PLAN.md` on 2026-01-04（已完成；後續以 lib/modules 遷移計畫為準）

> Status: **ARCHIVED / COMPLETE**  
> Last Updated: 2026-01-04  
> Owner: Site Owner  
> Audience: executor agent（照本檔逐 PR 執行；每個 PR merge 後更新本檔）  
> Mode: **B — Alignment gate**（偵測 drift/歧義/衝突時：先對齊再規劃 PR）  
> Scope:
>
> 1. **Admin i18n migration gap closeout**：針對 Theme 模組與 Shop 子模組（payments、orders）等 admin pages，清除 `locale === 'zh' ? ... : ...` inline branching（UI 文案），改用 `messages/{en,zh}.json`（`admin.*` namespace）+ `adminLocale`。
> 2. **`lib/` 重構（功能不變）**：依目標架構收斂 `lib/` 到 `infrastructure/`（外部服務集中）與 `modules/`（業務模組），並保留 `validators/utils/types` 的純函式/共用型別責任邊界。

## Inputs（以 SSoT 為準；tracking docs 只當線索）

- Architecture / global constraints: `../../ARCHITECTURE.md`
- Implemented behavior (what exists now): `../SPEC.md`
- Security / RLS / secrets: `../SECURITY.md`
- Ops / verification: `../RUNBOOK.md`（details: `../runbook/*`）
- Docs SRP + update matrix: `../GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see`）: `../../uiux_refactor.md`

## Historical / Completed References（不要再當成 active plan）

- Completed admin i18n toggle step plan (archived record): `../archive/2026-01-04-admin-i18n-toggle-step-plan.md`
- Admin i18n foundation（archived）：`../archive/2026-01-04-admin-i18n-foundation.md`
- Go-live readiness + drift alignment（archived）：`../archive/2026-01-04-go-live-readiness-drift-alignment-step-plan.md`

---

## 0) TL;DR（執行順序）

1. **PR-1【P1】** Theme admin i18n：移除 inline branching，改 `messages/*` + `adminLocale`
2. **PR-2【P1】** Shop admin i18n（payments）：移除 inline branching，改 `messages/*` + `adminLocale`
3. **PR-3【P1】[COMPLETE]** Shop admin i18n（orders）：移除 inline branching，改 `messages/*` + `adminLocale`
4. **PR-4【P2】[COMPLETE]** Shop admin i18n（access/coupons/members）：補齊同類 drift（可拆小 PR）
5. **PR-5【P2】** 移除 legacy `lib/i18n/admin-translations.ts`（data modules 改用 `messages/*`）
6. **PR-6【P1】[COMPLETE]** `lib/` 重構 Phase 1：新增目錄、加 shim、更新 docs/tests baseline
7. **PR-7【P1】[COMPLETE]** `lib/` 重構 Phase 2：搬移檔案、全域更新 imports、移除 shim

---

## 1) Constraints（Non‑Negotiables）

- **Admin 文案語言來源**：以 `../SPEC.md#i18n` 為準；Admin UI 以 `adminLocale` 決定文案，URL 仍為 `/{routeLocale}/admin/**`。
- **翻譯檔案**：只用 `messages/en.json` 與 `messages/zh.json`（`admin.*` namespace）；禁止新增 admin 專用翻譯檔案（見 `../SPEC.md#i18n`）。
- **Locale 單一來源**：locale 值與型別以 `lib/i18n/locales.ts` 為準（`../../ARCHITECTURE.md` §8 i18n）。
- **Server-first**：不得為了 i18n 將 page/layout 濫改成 client component（`../../ARCHITECTURE.md` §4.1）。
- **IO boundaries**：DB / 外部 API I/O 只能在 `lib/**/io.ts` 或 `lib/**/*-io.ts`；並遵守 `../../ARCHITECTURE.md` §3.4 lib/（行數/exports 拆分規則）。
- **功能不變**：`lib/` 重構只允許 path/組織調整與 import 重寫；不得改變 runtime 行為（回傳值、cache tags、RLS、webhook flow）。

---

## 2) Alignment Check（現況 + drift）

### What exists now（evidence paths）

- Admin layout 已分離 `routeLocale` / `adminLocale`（Sidebar 使用 next-intl messages）：`app/[locale]/admin/layout.tsx`
- SSoT 宣稱「All admin modules use adminLocale for UI text」：`../SPEC.md#i18n`（Covered Modules）

### Drift Evidence（ACTIVE）

**A) Theme / Shop admin pages 仍有 inline `locale === 'zh'` UI branching（未使用 `messages/*`）**

- Theme:
  - `app/[locale]/admin/theme/LayoutsClient.tsx`
  - `app/[locale]/admin/theme/PageThemesClient.tsx`
  - `app/[locale]/admin/theme/ThemePreviewIframe.tsx`
  - `app/[locale]/admin/theme/preview/page.tsx`
  - `app/[locale]/admin/theme/components/FontSelector.tsx`
  - `app/[locale]/admin/theme/components/FontStatusCard.tsx`
- Shop (admin):
  - `app/[locale]/admin/shop/payments/page.tsx`
  - `app/[locale]/admin/shop/orders/page.tsx`
  - `app/[locale]/admin/shop/orders/[id]/page.tsx`
  - `app/[locale]/admin/shop/orders/[id]/OrderActions.tsx`
  - `app/[locale]/admin/shop/access/AccessClient.tsx`
  - `app/[locale]/admin/shop/coupons/CouponsClient.tsx`
  - `app/[locale]/admin/shop/coupons/CouponDialog.tsx`
  - `app/[locale]/admin/shop/members/page.tsx`

**B) 部分 Data modules 仍依賴 legacy `lib/i18n/admin-translations.ts`（未切到 `messages/*`）**

- `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`
- `app/[locale]/admin/(data)/embeddings/EmbeddingsClient.tsx`
- `app/[locale]/admin/(data)/import-export/ImportExportClient.tsx`
- `app/[locale]/admin/(data)/preprocessing/PreprocessingClient.tsx`

### Drift List（每項含 Doc claim + Evidence + Classification）

1. **Doc claim**：`../SPEC.md#i18n` 宣稱 Theme/Shop（含 payments/orders）已全數使用 `adminLocale` + `messages/*`  
   **Evidence**：上述 Theme/Shop admin pages 仍含 `locale === 'zh' ? ... : ...` 文案分支（UI 文案未落 messages）  
   **分類**：implementation drift（SSoT ahead of code）
2. **Doc claim**：`../SPEC.md#i18n` 宣稱翻譯檔案為 `messages/en.json`, `messages/zh.json`（`admin.*`）  
   **Evidence**：data pages 仍 import `lib/i18n/admin-translations.ts`  
   **分類**：implementation drift（legacy i18n island）

---

## PR-1 — Theme Admin i18n gap closeout【P1】[COMPLETE]

### Goal

- Theme admin routes 改用 `adminLocale` + `messages/*`（`admin.theme.*`），移除 UI 文案的 inline branching。

### Scope

- 只改 Theme admin UI 文案與 locale plumbing；不改 Theme data model / preset 行為。

### Expected file touches

- `app/[locale]/admin/theme/LayoutsClient.tsx`
- `app/[locale]/admin/theme/PageThemesClient.tsx`
- `app/[locale]/admin/theme/ThemePreviewIframe.tsx`
- `app/[locale]/admin/theme/preview/page.tsx`
- `app/[locale]/admin/theme/components/FontSelector.tsx`
- `app/[locale]/admin/theme/components/FontStatusCard.tsx`
- `messages/en.json`, `messages/zh.json`（新增/補齊 `admin.theme.*` keys）

### Steps

1. 建立 `admin.theme.*` keys（先列出所有 UI 文案、button、helper text、(none) placeholders）。
2. 將 `locale === 'zh' ? ... : ...` 替換為 `useTranslations('admin.theme...')`：
   - client components：以既有 admin pages pattern（`NextIntlClientProvider` + `messages={ { admin: allMessages.admin } }`）提供 messages。
   - server components：使用 `getAdminLocale()` + `getMessages({ locale: adminLocale })`，並只取 `admin` namespace。
3. 釐清 `routeLocale` vs `adminLocale`：
   - routeLocale：只用於 `href`/redirect（URL 不變）。
   - adminLocale：只用於 UI 文案 + locale formatting。
4. 加入 grep guardrail（見 Verification）：PR merge 前確保 Theme admin 不再出現 UI 文案 inline branching。

### Verification

- `rg -n \"\\blocale\\b\\s*===\\s*['\\\"]zh['\\\"]\" \"app/[locale]/admin/theme\" -S`（預期 0 hits；若仍需 locale formatting，改用 helper/map，避免 UI 文案分支）
- 手動 smoke：
  - 進入任一 Theme admin page → 切換 Sidebar language toggle → 文案切換、URL 不變

### Docs updates（per `../GOVERNANCE.md`）

- （若變更到既有 SSoT 描述）更新 `doc/SPEC.md`（只補 evidence paths；不要重寫流程）
- （若變更量大需留 audit）`../archive/<date>-theme-admin-i18n-gap-closeout.md`

### Rollback

- revert 本 PR 變更（`messages/*` + Theme admin components），不影響 DB/IO

---

## PR-2 — Shop Admin i18n（payments）gap closeout【P1】[COMPLETE]

### Goal

- `app/[locale]/admin/shop/payments` UI 文案改用 `adminLocale` + `messages/*`（`admin.shop.payments.*`），移除 inline branching。

### Scope

- 僅 i18n/plumbing；不改金流設定資料讀取/顯示邏輯。

### Expected file touches

- `app/[locale]/admin/shop/payments/page.tsx`
- `messages/en.json`, `messages/zh.json`（新增/補齊 `admin.shop.payments.*` keys）

### Steps

1. 依現況抽出 payments page 全部 UI 文案（Owner-only、驗證狀態、環境、copy label、提示文案）。
2. refactor payments page：
   - `const { locale: routeLocale } = await params;`
   - `const adminLocale = await getAdminLocale();`
   - 以 `getMessages({ locale: adminLocale })` 取得 `admin` namespace translations（server render strings）。
   - URL/redirect 一律用 routeLocale。
3. 將 Gateway status labels（pending/invalid/verified 等）落入 `messages/*`，避免在 component 內 hardcode en/zh map。

### Verification

- `rg -n \"\\blocale\\b\\s*===\\s*['\\\"]zh['\\\"]\" \"app/[locale]/admin/shop/payments\" -S`（預期 0 hits）
- 手動 smoke：Editor 進 payments 應顯示權限不足（en/zh 由 toggle 決定）、Owner 可看到設定頁且文案可切換

### Docs updates

- 無（除非調整 UI contract；若有，寫入對應 single-feature spec，再由 `doc/SPEC.md` link）

### Rollback

- revert 本 PR

---

## PR-3 — Shop Admin i18n（orders）gap closeout【P1】[COMPLETE]

### Goal

- `orders` list + detail + actions 全面改用 `adminLocale` + `messages/*`（`admin.shop.orders.*`），移除 inline branching。

### Scope

- 僅 UI 文案與 locale plumbing；不改 orders query、狀態機、金額計算（`ARCHITECTURE.md` §11）。

### Expected file touches

- `app/[locale]/admin/shop/orders/page.tsx`
- `app/[locale]/admin/shop/orders/[id]/page.tsx`
- `app/[locale]/admin/shop/orders/[id]/OrderActions.tsx`
- `messages/en.json`, `messages/zh.json`（新增/補齊 `admin.shop.orders.*` keys）

### Steps

1. 列出 orders UI 所有文案：
   - page header、filters labels、empty state、pagination、detail sections、timeline、actions、form validation errors。
2. 將 status labels（pending_payment/paid/…）由硬編 map 改為 `t('status.pending_payment')` 類型：
   - key 結構建議：`admin.shop.orderStatus.<status>`
3. 將 gateway labels（stripe/linepay/ecpay）由硬編改為 messages（或維持英文但不要 inline zh 分支）。
4. 分離 `routeLocale` vs `adminLocale`：
   - `href`/Link 一律用 routeLocale
   - 文案 + date formatting 一律用 adminLocale（必要時加 `formatDate(adminLocale, date)` helper）

### Verification

- `rg -n \"\\blocale\\b\\s*===\\s*['\\\"]zh['\\\"]\" \"app/[locale]/admin/shop/orders\" -S`（預期 0 hits）
- 手動 smoke：切換 Sidebar language toggle，orders list / detail / actions 文案切換；URL 不變

### Docs updates

- 無（除非調整 UI contract）

### Rollback

- revert 本 PR

---

## PR-4 — Shop Admin i18n sweep（access/coupons/members）【P2】[COMPLETE]

### Goal

- 同一 domain（shop admin）內剩餘 inline branching 一次清掉，避免「部分頁面跟著 toggle、部分不跟」的 UX drift。

### Scope

- i18n only（同 PR 不做 UI/feature enhancement）。

### Expected file touches

- `app/[locale]/admin/shop/access/AccessClient.tsx`
- `app/[locale]/admin/shop/coupons/CouponsClient.tsx`
- `app/[locale]/admin/shop/coupons/CouponDialog.tsx`
- `app/[locale]/admin/shop/members/page.tsx`
- `messages/en.json`, `messages/zh.json`

### Steps

1. 對每個頁面建立 `admin.shop.<submodule>.*` keys。
2. 用 next-intl messages 替換 inline branching。
3. 確保 client components 的 messages 來源一致（沿用既有 admin pages pattern）。

### Verification

- `rg -n \"\\blocale\\b\\s*===\\s*['\\\"]zh['\\\"]\" \"app/[locale]/admin/shop\" -S`（預期 0 hits）

### Docs updates / Rollback

- 同 PR-2/PR-3

---

## PR-5 — Remove legacy admin i18n island (`lib/i18n/admin-translations.ts`)【P2】[COMPLETE]

### Goal

- 將 data pages 從 `lib/i18n/admin-translations.ts` 遷移到 `messages/*`（`admin.data.*`），並刪除 legacy 檔案避免兩套 i18n 並存。

### Expected file touches

- `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`
- `app/[locale]/admin/(data)/embeddings/EmbeddingsClient.tsx`
- `app/[locale]/admin/(data)/import-export/ImportExportClient.tsx`
- `app/[locale]/admin/(data)/preprocessing/PreprocessingClient.tsx`
- `lib/i18n/admin-translations.ts`（刪除）
- `messages/en.json`, `messages/zh.json`

### Steps

1. 盤點 `admin-translations.ts` 實際被引用的 keys（以這 4 個 pages 為範圍）。
2. 將 keys 搬到 `messages/*`（按 module 分 namespace：`admin.data.aiAnalysis.*`, `admin.data.embeddings.*`, ...）。
3. 將 pages 改用 `useTranslations` + next-intl messages；移除 `t()` helper usage。
4. 刪除 `lib/i18n/admin-translations.ts`，並 `rg -n \"admin-translations\"` 確保 0 hits。

### Verification

- `rg -n \"admin-translations\" app lib -S`（預期 0 hits）
- 手動 smoke：data pages 文案跟著 admin toggle 切換

### Docs updates

- `../SPEC.md#i18n`（若需：補上 evidence paths / 移除 legacy 提及；links only）

### Rollback

- revert 本 PR（不影響 DB/worker）

---

## PR-6 — `lib/` Restructure Phase 1 (skeleton + shim + docs/tests baseline)【P1】[COMPLETE]

### Goal

- 引入目標結構的最小集合，讓後續搬移可以分階段進行且可驗證：
  - `lib/infrastructure/*`
  - `lib/modules/*`
  - 保留 `lib/validators`, `lib/utils`, `lib/types`

### Scope

- 先做「目錄 + shim + baseline docs/tests」；暫不做全量搬移。

### Expected file touches（high level）

- `../../ARCHITECTURE.md`（lib 目錄規範更新：新增 `modules/` / `infrastructure/` 分層）
- `../SPEC.md`（Module Inventory / evidence paths 視情況更新）
- `tests/architecture-boundaries.test.ts`（路徑 allowlist / guardrails 更新）
- 新增：`lib/infrastructure/**`, `lib/modules/**`（先放 entrypoints/shims）

### Steps

1. 新增目標目錄（先不搬檔案）：
   - `lib/infrastructure/{supabase,openrouter,cloudinary,stripe,akismet,sentry}/`
   - `lib/modules/{shop,blog,gallery,theme,ai-analysis,embedding,preprocessing,import-export,...}/`
2. 建立 shim 策略（兩階段）：
   - Phase 1：舊 import path 仍可用（避免一次改 100+ 檔案）；新 path 也可用（新 code 一律走新 path）。
   - Phase 2：搬移完成後移除 shim，並全域更新 imports。
3. 更新 `../../ARCHITECTURE.md`（Non-negotiables + decision tree）：
   - 明確定義「外部服務只能放 infrastructure」與「業務模組只能依賴 infrastructure + pure utils」。
4. 更新 `tests/architecture-boundaries.test.ts`：
   - 讓 guardrails 同時認得舊/新路徑（直到 Phase 2 移除 shim）。

### Verification

- `npm test`
- `npm run type-check`
- `npm run lint`

### Docs updates

- `../../ARCHITECTURE.md`
- （必要時）`../archive/<date>-lib-refactor-plan-and-notes.md`

### Rollback

- revert 本 PR（純結構/guardrails 變更）

---

## PR-7 — `lib/` Restructure Phase 2 (move + rewrite imports + remove shim)【P1】[COMPLETE]

### Goal

- 完成實體搬移 + import 全域更新 + shim 移除，讓 `lib/` 收斂到目標架構且功能不變。

### Scope

- 以「先 infrastructure、後 modules」的順序搬移，避免 IO boundary 破裂。

### Steps（suggested order）

1. 搬 infrastructure（外部服務集中）：
   - `lib/supabase/*` → `lib/infrastructure/supabase/*`
   - `lib/monitoring/sentry.ts` → `lib/infrastructure/sentry/*`
   - `lib/spam/akismet-io.ts` → `lib/infrastructure/akismet/*`
   - `lib/ai-analysis/openrouter-*.ts` → `lib/infrastructure/openrouter/*`
   - Cloudinary：將 `app/api/upload-signature/route.ts` 中的 SDK usage 收斂到 `lib/infrastructure/cloudinary/*`
2. 搬 modules（業務模組）：
   - `lib/shop/*` → `lib/modules/shop/*`
   - `lib/theme/*` → `lib/modules/theme/*`
   - 其餘依 `lib/` 目錄現況逐一搬（blog/gallery/content/user/...）
3. 全域改寫 imports（建議用 codemod + `rg` verify），並更新：
   - `tests/architecture-boundaries.test.ts`（移除舊路徑 allowlist）
   - `../../ARCHITECTURE.md` / `../SPEC.md` 的 file maps（links only）
4. 移除 shim（確保 repo 內不再 import 舊路徑）。

### Verification

- `npm test`
- `npm run type-check`
- `npm run lint`
- `rg -n \"@/lib/(shop|theme|supabase|ai-analysis|monitoring|spam)/\" -S`（預期 0 hits；只保留 `@/lib/{modules,infrastructure}/...`）

### Docs updates

- `../../ARCHITECTURE.md`
- `../SPEC.md`
- `../archive/<date>-lib-refactor-implementation.md`（留 code map / pitfalls / rollback notes）

### Rollback

- revert 本 PR（若已跨多檔搬移，優先用 `git revert` 保持歷史可追）
