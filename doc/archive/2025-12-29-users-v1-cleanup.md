# Users Admin V1 Cleanup (Archive)

> Date: 2025-12-29  
> Status: COMPLETE ✅  
> Scope: Users admin UX cleanup (notes preview, tag filtering, shared date formatting, query hardening)

本文件保存「已完成」的 Users Admin V1 清理項目，避免把完成記錄混在 `uiux_refactor.md`（ACTIVE）內。

---

## Summary (When / What / Why / How)

- When: 2025-12-29
- What: improved Users admin list/detail UX (notes preview, tag filter UI, date formatting SSOT, safer tag filtering query).
- Why: reduce duplicated logic, prevent query fragility, and keep admin UX consistent without adding client bundle weight.
- How: added shared helpers + admin IO aggregation, and used URL-driven server-first filtering.
- Result: cleaner admin UX with stable queries and shared formatting.

## 1. Users「管理員備註」Preview ✅ COMPLETE

> **Completed 2025-12-29**: Implemented optional Markdown preview via `?notesPreview=1` query param.
>
> - Server-side `markdownToHtml()` only called when preview mode is active
> - Client-side Raw/Preview toggle uses `router.push()` (no markdown deps in client bundle)
> - Files: `page.tsx`, `UserDetailClient.tsx`, `UserAdminNotesCard.tsx`
> - Verification: type-check ✅, 456 tests ✅, lint ✅

---

## 2. Users list「Tag Filter」UI ✅ COMPLETE

> **Completed 2025-12-29**: Implemented tag filter UI with clickable tag chips.
>
> - `lib/user/user-tags-admin-io.ts`: `getUserTagSummary()` aggregates tags from DB
> - `app/[locale]/admin/users/page.tsx`: Parallel fetch users + tags via `Promise.all`
> - `app/[locale]/admin/users/UsersClient.tsx`: Tag filter bar with Link-based navigation
> - Server-first: No client-side data fetch, URL changes trigger RSC re-render
> - Verification: type-check ✅, 456 tests ✅, lint ✅

---

## 3. Users list「日期格式」Single Source ✅ COMPLETE

> **Completed 2025-12-29**: Date formatting uses shared helper, no route-local duplicates.
>
> - `lib/user/user-helpers.ts`: Added `formatDateShortLocalized()` for date-only display
> - `tests/user-helpers.test.ts`: Tests for en/zh/unknown locale fallback
> - `UsersClient.tsx`: Uses `formatDateShortLocalized` from shared helper (no local `formatDate`)
> - Verification: type-check ✅, 456 tests ✅, lint ✅

---

## 4. Users tag filter「查詢硬化」 ✅ COMPLETE

> **Completed 2025-12-29**: Tag filter uses `.contains()` instead of `.or()` string interpolation.
>
> - `lib/user/users-admin-io.ts:getUserListFiltered()`: Two-step query with Set union
> - Uses `.contains('tags_en', [normalizedTag])` and `.contains('tags_zh', [normalizedTag])`
> - Tag length validation (max 64 chars) to prevent query abuse
> - Special characters no longer break filter expression parsing
> - Verification: type-check ✅, 456 tests ✅, lint ✅

