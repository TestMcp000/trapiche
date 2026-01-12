-- ============================================
-- DROP: 畫廊表格 (Gallery)
-- ============================================
-- 
-- 執行此腳本刪除所有畫廊相關表格
--
-- ============================================


-- 刪除表格（按依賴順序；使用 CASCADE，連帶移除 policies/indexes/triggers 等依賴物件）
DROP TABLE IF EXISTS public.gallery_pins CASCADE;
DROP TABLE IF EXISTS public.gallery_items CASCADE;
DROP TABLE IF EXISTS public.gallery_categories CASCADE;

-- 刪除類型
DROP TYPE IF EXISTS public.gallery_pin_surface CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================
