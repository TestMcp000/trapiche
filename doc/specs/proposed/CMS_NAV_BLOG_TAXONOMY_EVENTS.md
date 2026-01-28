# Admin CMS vNext：Hamburger Nav Editor + Blog Taxonomy v2（Groups/Topics/Tags）+ Events + Editable Pages - Product Requirements Document (PRD)

> **Version**: 0.1  
> **Last Updated**: 2026-01-27  
> **Status**: Draft  
> **Owner**: Admin / Product  
> **Parent Document**: `../../SPEC.md`

本 PRD 聚焦「心理師也能不寫 code 就能更新網站內容」的後台能力（Phase vNext），並在不破壞既有 `ARCHITECTURE.md` 的前提下，補齊：

1) Hamburger menu（2 層）在後台可視化編輯（不是 JSON 編輯器）  
2) Blog 分類模型升級：**Group（大分類）+ Topic（子主題，可多選）+ Tag（自由標籤，可多選）**  
3) 講座/活動（Events）資料表 + 後台 CRUD + 前台列表/詳情（SEO 友善）  
4) 關於/聯絡相關頁面（含 FAQ/合作邀請頁/Contact mailto）可由後台編輯（表單化、可預覽、可發布）

---

## TL;DR

- Admin：在「網站設定」用拖曳 + 表單，直接編輯 Hamburger menu 的分類/細項/排序/連結目標（含 blog topics、events filters、站內頁、外連）。  
- Blog：文章可選 1 個大分類（Group），並可同時選多個子主題（Topic，例如同時「情緒照顧」+「睡眠議題」），也可加多個 Tag。  
- Events：後台能新增/編輯/下架講座活動（日期/地點/報名連結等），且活動同時支援「type + tags」；前台有列表/詳情頁與 JSON-LD（Event）。  
- Pages：心理師介紹/服務方式/常見問題/合作邀請等頁面內容，後台用欄位化表單編輯並可 preview/publish（避免直接改 JSON）；Contact 維持 mailto（不存 DB）。

---

## Decisions（關鍵決策；避免寫成 step plan）

| Topic | Decision | Why |
| --- | --- | --- |
| Hamburger menu IA | 僅支援 2 層：`group → items` | 需求清楚、維持可用性與可測試性；避免第三層帶來 UX/SEO/維護成本 |
| Hamburger storage | 仍使用 `site_content(section_key='hamburger_nav')` 作為 SSOT（draft/publish + history） | 既有 infra 完整（publish/validation/fallback/caching），只補「可視化編輯 UI」 |
| Blog taxonomy | `Post` 需選 **1 個 Group**；可選 **0..N Topics**；可選 **0..N Tags** | 大分類對應 IA；Topics/Tags 解決「同篇多主題」需求 |
| Canonical URLs | Blog post canonical 繼續使用 `/blog/posts/[slug]`；新增 Group/Topic/Tag 的 canonical pages | 維持既有 SEO 既定行為，避免 redirect chain/drift |
| Events model | Events 同時支援 `event_types`（單選）+ `event_tags`（多選） | 分類清楚（type）+ 彈性標記（tags），仍可保持後台可用性 |
| Collaboration invitation | 「合作邀請」同時存在：A) events type（可被篩選）B) 獨立內容頁（長期資訊） | IA 需要一個穩定入口頁；同時也要能把「合作邀請」當作活動型內容管理 |
| Contact submissions | Contact 維持 mailto（不存 DB、不做後台 inbox） | 降低資安/隱私風險與維運成本；避免存放敏感訊息 |
| Non‑coder editing | Admin 新增「表單化 editor」；JSON 編輯器只作為 fallback（advanced） | 降低心理師操作門檻；仍保留工程 fallback 以免被 block |

---

## Scope

### In Scope

- Hamburger menu（`hamburger_nav`）的可視化編輯器（新增到後台「網站設定」區）：
  - 建立/刪除/排序/命名 group 與 item
  - item 可選 target（blog/topic/tag/group、events、page、anchor、external）
  - 可 preview、可儲存草稿、可發布；發布需 deep validate（查 DB existence）
- Blog taxonomy v2：
  - DB schema：Groups / Topics / Tags + join tables
  - Admin：群組/主題管理、文章編輯器支援多選 topics + tags
  - Public：Group/Topic/Tag 列表頁 + SEO（metadata + JSON-LD）
- Events：
  - DB schema + Admin CRUD
  - Public list/detail + SEO（Event JSON-LD）
- Pages（關於/聯絡）：
  - FAQ（表單化 CRUD）
  - 合作邀請（獨立內容頁；表單化/可預覽/可發布）
  - Contact（mailto；不存 DB）

### Out of Scope（Non-goals）

- WYSIWYG rich-text editor（本期以欄位化表單 + Markdown（受控）為主）
- 三層以上導覽、mega menu、或跨區塊的複雜 IA 引擎
- 多語系內容（本專案目前以 `zh` single locale 為主；schema 可保留但不要求）

---

## Requirements

### Functional (FR)

#### A) Hamburger menu（可視化後台編輯）

- FR-A1：後台提供 `hamburger_nav` 專用 editor（非 JSON 文字框），可編輯 group/items 的 label、排序、顯示/隱藏。
- FR-A2：每個 item 必須可選 `target` 類型（見 `Implementation Contract`），並由系統產生 canonical href（不得在 UI 直接拼字串）。
- FR-A3：支援「儲存草稿」與「發布」兩段式：
  - 儲存草稿：只做 schema/allowlist 驗證（不查 DB）。
  - 發布：deep validate（查 DB）→ 任一 internal target 不存在/不可公開，必須阻止發布並回傳可定位錯誤（含 JSON path）。
- FR-A4：發布成功後 public 端導覽需即時更新（cache tag revalidate）。

#### B) Blog taxonomy v2（Groups/Topics/Tags）

- FR-B1：後台可管理 Blog Groups（新增/編輯/排序/上下架）。
- FR-B2：後台可管理 Blog Topics（新增/編輯/排序/上下架；Topic 必須歸屬某個 Group）。
- FR-B3：文章編輯器：
  - 必填：Group（single-select）
  - 可選：Topics（multi-select，預設依 Group 篩選）
  - 可選：Tags（multi-select + free input）
- FR-B4：前台提供 canonical pages：
  - Group：`/blog/groups/[slug]`
  - Topic：`/blog/categories/[slug]`（保留既有 canonical 路由命名）
  - Tag：`/blog/tags/[slug]`
- FR-B5：Hamburger menu 的「身心健康衛教/書籍推薦」等子項目，能精準指向 Topic/Tag/Group（不可僅靠 `q=` 搜尋）。

#### C) Events（講座/活動）

- FR-C1：後台 CRUD：可新增/編輯/下架活動（日期時間、地點、報名連結、封面圖、摘要、內文）。
- FR-C2：前台活動列表頁與活動詳情頁（含 SEO metadata + Event JSON-LD）。
- FR-C3：Hamburger menu 可 link 到 events index（可帶 filter，例如 event type）。
- FR-C4：Events 支援 tags（0..N；後台可新增/選取，前台可篩選 `?tag=<slug>`）。
- FR-C5：「合作邀請」同時存在：
  - events type：可建立/管理活動型合作邀請（有日期/報名等）
  - 獨立頁面：`/collaboration`（長期資訊，非事件列表）

#### D) Pages（關於/聯絡）

- FR-D1：後台可編輯「心理師介紹 / 服務方式 / 常見問題 / 合作邀請 / 聯絡頁」等頁面內容（表單化）。
- FR-D2：Contact 頁維持 mailto（CTA 直接寄信），不在本系統存放 submissions。

### Non-Functional (NFR)

- Performance：public 端維持 server-first + cached reads；新 admin UI 不得污染 public bundle。
- Security：所有 external href 僅允許 `https:`（可選 `mailto:`）；write-side + render-side 都要做 allowlist hardening（依 `ARCHITECTURE.md`）。
- Accessibility：導覽 editor + publish 錯誤提示需可鍵盤操作；events 與 blog taxonomy pages 需有正確 heading 結構。
- Observability：admin publish 失敗需可追蹤（error log / structured error code），但不暴露敏感資訊到 public。

---

## Resolved Decisions（2026-01-27）

1) Events：type + tags 兩者都要  
2) 合作邀請：events type + 獨立頁面兩者都要  
3) Contact：mailto 即可（不做 submissions inbox）  

---

## Implementation Contract（可驗收的技術契約；避免 drift）

### 1) Navigation SSOT（不改 public contract；只補 UI）

- SSOT：`site_content(section_key='hamburger_nav')`（draft/publish/history）
- Public 解析與 resolver：`lib/types/hamburger-nav.ts`, `lib/validators/hamburger-nav.ts`, `lib/site/nav-resolver.ts`
- Published JSON 需保持 locale-agnostic（不得寫死 `/{locale}`），render 時自動加 prefix（同 `GALLERY_HERO_IMAGE_AND_HOTSPOTS.md` FR-9.6）。

**Target allowlist（擬新增/調整）**

> 既有 target type 需保持 backward compatible；本期新增的 type 必須同時補齊：
> - validator allowlist（write-side）
> - resolver canonical builder（render-side）
> - deep validate（publish-side）

| `target.type` | Required fields | Optional fields | Canonical href |
| --- | --- | --- | --- |
| `blog_group` | `groupSlug` | `q`, `sort`, `page` | `/blog/groups/<groupSlug>` + query |
| `blog_topic` | `topicSlug` | `q`, `sort`, `page` | `/blog/categories/<topicSlug>` + query |
| `blog_tag` | `tagSlug` | `sort`, `page` | `/blog/tags/<tagSlug>` + query |
| `events_index` | - | `eventType`, `tag`, `q`, `sort`, `page` | `/events` + query |
| `event_detail` | `eventSlug` | - | `/events/<eventSlug>` |
| `faq_index` | - | - | `/faq` |

（既有 `blog_index`/`blog_category`/`blog_post`/`page`/`anchor`/`external` 依現況保留）

### 2) Blog Taxonomy v2（DB）

> 命名暫定（以 `blog_*` namespace 避免與其他 domain 衝突）。

**Tables（proposed）**

- `blog_groups`：
  - `id uuid pk`
  - `slug text unique not null`
  - `name_zh text not null`
  - `sort_order int not null default 0`
  - `is_visible boolean not null default true`
  - timestamps
- `blog_topics`：
  - `id uuid pk`
  - `group_id uuid not null references blog_groups(id)`
  - `slug text unique not null`
  - `name_zh text not null`
  - `sort_order int not null default 0`
  - `is_visible boolean not null default true`
  - timestamps
- `blog_tags`：
  - `id uuid pk`
  - `slug text unique not null`
  - `name_zh text not null`
  - timestamps
- `post_topics`（join；多對多）：
  - `post_id uuid not null references posts(id) on delete cascade`
  - `topic_id uuid not null references blog_topics(id) on delete restrict`
  - composite pk `(post_id, topic_id)`
- `post_tags`（join；多對多）：
  - `post_id uuid not null references posts(id) on delete cascade`
  - `tag_id uuid not null references blog_tags(id) on delete restrict`
  - composite pk `(post_id, tag_id)`

**Posts changes（proposed）**

- `posts.group_id uuid not null references blog_groups(id)`
- `posts.category_id`（legacy）保留一段時間作為 backward compatibility（或 migrate → drop；見 step plan）

**SEO**

- Canonical URL builders 必須集中於 `lib/seo/url-builders.ts`（或現行單一真相來源）。
- Group/Topic/Tag pages 需輸出：
  - `<title>/<meta description>`
  - JSON-LD breadcrumbs（同現行 pages）
  - `noindex` 規則：`?q=` 搜尋結果頁是否 index（需定義；預設建議 `noindex`，避免無限組合被收錄）。

### 3) Events（DB + SEO）

**Tables（proposed）**

- `event_types`（optional but recommended）：
  - `id uuid pk`
  - `slug text unique not null`
  - `name_zh text not null`
  - `sort_order int not null default 0`
  - `is_visible boolean not null default true`
- `events`：
  - `id uuid pk`
  - `type_id uuid null references event_types(id)`
  - `slug text unique not null`
  - `title_zh text not null`
  - `excerpt_zh text null`
  - `content_md_zh text null`（trusted admin markdown）
  - `cover_image_url text null`
  - `cover_image_alt_zh text null`
  - `start_at timestamptz not null`
  - `end_at timestamptz null`
  - `timezone text not null default 'Asia/Taipei'`
  - `location_name text null`
  - `location_address text null`
  - `online_url text null`（external url allowlist）
  - `registration_url text null`（external url allowlist）
  - `visibility text not null default 'draft'`（`draft/private/public`）
  - `published_at timestamptz null`
  - timestamps
 - `event_tags`：
   - `id uuid pk`
   - `slug text unique not null`
   - `name_zh text not null`
   - timestamps
 - `event_event_tags`（join；多對多）：
   - `event_id uuid not null references events(id) on delete cascade`
   - `tag_id uuid not null references event_tags(id) on delete restrict`
   - composite pk `(event_id, tag_id)`

**Public routes（proposed）**

- `/[locale]/events`（filters：`?type=<slug>&tag=<slug>&q=<q>&sort=<...>&page=<n>`）
- `/[locale]/events/[slug]`

**JSON-LD**

- list page：ItemList（optional）
- detail page：Event（required）

### 4) Pages / FAQ / Contact

- FAQ 建議以 `faqs` table 管理（可排序/上下架），public render 可搭配 FAQPage JSON-LD（提升 SEO）。
- 合作邀請建議為獨立內容頁（`/collaboration`），內容來源可沿用 `site_content`（draft/publish/history）。
- Contact 維持 mailto（不存 DB、不做 inbox）；若未來要做 submissions，需先補齊 PII/retention/anti-spam 規格與 `doc/SECURITY.md` 對齊。

---

## Implementation Status（2026-01-25）

- Implemented behavior (SSoT): `../../SPEC.md`（本 PRD 描述的是 **vNext planned**，非已落地）
- Planned execution plan: `../../meta/STEP_PLAN.md`（將以 PR-by-PR 拆解）
- Constraints: `../../../ARCHITECTURE.md`

---

## Related

- Existing Home/Hamburger/Nav/Hotspots PRD（含 hamburger nav v2 contract）：`GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`
- Docs index: `../README.md`
- Drift tracker / playbooks: `../../../uiux_refactor.md`
