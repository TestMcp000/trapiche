# Step-by-Step Execution Plan — V15（CMS vNext：Nav/Blog Taxonomy/Events/Pages）

> 狀態: Active（本檔只寫「修復/新增的方案與步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-27  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> vNext PRD（decisions locked 2026-01-27）: `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`  
> Repo 驗證（2026-01-27）：請以本次 PR 的 `npm test`, `npm run lint`, `npm run type-check`, `npm run docs:check-indexes`, `npm run lint:md-links`, `npm run build` 為準  
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

- CMS vNext follow-ups（2026-01-27；規格：`doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`）
  - (A) Hamburger nav contract drift（typed targets 已擴充，但 draft validator / editor / deep validate 未對齊）
    - Evidence（types vs validator drift）：
      - `lib/types/hamburger-nav.ts`（已包含 `blog_group/blog_topic/blog_tag/events_index/event_detail/faq_index`）
      - `lib/validators/hamburger-nav.ts`（`ALLOWED_TARGET_TYPES` 尚未包含上述 types）
    - Evidence（admin editor drift）：
      - `app/[locale]/admin/settings/navigation/page.tsx`（仍以 legacy `categories` 作為 Blog target options；static pages 仍含 `/platforms` + `聯絡表單`）
      - `components/admin/settings/hamburger-nav-editor/NavTargetPicker.tsx`（events target 使用錯誤欄位 `eventTypeSlug`；且未支援 blog_group/blog_topic/blog_tag/faq_index）
    - Evidence（deep validate drift）：`lib/modules/content/hamburger-nav-publish-io.ts`（尚未驗證 blog_group/blog_topic/blog_tag/event_detail 的 DB existence；註解仍寫「will be added」）
    - Fix: PR-42
  - (B) Events：需要「type + tags」兩者都要（目前只有 `event_types`）✅ **RESOLVED by PR-39**
    - Evidence：`supabase/02_add/22_events.sql`, `lib/types/events.ts`, `app/[locale]/events/page.tsx`（無 `tag` filter）
    - Fix: PR-39 ✅ COMPLETED
  - (C) 合作邀請：需同時存在「events type」+「獨立內容頁」
    - Evidence（缺獨立頁）：`Get-ChildItem -LiteralPath 'app/[locale]'`（目前無 `collaboration/`）
    - Evidence（nav 仍指向舊頁）：`lib/modules/content/cached.ts`（default nav：合作邀請 → `/contact`；講座類型 → `/platforms`）
    - Fix: PR-40
  - (D) Contact：決策改為 mailto only（需移除 contact_messages/inbox/form）✅ **RESOLVED by PR-41**
    - Evidence：`supabase/02_add/24_contact_messages.sql`, `components/sections/ContactFormClient.tsx`, `app/[locale]/admin/contact-messages/page.tsx`
    - Fix: PR-41 ✅ COMPLETED
  - (E) Legacy `/platforms`：目前仍被用作「講座／活動」placeholder（應收斂到 `/events` 或改為 redirect）
    - Evidence：`app/[locale]/platforms/page.tsx`, `lib/modules/content/cached.ts`（default nav items 指向 `/platforms`）
    - Fix: PR-43
  - (F) 文件漂移：`doc/SPEC.md`（SSoT）尚未同步 blog taxonomy v2 / events / CMS vNext 現況與後續變更（需在上述 PR 完成後同步）
    - Evidence：`doc/SPEC.md`（Blog 仍寫 `categories/posts`；Known gaps 仍寫「Events 尚未落地」）
    - Fix: PR-42 / PR-43（各 PR merge 後更新對應章節）

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

### PR-37 — Events（Admin）：CRUD UI + Hamburger menu target picker 支援 events filters ✅ COMPLETED

> **Status**: Completed (2026-01-27)

**Implemented**

- Admin routes + actions
  - `app/[locale]/admin/events/page.tsx`（list）
  - `app/[locale]/admin/events/new/page.tsx`（create）
  - `app/[locale]/admin/events/[id]/edit/page.tsx`（edit）
  - `app/[locale]/admin/events/actions.ts`（server actions + revalidate paths）
  - `app/[locale]/admin/events/components/EventFormClient.tsx`
  - `app/[locale]/admin/events/components/EventsListClient.tsx`
- Navigation editor options
  - `app/[locale]/admin/settings/navigation/page.tsx`（載入 `eventTypes` options）
  - `components/admin/settings/hamburger-nav-editor/NavTargetPicker.tsx`（支援選擇 events index target；**欄位命名 drift 需在 PR-42 修復**）

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

### PR-39 — Events v2：Add Tags（type + tags；public filter + admin editor）✅ COMPLETED

> **Status**: Completed (2026-01-27)
> **Files added**:
>
> - `supabase/02_add/25_events_tags.sql`（event_tags + event_event_tags + RLS）
> - `supabase/01_drop/25_events_tags.sql`（idempotent drop）
> - `lib/modules/events/event-types-io.ts`（public event types reads）
> - `lib/modules/events/event-tags-io.ts`（public event tags reads）
> - `lib/modules/events/events-io.ts`（public events reads with tag filter）
> - `lib/modules/events/event-types-admin-io.ts`（admin event types CRUD）
> - `lib/modules/events/event-tags-admin-io.ts`（admin event tags CRUD）
> - `lib/modules/events/events-admin-io.ts`（admin events CRUD）
> - `tests/events-tags.test.ts`（URL builders + EventTag type + slug validator）
> **Files updated**:
>
> - `lib/types/events.ts`（EventTag, EventTagInput, EventTagWithCount types）
> - `lib/modules/events/io.ts`（converted to thin aggregator re-exporting from split modules）
> - `lib/modules/events/admin-io.ts`（converted to thin aggregator re-exporting from split modules）
> - `lib/modules/events/cached.ts`（getVisibleEventTagsCached, getEventTagsWithCountsCached）
> - `app/[locale]/events/page.tsx`（tag filter support: ?tag=<slug>）
> - `app/[locale]/admin/events/actions.ts`（re-exports for event tags admin）
> - `app/[locale]/admin/events/components/EventFormClient.tsx`（tags multi-select）
> - `app/[locale]/admin/events/new/page.tsx`（fetch eventTags）
> - `app/[locale]/admin/events/[id]/edit/page.tsx`（fetch eventTags + selectedTagIds）
> - `supabase/COMBINED_ADD.sql`（includes 25_events_tags.sql）
> - `supabase/COMBINED_DROP.sql`（includes 25_events_tags.sql）
> - `messages/zh.json`（events.allTags, events.filteredByTag, admin.events.form.tagsLabel/tagsHint/noTags）

**Evidence**

- `supabase/02_add/22_events.sql`（目前只有 `event_types` + `events`）
- `lib/types/events.ts`（無 EventTag / event_tag_ids）
- `app/[locale]/events/page.tsx`（`searchParams` 目前只支援 `type/q/sort`）

**Violates**

- `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（FR-C4）

**Fix steps**

1) DB schema（idempotent + 可 reset）
   - Add: `supabase/02_add/25_events_tags.sql`
     - Create: `event_tags`（`slug/name_zh/sort_order/is_visible/timestamps`）
     - Create: `event_event_tags`（join；`event_id/tag_id`；PK + indexes）
     - RLS：public read（visible only）、admin manage（owner/editor）
     - Grants：anon/authenticated select；authenticated insert/update/delete（admin gated by RLS）
   - Add: `supabase/01_drop/25_events_tags.sql`（drop policies/indexes/tables）
   - Update: `supabase/COMBINED_ADD.sql`
   - Update: `supabase/COMBINED_DROP.sql`
2) Types / validators（單一真相來源）
   - Update: `lib/types/events.ts`
     - Add: `EventTag`, `EventTagInput`, `EventTagWithCount`
     - Add to `EventSummary` / `EventWithType`: `event_tags?: EventTag[]`
     - Update `EventInput`：新增 `tag_ids?: string[]`（multi-select）
3) IO / cached modules（server-only）
   - Update: `lib/modules/events/io.ts`（public list/detail 支援 join tags；新增 tag filter）
   - Update: `lib/modules/events/admin-io.ts`（寫入 tags join；transaction-safe）
   - Update: `lib/modules/events/cached.ts`（新增 `getVisibleEventTagsCached`/`getEventTagsWithCountsCached`；tag=`events`）
4) Public `/events`（SEO-friendly）
   - Update: `app/[locale]/events/page.tsx`
     - 支援 `?tag=<eventTagSlug>` filter（先做單選；多選 future）
     - UI：顯示 tag filter pills（optional）
     - Metadata：若帶 `tag`，調整 title/description（避免重複收錄可加 `noindex`）
5) Admin UI
   - Update: `app/[locale]/admin/events/components/EventFormClient.tsx`
     - Tags multi-select（從 `getVisibleEventTagsCached()` 取得 options）
     - 可選：快速新增 tag（`getOrCreateEventTag`）
6) Navigation target contract（如需）
   - Update: `lib/types/hamburger-nav.ts`（`events_index` 新增 optional `tag`）
   - Update: `lib/site/nav-resolver.ts`（query string include `tag`）
   - Update: `lib/validators/hamburger-nav.ts` + `lib/modules/content/hamburger-nav-publish-io.ts`（見 PR-42）
7) Tests（避免回歸）
   - Add: `tests/events-tags.test.ts`（IO filter + DTO shape）
   - Update/Add: URL builders / nav resolver tests（若新增 `tag`）
8) Docs（merge 後同步）
   - Update: `doc/SPEC.md`（新增 Events tags 行為；標註 `tag` filter 是否 index/noindex）

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`, `npm run build`
- DB reset sanity（需先有 `SUPABASE_DB_URL`）：`npm run db:reset`

---

### PR-40 — 合作邀請：獨立內容頁（/collaboration）+ Events type seed ✅

> **Status: COMPLETED** (2026-01-28)
>
> Implemented:
> - Added `/collaboration` public page (`app/[locale]/collaboration/page.tsx`)
> - Added `site_content` collaboration seed (`supabase/03_seed/01_main.sql`)
> - Added events type seed (`supabase/03_seed/09_events.sql`)
> - Updated `DEFAULT_HAMBURGER_NAV` to use `events_index` targets + `/collaboration` page
> - Updated hamburger_nav seed to align with DEFAULT
> - Updated Admin content editor labels (added `collaboration`)
> - Updated `COMBINED_SEED.sql`
> - Added URL builder: `buildCollaborationUrl`

**Evidence**

- Default nav：`lib/modules/content/cached.ts`（合作邀請 → `/contact`；其他活動指向 `/platforms`）
- 缺 page route：`Get-ChildItem -LiteralPath 'app/[locale]'`（目前無 `collaboration/`）
- 缺 seed：`rg -n \"INSERT INTO public\\.event_types\" supabase/03_seed -S`（0 hits）

**Violates**

- `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（FR-C5）

**Fix steps**

1) 新增 `/collaboration` public page（server-first）
   - Add: `app/[locale]/collaboration/page.tsx`
     - Data: `site_content(section_key='collaboration')` + `company_settings`（email）
     - SEO：metadata + breadcrumbs JSON-LD（使用 `lib/seo/*`）
2) 新增 `site_content` seed（非 coder 可在後台再改）
   - Update: `supabase/03_seed/01_main.sql`（insert/update `site_content.section_key='collaboration'`）
   - Update: `supabase/COMBINED_SEED.sql`
3) Events type seed（對齊 hamburger IA）
   - Add: `supabase/03_seed/09_events.sql`（`event_types` seeds；含 collaboration + 近期講座/療癒工作坊/企業內訓）
   - Update: `supabase/COMBINED_SEED.sql`
   - Update: `scripts/db.mjs`（若有 feature seed list；確保 `--feature main` 也包含新 seed 檔）
4) Hamburger nav seed 收斂到 canonical
   - Update: `lib/modules/content/cached.ts#DEFAULT_HAMBURGER_NAV`
     - 近期講座/工作坊/企業內訓 → `events_index`（`eventType=<slug>`）
     - 合作邀請 → `page`（`/collaboration`）
   - Update: `supabase/03_seed/01_main.sql` 的 `hamburger_nav` 初始 published JSON（與 DEFAULT 對齊）
5) Admin content editor labels（非 coder 可發現）
   - Update: `app/[locale]/admin/content/[section]/ContentEditorClient.tsx`（`sectionLabels` 增加 `collaboration`）
6) Docs（merge 後同步）
   - Update: `doc/SPEC.md`（新增 `/collaboration`；說明內容來源）

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`, `npm run build`
- `npm run lint:md-links`

---

### PR-41 — Contact：mailto only（移除 contact_messages/inbox/form）✅ COMPLETED

> **Status**: Completed (2026-01-28)
>
> **Implemented**:
> - Updated `/contact` page to use mailto CTA (removed form submission)
> - Deleted `app/[locale]/contact/actions.ts`
> - Deleted `components/sections/ContactFormClient.tsx`
> - Deleted `lib/types/contact.ts`
> - Deleted `lib/modules/contact/` directory (io.ts + admin-io.ts)
> - Deleted `app/[locale]/admin/contact-messages/` directory
> - Updated `components/admin/common/AdminSidebar.tsx` (removed contact-messages entry)
> - Updated `messages/zh.json` (removed admin.contactMessages + contactForm keys)
> - Deleted `supabase/02_add/24_contact_messages.sql`
> - Deleted `supabase/01_drop/24_contact_messages.sql`
> - Updated `supabase/COMBINED_ADD.sql` (removed contact_messages section)
> - Updated `supabase/COMBINED_DROP.sql` (removed contact_messages section)
> - Updated `doc/SPEC.md` (contact → mailto; removed /admin/contact-messages)

**Evidence**

- DB：`supabase/02_add/24_contact_messages.sql`（`contact_messages`）
- Public：`components/sections/ContactFormClient.tsx`, `app/[locale]/contact/actions.ts`
- Admin：`app/[locale]/admin/contact-messages/page.tsx`
- PRD：`doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（Contact mailto only）

**Violates**

- `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（FR-D2）

**Fix steps**

1) Public contact page：改回 mailto CTA（不送 DB）
   - Update: `app/[locale]/contact/page.tsx`（移除 `ContactFormClient`；改 render mailto section）✅
   - Delete (if unused after update): `app/[locale]/contact/actions.ts` ✅
   - Delete (if unused after update): `components/sections/ContactFormClient.tsx` ✅
   - Ensure: external links 仍走 allowlist（`lib/validators/external-url.ts`）✅
2) 移除 Contact Messages domain（server-only）
   - Delete: `lib/types/contact.ts` ✅
   - Delete: `lib/modules/contact/io.ts`, `lib/modules/contact/admin-io.ts` ✅
3) 移除 Admin inbox
   - Delete: `app/[locale]/admin/contact-messages/**` ✅
   - Update: `components/admin/common/AdminSidebar.tsx`（移除入口）✅
   - Update: `messages/zh.json`（移除 `admin.contactMessages` 相關 keys；同時更新 index 檢查）✅
4) DB cleanup（確保 reset 後不再存在）
   - Delete: `supabase/02_add/24_contact_messages.sql` ✅
   - Delete: `supabase/01_drop/24_contact_messages.sql` ✅
   - Update: `supabase/COMBINED_ADD.sql`（移除 contact_messages DDL/RLS/GRANT）✅
   - Update: `supabase/COMBINED_DROP.sql`（移除 contact_messages section）✅
5) Docs（merge 後同步）
   - Update: `doc/SPEC.md`（contact 改 mailto；移除 `/admin/contact-messages`）✅
   - Update: `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（若有任何舊描述）— N/A
6) Cleanup guards（避免殘留）
   - `rg -n \"contact_messages|ContactFormClient|contact-messages\" -S app components lib supabase doc` → **0 hits** ✅

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`, `npm run build` ✅

---

### PR-42 — Hamburger Nav v2：validator/publish/editor 對齊 taxonomy v2 + events + faq + collaboration ✅ DONE

**Evidence**

- Types 已擴充：`lib/types/hamburger-nav.ts`
- Draft validator 未擴充：`lib/validators/hamburger-nav.ts#ALLOWED_TARGET_TYPES`
- Publish deep validate 未擴充：`lib/modules/content/hamburger-nav-publish-io.ts`
- Editor drift：`components/admin/settings/hamburger-nav-editor/NavTargetPicker.tsx`（events 欄位命名錯誤；target types 不完整）

**Violates**

- `doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md`（FR-A2/A3；Implementation Contract: target allowlist + publish deep validate）
- `ARCHITECTURE.md`（單一真相來源 + SEO canonical）

**Fix steps**

1) Draft save validator（pure）✅
   - Update: `lib/validators/hamburger-nav.ts`
     - `ALLOWED_TARGET_TYPES` 加入：`blog_group`, `blog_topic`, `blog_tag`, `events_index`, `event_detail`, `faq_index` ✅
     - allowed keys 加入：`groupSlug`, `topicSlug`, `tagSlug`, `eventType`, `eventSlug`, `tag`（若 PR-39 加入 events tag filter）✅
2) Publish deep validate（server-only; DB existence）✅
   - Update: `lib/modules/content/hamburger-nav-publish-io.ts` ✅
     - blog_group/blog_topic/blog_tag：查 `blog_groups/blog_topics/blog_tags`（exists + is_visible）✅
     - event_detail：查 `events`（exists + visibility='public'）✅
     - events_index：若帶 `eventType`/`tag`，需驗證對應 type/tag 存在且 visible（避免發布壞連結）✅
   - Add/Update: `lib/modules/content/hamburger-nav-publish-blog-validate-io.ts`（新增 group/topic/tag validators）✅
   - Add: `lib/modules/content/hamburger-nav-publish-events-validate-io.ts`（新增 event validators；避免塞進 orchestrator）✅
3) Admin editor target picker（non-coder UX）✅
   - Update: `components/admin/settings/hamburger-nav-editor/NavTargetPicker.tsx` ✅
     - 修正：`events_index` 使用 `eventType`（移除錯誤 `eventTypeSlug`）✅
     - 增加 target types：blog_group/blog_topic/blog_tag/faq_index（並支援 events tag filter）✅
   - Update: `app/[locale]/admin/settings/navigation/page.tsx` ✅
     - options：改抓 blog groups/topics/tags（不再只抓 legacy categories）✅
     - static pages：更新 `/contact` label、加入 `/faq` + `/collaboration` ✅
4) Default nav seed（避免 drift；對齊 canonical）— N/A（保留現有 default，未含新 target types）
   - Update: `lib/modules/content/cached.ts#DEFAULT_HAMBURGER_NAV` — N/A
   - Update: `supabase/03_seed/01_main.sql`（`hamburger_nav` seed）— N/A
5) Tests（守門）✅
   - Add: `tests/hamburger-nav-validator-target-types.test.ts`（新 target types 可被 parse/validate）✅
   - Update: `tests/hamburger-nav-publish-io.test.ts`（新 target types deep validate table checks）✅
6) Docs（merge 後同步）✅
   - Update: `doc/SPEC.md`（Hamburger nav target allowlist + 實際 editor 行為）✅

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`, `npm run build` ✅
- `rg -n \"eventTypeSlug\" components/admin/settings/hamburger-nav-editor/NavTargetPicker.tsx` → 0 hits ✅

---

### PR-43 — Legacy：`/platforms` → `/events` canonicalization + cleanup ✅ COMPLETED

> **Status**: Completed (2026-01-28)
>
> **Implemented**:
> - Updated `app/[locale]/platforms/page.tsx` to use `permanentRedirect()` → `/events`
> - Removed `/platforms` from `app/sitemap.ts` STATIC_PAGES (added /events, /faq, /collaboration)
> - Removed `/platforms` option from admin navigation editor (`app/[locale]/admin/settings/navigation/page.tsx`)
> - Updated `doc/SPEC.md` to document `/platforms` as legacy redirect route
> - Verified hamburger nav `DEFAULT_HAMBURGER_NAV` already uses `events_index` targets (no `/platforms` references)
> - Cleanup guards verified: `/platforms` references only in legacy redirect page, i18n routing config, and documentation

**Evidence**

- `app/[locale]/platforms/page.tsx`（目前 page 標題為「講座／活動」但 URL 為 `/platforms`）
- Default nav：`lib/modules/content/cached.ts`（多個 items 指向 `/platforms`）

**Fix steps**

1) Canonical 決策 ✅
   - `/events` 是 canonical
   - `/platforms` 視為 legacy route：永久 redirect 到 `/events`
2) Implement redirect（SEO-friendly）✅
   - Update: `app/[locale]/platforms/page.tsx`
     - 使用 `permanentRedirect()` → `/${locale}/events`
     - page 不再做 DB read（避免浪費）
3) Update nav + seeds（避免 redirect chain）✅
   - Ensure（should already be done in PR-40/42）：hamburger nav 不再指向 `/platforms`
4) Sitemap / robots ✅
   - Update: `app/sitemap.ts`（確保不再列出 `/platforms`）
5) Docs（merge 後同步）✅
   - Update: `doc/SPEC.md`（標註 `/platforms` legacy redirect；或移除該頁描述）
6) Cleanup guards ✅
   - `rg -n \"\\'/platforms\\'|/platforms\" -S app lib supabase doc` → 只允許 legacy redirect 與歷史 docs（archive）

**DoD**

- `npm test`, `npm run lint`, `npm run type-check`, `npm run build` ✅

## 3) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- Docs：`npm run docs:generate-indexes`, `npm run docs:check-indexes`, `npm run lint:md-links`
- `npm run build`（routes/SEO/redirect 相關 PR 必跑；先確認 `.env.local` 已設 `NEXT_PUBLIC_SITE_URL` + Supabase public env）
