# 2026-01-23 - Step Plan V12（Doc/Code Hygiene + Proxy Migration）(Archive)

> Date: 2026-01-23  
> Status: COMPLETE ✅ (Archived snapshot; active plan lives in `../meta/STEP_PLAN.md`)  
> Scope: Docs/code hygiene + remove legacy in-code refs + Next.js `middleware.ts` → `proxy.ts` migration  
> Implemented behavior (SSoT): `../SPEC.md`  
> Constraints: `../../ARCHITECTURE.md`

## Archived Snapshot（verbatim）

# Step-by-Step Execution Plan — V12（Active: Doc/Code Hygiene + Minor Risk Items）

> 狀態: Active（Drift/clean-code repair plan；本檔只寫「修復方案/步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-23（PR-36 完成：`middleware.ts` → `proxy.ts` 遷移）  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> Repo 驗證（2026-01-23）：`npm test`（1115 pass）, `npm run lint`, `npm run type-check`, `npm run docs:check-indexes`, `npm run lint:md-links` 通過；`npm run build` 需先設定 `.env.local`（至少 `NEXT_PUBLIC_SITE_URL`；見 `README.md`）  
> 歷史 snapshots（已完成只留 archive）：`doc/archive/README.md`（最新：`doc/archive/2026-01-23-step-plan-v11-build-seo-url-builders.md`）

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

~~1. **[P2] Docs stability** — ✅ 已完成（PR-34，2026-01-23）：移除 in-code `@see STEP_PLAN.md`，改指向 stable docs。~~

~~2. **[P3] Repo hygiene** — ✅ 已完成（PR-35，2026-01-23）：移除 `lib/modules/shop/` 空資料夾。~~

~~3. **[P3] Maintenance risk** — ✅ 已完成（PR-36，2026-01-23）：`middleware.ts` → `proxy.ts` 遷移。~~

---

## 2) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

新增 PR item 的最小格式（**務必寫死到檔名/函式/指令；避免模糊**）：

1. Title：`PR-XX — <Domain>：<1 句話描述 drift 修復>`
2. Evidence（必填）：列出 `rg` 指令與命中的檔案路徑（至少 1 個）
3. Violates（必填）：引用 `ARCHITECTURE.md`/`doc/SPEC.md`/對應 spec 的章節或 anchor
4. Fix steps（必填）：
   - 明確列出要新增/修改的檔案路徑（逐一列出）
   - 明確列出要移除的舊呼叫點（逐一列出）
5. DoD（必填）：
   - `npm test`, `npm run lint`, `npm run type-check`
   - 針對 drift 的 grep 應為 0 命中（列出指令）
6. Post-merge（必填）：
   - 更新 `uiux_refactor.md` §4 item 狀態（不得改號；若是 docs/clean-code 類型可新增新 item）
   - `npm run docs:generate-indexes` + `npm run lint:md-links`

---

### ~~PR-34 — Docs/Consistency：移除 in-code `@see doc/meta/STEP_PLAN.md`，改指向 stable docs（SPEC/ARCHITECTURE/specs/archive）~~ ✅ 已完成（2026-01-23）

> **Status**: ✅ 完成
> **Verified**: `npm test`（1115 pass）, `npm run lint`, `npm run type-check`, `npm run lint:md-links`（81 files pass）
> **grep確認**: `@see.*STEP_PLAN` in app/lib/tests/components → **0 hits**
>
> **修改檔案（21個）**:
> - `lib/seo/url-builders.ts`, `app/robots.ts`, `lib/validators/admin-users.ts`, `lib/validators/custom-template.ts`, `lib/validators/page-views-admin.ts`
> - `app/[locale]/gallery/page.tsx`, `app/[locale]/gallery/categories/[slug]/page.tsx`, `app/[locale]/gallery/[category]/page.tsx`
> - `app/[locale]/admin/(data)/analytics/pageviews/page.tsx`, `app/[locale]/admin/(data)/ai-analysis/templates/*` (3 files)
> - `tests/comment-permalink.test.ts`, `tests/company-settings-getter.test.ts`, `tests/hotspot-fallbacklist-id.test.ts`, `tests/seo-canonical-redirects.test.ts`, `tests/seo-canonical-links.test.ts`, `tests/hamburger-nav-publish-io.test.ts`
> - `tests/validators/custom-template.test.ts`, `tests/validators/page-views-admin.test.ts`, `tests/validators/admin-users.test.ts`

---

### ~~PR-35 — Repo/Hygiene：移除 `lib/modules/shop/` 空資料夾（避免 dead module drift）~~ ✅ 已完成（2026-01-23）

> **Status**: ✅ 完成
> **Verified**: `npm test`（1115 pass）, `npm run lint`, `npm run type-check`
> **grep確認**: `lib/modules/shop|modules/shop` in app/components/lib → **0 hits**（僅文檔引用）
>
> **變更**:
> - 刪除 `lib/modules/shop/`（空資料夾；scope reduction 歷史殘留）

---

### ~~PR-36 — Maintenance：Next.js `middleware.ts` → `proxy`（依 Next 官方 migration）~~ ✅ 已完成（2026-01-23）

> **Status**: ✅ 完成
> **Verified**: `npm test`（1115 pass）, `npm run lint`, `npm run type-check`, `npm run build`
> **確認**: `npm run build` 不再顯示 `middleware` deprecated warning
>
> **變更**:
> - 重命名 `middleware.ts` → `proxy.ts`
> - 重命名 `middleware()` → `proxy()` function
> - 更新 `tests/architecture-boundaries.test.ts` 引用 `proxy.ts`

---

## 3) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- Docs：`npm run docs:generate-indexes`, `npm run lint:md-links`
- `npm run build`（先確認 `.env.local` 已設 `NEXT_PUBLIC_SITE_URL` + Supabase public env）

