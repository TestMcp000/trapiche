-- ============================================
-- DROP: 留言系統表格 (Comments)
-- ============================================
-- 
-- 執行此腳本刪除所有留言系統相關表格
--
-- ============================================


-- 刪除表格（使用 CASCADE，連帶移除 policies/indexes/triggers 等依賴物件）
DROP TABLE IF EXISTS public.comment_moderation CASCADE;
DROP TABLE IF EXISTS public.spam_decision_log CASCADE;
DROP TABLE IF EXISTS public.comment_rate_limits CASCADE;
DROP TABLE IF EXISTS public.comment_public_settings CASCADE;
DROP TABLE IF EXISTS public.comment_settings CASCADE;
-- Note: site_admins is dropped in 01_drop/01_main.sql
DROP TABLE IF EXISTS public.comment_blacklist CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;

-- 刪除類型
DROP TYPE IF EXISTS public.comment_target_type CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================
