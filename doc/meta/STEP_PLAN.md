# Step-by-Step Execution Plan — Architecture & Docs Alignment Gate (`lib/` + Supabase)

> Status: **ACTIVE**  
> Last Updated: 2026-01-11  
> Owner: Site Owner  
> Audience: executor agent（照本檔逐 PR 執行；每個 PR merge 後更新本檔）  
> Mode: **B — Alignment gate**（偵測 drift/歧義/衝突時：先對齊再規劃 PR）  
> Scope:
>
> 1. **Docs/Test/Comments path drift cleanup**：統一專案對外文件與守門員測試的 canonical 路徑（`lib/infrastructure/*` + `lib/modules/*`），移除已不存在的 legacy 路徑敘述。
> 2. **Supabase clean separation**：清楚區分 `supabase/`（DB migrations + Edge Functions）與 `lib/infrastructure/supabase/`（Next.js Supabase factories），避免混用造成耦合與資安風險。

## Inputs（SSoT）

- Architecture / constraints: `../../ARCHITECTURE.md`
- Implemented behavior (SSoT): `../SPEC.md`
- Security / RLS / secrets: `../SECURITY.md`
- Ops / verification: `../RUNBOOK.md`（details: `../runbook/*`）
- Docs SRP + update matrix: `../GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see`）: `../../uiux_refactor.md`

## Historical / Archived References（不要再當成 active plan）

- Prior admin i18n + lib Phase 2 execution record: `../archive/2026-01-04-step-plan-admin-i18n-lib-refactor.md`
- `lib/modules/*` migration execution record: `../archive/2026-01-04-lib-modules-migration-step-plan.md`
- Old uiux_refactor full snapshot: `../archive/2025-12-31-uiux-refactor-archive.md`

---

## 0) TL;DR（執行順序）

1. **PR-1【P1】Docs + comments path normalization**：`ARCHITECTURE.md` / `doc/SPEC.md` / `doc/SECURITY.md` / `uiux_refactor.md` + 少量 in-code comments，全面改成 canonical paths
2. **PR-2【P1】Guardrails alignment**：更新 `tests/architecture-boundaries.test.ts` 的 allowlist/說明/錯誤訊息，使其反映現況與規範
3. **PR-3【P2】(Optional) lib root cleanup**：若要把剩餘 cross-cutting domains 也納入 `modules/` / `utils/`，先做 dependency map 再拆 PR（避免破壞「modules 禁止跨依賴」）

---

## Target `lib/` Structure（canonical）

> Canonical 入口點：外部服務集中於 `infrastructure/`；業務模組集中於 `modules/`；validators/utils/types 為跨模組可重用層。

```
lib/
├── infrastructure/        ← 外部服務（集中）
│   ├── supabase/
│   ├── openrouter/
│   ├── cloudinary/
│   ├── stripe/
│   ├── akismet/
│   └── sentry/
│
├── modules/               ← 業務模組
│   ├── shop/
│   │   ├── io.ts         ← 只用 infrastructure
│   │   ├── pure.ts       ← 純函式（可拆成 *-pure.ts）
│   │   └── types.ts      ← module-local types（共用仍放 lib/types）
│   ├── blog/
│   └── gallery/
│
├── validators/            ← 純函式（跨模組共用）
├── utils/                 ← 純函式（跨模組共用）
└── types/                 ← 共用型別（跨模組共用）
```

---

## 1) Constraints（Non‑Negotiables）

- **Server-first / bundle boundary**：不得為了搬路徑或修 drift 把 page/layout 濫改成 client component（see `../../ARCHITECTURE.md`）。
- **Supabase client boundary**：
  - Browser client：只在 client components 使用 `lib/infrastructure/supabase/client.ts`
  - Server (cookie) client：只在 server components/actions/routes 使用 `lib/infrastructure/supabase/server.ts`
  - Anon client（public cached reads）：只在 server-only IO/cached modules 使用 `lib/infrastructure/supabase/anon.ts`
  - Service role：admin/system writes 只允許在 `*-io.ts` 且 `import 'server-only';`（測試守門：`tests/architecture-boundaries.test.ts`）
- **SEO / URL single source**：`NEXT_PUBLIC_SITE_URL` 只能由 `lib/site/site-url.ts` 讀取（see `../../ARCHITECTURE.md` §3.11）。
- **Docs SRP**：現況（what exists now）在 `doc/SPEC.md`；drift playbook 在 `uiux_refactor.md`；本檔是可執行的拆 PR 計畫。

---

## 2) Drift Findings（2026-01-11）

> 目標：把「文件 / 測試守門員 / 註解」全部對齊到已落地的 canonical paths，避免下一輪開發時用錯入口或誤判規則。

1. **Docs drift**：`ARCHITECTURE.md` / `doc/SPEC.md` / `doc/SECURITY.md` / `uiux_refactor.md` 仍殘留 legacy 路徑敘述（例如 `lib/supabase/*`, `lib/shop/*`, `lib/ai-analysis/*`），但實際程式已收斂到 `lib/infrastructure/*` + `lib/modules/*`。
2. **Guardrail drift**：`tests/architecture-boundaries.test.ts` 仍存在舊路徑 allowlist / 錯誤訊息（例如 `lib/supabase/`, `lib/ai-analysis/`, `lib/import-export/`），降低守門員可維護性與可讀性。
3. **Comment drift**：少數檔案的 header comment / `@see` 仍指向已不存在路徑（例：`app/api/upload-signature/route.ts`, `lib/modules/landing/*`）。

---

## PR-1 — Docs + comments path normalization【P1】

### Goal

- 文件與註解只使用 canonical paths；讀者不需要猜「哪個才是入口」。

### Scope

- **只改路徑與描述**（docs + comments）；不改 runtime 行為、不改 DB/RLS、不改 UI 文案。

### Steps（按順序；每步驟都要可驗證）

1. 先抓證據（保留 rg output 作為 PR 描述的一部分）：
   - `rg -n "lib/supabase|@/lib/supabase" ARCHITECTURE.md doc/SPEC.md doc/SECURITY.md uiux_refactor.md app lib tests -S --glob '!doc/archive/**'`
   - `rg -n "lib/(shop|gallery|comment|landing|reports|auth|user|import-export|ai-analysis|embedding|preprocessing)/" ARCHITECTURE.md doc/SPEC.md doc/SECURITY.md uiux_refactor.md -S --glob '!doc/archive/**'`
2. 更新 docs（逐檔修；不要用全域 replace 亂改到 archive）：
   - `../../ARCHITECTURE.md`：
     - `lib/<domain>/...` → `lib/modules/<domain>/...`（針對已搬到 modules 的 domain）
     - `lib/supabase/*` / `@/lib/supabase/*` → `lib/infrastructure/supabase/*` / `@/lib/infrastructure/supabase/*`
     - OpenRouter allowlist：由 `lib/ai-analysis/**` 改為 `lib/infrastructure/openrouter/**`（server-only）
     - 更新 Phase 註記：Phase 2 已完成（shim 不存在）
   - `../SPEC.md`：
     - Module Inventory / Data Intelligence module tables：統一成 `lib/modules/*`（與現況一致）
   - `../SECURITY.md`：
     - Supabase client selection table 與 AI SDK allowlist 路徑對齊現況
   - `../../uiux_refactor.md`：
     - 只保留未完成 drift（若無 open drift，保留空集合狀態即可）
     - grep checklist / playbooks 的 canonical paths 對齊現況
3. 更新 in-code comments / `@see`（只改註解，不改行為）：
   - `app/api/upload-signature/route.ts`
   - `lib/modules/landing/io.ts`
   - `lib/modules/landing/admin-io.ts`
4. 文件一致性驗證（必做）：
   - 重新跑 Step 1 的兩個 `rg` 指令，確認:
     - `lib/supabase` / `@/lib/supabase` 在非 archive 區域為 **0 hits**
     - 已搬到 `lib/modules/*` 的 domains，不再出現 `lib/<domain>/...` 的敘述

### Rollback

- revert 本 PR（docs/comments only）

---

## PR-2 — Guardrails alignment【P1】

### Goal

- `tests/architecture-boundaries.test.ts` 的規則/allowlist/訊息全部對齊 canonical paths，避免下一輪開發時「測試說 A、程式做 B」。

### Steps

1. 更新 `tests/architecture-boundaries.test.ts`：
   - `lib/supabase/` → `lib/infrastructure/supabase/`（skip/allowlist/註解/訊息）
   - OpenRouter allowlist（若仍存在）：`lib/ai-analysis/` → `lib/infrastructure/openrouter/`
   - Import/Export path wording：`lib/import-export/` → `lib/modules/import-export/`
   - Auth path wording：`lib/auth/` → `lib/modules/auth/`
2. 跑測試與靜態檢查（必做）：
   - `npm test`
   - `npm run type-check`
   - `npm run lint`

### Rollback

- revert 本 PR（tests only）

---

## PR-3 — (Optional) lib root cleanup【P2】

> 只有在「確定要把剩餘 cross-cutting domains 也收進 modules/utils」才做；否則跳過（避免破壞既有依賴規則）。

### Pre-check（不可省略）

1. 先建立 dependency map（釐清誰依賴誰）：
   - `rg -n "@/lib/(seo|site|cache|features|spam|security|rerank|analytics|queue|reactions)" app components lib -S`
2. 釐清依賴規則調整方案（兩選一，先寫進 `../../ARCHITECTURE.md` 再動 code）：
   - A) 保留 `lib/<domain>/` 作為 cross-cutting（允許被多個 modules 使用）
   - B) 移入 `lib/utils/`（僅限純函式）或 `lib/infrastructure/`（外部 API access）並禁止 modules 互相 import

---

## Gate Checklist（每次合併前）

- `npm test` / `npm run type-check` / `npm run lint` 全部通過
- `rg -n "lib/supabase|@/lib/supabase" app components lib tests -S` → **0 hits**
- `rg --files-without-match "import 'server-only';" lib --glob "**/io.ts" --glob "**/*-io.ts"` → **0 hits**

