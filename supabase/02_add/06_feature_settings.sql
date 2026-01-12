-- ============================================
-- ADD: Feature Settings Table (Centralized Feature Toggles)
-- Version: 1.0
-- Last Updated: 2025-12-21
-- ============================================
--
-- This table provides centralized control for enabling/disabling
-- major site features (blog, gallery, shop).
--
-- Security: Only 'owner' role can modify feature settings.
-- Default: All features disabled until explicitly enabled.
--
-- ============================================

-- Create feature_settings table
CREATE TABLE IF NOT EXISTS public.feature_settings (
  feature_key TEXT PRIMARY KEY,                -- 'blog', 'gallery', 'shop'
  is_enabled BOOLEAN NOT NULL DEFAULT false,   -- All features disabled by default
  display_order INTEGER NOT NULL DEFAULT 0,    -- Order in admin UI
  description_en TEXT,                         -- Description for admin UI
  description_zh TEXT,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_feature_settings_enabled 
ON public.feature_settings(is_enabled);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE public.feature_settings ENABLE ROW LEVEL SECURITY;

-- Public can read all feature settings (needed for Header/Footer)
CREATE POLICY "Public can read feature settings"
ON public.feature_settings FOR SELECT
TO anon, authenticated
USING (true);

-- Only owner can modify feature settings (not editor)
CREATE POLICY "Owner can manage feature settings"
ON public.feature_settings FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') = 'owner'
);

-- Grants: allow read for public/clients, write for authenticated (RLS limits to owner)
GRANT SELECT ON public.feature_settings TO anon, authenticated;
GRANT UPDATE ON public.feature_settings TO authenticated;

-- ============================================
-- RPC Function for Feature Check
-- ============================================
-- Security definer function for efficient feature checks

CREATE OR REPLACE FUNCTION public.is_feature_enabled(p_feature_key TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_enabled FROM feature_settings WHERE feature_key = p_feature_key),
    false
  );
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(TEXT) TO anon, authenticated;

-- ============================================
-- DONE
-- ============================================
