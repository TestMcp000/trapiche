-- ============================================
-- ADD: Event Tags (event_tags + event_event_tags)
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C4)
-- @see doc/meta/STEP_PLAN.md (PR-39)
--
-- Tables:
-- - event_tags: 活動標籤 (e.g., 親子, 團體, 線上)
-- - event_event_tags: join table (events <-> tags)
--
-- ============================================


-- ============================================
-- PART 1: Create Tables
-- ============================================

-- event_tags: 活動標籤
CREATE TABLE IF NOT EXISTS public.event_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_zh TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  show_in_nav BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Idempotent upgrades (for existing DBs)
ALTER TABLE IF EXISTS public.event_tags
  ADD COLUMN IF NOT EXISTS show_in_nav BOOLEAN NOT NULL DEFAULT false;

-- event_event_tags: join table (many-to-many)
CREATE TABLE IF NOT EXISTS public.event_event_tags (
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.event_tags(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  PRIMARY KEY (event_id, tag_id)
);


-- ============================================
-- PART 2: Create Indexes
-- ============================================

-- event_tags indexes
CREATE INDEX IF NOT EXISTS idx_event_tags_slug ON public.event_tags(slug);
CREATE INDEX IF NOT EXISTS idx_event_tags_sort_order ON public.event_tags(sort_order);
CREATE INDEX IF NOT EXISTS idx_event_tags_visible ON public.event_tags(is_visible);
CREATE INDEX IF NOT EXISTS idx_event_tags_show_in_nav ON public.event_tags(show_in_nav) WHERE show_in_nav = true;

-- event_event_tags indexes (composite PK serves as index for (event_id, tag_id))
CREATE INDEX IF NOT EXISTS idx_event_event_tags_tag_id ON public.event_event_tags(tag_id);


-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.event_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_event_tags ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: RLS Policies
-- ============================================

-- event_tags: Public read (visible only)
CREATE POLICY "Anyone can read visible event tags"
  ON public.event_tags FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- event_tags: Admin manage
CREATE POLICY "Admins can manage event tags"
  ON public.event_tags FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- event_event_tags: Public read (for joins)
CREATE POLICY "Anyone can read event event tags"
  ON public.event_event_tags FOR SELECT
  TO anon, authenticated
  USING (true);

-- event_event_tags: Admin manage
CREATE POLICY "Admins can manage event event tags"
  ON public.event_event_tags FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 5: Grants
-- ============================================

-- Public read access
GRANT SELECT ON public.event_tags TO anon, authenticated;
GRANT SELECT ON public.event_event_tags TO anon, authenticated;

-- Admin write access
GRANT INSERT, UPDATE, DELETE ON public.event_tags TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.event_event_tags TO authenticated;


-- ============================================
-- 完成 DONE (Event Tags)
-- ============================================
