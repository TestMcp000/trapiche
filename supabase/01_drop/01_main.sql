-- ============================================
-- DROP: 主網站表格 (Main Website)
-- ============================================
-- 
-- 執行此腳本刪除所有主網站相關表格
--
-- ============================================


-- 刪除函式與觸發器（Phase 2: JWT Claims）
-- 注意：若已執行 02_comments.sql，site_admins 表已被刪除（含觸發器）
-- 若獨立執行本檔案，需先確保 site_admins 存在才能刪除觸發器
DROP FUNCTION IF EXISTS public.increment_cache_version() CASCADE;
DROP FUNCTION IF EXISTS public.handle_site_admin_changes() CASCADE;

-- 刪除表格（使用 CASCADE，連帶移除 policies/indexes/triggers 等依賴物件）
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.content_history CASCADE;
DROP TABLE IF EXISTS public.site_content CASCADE;
DROP TABLE IF EXISTS public.portfolio_items CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.company_settings CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.site_admins CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================
