-- ============================================
-- ADD: Gallery Hotspots Table
-- Version: 1.0
-- ============================================
--
-- @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md §A
-- @see ARCHITECTURE.md - Gallery module
--
-- Hotspots are pin annotations on gallery item images.
-- Supports normalized coordinates (0..1), ordering (auto/manual),
-- and markdown content (with safe pipeline).
--
-- ============================================


-- ============================================
-- PART 1: Create Table
-- ============================================

CREATE TABLE IF NOT EXISTS public.gallery_hotspots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.gallery_items(id) ON DELETE CASCADE,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  media TEXT NOT NULL,
  preview TEXT NULL,
  symbolism TEXT NULL,
  description_md TEXT NOT NULL,
  read_more_url TEXT NULL,
  sort_order INTEGER NULL,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),

  -- Coordinate constraints (normalized 0..1)
  CONSTRAINT gallery_hotspots_x_range CHECK (x >= 0 AND x <= 1),
  CONSTRAINT gallery_hotspots_y_range CHECK (y >= 0 AND y <= 1),
  -- Description must not be empty
  CONSTRAINT gallery_hotspots_description_not_empty CHECK (description_md <> '')
);


-- ============================================
-- PART 2: Create Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_gallery_hotspots_item
  ON public.gallery_hotspots(item_id);

CREATE INDEX IF NOT EXISTS idx_gallery_hotspots_item_sort
  ON public.gallery_hotspots(item_id, sort_order);


-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.gallery_hotspots ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: RLS Policies
-- ============================================

-- Public read: hotspot visible AND parent item visible
CREATE POLICY "Anyone can read visible gallery hotspots"
  ON public.gallery_hotspots FOR SELECT
  TO anon, authenticated
  USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM public.gallery_items gi
      WHERE gi.id = item_id AND gi.is_visible = true
    )
  );

-- Admin manage: owner/editor can CRUD
CREATE POLICY "Admins can manage gallery hotspots"
  ON public.gallery_hotspots FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );


-- ============================================
-- PART 5: Grant Permissions
-- ============================================

-- Table-level permissions (required for RLS policies to take effect)
GRANT SELECT ON public.gallery_hotspots TO anon, authenticated;

-- Admin write permissions (RLS enforces owner/editor check)
GRANT INSERT, UPDATE, DELETE ON public.gallery_hotspots TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
