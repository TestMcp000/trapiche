-- ============================================
-- ADD: Contact Messages
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/meta/STEP_PLAN.md (PR-38)
--
-- Tables:
-- - contact_messages: Contact form submissions
--
-- Retention policy: Messages older than 90 days can be purged via admin action
--
-- ============================================


-- ============================================
-- PART 1: Create Tables
-- ============================================

-- contact_messages: Contact form submissions
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  honeypot TEXT,
  ip_hash TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);


-- ============================================
-- PART 2: Create Indexes
-- ============================================

-- contact_messages indexes
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read ON public.contact_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_contact_messages_is_archived ON public.contact_messages(is_archived);


-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: RLS Policies
-- ============================================

-- contact_messages: Public can insert (honeypot for spam filtering)
CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- contact_messages: Admin can read and manage
CREATE POLICY "Admins can manage contact messages"
  ON public.contact_messages FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 5: Grants
-- ============================================

-- Public insert access (for contact form)
GRANT INSERT ON public.contact_messages TO anon, authenticated;

-- Admin full access
GRANT SELECT, UPDATE, DELETE ON public.contact_messages TO authenticated;


-- ============================================
-- 完成 DONE (Contact Messages)
-- ============================================
