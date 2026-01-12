-- ============================================
-- ADD: Landing Sections Table (Dynamic Landing Page)
-- Version: 1.0
-- ============================================
--
-- This table manages the landing page sections including preset sections
-- (hero, about, services, platforms, product_design, portfolio, contact)
-- and custom sections (custom_1...custom_10).
--
-- Content Source Rules:
-- - Preset sections: content comes from external sources (site_content, services, portfolio_items, gallery)
-- - Custom sections: content stored in content_en/zh JSONB columns
--
-- ============================================

-- Create landing_sections table
CREATE TABLE IF NOT EXISTS public.landing_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key TEXT UNIQUE NOT NULL,           -- 'hero', 'about', 'services', 'portfolio', 'custom_1'...'custom_10'
  section_type TEXT NOT NULL DEFAULT 'text',  -- Block type (preset sections have fixed types)
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,

  -- Localized content (for section titles/subtitles and custom block content)
  title_en TEXT,
  title_zh TEXT,
  subtitle_en TEXT,
  subtitle_zh TEXT,
  content_en JSONB,                           -- Type-specific content for custom blocks
  content_zh JSONB,

  -- Gallery integration (for gallery type blocks)
  gallery_category_id UUID REFERENCES public.gallery_categories(id) ON DELETE SET NULL,
  gallery_surface TEXT,                       -- For featured pins ('home' | 'gallery')

  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),

  -- Constraints
  CONSTRAINT valid_section_type CHECK (
    section_type IN ('text', 'text_image', 'cards', 'gallery', 'cta')
  ),
  CONSTRAINT valid_gallery_surface CHECK (
    gallery_surface IS NULL OR gallery_surface IN ('home', 'gallery')
  )
);

-- Index for efficient public queries (visible sections sorted)
CREATE INDEX IF NOT EXISTS idx_landing_sections_visible_sort
ON public.landing_sections(is_visible, sort_order);

-- ============================================
-- Row Level Security
-- ============================================

ALTER TABLE public.landing_sections ENABLE ROW LEVEL SECURITY;

-- Public can read visible sections only
CREATE POLICY "Public can read visible landing sections"
ON public.landing_sections FOR SELECT
TO anon, authenticated
USING (is_visible = true);

-- Admin full access (owner/editor roles)
CREATE POLICY "Admins can manage landing sections"
ON public.landing_sections FOR ALL
TO authenticated
USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
)
WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
);

-- ============================================
-- Grant Permissions (Table-level access)
-- ============================================

GRANT SELECT ON public.landing_sections TO anon, authenticated;

-- Admin write permissions (required alongside RLS policies)
GRANT INSERT, UPDATE, DELETE ON public.landing_sections TO authenticated;

-- ============================================
-- Note: Seed data moved to 03_seed/04_features_landing.sql
-- ============================================

-- ============================================
-- DONE
-- ============================================

