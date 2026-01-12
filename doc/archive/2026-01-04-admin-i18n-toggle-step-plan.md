# [ARCHIVED] Step-by-Step Execution Plan — Admin i18n Toggle（Admin-only EN / zh）

> Status: **COMPLETE**（all PRs completed）  
> Last Updated: 2026-01-04  
> Owner: Site Owner  
> Scope: Admin Panel bilingual（EN / zh）for all admin routes（AdminSidebar + panels；URL 不變）+ AI Analysis Custom Prompt templates UI/UX（Owner-only CRUD + selection）。  
> Audience: executor agent（照本檔逐 PR 執行；每個 PR merge 後更新本檔）  
> Mode: **B — Alignment gate**（偵測 drift/歧義/衝突時：先對齊再規劃 PR）  
> PRD / Spec Input: `doc/specs/proposed/admin-i18n-toggle-spec.md`（primary; `doc/PRD_ACTIVE.md` 仍為 template）

## Inputs（以 SSoT 為準；tracking docs 只當線索）

- Architecture / global constraints: `../../ARCHITECTURE.md`
- Implemented behavior (what exists now): `../SPEC.md`
- Security / RLS / secrets: `../SECURITY.md`
- Ops / verification: `../RUNBOOK.md`（details: `../runbook/*`）
- Docs SRP + update matrix: `../GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see`）: `../../uiux_refactor.md`
- Feature spec (this work): `../specs/proposed/admin-i18n-toggle-spec.md`
- Related spec (reserve keys): `../specs/proposed/admin-errorlog-spec.md`

## Historical / Completed References（不要再當成 active plan）

- Admin i18n foundation（PR-1/PR-2 complete; archived）：`../archive/2026-01-04-admin-i18n-foundation.md`
- Go-live readiness + drift alignment (completed): `../archive/2026-01-04-go-live-readiness-drift-alignment-step-plan.md`

---

## 0. TL;DR（執行順序）

1. **PR-3（P1/P2）**：Admin Panel i18n plumbing（panels 也吃 `adminLocale`）+ Website Admin modules i18n（Theme/Features/Landing/Portfolio/Settings/Admin dashboard；非 Sidebar 不用 icon）【COMPLETE】
2. **PR-4（P2）**：Blog/Gallery/Content/Users modules i18n（清掉 inline branching；非 Sidebar 不用 icon）【COMPLETE】
3. **PR-5（P1/P2）**：Shop/Data/System modules i18n（含 Data Intelligence pages：Control Center/AI Analysis/Preprocessing/Embeddings/Import/Export）+ Error Log keys sweep（非 Sidebar 不用 icon）【COMPLETE】
4. **PR-6（P1/P2）**：AI Analysis Custom Prompt templates UI/UX（Owner CRUD + selection）+ Data Types selection UX（非 Sidebar 不用 icon）【COMPLETE】
5. **PR-7（P1）**：Docs closeout（`doc/SPEC.md` + specs status）+ drift guardrails【COMPLETE】

---

## 1. Constraints（Non‑Negotiables）

- **URL 不變**：Admin 語言 toggle 只影響後台 UI 文案；URL 仍維持 `/{routeLocale}/admin/**`（見 `doc/specs/proposed/admin-i18n-toggle-spec.md`）。
- **不新增 admin 專用翻譯檔案**：只擴充既有 `messages/en.json` 與 `messages/zh.json`（新增 `admin` namespace；見 spec §1.7）。
- **不把 NextIntl provider 放到 root layout**（避免擴大 public bundle）：遵守 `ARCHITECTURE.md` bundle/provider 約束；僅在 admin layout / admin islands 引入需要的 provider/messages。
- **Locale 單一來源**：locale 值與型別以 `lib/i18n/locales.ts` 為準（`LOCALES`, `Locale`）。
- **Server-first**：不要為了 i18n 把整個 admin page/layout 變成 client component；server components 使用 server-side 翻譯（必要時傳入 adminLocale）。
- **專有名詞不翻譯**：維持英文原文（例如：Admin、Prompt、Data Types、Embedding、RAG、Token…；見 spec §1.3）。
- **Non-Sidebar 禁用 icon**：除 AdminSidebar 導航 icon 外，Admin Panel 內容區不使用 emoji/icon/svg（避免文案/版面 drift；本需求優先於既有 UI）。

---

## 2. Alignment Check（現況 + drift）

### What exists now（evidence paths）

- next-intl 已落地（messages 從 `messages/{locale}.json` 載入）：`lib/i18n/request.ts`, `next.config.ts`
- Routes 使用 `/{locale}/*`：`app/[locale]/layout.tsx`, `middleware.ts`, `lib/i18n/routing.ts`
- Admin locale preference + toggle 已落地（archived record）：`../archive/2026-01-04-admin-i18n-foundation.md`
  - `lib/i18n/admin-locale.ts`, `lib/i18n/admin-locale.server.ts`, `hooks/useAdminLocale.ts`
  - `app/[locale]/admin/layout.tsx`, `components/admin/common/AdminSidebar.tsx`
  - `messages/en.json`, `messages/zh.json`（`admin.*` baseline）
- 仍有大量 admin panels 未完成 bilingual（adminLocale 不會影響主內容）：
  - Data Intelligence pages：`app/[locale]/admin/(data)/**`（例：`app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`）
  - Website admin pages：`app/[locale]/admin/features/**`, `app/[locale]/admin/landing/**`, `app/[locale]/admin/portfolio/**`, `app/[locale]/admin/settings/**`, `app/[locale]/admin/theme/**`
  - 仍存在 `locale === 'zh' ? ... : ...` 的 inline branching（需清掉，改用 `messages/*`）
- Non-Sidebar 仍有 icon（emoji/icon/svg）混入 panel content（需移除，符合本次要求）

### Drift List（ACTIVE）

1. **Spec: AdminSidebar + Admin Panel 內容都要切換** vs **Implementation: 多數 panels 仍 hard-coded / route-locale**
   - Doc claim: `doc/specs/proposed/admin-i18n-toggle-spec.md` §1.1/§1.2
   - Evidence: `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`, `app/[locale]/admin/features/page.tsx`
   - 分類：implementation drift（需逐模組 migration）
2. **Non-Sidebar 禁用 icon** vs **Implementation: panel 內容仍含 emoji/icon**
   - Doc claim: `doc/meta/STEP_PLAN.md` §1（Non‑Negotiables）
   - Evidence: `app/[locale]/admin/layout.tsx`, `app/[locale]/admin/theme/page.tsx`
   - 分類：requirement gap（需清除 icons；新 UI 也不得新增）
3. **PRD: AI Analysis custom templates（Owner CRUD + selection）** vs **Implementation: backend 已支援、UI/actions 缺**
   - Doc claim: `doc/specs/completed/AI_ANALYSIS_v2.md`（In Scope: Custom templates）
   - Evidence: `lib/ai-analysis/analysis-templates-io.ts`（IO 已存在）對比 `app/[locale]/admin/(data)/ai-analysis/actions.ts`（無 templates actions）+ `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`（無 custom template selection）
   - 分類：implementation drift（需補 UI/UX）

### Alignment Strategy

- `routeLocale`（URL）與 `adminLocale`（UI preference）分離：
  - `routeLocale`：用於 href/redirect（不可變更 URL）
  - `adminLocale`：用於 admin UI 文案（cookie `admin-locale`；由 Sidebar toggle 設定）
- 統一 i18n 取詞策略：
  - server components：`getAdminLocale()` → `getTranslations({ locale: adminLocale, namespace: 'admin.*' })`
  - client components：在 admin layout 或 module island 用 `NextIntlClientProvider`（只帶 `admin` namespace messages）→ `useTranslations('admin...')`
- 統一 keys 命名（SRP）：
  - `admin.features.*`, `admin.theme.*`, `admin.landing.*`, `admin.portfolio.*`, `admin.settings.*`
  - `admin.data.*`（Control Center / Embeddings / Preprocessing / Import/Export / AI Analysis）
  - `admin.aiAnalysis.*`（包含 custom templates UI）
- Icons policy（本次新增需求）：
  - 只允許 Sidebar 的導航 icon；其他 panel content 一律移除 emoji/icon/svg，避免翻譯 drift 與 UI 規格分歧。

---

## 3. PR Plan（PR‑granular）

## PR-3 — Admin Panel i18n Plumbing + Website Admin Modules i18n Migration【P1/P2】[COMPLETE]

### Goal

- Admin Panel 主內容區（非 Sidebar）也能依 `adminLocale` 切換文案（URL 不變）。
- Website admin modules（Theme/Features/Landing/Portfolio/Settings/Admin dashboard）完成 bilingual，且符合「非 Sidebar 不用 icon」。

### Scope

- Admin Panel i18n plumbing（讓 panels 可用 `adminLocale` 正確取詞）
- directory-first migration：
  - `app/[locale]/admin/page.tsx`
  - `app/[locale]/admin/theme/**`
  - `app/[locale]/admin/features/**`
  - `app/[locale]/admin/landing/**`
  - `app/[locale]/admin/portfolio/**`
  - `app/[locale]/admin/settings/**`

### Expected file touches

- i18n plumbing / common:
  - `app/[locale]/admin/layout.tsx`
  - `components/admin/common/**`（tabs, shared UI）
- Modules:
  - `app/[locale]/admin/page.tsx`
  - `app/[locale]/admin/theme/**`
  - `app/[locale]/admin/features/**`
  - `app/[locale]/admin/landing/**`
  - `app/[locale]/admin/portfolio/**`
  - `app/[locale]/admin/settings/**`
  - （必要時）`components/admin/**`
- Translations:
  - `messages/en.json`, `messages/zh.json`

### Steps

1. Plumbing（先確保 panels 的 i18n 取詞策略一致）：
   - 確保 server components 一律用 `getAdminLocale()` + `getTranslations({ locale: adminLocale, namespace: 'admin.*' })`
   - client components 一律用 `NextIntlClientProvider` + `useTranslations('admin.*')`（建議在 `app/[locale]/admin/layout.tsx` 封裝，避免每頁重複包 provider）
2. Non-Sidebar icon cleanup（本次新增需求；先做全域清點）：
   - `rg -n "[🔒⚠️💡]" "app/[locale]/admin" "components/admin" -S`
   - `rg -n "<svg" "app/[locale]/admin" "components/admin" -S`（後續只允許 Sidebar 命中）
   - 移除 panels 的 emoji/icon/svg（保留 Sidebar 導航 icon）
3. directory-first 清點 inline 文案（避免一次掃全 repo）：
   - `rg -n "locale === 'zh'" "app/[locale]/admin/theme" "app/[locale]/admin/features" "app/[locale]/admin/landing" "app/[locale]/admin/portfolio" "app/[locale]/admin/settings" "components/admin" -S`
4. 補齊/整理 translations keys（SRP；專有名詞不翻譯）：
   - `admin.theme.*`, `admin.features.*`, `admin.landing.*`, `admin.portfolio.*`, `admin.settings.*`, `admin.dashboard.*`
5. 逐檔 migration（把 `locale === 'zh' ? ... : ...` 與 hard-coded strings 移到 `messages/*`）：
   - panels 內容區（headers/cards/forms/tabs/dialogs/empty states）
6. 跑 guardrails + manual QA（見 Verification）

### Verification

- 在任一 admin page 切換語言：URL 不變；panel 內容立即切換（非只 Sidebar）
- Website admin modules（Theme/Features/Landing/Portfolio/Settings/Admin dashboard）主要 flow 皆可切換且無 hydration 錯誤
- panels 內容區不再出現 emoji/icon/svg

### Docs updates

- None

### Rollback

- revert 本 PR 變更

---

## PR-4 — Blog/Gallery/Content/Users Module i18n Migration【P2】[COMPLETE]

### Goal

- 後台核心 CMS 模組文案完成 i18n（依 `adminLocale`），且符合「非 Sidebar 不用 icon」。

### Scope（directory-first）

- `app/[locale]/admin/(blog)/**`
- `app/[locale]/admin/gallery/**`
- `app/[locale]/admin/content/**`
- `app/[locale]/admin/users/**`

### Expected file touches

- 上述 routes 內的 `page.tsx`, `layout.tsx`, `*Client.tsx`, `components/**`
- `components/admin/**`（對應可重用元件）
- `messages/en.json`, `messages/zh.json`（補齊 keys）

### Steps

1. 以 directory-first 方式逐模組清點 inline 文案（避免一次掃全 repo）：
   - `rg -n "locale === 'zh'" "app/[locale]/admin/(blog)" "app/[locale]/admin/gallery" "app/[locale]/admin/content" "app/[locale]/admin/users" "components/admin" -S`
2. 清點並移除 panels 內容區 icon（emoji/icon/svg）：
   - `rg -n "[🔒⚠️💡]" "app/[locale]/admin/(blog)" "app/[locale]/admin/gallery" "app/[locale]/admin/content" "app/[locale]/admin/users" -S`
3. 依 SRP 定義/補齊 keys（建議：`admin.blog.*`, `admin.gallery.*`, `admin.content.*`, `admin.users.*`）
4. 逐檔 refactor（server components 用 server-side 翻譯；client components 用 admin-only provider 的 `useTranslations`）
5. 針對 forms/tabs/dialogs/empty states 做 manual QA（避免漏翻或 key 命名漂移）
6. 跑 guardrails：`npm test` + `npm run type-check` + `npm run lint`

### Verification

- 逐模組 manual QA（至少：list/create/edit flow + empty state + dialogs）
- `npm test` + `npm run type-check` + `npm run lint`

### Docs updates

- None

### Rollback

- revert 本 PR 涵蓋的模組

---

## PR-5 — Shop/Data/System Module i18n Migration + Error Log Keys Sweep【COMPLETE】

### Goal

- Shop / Data Intelligence / System 類模組文案完成 i18n（依 `adminLocale`），並確認 Error Log 預留 keys 完整，且符合「非 Sidebar 不用 icon」。

### Scope（directory-first）

- `app/[locale]/admin/shop/**`
- `app/[locale]/admin/(data)/**`
- `app/[locale]/admin/reports/**`, `app/[locale]/admin/history/**`
- `components/admin/shop/**`（含 charts / variant editor 等）

### Steps

1. 清點並移除 panels 內容區 icon（emoji/icon/svg）：
   - `rg -n "[🔒⚠️💡]" "app/[locale]/admin/shop" "app/[locale]/admin/(data)" "app/[locale]/admin/reports" "app/[locale]/admin/history" -S`
2. 清點 inline branching + hard-coded strings（Data Intelligence pages 多為純英文硬編碼）：
   - `rg -n "locale === 'zh'" "app/[locale]/admin/shop" "app/[locale]/admin/reports" "app/[locale]/admin/history" "components/admin/shop" -S`
   - `rg -n "Control Center|Search Mode|Analysis Template|Data Types|Preprocessing" "app/[locale]/admin/(data)" -S`
3. 依 SRP 定義/補齊 keys（建議：`admin.shop.*`, `admin.data.*`, `admin.system.*`）
4. 特別處理「格式化」類文案：
   - 日期：`adminLocale === 'zh'` 時用 `zh-TW`，否則 `en-US`
   - 單位/數字/幣別：保持既有 format 行為（只翻譯 label）
5. Error Log keys sweep（依 `doc/specs/proposed/admin-i18n-toggle-spec.md` §1.2）：
   - 確認 `admin.errorLog.*` keys 已預留（即便 UI 尚未實作）
6. 跑 guardrails：`npm test` + `npm run type-check` + `npm run lint` + manual QA（charts 特別看 tooltip/empty state）

### Verification

- 逐模組 manual QA（特別留意 charts/units/date formatting：zh 用 `zh-TW`，en 用 `en-US`）
- `npm test` + `npm run type-check` + `npm run lint`

### Docs updates

- None

### Rollback

- revert 本 PR 涵蓋的模組

---

## PR-6 — AI Analysis Custom Prompt Templates UI/UX + Data Types Selection【P1/P2】

### Goal

- AI Analysis 支援 `templateId='custom'` 的 Custom Prompt templates：
  - Owner：可建立/更新/停用/刪除 templates（name + Prompt text）
  - Editor：可讀取「enabled templates」並用於執行分析（不可寫入）
- Admin 可在 UI 選擇 Data Types（built-in templates 維持 auto-select required + optional 可選；custom templates 至少選 1 個）。
- UI 文案可依 `adminLocale` 切換，且符合「非 Sidebar 不用 icon」。

### Scope

- Admin UI（text-only tabs / no icons）：
  - Run Analysis（原有表單擴充：新增 Custom templates selection）
  - Templates（Owner CRUD；Editor read-only list）
  - Schedule（若支援 custom templates：schedule form 也需能選 `customTemplateId`）
- Wiring to existing backend (already landed):
  - DB/IO: `ai_analysis_templates`（`lib/ai-analysis/analysis-templates-io.ts`）
  - Run: `templateId='custom'` → fetch promptText → compose prompt（`lib/ai-analysis/openrouter-run-io.ts`）

### Expected file touches

- `app/[locale]/admin/(data)/ai-analysis/page.tsx`（initial data: templates list / role）
- `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`（UI：custom selection + templates CRUD）
- `app/[locale]/admin/(data)/ai-analysis/actions.ts`（server actions：templates CRUD）
- `messages/en.json`, `messages/zh.json`（`admin.aiAnalysis.*` + `admin.data.*`）
- （視需求）`lib/validators/ai-analysis.ts`（UI 對齊 validation；不改 contracts 只補錯誤訊息 mapping）

### Steps

1. Server actions（templates CRUD；RBAC 對齊 PRD）：
   - list（Owner：all / Editor：enabled only）
   - create/update/delete/toggle enabled（Owner only）
2. UI structure（無 icon）：
   - 在 AI Analysis page 內新增 text-only tabs：`Run` / `Templates` / `Schedules` / `Reports`（視現況調整，但禁止 icon）
3. Custom templates selection（Run）：
   - Template selector 增加 `Custom` 選項（`templateId='custom'`）
   - 顯示 `customTemplateId` picker（只列 enabled templates；Owner 可看 disabled 但不可用於 run）
   - 顯示 Prompt preview（read-only；不需要 icon/emoji）
4. Data Types selection（Run + Schedule）：
   - built-in templates：維持 required auto-selected + locked（現有行為）
   - custom templates：取消 auto-select，改為至少選 1 個 Data Type（UI validation）
5. Templates management（Templates tab）：
   - List：name / enabled / createdAt
   - Create/Edit：`name` + `Prompt`（textarea；提示「禁止輸入 PII」但不使用 icon）
   - Enable/Disable + Delete（Owner only；Editor 隱藏/disabled）
6. i18n：
   - 全部文案移至 `messages/*`（`admin.aiAnalysis.*`）
   - 專有名詞不翻譯（Prompt/Data Types/RAG/Embedding/Token 等）
7. Verification（見下）

### Verification

- Owner：
  - 可建立 template → enabled → 在 Run 選到並成功送出 request（`templateId='custom'` + `customTemplateId`）
  - disable 後：Run 不可選（或顯示但禁止使用）
  - delete 後：Run 不可選；既有 report/schedule 行為依既有 constraints（保持 DB invariants）
- Editor：
  - 只能看 enabled templates；無 CRUD controls
- Data Types：
  - custom templates 未選 Data Types 時不可送出（有錯誤訊息）
- UI：
  - panels 內容區不出現 icon/emoji/svg

### Docs updates（per `doc/GOVERNANCE.md`）

- `doc/specs/completed/ai-analysis-spec.md`（補 UI contract：Custom templates selection/CRUD + Data Types selection）
- `doc/specs/completed/AI_ANALYSIS_v2.md`（若需要：補上 UI coverage/known gap 說明，避免「in scope 但 UI 缺」的 drift）

### Rollback

- revert 本 PR 變更（UI + actions）；backend contracts 不受影響

---

## PR-7 — Docs + Drift Guardrails Closeout【P1】[COMPLETE]

### Goal

- 把「已實作行為」回寫到 SSoT，並確認沒有留下容易 drift 的殘骸。

### Scope

- 更新 `doc/SPEC.md`（i18n/admin 章節：描述 adminLocale 行為與 storage keys）
- 更新 specs/PRDs（狀態調整；如仍有未覆蓋的 admin 模組或 AI Analysis UI gaps，需在 spec/PRD 說清楚）：
  - `doc/specs/proposed/admin-i18n-toggle-spec.md`
  - `doc/specs/completed/ai-analysis-spec.md`
  - `doc/specs/completed/AI_ANALYSIS_v2.md`（必要時）
  - `doc/specs/README.md`
- 最後一次 drift grep（只針對 admin i18n domain）

### Expected file touches

- `doc/SPEC.md`
- `doc/specs/README.md`
- `doc/specs/proposed/admin-i18n-toggle-spec.md`
- `doc/specs/completed/ai-analysis-spec.md`
- （必要時）`doc/specs/completed/AI_ANALYSIS_v2.md`
- （必要時）`doc/archive/<date>-admin-i18n-toggle-implementation.md`（若本次變更量大且需要留 audit trail）

### Steps

1. 更新 `doc/SPEC.md`（Implemented behavior）：
   - i18n 章節補上「adminLocale 與 routeLocale 分離」的行為描述（含 storage keys：`admin-locale`）
   - 附 evidence paths（例如 `app/[locale]/admin/layout.tsx`, `components/admin/common/AdminSidebar.tsx`）
2. 更新 specs 狀態：
   - `doc/specs/proposed/admin-i18n-toggle-spec.md`：維持 stable headings，更新 Status/Last Updated/DoD
   - `doc/specs/README.md`：同步 status（DRAFT → Stable/Implemented；若仍未全覆蓋則保持 DRAFT 並清楚標示 coverage）
3. 最後一次 drift grep（只針對本次 domain）：
   - `rg -n "pathname\\.replace\\(" "components/admin"`（預期 0 hits）
   - `rg -n "admin-locale" app components lib hooks`（確保只有預期使用點）
   - `rg -n "[🔒⚠️💡]" "app/[locale]/admin" -S`（預期 0 hits；Sidebar icon 例外需排除）
   - `rg -n "<svg" "app/[locale]/admin" "components/admin" -S`（預期命中只剩 `components/admin/common/AdminSidebar.tsx`）
   - `rg -n "locale === 'zh'" "app/[locale]/admin" "components/admin" -S`（預期 0 hits；全部改用 `messages/*`）
4. 跑 docs scripts + guardrails：
   - `npm run docs:generate-indexes`
   - `npm run lint:md-links`
   - `npm run docs:check-indexes`
   - `npm test` + `npm run type-check` + `npm run lint`

### Verification

- docs scripts（避免 broken links / index drift）：
  - `npm run docs:generate-indexes`
  - `npm run lint:md-links`
  - `npm run docs:check-indexes`

### Docs updates

- `doc/SPEC.md`（feature 行為/路由/UX）
- `doc/specs/proposed/admin-i18n-toggle-spec.md`（spec status + coverage）
- `doc/specs/completed/ai-analysis-spec.md` + `doc/specs/completed/AI_ANALYSIS_v2.md`（補 UI contract / 避免 drift）
- `doc/specs/README.md`（index drift-free）

### Rollback

- revert docs/specs 變更（不影響 runtime；僅回退文件描述）

---

## 4. Tracking Sync（每個 PR 結尾）

- `doc/ROADMAP.md`：只更新 status/risks + links（不要塞 steps）
- `doc/TASKS.md`：只保留「未完成 + 可立即開始」項目
- 跑 docs scripts：
  - `npm run docs:generate-indexes`
  - `npm run lint:md-links`
  - `npm run docs:check-indexes`
