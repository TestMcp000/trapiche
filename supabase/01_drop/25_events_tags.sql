-- ============================================
-- DROP: Event Tags (event_tags + event_event_tags)
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/meta/STEP_PLAN.md (PR-39)
--
-- Drops in reverse order of creation:
-- 1. Policies
-- 2. Indexes
-- 3. Tables
--
-- ============================================


-- ============================================
-- PART 1: Drop RLS Policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can read visible event tags" ON public.event_tags;
DROP POLICY IF EXISTS "Admins can manage event tags" ON public.event_tags;
DROP POLICY IF EXISTS "Anyone can read event event tags" ON public.event_event_tags;
DROP POLICY IF EXISTS "Admins can manage event event tags" ON public.event_event_tags;


-- ============================================
-- PART 2: Drop Indexes
-- ============================================

DROP INDEX IF EXISTS public.idx_event_tags_slug;
DROP INDEX IF EXISTS public.idx_event_tags_sort_order;
DROP INDEX IF EXISTS public.idx_event_tags_visible;
DROP INDEX IF EXISTS public.idx_event_event_tags_tag_id;


-- ============================================
-- PART 3: Drop Tables
-- ============================================

DROP TABLE IF EXISTS public.event_event_tags;
DROP TABLE IF EXISTS public.event_tags;


-- ============================================
-- 完成 DONE (Drop Event Tags)
-- ============================================
