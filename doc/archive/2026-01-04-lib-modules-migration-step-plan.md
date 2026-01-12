# [ARCHIVED] Step-by-Step Execution Plan — `lib/modules/*` Business Modules Migration

> Status: **ARCHIVED / COMPLETE**  
> Last Updated: 2026-01-04  
> Owner: Site Owner  
> Audience: executor agent（照本檔逐 PR 執行；每個 PR merge 後更新本檔）  
> Mode: **A — Execution**（archived record；純路徑/組織調整；功能不變）  
> Scope:
>
> 1. 將 14 個業務模組由 `lib/<module>/` 遷移到 `lib/modules/<module>/`
> 2. 全域更新 imports（`app/`, `components/`, `lib/`, `tests/`）
> 3. 舊目錄先改 shim（re-export），驗證後刪除舊目錄

## Inputs（SSoT）

- Architecture / constraints: `../../ARCHITECTURE.md`
- Implemented behavior (what exists now): `../SPEC.md`
- Security / RLS / secrets: `../SECURITY.md`
- Ops / verification: `../RUNBOOK.md`（details: `../runbook/*`）
- Docs SRP + update matrix: `../GOVERNANCE.md`

## Historical / Archived References（不要再當成 active plan）

- Archived copy of previous step plan (admin i18n + lib refactor): `./2026-01-04-step-plan-admin-i18n-lib-refactor.md`

---

## Current Status（executor quick view）

- ✅ 已完成：
  - `lib/infrastructure/` 已有實體 wrapper（Supabase/OpenRouter/Sentry/Akismet…）
  - 舊路徑（例：`@/lib/supabase/*`）透過 shim 可用
  - `npm run type-check` 0 errors + `npm test` 全綠（896 tests）
  - **14 個業務模組已全部遷移至 `lib/modules/<module>/`**
  - 所有舊 `lib/<module>/` 目錄已刪除

---

## Target Structure（Goal）

```
lib/
├── infrastructure/   # 外部服務 wrapper（已完成）
├── modules/          # 業務模組（本計畫）
│   ├── reports/
│   ├── auth/
│   ├── landing/
│   ├── blog/
│   ├── gallery/
│   ├── comment/
│   ├── content/
│   ├── user/
│   ├── shop/
│   ├── theme/
│   ├── ai-analysis/
│   ├── embedding/
│   ├── preprocessing/
│   └── import-export/
├── types/            # 共用型別（不變）
├── utils/            # 純工具（不變）
├── validators/       # 純驗證器（不變）
└── i18n/             # 國際化（不變）
```

---

## Constraints（Non‑Negotiables）

- 一次只遷移一個模組（每 PR 只「搬移一個 module 的實體檔案」；但允許全域更新該 module 的 importers）。
- 功能不變：只允許移動檔案、更新 import paths、建立/刪除 shim；不得改變 runtime 行為。
- `./` 內部相對 import 不需改（同一模組內檔案位置不變）；但若存在跨模組的 `../<other-module>` 相對路徑，搬移後必須修正（建議改回 `@/lib/...` alias）。
- 測試路徑需同時處理：
  - alias：`@/lib/<module>/...`
  - 相對：`../lib/<module>/...`、`../../lib/<module>/...`（含有/無結尾斜線）
- 每個 PR 必須跑：
  - `npm run type-check`
  - `npm test`
- 回滾（每 PR 通用）：
  - `git checkout HEAD -- lib/ app/ tests/`

---

## Dependency Notes（module ↔ module）

> 來源：掃描 `lib/<module>/**` 內對 `@/lib/<other-module>` 與 `../<other-module>` 的引用。

- `reports` → `auth`
- `landing` → `gallery`
- `user` → `auth`, `comment`, `shop`
- `shop` → `auth`
- `import-export` → `blog`, `gallery`
- `ai-analysis` → `embedding`
- `embedding` ↔ `preprocessing`（cycle；兩個 PR 必須相鄰執行）

---

## 0) TL;DR（遷移順序）

> 原則：以「小模組先」為主；並將 `embedding`/`preprocessing` 併為相鄰兩個 PR 以降低 cycle 期間風險。

1. **PR-1【P1】** reports (2 files)
2. **PR-2【P1】** auth (4 files)
3. **PR-3【P1】** landing (5 files)
4. **PR-4【P1】** blog (5 files)
5. **PR-5【P1】** theme (7 files)
6. **PR-6【P1】** content (7 files)
7. **PR-7【P1】** user (7 files)
8. **PR-8【P1】** embedding (11 files) _(cycle group)_
9. **PR-9【P1】** preprocessing (13 files) _(cycle group)_
10. **PR-10【P2】** gallery (13 files)
11. **PR-11【P2】** comment (15 files)
12. **PR-12【P2】** ai-analysis (20 files)
13. **PR-13【P2】** shop (33 files)
14. **PR-14【P2】** import-export (46 files; has nested dirs)

---

## 1) Per‑Module Migration Template（每 PR 套用）

> 下列步驟是「執行腳本」；每個 PR 的 module-specific 注意事項在 PR 章節內列出。

### Steps

1. **Copy files（含子目錄）到新位置**
   - 目標：`lib/modules/<module>/`（placeholder 目錄若已存在，直接覆蓋/填入即可）
   - 建議（保留 git history）：`git mv lib/<module> lib/modules/<module>`，再建立 `lib/<module>/` 用於 shim
2. **Fix imports inside the moved module**
   - `./` 與模組內 `../`（仍在同模組）不需改
   - 修正「自我引用」：`@/lib/<module>` → `@/lib/modules/<module>`
   - 若有跨模組相對路徑（例：`../../auth`），改成 `@/lib/<other-module>`（避免深度變動造成斷裂）
3. **Update external imports（全域）**
   - `@/lib/<module>` → `@/lib/modules/<module>`
   - `../lib/<module>` → `../lib/modules/<module>`
   - `../../lib/<module>` → `../../lib/modules/<module>`
4. **Turn old directory into shim（re-export）**
   - 目的：避免漏改 import 時立即爆炸；先讓 type-check/test 可跑，再用 `rg` 清掉所有舊路徑。
   - 每個舊檔案建立同名 shim（保留子目錄結構）。
   - shim 模板（必要時補 `default`）：
     - `export * from '@/lib/modules/<module>/<relative-path-without-ext>';`
5. **Verify**
   - `npm run type-check`
   - `npm test`
   - `rg -n \"@/lib/<module>\" app components lib tests -S`（預期只剩 shim 內部 `@/lib/modules/...`；repo 不應再引用舊路徑）
6. **Delete old module directory**
   - 當確認 repo 內已無 `@/lib/<module>` / `../lib/<module>` / `../../lib/<module>` 引用後，刪除 `lib/<module>/`（包含 shims）
7. **Re‑verify（刪除後再跑一次）**
   - `npm run type-check`
   - `npm test`

### Rollback（每 PR 通用）

- `git checkout HEAD -- lib/ app/ tests/`

---

## PR-1 — Migrate `reports` → `lib/modules/reports/`【P1】[COMPLETE]

### Goal

- 將 `lib/reports/**` 遷移到 `lib/modules/reports/**`，並更新全域引用。

### Expected file touches

- `lib/modules/reports/**`
- `app/**`（reports API routes/admin page）
- `tests/**`（若有引用）

### Module‑specific notes

- Module deps: `reports` → `auth`
- Known alias importers（examples）：`app/api/reports/**`, `app/[locale]/admin/reports/**`

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-2 — Migrate `auth` → `lib/modules/auth/`【P1】[COMPLETE]

### Goal

- 將 `lib/auth/**` 遷移到 `lib/modules/auth/**`，並更新全域引用。

### Expected file touches

- `lib/modules/auth/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`（`auth` fan-in 大，引用點多）

### Module‑specific notes

- Module deps: none
- `lib/auth/**` 內存在自我引用（例：`@/lib/auth`）；搬移後必須改為 `@/lib/modules/auth`（或改成相對 import）

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-3 — Migrate `landing` → `lib/modules/landing/`【P1】[COMPLETE]

### Goal

- 將 `lib/landing/**` 遷移到 `lib/modules/landing/**`，並更新全域引用。

### Expected file touches

- `lib/modules/landing/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`

### Module‑specific notes

- Module deps: `landing` → `gallery`（`gallery` 尚未遷移時可先維持 `@/lib/gallery`；待 PR-10 再更新）
- `lib/landing/**` 內可能存在自我引用（`@/lib/landing/...`）需一起更新

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-4 — Migrate `blog` → `lib/modules/blog/`【P1】[COMPLETE]

### Goal

- 將 `lib/blog/**` 遷移到 `lib/modules/blog/**`，並更新全域引用。

### Expected file touches

- `lib/modules/blog/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`

### Module‑specific notes

- Module deps: none
- `import-export` 依賴 `blog`：此 PR 會改到 `lib/import-export/**` 內的 `@/lib/blog` import（即使 `import-export` 尚未遷移）

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-5 — Migrate `theme` → `lib/modules/theme/`【P1】[COMPLETE]

### Goal

- 將 `lib/theme/**` 遷移到 `lib/modules/theme/**`，並更新全域引用。

### Expected file touches

- `lib/modules/theme/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`
- `tests/architecture-boundaries.test.ts`（若仍以檔案路徑列出 theme pure modules，需同步更新）

### Module‑specific notes

- Module deps: none

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-6 — Migrate `content` → `lib/modules/content/`【P1】[COMPLETE]

### Goal

- 將 `lib/content/**` 遷移到 `lib/modules/content/**`，並更新全域引用。

### Expected file touches

- `lib/modules/content/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`

### Module‑specific notes

- Module deps: none

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-7 — Migrate `user` → `lib/modules/user/`【P1】[COMPLETE]

### Goal

- 將 `lib/user/**` 遷移到 `lib/modules/user/**`，並更新全域引用。

### Expected file touches

- `lib/modules/user/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`

### Module‑specific notes

- Module deps: `user` → `auth`, `comment`, `shop`
  - `auth` 在 PR-2 已遷移：此 PR 內 user 對 auth 的引用應直接用 `@/lib/modules/auth`
  - `comment` / `shop` 尚未遷移：可先維持 `@/lib/comment`, `@/lib/shop`，待對應 PR 再更新
- 測試注意：目前有 `.js` extension 的 import 例（`tests/user-helpers.test.ts`），搬移後路徑也要同步調整

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-8 — Migrate `embedding` → `lib/modules/embedding/`【P1】[COMPLETE]

### Goal

- 將 `lib/embedding/**` 遷移到 `lib/modules/embedding/**`，並更新全域引用。

### Expected file touches

- `lib/modules/embedding/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`

### Module‑specific notes

- Cycle group（必須與 PR-9 相鄰）：`embedding` ↔ `preprocessing`
- Module deps: `embedding` → `preprocessing`
- `ai-analysis` 依賴 `embedding`：此 PR 會改到 `lib/ai-analysis/**` 內的 import（即使 `ai-analysis` 尚未遷移）

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-9 — Migrate `preprocessing` → `lib/modules/preprocessing/`【P1】[COMPLETE]

### Goal

- 將 `lib/preprocessing/**` 遷移到 `lib/modules/preprocessing/**`，並更新全域引用。

### Expected file touches

- `lib/modules/preprocessing/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`

### Module‑specific notes

- Cycle group（必須與 PR-8 相鄰）：`embedding` ↔ `preprocessing`
- Module deps: `preprocessing` → `auth`, `embedding`
  - `auth` 在 PR-2 已遷移：preprocessing 對 auth 的引用應直接用 `@/lib/modules/auth`
  - `embedding` 在 PR-8 已遷移：preprocessing 對 embedding 的引用應直接用 `@/lib/modules/embedding`

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-10 — Migrate `gallery` → `lib/modules/gallery/`【P2】[COMPLETE]

### Goal

- 將 `lib/gallery/**` 遷移到 `lib/modules/gallery/**`，並更新全域引用。

### Expected file touches

- `lib/modules/gallery/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`

### Module‑specific notes

- Module deps: none
- `landing` 與 `import-export` 依賴 `gallery`：此 PR 會改到 `lib/modules/landing/**` 與 `lib/import-export/**` 的 gallery imports

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-11 — Migrate `comment` → `lib/modules/comment/`【P2】[COMPLETE]

### Goal

- 將 `lib/comment/**` 遷移到 `lib/modules/comment/**`，並更新全域引用。

### Expected file touches

- `lib/modules/comment/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`
- `tests/architecture-boundaries.test.ts`（若仍以檔案路徑列出 comment pure modules，需同步更新）

### Module‑specific notes

- Module deps: none
- `user` 依賴 `comment`：此 PR 會改到 `lib/modules/user/**` 的 comment imports

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-12 — Migrate `ai-analysis` → `lib/modules/ai-analysis/`【P2】[COMPLETE]

### Goal

- 將 `lib/ai-analysis/**` 遷移到 `lib/modules/ai-analysis/**`，並更新全域引用。

### Expected file touches

- `lib/modules/ai-analysis/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`

### Module‑specific notes

- Module deps: `ai-analysis` → `embedding`（PR-8 已遷移）
- `lib/infrastructure/openrouter/*` 可能仍引用 `@/lib/ai-analysis/*`（若存在，需同步改為 `@/lib/modules/ai-analysis/*`）

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-13 — Migrate `shop` → `lib/modules/shop/`【P2】[COMPLETE]

### Goal

- 將 `lib/shop/**` 遷移到 `lib/modules/shop/**`，並更新全域引用。

### Expected file touches

- `lib/modules/shop/**`
- `app/**`, `components/**`, `lib/**`, `tests/**`（shop fan-in 大）
- `tests/architecture-boundaries.test.ts`（shop boundaries / pure modules path list 需同步更新）

### Module‑specific notes

- Module deps: `shop` → `auth`（PR-2 已遷移）
- `user` 依賴 `shop`：此 PR 會改到 `lib/modules/user/**` 的 shop imports
- 注意 `use client` boundary test：若 repo 有針對 `@/lib/shop` 的 regex guardrails，需改成 `@/lib/modules/shop`

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`

---

## PR-14 — Migrate `import-export` → `lib/modules/import-export/`【P2】[COMPLETE]

### Goal

- 將 `lib/import-export/**`（含 `formatters/`, `parsers/`, `validators/` 等子目錄）遷移到 `lib/modules/import-export/**`，並更新全域引用。

### Expected file touches

- `lib/modules/import-export/**`（46 files; nested dirs）
- `tests/import-export/**`（多數為 `../../lib/import-export/...` 相對 import）
- `app/**`, `components/**`, `lib/**`

### Module‑specific notes

- Module deps: `import-export` → `blog`, `gallery`（PR-4 / PR-10 已遷移）
- Shim 建議用腳本/指令自動產生（避免手工 46 檔）：
  - 遍歷舊目錄下所有 `*.ts` / `*.tsx`，輸出同路徑 shim 到 `lib/import-export/**`

### Steps / Verification / Rollback

- 套用 `1) Per‑Module Migration Template（每 PR 套用）`
