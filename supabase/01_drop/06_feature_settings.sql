-- ============================================
-- DROP: Feature Settings Table
-- Version: 1.0
-- ============================================

-- Drop RPC function
DROP FUNCTION IF EXISTS public.is_feature_enabled(TEXT);

-- Drop table (CASCADE handles policies)
DROP TABLE IF EXISTS public.feature_settings CASCADE;

-- ============================================
-- DONE
-- ============================================
