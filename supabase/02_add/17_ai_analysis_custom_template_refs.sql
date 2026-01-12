-- ============================================
-- ADD: AI Analysis Custom Template References
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-03
--
-- ALTERs:
-- - ai_analysis_reports: add custom_template_id column
-- - ai_analysis_schedules: add custom_template_id column
--
-- 依賴 DEPENDENCIES:
-- - 12_ai_analysis.sql (ai_analysis_reports, ai_analysis_schedules tables)
-- - 15_ai_analysis_templates.sql (ai_analysis_templates table)
--
-- @see doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md (PR-3: AI Analysis Custom Templates)
-- @see ARCHITECTURE.md §3.13 - Data Intelligence Platform
--
-- ============================================


-- ============================================
-- PART 1: Add custom_template_id to ai_analysis_reports
-- ============================================

-- Add column (nullable FK to templates)
ALTER TABLE public.ai_analysis_reports
ADD COLUMN IF NOT EXISTS custom_template_id UUID REFERENCES public.ai_analysis_templates(id) ON DELETE SET NULL;

-- Drop old template_id CHECK constraint (allows only built-in templates)
-- Note: constraint name may vary; using DO block for safety
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'ai_analysis_reports' 
    AND column_name = 'template_id'
    AND constraint_name = 'ai_analysis_reports_template_id_check'
  ) THEN
    ALTER TABLE public.ai_analysis_reports DROP CONSTRAINT ai_analysis_reports_template_id_check;
  END IF;
END$$;

-- Add new CHECK constraint: allow built-in templates + 'custom'
ALTER TABLE public.ai_analysis_reports
ADD CONSTRAINT ai_analysis_reports_template_id_check 
CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation', 'custom'));

-- Add cross-field CHECK: template_id='custom' ↔ custom_template_id IS NOT NULL
ALTER TABLE public.ai_analysis_reports
ADD CONSTRAINT ai_analysis_reports_custom_template_ref_check
CHECK (
  (template_id = 'custom' AND custom_template_id IS NOT NULL) OR
  (template_id != 'custom' AND custom_template_id IS NULL)
);

-- Add index for custom_template_id lookups
CREATE INDEX IF NOT EXISTS idx_ai_reports_custom_template ON public.ai_analysis_reports(custom_template_id) WHERE custom_template_id IS NOT NULL;


-- ============================================
-- PART 2: Add custom_template_id to ai_analysis_schedules
-- ============================================

-- Add column (nullable FK to templates)
ALTER TABLE public.ai_analysis_schedules
ADD COLUMN IF NOT EXISTS custom_template_id UUID REFERENCES public.ai_analysis_templates(id) ON DELETE SET NULL;

-- Drop old template_id CHECK constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage 
    WHERE table_name = 'ai_analysis_schedules' 
    AND column_name = 'template_id'
    AND constraint_name = 'ai_analysis_schedules_template_id_check'
  ) THEN
    ALTER TABLE public.ai_analysis_schedules DROP CONSTRAINT ai_analysis_schedules_template_id_check;
  END IF;
END$$;

-- Add new CHECK constraint: allow built-in templates + 'custom'
ALTER TABLE public.ai_analysis_schedules
ADD CONSTRAINT ai_analysis_schedules_template_id_check 
CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation', 'custom'));

-- Add cross-field CHECK: template_id='custom' ↔ custom_template_id IS NOT NULL
ALTER TABLE public.ai_analysis_schedules
ADD CONSTRAINT ai_analysis_schedules_custom_template_ref_check
CHECK (
  (template_id = 'custom' AND custom_template_id IS NOT NULL) OR
  (template_id != 'custom' AND custom_template_id IS NULL)
);

-- Add index for custom_template_id lookups
CREATE INDEX IF NOT EXISTS idx_ai_schedules_custom_template ON public.ai_analysis_schedules(custom_template_id) WHERE custom_template_id IS NOT NULL;


-- ============================================
-- 完成 DONE
-- ============================================
