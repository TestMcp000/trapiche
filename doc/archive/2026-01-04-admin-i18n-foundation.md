# 2026-01-04 - Admin i18n Foundation (Archive)

> Date: 2026-01-04  
> Status: ARCHIVED / COMPLETE  
> Scope: Admin i18n foundation — `admin-locale` preference + Sidebar toggle + `messages/*` `admin.*` namespace baseline (not full Admin Panel coverage)

## Summary

- Admin 介面新增 `admin-locale` 偏好（cookie 為 SSR 來源；localStorage 作為 client 同步/備援）。
- AdminSidebar 提供語言切換（URL 不變；切換後 `router.refresh()` 觸發 server re-render）。
- `messages/en.json` + `messages/zh.json` 新增 `admin.*` namespace（Sidebar/common/buttons + 預留 `admin.errorLog.*` keys）。

## Evidence / File Map

- Locale helpers:
  - `lib/i18n/admin-locale.ts`
  - `lib/i18n/admin-locale.server.ts`
  - `hooks/useAdminLocale.ts`
- Admin layout + sidebar:
  - `app/[locale]/admin/layout.tsx`
  - `components/admin/common/AdminSidebar.tsx`
- Translations:
  - `messages/en.json`
  - `messages/zh.json`

## Archived Plan Sections（from `doc/meta/STEP_PLAN.md`）

### PR-1 — Admin Locale Preference + Sidebar Toggle（URL 不變）

#### Goal

- 後台 UI 語言可在 EN/中 切換，且 **URL 不變**（例如一直停留在 `/zh/admin/**`）。
- `admin-locale` 偏好可持久化（localStorage + cookie），重新整理/重新登入不丟失。

#### Scope

- 新增/整理 adminLocale 的解析與持久化（server + client）
- Sidebar 新增 toggle（UI: `EN` / `中`，150ms transition）
- 先把「Sidebar chrome」改為使用 `adminLocale`（即使尚未全面導入 messages）

#### Expected file touches

- `app/[locale]/admin/layout.tsx`
- `components/admin/common/AdminSidebar.tsx`
- `components/admin/common/AdminSignOutButton.tsx`（redirect 仍用 routeLocale；文案後續 PR-2 i18n）
- `lib/i18n/admin-locale.ts`（pure: normalize/parse）
- `lib/i18n/admin-locale.server.ts`（server-only: cookies/headers）
- `hooks/useAdminLocale.ts`（client: localStorage + cookie sync）或在 Sidebar 內就地實作（擇一）
- `tests/i18n/admin-locale.test.ts`（pure unit tests）

#### Steps

1. 建立純函式（可測）：`normalizeAdminLocale`, `inferLocaleFromAcceptLanguage`
2. 建立 server helper（server-only）：從 cookie/headers 產生 `adminLocale`
3. 修改 `app/[locale]/admin/layout.tsx`：
   - `routeLocale` 仍來自 `params.locale`
   - 取得 `adminLocale` 後傳入 `AdminSidebar`
4. 在 `AdminSidebar` 放入 toggle（取代現有「改 URL locale」Link）：
   - 寫入 `admin-locale`（localStorage + cookie）
   - `router.refresh()`（讓 server components 重新以新 cookie 渲染）
5. Manual QA（見 Verification）
6. 跑 guardrails：`npm test` + `npm run type-check` + `npm run lint`

#### Verification（Acceptance）

- Toggle 點擊後：URL 不變；Sidebar 文案立刻切換；無整頁重導
- Refresh 後偏好仍在（localStorage/cookie 任一存在時）
- `/en/admin/**` 與 `/zh/admin/**` 都能正常使用 toggle（toggle 只影響 admin UI）

#### Docs updates（per `doc/GOVERNANCE.md`）

- None（PR-1 視為基礎建置；完整落地後再回寫 `doc/SPEC.md`）

#### Rollback

- revert 本 PR 變更（移除 admin-locale 解析/存取 + toggle）

### PR-2 — `messages/*` 新增 `admin.*` Namespace（Sidebar + common chrome）

#### Goal

- 後台常見 UI（Sidebar、Sign out、Role mismatch banner、tabs labels）改用 `messages/*` 翻譯。
- `adminLocale` 切換後不需手寫 `locale === 'zh' ? ... : ...`。

#### Scope

- `messages/en.json` + `messages/zh.json` 新增 `admin` namespace（sidebar/common/buttons/tabs）
- 預留 Error Log keys（即便 UI 尚未實作）
- 導入 admin-only i18n provider（僅 admin 範圍；不要放 root layout）

#### Expected file touches

- `messages/en.json`
- `messages/zh.json`
- `app/[locale]/admin/layout.tsx`（可能新增 admin-only provider wrapper）
- `components/admin/common/AdminSidebar.tsx`
- `components/admin/common/AdminSignOutButton.tsx`
- `components/admin/common/AdminTabs.tsx`

#### Steps

1. 在 messages 新增 `admin.*`（建議分組：`admin.sidebar.*`, `admin.common.*`, `admin.buttons.*`, `admin.errorLog.*`）
2. 在 admin layout 建立 admin-only provider（messages scope 只帶 `admin` namespace；參考 `components/blog/ClientCommentSection.tsx` 的 scoped provider pattern）
3. Refactor：
   - Sidebar labels / dividers / “Logged in as”
   - Sign out button
   - Role mismatch banner（`app/[locale]/admin/layout.tsx`）
   - AdminTabs labels（避免每個 module 自帶 labelZh/labelEn）
4. 跑 tests/type-check/lint
5. Manual QA：切換語言後，上述區塊文案皆切換且 URL 不變

#### Verification（Acceptance）

- `messages/*` 內存在 `admin` namespace，且 toggle 時以 `adminLocale` 正確切換
- `components/admin/common/AdminSidebar.tsx` 不再依賴 route locale 做文案分支

#### Docs updates（per `doc/GOVERNANCE.md`）

- None（行為仍屬「未完成全面覆蓋」；完成後於 PR-6 一次回寫 `doc/SPEC.md`）

#### Rollback

- revert messages/admin namespace + provider + refactor

## Follow-ups

- Active step plan（pending work only）：`doc/meta/STEP_PLAN.md`
- Spec（source of truth for requirements）：`doc/specs/proposed/admin-i18n-toggle-spec.md`

