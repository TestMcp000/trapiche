-- ============================================
-- ADD: Page Views Analytics Table & RPC
-- ============================================
--
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-01
--
-- 包含表格 TABLES:
-- - page_view_daily: Daily aggregated page views
--
-- 包含函數 FUNCTIONS:
-- - increment_page_view: Atomic upsert for page view counting
--
-- 依賴 DEPENDENCIES:
-- - 01_main.sql (site_admins for RLS role check)
--
-- @see doc/SPEC.md (Analytics -> Page Views)
-- @see ARCHITECTURE.md §3.13 - Data Intelligence Platform
--
-- ============================================


-- ============================================
-- PART 1: page_view_daily (Aggregated Page Views)
-- ============================================
--
-- Stores daily aggregated page views by path and locale.
-- Aggregation reduces storage and noise compared to raw events.
-- Privacy-first: no PII stored (no user identifiers).
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.page_view_daily (
  day DATE NOT NULL,
  path TEXT NOT NULL CHECK (path ~ '^/[a-zA-Z0-9/_-]*$' AND length(path) <= 500),
  locale TEXT NOT NULL CHECK (locale IN ('en', 'zh')),
  view_count INTEGER NOT NULL DEFAULT 0 CHECK (view_count >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  
  -- Composite primary key for upsert
  PRIMARY KEY (day, path, locale)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_page_view_daily_day ON public.page_view_daily(day DESC);
CREATE INDEX IF NOT EXISTS idx_page_view_daily_path ON public.page_view_daily(path);
CREATE INDEX IF NOT EXISTS idx_page_view_daily_locale ON public.page_view_daily(locale);
CREATE INDEX IF NOT EXISTS idx_page_view_daily_day_path ON public.page_view_daily(day DESC, path);


-- ============================================
-- PART 2: increment_page_view RPC (Atomic Upsert)
-- ============================================
--
-- Atomically increment view count for a given day/path/locale.
-- Uses ON CONFLICT to upsert in a single statement.
-- SECURITY DEFINER to allow API route access via service_role.
--
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_page_view(
  p_day DATE,
  p_path TEXT,
  p_locale TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate inputs
  IF p_path IS NULL OR p_path = '' THEN
    RAISE EXCEPTION 'Path cannot be null or empty';
  END IF;
  
  IF p_locale NOT IN ('en', 'zh') THEN
    RAISE EXCEPTION 'Locale must be en or zh';
  END IF;
  
  -- Atomic upsert
  INSERT INTO public.page_view_daily (day, path, locale, view_count, updated_at)
  VALUES (p_day, p_path, p_locale, 1, TIMEZONE('utc', NOW()))
  ON CONFLICT (day, path, locale) DO UPDATE SET
    view_count = page_view_daily.view_count + 1,
    updated_at = TIMEZONE('utc', NOW());
END;
$$;

-- Lock down SECURITY DEFINER function
REVOKE ALL ON FUNCTION public.increment_page_view(DATE, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_page_view(DATE, TEXT, TEXT) TO service_role;


-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.page_view_daily ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: RLS Policies - page_view_daily
-- ============================================
--
-- Admin-only read access (analytics visibility).
-- Writes happen via service_role (increment_page_view RPC).
--
-- ============================================

-- Admin SELECT only (Owner/Editor can read analytics)
CREATE POLICY "Admins can read page views"
  ON public.page_view_daily FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- All mutations go through increment_page_view RPC (service_role)


-- ============================================
-- PART 5: Grant Permissions (Table-level access)
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.
--
-- ============================================

-- page_view_daily: authenticated can SELECT (RLS enforces admin-only)
GRANT SELECT ON public.page_view_daily TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
