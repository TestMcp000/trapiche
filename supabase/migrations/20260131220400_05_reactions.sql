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
-- Design: Reaction writes happen server-side via service_role (to enforce rate limits and cookie-based anon_id).
-- Like counts are denormalized into gallery_items/comments via triggers; raw reactions are not public.

-- Reactions are mutated via server-only API (service_role) to enforce rate limits and anon_id cookie checks.
-- Keep raw reaction rows private; admins can read for debugging.
CREATE POLICY "Admins can read reactions"
  ON public.reactions FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

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

-- 1. reactions: admin read only (mutations via service_role)
GRANT SELECT ON public.reactions TO authenticated;

-- 2. reaction_rate_limits: NO GRANT for public (server-only via createAdminClient)
-- Admin can read via RLS policy above
GRANT SELECT ON public.reaction_rate_limits TO authenticated;

