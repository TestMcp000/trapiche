-- ============================================
-- DROP: FAQs
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/meta/STEP_PLAN.md (PR-38)
--
-- ============================================


-- ============================================
-- Drop Policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can read visible faqs" ON public.faqs;
DROP POLICY IF EXISTS "Admins can manage faqs" ON public.faqs;


-- ============================================
-- Drop Indexes
-- ============================================

DROP INDEX IF EXISTS idx_faqs_sort_order;
DROP INDEX IF EXISTS idx_faqs_visible;


-- ============================================
-- Drop Tables
-- ============================================

DROP TABLE IF EXISTS public.faqs CASCADE;


-- ============================================
-- 完成 DONE (FAQs Drop)
-- ============================================
