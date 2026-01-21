# Design SSoT（最終權威）— Home UIUX v2 + Gallery Hero/Hotspots + Hamburger Nav v2

> **Status**: Active（Design SSoT / 最終權威）  
> **Last Updated**: 2026-01-21  
> **Scope**: Home（UIUX v2）/ Gallery Hero Image / Image Hotspots / Hamburger Nav v2（IA + motion）  
> **Contract**: `doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`（PRD/Implementation Contract）  
> **Implemented SSoT**: `doc/SPEC.md`（已落地行為；若與本檔衝突，以本文為設計最終權威、並在 `doc/meta/STEP_PLAN.md` 建 drift 修復）  

本檔是 **純文件** 的 Design SSoT；不再以 `uiux/` 程式原型當 SSoT。`uiux/` 僅作為 prototype/實驗資料夾（可移除），任何設計決策以本文為準。

---

## 0) 設計守則（避免 drift）

1. **單一權威**：設計/交互/排版/動態的最終答案在本檔；程式碼需對齊本檔與 PRD。  
2. **可測試/可回歸**：互動行為需能以 unit/integration 測（至少：pin modal、fallback list、hamburger nav）。  
3. **低 client bundle**：避免為了 icon/motion 引入重型依賴；可用 inline SVG + CSS animations。  
4. **可及性**：keyboard 可操作、focus 可見、ESC/backdrop 可關閉、重要資訊有非 hover 的 fallback。  
5. **SEO 不犧牲**：主要內容（文案/連結）優先 SSR；互動以 client component 加強即可。  

---

## 1) Home（UIUX v2）— 版面總覽

### 1.1 全頁基底

- 背景：暖白系（例如 `#F5F2EA`），整體視覺偏「紙質/療癒」。
- Layout：`Header（sticky）` + `Main` + `Footer`。

### 1.2 Marquee Notice（頂部跑馬燈）

- 位置：頁首最上方，固定高度（約 40px），底線分隔。
- 結構：左側固定 label（橘色 badge）；右側為循環滾動文字（至少重複 3 次以無縫循環）。
- 動作：
  - **滑鼠 hover 暫停**（可讀性）。
  - 速度：以「可讀」為主；建議以內容寬度換算（約 50 px/s，最短 15s）。

### 1.3 Header Bar（Hamburger）

- 位置：sticky top，半透明背景 + blur，底線分隔。
- 元件：僅保留 **左側 hamburger**（不置中標題）。
- 動作：hamburger 三條線變換為 X（200ms 左右、ease-out）。
- 可及性：`aria-label`、`aria-expanded`；keyboard 可操作。

### 1.4 Side Nav（左側抽屜選單）

- 覆蓋層：全螢幕半透明灰 + blur；點擊覆蓋層關閉。
- 抽屜：左側滑入（300ms ease-out），寬 320px 上限 85vw，可捲動。
- 關閉方式：
  - 點 overlay
  - 點選任一 item
  - ESC
  - 開啟時鎖 body scroll
- 群組呈現：accordion（展開/收合）；右側箭頭旋轉 180° 表示展開。

---

## 2) Home Hero（右側 Blob Artwork Stage）

### 2.1 Hero 區塊（Two-column）

- Desktop（`lg+`）：兩欄
  - 左：標語/lead/CTA
  - 右：Blob artwork stage（hero 圖 + hotspots）
- Mobile：單欄；hero 圖優先顯示（文字區塊在後或下方，依實作一致即可）。

### 2.2 左側文案（Hero Copy）

- Title：大字（約 `text-4xl ~ text-6xl`）、深灰字。
- Lead：中等字級、次要灰字、行高偏鬆。
- CTA：橘色圓角膠囊按鈕；hover 加深、可輕微 scale；可用 `a` 連結（SSR 友善）。

### 2.3 右側 Stage（Blob mask + 紙質質感）

- 容器：blob border-radius（不規則圓角），背景有紙質 noise overlay（`pointer-events: none`）。
- 圖片：cover 填滿 blob 容器；hero 有資料時顯示作品主圖。
- Empty state：未選 hero 圖時仍顯示 blob placeholder（保持版面不跳動；不顯示 pins）。

---

## 3) Hotspots（圖上 Pin）— 交互與樣式

### 3.1 Pin（Hotspot）外觀

- 形狀：有機 blob（`47% 53% 45% 55% / 52% 48% 52% 48%` 類）。
- 尺寸：mobile 約 32px；desktop 約 40px。
- 色彩：
  - Default：深紅/磚紅（例如 `#CC5544`）
  - Active：暖橘（例如 `#F3AE69`）
- 動作：
  - hover：輕微放大 + 微上移
  - active：放大（例如 1.1）+ 更強陰影
- 座標：以 normalized `x/y (0..1)` 對應百分比定位，並以 `translate(-50%,-50%)` 對齊中心點。

### 3.2 互動流程（點擊 → modal）

- 點擊 pin：開啟 modal 卡片，顯示媒材詳情。
- 再次選擇其他 pin：切換 modal 內容（不用先關閉）。
- 關閉方式：
  - 點 backdrop
  - ESC
  - 點右上角 close
- 可及性：
  - pin 可 tab（順序使用 index + 1）
  - modal 需 focus trap、開啟時將焦點放到 close，關閉後回復先前焦點

### 3.3 Mobile/無障礙 fallback（List）

- Hotspots 存在時，在 stage 下方顯示可收合 list：
  - Toggle 文案示例：`媒材詳情 (N)`
  - 展開後列出每個 hotspot（含序號、媒材名稱、可選 preview）
  - 點選 list item 等同選 pin（開啟/切換 modal）

### 3.4 Modal Card（媒材詳情）

- 結構：
  - 標題：`media`
  - 可選一行 preview（斜體/次要字）
  - `description_md`：以 Markdown 轉 HTML（prose）
  - `symbolism`：有值才顯示
  - `read_more_url`：有值才顯示「延伸閱讀」外連 CTA
- 視覺：暖白半透明 + blur、圓角、陰影、細邊框（primary/橘色系）。

---

## 4) Floating FAB（講座邀請）

- Desktop：固定在左側靠下（約 `bottom: 25%`），呈現「膠囊按鈕 + 外連 icon」；hover 可輕微 scale。
- Mobile：固定左下角；第一次點擊展開顯示文字，再次點擊才外連（避免誤觸）。
- 外連：`target="_blank"` + `rel="noopener noreferrer"`（安全）。

---

## 5) Suggest Section（推薦文章）

- Section title：小字 uppercase + 寬字距（例如 `Suggest`）。
- Desktop：4 欄卡片 grid。
- Mobile：水平 scroll（每張卡固定寬度約 280px）。
- 卡片：
  - 高度約 256px
  - 背景暖色系、圓角
  - 右上角裝飾幾何/blob（circle/square/triangle/blob），hover 時輕微位移
  - 標題位於底部，左對齊

---

## 6) Hamburger Nav v2（IA seed）

> 本節定義預設 IA（labels），作為 admin seed 的設計權威；實際 `href` 由 PRD 的 target resolver contract 決定。

Groups（順序固定）：

1. 身心健康衛教：情緒照顧 / 焦慮壓力 / 睡眠議題 / 關係界線 / 自我覺察  
2. 書籍推薦：情緒療癒 / 關係修復 / 自我成長 / 療癒書寫 / 親子教養  
3. 講座／活動：近期講座 / 合作邀請 / 療癒工作坊 / 企業內訓  
4. 關於／聯絡：心理師介紹 / 服務方式 / 常見問題 / 聯絡表單  

---

## Appendix A) 從 `uiux/` 萃取的對照（僅供追溯）

> 本節用於協助刪除 `uiux/` 前的 traceability；不作為最終權威來源。

- Home prototype entry：`uiux/src/app/pages/home-page.tsx`
- Marquee：`uiux/src/app/components/marquee-notice.tsx`
- Header/SideNav：`uiux/src/app/components/header-bar.tsx`、`uiux/src/app/components/side-nav.tsx`
- Artwork stage/pin：`uiux/src/app/components/artwork-stage.tsx`
- Detail card：`uiux/src/app/components/material-detail.tsx`
- Floating FAB：`uiux/src/app/components/floating-fab.tsx`
- Suggest：`uiux/src/app/components/suggest-section.tsx`

