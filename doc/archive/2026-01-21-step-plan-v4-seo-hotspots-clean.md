# 2026-01-21 - Step Plan V4（SEO canonical redirects + Hotspots a11y/clean-code）(Archive)

> Date: 2026-01-21  
> Status: COMPLETE ✅ (Archived snapshot; active plan lives in `../meta/STEP_PLAN.md`)  
> Scope: historical step plan + completed PR breakdown (not SSoT)

## Summary

- What shipped: PR-17..PR-18（Gallery item canonical category 永久 redirect 308；Hotspot fallback list 改用 `useId()` 避免固定 id collision）
- Why archive: `doc/meta/STEP_PLAN.md` 只保留 active drift / 下一步；已完成內容移到 archive 避免干擾
- Canonical behavior (SSoT): `../SPEC.md`
- Constraints: `../../ARCHITECTURE.md`
- PRD contract: `../specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`

## Archived Snapshot（verbatim）

# Step-by-Step Execution Plan — V3（Home UIUX + Gallery Hero/Hotspots + Hamburger Nav v2）

> 狀態: Active（Drift repair plan；本檔只寫「修復方案/步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-21（drift review refresh）  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> 目標 PRD（約束/合約）: `doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`（Implementation Contract）
> 歷史完成紀錄：
>
> - V2 snapshot（PR-9..PR-12）：`doc/archive/2026-01-21-step-plan-v2-home-uiux-gallery-hotspots-hamburger-nav.md`
> - V3 snapshot（PR-13..PR-16）：`doc/archive/2026-01-21-step-plan-v3-home-uiux-gallery-hero-hotspots-hamburger-nav.md`

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

### Drift-SEO-1（COMPLETED ✅）：Gallery item canonical redirect 已改為 `permanentRedirect()`（308）

- **Status**: Fixed in PR-17 (2026-01-21)
- **Fix Summary**:
  - 程式碼修改：`app/[locale]/gallery/items/[category]/[slug]/page.tsx` 使用 `permanentRedirect()`
  - Guardrail test：`tests/seo-canonical-redirects.test.ts`
  - 文件同步：`uiux_refactor.md` §4 item 12, `doc/SPEC.md` Gallery 章節

### Clean-1（COMPLETED ✅）：Hotspot fallback list 改用動態 `useId()` 避免 DOM id collision

- **Status**: Fixed in PR-18 (2026-01-21)
- **Fix Summary**:
  - 程式碼修改：`components/hotspots/HotspotFallbackList.tsx` 使用 React `useId()` hook
  - Guardrail test：`tests/hotspot-fallbacklist-id.test.ts`
  - 文件同步：`uiux_refactor.md` §4 item 13, `doc/meta/STEP_PLAN.md` PR-18

---

## 3) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

### PR-17 — SEO：Gallery item canonicalization 改為永久 redirect（ARCHITECTURE compliance）✅ COMPLETED

> **Status**: ✅ Completed (2026-01-21)

Goal：當 `slug` 跨分類唯一且 URL 的 `category` segment 錯誤時，canonicalization 必須為永久 redirect（308），避免 SEO drift。

**Implementation Steps：**

1. **Code change** ✅
   - 檔案：`app/[locale]/gallery/items/[category]/[slug]/page.tsx`
   - 將 `redirect(...)` 改為 `permanentRedirect(...)`（只改 canonicalization 那條路徑；其他 flow 不變）。
   - 更新 imports：`import { notFound, permanentRedirect } from 'next/navigation';`（移除 `redirect`）。
2. **Guardrail test（防回歸）** ✅
   - 新增 `tests/seo-canonical-redirects.test.ts`：
     - 讀取 `app/[locale]/gallery/items/[category]/[slug]/page.tsx` 原始碼
     - assert 不包含獨立 `redirect(` 且包含 `permanentRedirect(`（只針對此檔，避免誤殺其他合理的 temporary redirects）。
3. **Docs sync** ✅
   - `uiux_refactor.md`：§4 item 12 標記為 ARCHIVED
   - `doc/SPEC.md`：Gallery 章節更新「canonical category 修正」註記
4. **驗收** ✅
   - `npm test` - pass
   - `npm run lint` - pass
   - `npm run type-check` - pass

DoD：

- ✅ canonicalization 使用 `permanentRedirect()`（308），不再出現 307
- ✅ guardrail test 上線，避免回歸
- ✅ 文件同步完成（`uiux_refactor.md` + `doc/SPEC.md`）

---

### PR-18 — Hotspots UI：a11y/clean-code（避免固定 id；降低未來 drift 風險）✅ COMPLETED

> **Status**: ✅ Completed (2026-01-21)

Goal：移除 Hotspot fallback list 的固定 DOM id，避免未來同頁多 overlay 時造成 id collision。

**Implementation Steps：**

1. **Code change** ✅
   - 檔案：`components/hotspots/HotspotFallbackList.tsx`
   - 新增 `useId` import：`import { useState, useCallback, useId } from 'react';`
   - `const listId = useId();`
   - `aria-controls={listId}`；list 容器 `id={listId}`
2. **Regression test** ✅
   - 新增 `tests/hotspot-fallbacklist-id.test.ts`：
     - assert 必須 import `useId` from React
     - assert 不再出現 `id="hotspot-fallback-list"` 固定字串
     - assert 不再出現 `aria-controls="hotspot-fallback-list"` 固定字串
     - assert 使用動態 id（`id={...}` 和 `aria-controls={...}`）
3. **Docs sync** ✅
   - `uiux_refactor.md`：§4 item 13 標記為 ARCHIVED
   - `doc/meta/STEP_PLAN.md`：本 PR 標記完成
4. **驗收** ✅
   - `npm test` - pass (1041 tests)
   - `npm run lint` - pass
   - `npm run type-check` - pass

DoD：

- ✅ 不再有固定 `id="hotspot-fallback-list"`
- ✅ `aria-controls` 與 `id` 一致且可多實例共存（使用 React `useId()` hook）
- ✅ guardrail test 上線（`tests/hotspot-fallbacklist-id.test.ts`），避免回歸
- ✅ 測試/型別/靜態檢查皆通過

## 4) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3000 npm run build`（routes/SEO/redirect 相關 PR 必跑）

