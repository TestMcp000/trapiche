-- ============================================
-- DROP: Events (event_types + events)
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C1–C3)
-- @see doc/meta/STEP_PLAN.md (PR-36)
--
-- ============================================


-- ============================================
-- DROP Policies First (must drop before tables)
-- ============================================

-- event_types policies
DROP POLICY IF EXISTS "Anyone can read visible event types" ON public.event_types;
DROP POLICY IF EXISTS "Admins can manage event types" ON public.event_types;

-- events policies
DROP POLICY IF EXISTS "Anyone can read public events" ON public.events;
DROP POLICY IF EXISTS "Admins can manage events" ON public.events;


-- ============================================
-- DROP Indexes
-- ============================================

-- event_types indexes
DROP INDEX IF EXISTS public.idx_event_types_slug;
DROP INDEX IF EXISTS public.idx_event_types_sort_order;
DROP INDEX IF EXISTS public.idx_event_types_visible;

-- events indexes
DROP INDEX IF EXISTS public.idx_events_slug;
DROP INDEX IF EXISTS public.idx_events_type_id;
DROP INDEX IF EXISTS public.idx_events_visibility;
DROP INDEX IF EXISTS public.idx_events_start_at;
DROP INDEX IF EXISTS public.idx_events_published_at;


-- ============================================
-- DROP Tables (order matters: events first, then event_types)
-- ============================================

DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.event_types CASCADE;


-- ============================================
-- 完成 DONE (Events)
-- ============================================
