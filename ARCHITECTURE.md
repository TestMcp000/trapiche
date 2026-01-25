# ARCHITECTURE.md

> Last Updated: 2026-01-23
> Status: Enforced
> Role: Single source of truth for architecture and global constraints.

## 0. 權威與適用範圍

- 本文件是後續開發的唯一架構指南；其他文件僅能補充細節，不可與本文件衝突。
- 架構守門員測試在 `tests/architecture-boundaries.test.ts`；若規則變更，需同步更新測試與本文件。
- 修復流程與 merge 前 drift checklist：`uiux_refactor.md`（本檔只定義規則/約束；不要在這裡寫操作手冊）。
- 任何新增 domain / 基礎設計決策，必須同時更新本文件與相關測試。

## 1. 技術堆疊與系統概觀

- Next.js 16 (App Router) + React 19
- TypeScript strict
- Tailwind CSS 3.4.x (system fonts only; upgrade → 4.x planned)
- next-intl（目前 single-locale：`zh`；唯一來源：`lib/i18n/locales.ts`）
- Supabase (PostgreSQL + Auth + RLS)
- Cloudinary
- Vercel

## 2. 全域非協商約束 (Non-negotiable)

- 單一真相來源: domain 計算/轉換/規則不得重複實作。
- Server-first: public 頁面預設 server component；client component 僅做互動。
- Theme tokens（single source）: preset 值唯一來源為 `lib/modules/theme/presets.ts`；public SSR 以 inline 注入 CSS variables 套用主題並設 `data-theme` 供語意/除錯（避免在 CSS `[data-theme]` 內硬編 preset 值造成 drift，且可完整支援 `theme_overrides`）；同時注入 Tailwind alpha utilities 需要的 `--*-rgb`（例如 `bg-primary/10`）與玻璃工具變數 `--glass-surface/--glass-border`（對應 `.glass`/`.glass-card`）。
- Theme v2 架構（4 Layout Types + Per-Layout Tokens）:
  - `ThemeKey` 代表 4 種「布局類型」（tech-pro / japanese-airy / glassmorphism / scrollytelling）；每種布局有不同的視覺風格與排版邏輯。
  - Tokens 代表「可自訂的設計參數」：`--theme-font` / `--theme-bg` / `--theme-text` / `--theme-accent` / `--theme-radius` / `--theme-shadow` / `--surface*` 等（白名單定義於 `lib/types/theme.ts`）。
  - DB 使用 `theme_overrides: { [themeKey]: { [cssVarKey]: value } }` 結構，讓每種布局的自訂設定互不污染。
  - Merge priority（後者覆蓋前者）：`preset vars` → `theme_overrides[themeKey]`（base）→ `derived Tailwind vars` → `theme_overrides[themeKey]`（derived overrides）。
- Fonts（system fonts only）: 禁止 runtime 載入外部字體；主題字體切換一律透過 `--theme-font`（系統字體堆疊）在 SSR 階段注入。
- `lib/` 不放 React hooks；hooks 僅存在於 `hooks/`。
- Pure modules 僅做純計算 (no fetch/DB/Next/console/browser APIs)。
- Markdown trust boundaries：
  - Trusted admin markdown：`lib/markdown/server.ts`（posts / site_content 等管理員內容）。
  - High-exposure hotspots markdown：`lib/markdown/hotspots.ts`（`gallery_hotspots.description_md`；禁 raw HTML + sanitize + https/mailto links）。
  - Untrusted markdown（LLM output / share links / 非 admin 來源）：**必須**使用 `lib/markdown/untrusted.ts`（禁 raw HTML + sanitize + https/mailto links）。
- Public UI 不得 import `components/admin/*` 或 admin-only dependencies。
- Feature visibility (blog/gallery) 必須走 `feature_settings` + `lib/features/cached.ts`。
- Public SSR 讀取必須使用 `cachedQuery` 包裝的 cached modules（例如 `lib/modules/*/cached.ts`、`lib/features/cached.ts`）。
- Secrets 僅能存在 server；任何 cron/worker/system endpoints 必須驗證 shared secret。
- AI/LLM/Embeddings：SDK 不得進 client bundle；OpenAI SDK 僅允許存在於 `supabase/functions/**`（Edge Functions），OpenRouter API access 僅允許存在於 server-only `lib/infrastructure/openrouter/**`；任何送往 AI 的資料必須先去識別化（避免 PII 外洩；具體落地/grep 守門見 `uiux_refactor.md` §2、導入步驟見 `uiux_refactor.md` §6.2）。
- RLS 為最終安全邊界；UI gate 只做 UX。

## 3. 目錄與分層

```
myownwebsite/
app/           # routes, API routes, server actions
components/    # UI (server preferred; admin UI in components/admin)
hooks/         # client-only hooks
lib/           # domain logic (pure + IO separated)
tests/         # guardrails & unit tests
supabase/      # DB migrations and seeds
doc/           # documentation
```

### 3.0 快速決策樹（避免重複實作 / 放哪裡？）

> 目的：讓新加入的人可以快速決定「這段該放哪裡」，並在同一個位置找到單一真相來源。

1. **需要 DB/RPC/外部 API 呼叫？**
    - Yes → 放 `lib/modules/<domain>/io.ts` / `lib/modules/<domain>/admin-io.ts` / `lib/modules/<domain>/*-io.ts`
   - No → 繼續
2. **需要 public SSR cache（穩定 TTFB/LCP、避免 cookie 汙染 cache key）？**
    - Yes → 放 `lib/modules/<domain>/cached.ts`（`cachedQuery` + tags；fetcher **不得**讀 `cookies()`/`headers()`）
   - No → 繼續
3. **純計算/映射/格式化/驗證（可單測、無 side effects）？**
     - Yes → 放 pure module（`lib/modules/<domain>/*.ts`）或 validator（`lib/validators/*`），並加入/維護對應 tests
    - No → 繼續
4. **需要跨 domain/module 的 orchestration？**（例：Comment submit 的 Spam → Safety、Landing → Gallery）
   - Yes → 放 `lib/use-cases/**`（server-only；可組合多個 `lib/modules/*`；modules 保持隔離）
5. **Client 端需要重複呼叫同一個 API（避免重複實作）？**
   - Yes → 建立/擴充 `hooks/use*Data.ts` 作為唯一呼叫點（Frontend Bridge Pattern）
6. **需要對外提供 HTTP endpoint？**
   - API route → `app/api/<domain>/route.ts`（只做 parse/validate → call `lib/*` → return）
   - Admin 寫入 → `app/[locale]/admin/**/actions.ts`（只做 validate → call `lib/*` → revalidate）

### 3.1 app/

- 路由與資料讀取集中在 server components。
- API routes 一律使用資料夾結構 `app/api/<domain>/route.ts`。
- admin 寫入必須透過 server actions。
- Theme 套用點：`app/[locale]/layout.tsx` 注入全域主題；`app/[locale]/page.tsx` 與 `app/[locale]/{blog,gallery}/layout.tsx` 透過 `components/theme/ThemeScope.tsx` 套用 scope 主題覆寫。

### 3.2 components/

- Public UI 與 Admin UI 完全分離。
- `components/admin/*` 必須是 client component（允許 admin-only dependencies）。
- Cross-domain shared UI（例如 Comments）：必須放在 `components/comments/*`（避免放在 `components/blog/*` 造成 domain 混淆；修復紀錄：`doc/archive/2026-01-21-step-plan-v2-home-uiux-gallery-hotspots-hamburger-nav.md`（PR-12））。
- Theme scope wrappers 放在 `components/theme/*`：
  - `components/theme/ThemeScope.tsx`（server）：套用分頁主題（home/blog/gallery），並提供 `.theme-scope` 背景/字體/濾鏡等一致性。
  - `components/theme/ThemePreviewScope.tsx`（server）：admin preview 專用，接受 themeKey 作為 prop，包含動畫 mount 判斷（用於 layout-level preview）。
  - `components/theme/ScrollytellingClient.tsx`（client）：僅在 preset `enableAnimations=true` 時才掛載，避免不必要 public client bundle。
- Admin Theme Preview Route：`app/[locale]/admin/theme/preview/page.tsx`（server）用於 iframe 預覽，接收 `path` + `theme` searchParams，強制 `noindex`，不污染 public cache。

### 3.3 hooks/

- 僅 client components 可使用。
- 不得 import server-only 模組。

### 3.4 lib/

- Domain 模組分為 `io.ts` / `cached.ts` / `admin-io.ts` / `*-io.ts` / pure modules。
- 任何 DB / 外部 API I/O 僅能在 `io.ts` 或 `*-io.ts`（包含 `admin-io.ts` / `<feature>-io.ts`）。
- Public SSR 讀取只能走 `cached.ts` (使用 `cachedQuery`)。
- **IO 模組不可變成雜物抽屜**：當任一 `*-io.ts` / `admin-io.ts` / `io.ts` 符合下列條件時，必須拆分為更語意化的 submodules（仍維持 `*-io.ts` 命名）：
  - 檔案行數 > **300** 行，或
  - `export` 的 functions > **12** 個
  - 拆分命名範例：`embedding-search-io.ts`, `preprocessing-monitoring-io.ts`, `reports-run-io.ts`
  - 拆分後允許保留一個薄的 aggregator（例如 `lib/modules/embedding/io.ts` 只 re-export 或只保留 orchestration），避免跨檔案循環依賴
  - 現存巨石檔案若暫時無法一次拆完，必須在 `uiux_refactor.md` 建立 drift 項目與分階段拆分步驟（避免永遠不還技術債）

### 3.5 檔案結構與命名規則 (硬性)

> **NOTE**: See 附錄 A: §3.4.1 for the canonical `lib/` layout (Phase 2; shims removed).

- 新增業務 domain 必須建立：`lib/modules/<domain>/` + `lib/types/<domain>.ts` + `components/<domain>/` + `app/[locale]/<domain>/`。
- DB / 外部 API I/O 只能在 `lib/modules/<domain>/io.ts`、`lib/modules/<domain>/admin-io.ts` 或 `lib/modules/<domain>/*-io.ts`；Public cached read 只能在 `lib/modules/<domain>/cached.ts`。
- Pure 計算只存在於 `lib/modules/<domain>/*.ts` (無 side effects)；不得放在 `app/` 或 `components/`。
- Utility 檔案使用 `kebab-case.ts`；React component 使用 `PascalCase.tsx`。
- 不允許任意新增 `app/` 之外的 routes；API 路由必須是 `app/api/<domain>/route.ts` 格式。

### 3.6 API 介面契約 (Phase 1 完成)

- **types 定義位置**：所有 API request/response types 必須定義在 `lib/types/*`（如 `lib/types/comments.ts`），不得在 `app/api/*/route.ts` 中 export。
- **Client import 規則**：client components 不得直接 import `app/api/*/route.ts`；應從 `lib/types/*` 取得 types。
- **API route 實作**：API route 應 import types from `lib/types/*`，僅 export HTTP handler functions (GET/POST/PATCH/DELETE)。
- **目標**：避免 client → route.ts 的耦合，使 types 成為 single source of truth，便於後續重構 DB 邏輯到 `lib/*/io.ts`。

#### API Types 清單

| Domain    | Type File                | 主要 Types                                                                                                                         |
| --------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Gallery   | `lib/types/gallery.ts`   | `GalleryItemsApiResponse`, `GalleryItemWithLikedByMe`                                                                              |
| Comments  | `lib/types/comments.ts`  | `CommentPublic`, `CommentRow`, `AdminCommentListItem`, `CommentBlacklistItem`, `CommentSettingsResponse`, `CommentFeedbackRequest` |
| Reactions | `lib/types/reactions.ts` | `ReactionToggleRequest`, `ReactionToggleResult`                                                                                    |
| Reports   | `lib/types/reports.ts`   | `ReportType`, `RunReportRequest`, `ReportsListResponse`                                                                            |
| Common    | `lib/types/api-error.ts` | `ApiErrorResponse`, `API_ERROR_CODES`                                                                                              |

#### Runtime Validators

- 所有 API endpoint 應使用 `lib/validators/*` 進行輸入驗證。
- Validators 為純函式（pure functions），遵循 `lib/validators/api-common.ts` 的 `ValidationResult<T>` 模式。
- 驗證器清單：`api-common.ts`（UUID/分頁）、`comments.ts`、`gallery-api.ts`、`reactions.ts`、`reports.ts`。

#### 錯誤回應格式 (統一)

```typescript
interface ApiErrorResponse {
  error: string; // 使用者可讀的錯誤訊息（必填）
  code?: string; // 錯誤代碼，供 UI 分支判斷
  message?: string; // Debug 用的詳細訊息
}
```

### 3.7 API Route IO 收斂規則 (Phase 2 完成)

- **API routes 只做**：parse → validate → 呼叫 `lib/*` → return response。
- **禁止在 API routes 內直接進行 Supabase 查詢**；所有 DB 操作必須透過 `lib/*/io.ts` 或 `lib/*/admin-io.ts`。
- **Admin 驗證**：使用 `lib/auth` 的 `isSiteAdmin()` 函式，不要手動查詢 `site_admins` 表。
- **目的**：高內聚（IO 集中於 lib）、可測試（lib 函式可獨立單元測試）、低耦合（API routes 不依賴 DB 實作細節）。

#### Domain IO 模組清單

| Domain    | IO File                         | 主要功能                                         |
| --------- | ------------------------------- | ------------------------------------------------ |
| Gallery   | `lib/modules/gallery/io.ts`     | Gallery items 分頁/查詢（facade；可 re-export 子 IO） |
| Gallery   | `lib/modules/gallery/gallery-pins-io.ts` | Public pins read（featured/home/hero） |
| Gallery   | `lib/modules/gallery/gallery-hotspots-io.ts` | Public hotspots read（auto/manual ordering） |
| Gallery   | `lib/modules/gallery/hotspots-admin-io.ts` | Admin hotspots CRUD/reorder（RLS） |
| Gallery   | `lib/modules/gallery/pins-admin-io.ts` | Admin pins（featured + hero selection） |
| Comments  | `lib/modules/comment/io.ts`     | Public comments CRUD、permalink、public settings |
| Comments  | `lib/modules/comment/admin-io.ts` | Admin settings、blacklist、feedback 操作       |
| Reactions | `lib/reactions/io.ts`           | Rate limit、toggle、likedByMe 批次查詢           |
| Reports   | `lib/modules/reports/admin-io.ts`       | 報告列表、建立、狀態更新               |
| Reports   | `lib/modules/reports/reports-run-io.ts` | 報告執行（links/schema/lighthouse）    |
| Content   | `lib/modules/content/site-content-io.ts` | `site_content` CRUD/publish（history） |
| Content   | `lib/modules/content/hamburger-nav-publish-io.ts` | hamburger nav publish deep validate（DB existence） |
| Landing   | `lib/modules/landing/io.ts`             | Landing sections 讀取                  |
| Auth      | `lib/auth/index.ts`                     | `isSiteAdmin()`、`isOwner()` 等驗證函式 |

### 3.8 Frontend Bridge Pattern (Phase 3 完成)

- **目的**：避免 client components 重複 API 呼叫邏輯，建立唯一 API 呼叫點。
- **模式**：使用 `hooks/use*Data.ts` hook 封裝 API 呼叫邏輯，client components 使用 hook 取得資料。

#### Frontend Bridge Hooks

| Hook                          | API Endpoint           | 用途                                     |
| ----------------------------- | ---------------------- | ---------------------------------------- |

#### 設計原則

1. **唯一呼叫點**：多個 components 需要相同 API 資料時，使用共同 hook 而非各自呼叫。
3. **Hydration 安全**：hook 需接收 `isHydrated` 參數，避免 SSR/CSR mismatch。
4. **Bundle 保護**：hook 只使用 `lib/types/*` 的 types，不引入 server-only 依賴。

### 3.9 API Feature Gate (Phase 4 完成)

- **一致性原則**：feature disabled 時，UI、sitemap、API 都必須一致收斂。
- **API routes 必須檢查 feature status**：
  - `GET /api/gallery/items` → 檢查 `isGalleryEnabledCached()`
  - `POST /api/reactions` → 根據 `targetType` 檢查對應 feature（`gallery_item` → gallery gate）
- **回應規則**：feature disabled 時回傳 404，不是 403。
- **使用快取版本**：API routes 使用 `lib/features/cached.ts` 的快取函式（減少 DB 壓力；與 §7 一致）。
- **Comments 例外**：`comment` 類型的 reactions 不做獨立 feature gate，因為 comments 附屬於 blog/gallery 頁面，已有 UI level 的 gate。

### 3.11 SEO / URL 單一來源 (Phase 4 完成)

- **`SITE_URL` 唯一來源**：`lib/site/site-url.ts` 是全站 URL 的單一真相來源，且是唯一允許讀取 `NEXT_PUBLIC_SITE_URL` 的檔案。
- **Server-only `SITE_URL`（OpenRouter header）**：`process.env.SITE_URL` 僅用於 OpenRouter `HTTP-Referer`（server-only）；若需要 fallback 到 canonical site URL，必須透過 `lib/site/site-url.ts`（import `SITE_URL` constant），不得直接讀 `process.env.NEXT_PUBLIC_SITE_URL`（避免第二來源）。
- **向後相容**：`lib/seo/hreflang.ts` 可 re-export `SITE_URL` 供舊呼叫端使用（但不是 SSoT）。
- **禁止硬編網域**：所有需要完整 URL 的地方（SEO、Akismet、webhook URL 展示等）必須使用 `SITE_URL`，不得硬編網域字串。
- **v2 canonical path builders**：Blog/Gallery 的 canonical path 只能由 `lib/seo/url-builders.ts` 與 `lib/site/nav-resolver.ts` 產出；避免在 modules/components 內自行串字（防止 SEO drift）。
- **Permalink 一致性**：任何「非 page render」用途的 permalink（Akismet、admin feedback、share links 等）也必須使用 v2 canonical（避免 redirect chain；修復紀錄：`doc/archive/2026-01-21-step-plan-v2-home-uiux-gallery-hotspots-hamburger-nav.md`（PR-9, PR-10））。
- **Redirect 合約**：canonicalization 必須是永久 redirect（301/308）；在 server component 內使用 `permanentRedirect()`，避免 `redirect()`（307）造成 SEO 漂移（修復紀錄：`doc/archive/2026-01-21-step-plan-v2-home-uiux-gallery-hotspots-hamburger-nav.md`（PR-11）；若發現違規，記錄於 `uiux_refactor.md` §4）。
- **Legacy routes 策略**：若某 legacy URL 已由 `next.config.ts`（或 `proxy.ts`/middleware）提供永久 redirect，則對應的 `app/` legacy page 應直接刪除，避免留下 redirect-only stub 形成死碼/雙來源與 drift（見 `doc/archive/2026-01-21-step-plan-v2-home-uiux-gallery-hotspots-hamburger-nav.md`（PR-11））。
- **JSON-LD siteName**：首頁 JSON-LD 的 `siteName` 必須從 `company_settings.company_name_short` 讀取，不得硬編品牌名。
- **Akismet 配置**：`lib/spam/akismet-io.ts` 的 `AKISMET_BLOG_URL` 必須 fallback 到 `SITE_URL`，不得使用其他硬編 URL。

### 3.12 Comments API Sensitive Data Protection (Phase 5 完成)

- **Public API Response**：`GET /api/comments` 回傳 `CommentPublicSafe` 類型，排除敏感欄位：
  - `userId`, `userEmail`, `ipHash`, `spamScore`, `spamReason`, `isSpam`, `isApproved`, `linkCount`
- **Moderation Data Storage**：敏感資料存於 `comment_moderation` 表（admin-only RLS）
- **Server-Only Tables**：`comment_rate_limits`, `spam_decision_log`, `comment_blacklist` 使用 `createAdminClient()`（無 public authenticated RLS policy）
- **Types 分離**：
  - `CommentPublicSafe`：公開 API 使用（無敏感欄位）
  - `CommentFull`：內部/admin 使用（包含所有欄位）
  - `CommentPublic` / `CommentPublicWithReplies`：已廢棄別名，保留向後相容
- **Ownership 顯示規則**：
  - Public API 不回傳 `userId`（避免可關聯識別）
  - 若 UI 需要「是否本人」請回傳 `isMine` boolean（由 server 根據 session 計算）
- **Moderation 寫入規則**：
  - `comment_moderation` 寫入必須使用 service role（`createAdminClient()`）
  - 不得新增 authenticated policy 以繞過 RLS
- **Admin 列表規則**：
  - Admin comment 列表必須 join `comment_moderation`，確保 `userEmail`/`spamReason` 可用

### 3.13 Data Intelligence Platform（Implemented）

> Scope：admin-only 擴展平台（Import/Export, AI Analysis, Supabase AI/pgvector, Data Preprocessing）。  
> Implemented inventory：`doc/SPEC.md`（Data Intelligence 章節 + Module Inventory）  
> Roadmap：`doc/ROADMAP.md`  
> PRD：`doc/specs/completed/*`  
> Specs（SSoT）：`doc/specs/completed/data-intelligence-interfaces-spec.md`, `doc/specs/completed/import-export-spec.md`, `doc/specs/completed/embeddings-semantic-search-spec.md`, `doc/specs/completed/data-preprocessing-pipeline-spec.md`  
> Historical execution record：`doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md`  
> AI Analysis spec（single-feature contracts/flows）：`doc/specs/completed/ai-analysis-spec.md`  
> Historical code maps（non-SSoT）：`doc/archive/2025-12-30-ai-analysis-implementation.md`, `doc/archive/2025-12-31-ai-analysis-e2e-hardening.md`

**Module boundaries（放置位置是約束，不是建議）**

- Module A（Import/Export）：`lib/modules/import-export/**`
  - Pure：parsers/validators/formatters（可單測、無 IO）
  - IO：所有 DB/RPC/Storage 操作必須在 `lib/modules/import-export/*-io.ts`，且檔案需 `import 'server-only';`
  - Types（SSOT）：`lib/types/import-export.ts`
- Module B（AI Analysis）：`lib/modules/ai-analysis/**`
  - OpenRouter SDK **只允許**出現在此 domain，且 import 檔案必須 `import 'server-only';`
  - 任何送往 LLM 的資料必須先經過 **去識別化（pure）**；對應 tests 必須先於 IO 存在
- Module C（Supabase AI / pgvector）：`supabase/**` + `supabase/functions/**`
  - DB schema/RLS/migrations：`supabase/`
  - OpenAI SDK **只允許**出現在 `supabase/functions/**`（Edge Functions）；不得出現在 Next.js `app/**`/`components/**`/`lib/**`
- Module C Extension（Data Preprocessing）：`lib/modules/preprocessing/**`
  - 先做 pure-first pipeline（cleaners/chunkers/enrichers/quality-gate），最後才接 orchestrator IO（`*-io.ts`）
- Rerank（Cohere optional）：`lib/rerank/**`
  - Cohere API access **只允許**存在於 `lib/rerank/**` 且檔案必須 `import 'server-only';`
  - 其他 domain 若需使用 rerank，僅允許透過 `lib/rerank/io.ts`（或 dynamic import）整合，避免把外部 API access 分散到各處造成 drift

**SDK / Secrets / Client Bundle 規則（安全 + SEO + bundle）**

- `app/**` 與 `components/**`（含 admin client components）不得 import `openai` / `openrouter` / `@google/generative-ai` SDK（避免 SDK/Secrets 進 client bundle）
- Secrets 只能在 server/Edge：
  - OpenAI key：Supabase Secrets（Edge Functions 讀取）
  - OpenRouter key：環境變數（server-only `lib/infrastructure/openrouter/**` 讀取）
  - Gemini key：環境變數（server-only `lib/infrastructure/gemini/**` 讀取；建議 `GEMINI_API_KEY`）
- Next.js admin UI 只能「觸發 job/查詢狀態」，不得直接呼叫 OpenAI/OpenRouter SDK
- **Supabase Edge Functions（OpenAI cost hardening）必須 service_role-only**：
  - `supabase/functions/generate-embedding/*` 與 `supabase/functions/judge-preprocessing/*` 必須拒絕 `anon` / `authenticated` JWT（避免任何人用公開 anon key 觸發 OpenAI cost、或透過 function 內部 service role 寫入污染資料）。
  - Next.js server-only 呼叫端必須使用 `createAdminClient().functions.invoke(...)`；不得使用 anon key 直接 `fetch ${SUPABASE_URL}/functions/v1/*`。
  - Supabase Edge Functions 必須保持 JWT verification enabled（若關閉，role 判斷將失去意義）。

**Guardrails（已落地；新增 module/deps 時需擴充）**

- `tests/architecture-boundaries.test.ts` 已包含：
  - AI SDK import allowlist（openai 只在 `supabase/functions/**`；openrouter 只在 `lib/infrastructure/openrouter/**`；gemini 只在 `lib/infrastructure/gemini/**`；且都必須 server-only）
  - Edge Functions isolation（`supabase/functions/**` 禁止 import `next/*`, `react*`, `app/**`）
- 合併前必跑：`uiux_refactor.md` §2 grep checklist + `npm test` / `npm run type-check` / `npm run lint`

## 4. 模組邊界與測試守門員 (Enforced)

### 4.1 Client/Server 邊界

- 使用 browser API (`window`, `document`, `localStorage`...) 必須是 client component。
- client component 不得 import `next/headers`, `next/server`, `@/lib/infrastructure/supabase/server`。
- `@/lib/infrastructure/supabase/client` 只能在 client component 使用。

### 4.2 Public/Admin 分離

- Public UI 不得 import `components/admin/*`。
- Public UI 不得 import admin-only deps: `react-image-crop`, `recharts`。

### 4.3 Pure Modules (嚴格純函式)

以下檔案被測試視為 pure，禁止任何 side effects:

- lib/utils/reading-time.ts
- lib/security/sanitize.ts

- lib/seo/hreflang.ts
- lib/seo/jsonld.ts
- lib/spam/engine.ts
- lib/modules/comment/tree.ts

- lib/utils/slug.ts
- lib/validators/comment-settings.ts
- lib/utils/cloudinary-url.ts
- lib/security/ip.ts
- lib/utils/anon-id.ts
- lib/modules/theme/presets.ts
- lib/modules/theme/resolve.ts
- lib/modules/theme/fonts.ts

新增 pure 模組時需同步更新 `tests/architecture-boundaries.test.ts`。

### 4.4 Modules Isolation（`lib/modules/*` 禁止跨模組依賴）

- `lib/modules/<domain>/**` **不得** import `lib/modules/<other-domain>/**`（避免循環依賴與隱性耦合）。
- Cross-domain orchestration 一律放 `lib/use-cases/**`（server-only）；由 use-case 組合多個 modules，modules 只保留單一職責。
- **Guardrail**：`tests/architecture-boundaries.test.ts` 的 "lib/modules/* do not cross-import other lib/modules/* domains" 會自動掃描並阻擋違規。

### 4.5 Bundle / Dependency Guardrails

- Public UI 禁止引入重型/管理端依賴：`react-image-crop`, `recharts`, `exceljs`, `papaparse`, `jszip`, `gray-matter`。
- Admin 端重型依賴必須 dynamic import，且只在 admin routes 使用。
- 禁止在 root layout 增加新的全域 provider，避免擴大 client bundle。
- `use client` 只允許在必要互動元件，不允許在 page/layout 濫用。

### 4.6 API Route IO Guardrails (Phase 5 完成)

- **禁止 API routes 內直接進行 DB 查詢**：所有 `app/api/**/route.ts` 檔案禁止出現：
  - `.from('` pattern（代表直接 Supabase 查詢）
  - `createAdminClient(` pattern（service role 只能在 `lib/**/io.ts` 或 `lib/**/*-io.ts` 使用，且必須 `import 'server-only';`）
- **測試守門員**：`tests/architecture-boundaries.test.ts` 的 "API routes do not contain direct Supabase queries" 測試會自動掃描並阻擋違規。
- **目的**：IO 操作集中於 `lib/**/io.ts` 與 `lib/**/*-io.ts`，提高可測試性與內聚性，避免 API routes 直接依賴 DB 實作細節。

## 5. Supabase Client 選擇

| Client  | File                     | 用途                                        | RLS     |
| ------- | ------------------------ | ------------------------------------------- | ------- |
| Browser | `lib/infrastructure/supabase/client.ts` | client component 即時互動                   | Enabled |
| Server  | `lib/infrastructure/supabase/server.ts` | server component / action with user session | Enabled |
| Anon    | `lib/infrastructure/supabase/anon.ts`   | public cached reads                         | Enabled |
| Admin   | `lib/infrastructure/supabase/admin.ts`  | service role (system ops)                   | Bypass  |

## 6. Cache 與 Revalidation

- Public SSR 必須使用 `cachedQuery` (`lib/cache/wrapper.ts`)，自動附加 `global-system` tag。
- 全域快取版本由 `system_settings.cache_version` 控制，透過 `increment_cache_version()` 失效。
- 常用 tag: `site-config`, `site-content`, `blog`, `gallery`, `landing-sections`, `features`, `portfolio`。
- 內容變更後必須 `revalidateTag()` + 必要 `revalidatePath()`，sitemap 必須更新。

## 7. Feature Visibility 與 SEO

- 模組級開關僅使用 `feature_settings` + `lib/features/cached.ts`。
- Disabled 時：導覽隱藏、直接 URL 回 404、`/sitemap.xml` 移除。
- 內容級可見性仍使用各 domain 欄位 (e.g. `is_visible`, `visibility`)。

## 8. i18n

- `lib/i18n/locales.ts` 是唯一 locale 來源，禁止硬編。
- 主要路由以 `/[locale]/*` 為準；預設以 `lib/i18n/locales.ts` 的 `DEFAULT_LOCALE` 為準（目前 `zh`）。

## 9. UI 組成與導覽

- Public 頁面（預設）：使用 `components/Header.tsx` + `components/Footer.tsx`。
- Home v2（`app/[locale]/page.tsx`）：允許使用 `components/home/*`（`MarqueeNotice` / `HeaderBarV2Client` / `HeroStageClient` 等）+ `components/Footer.tsx`。
- Admin 頁面僅使用 `app/[locale]/admin/layout.tsx` (AdminSidebar)。
- Legacy Header/Footer 標籤來源：`site_content(section_key='nav')` + `messages/*.json` fallback。
- Home v2 hamburger nav IA 來源：`site_content(section_key='hamburger_nav')`（typed targets；resolver 單一真相來源：`lib/site/nav-resolver.ts`；invalid → fallback default）。

## 10. 資料一致性與安全

- Admin role 以 `site_admins` + JWT `app_metadata.role` 為準；環境變數 fallback 僅供本機或過渡。
  - **Role Mismatch Warning**: 當 `isAdmin` 為 true 但 `jwtRole` 為空時，admin layout 會顯示警告橫幅 (en/zh)，提示使用者：
    - 已透過環境變數進入後台
    - DB 操作可能被 RLS 拒絕
    - 需聯繫 Owner 同步角色到 `site_admins` 表格
- DB 物件必須同時更新 `supabase/02_add/*`、`supabase/01_drop/*`，並 mirror 到 `supabase/COMBINED_*.sql`（以 `scripts/db.mjs` 的 canonical 流程為準）。
- RLS policy 名稱不可任意變更 (以利審計與追蹤)。

## 12. 必跑測試

- `npm test` — Node test runner（以輸出為準）
  - **Test Alias Resolver**: `scripts/test-alias.cjs` 作為 require hook，將 `@/` imports 映射到 `.test-dist` 目錄
  - **Test Script**: `scripts/test.mjs` 使用 `-r test-alias.cjs` 啟用 alias 解析
  - （可選）IO module size guardrail：`node scripts/inspect-io-module-size.mjs --check`（同規則已由 `tests/architecture-boundaries.test.ts` 守門）
- `npm run lint`
  - `uiux/` 若為 prototype/獨立專案，必須有清楚邊界：不得讓 root lint 永久紅燈（eslint ignores：`eslint.config.mjs` 內含 `uiux/**`）。
- `npm run type-check`
  - 使用 `tsconfig.typecheck.json`（extends `tsconfig.json`；exclude：`uiux/`, `.next/`, `.test-dist/`）
  - 若遇到 `.next/types` 相關型別錯誤：以 `npm run build` 為準（必要時先清掉 `.next/` 再 build）
- `npm run build`（routes/SEO/`.next/types` 相關變更必跑）
  - 若出現 `is not a module`：優先檢查是否有空檔/缺 export 的 route 檔案（常見：`app/**/page.tsx` 0 bytes）；快速檢查：`Get-ChildItem app -Recurse -File -Include *.ts,*.tsx,*.mts | Where-Object { $_.Length -eq 0 }`
- `npm run dev`
- `npm run docs:check-indexes`（有變更 `doc/specs/*` 或 `doc/archive/*` 時必跑）
- `npm run lint:md-links`（有變更 docs/README/連結時建議跑）

## 13. Documentation (Links only)

- Docs hub (SRP map + navigation): `doc/README.md`
- Owner dashboard (drift + not-done only): `doc/STATUS.md`
- Docs governance / update matrix (agent-facing): `doc/GOVERNANCE.md`
- Implemented behavior (SSoT): `doc/SPEC.md`
- Roadmap (what/why/status only): `doc/ROADMAP.md`
- Ops runbook (index; details in `doc/runbook/*`): `doc/RUNBOOK.md`
- Drift tracker + playbooks + stable `@see` index: `uiux_refactor.md`
- Active drift repair steps (keep completed snapshots in archive): `doc/meta/STEP_PLAN.md`
- Single-feature specs index (stable): `doc/specs/README.md`
- Home UIUX + Gallery Hero/Hotspots PRD（proposed；Implementation Contract）：`doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`

---

## 附錄 A: §3.4.1 lib/ Canonical 結構 (Phase 2 — Shim 已移除)

> Phase 2 已完成：canonical `lib/` 結構以本附錄為準；不再保留舊路徑 shim。

```
lib/
├── analytics/         # Analytics IO + aggregation
├── auth/              # RBAC helpers (server-only)
├── cache/             # Cache wrappers (unstable_cache)
├── embeddings/        # Embeddings platform facade (server-only)
├── features/          # Feature gates (SSOT: feature_settings)
├── i18n/              # Locale utils
├── infrastructure/    # 外部服務 (SDK wrappers, API clients)
│   ├── supabase/      # Supabase client factories
│   ├── openrouter/    # OpenRouter LLM client
│   ├── gemini/        # Gemini SDK wrapper (server-only)
│   ├── cloudinary/    # Cloudinary SDK
│   ├── akismet/       # Akismet spam API
│   ├── sentry/        # Sentry monitoring
│   └── stripe/        # Stripe SDK (placeholder; scope-reduced)
├── markdown/          # Markdown helpers
├── modules/           # 業務領域模組
│   ├── blog/          # 部落格文章
│   ├── gallery/       # 圖庫
│   ├── theme/         # 主題預設與解析
│   ├── ai-analysis/   # AI 分析協調
│   ├── embedding/     # 向量嵌入
│   ├── preprocessing/ # 資料前處理 pipeline
│   ├── import-export/ # 資料匯入匯出
│   ├── comment/       # 留言與審核
│   ├── safety-risk-engine/ # Safety Risk Engine（comments moderation）
│   ├── content/       # CMS 內容區塊
│   ├── user/          # 使用者資料
│   ├── landing/       # 首頁區塊
│   ├── reports/       # 分析報表
│   └── auth/          # 驗證輔助函式
├── queue/             # QStash / background triggers
├── reactions/         # Reactions IO (rate limit + toggle)
├── rerank/            # Rerank (Cohere optional; server-only)
├── security/          # Security helpers (sanitize/ip)
├── seo/               # SEO helpers (hreflang/jsonld)
├── site/              # SITE_URL SSOT
├── spam/              # Spam pipeline (pure + IO)
├── system/            # System ops (global cache version)
├── types/             # 共用 TypeScript 型別 (SSOT)
├── use-cases/         # Cross-domain orchestration (server-only)
├── utils/             # 純工具函式
└── validators/        # 純驗證函式
```

**依賴規則 (Phase 2 強制)**:

- `infrastructure/` → 無交叉依賴；各為獨立 SDK wrapper
- `modules/` → 可依賴 `infrastructure/`、`types/`、`validators/`、`utils/`，以及明確列為 cross-cutting 的 `lib/*`（例如 `auth/`, `embeddings/`, `features/`, `spam/`, `security/`, `seo/`, `rerank/`）
- `modules/` → **禁止**跨模組依賴（避免循環依賴）

**Shim 策略（歷史）**:

- Phase 1：短期同時支援新舊路徑（已結束）
- Phase 2：全域更新 imports、移除 shim（已完成；以本附錄結構為準）
