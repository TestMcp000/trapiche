-- ============================================
-- DROP: AI Analysis Custom Template References
-- ============================================
-- 
-- Rollback script for 02_add/17_ai_analysis_custom_template_refs.sql
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-03
--
-- ============================================


-- ============================================
-- PART 1: Revert ai_analysis_reports
-- ============================================

-- Drop cross-field CHECK
ALTER TABLE public.ai_analysis_reports
DROP CONSTRAINT IF EXISTS ai_analysis_reports_custom_template_ref_check;

-- Drop index
DROP INDEX IF EXISTS idx_ai_reports_custom_template;

-- Drop column
ALTER TABLE public.ai_analysis_reports
DROP COLUMN IF EXISTS custom_template_id;

-- Drop new template_id CHECK
ALTER TABLE public.ai_analysis_reports
DROP CONSTRAINT IF EXISTS ai_analysis_reports_template_id_check;

-- Restore original CHECK (built-in templates only)
ALTER TABLE public.ai_analysis_reports
ADD CONSTRAINT ai_analysis_reports_template_id_check 
CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation'));


-- ============================================
-- PART 2: Revert ai_analysis_schedules
-- ============================================

-- Drop cross-field CHECK
ALTER TABLE public.ai_analysis_schedules
DROP CONSTRAINT IF EXISTS ai_analysis_schedules_custom_template_ref_check;

-- Drop index
DROP INDEX IF EXISTS idx_ai_schedules_custom_template;

-- Drop column
ALTER TABLE public.ai_analysis_schedules
DROP COLUMN IF EXISTS custom_template_id;

-- Drop new template_id CHECK
ALTER TABLE public.ai_analysis_schedules
DROP CONSTRAINT IF EXISTS ai_analysis_schedules_template_id_check;

-- Restore original CHECK (built-in templates only)
ALTER TABLE public.ai_analysis_schedules
ADD CONSTRAINT ai_analysis_schedules_template_id_check 
CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation'));


-- ============================================
-- 完成 DONE
-- ============================================
