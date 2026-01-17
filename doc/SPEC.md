# Feature Specification

> Implemented features and their technical details
> Last Updated: 2026-01-14
> Status: Active

This document describes **implemented** behavior and its technical details.

- Architecture and global constraints: see [ARCHITECTURE.md](../ARCHITECTURE.md)
- Single-feature contracts / flows (stable specs): see [`specs/README.md`](specs/README.md)
- Drift tracking / remediation playbooks: see [uiux_refactor.md](../uiux_refactor.md) (stable `@see` index + active drift tracker)
- Historical implementation logs / code maps: see [archive/README.md](archive/README.md)
- Pending/planned work: see [ROADMAP.md](ROADMAP.md)
- Intentionally incomplete / gated items (to avoid confusing “implemented” with “fully complete”): see [Known Gaps](#known-gaps-roadmap-links)

---

## Table of Contents

- [Blog System](#blog-system)
- [Gallery](#gallery)
- [Comments](#comments)
- [Reactions](#reactions)
- [Users (Admin)](#users-admin)
- [Theme System](#theme-system)
- [Admin CMS](#admin-cms)
- [Import/Export (Admin-only)](#importexport-admin-only)
- [AI Analysis (Admin-only)](#ai-analysis-admin-only)
- [Embeddings and Semantic Search (Admin-only)](#embeddings-and-semantic-search-admin-only)
- [Preprocessing (Admin-only)](#preprocessing-admin-only)
- [i18n](#i18n)
- [SEO](#seo)
- [Known Gaps (Roadmap Links)](#known-gaps-roadmap-links)
- [Module Inventory (Single Source)](#module-inventory-single-source)

---

## Blog System

### Features

- Markdown editor (GFM, code highlighting, math formulas)
- Category management
- Visibility control (draft/private/public)
- Reading time estimation
- Auto-generated SEO metadata

### Routes

| Route                              | Description   |
| ---------------------------------- | ------------- |
| `/[locale]/blog`                   | Blog list (supports `?category=<slug>&search=<q>&sort=<...>`) |
| `/[locale]/blog/[category]/[slug]` | Post detail (canonical URL includes category segment) |

### Data Model

- `categories` - Post categories
- `posts` - Post content

### Implementation Notes

- Admin posts create/update/delete 已走 server actions（`app/[locale]/admin/(blog)/posts/actions.ts`）；client form 僅負責互動，IO 由 `lib/modules/blog/admin-io.ts`。
- Implementation file map: see [Module Inventory](#module-inventory-single-source).

---

## Gallery

### Features

- Pinterest-style masonry layout (CSS Columns)
- Infinite scroll
- Image cropping and upload
- Category filtering
- Sort options

### Routes

| Route                                 | Description   |
| ------------------------------------- | ------------- |
| `/[locale]/gallery`                   | Gallery list  |
| `/[locale]/gallery/[category]`        | Category list |
| `/[locale]/gallery/[category]/[slug]` | Item detail   |

### API Endpoints

| Route                | Method | Description                                                                                     |
| -------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| `/api/gallery/items` | GET    | Paginated gallery items for infinite scroll (includes `likedByMe` via `anon_id`; feature-gated) |

### Pinned/Featured Items

- Pinned items display in "Featured" section at top
- Main list auto-filters pinned items to avoid duplication
- Featured section hidden when sort is set to "featured"

### Data Model

- `gallery_categories` - Gallery categories
- `gallery_items` - Gallery items

### Implementation Notes

- Implementation file map: see [Module Inventory](#module-inventory-single-source).

---

## Comments

### Features

- Supports Blog and Gallery comments
- Threaded replies
- Spam protection (honeypot + Akismet + reCAPTCHA)
- **Safety Risk Engine** (three-layer defense: Layer 1 rules + Layer 2 RAG + Layer 3 LLM)
- Rate limiting
- Admin moderation tools (approve/spam/delete, blacklist, Akismet feedback)
- Admin Safety Queue (HELD comments review + corpus management + settings)

### API Endpoints

| Route                           | Method | Description                                 |
| ------------------------------- | ------ | ------------------------------------------- |
| `/api/comments`                 | GET    | Public: get comment list                    |
| `/api/comments`                 | POST   | Public: create comment                      |
| `/api/comments/public-settings` | GET    | Public: get public comment settings         |
| `/api/comments/admin`           | GET    | Admin: list comments (filters + pagination) |
| `/api/comments/admin`           | PATCH  | Admin: approve/spam/bulk actions            |
| `/api/comments/admin`           | DELETE | Admin: delete comment                       |
| `/api/comments/settings`        | GET    | Admin: get settings + blacklist             |
| `/api/comments/settings`        | PATCH  | Admin: update settings                      |
| `/api/comments/settings`        | POST   | Admin: add blacklist item                   |
| `/api/comments/settings`        | DELETE | Admin: remove blacklist item                |
| `/api/comments/feedback`        | POST   | Admin: report spam/ham feedback to Akismet  |

### Data Protection

- Canonical constraints (no PII in public responses): `../ARCHITECTURE.md` §3.12 (Comments API Sensitive Data Protection)
- Security policies (RLS/server-only tables): `SECURITY.md`

### Safety Risk Engine

- Spec: `specs/proposed/safety-risk-engine-spec.md`
- Decision semantics (V1):
  - Safety decisions: `APPROVED` / `HELD` (Safety V1 does not emit `REJECTED`)
  - `High_Risk` / `Uncertain` → `HELD`
  - `Safe` + `confidence >= threshold` → `APPROVED` (else `HELD`)
- Fail Closed: Any timeout/error → HELD (safe default)
- PII de-identification before sending to external AI
- Admin routes:
  - `/admin/comments/safety` — Safety queue (HELD comments)
  - `/admin/comments/safety/[commentId]` — Assessment detail + review actions
  - `/admin/comments/safety/corpus` — Safety corpus management (slang/cases)
  - `/admin/comments/safety/settings` — Safety engine settings

### Implementation Notes

- Public API adds `isMine` (server-computed ownership flag) without exposing `userId`.
- Safety Risk Engine modules: `lib/modules/safety-risk-engine/*`
- Comment submit use-case (Spam → Safety → Persist): `lib/use-cases/comments/create-comment.ts` (called by `app/api/comments/route.ts`)
- Implementation file map: see [Module Inventory](#module-inventory-single-source).

---

## Reactions

### Features

- Anonymous likes (using `anon_id`)
- Supports Gallery items and Comments
- Rate limiting

### API Endpoints

| Route            | Method | Description        |
| ---------------- | ------ | ------------------ |
| `/api/reactions` | POST   | Toggle like status |

### Implementation Notes

- Implementation file map: see [Module Inventory](#module-inventory-single-source).

---

## Users (Admin)

### Features

- Users list (SSOT: `user_directory`, synced from `auth.users`)
- User detail:
  - Directory info (id/email/created/updated)
  - Admin notes (Owner-only write): Markdown (`description_zh_md`) + tags (`tags_zh`)
  - Schedule (Owner-only write): appointment calendar (DB stores UTC; UI edits in local time)
  - Comment history (read-only)

### Routes

> Note: Admin routes are localized under `/[locale]/admin/*` (single locale: `zh`, e.g. `/zh/admin/users`). Tables below omit the `/[locale]` prefix for readability.

| Route               | Description                                         |
| ------------------- | --------------------------------------------------- |
| `/admin/users`      | Users list                                          |
| `/admin/users/[id]` | User detail (notes/tags/schedule + comments)        |

### Data Model

- `user_directory` - Users list/email SSOT (admin-only read)
- `user_admin_profiles` - Owner-only admin notes + tags (admin read; owner write)
- `user_appointments` - Owner-only calendar events (admin read; owner write)

### Security Notes

- Writes are Owner-only (server actions + IO layer gate; RLS is the final boundary)
- `description_zh_md` is treated as **owner-authored admin-controlled markdown** (do not reuse this rendering pipeline for user-submitted content)

### Known Limitations (V1)

- Tag filtering works server-side via `/admin/users?tag=...`, but there is no tag selection UI yet (manual URL only).
- Users list search/pagination are not implemented yet.
- Admin notes are stored as Markdown; view mode defaults to raw text (preview is optional; for LLM/ETL normalize Markdown to plain text — do not analyze HTML)

### Implementation Notes

- Server-first: server components fetch via `lib/modules/user/*-io.ts`; mutations via `app/[locale]/admin/users/actions.ts`
- Implementation file map: see [Module Inventory](#module-inventory-single-source).

---

## Theme System

### Current Status (v2)

- 4 layout presets (ThemeKey): Tech Pro, Japanese Airy, Glassmorphism, Scrollytelling
- Per-page theme assignment (home/blog/gallery) via `site_config.page_themes`
- Per-layout token overrides via `site_config.theme_overrides` (allowlist in `lib/types/theme.ts`)
- SSR inline CSS variable injection (FOUC-free)
- Admin preview fixed (2025-12-24): iframe injects CSS vars to the same targets as runtime SSR
- RBAC: Owner can edit, Editor read-only

### Admin Routes

> Note: Admin routes are localized under `/[locale]/admin/*` (e.g. `/zh/admin/theme`). Tables below omit the `/[locale]` prefix for readability.


| Route                  | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `/admin/theme`         | Global theme selection                              |
| `/admin/theme/pages`   | Per-page theme settings                             |
| `/admin/theme/fonts`   | Font selection                                      |
| `/admin/theme/layouts` | Per-layout token customization (Theme v2)           |
| `/admin/theme/preview` | Admin-only preview (noindex, accepts ?path=&theme=) |

### Technical Details

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

### Data Model

- `site_config` (singleton, id=1)
  - `global_theme`: ThemeKey
  - `page_themes`: JSONB `{ home?, blog?, gallery? }`
  - `theme_overrides`: JSONB `{ [ThemeKey]: { [CustomizableCssVar]: string | null } }`
  - `updated_at`, `updated_by`

### Implementation Notes

- Implementation file map: see [Module Inventory](#module-inventory-single-source).

---

## Admin CMS

### Features

- Google OAuth login (email whitelist)
- Live preview editor
- Image upload to Cloudinary
- Markdown toolbar
- Report system (auto-detection: Lighthouse/Schema/Links; JSON summary)
- Role-based access (Owner/Editor)

### Routes

> Note: Admin routes are localized under `/[locale]/admin/*` (single locale: `zh`, e.g. `/zh/admin/posts`). Tables below omit the `/[locale]` prefix for readability.

**Dashboard**

| Route    | Description |
| -------- | ----------- |
| `/admin` | Dashboard   |

**Website / CMS / Settings**

| Route                         | Description                                           |
| ----------------------------- | ----------------------------------------------------- |
| `/admin/features`             | Feature toggles                                       |
| `/admin/theme`                | Global theme                                          |
| `/admin/theme/pages`          | Per-page theme settings                               |
| `/admin/theme/fonts`          | Font selection                                        |
| `/admin/theme/layouts`        | Theme layout token editor                             |
| `/admin/content`              | Site content                                          |
| `/admin/content/[section]`    | Section content editor                                |
| `/admin/landing`              | Landing page                                          |
| `/admin/landing/[sectionKey]` | Landing section editor                                |
| `/admin/portfolio`            | Portfolio management                                  |
| `/admin/settings`             | Company settings (theme is managed in `/admin/theme`) |

**Blog**

| Route                    | Description         |
| ------------------------ | ------------------- |
| `/admin/posts`           | Post list           |
| `/admin/posts/new`       | Create post         |
| `/admin/posts/[id]/edit` | Edit post           |
| `/admin/categories`      | Category management |

**Engagement**

| Route                      | Description        |
| -------------------------- | ------------------ |
| `/admin/comments`          | Comment moderation |
| `/admin/comments/settings` | Comment settings   |

**Gallery**

| Route                       | Description               |
| --------------------------- | ------------------------- |
| `/admin/gallery`            | Gallery items             |
| `/admin/gallery/categories` | Gallery categories        |
| `/admin/gallery/featured`   | Featured items management |

**Users**

| Route               | Description |
| ------------------- | ----------- |
| `/admin/users`      | Users list  |
| `/admin/users/[id]` | User detail |

**System**

| Route                  | Description       |
| ---------------------- | ----------------- |
| `/admin/import-export` | Import / Export   |
| `/admin/reports`       | Report generation |
| `/admin/history`       | Audit history     |

### Role System

| Role   | Permissions                          |
| ------ | ------------------------------------ |
| Owner  | Full access, theme editing, settings |
| Editor | Content editing, read-only settings  |

### Authentication Flow

- Canonical decision order: `SECURITY.md` → Admin Role 判斷（JWT role → `site_admins` → env fallback）

### Content Sources (Public Navigation / Landing)

- Header nav labels: `site_content(section_key='nav')` (fallback: `messages/*`)
- Footer copy: `site_content(section_key='footer')` (fallback: `messages/*`)
- Company short name: `site_content(section_key='company')` (fallback: `messages/*`)
- Landing page ordering/visibility: `landing_sections` table (`lib/modules/landing/*`; rendered by `app/[locale]/page.tsx`)
  - Preset sections (`hero/about/services/platforms/product_design/portfolio/contact`): main content comes from external sources (`site_content`, `services`, `portfolio_items`, `gallery`)
  - Custom sections (`custom_1...custom_10`): content stored in `landing_sections.content_en/zh`

---

## Import/Export (Admin-only)

> Route: `/admin/import-export` (localized under `/[locale]/admin/*`)

- PRD: [IMPORT_EXPORT.md](specs/completed/IMPORT_EXPORT.md)

### Technical Spec (Single Source)

- Spec (formats/flows/invariants): `specs/completed/import-export-spec.md`
- Implementation file map: see [Module Inventory](#module-inventory-single-source)

---

## AI Analysis (Admin-only)

> Route: `/admin/ai-analysis` (localized under `/[locale]/admin/*`)

- PRD: [AI_ANALYSIS_v2.md](specs/completed/AI_ANALYSIS_v2.md)

### Technical Spec (Single Source)

- Spec (contracts/flows): `specs/completed/ai-analysis-spec.md`
- Ops enablement / cron verification: `runbook/ai-analysis.md`
- Implementation file map: see [Module Inventory](#module-inventory-single-source)

---

## Embeddings and Semantic Search (Admin-only)

> Routes:
>
> - Search UI: `/admin/control-center`
> - Embeddings management: `/admin/embeddings`

- PRD: [SUPABASE_AI.md](specs/completed/SUPABASE_AI.md)

### Technical Spec (Single Source)

- Embeddings/search/RAG contracts: `specs/completed/embeddings-semantic-search-spec.md`
- Queue dispatcher/worker contracts: `specs/completed/embedding-queue-dispatcher-worker-spec.md`
- Ops enablement / cron verification: `runbook/embeddings-preprocessing.md`
- Implementation file map: see [Module Inventory](#module-inventory-single-source)

---

## Preprocessing (Admin-only)

> Route: `/admin/preprocessing`

- PRD: [DATA_PREPROCESSING.md](specs/completed/DATA_PREPROCESSING.md)

### Technical Spec (Single Source)

- Pipeline contracts: `specs/completed/data-preprocessing-pipeline-spec.md`
- Queue dispatcher/worker contracts: `specs/completed/embedding-queue-dispatcher-worker-spec.md`
- Ops enablement / cron verification: `runbook/embeddings-preprocessing.md`
- Implementation file map: see [Module Inventory](#module-inventory-single-source)

---

## i18n

### Implementation

- Using `next-intl` package
- Supported locale: Traditional Chinese (`zh`)
- Translation file: `messages/zh.json`

### Route Structure

- All routes use `/[locale]/*` pattern
- Locale prefix always present (e.g. `/zh/...`)
- Default language: `zh`

### Single Source

- `lib/i18n/locales.ts` is the only locale source (no hardcoding)

---

## SEO

### Features

- Dynamic `sitemap.xml` (`app/sitemap.ts`)
- Dynamic `robots.txt` (`app/robots.ts`) — disallows `/admin/*` for SEO isolation
- Open Graph and Twitter Card
- JSON-LD structured data
- Auto-generated hreflang tags

### URL Single Source

- Canonical constraints: `../ARCHITECTURE.md` §3.11 (SEO / URL 單一來源)
- Drift guardrails / grep checklist: `../uiux_refactor.md` §2

---

## Known Gaps (Roadmap Links)

> 目的：避免把「未完成/刻意 gated」敘述散落在各 feature 章節，造成讀者誤以為本文件描述的是「全功能已完成」狀態。

### Data Intelligence (Admin-only)

- Data Intelligence Platform：
  - Module B（AI Analysis）：reports/schedules + share links 已落地；custom templates backend 已落地（DB/worker），Admin UI（Owner CRUD + selection）待補（see `doc/specs/completed/ai-analysis-spec.md`）
  - Module C / Module C Extension：Phase 7+（Hybrid Search / 可配置 pipeline 等）以 `doc/ROADMAP.md` 為準
  - 入口（localized）：`/[locale]/admin/(data)/import-export`, `/[locale]/admin/(data)/ai-analysis`, `/[locale]/admin/(data)/control-center`, `/[locale]/admin/(data)/embeddings`, `/[locale]/admin/(data)/preprocessing`（AI Analysis 需啟用 cron 或使用 owner-only manual processing）

### Analytics

- Page view tracking（ingestion + privacy-first aggregation）已落地：`specs/completed/page-views-analytics-spec.md`
- Dashboard UI 尚未實作（目前僅做到寫入 + 驗證）

---

## Module Inventory (Single Source)

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

### Data Intelligence Modules (Admin-only)

| Module        | Facade                              | Types                              | Spec / Code Map                                        |
| ------------- | --------------------------- | ---------------------------- | ------------------------------------------------------ |
| Import/Export | `lib/modules/import-export/*-io.ts` | `lib/types/import-export.ts`       | `specs/completed/import-export-spec.md`                |
| AI Analysis   | `lib/modules/ai-analysis/io.ts`     | `lib/types/ai-analysis.ts`         | `doc/archive/2025-12-30-ai-analysis-implementation.md` |
| Embeddings    | `lib/modules/embedding/io.ts`       | `lib/types/embedding.ts`           | `specs/completed/embeddings-semantic-search-spec.md`   |
| Preprocessing | `lib/modules/preprocessing/io.ts`   | `lib/modules/preprocessing/types.ts` | `specs/completed/data-preprocessing-pipeline-spec.md`  |
| Rerank        | `lib/rerank/io.ts`          | `lib/rerank/types.ts`        | —                                                      |

### Cross-cutting

- SEO: `lib/seo/hreflang.ts`, `lib/seo/jsonld.ts`, `lib/site/site-url.ts`
- Analytics: `lib/analytics/pageviews-io.ts`, `lib/validators/page-views.ts`, `lib/types/page-views.ts`
- i18n: `lib/i18n/locales.ts`, `messages/*.json`
- Spam: `lib/spam/io.ts`, `lib/spam/engine.ts`（pure）
- Auth (RBAC helpers): `lib/auth/index.ts`（server-only）
- Embeddings facade (non-module import surface): `lib/embeddings/index.ts`（server-only）
- Cross-domain use cases: `lib/use-cases/**`

---

## Related Documents

- [ARCHITECTURE.md](../ARCHITECTURE.md) - Architecture constraints
- [SECURITY.md](SECURITY.md) - Security policies
- [ROADMAP.md](ROADMAP.md) - Pending/planned items
- [uiux_refactor.md](../uiux_refactor.md) - Drift tracking / remediation steps
