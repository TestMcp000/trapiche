# Step-by-Step Execution Plan — V15（CMS vNext：Nav/Blog Taxonomy/Events/Pages）

> 狀態: Active（本檔只寫「修復/新增的方案與步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-25  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> vNext PRD（planned / not shipped yet）: `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`  
> Repo 驗證（2026-01-25）：請以本次 PR 的 `npm test`, `npm run lint`, `npm run type-check`, `npm run docs:check-indexes`, `npm run lint:md-links`, `npm run build` 為準  
> 歷史 snapshots（已完成只留 archive）：`doc/archive/README.md`（最新：`doc/archive/2026-01-23-step-plan-v14-edge-functions-auth-hardening.md`）

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

- CMS vNext gaps（2026-01-25；規格：`doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`）
  - ~~(A) Hamburger menu 仍需用 JSON editor 編輯（不符合「心理師可操作」需求）~~（PR-32 已完成：`/admin/settings/navigation`）
  - ~~(B) Blog taxonomy 只有 `categories`（單選）+ `posts.category_id`，不支援多主題/Tags/Groups~~（PR-33/34/35 已完成：`/admin/(blog)/groups|topics|tags` + Posts editor multi-select）
  - ~~(C) Events domain 尚未落地（無 DB / 無 public `/events` / 無 admin CRUD）~~（PR-36 已完成：DB + public routes；PR-37 pending：admin CRUD）
    - ~~Evidence：`Get-ChildItem -LiteralPath 'app/[locale]'`（無 `events/`）、`rg -n \"CREATE TABLE events\" supabase`（0 hits）~~
    - ~~Violates：PRD §Requirements（FR-C1–C3）~~
  - (D) FAQ / Contact form 尚未落地（contact 現況為 mailto + link）
    - Evidence：`app/[locale]/contact/page.tsx`, `components/sections/ContactSection.tsx`
    - Violates：PRD §Requirements（FR-D1–D2）

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

---

### PR-32 — Admin Navigation：Hamburger menu 可視化 Editor（v1；先不引入新 taxonomy target types）✅ COMPLETED

> **Status**: Completed (2026-01-26)
> **Files added**:
>
> - `app/[locale]/admin/settings/navigation/page.tsx`
> - `app/[locale]/admin/settings/navigation/actions.ts`
> - `components/admin/settings/HamburgerNavEditorClient.tsx`
> - `components/admin/settings/hamburger-nav-editor/NavGroupList.tsx`
> - `components/admin/settings/hamburger-nav-editor/NavGroupCard.tsx`
> - `components/admin/settings/hamburger-nav-editor/NavItemRow.tsx`
> - `components/admin/settings/hamburger-nav-editor/NavTargetPicker.tsx`
> - `components/admin/settings/hamburger-nav-editor/NavValidationErrors.tsx`
> - `components/admin/settings/hamburger-nav-editor/NavHistoryPanel.tsx`
>   **Files updated**:
> - `components/admin/common/AdminSidebar.tsx`（新增「導覽選單」入口）
> - `messages/zh.json`（新增 `admin.navigation` namespace）
> - `doc/SPEC.md`（新增路由 + 標記缺口已完成）

**Evidence**

- `rg -n \"ContentEditorClient\" app/[locale]/admin/content/[section]/ContentEditorClient.tsx`
- `rg -n \"sectionKey === 'hamburger_nav'\" -S app/[locale]/admin/content/[section]/actions.ts`
- `rg -n \"DEFAULT_HAMBURGER_NAV\" lib/modules/content/cached.ts`

**Violates**

- `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（FR-A1–A4）

**Fix steps**

1. 新增專用 admin route（只影響 admin bundle）
   - Add: `app/[locale]/admin/settings/navigation/page.tsx`（server component；負責讀 initial data）
   - Add: `app/[locale]/admin/settings/navigation/actions.ts`（server actions；封裝 `save draft`/`publish`/`unpublish`）
2. 新增可視化 editor（HTML5 drag/drop；避免引入新 dnd 依賴）
   - Add: `components/admin/settings/HamburgerNavEditorClient.tsx`（`'use client'`）
   - Add: `components/admin/settings/hamburger-nav-editor/*`（UI 小元件：GroupList/ItemList/TargetPicker/ValidationErrors）
3. Target picker（v1）只支援既有 target allowlist（避免與後續 DB 變更耦合）
   - Use existing: `lib/types/hamburger-nav.ts`, `lib/site/nav-resolver.ts`（只用 `type` allowlist，不新增 type）
   - Option sources（server fetch + pass to client）：
     - Blog categories：`lib/modules/blog/cached.ts`（讀取 `categories`）
     - Gallery categories：`lib/modules/gallery/cached.ts`
     - Static pages：hardcode allowlist（`/about`, `/services`, `/contact`, `/blog`, `/gallery`）
4. 驗證/發布 UX
   - Save draft：呼叫現行 content save validator（`hamburger_nav`：schema/allowlist）
   - Publish：呼叫現行 deep validate（存在性檢查）並把錯誤顯示在 UI（含 JSON path）
5. Admin sidebar entry（若需要）
   - Update: `components/admin/common/AdminSidebar.tsx`（新增「網站設定 → 導覽選單」入口）

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`
- Docs：`npm run docs:generate-indexes`, `npm run docs:check-indexes`, `npm run lint:md-links`

**Post-merge**

- `doc/SPEC.md`：在「後台 CMS」補上新路由 `/admin/settings/navigation`（只描述已落地）
- 將本 PR steps 歸檔到 `doc/archive/<date>-step-plan-v15-cms-nav-editor.md`

---

### PR-33 — Blog Taxonomy v2（DB）：Groups/Topics/Tags schema + RLS + seed + types（不改 public routes）✅ COMPLETED

> **Status**: Completed (2026-01-27)
> **Files added**:
>
> - `supabase/02_add/21_blog_taxonomy_v2.sql`
> - `supabase/01_drop/21_blog_taxonomy_v2.sql`
> - `lib/types/blog-taxonomy.ts`
> - `lib/modules/blog/taxonomy-io.ts`（facade aggregator）
> - `lib/modules/blog/taxonomy-groups-io.ts`
> - `lib/modules/blog/taxonomy-topics-io.ts`
> - `lib/modules/blog/taxonomy-tags-io.ts`
> - `lib/modules/blog/taxonomy-post-relations-io.ts`
> - `lib/modules/blog/taxonomy-cached.ts`
>   **Files updated**:
> - `supabase/COMBINED_ADD.sql`（新增 blog taxonomy v2 tables/RLS/grants）
> - `supabase/COMBINED_DROP.sql`（新增 drop statements）
> - `supabase/03_seed/06_blog.sql`（新增 groups/topics/tags seed）
> - `supabase/COMBINED_SEED.sql`（同步 seed）

**Evidence**

- `rg -n \"CREATE TABLE categories|CREATE TABLE posts\" supabase/02_add/01_main.sql`
- `rg -n \"category_id\" -S lib/modules/blog lib/types/blog.ts`

**Violates**

- `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（FR-B1–B3）
- `ARCHITECTURE.md`（Server-first + IO 分層 + RLS 為最終安全邊界）

**Fix steps**

1. DB migrations（Supabase）
   - Add: `supabase/02_add/21_blog_taxonomy_v2.sql`
     - Create: `blog_groups`, `blog_topics`, `blog_tags`, `post_topics`, `post_tags`
     - Alter: `posts` 加 `group_id`（暫允許 NULL；migrate 完再設 NOT NULL）
     - Indexes：slug、FK、join table PK
   - Update: `supabase/COMBINED_ADD.sql`（同樣的 DDL/RLS/GRANT 必須進 combined，否則 `npm run db:add` 不會套用）
   - Update: `supabase/COMBINED_DROP.sql`（新增 tables/policies/indexes 的 drop；確保 `npm run db:reset` 可重建）
2. RLS / grants（遵守既有 posts/categories 的 policy style）
   - Public read：groups/topics/tags（僅 visible）；joins 只供 server 讀（或透過 view/joins 查詢）
   - Admin manage：isSiteAdmin（同 posts）
3. Seed（初始 IA 對應資料）
   - Update seed: `supabase/03_seed/06_blog.sql`（blog 相關 seed）
   - Update: `supabase/COMBINED_SEED.sql`（同樣 seed 需同步進 combined；`npm run db:seed` 是「執行」，不是「生成」）
     - Insert groups：身心健康衛教 / 書籍推薦
     - Insert topics：情緒照顧/焦慮壓力/睡眠議題/關係界線/自我覺察 + 書籍推薦子項
4. Types/validators（單一真相來源）
   - Add: `lib/types/blog-taxonomy.ts`（Group/Topic/Tag types）
   - Add: `lib/validators/slug.ts`（若已存在則複用；統一 slug 規則）
5. IO（server-only；可測試）
   - Add: `lib/modules/blog/taxonomy-io.ts`（DB reads/writes）
   - Add: `lib/modules/blog/taxonomy-cached.ts`（public reads；tag=`blog`）

**DoD**

- `npm run db:add` 能套用 migrations（需先備好 `SUPABASE_DB_URL`；見 `supabase/README.sql`）
- `npm test`, `npm run lint`, `npm run type-check`

**Post-merge**

- `doc/ROADMAP.md`：新增 Blog taxonomy v2 tracking item（DB landed, public/admin pending）
- 歸檔 steps：`doc/archive/<date>-step-plan-v15-blog-taxonomy-db.md`

---

### PR-34 — Blog Taxonomy v2（Public）：Group/Tag pages + post multi-topics/tags 讀取 + SEO（保持 `/blog/posts/[slug]` canonical）✅ COMPLETED

> **Status**: Completed (2026-01-27)
> **Files added**:
>
> - `app/[locale]/blog/groups/[slug]/page.tsx`
> - `app/[locale]/blog/tags/[slug]/page.tsx`
> - `lib/modules/blog/posts-taxonomy-io.ts`（taxonomy query functions split per ARCHITECTURE.md §3.4）
> - `tests/seo-blog-taxonomy-urls.test.ts`
>   **Files updated**:
> - `lib/types/hamburger-nav.ts`（新增 blog_group/blog_topic/blog_tag target types）
> - `lib/site/nav-resolver.ts`（新增 blog taxonomy resolvers）
> - `lib/seo/url-builders.ts`（新增 buildBlogGroupUrl/buildBlogTopicUrl/buildBlogTagUrl）
> - `lib/modules/blog/io.ts`（re-export taxonomy queries from posts-taxonomy-io）
> - `lib/modules/blog/cached.ts`（新增 taxonomy cached queries）
> - `lib/modules/content/hamburger-nav-publish-io.ts`（support new target types）
> - `app/sitemap.ts`（加入 groups/topics/tags pages）

**Evidence**

- `rg -n \"blog/categories/\\[slug\\]\" -S app/[locale]/blog`
- `rg -n \"buildBlog\" -S lib/seo lib/site/nav-resolver.ts`

**Violates**

- `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（FR-B4–B5）
- `ARCHITECTURE.md` §3.11（canonical builders）

**Fix steps**

1. Public routes
   - Add: `app/[locale]/blog/groups/[slug]/page.tsx`
   - Add: `app/[locale]/blog/tags/[slug]/page.tsx`
   - Update: `app/[locale]/blog/categories/[slug]/page.tsx`（category → topic）
2. Cached reads / IO
   - Update: `lib/modules/blog/cached.ts`（新增 groups/topics/tags 的 cachedQuery；tag=`blog`）
   - Update: `lib/modules/blog/posts-io.ts`（支援 group/topic/tag filters）
3. SEO / canonical
   - Update: `lib/seo/url-builders.ts`（新增 `buildBlogGroupUrl`, `buildBlogTagUrl`）
   - Update: `lib/site/nav-resolver.ts`（新增/更新 target resolver；支援 `blog_group`/`blog_topic`/`blog_tag`）
   - 保持 legacy redirect 規則一致（若新增新 legacy paths，需補 `tests/seo-canonical-redirects.test.ts`）
4. Sitemap
   - Update: `app/sitemap.ts`（加入 groups/topics/tags pages；避免 query 組合）
5. Revalidation
   - Admin publish / mutations：補 `revalidateTag('blog')` + 必要的 `revalidatePath()`
6. Tests（避免 drift）
   - Add: `tests/seo-blog-taxonomy-urls.test.ts`（url builders + resolver）

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`, `npm run build`

---

### PR-35 — Blog Taxonomy v2（Admin）：Groups/Topics/Tags 管理 + Posts editor 多選（topics/tags）✅ COMPLETED

> **Status**: Completed (2026-01-28)
> **Files added**:
>
> - `app/[locale]/admin/(blog)/groups/page.tsx`
> - `app/[locale]/admin/(blog)/groups/new/page.tsx`
> - `app/[locale]/admin/(blog)/groups/[id]/edit/page.tsx`
> - `app/[locale]/admin/(blog)/groups/actions.ts`
> - `app/[locale]/admin/(blog)/topics/page.tsx`
> - `app/[locale]/admin/(blog)/topics/new/page.tsx`
> - `app/[locale]/admin/(blog)/topics/[id]/edit/page.tsx`
> - `app/[locale]/admin/(blog)/topics/actions.ts`
> - `app/[locale]/admin/(blog)/tags/page.tsx`
> - `app/[locale]/admin/(blog)/tags/[id]/edit/page.tsx`
> - `app/[locale]/admin/(blog)/tags/actions.ts`
> - `lib/modules/blog/taxonomy-admin-io.ts`（facade aggregator）
> - `lib/modules/blog/taxonomy-groups-admin-io.ts`
> - `lib/modules/blog/taxonomy-topics-admin-io.ts`
> - `lib/modules/blog/taxonomy-tags-admin-io.ts`
> - `lib/modules/blog/taxonomy-post-relations-admin-io.ts`
> - `lib/modules/blog/taxonomy-groups-io.ts`（public read）
> - `lib/modules/blog/taxonomy-topics-io.ts`（public read）
> - `lib/modules/blog/taxonomy-tags-io.ts`（public read）
>   **Files updated**:
> - `app/[locale]/admin/(blog)/layout.tsx`（新增 Groups/Topics/Tags tabs）
> - `app/[locale]/admin/(blog)/posts/edit/[id]/page.tsx`（load taxonomy data）
> - `app/[locale]/admin/(blog)/posts/new/page.tsx`（load taxonomy data）
> - `app/[locale]/admin/(blog)/posts/components/PostForm.tsx`（新增 groups dropdown + topics/tags multiselect）
> - `app/[locale]/admin/(blog)/posts/actions.ts`（updatePostTaxonomy integration）
> - `messages/zh.json`（新增 admin.taxonomy namespace + postForm.taxonomy keys）

**Evidence**

- `Get-ChildItem -LiteralPath 'app/[locale]/admin/(blog)'`
- `rg -n \"category_id\" -S app/[locale]/admin\\(blog\\) lib/modules/blog/admin-io.ts`

**Violates**

- `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（FR-B1–B3）

**Fix steps**

1. Admin routes
   - Add: `app/[locale]/admin/(blog)/groups/*`（CRUD + reorder + visibility）
   - Add: `app/[locale]/admin/(blog)/topics/*`（CRUD + reorder + group assignment）
   - Add: `app/[locale]/admin/(blog)/tags/*`（list/merge/rename；或先只 read-only）
2. Posts editor
   - Update: `app/[locale]/admin/(blog)/posts/*`（新增 group selector + topics multiselect + tags input）
   - Update: `lib/modules/blog/admin-io.ts`（寫入 join tables；保持 transaction-safe）
3. Import/Export（若需要）
   - Update: `doc/specs/completed/import-export-spec.md`（擴充 formats；或先 Out of scope）
4. Revalidation / cache version
   - Mutations 後：`revalidateTag('blog')`

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`

---

### PR-36 — Events（DB + Public）：events/event_types schema + `/events` list/detail + Event JSON-LD ✅ COMPLETED

> **Status**: Completed (2026-01-27)
> **Files added**:
>
> - `supabase/02_add/22_events.sql`
> - `supabase/01_drop/22_events.sql`
> - `lib/types/events.ts`
> - `lib/modules/events/io.ts`
> - `lib/modules/events/cached.ts`
> - `app/[locale]/events/page.tsx`
> - `app/[locale]/events/[slug]/page.tsx`
> - `tests/seo-events-jsonld.test.ts`
>   **Files updated**:
> - `supabase/COMBINED_ADD.sql`（新增 event_types + events tables/RLS/grants）
> - `supabase/COMBINED_DROP.sql`（新增 drop statements）
> - `lib/seo/url-builders.ts`（新增 buildEventsListUrl/buildEventDetailUrl）
> - `lib/seo/jsonld.ts`（新增 generateEventJsonLd）
> - `lib/types/hamburger-nav.ts`（新增 events_index/event_detail target types）
> - `lib/site/nav-resolver.ts`（新增 events_index/event_detail resolvers）
> - `app/sitemap.ts`（加入 events pages）
> - `messages/zh.json`（新增 events namespace）

**Evidence**

- `Get-ChildItem -LiteralPath 'app/[locale]'`（無 `events/`）
- `rg -n \"CREATE TABLE events\" supabase`（0 hits）

**Violates**

- `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（FR-C1–C3）

**Fix steps**

1. DB migrations
   - Add: `supabase/02_add/22_events.sql`（`event_types`, `events` + RLS + grants）
   - Update: `supabase/COMBINED_ADD.sql`
   - Update: `supabase/COMBINED_DROP.sql`
2. Types/validators
   - Add: `lib/types/events.ts`
   - Update: `lib/validators/external-url.ts` 使用點（`online_url`, `registration_url`）
3. IO + cached facade
   - Add: `lib/modules/events/io.ts`, `lib/modules/events/cached.ts`, `lib/modules/events/admin-io.ts`
4. Public routes（server-first）
   - Add: `app/[locale]/events/page.tsx`
   - Add: `app/[locale]/events/[slug]/page.tsx`
   - JSON-LD：使用 `lib/seo/jsonld.ts`（新增 event helper 若需要）
5. Navigation target resolver
   - Update: `lib/site/nav-resolver.ts`（新增 `events_index`/`event_detail`）
6. Tests
   - Add: `tests/seo-events-jsonld.test.ts`

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`, `npm run build`

---

### PR-37 — Events（Admin）：CRUD UI + Hamburger menu target picker 支援 events filters

**Fix steps**

- Add: `app/[locale]/admin/events/*`（list/new/edit）
- Update: `components/admin/settings/HamburgerNavEditorClient.tsx`（target picker 增加 events options）
- Revalidate：`revalidateTag('events')`

---

### PR-38 — Pages（FAQ + Contact form）：FAQ CRUD + public `/faq` + Contact submissions（可選） ✅ DONE

**Implemented**

1. FAQ
   - DB: `supabase/02_add/23_faqs.sql`（`faqs` + RLS）✅
   - DB: `supabase/01_drop/23_faqs.sql`（drop）✅
   - Update: `supabase/COMBINED_ADD.sql` ✅
   - Update: `supabase/COMBINED_DROP.sql` ✅
   - Types: `lib/types/faq.ts`（FAQ, FAQPublic, FAQInput, FAQForSitemap）✅
   - IO: `lib/modules/faq/io.ts`（public reads）✅
   - IO: `lib/modules/faq/admin-io.ts`（admin CRUD + reorder）✅
   - IO: `lib/modules/faq/cached.ts`（SSR cached queries）✅
   - Public: `app/[locale]/faq/page.tsx`（FAQPage JSON-LD）✅
   - Admin: `app/[locale]/admin/faqs/page.tsx` ✅
   - Admin: `app/[locale]/admin/faqs/actions.ts` ✅
   - Admin: `app/[locale]/admin/faqs/components/FAQsListClient.tsx`（CRUD + drag-drop reorder）✅
2. Contact form submissions
   - DB: `supabase/02_add/24_contact_messages.sql`（`contact_messages` + honeypot + RLS）✅
   - DB: `supabase/01_drop/24_contact_messages.sql`（drop）✅
   - Types: `lib/types/contact.ts`（ContactMessage, ContactFormInput, ContactFormResult）✅
   - IO: `lib/modules/contact/io.ts`（public submit with honeypot + IP hash）✅
   - IO: `lib/modules/contact/admin-io.ts`（admin list + read/archive/delete）✅
   - Public: `components/sections/ContactFormClient.tsx`（form with honeypot）✅
   - Public: `app/[locale]/contact/actions.ts`（submit action）✅
   - Admin: `app/[locale]/admin/contact-messages/page.tsx` ✅
   - Admin: `app/[locale]/admin/contact-messages/actions.ts` ✅
   - Admin: `app/[locale]/admin/contact-messages/components/ContactMessagesListClient.tsx` ✅
3. Supporting changes
   - Update: `lib/seo/url-builders.ts`（buildFAQUrl, buildContactUrl）✅
   - Update: `app/sitemap.ts`（include /faq）✅
   - Update: `lib/types/hamburger-nav.ts`（faq_index target type）✅
   - Update: `lib/site/nav-resolver.ts`（faq_index handler）✅
   - Update: `lib/modules/content/hamburger-nav-publish-io.ts`（faq_index validation）✅
   - Update: `components/admin/common/AdminSidebar.tsx`（sidebar entries）✅
   - Update: `messages/zh.json`（translations for admin.faqs, admin.contactMessages, faq, contactForm）✅

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`, `npm run build`

---

## 3) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- Docs：`npm run docs:generate-indexes`, `npm run docs:check-indexes`, `npm run lint:md-links`
- `npm run build`（routes/SEO/redirect 相關 PR 必跑；先確認 `.env.local` 已設 `NEXT_PUBLIC_SITE_URL` + Supabase public env）
