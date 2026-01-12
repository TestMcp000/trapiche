-- ============================================
-- DROP: 反應系統表格 (Reactions)
-- ============================================
-- 
-- 執行此腳本刪除所有反應相關表格與觸發器
--
-- ============================================


-- 刪除函數
DROP FUNCTION IF EXISTS public.fn_apply_like_delta() CASCADE;
DROP FUNCTION IF EXISTS public.fn_cleanup_reactions_on_comment_delete() CASCADE;
DROP FUNCTION IF EXISTS public.fn_cleanup_on_post_delete() CASCADE;
DROP FUNCTION IF EXISTS public.fn_cleanup_on_gallery_item_delete() CASCADE;


-- 刪除表格（使用 CASCADE，連帶移除 policies/indexes/triggers 等依賴物件）
DROP TABLE IF EXISTS public.reaction_rate_limits CASCADE;
DROP TABLE IF EXISTS public.reactions CASCADE;

-- 刪除類型
DROP TYPE IF EXISTS public.reaction_target_type CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================
