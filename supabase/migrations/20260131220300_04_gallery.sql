-- ============================================
-- ADD: Gallery Tables (Pinterest-style)
-- Version: 1.0
-- ============================================

CREATE TABLE IF NOT EXISTS public.gallery_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sort_order INTEGER NOT NULL DEFAULT 0,
  name_en VARCHAR(120) NOT NULL,
  name_zh VARCHAR(120) NOT NULL,
  slug VARCHAR(120) UNIQUE NOT NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  show_in_nav BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Idempotent upgrades (for existing DBs)
ALTER TABLE IF EXISTS public.gallery_categories
  ADD COLUMN IF NOT EXISTS show_in_nav BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES public.gallery_categories(id) ON DELETE RESTRICT,
  title_en VARCHAR(255) NOT NULL,
  title_zh VARCHAR(255) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  description_en TEXT NOT NULL DEFAULT '',
  description_zh TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL,
  image_width INTEGER,
  image_height INTEGER,
  og_image_format TEXT NOT NULL DEFAULT 'jpg' CHECK (og_image_format IN ('jpg','png')),
  image_alt_en VARCHAR(500),
  image_alt_zh VARCHAR(500),
  material_en VARCHAR(200),
  material_zh VARCHAR(200),
  tags_en TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  tags_zh TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  is_visible BOOLEAN NOT NULL DEFAULT true,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(category_id, slug)
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gallery_pin_surface') THEN
    CREATE TYPE public.gallery_pin_surface AS ENUM ('home', 'gallery', 'hero');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.gallery_pins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  surface public.gallery_pin_surface NOT NULL,
  item_id UUID NOT NULL REFERENCES public.gallery_items(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(surface, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gallery_categories_visible_sort ON public.gallery_categories(is_visible, sort_order);
CREATE INDEX IF NOT EXISTS idx_gallery_categories_show_in_nav ON public.gallery_categories(show_in_nav) WHERE show_in_nav = true;
CREATE INDEX IF NOT EXISTS idx_gallery_items_category_visible_created ON public.gallery_items(category_id, is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_visible_created ON public.gallery_items(is_visible, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_visible_like_created ON public.gallery_items(is_visible, like_count DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gallery_items_tags_en ON public.gallery_items USING GIN(tags_en);
CREATE INDEX IF NOT EXISTS idx_gallery_items_tags_zh ON public.gallery_items USING GIN(tags_zh);
CREATE INDEX IF NOT EXISTS idx_gallery_pins_surface_order ON public.gallery_pins(surface, sort_order);

-- Hero singleton constraint: at most one item can be selected as hero
CREATE UNIQUE INDEX IF NOT EXISTS idx_gallery_pins_hero_singleton
  ON public.gallery_pins (surface) WHERE surface = 'hero';

-- RLS
ALTER TABLE public.gallery_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_pins ENABLE ROW LEVEL SECURITY;

-- Public read: only visible categories/items, and pins whose item is visible
CREATE POLICY "Anyone can read visible gallery categories"
  ON public.gallery_categories FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

CREATE POLICY "Anyone can read visible gallery items"
  ON public.gallery_items FOR SELECT
  TO anon, authenticated
  USING (is_visible = true);

CREATE POLICY "Anyone can read gallery pins for visible items"
  ON public.gallery_pins FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.gallery_items gi
      WHERE gi.id = item_id AND gi.is_visible = true
    )
  );

-- Admin manage: email in site_admins
CREATE POLICY "Admins can manage gallery categories"
  ON public.gallery_categories FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can manage gallery items"
  ON public.gallery_items FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can manage gallery pins"
  ON public.gallery_pins FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- Table-level permissions (required for RLS policies to take effect)
-- Without these, anon/authenticated users cannot SELECT even with valid RLS policies
GRANT SELECT ON public.gallery_categories TO anon, authenticated;
GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT SELECT ON public.gallery_pins TO anon, authenticated;

-- Admin write permissions (RLS enforces owner/editor check)
GRANT INSERT, UPDATE, DELETE ON public.gallery_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_pins TO authenticated;

