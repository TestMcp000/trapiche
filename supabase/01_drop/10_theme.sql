-- ============================================
-- DROP: Theme/Site Config Table
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-23
--
-- 執行此腳本刪除主題配置相關表格
--
-- ============================================


-- Drop policies first (CASCADE handles this, but explicit for clarity)
DROP POLICY IF EXISTS "Public can read site config" ON public.site_config;
DROP POLICY IF EXISTS "Owner can manage site config" ON public.site_config;

-- Drop table (CASCADE removes remaining dependencies)
DROP TABLE IF EXISTS public.site_config CASCADE;


-- ============================================
-- DONE
-- ============================================
