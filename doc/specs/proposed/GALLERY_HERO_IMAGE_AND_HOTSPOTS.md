# Home（UIUX 跟稿）+ Gallery Hero Image + Image Hotspots（圖上 Pin）- Product Requirements Document (PRD)

> **Version**: 0.7  
> **Last Updated**: 2026-01-19  
> **Status**: Draft  
> **Owner**: Admin / Product  
> **Parent Document**: (optional) `../../SPEC.md`

本 PRD 聚焦（Phase 1）：

1) **Home 排版照 `uiux/`**（只涵蓋 Home；Gallery list 維持既有 pinterest-like 瀑布流）  
2) **Home Hero 圖片可由 Gallery 作品中自選**（後台管理員設定）  
3) **Gallery Item 圖片支援「圖上標記（Hotspots）」**：管理員可在圖片任意位置新增多個 pin，並可選擇是否填「一句話 preview / 象徵意涵」，且「詳細描述」支援 Markdown；前台（含 Home Hero）可互動呈現

補充：目前此專案暫訂 **zh（繁中）為主**；i18n 欄位可保留但 Phase 1 不強制填寫。

---

## TL;DR

- Admin：上傳/編輯 Gallery 作品時即可在圖片上新增/拖曳/編輯多個 hotspots（媒材/象徵意涵/Markdown 詳述）；並可指定其中一張作品作為 Home Hero 圖片。
- Public：Home Hero 會顯示選定作品的圖片與 hotspots（同一份資料）；Gallery list 維持瀑布流；作品詳情頁主圖同樣可互動顯示 hotspots（並提供行動裝置/無障礙 fallback）。

---

## Design SSoT（UIUX / Figma）

- Figma Site（提供檢視/分享）：https://pond-bulk-99292481.figma.site/
- Figma Design（原始檔案）：https://www.figma.com/design/HeXn2lGfcxUUk3zhA81heF/Therapist-Content-Website-UI
- Local UIUX prototype（程式版設計稿）：`uiux/`
  - Home（含 hero pins + detail card）：`uiux/src/app/pages/home-page.tsx`
  - Pins（座標採百分比）：`uiux/src/app/components/artwork-stage.tsx`
  - Detail card（modal/drawer 行為參考）：`uiux/src/app/components/material-detail.tsx`

> 本 repo 的 `uiux/` 是獨立 Vite prototype（Tailwind v4 + Radix/MUI 等），用來當 UI/排版 SSoT；不代表可直接搬進 Next.js production bundle。

**Route 對照（暫定）**

| Next route（實作） | UIUX 參考 | 用法（本 PRD） |
| --- | --- | --- |
| `/[locale]/` | `uiux/src/app/pages/home-page.tsx` | Hero 以「選定 gallery item 圖片」作為主視覺，pins/卡片互動風格對齊 |
| `/[locale]/gallery/[category]/[slug]` | `uiux/src/app/components/artwork-stage.tsx` + `uiux/src/app/components/material-detail.tsx` | 作品主圖疊 hotspots，點擊展開媒材詳情 |
| `/[locale]/gallery` |（uiux 未提供對應頁） | 需補設計稿，或以現有 masonry/卡片風格延伸 |

---

## Decisions（關鍵決策；避免寫成 step plan）

| Topic | Decision | Why |
| --- | --- | --- |
| Design SSoT | `uiux/` 內的設計稿作為排版 SSoT | 避免「設計/實作」各自漂移 |
| Primary locale | Phase 1：zh only（繁中）；schema 可保留 `*_en` 但不強制 | 降低首版成本，避免 UI/內容被 i18n 拖慢 |
| Home coverage | 「跟稿」只涵蓋 Home；Gallery list 維持既有 pinterest-like 瀑布流 | 避免大改動，保留既有 gallery UX |
| Hero image source | 以 `gallery_items.id` 指向 Gallery 作品 | 單一來源，重用現有圖片/metadata |
| Hero selection storage | 沿用 `gallery_pins`，新增 `surface = 'hero'` 並限制最多 1 筆 | 內容選擇用關聯表，且可沿用既有 pins 管理模式 |
| Hero hotspots | Hero 顯示「所選作品的 hotspots」 | 管理員只需維護一份 hotspot 資料 |
| Hotspot vs Featured naming | 圖上 pin 在 DB/API 以 `hotspot` / `annotation` 命名，不用 `pin` | 專案已存在 `gallery_pins`（置頂精選），避免語意混淆 |
| Hotspot coordinates | 儲存 normalized `x`/`y`（0..1）相對於圖片原始尺寸 | 響應式縮放穩定，不需存 pixel |
| Hotspot fields | `media` + `description_md` 必填；`preview` / `symbolism` 選填 | 滿足「可自定義要不要包含」且 schema 簡單 |
| Hotspot max | 上限以 `company_settings.gallery_hotspots_max` 控制（default: `12`） | 可營運調整，避免 UI 過度擁擠 |
| Hotspot order | Default：按座標自動排序（`y→x`）；Admin 可手動拖曳排序並持久化 | 兼顧「不用維護」與「可控敘事順序」 |
| New hotspot insertion | 若管理員已手動排序，新增 hotspot 一律 append 到最後 | 避免新增行為打亂既有敘事順序 |
| Markdown | hotspots 的 `description_md` 支援 Markdown（GFM subset），**不允許 raw HTML**；允許外連但僅允許 `https:`（可選 `mailto:`）；sanitize/allowlist | 內容會出現在 Home/Hero，採較保守的 trust boundary |
| External links | 所有外連強制 `target="_blank"` + `rel="noopener noreferrer"` | 避免 tabnabbing，且是標準安全作法 |
| Home recommendations | Home 文章推薦以 `ANALYTICS_PERSONALIZATION_UMAMI.md` 作為決策 SSoT（Umami + pgvector） | 避免重複定義個人化規則造成 drift |
| Header nav labels | 既有 header links labels 持續使用 `site_content(section_key='nav')` | 避免破壞既有 header 對 `nav` 的資料結構假設 |
| Hamburger nav source | Hamburger menu 的 IA 由 `site_content(section_key='hamburger_nav')` JSON 定義 | 可後台編輯，且不與 `nav` labels 混用 |
| Event CTA URL | 「講座邀請」連結來源：`company_settings.home_event_cta_url`（可選：`home_event_cta_label_zh`） | 需後台可編輯且可驗證 URL |
| Marquee notice content | 來源：`company_settings.home_notice_label_zh` + `company_settings.home_notice_text_zh` | 需後台可編輯，且不需要 JSON 編輯器 |

---

## Scope

### In Scope

- Home：排版/互動跟 `uiux/`（包含 marquee notice、hamburger menu、hero stage、suggest section）
- Gallery list：維持既有 pinterest-like 瀑布流（不跟 `uiux/` 變更）
- Hero 圖片：後台可從 Gallery 作品選擇/清除；前台 Hero render + fallback 行為
- Hotspots：DB schema + RLS、後台 CRUD + 拖曳定位、前台互動呈現（含 Home Hero + Gallery detail）+ fallback list
- Home 個人化推薦：最下方文章卡片以「文章封面」呈現，推薦邏輯對齊 `ANALYTICS_PERSONALIZATION_UMAMI.md`
- Home 設定可調：marquee notice 文案、講座邀請 URL、hotspots 上限
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
- FR-2（Admin：Hotspot 欄位）：每個 hotspot 必填：
  - `media`（媒材名稱，text）
  - `description_md`（詳細描述，Markdown）
  並可選填：
  - `preview`（一句話 preview）
  - `symbolism`（象徵意涵）
- FR-2.1（Admin：Hotspot 上限）：每個作品最多 hotspots 數量由 `company_settings.gallery_hotspots_max` 控制；超過上限時 UI 需阻止新增並提示。
- FR-2.2（Admin：Hotspot 順序）：同一作品的 hotspots 預設依座標自動排序（`y→x`）；管理員可在「hotspot 清單」用拖曳調整順序並儲存，前台 fallback list 與 keyboard focus 順序需跟隨此順序。
- FR-2.3（Admin：新增 hotspot 的插入規則）：若管理員已做過手動排序，後續新增的 hotspot 一律 append 到最後（不做自動插入）。
- FR-3（Admin：Hero 選擇）：管理員可在後台選擇 0..1 個 Gallery 作品作為 Home Hero 圖，並可清除設定。
- FR-4（Home：Hero 版型）：Hero 圖片「靠右」且被不規則框（blob mask）包覆（參考 `uiux` + 附圖）；左側保留「清楚的標語」/hero 文案/CTA，且可由後台編輯（沿用 `site_content(section_key='hero')`）。
- FR-5（Home：Hero hotspots）：Hero render 時同時顯示「該作品的 hotspots」，互動行為如下：
  - Hover：pin 會原地有互動（縮放/輕微懸浮/顏色加深，至少其一；需與 `uiux` 的 motion 行為一致）
  - Click/Tap：出現資訊圖卡（modal card）
  - Close：點擊 `X` 或點擊卡片外（backdrop）關閉
- FR-6（Gallery list）：維持既有 pinterest-like 瀑布流（card/masonry 行為不改）。
- FR-7（Gallery detail）：作品詳情頁主圖顯示 hotspots；hover/click/tap 展開資訊卡（媒材 + Markdown 詳述 + optional preview/symbolism）。
- FR-8（Marquee notice）：跑馬燈內容以「Notice + 宣傳文」視為同一段完整資訊一起跑；Notice 標示為橘色底。
- FR-8.1（Marquee notice 文案來源）：`company_settings.home_notice_label_zh` + `company_settings.home_notice_text_zh`；若缺少則 fallback 到內建預設值（需寫在 code constants）。
- FR-9（Header / Nav）：左上 hamburger menu 往右展開；選單橫向呈現在上方；細項再往下展開（accordion）。
- FR-9.1（Hamburger menu IA 來源）：`site_content(section_key='hamburger_nav')`（zh JSON），用於渲染分類與細項連結。
- FR-10（Header bar）：移除/不顯示「心理師療癒空間」置中標題 bar（依 `uiux/src/app/components/header-bar.tsx` 調整）。
- FR-11（講座邀請 CTA）：講座邀請按鈕寬度增加約 1cm 且視覺更接近圓形（保留可點/可識別）。
- FR-11.1（講座邀請 CTA 連結來源）：`company_settings.home_event_cta_url`（可選：`home_event_cta_label_zh`），且 URL 需通過 allowlist 驗證（至少 `https:` / `mailto:`）。
- FR-12（Home：文章推薦區）：最下方每一格是「文章封面卡」；推薦結果以 Umami + pgvector 做針對性推薦（fallback：最新/置頂文章）。

### Non-Functional (NFR)

- Performance：作品詳情頁載入 hotspots 的查詢成本可控（目標：≤ 1 額外 query；可被 cached）。
- Security：RLS：public 只能讀取可見作品的 hotspots；owner/editor 可完整 CRUD。
- Accessibility：pins 可鍵盤 focus；資訊卡有清楚的可讀文字與關閉方式；fallback list 在無 hover/小螢幕仍可使用。
- Observability：至少能在 admin side 追溯變更（優先：沿用既有 admin history pattern；或最小化 server logging）。

---

## Open Questions

- Hero 空狀態：若未選定 hero 圖片，要顯示什麼？（建議 A：仍顯示 hero 文字 + 右側空畫框背景；B 直接 fallback 到現有 HeroSection 文字版）
- Hotspot 卡片的「延伸閱讀」：要不要做成獨立欄位（例如 `read_more_url`）以便渲染成固定 CTA？（建議：做欄位）或讓管理員直接在 Markdown 放連結即可？
- Hamburger nav JSON schema：你希望長什麼樣？（我可提供一個建議 schema；需要你確認分類與細項的命名/排序/是否允許外連）

---

## Technical Spec（可選；若已有 specs，這裡只放連結）

- 建議在落地前新增單一功能 spec（DB schema + contracts + sanitize/link allowlist + cache revalidation）：`doc/specs/proposed/gallery-hotspots-spec.md`

---

## Implementation Status（2026-01-19）

- Implemented behavior (SSoT): `../../SPEC.md`
- Pending / planned work: `../../ROADMAP.md`
- Drift tracker / stable `@see`: `../../../uiux_refactor.md`

---

## Related

- Constraints: `../../../ARCHITECTURE.md`
- Docs hub: `../../README.md`
- Analytics PRD: `./ANALYTICS_PERSONALIZATION_UMAMI.md`
