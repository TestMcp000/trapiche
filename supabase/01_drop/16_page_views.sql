-- ============================================
-- DROP: Page Views Analytics Table & RPC
-- ============================================
--
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-01
--
-- @see doc/SPEC.md (Analytics -> Page Views)
-- @see ARCHITECTURE.md §10 - 資料一致性與安全
--
-- 執行順序 Execution Order:
-- 1. Drop policies
-- 2. Drop indexes (implicit with table drop)
-- 3. Drop function
-- 4. Drop table
--
-- ============================================


-- ============================================
-- PART 1: Drop RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Admins can read page views" ON public.page_view_daily;


-- ============================================
-- PART 2: Drop Function
-- ============================================

DROP FUNCTION IF EXISTS public.increment_page_view(DATE, TEXT, TEXT);


-- ============================================
-- PART 3: Drop Table (cascades indexes)
-- ============================================

DROP TABLE IF EXISTS public.page_view_daily;


-- ============================================
-- 完成 DONE
-- ============================================
