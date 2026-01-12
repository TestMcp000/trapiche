-- ============================================
-- DROP: AI Analysis Report Shares (Public Share Links)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-03
--
-- 依賴順序 DROP ORDER:
-- 1. Drop function first (depends on nothing)
-- 2. Drop table (after function)
--
-- ============================================


-- ============================================
-- PART 1: Drop Function
-- ============================================

DROP FUNCTION IF EXISTS public.get_shared_ai_report(TEXT);


-- ============================================
-- PART 2: Drop Table
-- ============================================

DROP TABLE IF EXISTS public.ai_analysis_report_shares;


-- ============================================
-- 完成 DONE
-- ============================================
