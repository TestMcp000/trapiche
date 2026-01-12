# Admin DX / Clean Code Hardening (Archive)

> Date: 2025-12-30  
> Status: COMPLETE ✅  
> Scope: admin DX hardening (shared result/error codes, slug validation SSOT, dependency direction cleanup)

本文件保存「已完成」的 Admin DX / Clean Code hardening 項目，避免把完成記錄混在 `uiux_refactor.md`（ACTIVE）內。

---

## Summary (When / What / Why / How)

- When: 2025-12-30
- What: standardized admin action results + error codes, centralized slug validation, and removed reverse dependencies from `components/admin/**` to `app/**`.
- Why: reduce drift, improve i18n/error UX, and keep dependency direction clean for maintainability.
- How: introduced shared types/guards/validators and refactored affected routes/components to use them.
- Result: cleaner admin DX with consistent errors and safer validation.

## 1. Admin Server Actions：統一 Result 型別 + 錯誤碼（i18n/資安友善） ✅ COMPLETE

> **Completed: 2025-12-30**

**實作內容：**

- `lib/types/action-result.ts`：`ActionResult<T>` + `ADMIN_ERROR_CODES` + `getErrorLabel()`（bilingual error mapping）
- `lib/auth/admin-guard.ts`：`requireSiteAdmin()` + `requireOwner()` 一行完成 auth guard
- Blog Categories：`actions.ts` + `CategoriesClient.tsx` 改用 `errorCode` + `getErrorLabel()`
- Blog Posts：`actions.ts` + `PostForm.tsx` + `DeletePostButton.tsx` 改用 `errorCode` + `getErrorLabel()`

**驗證結果：**

- `npm run type-check` ✓
- `npm test` ✓
- `npm run lint` ✓

---

## 2. Slug 驗證 Single Source（避免 regex 分散造成 drift） ✅ COMPLETE

> **Completed: 2025-12-30**

**實作內容：**

- `lib/validators/slug.ts`：`SLUG_REGEX` + `isValidSlug()` + `validateSlug()`（統一驗證來源）
- `tests/validators/slug.test.ts`：完整測試 valid/invalid cases
- 更新 `categories/actions.ts`、`posts/actions.ts`、`shop/products/actions.ts` 使用 `isValidSlug()`

**驗證結果：**

- `npm run type-check` ✓
- `npm test` ✓
- `npm run lint` ✓
- Guard grep: `rg -n "\\^\\[a-z0-9\\]+\\(?:-\\[a-z0-9\\]+\\)*\\$" app` 預期 **0** 命中 ✓

---

## 3. Admin UI：消除 `components/admin/**` 反向依賴 `app/**`（降低耦合） ✅ COMPLETE

> **Completed: 2025-12-30**

**完成內容：**

- 將 route-bound 的 client components 從 `components/admin/**` 移至對應的 route-local directories
- 更新 `page.tsx` imports 使用相對路徑（同層 `./<Module>Client`）
- 確認 `rg -n "@/app/[locale]/admin" components/admin` 返回 0 命中

**驗證結果：**

- `npm run type-check` ✓
- `npm test` ✓
- `npm run lint` ✓

