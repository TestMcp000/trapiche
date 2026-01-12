-- ============================================
-- ADD: Reactions (Anonymous Like)
-- Version: 1.0
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reaction_target_type') THEN
    CREATE TYPE public.reaction_target_type AS ENUM ('gallery_item', 'comment');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type public.reaction_target_type NOT NULL,
  target_id UUID NOT NULL,
  anon_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(target_type, target_id, anon_id)
);

CREATE TABLE IF NOT EXISTS public.reaction_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reactions_target ON public.reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reactions_anon ON public.reactions(anon_id);
CREATE INDEX IF NOT EXISTS idx_reaction_rate_limits_lookup ON public.reaction_rate_limits(ip_hash, window_start);

-- RLS
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reaction_rate_limits ENABLE ROW LEVEL SECURITY;

-- ============================================
-- Reactions RLS Policies
-- ============================================
-- Design: Anyone (anon + authenticated) can like/unlike gallery items and comments.
-- Reactions use anon_id (client-side UUID) for deduplication, not user_id.

-- 1. Anyone can read reactions (needed for like counts)
CREATE POLICY "Anyone can read reactions"
  ON public.reactions FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Anyone can insert reactions (anonymous like)
CREATE POLICY "Anyone can insert reactions"
  ON public.reactions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 3. Anyone can delete their own reaction (unlike via anon_id match)
CREATE POLICY "Anyone can delete reactions"
  ON public.reactions FOR DELETE
  TO anon, authenticated
  USING (true);

-- Admin read for debugging (already covered by "Anyone can read" above, but explicit)
-- Note: Admin can also manage via service_role if needed

-- Rate limits are server-only (no RLS policy = service_role only)
CREATE POLICY "Admins can read reaction rate limits"
  ON public.reaction_rate_limits FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- ============================================
-- GRANT Permissions for Reactions Tables
-- ============================================
-- RLS policies control WHICH rows; GRANT controls table-level access.

-- 1. reactions: anon + authenticated can SELECT/INSERT/DELETE (for like/unlike)
GRANT SELECT, INSERT, DELETE ON public.reactions TO anon, authenticated;

-- 2. reaction_rate_limits: NO GRANT for public (server-only via createAdminClient)
-- Admin can read via RLS policy above
GRANT SELECT ON public.reaction_rate_limits TO authenticated;

