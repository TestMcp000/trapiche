-- ============================================
-- DROP: Landing Sections Table
-- ============================================
--
-- Execute this script to drop all landing sections related objects.
-- Must be run before 02_add/09_landing_sections.sql for clean reinstall.
--
-- ============================================

-- Drop policies first (CASCADE handles this, but explicit for clarity)
DROP POLICY IF EXISTS "Public can read visible landing sections" ON public.landing_sections;
DROP POLICY IF EXISTS "Admins can manage landing sections" ON public.landing_sections;

-- Drop index
DROP INDEX IF EXISTS public.idx_landing_sections_visible_sort;

-- Drop table (CASCADE removes remaining dependencies)
DROP TABLE IF EXISTS public.landing_sections CASCADE;

-- ============================================
-- DONE
-- ============================================
