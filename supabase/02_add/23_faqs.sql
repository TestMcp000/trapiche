-- ============================================
-- ADD: FAQs
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/meta/STEP_PLAN.md (PR-38)
--
-- Tables:
-- - faqs: FAQ entries (question + answer)
--
-- ============================================


-- ============================================
-- PART 1: Create Tables
-- ============================================

-- faqs: FAQ entries
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_zh TEXT NOT NULL,
  answer_zh TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);


-- ============================================
-- PART 2: Create Indexes
-- ============================================

-- faqs indexes
CREATE INDEX IF NOT EXISTS idx_faqs_sort_order ON public.faqs(sort_order);
CREATE INDEX IF NOT EXISTS idx_faqs_visible ON public.faqs(is_visible);


-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: RLS Policies
-- ============================================

-- faqs: Public read (visible only)
CREATE POLICY "Anyone can read visible faqs"
  ON public.faqs FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- faqs: Admin manage
CREATE POLICY "Admins can manage faqs"
  ON public.faqs FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 5: Grants
-- ============================================

-- Public read access
GRANT SELECT ON public.faqs TO anon, authenticated;

-- Admin write access
GRANT INSERT, UPDATE, DELETE ON public.faqs TO authenticated;


-- ============================================
-- 完成 DONE (FAQs)
-- ============================================
