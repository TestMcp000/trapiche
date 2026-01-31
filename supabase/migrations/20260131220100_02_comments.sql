-- ============================================
-- ADD: Comments (Multi-target)
-- Version: 3.0
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'comment_target_type') THEN
    CREATE TYPE public.comment_target_type AS ENUM ('post', 'gallery_item');
  END IF;
END$$;

-- P0-6: Sensitive fields moved to comment_moderation table
-- user_email, ip_hash, spam_score, spam_reason, link_count -> comment_moderation
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type public.comment_target_type NOT NULL,
  target_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_display_name VARCHAR(255) NOT NULL,
  user_avatar_url TEXT,
  -- P0-6: user_email REMOVED (in comment_moderation)
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  is_spam BOOLEAN NOT NULL DEFAULT false,
  is_approved BOOLEAN NOT NULL DEFAULT true,
  -- P0-6: spam_score, spam_reason, ip_hash, link_count REMOVED (in comment_moderation)
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.comment_blacklist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('keyword', 'ip', 'email', 'domain')),
  value TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(type, value)
);

-- Note: site_admins table is defined in 01_main.sql (single source of truth)

CREATE TABLE IF NOT EXISTS public.comment_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.comment_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  target_type public.comment_target_type NOT NULL,
  target_id UUID NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.spam_decision_log (
  id BIGSERIAL PRIMARY KEY,
  comment_id UUID,
  target_type public.comment_target_type,
  target_id UUID,
  decision VARCHAR(20),
  reason TEXT,
  link_count INTEGER,
  akismet_tip TEXT,
  recaptcha_score DECIMAL(3,2),
  ip_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS public.comment_public_settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW())
);

-- ============================================
-- Comment Moderation Table (Sensitive Data)
-- Phase 5: Separate moderation data for admin-only access
-- ============================================
CREATE TABLE IF NOT EXISTS public.comment_moderation (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_email VARCHAR(255),
  ip_hash VARCHAR(64),
  spam_score DECIMAL(3,2),
  spam_reason TEXT,
  link_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(comment_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_comments_target_approved ON public.comments(target_type, target_id, is_approved, is_spam);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup ON public.comment_rate_limits(ip_hash, target_type, target_id, window_start);
CREATE INDEX IF NOT EXISTS idx_blacklist_lookup ON public.comment_blacklist(type, value);
CREATE INDEX IF NOT EXISTS idx_spam_log_created ON public.spam_decision_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comment_moderation_comment ON public.comment_moderation(comment_id);

-- RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spam_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_public_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_moderation ENABLE ROW LEVEL SECURITY;

-- Policies: public read approved
CREATE POLICY "Anyone can read approved comments"
  ON public.comments FOR SELECT
  TO anon, authenticated
  USING (is_approved = true AND is_spam = false);

-- Policies: authenticated insert/update/delete own
CREATE POLICY "Auth users can insert own comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies: admin full access
CREATE POLICY "Admin full access to comments"
  ON public.comments FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- Blacklist is admin-only (Phase 5: no public read)
CREATE POLICY "Admins can manage comment blacklist"
  ON public.comment_blacklist FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Authenticated can read comment settings"
  ON public.comment_settings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage comment settings"
  ON public.comment_settings FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- Rate limits are server-only (Phase 5: no RLS policy for authenticated)
-- Operations use createAdminClient() in lib/modules/comment/admin-io.ts
-- No policy = service_role only

-- Spam log insert is server-only (Phase 5: via createAdminClient)
-- No authenticated INSERT policy = service_role only

CREATE POLICY "Admins can read spam log"
  ON public.spam_decision_log FOR SELECT
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can update spam log"
  ON public.spam_decision_log FOR UPDATE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Admins can delete spam log"
  ON public.spam_decision_log FOR DELETE
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

CREATE POLICY "Anyone can read comment admins"
  ON public.site_admins FOR SELECT
  TO authenticated
  USING (LOWER(email) = LOWER(auth.jwt() ->> 'email'));

CREATE POLICY "Anyone can read public settings"
  ON public.comment_public_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage public settings"
  ON public.comment_public_settings FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- Moderation data is admin-only (Phase 5)
CREATE POLICY "Admins can manage comment moderation"
  ON public.comment_moderation FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );

-- ============================================
-- GRANT Permissions for Comments Tables
-- ============================================
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.

-- 1. comments: anon can read approved, authenticated can CRUD own (RLS enforces ownership)
GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;

-- 2. comment_public_settings: public read, admin write (RLS enforces admin)
GRANT SELECT ON public.comment_public_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comment_public_settings TO authenticated;

-- 3. comment_settings: authenticated read, admin write (RLS enforces admin)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_settings TO authenticated;

-- 4. comment_blacklist: admin-only (RLS enforces admin check)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_blacklist TO authenticated;

-- 5. spam_decision_log: admin read/update/delete, INSERT via service_role only
GRANT SELECT, UPDATE, DELETE ON public.spam_decision_log TO authenticated;

-- 6. comment_moderation: admin-only (RLS enforces admin check)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_moderation TO authenticated;

-- 7. comment_rate_limits: NO GRANT (server-only via createAdminClient)
