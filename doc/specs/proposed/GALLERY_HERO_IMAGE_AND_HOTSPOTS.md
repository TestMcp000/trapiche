# Home（UIUX 跟稿）+ Gallery Hero Image + Image Hotspots（圖上 Pin）- Product Requirements Document (PRD)

> **Version**: 0.9  
> **Last Updated**: 2026-01-29  
> **Status**: Draft  
> **Owner**: Admin / Product  
> **Parent Document**: (optional) `../../SPEC.md`

本 PRD 聚焦（Phase 1）：

1) **Home 排版照 Design SSoT：`../../archive/DESIGN_SSOT.md`**（只涵蓋 Home；Gallery list 維持既有 pinterest-like 瀑布流）  
2) **Home Hero 圖片可由 Gallery 作品中自選**（後台管理員設定）  
3) **Gallery Item 圖片支援「圖上標記（Hotspots）」**：所有作品皆可選擇是否新增 pin（0..N；可為 0）；管理員可在圖片任意位置新增多個 pin，並可選擇是否填「一句話 preview / 象徵意涵」，且「詳細描述」支援 Markdown；前台（含 Home Hero）可互動呈現

補充：目前此專案暫訂 **zh（繁中）為主**；i18n 欄位可保留但 Phase 1 不強制填寫。

---

## TL;DR

- Admin：上傳/編輯任一 Gallery 作品時，都可選擇是否新增 hotspots（0..N；可為 0），並可在圖片上新增/拖曳/編輯多個 hotspots（媒材/象徵意涵/Markdown 詳述）；Hero 選擇與 hotspots 狀態獨立（hero 作品可沒有 hotspots）。
- Admin：可在後台編輯 Hamburger menu 的 IA（分類/細項/排序/連結），且連結可指向 Blog / Gallery / 站內 anchor / 外連。
- Public：Home Hero 會顯示選定作品的圖片與 hotspots（同一份資料）；Gallery list 維持瀑布流；作品詳情頁主圖同樣可互動顯示 hotspots（並提供行動裝置/無障礙 fallback）。

---

## Design SSoT（Docs / Figma）

- Design SSoT（最終權威；純文件）：`../../archive/DESIGN_SSOT.md`
- Figma Site（提供檢視/分享）：https://pond-bulk-99292481.figma.site/
- Figma Design（原始檔案）：https://www.figma.com/design/HeXn2lGfcxUUk3zhA81heF/Therapist-Content-Website-UI
- （Removed）Local UIUX prototype：`uiux/`（已移除；不再作為 SSoT）

> 過去的 `uiux/` 為獨立 Vite prototype（不代表可直接搬進 Next.js production bundle）；設計最終權威以 `../../archive/DESIGN_SSOT.md` 為準。

**Route 對照（暫定）**

| Next route（實作） | Design SSoT 參考 | 用法（本 PRD） |
| --- | --- | --- |
| `/[locale]/` | `../../archive/DESIGN_SSOT.md`（§1–§5） | Hero 以「選定 gallery item 圖片」作為主視覺，hotspots/modal/fallback/fab/suggest 對齊 |
| `/[locale]/gallery/items/[category]/[slug]` | `../../archive/DESIGN_SSOT.md`（§3） | 作品主圖疊 hotspots，點擊展開媒材詳情 |
| `/[locale]/gallery` |（Design SSoT 不涵蓋） | 以現有 masonry/卡片風格延伸 |

---

## Decisions（關鍵決策；避免寫成 step plan）

| Topic | Decision | Why |
| --- | --- | --- |
| Design SSoT | `../../archive/DESIGN_SSOT.md` 作為排版/互動最終權威 | 避免「設計/實作」各自漂移；且 `uiux/` 已移除 |
| Primary locale | Phase 1：zh only（繁中）；schema 可保留 `*_en` 但不強制 | 降低首版成本，避免 UI/內容被 i18n 拖慢 |
| Home coverage | 「跟稿」只涵蓋 Home；Gallery list 維持既有 pinterest-like 瀑布流 | 避免大改動，保留既有 gallery UX |
| Hero image source | 以 `gallery_items.id` 指向 Gallery 作品 | 單一來源，重用現有圖片/metadata |
| Hero selection storage | 沿用 `gallery_pins`，新增 `surface = 'hero'` 並限制最多 1 筆 | 內容選擇用關聯表，且可沿用既有 pins 管理模式 |
| Hero hotspots | Hero 顯示「所選作品的 hotspots」 | 管理員只需維護一份 hotspot 資料 |
| Hero layout | Home Hero 採「左側標語/CTA + 右側 hero 圖（blob mask）」兩欄 | 標語可讀性最佳，且不跟 pins 打架 |
| Hero empty state | 未選 hero 圖時：仍顯示左側標語/CTA；右側顯示 placeholder blob（無 pins） | 版面一致、不會因設定缺漏而跳版 |
| Hotspot vs Featured naming | 圖上 pin 在 DB/API 以 `hotspot` / `annotation` 命名，不用 `pin` | 專案已存在 `gallery_pins`（置頂精選），避免語意混淆 |
| Hotspots availability | hotspots 對所有 `gallery_items` 開放，且每個作品可為 0..N | 「要不要 pin」是每個作品的內容選項，不跟 hero 綁死 |
| Hotspot coordinates | 儲存 normalized `x`/`y`（0..1）相對於圖片原始尺寸 | 響應式縮放穩定，不需存 pixel |
| Hotspot fields | `media` + `description_md` 必填；`preview` / `symbolism` 選填 | 滿足「可自定義要不要包含」且 schema 簡單 |
| Hotspot read-more CTA | 追加 optional `read_more_url`（固定 CTA），Markdown 仍允許一般 links | 同時滿足「固定 CTA」與「必要時多連結」 |
| Hotspot max | 上限以 `company_settings.gallery_hotspots_max` 控制（default: `12`） | 可營運調整，避免 UI 過度擁擠 |
| Hotspot order | Default：按座標自動排序（`y→x`）；Admin 可手動拖曳排序並持久化 | 兼顧「不用維護」與「可控敘事順序」 |
| New hotspot insertion | 若管理員已手動排序，新增 hotspot 一律 append 到最後 | 避免新增行為打亂既有敘事順序 |
| Markdown | hotspots 的 `description_md` 支援 Markdown（GFM subset），**不允許 raw HTML**；允許外連但僅允許 `https:`（可選 `mailto:`）；sanitize/allowlist | 內容會出現在 Home/Hero，採較保守的 trust boundary |
| External links | 所有外連強制 `target="_blank"` + `rel="noopener noreferrer"` | 避免 tabnabbing，且是標準安全作法 |
| Home recommendations | Home 文章推薦以 `ANALYTICS_PERSONALIZATION_UMAMI.md` 作為決策 SSoT（Umami + pgvector） | 避免重複定義個人化規則造成 drift |
| Header nav labels | （Deprecated）已移除 `site_content(section_key='nav')`；導覽一律由 `site_content(section_key='hamburger_nav')` 定義 | 避免導覽雙軌造成 drift |
| Hamburger nav source | Hamburger menu 的 IA 由 `site_content(section_key='hamburger_nav')` JSON 定義 | 可後台編輯，且不與 `nav` labels 混用 |
| Hamburger nav external links | 允許外連但僅允許 `https:`（可選 `mailto:`），並強制新分頁 + `rel` | 符合安全原則且滿足導流需求 |
| Blog/Gallery canonical URLs（v2） | Category/slug 用 path；filters 用 query；搜尋參數統一用 `q`。Blog：`/blog`、`/blog/categories/<categorySlug>`、`/blog/posts/<postSlug>`；Gallery：`/gallery`、`/gallery/categories/<categorySlug>`、`/gallery/items/<categorySlug>/<itemSlug>` | URL 規則一致、好分享/SEO、避免 query/path 雙軌 drift；post URL 不綁 category（更好維護） |
| Event CTA URL | 「講座邀請」連結來源：`company_settings.home_event_cta_url`（可選：`home_event_cta_label_zh`） | 需後台可編輯且可驗證 URL |
| Marquee notice content | 來源：`company_settings.home_notice_label_zh` + `company_settings.home_notice_text_zh` | 需後台可編輯，且不需要 JSON 編輯器 |

---

## Scope

### In Scope

- Home：排版/互動對齊 Design SSoT：`../../archive/DESIGN_SSOT.md`（marquee notice、hamburger menu、hero stage、suggest section、floating FAB）
- Gallery list：維持既有 pinterest-like 瀑布流（不在 Design SSoT scope）
- Hero 圖片：後台可從 Gallery 作品選擇/清除；前台 Hero render + fallback 行為
- Hotspots：DB schema + RLS、後台 CRUD + 拖曳定位、前台互動呈現（含 Home Hero + Gallery detail）+ fallback list
- Home 個人化推薦：最下方文章卡片以「文章封面」呈現，推薦邏輯對齊 `ANALYTICS_PERSONALIZATION_UMAMI.md`
- Home 設定可調：marquee notice 文案、講座邀請 URL、hotspots 上限、hamburger nav IA（分類/細項/排序/連結）
- 文件：本 PRD；若 contracts 收斂後再補 single-feature spec（見本文末）

### Out of Scope（Non-goals）

- Gallery list 重新設計（維持既有瀑布流）
- 一個作品多張圖片 / 多圖切換（目前 `gallery_items` 只有單張 `image_url`；Phase 1 不處理）
- 非點狀 pins（例如多邊形區塊、畫筆標註、mask）
- 商業功能（購買、詢價、shopping cart）
- 公開使用者新增 pins（僅管理員）

---

## Requirements

### Functional (FR)

- FR-1（Admin：Hotspot 編輯流程）：管理員在後台上傳/編輯 Gallery 作品時，可在圖片任意位置新增多個 hotspots，並支援拖曳調整位置。
- FR-1.1（Admin：刪除/隱藏 hotspots）：管理員可對單一 hotspot 做「刪除」與「隱藏/顯示」（`is_visible`）操作；管理員可把某作品的 hotspots 清到 0（達成「此作品不顯示 pins」）。
- FR-2（Admin：Hotspot 欄位）：每個 hotspot 必填：
  - `media`（媒材名稱，text）
  - `description_md`（詳細描述，Markdown）
  並可選填：
  - `preview`（一句話 preview）
  - `symbolism`（象徵意涵）
- FR-2.1（Admin：Hotspot 上限）：每個作品最多 hotspots 數量由 `company_settings.gallery_hotspots_max` 控制；超過上限時 UI 需阻止新增並提示。
- FR-2.2（Admin：Hotspot 順序）：同一作品的 hotspots 預設依座標自動排序（`y→x`）；管理員可在「hotspot 清單」用拖曳調整順序並儲存，前台 fallback list 與 keyboard focus 順序需跟隨此順序。
- FR-2.3（Admin：新增 hotspot 的插入規則）：若管理員已做過手動排序，後續新增的 hotspot 一律 append 到最後（不做自動插入）。
- FR-2.4（Empty state）：同一作品可為 0 個 hotspots；若該作品沒有任何 `is_visible=true` 的 hotspots，前台不得顯示 pins layer，且不得顯示/開啟 fallback list UI。
- FR-3（Admin：Hero 選擇）：管理員可在後台選擇 0..1 個 Gallery 作品作為 Home Hero 圖，並可清除設定。
- FR-4（Home：Hero 版型）：Hero 圖片「靠右」且被不規則框（blob mask）包覆（參考 `../../archive/DESIGN_SSOT.md` §2）；左側保留「清楚的標語」/hero 文案/CTA，且可由後台編輯（沿用 `site_content(section_key='hero')`）。
- FR-4.1（Home：Hero 空狀態）：若未選定 hero 圖片：仍顯示左側標語/CTA；右側顯示 placeholder blob（無 pins）。
- FR-5（Home：Hero hotspots）：Hero render 時同時顯示「該作品的 hotspots」，互動行為如下：
  - Hover：pin 會原地有互動（縮放/輕微懸浮/顏色加深，至少其一；需與 `../../archive/DESIGN_SSOT.md` §3 的 motion 行為一致）
  - Click/Tap：出現資訊圖卡（modal card）
  - Close：點擊 `X` 或點擊卡片外（backdrop）關閉
- FR-6（Gallery list）：維持既有 pinterest-like 瀑布流（card/masonry 行為不改）。
- FR-7（Gallery detail）：作品詳情頁主圖顯示 hotspots；hover/click/tap 展開資訊卡（媒材 + Markdown 詳述 + optional preview/symbolism）。
- FR-7.1（Hotspot 卡片 CTA）：若該 hotspot 設定了 `read_more_url`，卡片底部顯示固定 CTA「延伸閱讀」；同時 `description_md` 仍允許一般 links（依 Markdown 安全邊界與 allowlist）。
- FR-7.2（Hotspot fallback list：mobile / 無障礙）：需提供「清單式」替代介面（同一份 hotspots 資料、同一套順序規則），規格如下：
  - 位置：圖片 stage 下方（Home Hero 與 Gallery detail 皆需）
  - 形式：預設收合的「查看媒材清單（N）」按鈕；點擊後以 bottom sheet / modal 顯示清單
  - 清單 item：至少顯示 `media`；若有 `preview`，以次要文字顯示；順序必須遵守本文 `Implementation Contract` 的 Hotspot ordering 規則（auto: `y→x`；manual: `sort_order`）
  - 行為：點選清單 item = 開啟同一張資訊圖卡（並同步標記對應 pin 為 active）；按 `ESC` / 點擊 backdrop / `X` 關閉；關閉後 focus 回到觸發來源（清單 item 或 pin）
- FR-8（Marquee notice）：跑馬燈內容以「Notice + 宣傳文」視為同一段完整資訊一起跑；Notice 標示為橘色底。
- FR-8.1（Marquee notice 文案來源）：`company_settings.home_notice_label_zh` + `company_settings.home_notice_text_zh`；若缺少則 fallback 到內建預設值（需寫在 code constants）。
- FR-9（Header / Nav）：左上 hamburger menu 往右展開；選單橫向呈現在上方；細項再往下展開（accordion）。
- FR-9.1（Hamburger menu IA 來源）：`site_content(section_key='hamburger_nav')`（zh JSON），用於渲染分類與細項連結。
- FR-9.2（Hamburger nav JSON schema v2）：採 versioned JSON（便於未來擴充）；**items 不儲存 raw `href`，改用 typed `target`**，由 server resolver 產出 canonical href（避免 route 調整時要重寫所有 content）。最小結構如下：

```json
{
  "version": 2,
  "groups": [
    {
      "id": "health-education",
      "label": "身心健康衛教",
      "items": [
        {
          "id": "emotion-care",
          "label": "情緒照顧",
          "target": { "type": "blog_index", "q": "情緒照顧" }
        }
      ]
    }
  ]
}
```

- FR-9.3（Hamburger nav links）：允許外連但僅允許 `https:`（可選 `mailto:`），並強制輸出 `target="_blank"` + `rel="noopener noreferrer"`；站內 links 不需 `target`。
- FR-9.4（Admin：可編輯與發布）：管理員可在 `/{locale}/admin/content/hamburger_nav` 編輯/儲存/發布 `hamburger_nav` JSON；發布後 public header 的 hamburger menu 以最新發布版本渲染（依既有 `site_content` 快取策略生效）。
- FR-9.5（Hamburger nav link targets v2）：每個 item 的 `target` 必須支援以下目標類型（且可被驗收）。canonical 路徑如下（避免同一內容有兩種網址）：
  - Blog（canonical）：
    - index：`/blog`（可選 filters：`?q=<keyword>`、`?sort=<...>`、`?page=<n>`）
    - category：`/blog/categories/<categorySlug>`（可選 `?q=<keyword>`、`?sort=<...>`、`?page=<n>`）
    - post：`/blog/posts/<postSlug>`
  - Gallery（canonical）：
    - index：`/gallery`（可選 filters：`?q=<keyword>`、`?tag=<tag>`、`?sort=<...>`、`?page=<n>`）
    - category：`/gallery/categories/<categorySlug>`（可選 `?q=<keyword>`、`?tag=<tag>`、`?sort=<...>`、`?page=<n>`）
    - item：`/gallery/items/<categorySlug>/<itemSlug>`
  - 站內頁面：`/about`、`/services`、`/contact`…（可選 `#hash`）
  - 站內 anchor：`#contact`（或 `/#contact`；resolver 需正規化）
  - 外連：`https://...`（可選 `mailto:`）
- FR-9.5.1（避免 drift）：不允許 query-based category（例如 `/blog?category=...`、`/gallery?category=...`）；若保留 legacy/non-canonical routes，必須 301 redirect 到上述 canonical。
- FR-9.5.2（參數一致性）：Blog/Gallery 的關鍵字搜尋 query param 統一使用 `q`（不使用 `search`）。
- FR-9.5.3（`target` allowlist）：`hamburger_nav.groups[*].items[*].target` 僅允許以下 `type`（其餘一律視為 invalid）：

| `target.type` | Required fields | Optional fields | Canonical href |
| --- | --- | --- | --- |
| `blog_index` | - | `q`, `sort`, `page` | `/blog` + query |
| `blog_category` | `categorySlug` | `q`, `sort`, `page` | `/blog/categories/<categorySlug>` + query |
| `blog_post` | `postSlug` | - | `/blog/posts/<postSlug>` |
| `gallery_index` | - | `q`, `tag`, `sort`, `page` | `/gallery` + query |
| `gallery_category` | `categorySlug` | `q`, `tag`, `sort`, `page` | `/gallery/categories/<categorySlug>` + query |
| `gallery_item` | `categorySlug`, `itemSlug` | - | `/gallery/items/<categorySlug>/<itemSlug>` |
| `page` | `path` | `hash` | `<path><hash?>` |
| `anchor` | `hash` | - | `#<hash>`（resolver 正規化） |
| `external` | `url` | - | `<url>` |

- FR-9.5.4（`q` 搜尋涵蓋範圍）：Hamburger nav seed 會用到 `q`，因此需定義可驗收的行為：
  - Blog：`q` 需至少搜尋 `title_zh` + `excerpt_zh`（可選擴充到 `content_zh`）
  - Gallery：`q` 需至少搜尋 `title_zh` + `description_zh` + `material_zh` + `tags_zh[]`
- FR-9.6（Locale prefix 規則 v2）：`hamburger_nav` 儲存的 `target` 必須是 locale-agnostic（不得寫死 `/zh/...`）；渲染時使用 next-intl 的 locale routing 自動加上 `/{locale}` 前綴；外連/`mailto:` 不加前綴。
- FR-9.7（Validation v2）：後台需區分「儲存」與「發布」兩階段驗證（完整寫死見本文 `Implementation Contract`）：
  - 儲存（draft，不查 DB）：JSON schema 合法、`target.type` allowlist、slug 格式、query keys allowlist、external URL 協議 allowlist（`https:`/可選 `mailto:`；拒絕 `javascript:`/`data:`/`http:`）。
  - 發布（public，deep validate 會查 DB）：所有 internal targets 必須指向「存在且可公開」的內容；否則必須阻止發布並顯示可定位錯誤（含 JSON path）。
- FR-9.8（Hamburger nav seed）：初始內容需與 `../../archive/DESIGN_SSOT.md` §6 的 4 組分類與細項名稱一致（zh），並提供可驗收的預設 targets（可由 admin 後台再調整）：

```json
{
  "version": 2,
  "groups": [
    {
      "id": "health-education",
      "label": "身心健康衛教",
      "items": [
        { "id": "emotion-care", "label": "情緒照顧", "target": { "type": "blog_index", "q": "情緒照顧" } },
        { "id": "anxiety-stress", "label": "焦慮壓力", "target": { "type": "blog_index", "q": "焦慮壓力" } },
        { "id": "sleep", "label": "睡眠議題", "target": { "type": "blog_index", "q": "睡眠議題" } },
        { "id": "boundaries", "label": "關係界線", "target": { "type": "blog_index", "q": "關係界線" } },
        { "id": "self-awareness", "label": "自我覺察", "target": { "type": "blog_index", "q": "自我覺察" } }
      ]
    },
    {
      "id": "book-recommendations",
      "label": "書籍推薦",
      "items": [
        { "id": "emotion-healing", "label": "情緒療癒", "target": { "type": "blog_index", "q": "情緒療癒" } },
        { "id": "relationship-repair", "label": "關係修復", "target": { "type": "blog_index", "q": "關係修復" } },
        { "id": "self-growth", "label": "自我成長", "target": { "type": "blog_index", "q": "自我成長" } },
        { "id": "healing-writing", "label": "療癒書寫", "target": { "type": "blog_index", "q": "療癒書寫" } },
        { "id": "parenting", "label": "親子教養", "target": { "type": "blog_index", "q": "親子教養" } }
      ]
    },
    {
      "id": "events",
      "label": "講座／活動",
      "items": [
        { "id": "recent-talks", "label": "近期講座", "target": { "type": "page", "path": "/platforms" } },
        { "id": "collaboration", "label": "合作邀請", "target": { "type": "page", "path": "/contact" } },
        { "id": "workshops", "label": "療癒工作坊", "target": { "type": "page", "path": "/platforms" } },
        { "id": "corporate-training", "label": "企業內訓", "target": { "type": "page", "path": "/platforms" } }
      ]
    },
    {
      "id": "about-contact",
      "label": "關於／聯絡",
      "items": [
        { "id": "about", "label": "心理師介紹", "target": { "type": "page", "path": "/about" } },
        { "id": "services", "label": "服務方式", "target": { "type": "page", "path": "/services" } },
        { "id": "faq", "label": "常見問題", "target": { "type": "page", "path": "/services", "hash": "#faq" } },
        { "id": "contact", "label": "聯絡表單", "target": { "type": "page", "path": "/contact" } }
      ]
    }
  ]
}
```
- FR-10（Header bar）：移除/不顯示「心理師療癒空間」置中標題 bar（依 `../../archive/DESIGN_SSOT.md` §1.3）。
- FR-11（講座邀請 CTA）：講座邀請按鈕寬度增加約 1cm 且視覺更接近圓形（保留可點/可識別）。
- FR-11.1（講座邀請 CTA 連結來源）：`company_settings.home_event_cta_url`（可選：`home_event_cta_label_zh`），且 URL 需通過 allowlist 驗證（至少 `https:` / `mailto:`）。
- FR-12（Home：文章推薦區）：最下方每一格是「文章封面卡」；推薦結果以 Umami + pgvector 做針對性推薦（fallback：最新/置頂文章）。

### Non-Functional (NFR)

- Performance：作品詳情頁載入 hotspots 的查詢成本可控（目標：≤ 1 額外 query；可被 cached）。
- Security：RLS：public 只能讀取可見作品的 hotspots；owner/editor 可完整 CRUD。
- Accessibility：pins 可鍵盤 focus；資訊卡有清楚的可讀文字與關閉方式；fallback list 在無 hover/小螢幕仍可使用。
  - ✅ **A11y Implementation**（PR-14）：Hotspot pins 使用 `tabIndex={0}`（自然 DOM tab order）；`aria-label` 包含「媒材標記 第 X 個，共 N 個：{媒材名稱}」語意標籤。
- Observability：至少能在 admin side 追溯變更（優先：沿用既有 admin history pattern；或最小化 server logging）。

---

## Open Questions

- None（2026-01-20：v2 URL + typed `target`、hotspots/hero 規格已整合寫死）

---

## Implementation Contract（寫死：避免 drift）

> 本段為「落地規格」的單一真相來源：DB 欄位、排序語意、Markdown 安全邊界、resolver contract、publish 驗證、快取失效與 canonical/redirect 規則皆以本段為準。
>
> 已整合並取代原 `doc/specs/proposed/gallery-hotspots-spec.md`（已封存：`doc/archive/2026-01-20-gallery-hotspots-spec.md`）。

### 0) SSoT paths（放哪裡：避免耦合與 drift）

- Schema / migrations：
  - `supabase/02_add/04_gallery.sql`（extend `gallery_pin_surface` + hero uniqueness）
  - `supabase/02_add/20_gallery_hotspots.sql`（new table + indexes + RLS + grants）
  - `supabase/COMBINED_ADD.sql`（mirror changes）
- Public routes（canonical）：
  - `app/[locale]/page.tsx`（Home Hero pins render）
  - `app/[locale]/gallery/items/[category]/[slug]/page.tsx`（Gallery item main image hotspots render）
  - `app/[locale]/blog/posts/[slug]/page.tsx`（v2：blog post canonical）
  - `app/[locale]/blog/categories/[slug]/page.tsx`（v2：blog category canonical）
  - `app/[locale]/gallery/categories/[slug]/page.tsx`（v2：gallery category canonical）
- Admin routes（TBD by UI，但 scope 寫死）：
  - `app/[locale]/admin/gallery/**`（hero selection + hotspots CRUD/reorder）
  - `app/[locale]/admin/content/hamburger_nav`（hamburger nav JSON editor：save/publish）
- IO modules（DB 操作集中於 `lib/modules/**`；符合 `ARCHITECTURE.md`）：
  - `lib/modules/gallery/gallery-pins-io.ts`（public reads; already exists）
  - `lib/modules/gallery/pins-admin-io.ts`（admin writes; extend for surface=`hero`）
  - `lib/modules/gallery/gallery-hotspots-io.ts`（public reads; new）
  - `lib/modules/gallery/hotspots-admin-io.ts`（admin CRUD + reorder; new）
  - `lib/modules/gallery/cached.ts`（cached wrappers; extend）
  - `lib/modules/content/site-content-io.ts`（save/publish `site_content`）
  - `lib/modules/content/cached.ts`（public reads; tag=`site-content`）
- Navigation v2（typed targets）：
  - Types：`lib/types/hamburger-nav.ts`（single source）
  - Validator（pure）：`lib/validators/hamburger-nav.ts`
  - Resolver（pure）：`lib/site/nav-resolver.ts`（target → canonical href）
  - Publish deep validate（DB）：`lib/modules/content/hamburger-nav-publish-io.ts`（只做「可公開目標」存在性驗證）
- Markdown pipeline（server-only）：
  - `lib/markdown/server.ts`（trusted admin markdown；**不得**用於 hotspots）
  - `lib/markdown/hotspots.ts`（new safe pipeline; server-only）

### A) Hotspots / Hero（DB + 排序 + Markdown 安全）

- Security model（寫死）：
  - RLS 是最終邊界：public 只能讀「作品可見 + hotspot 可見」，owner/editor 才能 CRUD
  - Public SSR 讀取必須使用 `createAnonClient()`（不得帶 cookies）並包在 `cachedQuery`
  - Admin write 必須使用 `createClient()`（帶 cookie context，依 RLS 授權）
  - Trust boundary：hotspots 會出現在 Home/Hero（曝光面最大），因此 markdown 必須走「更保守」pipeline（禁 raw HTML + sanitize）
- Hero selection（`gallery_pins(surface='hero')`）：
  - `public.gallery_pin_surface` 必須包含 `'hero'`
  - 必須保留既有不變式：`UNIQUE(surface, item_id)`（同一作品不可重複 pin 同 surface）
  - DB 必須保證 hero 永遠最多 1 筆（partial unique index：`UNIQUE(surface) WHERE surface='hero'`）
  - Admin 設定 hero：寫入前先清空舊 hero（或 upsert + transaction），避免靠 UI 邏輯維持不變式
  - `sort_order` 對 hero 無語意：寫入時固定 `0`（避免 UI 誤用排序）
- `gallery_hotspots`（new table；RLS 為最終邊界）：
  - Fields（寫死）：
    - `id UUID PK DEFAULT gen_random_uuid()`
    - `item_id UUID NOT NULL REFERENCES public.gallery_items(id) ON DELETE CASCADE`
    - `x DOUBLE PRECISION NOT NULL`（normalized `0..1`）
    - `y DOUBLE PRECISION NOT NULL`（normalized `0..1`）
    - `media TEXT NOT NULL`
    - `preview TEXT NULL`（一句話 preview）
    - `symbolism TEXT NULL`（象徵意涵）
    - `description_md TEXT NOT NULL`（Markdown 詳述；走 hotspots safe pipeline）
    - `read_more_url TEXT NULL`（optional；固定 CTA「延伸閱讀」）
    - `sort_order INTEGER NULL`（manual ordering；見下一節）
    - `is_visible BOOLEAN NOT NULL DEFAULT true`
    - `created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())`
    - `updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())`
  - Constraints（寫死）：
    - `CHECK (x >= 0 AND x <= 1)`
    - `CHECK (y >= 0 AND y <= 1)`
    - `CHECK (description_md <> '')`
  - Indexes（寫死最小集合）：
    - `INDEX (item_id)`
    - `INDEX (item_id, sort_order)`
  - RLS（寫死）：
    - public read：`gallery_hotspots.is_visible = true` 且關聯的 `gallery_items.is_visible = true`
    - admin manage：JWT `app_metadata.role` ∈ `{owner, editor}` 可 CRUD
  - Grants（寫死）：
    - `GRANT SELECT ON public.gallery_hotspots TO anon, authenticated;`
    - `GRANT INSERT, UPDATE, DELETE ON public.gallery_hotspots TO authenticated;`
- Hotspot ordering（per `item_id`）：
  - Auto mode：該作品所有 `sort_order` 皆為 `NULL`；read order：`ORDER BY y ASC, x ASC, created_at ASC`
  - Manual mode：該作品所有 `sort_order` 皆為非 `NULL`；read order：`ORDER BY sort_order ASC, created_at ASC`
  - 進入 manual mode：第一次「拖曳排序並儲存」時，必須把全部 hotspots 的 `sort_order` 寫滿 `0..n-1`
  - 新增 hotspot：
    - Auto mode：`sort_order = NULL`
    - Manual mode：`sort_order = max(sort_order)+1`（永遠 append 到最後，不打亂既有敘事順序）
  - Update rule：拖曳 pin 改 `x/y` 不得修改 `sort_order`；只有「清單拖曳排序」儲存時才更新 `sort_order`
  - Reorder API contract（寫死）：
    - input：同作品的 ordered hotspot ids（完整清單）
    - output：server 以該順序覆寫 `sort_order=0..n-1`（last-write-wins；可選加入 `updated_at` precondition）
- Hotspots Markdown safety boundary（更保守）：
  - 禁 raw HTML（不得沿用 `site_content`/blog 的 trusted markdown pipeline）
  - sanitize/allowlist（GFM subset）
  - links：只允許 `https:`（可選 `mailto:`）；強制 `target="_blank"` + `rel="noopener noreferrer"`
  - 若 sanitize 後內容為空：視為 invalid，必須阻止儲存/發布並提示修正

### B) Hamburger nav v2（typed targets + resolver）

- Storage：`site_content(section_key='hamburger_nav')` 儲存 versioned JSON（`version=2`），**items 只存 typed `target`，不得存 raw `href`**。
- `target` allowlist 與 canonical href（必須遵守 `FR-9.5.3` 表格）：
  - Blog：`/blog`、`/blog/categories/<categorySlug>`、`/blog/posts/<postSlug>`
  - Gallery：`/gallery`、`/gallery/categories/<categorySlug>`、`/gallery/items/<categorySlug>/<itemSlug>`
  - 其餘：`page`、`anchor`、`external`
- Resolver contract（單一真相來源）：
  - 必須存在一個 server-side resolver（pure function），輸入：`HamburgerNavV2`，輸出：render-ready items（包含 canonical `href`、`isExternal`、外連 attrs）。
  - Resolver 只負責「target → canonical href」，不做 DB 查詢；DB 存在性驗證只在 publish 流程做。

### C) Publish 驗證（寫死；適用於 `hamburger_nav`）

- Save（draft）驗證（不查 DB）：
  - JSON schema 合法、`target.type` 必須在 allowlist、slugs 格式必須通過 slug validator、external URL 只允許 `https:`（可選 `mailto:`）
- Publish（public）deep validate（要查 DB；你已拍板：**不允許存在但不可見**）：
  - `blog_post`：目標文章必須存在且 `visibility='public'`
  - `blog_category`：目標分類必須存在
  - `gallery_item`：目標作品必須存在且 `is_visible=true`
  - `gallery_category`：目標分類必須存在且 `is_visible=true`
  - 若任一 internal target 無法解析到「可公開目標」，publish 必須失敗並回傳可定位的錯誤（含 JSON path）

### D) Cache / Revalidation（寫死）

- Hotspots CRUD/reorder/hero selection：必須 `revalidateTag('gallery')`，並視需要補 `revalidatePath('/[locale]')`、`revalidatePath('/[locale]/gallery/**')`。
- `hamburger_nav` publish/unpublish/update：必須 `revalidateTag('site-content')`。
- `company_settings`（notice/event CTA/hotspots max）更新：必須 `revalidateTag('company-settings')`。

### E) Canonical / Redirect（寫死；永久 redirect 301/308）

- Public 頁面只承認本 PRD 定義的 v2 canonical URLs（見 `FR-9.5`）。
- 任何非 canonical URL（包含 query-based category、舊的 path 形態）必須 **永久 redirect（301/308；Next App Router 的 `permanentRedirect()` = 308）** 到 canonical，以避免同一內容多網址造成重複與 drift。

---

## Implementation Status（2026-01-21）

- Implemented behavior (SSoT): `../../SPEC.md`
- Pending / planned work: `../../ROADMAP.md`
- Drift tracker / stable `@see`: `../../../uiux_refactor.md`
- ✅ Admin hotspots editor 已支援「拖曳 pin 直接改座標」（x/y）（PR-13）。
- ✅ Hotspot pins a11y：移除正數 `tabIndex`，使用自然 tab order（PR-14）。
- ✅ Home JSON-LD SSoT 化：`siteName`/描述 fallback chain（PR-15）。
- ✅ Home data plumbing：single data owner，避免重複 fetch（PR-16）。
- ✅ SEO contract：Gallery item canonical category 修正已使用 `permanentRedirect()`（308）（PR-17；guardrail test：`tests/seo-canonical-redirects.test.ts`）。
- ✅ Hotspots UI clean-code：fallback list 已改用 React `useId()` 避免固定 DOM id collision（PR-18；guardrail test：`tests/hotspot-fallbacklist-id.test.ts`）。
- ✅ Security（FR-11.1）：Home「講座邀請」CTA URL allowlist validation 已落地（`https:`/`mailto:`）（PR-20；write-side + render-side hardening；guardrail test：`tests/validators/external-url.test.ts`）。

---

## Related

- Constraints: `../../../ARCHITECTURE.md`
- Docs hub: `../../README.md`
- Analytics PRD: `./ANALYTICS_PERSONALIZATION_UMAMI.md`
