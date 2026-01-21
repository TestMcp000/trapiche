# Step-by-Step Execution Plan — V4（Drift Hardening：SITE_URL SSoT + Home Event CTA URL + Settings Cleanup）

> 狀態: Active（Drift repair plan；本檔只寫「修復方案/步驟」，不在此直接改程式碼）  
> 最後更新: 2026-01-21（drift review refresh）  
> 現況 SSoT（已實作行為）: `doc/SPEC.md`  
> 目標 PRD（約束/合約）:  
> - Home/Gallery/Hotspots/Hamburger nav：`doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`（Implementation Contract）  
> - AI / OpenRouter ops：`doc/runbook/ai-analysis.md`（env &安全邊界）
> 歷史完成紀錄：
>
> - V2 snapshot（PR-9..PR-12）：`doc/archive/2026-01-21-step-plan-v2-home-uiux-gallery-hotspots-hamburger-nav.md`
> - V3 snapshot（PR-13..PR-16）：`doc/archive/2026-01-21-step-plan-v3-home-uiux-gallery-hero-hotspots-hamburger-nav.md`
> - V4 snapshot（PR-17..PR-18）：`doc/archive/2026-01-21-step-plan-v4-seo-hotspots-clean.md`

---

## 0) 必讀（SSoT / Guardrails）

- Architecture / 全域約束：`ARCHITECTURE.md`
- 已落地行為（SSoT）：`doc/SPEC.md`
- 目標 PRD（contract）：`doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md`
- Security / RBAC / RLS / secrets：`doc/SECURITY.md`
- Ops / DB / go-live：`doc/RUNBOOK.md`（細節：`doc/runbook/*`）
- AI / OpenRouter ops：`doc/runbook/ai-analysis.md`
- 文件分工 / update matrix：`doc/GOVERNANCE.md`
- Drift tracker + playbooks（stable `@see` index）：`uiux_refactor.md`

---

## 1) Repo 現況（以工具輸出為準；2026-01-21）

- `npm test`：pass（含 `tests/architecture-boundaries.test.ts`）
- `npm run type-check`：pass（`tsconfig.typecheck.json`；exclude `uiux/` + `.next/**`）
- `npm run lint`：pass
- `npm run build`：需 `.env.local` 至少包含 `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`；production 若缺 `NEXT_PUBLIC_SITE_URL` 會 fail-fast（設計如此；見 `lib/site/site-url.ts` 與 `doc/runbook/deployment.md`）

---

## 2) Drift / Clean-code 問題清單（Active）

> 本節只列「尚未修復」的飄移/技術債；已完成項請看 `doc/archive/*` 與 `uiux_refactor.md`（all archived）。

### ~~Drift-SEO-2~~（COMPLETED）：`NEXT_PUBLIC_SITE_URL` 單一來源被破壞（OpenRouter module 直接讀 env）

> 已修復（PR-19；2026-01-21）。修復內容：
> - `lib/infrastructure/openrouter/openrouter-chat-io.ts` 改為 import `SITE_URL` from `@/lib/site/site-url`
> - 新增 guardrail test：`tests/site-url-single-source.test.ts`
> - 更新 `doc/runbook/ai-analysis.md` §3.3

### ~~Drift-Sec-1~~（COMPLETED）：Home「講座邀請」CTA URL 未做 allowlist validation（PRD FR-11.1）

> 已修復（PR-20；2026-01-21）。修復內容：
> - 新增 `lib/validators/external-url.ts`（集中式 URL validator；single source of truth）
> - `lib/modules/content/company-settings-io.ts`：write-side enforcement
> - `components/home/HomePageV2.tsx`：render-side hardening（invalid → 不 render FAB）
> - 新增 `tests/validators/external-url.test.ts`
> - `hamburger-nav.ts` / `gallery-hotspots.ts` 改用共用 validator（避免 drift）

### ~~Clean-Settings-1~~（COMPLETED）：`getSetting()` helper 重複出現在多個 pages/components（可維護性）

> 已修復（PR-21；2026-01-21）。修復內容：
> - 新增 `lib/modules/content/company-settings.ts`：集中式 `getCompanySettingValue()` helper
> - 替換 4 處重複實作，確保 trim/empty 行為一致

---

## 3) Execution Plan（Active；以 PR 為單位；每 PR 可獨立驗收/回退）

### ~~PR-19~~ — SEO/SSoT：修復 `NEXT_PUBLIC_SITE_URL` 單一來源 drift（OpenRouter）✅

> **COMPLETED（2026-01-21）**
>
> 修復內容：
> - `lib/infrastructure/openrouter/openrouter-chat-io.ts`：`getSiteUrl()` 改為 import `SITE_URL` from `@/lib/site/site-url`（不再直接讀 `process.env.NEXT_PUBLIC_SITE_URL`）
> - 新增 `tests/site-url-single-source.test.ts`：guardrail test 確保 `NEXT_PUBLIC_SITE_URL` 只出現在 `lib/site/site-url.ts`
> - 更新 `doc/runbook/ai-analysis.md` §3.3：移除 drift 提示，補充 fallback 說明
>
> DoD 驗證：
> - ✅ `grep -rn "process\.env\.NEXT_PUBLIC_SITE_URL" app components lib` 只命中 `lib/site/site-url.ts`
> - ✅ `npm test` 通過（含新 guardrail test）
> - ✅ `npm run type-check` 通過
> - ✅ `npm run lint` 通過

---

### ~~PR-20~~ — Security：Home Event CTA URL allowlist validation（https/mailto only）✅

> **COMPLETED（2026-01-21）**
>
> 修復內容：
> - 新增 `lib/validators/external-url.ts`（pure validator）：`validateExternalUrl()`, `validateOptionalExternalUrl()`, `isValidExternalUrl()`
> - allowlist：`https:`/`mailto:`；reject：`javascript:`/`data:`/`vbscript:`/`file:`/`http:`/protocol-relative
> - `lib/modules/content/company-settings-io.ts`：`updateCompanySetting()` 增加 URL validation，回傳 `UpdateSettingResult`
> - `app/[locale]/admin/settings/actions.ts`：處理新 result type，顯示 validation 錯誤
> - `components/home/HomePageV2.tsx`：render-side hardening，invalid URL → 不 render `FloatingFab` + `console.warn`
> - `lib/validators/hamburger-nav.ts`：改用 shared `validateExternalUrlCore` 避免 drift
> - `lib/validators/gallery-hotspots.ts`：改用 shared `validateOptionalExternalUrl` 避免 drift
> - 新增 `tests/validators/external-url.test.ts`：完整 URL validation 測試
>
> DoD 驗證：
> - ✅ `npm test`（1074 pass）
> - ✅ `npm run type-check`
> - ✅ `npm run lint`
> - ✅ `home_event_cta_url` 不可能被存成 `javascript:`/`data:`（write-side block）
> - ✅ 即使 DB 內已有不合法值，public Home 不會 render 可執行連結（render-side hardening）

---

### ~~PR-21~~ — Clean-code：集中 `company_settings` lookup helper（避免 default/fallback drift）✅

> **COMPLETED（2026-01-21）**
>
> 修復內容：
> - 新增 `lib/modules/content/company-settings.ts`（pure; no IO）：`getCompanySettingValue(settings, key, defaultValue?)`
> - 明確處理：trim、空字串視為無值（回 default）
> - 替換重複實作：
>   - `app/[locale]/page.tsx`
>   - `app/[locale]/about/page.tsx`
>   - `app/[locale]/contact/page.tsx`
>   - `components/home/HomePageV2.tsx`
> - 新增 guardrail test：`tests/company-settings-getter.test.ts`（確保 trim/empty 行為一致）
>
> DoD 驗證：
> - ✅ `npm test`（1082 pass）
> - ✅ `npm run type-check`
> - ✅ `npm run lint`
> - ✅ 所有 `getSetting()` 呼叫改用集中式 `getCompanySettingValue()`

## 4) 每 PR 驗證清單（不可省略）

- `npm test`
- `npm run lint`
- `npm run type-check`
- `npm run build`（routes/SEO/redirect 相關 PR 必跑；先確認 `.env.local` 已設 `NEXT_PUBLIC_SITE_URL` + Supabase public env）
