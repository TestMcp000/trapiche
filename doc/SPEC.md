# 功能規格（已實作行為 / SSoT）

> 已落地功能與技術細節（Single Source of Truth）  
> 最後更新: 2026-01-20  
> 狀態: Active

本文件描述「**已實作**」的行為與其技術細節（以本檔為準）。

- 架構與全域約束：`../ARCHITECTURE.md`
- 單一功能契約 / 流程（穩定 specs）：`specs/README.md`
- Drift 追蹤與修復手冊：`../uiux_refactor.md`（stable `@see` index + active drift tracker）
- 歷史實作記錄 / code maps：`archive/README.md`
- 待辦/計畫（what/why/status）：`ROADMAP.md`
- 刻意保留的不完整 / gated（避免把「implemented」誤看成「fully complete」）：見 [已知缺口](#known-gaps-roadmap-links)

---

## 目錄

- [Home（UIUX v2）](#home-uiux-v2)
- [部落格系統](#blog-system)
- [圖庫](#gallery)
- [留言](#comments)
- [按讚 / 反應](#reactions)
- [使用者（後台）](#users-admin)
- [主題系統](#theme-system)
- [後台 CMS](#admin-cms)
- [匯入 / 匯出（後台）](#importexport-admin-only)
- [AI 分析（後台）](#ai-analysis-admin-only)
- [Embeddings 與語意搜尋（後台）](#embeddings-and-semantic-search-admin-only)
- [資料預處理（後台）](#preprocessing-admin-only)
- [多語系（i18n）](#i18n)
- [SEO](#seo)
- [已知缺口（連到 Roadmap）](#known-gaps-roadmap-links)
- [模組清單（單一真相來源）](#module-inventory-single-source)

---

<a id="home-uiux-v2"></a>
## Home（UIUX v2）

### 功能

- Marquee notice（來源：`company_settings`）
- HeaderBar v2（hamburger menu；來源：`site_content(section_key='hamburger_nav')`）
- Hero stage（右側可疊 pins）：
  - 文案/CTA：`site_content(section_key='hero')`
  - Hero artwork：`gallery_pins(surface='hero')` 選 0..1 個作品
  - Hotspots：同作品的 `gallery_hotspots`（public read；render 時 server-side markdown → html）
- Suggest section：目前為 placeholder（尚未接 blog/個人化）
- SEO：Home JSON-LD 由 `app/[locale]/page.tsx` 產生

### 路由

| 路由       | 說明 |
| ---------- | ---- |
| `/[locale]` | Home（v2 layout） |

### 實作備註

- 實作入口：`app/[locale]/page.tsx` → `components/home/HomePageV2.tsx`
- Hamburger nav fetch/parse：`lib/modules/content/cached.ts#getHamburgerNavCached`（invalid → fallback default）
- Hotspots markdown 安全邊界：`lib/markdown/hotspots.ts`（server-only; 禁 raw HTML + sanitize + https/mailto links）

---

<a id="blog-system"></a>
## 部落格系統

### 功能

- Markdown 編輯器（GFM、程式碼高亮、數學公式）
- 分類管理
- 可見性控制（draft/private/public）
- 估算閱讀時間
- 自動產生 SEO metadata

### 路由

| 路由                               | 說明 |
| ---------------------------------- | ------------- |
| `/[locale]/blog`                   | 部落格列表（支援 `?category=<slug>&search=<q>&sort=<...>`） |
| `/[locale]/blog/[category]/[slug]` | 文章頁（canonical URL 會包含 category segment） |

### 資料模型

- `categories`：文章分類
- `posts`：文章內容

### 實作備註

- Admin posts create/update/delete 已走 server actions（`app/[locale]/admin/(blog)/posts/actions.ts`）；client form 僅負責互動，IO 由 `lib/modules/blog/admin-io.ts`。
- 實作入口對照：見 [模組清單](#module-inventory-single-source)。

---

<a id="gallery"></a>
## 圖庫

### 功能

- Pinterest 風格瀑布流（CSS Columns）
- 無限捲動
- 圖片裁切與上傳
- 分類篩選
- 排序選項
- Featured pins（surface=`home`/`gallery`）
- Home Hero（surface=`hero`；全站最多 1）
- Hotspots（作品主圖 pins overlay + modal + mobile/無障礙 fallback list；Home Hero 與作品頁共用）

### 路由

| 路由                                  | 說明 |
| ------------------------------------- | ------------- |
| `/[locale]/gallery`                   | 圖庫列表 |
| `/[locale]/gallery/[category]`        | 分類列表 |
| `/[locale]/gallery/[category]/[slug]` | 單一作品頁 |

### API 端點

| 路由                 | 方法 | 說明 |
| -------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `/api/gallery/items` | GET    | 圖庫列表分頁（供 infinite scroll；包含 `likedByMe` via `anon_id`；feature-gated） |

### 置頂 / 精選項目

- 置頂項目會顯示在列表上方的「Featured」區塊
- 主列表會自動排除置頂項目，避免重複
- 當排序設為 `featured` 時隱藏 Featured 區塊

### 資料模型

- `gallery_categories`：圖庫分類
- `gallery_items`：圖庫作品
- `gallery_pins`：Featured pins + Home Hero（`surface`）
- `gallery_hotspots`：作品圖上 pins（含 `description_md` 與排序欄位）

### 實作備註

- 實作入口對照：見 [模組清單](#module-inventory-single-source)。
- Gallery item hotspots render：`app/[locale]/gallery/[category]/[slug]/page.tsx`（server fetch + server markdown render + client overlay）
- Home Hero pins render：`components/home/HomePageV2.tsx`（讀 `gallery_pins(surface='hero')` + hotspots）

### Hero / Hotspots（Home + Gallery）

- Hero selection（0..1）：
  - 資料：`gallery_pins(surface='hero')`
  - Admin UI：`/[locale]/admin/gallery/[id]` 的「設為首頁主視覺 / 取消主視覺」
- Hotspots（0..N / per item）：
  - 資料：`gallery_hotspots`（`x/y` normalized `0..1`；`is_visible`）
  - Admin UI：`/[locale]/admin/gallery/[id]`（圖上點選新增、pin 編輯、清單拖曳排序、顯示/隱藏）
  - Public UI：作品頁與 Home Hero 疊 pins；點 pin 開 modal card；mobile 提供 fallback list
- Ordering semantics（per `item_id`）：
  - Auto mode：該作品所有 `sort_order` 皆為 `NULL`；讀取順序為 `y ASC → x ASC → created_at ASC`
  - Manual mode：該作品所有 `sort_order` 皆為非 `NULL`；讀取順序為 `sort_order ASC → created_at ASC`
  - 新增 hotspot：auto mode → `sort_order=NULL`；manual mode → append（`max(sort_order)+1`）
- Markdown 安全邊界：
  - hotspots 的 `description_md` 一律走 `lib/markdown/hotspots.ts`（server-only；禁 raw HTML + sanitize；links 只允許 https/mailto）
- Cache / revalidation：
  - Public reads：`lib/modules/gallery/cached.ts`（tag=`gallery`）
  - Admin mutations：`revalidateTag('gallery')`（並視需要補 `revalidatePath()`）

---

<a id="comments"></a>
## 留言

### 功能

- 支援 Blog / Gallery 留言
- 串狀回覆（threaded replies）
- Spam 防護（honeypot + Akismet + reCAPTCHA）
- **Safety Risk Engine**（三層防禦：Layer 1 rules + Layer 2 RAG + Layer 3 LLM）
- Rate limiting
- 後台審核工具（approve/spam/delete、blacklist、Akismet feedback）
- 後台 Safety Queue（`HELD` 留言審核 + corpus 維護 + settings）

### API 端點

| 路由                            | 方法 | 說明 |
| ------------------------------- | ------ | ------------------------------------------- |
| `/api/comments`                 | GET    | Public：取得留言列表 |
| `/api/comments`                 | POST   | Public：建立留言 |
| `/api/comments/public-settings` | GET    | Public：取得公開 settings |
| `/api/comments/admin`           | GET    | Admin：留言列表（filters + pagination） |
| `/api/comments/admin`           | PATCH  | Admin：approve/spam/bulk actions |
| `/api/comments/admin`           | DELETE | Admin：刪除留言 |
| `/api/comments/settings`        | GET    | Admin：取得 settings + blacklist |
| `/api/comments/settings`        | PATCH  | Admin：更新 settings |
| `/api/comments/settings`        | POST   | Admin：新增 blacklist item |
| `/api/comments/settings`        | DELETE | Admin：移除 blacklist item |
| `/api/comments/feedback`        | POST   | Admin：回報 spam/ham feedback 給 Akismet |

### 資料保護

- Canonical constraints（public responses 不含 PII）：`../ARCHITECTURE.md` §3.12（Comments API Sensitive Data Protection）
- 安全規則（RLS/server-only tables）：`SECURITY.md`

### Safety Risk Engine（風險引擎）

- Spec: `specs/completed/safety-risk-engine-spec.md`
- 決策語意（V1）：
  - Safety 決策：`APPROVED` / `HELD`（Safety V1 不會產生 `REJECTED`）
  - `High_Risk` / `Uncertain` → `HELD`
  - `Safe` + `confidence >= threshold` → `APPROVED`（否則 `HELD`）
- Fail Closed：任何 timeout/error → `HELD`（safe default）
- 送外部 AI 前需先去識別化（PII de-identification）
- 後台路由：
  - `/admin/comments/safety` — Safety queue (HELD comments)
  - `/admin/comments/safety/[commentId]` — Assessment detail + review actions
  - `/admin/comments/safety/corpus` — Safety corpus management (slang/cases)
  - `/admin/comments/safety/settings` — Safety engine settings

### 實作備註

- Public API adds `isMine` (server-computed ownership flag) without exposing `userId`.
- Safety Risk Engine modules: `lib/modules/safety-risk-engine/*`
- Comment submit use-case (Spam → Safety → Persist): `lib/use-cases/comments/create-comment.ts` (called by `app/api/comments/route.ts`)
- 實作入口對照：見 [模組清單](#module-inventory-single-source)。

---

<a id="reactions"></a>
## 按讚 / 反應

### 功能

- 匿名按讚（使用 `anon_id`）
- 支援 Gallery items 與 Comments
- Rate limiting

### API 端點

| 路由            | 方法 | 說明 |
| ---------------- | ------ | ------------------ |
| `/api/reactions` | POST   | 切換 like 狀態 |

### 實作備註

- 實作入口對照：見 [模組清單](#module-inventory-single-source)。

---

<a id="users-admin"></a>
## 使用者（後台）

### 功能

- 使用者列表（SSoT: `user_directory`，由 `auth.users` 同步）
- 使用者詳情：
  - Directory info（id/email/created/updated）
  - 管理員備註（Owner-only write）：Markdown（`description_zh_md`）+ tags（`tags_zh`）
  - 行程（Owner-only write）：appointment calendar（DB 存 UTC；UI 以 local time 編輯）
  - 留言歷史（read-only）

### 路由

> Note: Admin routes 會掛在 `/[locale]/admin/*` 下（single locale: `zh`，例如 `/zh/admin/users`）。下表為了可讀性省略 `/[locale]` 前綴。

| 路由                | 說明 |
| ------------------- | --------------------------------------------------- |
| `/admin/users`      | 使用者列表 |
| `/admin/users/[id]` | 使用者詳情（notes/tags/schedule + comments） |

### 資料模型

- `user_directory`：使用者列表/email SSoT（admin-only read）
- `user_admin_profiles`：Owner-only admin notes + tags（admin read；owner write）
- `user_appointments`：Owner-only calendar events（admin read；owner write）

### 安全備註

- 寫入為 Owner-only（server actions + IO layer gate；RLS 是最終安全邊界）
- `description_zh_md` 視為 **owner-authored / admin-controlled markdown**（不要把這套 rendering pipeline 拿去渲染 user-submitted content）

### 已知限制（V1）

- Tag filtering 已落地：提供 Tag Filter Bar UI（點選即切換 `?tag=`），並在 server-side 生效
- Users list 的 search/pagination 已落地：
  - `?q=`：文字搜尋（`email`/`user_id`）或短碼精準查詢（`^C\\d+$` → `short_id`）
  - `?page=` / `?pageSize=`：server-side pagination（pageSize allowlist：20/50/100）
- Admin notes 以 Markdown 存放；預設 Raw 顯示，可選 Preview（`?notesPreview=1`；server-side 轉 HTML）。LLM/ETL 需把 Markdown normalize 成 plain text，避免分析 HTML

### 實作備註

- Server-first：server components 讀取走 `lib/modules/user/*-io.ts`；寫入走 `app/[locale]/admin/users/actions.ts`
- 實作入口對照：見 [模組清單](#module-inventory-single-source)。

---

<a id="theme-system"></a>
## 主題系統

### 現況（v2）

- 4 種 layout presets（ThemeKey）：Tech Pro / Japanese Airy / Glassmorphism / Scrollytelling
- Per-page theme：透過 `site_config.page_themes`（home/blog/gallery）
- Per-layout token overrides：透過 `site_config.theme_overrides`（allowlist 在 `lib/types/theme.ts`）
- SSR inline CSS variables 注入（FOUC-free）
- Admin preview 已修正（2025-12-24）：iframe 注入 CSS vars 與 runtime SSR 一致
- RBAC：Owner 可編輯、Editor read-only

### 後台路由

> Note: Admin routes 會掛在 `/[locale]/admin/*` 下（例如 `/zh/admin/theme`）。下表為了可讀性省略 `/[locale]` 前綴。


| 路由                   | 說明 |
| ---------------------- | --------------------------------------------------- |
| `/admin/theme`         | 全站主題選擇 |
| `/admin/theme/pages`   | Per-page 主題設定 |
| `/admin/theme/fonts`   | 字體選擇 |
| `/admin/theme/layouts` | Per-layout token 自訂（Theme v2） |
| `/admin/theme/preview` | 後台 preview（noindex；接受 `?path=&theme=`） |

### 技術細節

- Theme preset single source: `lib/modules/theme/presets.ts`
- Theme type single source: `lib/types/theme.ts` (`ThemeKey`, `ThemeScopeKey`, and customizable var allowlist)
- Resolver: `lib/modules/theme/resolve.ts`
  - Merge priority: preset vars → base overrides (`theme_overrides[themeKey]`) → derived Tailwind vars → derived overrides (`theme_overrides[themeKey]` on derived keys)
  - Generates Tailwind alpha vars (`--*-rgb`) and glass vars (`--glass-*`)
- SSR injection targets:
  - Global: `app/[locale]/layout.tsx` sets `<body data-theme style=...>`
  - Scoped: `components/theme/ThemeScope.tsx` sets `.theme-scope data-theme style=...`
  - Preview: `ThemePreviewIframe.tsx` injects to `.theme-scope` → `<body>` fallback (matches runtime)
- `data-theme` attribute set for semantic/debug purposes (avoid hardcoding preset values in CSS selectors)
- Public SSR reads use `lib/modules/theme/cached.ts` (tag: `site-config`)

### 資料模型

- `site_config`（singleton, id=1）
  - `global_theme`: ThemeKey
  - `page_themes`: JSONB `{ home?, blog?, gallery? }`
  - `theme_overrides`: JSONB `{ [ThemeKey]: { [CustomizableCssVar]: string | null } }`
  - `updated_at`, `updated_by`

### 實作備註

- 實作入口對照：見 [模組清單](#module-inventory-single-source)。

---

<a id="admin-cms"></a>
## 後台 CMS

### 功能

- Google OAuth login（email whitelist）
- Live preview editor
- 圖片上傳到 Cloudinary
- Markdown toolbar
- Report system（auto-detection: Lighthouse/Schema/Links；JSON summary）
- Role-based access（Owner/Editor）

### 路由

> Note: Admin routes 會掛在 `/[locale]/admin/*` 下（single locale: `zh`，例如 `/zh/admin/posts`）。下表為了可讀性省略 `/[locale]` 前綴。

**Dashboard（儀表板）**

| 路由     | 說明 |
| -------- | ----------- |
| `/admin` | Dashboard |

**Website / CMS / Settings（網站 / 內容 / 設定）**

| 路由                          | 說明 |
| ----------------------------- | ----------------------------------------------------- |
| `/admin/features`             | Feature toggles |
| `/admin/theme`                | 全站主題 |
| `/admin/theme/pages`          | Per-page 主題 |
| `/admin/theme/fonts`          | 字體 |
| `/admin/theme/layouts`        | Theme layout token editor |
| `/admin/content`              | Site content |
| `/admin/content/[section]`    | Section content editor |
| `/admin/landing`              | Landing page |
| `/admin/landing/[sectionKey]` | Landing section editor |
| `/admin/portfolio`            | Portfolio 管理 |
| `/admin/settings`             | Company settings（theme 由 `/admin/theme` 管） |

**Blog**

| 路由                     | 說明 |
| ------------------------ | ------------------- |
| `/admin/posts`           | 文章列表 |
| `/admin/posts/new`       | 新增文章 |
| `/admin/posts/[id]/edit` | 編輯文章 |
| `/admin/categories`      | 分類管理 |

**Engagement（互動）**

| 路由                       | 說明 |
| -------------------------- | ------------------ |
| `/admin/comments`          | 留言審核 |
| `/admin/comments/settings` | 留言設定 |

**Gallery（圖庫）**

| 路由                        | 說明 |
| --------------------------- | ------------------------- |
| `/admin/gallery`            | 圖庫作品 |
| `/admin/gallery/[id]`       | 作品詳情（Hotspots editor + Hero toggle） |
| `/admin/gallery/categories` | 圖庫分類 |
| `/admin/gallery/featured`   | Featured items 管理 |

**Users（使用者）**

| 路由                | 說明 |
| ------------------- | ----------- |
| `/admin/users`      | 使用者列表 |
| `/admin/users/[id]` | 使用者詳情 |

**System（系統）**

| 路由                   | 說明 |
| ---------------------- | ----------------- |
| `/admin/import-export` | 匯入 / 匯出 |
| `/admin/reports`       | Report generation |
| `/admin/history`       | Audit history |

### 角色權限（RBAC）

| 角色   | 權限 |
| ------ | ------------------------------------ |
| Owner  | Full access、theme editing、settings |
| Editor | Content editing、read-only settings |

### 驗證流程

- Canonical decision order: `SECURITY.md` → Admin Role 判斷（JWT role → `site_admins` → env fallback）

### 內容來源（Public Navigation / Landing）

- Header nav labels（Legacy Header）：`site_content(section_key='nav')`（fallback：`messages/*`）
- Hamburger nav（Home v2 HeaderBar）：`site_content(section_key='hamburger_nav')`（published JSON v2；解析：`parseHamburgerNav`；fallback：built-in default）
- Footer copy：`site_content(section_key='footer')`（fallback：`messages/*`）
- Company short name：`site_content(section_key='company')`（fallback：`messages/*`）
- Home v2 hero copy：`site_content(section_key='hero')`
- Home v2 marquee / event CTA / hotspots max：`company_settings`（key/value）
- Landing sections（CMS 仍可管理；legacy layout/anchors 用途）：`landing_sections` table（`lib/modules/landing/*`；目前 Home v2 不直接 render）
  - Preset sections（`hero/about/services/platforms/product_design/portfolio/contact`）：主內容來自其他資料來源（`site_content`, `services`, `portfolio_items`, `gallery`）
  - Custom sections（`custom_1...custom_10`）：內容存於 `landing_sections.content_en/zh`

---

<a id="importexport-admin-only"></a>
## 匯入 / 匯出（後台）

> 路由：`/admin/import-export`（掛在 `/[locale]/admin/*` 下）

- PRD: [IMPORT_EXPORT.md](specs/completed/IMPORT_EXPORT.md)

### 技術規格（單一真相來源）

- Spec (formats/flows/invariants): `specs/completed/import-export-spec.md`
- 實作入口對照：見 [模組清單](#module-inventory-single-source)

---

<a id="ai-analysis-admin-only"></a>
## AI 分析（後台）

> 路由：`/admin/ai-analysis`（掛在 `/[locale]/admin/*` 下）

- PRD: [AI_ANALYSIS_v2.md](specs/completed/AI_ANALYSIS_v2.md)

### 技術規格（單一真相來源）

- Spec (contracts/flows): `specs/completed/ai-analysis-spec.md`
- Ops enablement / cron verification: `runbook/ai-analysis.md`
- 實作入口對照：見 [模組清單](#module-inventory-single-source)

---

<a id="embeddings-and-semantic-search-admin-only"></a>
## Embeddings 與語意搜尋（後台）

> 路由：
>
> - Search UI：`/admin/control-center`
> - Embeddings management：`/admin/embeddings`

- PRD: [SUPABASE_AI.md](specs/completed/SUPABASE_AI.md)

### 技術規格（單一真相來源）

- Embeddings/search/RAG contracts: `specs/completed/embeddings-semantic-search-spec.md`
- Queue dispatcher/worker contracts: `specs/completed/embedding-queue-dispatcher-worker-spec.md`
- Ops enablement / cron verification: `runbook/embeddings-preprocessing.md`
- 實作入口對照：見 [模組清單](#module-inventory-single-source)

---

<a id="preprocessing-admin-only"></a>
## 資料預處理（後台）

> 路由：`/admin/preprocessing`

- PRD: [DATA_PREPROCESSING.md](specs/completed/DATA_PREPROCESSING.md)

### 技術規格（單一真相來源）

- Pipeline contracts: `specs/completed/data-preprocessing-pipeline-spec.md`
- Queue dispatcher/worker contracts: `specs/completed/embedding-queue-dispatcher-worker-spec.md`
- Ops enablement / cron verification: `runbook/embeddings-preprocessing.md`
- 實作入口對照：見 [模組清單](#module-inventory-single-source)

---

<a id="i18n"></a>
## 多語系（i18n）

### 實作

- 使用 `next-intl`
- 支援語系：繁體中文（`zh`）
- 翻譯檔：`messages/zh.json`

### 路由結構

- 所有 routes 皆使用 `/[locale]/*` pattern
- URL 一律帶 locale prefix（例如 `/zh/...`）
- 預設語言：`zh`

### 單一真相來源

- `lib/i18n/locales.ts` 是唯一 locale 來源（禁止硬編）

---

<a id="seo"></a>
## SEO

### 功能

- Dynamic `sitemap.xml` (`app/sitemap.ts`)
- Dynamic `robots.txt` (`app/robots.ts`) — disallows `/admin/*` for SEO isolation
- Open Graph and Twitter Card
- JSON-LD structured data
- Auto-generated hreflang tags

### URL 單一來源

- Canonical constraints: `../ARCHITECTURE.md` §3.11 (SEO / URL 單一來源)
- Drift guardrails / grep checklist: `../uiux_refactor.md` §2

---

<a id="known-gaps-roadmap-links"></a>
## 已知缺口（連到 Roadmap）

> 目的：避免把「未完成/刻意 gated」敘述散落在各 feature 章節，造成讀者誤以為本文件描述的是「全功能已完成」狀態。

### Home UIUX / Navigation

- Hamburger nav v2 的 resolver/contract 與現行 Blog/Gallery 路由仍有漂移（v2 canonical URLs 尚未全量落地）。
- `hamburger_nav` publish deep validation（存在且可公開）尚未接到 admin publish flow（見 `doc/meta/STEP_PLAN.md`）。

### Gallery Hero/Hotspots（DB scripts sync）

- Repo 的 Supabase scripts 尚未同步 `gallery_pins(surface='hero')` 與 `gallery_hotspots` 的 schema/RLS/grants（見 `doc/meta/STEP_PLAN.md`）。

### CI gates

- `npm run type-check` / `npm run lint` 目前為紅燈（原因與修復方案見 `doc/meta/STEP_PLAN.md`）。

### Data Intelligence（後台）

- Data Intelligence Platform：
  - Module B（AI Analysis）：reports/schedules + share links 已落地；custom templates backend + Admin UI（Owner CRUD + selection + analysis selection）已落地（see `doc/specs/completed/ai-analysis-spec.md`）
  - Module C / Module C Extension：Phase 7+（Hybrid Search / 可配置 pipeline 等）以 `doc/ROADMAP.md` 為準
  - 入口（localized）：`/[locale]/admin/(data)/import-export`, `/[locale]/admin/(data)/ai-analysis`, `/[locale]/admin/(data)/control-center`, `/[locale]/admin/(data)/embeddings`, `/[locale]/admin/(data)/preprocessing`（AI Analysis 需啟用 cron 或使用 owner-only manual processing）

### Analytics（分析）

- Page view tracking（ingestion + privacy-first aggregation）已落地：`specs/completed/page-views-analytics-spec.md`
- Dashboard UI 已落地（Admin-only, read-only）：`/[locale]/admin/analytics/pageviews`

---

<a id="module-inventory-single-source"></a>
## 模組清單（單一真相來源）

> 本節只列出各 domain 的**入口點**（facade / cached / admin-io）。
> 完整檔案清單請用 `ls lib/modules/<domain>/`（業務模組）或 `ls lib/<domain>/`（cross-cutting）查看。
> IO 命名規則見 `ARCHITECTURE.md` §3.4。

| Domain    | Public IO                   | Cached                          | Admin IO                          | Types                    |
| --------- | --------------------------- | ------------------------------- | --------------------------------- | ------------------------ |
| Blog      | `lib/modules/blog/io.ts`    | `lib/modules/blog/cached.ts`    | `lib/modules/blog/admin-io.ts`    | `lib/types/blog.ts`      |
| Gallery   | `lib/modules/gallery/io.ts` | `lib/modules/gallery/cached.ts` | `lib/modules/gallery/admin-io.ts` | `lib/types/gallery.ts`   |
| Comments  | `lib/modules/comment/io.ts` | —                               | `lib/modules/comment/admin-io.ts` | `lib/types/comments.ts`  |
| Reactions | `lib/reactions/io.ts`       | —                               | —                                 | `lib/types/reactions.ts` |
| Users     | —                           | —                               | `lib/modules/user/*-admin-io.ts`  | `lib/types/user.ts`      |
| Theme     | `lib/modules/theme/io.ts`   | `lib/modules/theme/cached.ts`   | `lib/modules/theme/admin-io.ts`   | `lib/types/theme.ts`     |
| Content   | `lib/modules/content/io.ts` | `lib/modules/content/cached.ts` | —                                 | —                        |
| Landing   | `lib/modules/landing/io.ts` | `lib/modules/landing/cached.ts` | `lib/modules/landing/admin-io.ts` | —                        |
| Features  | `lib/features/io.ts`        | `lib/features/cached.ts`        | `lib/features/admin-io.ts`        | —                        |

### Data Intelligence 模組（後台）

| Module        | Facade                              | Types                              | Spec / Code Map                                        |
| ------------- | --------------------------- | ---------------------------- | ------------------------------------------------------ |
| Import/Export | `lib/modules/import-export/*-io.ts` | `lib/types/import-export.ts`       | `specs/completed/import-export-spec.md`                |
| AI Analysis   | `lib/modules/ai-analysis/io.ts`     | `lib/types/ai-analysis.ts`         | `doc/archive/2025-12-30-ai-analysis-implementation.md` |
| Embeddings    | `lib/modules/embedding/io.ts`       | `lib/types/embedding.ts`           | `specs/completed/embeddings-semantic-search-spec.md`   |
| Preprocessing | `lib/modules/preprocessing/io.ts`   | `lib/modules/preprocessing/types.ts` | `specs/completed/data-preprocessing-pipeline-spec.md`  |
| Rerank        | `lib/rerank/io.ts`          | `lib/rerank/types.ts`        | —                                                      |

### Cross-cutting（跨領域 / 共用）

- SEO: `lib/seo/hreflang.ts`, `lib/seo/jsonld.ts`, `lib/site/site-url.ts`
- Navigation v2: `lib/site/nav-resolver.ts`, `lib/types/hamburger-nav.ts`, `lib/validators/hamburger-nav.ts`
- Analytics: `lib/analytics/pageviews-io.ts`, `lib/validators/page-views.ts`, `lib/types/page-views.ts`
- i18n: `lib/i18n/locales.ts`, `messages/*.json`
- Spam: `lib/spam/io.ts`, `lib/spam/engine.ts`（pure）
- Auth (RBAC helpers): `lib/auth/index.ts`（server-only）
- Embeddings facade (non-module import surface): `lib/embeddings/index.ts`（server-only）
- Hotspots markdown: `lib/markdown/hotspots.ts`（server-only）
- Cross-domain use cases: `lib/use-cases/**`

---

## 相關文件

- [ARCHITECTURE.md](../ARCHITECTURE.md)：架構約束
- [SECURITY.md](SECURITY.md)：安全規則
- [ROADMAP.md](ROADMAP.md)：待辦 / 計畫（what/why/status）
- [uiux_refactor.md](../uiux_refactor.md)：Drift 追蹤 / 修復手冊
