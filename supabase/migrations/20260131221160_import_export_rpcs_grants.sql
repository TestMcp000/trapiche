-- ============================================
-- Import/Export RPC Grants
-- ============================================

-- Grant execute permissions (admin only via RLS)
GRANT EXECUTE ON FUNCTION public.import_blog_categories_batch(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_blog_posts_batch(JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.import_blog_bundle_atomic(JSONB, JSONB, UUID) TO authenticated;
