-- ============================================
-- DROP: Users Module Tables
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-28
--
-- 執行此腳本刪除所有使用者模組相關表格
--
-- ============================================


-- ============================================
-- PART 1: 刪除觸發器與函式
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_sync ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auth_user_sync() CASCADE;


-- ============================================
-- PART 2: 刪除表格（按依賴順序）
-- ============================================

-- 使用者預約（無外部依賴）
DROP TABLE IF EXISTS public.user_appointments CASCADE;

-- 使用者後台檔案（無外部依賴）
DROP TABLE IF EXISTS public.user_admin_profiles CASCADE;

-- 使用者目錄（被其他表參照，最後刪除）
DROP TABLE IF EXISTS public.user_directory CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================
