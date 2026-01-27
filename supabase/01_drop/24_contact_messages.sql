-- ============================================
-- DROP: Contact Messages
-- ============================================
--
-- Version: 1.0
-- Last Updated: 2026-01-27
--
-- @see doc/meta/STEP_PLAN.md (PR-38)
--
-- ============================================


-- ============================================
-- Drop Policies
-- ============================================

DROP POLICY IF EXISTS "Anyone can submit contact messages" ON public.contact_messages;
DROP POLICY IF EXISTS "Admins can manage contact messages" ON public.contact_messages;


-- ============================================
-- Drop Indexes
-- ============================================

DROP INDEX IF EXISTS idx_contact_messages_created_at;
DROP INDEX IF EXISTS idx_contact_messages_is_read;
DROP INDEX IF EXISTS idx_contact_messages_is_archived;


-- ============================================
-- Drop Tables
-- ============================================

DROP TABLE IF EXISTS public.contact_messages CASCADE;


-- ============================================
-- 完成 DONE (Contact Messages Drop)
-- ============================================
