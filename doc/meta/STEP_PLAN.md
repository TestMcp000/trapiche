# Step-by-Step Execution Plan — V15（CMS vNext：Nav/Blog Taxonomy/Events/Pages）

> 狀態: Active（本檔只寫「修復/新增的方案與步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-29  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> vNext PRD（decisions locked 2026-01-27）: `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`  
> Repo 驗證（2026-01-29）：請以本次 PR 的 `npm test`, `npm run lint`, `npm run type-check`, `npm run docs:check-indexes`, `npm run lint:md-links`, `npm run build` 為準  
> V15 完整快照（已歸檔）：`doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md`

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

- Open drift items：0（2026-01-29）
- 若有新 drift：先寫到 `doc/TASKS.md` / `doc/ROADMAP.md`，需要可拆 PR 的 step-by-step 時再新增下一版（V16）。

---

## 2) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

> 本期以「CMS vNext」為主：先把 non-coder admin editor 補齊，再做 DB schema + public routes（避免一次改太大）。

新增 PR item 的最小格式（**務必寫死到檔名/函式/指令；避免模糊**）：

1. Title：`PR-XX — <Domain>：<1 句話描述 drift 修復>`
2. Evidence（必填）：列出 `rg` 指令與命中的檔案路徑（至少 1 個）
3. Violates（必填）：引用 `ARCHITECTURE.md`/`doc/SPEC.md`/對應 spec 的章節或 anchor
4. Fix steps（必填）：
   - 明確列出要新增/修改的檔案路徑（逐一列出）
   - 明確列出要移除的舊呼叫點（逐一列出）
   - 若涉及 cache/SEO：明確列出要補的 `revalidateTag`/`revalidatePath` 與 canonical/redirect 行為
5. DoD（必填）：
   - `npm test`, `npm run lint`, `npm run type-check`
   - 針對 drift 的 grep 應為 0 命中（列出指令）
6. Post-merge（必填）：
   - 更新 `uiux_refactor.md` §4 item 狀態（不得改號）
   - 把本檔的已完成 PR steps 移到 `doc/archive/<date>-step-plan-vX-*.md`
   - `npm run docs:generate-indexes` + `npm run lint:md-links`

### PR-44 — Admin：後台中文化 + 移除硬編碼 + ActionResult 統一（Completed: 2026-01-29）

> 目標：後台可見文案一律中文（next-intl），移除「測試用顯示」硬編碼（改用 DB seed），並把 server actions 錯誤處理統一成 `ActionResult<T>`（errorCode），避免回傳內部錯誤細節到 client（低資安風險 + 可 i18n）。

#### Evidence（2026-01-28）

- 後台可見英文/硬編碼字串（需改為 next-intl）：
  - `rg -n "Hotspots|Slug \\\\*" -S app/[locale]/admin`
  - `rg -n '"slugPlaceholder": "(my-post-url|group-slug|topic-slug|tag-slug)"' messages/zh.json`
- Validators/parsers 仍回傳英文錯誤（需中文化）：
  - `rg -n "Failed to|Unknown error|Invalid JSON|Request body must be" -S lib/validators lib/modules/import-export`
- Hamburger nav 不應使用 built-in default（需改 empty nav + DB seed）：
  - `rg -n "fallback：built-in default" -S ARCHITECTURE.md doc/SPEC.md`
  - Seed 來源：`supabase/03_seed/01_main.sql`（`section_key='hamburger_nav'`）

#### Violates

- `ARCHITECTURE.md` §8 i18n：Admin UI 可見字串必須走 next-intl（禁止 component hardcode 測試文案/英文）。
- `ARCHITECTURE.md` §3（routing & server actions）：Server actions 必須回傳 `ActionResult`（errorCode），禁止回傳 free-form error 字串或內部錯誤細節到 client。
- `doc/SPEC.md#admin-cms`：Hamburger nav content 只能來自 DB（seed 只允許在 `supabase/03_seed/*`），invalid/empty → empty nav。

#### Fix steps

1) 建立/強化 `ActionResult<T>` SSOT（錯誤代碼 + UI label）
   - 修改：`lib/types/action-result.ts`
   - Do:
     - 定義 `ADMIN_ERROR_CODES`（擴展 `API_ERROR_CODES`）
     - `ActionResult<T>` discriminated union（success/data vs errorCode）
     - 提供 `getErrorLabel(errorCode, locale)`（UI 顯示用）

2) 遷移所有後台 server actions：統一回傳 `ActionResult<T>`，不回傳 `error.message`
   - 修改（逐一套用相同策略）：
     - `app/[locale]/admin/(blog)/comments/actions.ts`
     - `app/[locale]/admin/(blog)/comments/settings/actions.ts`
     - `app/[locale]/admin/(blog)/comments/safety/actions.ts`
     - `app/[locale]/admin/(blog)/comments/safety/[commentId]/actions.ts`
     - `app/[locale]/admin/(blog)/comments/safety/corpus/actions.ts`
     - `app/[locale]/admin/(blog)/comments/safety/settings/actions.ts`
     - `app/[locale]/admin/(data)/ai-analysis/actions.ts`
     - `app/[locale]/admin/(data)/ai-analysis/templates/actions.ts`
     - `app/[locale]/admin/(data)/control-center/actions.ts`
     - `app/[locale]/admin/(data)/embeddings/actions.ts`
     - `app/[locale]/admin/(data)/import-export/actions.ts`
     - `app/[locale]/admin/(data)/preprocessing/actions.ts`
     - `app/[locale]/admin/content/actions.ts`
     - `app/[locale]/admin/content/[section]/actions.ts`
     - `app/[locale]/admin/gallery/actions.ts`
     - `app/[locale]/admin/gallery/categories/actions.ts`
     - `app/[locale]/admin/gallery/featured/actions.ts`
     - `app/[locale]/admin/history/actions.ts`
     - `app/[locale]/admin/landing/actions.ts`
     - `app/[locale]/admin/portfolio/actions.ts`
     - `app/[locale]/admin/settings/actions.ts`
     - `app/[locale]/admin/settings/navigation/actions.ts`
     - `app/[locale]/admin/theme/actions.ts`
     - `app/[locale]/admin/users/actions.ts`
   - Do:
     - `try/catch`：server log 用 `console.error`，client 只收到 `errorCode`
     - Domain 分支依情境回傳（例如 owner only → `OWNER_REQUIRED`；刪除失敗 → `DELETE_FAILED`）

3) 後台 UI 全面中文化：所有可見字串落到 `messages/zh.json`（next-intl）
   - 修改（逐一把 hard-coded labels/placeholder/confirm/toast 轉成 `t(...)`）：
     - `app/[locale]/admin/gallery/GalleryClient.tsx`
     - `app/[locale]/admin/(blog)/categories/CategoriesClient.tsx`
     - `app/[locale]/admin/(blog)/posts/components/PostForm.tsx`
     - `app/[locale]/admin/(data)/import-export/ImportExportClient.tsx`
     - `app/[locale]/admin/(data)/ai-analysis/AIAnalysisClient.tsx`
     - `app/[locale]/admin/(data)/ai-analysis/templates/TemplatesClient.tsx`
     - `app/[locale]/admin/(data)/control-center/ControlCenterClient.tsx`
     - `app/[locale]/admin/(data)/embeddings/EmbeddingsClient.tsx`
     - `app/[locale]/admin/(data)/preprocessing/PreprocessingClient.tsx`
     - `app/[locale]/admin/(blog)/comments/CommentsClient.tsx`
     - `app/[locale]/admin/(blog)/comments/safety/SafetyQueueClient.tsx`
     - `app/[locale]/admin/(blog)/comments/safety/[commentId]/SafetyDetailClient.tsx`
     - `app/[locale]/admin/(blog)/comments/safety/corpus/SafetyCorpusClient.tsx`
     - `app/[locale]/admin/(blog)/comments/safety/settings/SafetySettingsClient.tsx`
     - `app/[locale]/admin/(blog)/comments/settings/CommentSettingsClient.tsx`
     - `app/[locale]/admin/content/[section]/ContentEditorClient.tsx`
     - `app/[locale]/admin/content/components/SectionToggle.tsx`
     - `app/[locale]/admin/gallery/categories/GalleryCategoriesClient.tsx`
     - `app/[locale]/admin/gallery/featured/GalleryFeaturedClient.tsx`
     - `app/[locale]/admin/landing/LandingSectionsClient.tsx`
     - `app/[locale]/admin/landing/[sectionKey]/SectionEditorClient.tsx`
     - `app/[locale]/admin/portfolio/PortfolioClient.tsx`
     - `app/[locale]/admin/reports/ReportsClient.tsx`
     - `app/[locale]/admin/settings/SettingsClient.tsx`
     - `app/[locale]/admin/theme/ThemeClient.tsx`
     - `app/[locale]/admin/theme/PageThemesClient.tsx`
     - `app/[locale]/admin/theme/LayoutsClient.tsx`
     - `app/[locale]/admin/theme/FontsClient.tsx`
     - `app/[locale]/admin/users/[id]/components/AppointmentModal.tsx`
     - `components/admin/common/ImageUploader.tsx`
     - `components/admin/common/ImageCropper.tsx`
     - `components/admin/content/MarkdownToolbar.tsx`
     - `components/admin/settings/HamburgerNavEditorClient.tsx`
   - 修改翻譯字典：`messages/zh.json`
     - 補齊/統一欄位文案（例：Slug placeholder 改「例如：...」）

4) Validators / Import-Export parsers 錯誤訊息中文化 + 不洩漏內部錯誤
   - 修改：`lib/validators/*.ts`、`lib/modules/import-export/**/*.ts`
   - Do:
     - 對「使用者輸入驗證」保留可操作的錯誤細節（但用中文）
     - 對「內部錯誤 / DB / storage 失敗」：server log 詳情；client 顯示泛化訊息（中文）

5) 移除 hamburger nav built-in default：invalid/empty → empty nav（測試顯示走 seed）
   - 修改：`lib/modules/content/cached.ts`
   - 確認 seed：`supabase/03_seed/01_main.sql`（`hamburger_nav` published）
   - 文件同步：`ARCHITECTURE.md`, `doc/SPEC.md`

#### DoD

- Repo 驗證（PowerShell 逐一執行）：
  - `npm run type-check`
  - `npm run lint`
  - `npm test`
  - `npm run docs:check-indexes`
  - `npm run lint:md-links`
  - `npm run build`
- Drift grep（0 hits）：
  - `rg -n "Hotspots|Slug \\\\*|my-post-url|group-slug|topic-slug|tag-slug" -S app/[locale]/admin components/admin`
  - `rg -n '"slugPlaceholder": "(my-post-url|group-slug|topic-slug|tag-slug)"' messages/zh.json`
  - `rg -n "Failed to|Unknown error|Invalid JSON|Request body must be" -S lib/validators lib/modules/import-export`

---

## 3) 已完成（已歸檔）

- V15 完整快照（含已完成 PR-32..PR-43）已歸檔：`doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md`
- 本檔只保留 active drift / 下一步；新增新 PR 請依 §2 的格式新增 `PR-XX`。
