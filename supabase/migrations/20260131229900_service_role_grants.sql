-- ============================================
-- Service Role (server-only) - Global Grants
-- ============================================
-- Supabase `service_role` key bypasses RLS but still needs PostgreSQL GRANTs.
-- Many server-only modules use `createAdminClient()` (service role) and must be able
-- to read/write across public tables (embeddings, queues, cron jobs, webhooks, etc.).

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

