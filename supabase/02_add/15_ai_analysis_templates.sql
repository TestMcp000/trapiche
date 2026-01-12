-- ============================================
-- ADD: AI Analysis Custom Templates Table
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-01
--
-- 包含表格 TABLES:
-- - ai_analysis_templates: 自訂分析 Prompt 模板
--
-- 依賴 DEPENDENCIES:
-- - 01_main.sql (site_admins for RLS role check)
-- - 12_ai_analysis.sql (for context)
--
-- @see doc/SPEC.md (AI Analysis -> Custom analysis templates)
-- @see ARCHITECTURE.md §3.13 - Data Intelligence Platform
--
-- ============================================


-- ============================================
-- PART 1: ai_analysis_templates (Custom Templates)
-- ============================================
--
-- Stores custom analysis prompt templates.
-- RLS: Owner CRUD; Editor read-only.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) >= 1 AND char_length(name) <= 100),
  prompt_text TEXT NOT NULL CHECK (char_length(prompt_text) >= 10 AND char_length(prompt_text) <= 10000),
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_templates_created_by ON public.ai_analysis_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_ai_templates_enabled ON public.ai_analysis_templates(is_enabled) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ai_templates_created_at ON public.ai_analysis_templates(created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_analysis_templates ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 2: RLS Policies - ai_analysis_templates
-- ============================================
--
-- Owner can CRUD all templates.
-- Editor can read (for use in analysis).
--
-- ============================================

-- Owner can manage all templates
CREATE POLICY "Owners can manage AI templates"
  ON public.ai_analysis_templates FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

-- Editor can read templates (for selection dropdown)
CREATE POLICY "Editors can read AI templates"
  ON public.ai_analysis_templates FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');


-- ============================================
-- PART 3: Grant Permissions
-- ============================================

-- ai_analysis_templates: authenticated can SELECT/INSERT/UPDATE/DELETE (RLS enforces role)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_templates TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
