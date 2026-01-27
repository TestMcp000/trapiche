-- ============================================
-- ADD: Events (event_types + events)
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C1–C3)
-- @see doc/meta/STEP_PLAN.md (PR-36)
--
-- Tables:
-- - event_types: 活動類型 (e.g., 講座, 工作坊, 企業內訓)
-- - events: 活動資料
--
-- ============================================


-- ============================================
-- PART 1: Create Tables
-- ============================================

-- event_types: 活動類型
CREATE TABLE IF NOT EXISTS public.event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name_zh TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- events: 活動資料
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID REFERENCES public.event_types(id) ON DELETE SET NULL,
  slug TEXT UNIQUE NOT NULL,
  title_zh TEXT NOT NULL,
  excerpt_zh TEXT,
  content_md_zh TEXT,
  cover_image_url TEXT,
  cover_image_alt_zh TEXT,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ,
  timezone TEXT NOT NULL DEFAULT 'Asia/Taipei',
  location_name TEXT,
  location_address TEXT,
  online_url TEXT,
  registration_url TEXT,
  visibility TEXT NOT NULL DEFAULT 'draft' CHECK (visibility IN ('draft', 'private', 'public')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);


-- ============================================
-- PART 2: Create Indexes
-- ============================================

-- event_types indexes
CREATE INDEX IF NOT EXISTS idx_event_types_slug ON public.event_types(slug);
CREATE INDEX IF NOT EXISTS idx_event_types_sort_order ON public.event_types(sort_order);
CREATE INDEX IF NOT EXISTS idx_event_types_visible ON public.event_types(is_visible);

-- events indexes
CREATE INDEX IF NOT EXISTS idx_events_slug ON public.events(slug);
CREATE INDEX IF NOT EXISTS idx_events_type_id ON public.events(type_id);
CREATE INDEX IF NOT EXISTS idx_events_visibility ON public.events(visibility);
CREATE INDEX IF NOT EXISTS idx_events_start_at ON public.events(start_at);
CREATE INDEX IF NOT EXISTS idx_events_published_at ON public.events(published_at);


-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: RLS Policies
-- ============================================

-- event_types: Public read (visible only)
CREATE POLICY "Anyone can read visible event types"
  ON public.event_types FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

-- event_types: Admin manage
CREATE POLICY "Admins can manage event types"
  ON public.event_types FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- events: Public read (public visibility only)
CREATE POLICY "Anyone can read public events"
  ON public.events FOR SELECT
  TO anon, authenticated
  USING (visibility = 'public');

-- events: Admin manage
CREATE POLICY "Admins can manage events"
  ON public.events FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 5: Grants
-- ============================================

-- Public read access
GRANT SELECT ON public.event_types TO anon, authenticated;
GRANT SELECT ON public.events TO anon, authenticated;

-- Admin write access
GRANT INSERT, UPDATE, DELETE ON public.event_types TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.events TO authenticated;


-- ============================================
-- 完成 DONE (Events)
-- ============================================
