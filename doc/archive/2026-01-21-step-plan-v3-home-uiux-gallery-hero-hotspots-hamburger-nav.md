# 2026-01-21 - Step Plan V3（Home UIUX + Gallery Hero/Hotspots + Hamburger Nav v2）(Archive)

> Date: 2026-01-21  
> Status: COMPLETE ✅ (Archived snapshot; active plan lives in `../meta/STEP_PLAN.md`)  
> Scope: historical step plan + completed PR breakdown (not SSoT)

## Summary

- What shipped: PR-13..PR-16（Admin hotspots drag-to-move、hotspot pins a11y、Home JSON-LD SSoT 化、Home single data owner 去重 fetch）
- Why archive: `doc/meta/STEP_PLAN.md` 只保留 active drift / 下一步，已完成內容移到 archive 避免干擾
- Canonical behavior (SSoT): `../SPEC.md`
- Constraints: `../../ARCHITECTURE.md`
- PRD contract: `../specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`

## Archived Snapshot（verbatim）

# Step-by-Step Execution Plan — V3（Home UIUX + Gallery Hero/Hotspots + Hamburger Nav v2）

> 狀態: Active（Drift repair plan；本檔只寫「修復方案/步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-21（drift review refresh）  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> 目標 PRD（約束/合約）: `doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`（Implementation Contract）
> 歷史完成紀錄（V2 snapshot；PR-9..PR-12）：`doc/archive/2026-01-21-step-plan-v2-home-uiux-gallery-hotspots-hamburger-nav.md`

---

## 0) 必讀（SSoT / Guardrails）

- Architecture / 全域約束：`ARCHITECTURE.md`
- 已落地行為（SSoT）：`doc/SPEC.md`
- 目標 PRD（contract）：`doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`
- Security / RBAC / RLS / secrets：`doc/SECURITY.md`
- Ops / DB / go-live：`doc/RUNBOOK.md`（細節：`doc/runbook/*`）
- 文件分工 / update matrix：`doc/GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see` index）：`uiux_refactor.md`

---

## 1) Repo 現況（以工具輸出為準；2026-01-21）

- `npm test`：pass（含 `tests/architecture-boundaries.test.ts`）
- `npm run type-check`：pass（`tsconfig.typecheck.json`；exclude `uiux/` + `.next/**`）
- `npm run lint`：pass
- `npm run build`：若未設 `NEXT_PUBLIC_SITE_URL`，production collect phase 會 fail-fast（設計如此；見 `lib/site/site-url.ts` 與 `doc/runbook/deployment.md`）

---

## 2) Drift / Clean-code 問題清單（Active）

> 本節只列「尚未修復」的飄移/技術債；已完成項不再保留在本檔（避免干擾後續執行）。

### ~~Drift-2（RESOLVED by PR-14）：Hotspot pins a11y：`tabIndex` 使用正數~~ ✅

- **已修復**：PR-14 將 `tabIndex={index+1}` 改為 `tabIndex={0}`，使用自然 DOM tab order。

### ~~Drift-3（RESOLVED by PR-15）：Home JSON-LD `siteName` fallback 硬編品牌字串~~ ✅

- **已修復**：PR-15 實作 SSoT fallback chain（`company_settings` → `site_content` → `next-intl`），移除硬編品牌 fallback。

### Drift-4（renumbered）：~~Home server fetch 重複（同一 request 內重複讀 `company_settings`）~~ ✅

- **已修復**：PR-16 實作 single data owner pattern，`app/[locale]/page.tsx` 作為唯一資料來源，`HomePageV2` 改為接收 props。

---

## 3) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

### PR-13 — Admin Hotspots：pin drag-to-move（PRD contract 對齊） ✅ COMPLETED

Goal：在 `/[locale]/admin/gallery/[id]` 允許直接拖曳 pin 調整座標（x/y），並安全持久化（不改 sort_order）。

**實作完成項目（Implemented）：**

1. ✅ **Pure helper**：`lib/modules/gallery/hotspot-coordinates.ts`（`toNormalizedCoords` + `isDragMovement` + clamp）
2. ✅ **Tests**：`tests/hotspot-coordinates.test.ts`（邊界、NaN/Infinity guard、drag threshold）
3. ✅ **Admin UI**：`app/[locale]/admin/gallery/[id]/GalleryItemDetailClient.tsx`
   - Pointer events (`onPointerDown/Move/Up/Cancel`) with `setPointerCapture`
   - Drag threshold (< 4px = click, ≥ 4px = drag)
   - Optimistic UI update with rollback on error
   - Visual feedback during drag (scale + opacity + shadow)
4. ✅ **A11y**：`aria-label` 包含序號與媒材名稱；`title` 顯示操作提示
5. ✅ **排序語意**：只更新 `x/y`，不修改 `sort_order`
6. ✅ **驗證**：`npm test` / `npm run lint` / `npm run type-check` all pass
7. ✅ **文件同步**：`doc/SPEC.md` + `doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md` updated

DoD：

- ✅ Admin 能拖曳 pin 更新 x/y（mouse + touch）
- ✅ 不影響 sort_order/敘事排序
- ✅ `npm test`、`npm run lint`、`npm run type-check` 皆通過

---

### PR-14 — Hotspot pins a11y / clean code（移除正數 tabindex） ✅ COMPLETED

Goal：Hotspot pins 使用自然 tab order，避免正數 tabindex，並提升可測試性。

**實作完成項目（Implemented）：**

1. ✅ `components/hotspots/HotspotPinClient.tsx`
   - 移除 `tabIndex={index+1}`，改為 `tabIndex={0}`（自然 DOM tab order）
   - 將 `index` 重新命名為 `displayIndex`（更語意化，1-based）
   - 新增 `totalCount` prop 供 aria-label 使用
   - `aria-label` 改為「媒材標記 第 X 個，共 N 個：{媒材名稱}」語意標籤
2. ✅ `components/hotspots/HotspotOverlay.tsx`
   - 更新為傳遞 `displayIndex`（1-based）、`totalCount`、`mediaLabel`
   - pins 的 render order = ordering semantics（由 server 排序；不重排）
3. ✅ 驗收
   - `npm test`、`npm run lint`、`npm run type-check` 皆通過
4. ✅ 文件同步
   - `doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`（NFR a11y note）

DoD：

- ✅ 無正數 tabindex
- ✅ keyboard + SR 行為不退化

---

### PR-15 — Home JSON-LD SSoT 化（ARCHITECTURE compliance） ✅ COMPLETED

Goal：移除硬編品牌 fallback；Home JSON-LD 的 `siteName`/品牌欄位由資料源驅動。

**實作完成項目（Implemented）：**

1. ✅ `app/[locale]/page.tsx`
   - 新增 `resolveSiteName()` helper，實作 SSoT fallback chain：
     1. `company_settings.company_name_short`
     2. `site_content(section_key='metadata')` title
     3. `next-intl` `metadata.title`
   - 新增 `resolveSiteDescription()` helper，從 site_content 或 i18n 取得描述
   - 移除硬編品牌 fallback `'QN LNK'`
   - 移除硬編描述 `'建構連結社群的量子啟發數位解決方案'`
2. ✅ FAQ 清理
   - 移除 template FAQ（非產品特定內容）
3. ✅ Guardrail 測試
   - `tests/home-jsonld-ssot.test.ts`：檢查 page.tsx 不包含硬編品牌 fallback（regex assert）
4. ✅ 驗收
   - `npm test`、`npm run lint`、`npm run type-check` 皆通過

DoD：

- ✅ `siteName` 不再硬編
- ✅ 測試全通過

---

### PR-16 — Home data plumbing（去重 fetch；提升可讀性）✅ COMPLETED

Goal：Home 的 `company_settings` / `site_content` 只 fetch 一次，資料 flow 清楚。

**實作完成項目（Implemented）：**

1. ✅ **Single Data Owner**：`app/[locale]/page.tsx` 作為唯一資料來源
   - 整合所有 fetch：`settings`, `services`, `siteContent`, `hamburgerNav`, `heroPins`
   - 統一處理 `heroHotspots` 的 markdown → HTML 轉換
   - 使用 `Promise.all()` 並行 fetch 提升效能
2. ✅ **HomePageV2 Props 重構**：`components/home/HomePageV2.tsx`
   - 移除內部 fetch 邏輯（原本重複呼叫 `getCompanySettingsCached()` 與 `getPublishedSiteContentCached()`）
   - 定義明確的 `HomePageV2Props` interface
   - 新增 `HotspotWithHtml` type export 供 page.tsx 使用
3. ✅ **Clean Code 原則**
   - 資料流單向：page.tsx → HomePageV2 → 子元件
   - 明確的 prop 類型定義
   - JSDoc 註解說明架構合規性
4. ✅ **驗收**
   - `npm test`（1037 tests pass）
   - `npm run lint` pass
   - `npm run type-check` pass

DoD：

- ✅ Home data fetch single place
- ✅ 行為不變、測試全通過

## 4) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run build`（routes/SEO/redirect 相關 PR 必跑）

