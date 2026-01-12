-- ============================================
-- COMBINED GRANTS for myownwebsite
-- Version: 1.1
-- Last Updated: 2025-12-31
-- ============================================
--
-- Purpose: Centralized GRANT statements for all tables / functions.
-- Notes:
-- - `supabase/COMBINED_ADD.sql` already contains these GRANTs.
-- - Use this file when you see `permission denied` after schema changes.
-- ============================================

-- ============================================
-- Service Role (server-only)
-- ============================================
-- Supabase `service_role` key bypasses RLS but still needs PostgreSQL GRANTs.
-- This project uses `createAdminClient()` (service role) for server-only IO:
-- - Embeddings batch init / queue workers / semantic search
-- - Reactions (anonymous likes)
-- - Webhooks / cron jobs / system tasks
--
-- Without these grants you'll see errors like:
-- - `permission denied for table products`
-- - `permission denied for table embeddings`
--
-- ✅ Grant full access to all current public tables (and future ones via default privileges).
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- ============================================
-- Core (01_main.sql)
-- ============================================

GRANT SELECT ON public.posts TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT SELECT ON public.portfolio_items TO anon, authenticated;
GRANT SELECT ON public.services TO anon, authenticated;
GRANT SELECT ON public.company_settings TO anon, authenticated;
GRANT SELECT ON public.system_settings TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.portfolio_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_settings TO authenticated;

GRANT SELECT ON public.site_admins TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_admins TO authenticated;

GRANT INSERT ON public.content_history TO authenticated;

GRANT INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;

GRANT EXECUTE ON FUNCTION public.increment_cache_version() TO service_role;

-- ============================================
-- Comments + Reactions (02_comments.sql / 05_reactions.sql)
-- ============================================

GRANT SELECT ON public.comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comments TO authenticated;

GRANT SELECT ON public.comment_public_settings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.comment_public_settings TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_blacklist TO authenticated;
GRANT SELECT, UPDATE, DELETE ON public.spam_decision_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comment_moderation TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.reactions TO anon, authenticated;
GRANT SELECT ON public.reaction_rate_limits TO authenticated;

-- ============================================
-- Reports (03_reports.sql)
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;

-- ============================================
-- Gallery (04_gallery.sql)
-- ============================================

GRANT SELECT ON public.gallery_categories TO anon, authenticated;
GRANT SELECT ON public.gallery_items TO anon, authenticated;
GRANT SELECT ON public.gallery_pins TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.gallery_categories TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_pins TO authenticated;

-- ============================================
-- Feature Settings (06_feature_settings.sql)
-- ============================================

GRANT SELECT ON public.feature_settings TO anon, authenticated;
GRANT UPDATE ON public.feature_settings TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(TEXT) TO anon, authenticated;

-- ============================================
-- Shop (07_shop.sql / 08_shop_functions.sql)
-- ============================================

GRANT EXECUTE ON FUNCTION public.get_shop_settings_public() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_shop_visible() TO anon, authenticated;

GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.product_variants TO anon, authenticated;

GRANT SELECT ON public.shop_settings TO authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT SELECT ON public.order_items TO authenticated;
GRANT SELECT ON public.coupons TO authenticated;
GRANT SELECT ON public.coupon_redemptions TO authenticated;
GRANT SELECT ON public.payment_provider_configs TO authenticated;
GRANT SELECT ON public.customer_profiles TO authenticated;

GRANT INSERT, UPDATE, DELETE ON public.shop_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.product_variants TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coupons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.payment_provider_configs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.customer_profiles TO authenticated;

GRANT EXECUTE ON FUNCTION public.read_payment_secret(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.store_payment_secret(TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.update_payment_secret(UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.process_payment_success(UUID, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_order_with_reservation(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT, JSONB, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.redeem_coupon(TEXT, UUID, UUID, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_reservations() TO service_role;

-- ============================================
-- Landing Sections (09_landing_sections.sql)
-- ============================================

GRANT SELECT ON public.landing_sections TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.landing_sections TO authenticated;

-- ============================================
-- Theme / Site Config (10_theme.sql)
-- ============================================

GRANT SELECT ON public.site_config TO anon, authenticated;
GRANT UPDATE ON public.site_config TO authenticated;

-- ============================================
-- Users (11_users.sql)
-- ============================================

GRANT SELECT ON public.user_directory TO authenticated;
GRANT SELECT ON public.user_admin_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_admin_profiles TO authenticated;
GRANT SELECT ON public.user_appointments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.user_appointments TO authenticated;

-- ============================================
-- AI Analysis (12_ai_analysis.sql)
-- ============================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_reports TO authenticated;
GRANT SELECT ON public.ai_usage_monthly TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_schedules TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(TEXT, NUMERIC) TO service_role;

-- ============================================
-- Embeddings (13_embeddings.sql)
-- ============================================

GRANT SELECT ON public.embeddings TO authenticated;
GRANT SELECT ON public.embedding_queue TO authenticated;
GRANT SELECT ON public.similar_items TO anon, authenticated;

GRANT SELECT, INSERT ON public.search_logs TO authenticated;

GRANT EXECUTE ON FUNCTION public.match_embeddings(vector(1536), float, int, text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.search_embeddings_keyword(text, int, text[]) TO service_role;

-- ============================================
-- Import / Export (RPC + jobs)
-- ============================================

GRANT EXECUTE ON FUNCTION public.import_blog_categories_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_blog_posts_batch(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_blog_bundle_atomic(JSONB, JSONB, UUID) TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.import_export_jobs TO authenticated;
GRANT DELETE ON public.import_export_jobs TO authenticated;
