-- ============================================
-- DROP: AI Analysis Module Tables & RPC
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-30
--
-- 執行此腳本刪除所有 AI 分析模組相關表格與函數
--
-- ============================================


-- ============================================
-- PART 1: 刪除函數
-- ============================================

DROP FUNCTION IF EXISTS public.increment_ai_usage(TEXT, NUMERIC) CASCADE;


-- ============================================
-- PART 2: 刪除表格（按依賴順序）
-- ============================================

-- AI 分析排程（先刪除，因為依賴 ai_analysis_reports）
DROP TABLE IF EXISTS public.ai_analysis_schedules CASCADE;

-- AI 分析報告
DROP TABLE IF EXISTS public.ai_analysis_reports CASCADE;

-- AI 使用量統計
DROP TABLE IF EXISTS public.ai_usage_monthly CASCADE;


-- ============================================
-- 完成 DONE
-- ============================================
