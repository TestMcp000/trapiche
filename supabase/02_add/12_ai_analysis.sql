-- ============================================
-- ADD: AI Analysis Module Tables & RPC
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-30
--
-- 包含表格 TABLES:
-- - ai_analysis_reports: AI 分析報告
-- - ai_usage_monthly: 月度使用量統計
--
-- 包含函數 FUNCTIONS:
-- - increment_ai_usage: 原子性遞增用量 (atomic upsert)
--
-- 依賴 DEPENDENCIES:
-- - 01_main.sql (site_admins for RLS role check)
--
-- @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
-- @see doc/specs/completed/AI_ANALYSIS_v2.md - Full specification
--
-- ============================================


-- ============================================
-- PART 1: ai_analysis_reports (Report Storage)
-- ============================================
--
-- Stores AI analysis report metadata and results.
-- RLS: Owner/Editor can read; Owner manages own reports.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_id TEXT NOT NULL CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation')),
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  data_types TEXT[] NOT NULL DEFAULT '{}',
  mode TEXT NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard', 'rag')),
  -- Model ID requested by user at creation time
  model_id TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'incomplete', 'failed')),
  result TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd NUMERIC(10, 6),
  -- Model ID actually used (from OpenRouter response)
  model TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_id ON public.ai_analysis_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_reports_status ON public.ai_analysis_reports(status);
CREATE INDEX IF NOT EXISTS idx_ai_reports_created_at ON public.ai_analysis_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_reports_user_created ON public.ai_analysis_reports(user_id, created_at DESC);


-- ============================================
-- PART 2: ai_usage_monthly (Usage Tracking)
-- ============================================
--
-- Monthly aggregated usage for budget tracking.
-- One row per month (year_month as PK).
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_usage_monthly (
  year_month TEXT PRIMARY KEY CHECK (year_month ~ '^\d{4}-\d{2}$'),
  total_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0,
  analysis_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Index for time-series queries
CREATE INDEX IF NOT EXISTS idx_ai_usage_updated ON public.ai_usage_monthly(updated_at DESC);


-- ============================================
-- PART 3: increment_ai_usage RPC (Atomic Upsert)
-- ============================================
--
-- Atomically increment usage for a given month.
-- Uses ON CONFLICT to upsert in a single statement.
-- SECURITY DEFINER to allow service_role access.
--
-- ============================================

CREATE OR REPLACE FUNCTION public.increment_ai_usage(
  p_year_month TEXT,
  p_cost NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ai_usage_monthly (year_month, total_cost_usd, analysis_count, updated_at)
  VALUES (p_year_month, p_cost, 1, TIMEZONE('utc', NOW()))
  ON CONFLICT (year_month) DO UPDATE SET
    total_cost_usd = ai_usage_monthly.total_cost_usd + EXCLUDED.total_cost_usd,
    analysis_count = ai_usage_monthly.analysis_count + 1,
    updated_at = EXCLUDED.updated_at;
END;
$$;

-- Lock down SECURITY DEFINER function
REVOKE ALL ON FUNCTION public.increment_ai_usage(TEXT, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(TEXT, NUMERIC) TO service_role;


-- ============================================
-- PART 4: Enable RLS
-- ============================================

ALTER TABLE public.ai_analysis_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_monthly ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 5: RLS Policies - ai_analysis_reports
-- ============================================
--
-- Owner/Editor can read all reports (admin dashboard).
-- Users can only manage their own reports.
--
-- ============================================

-- Admin SELECT (Owner/Editor can read all reports)
CREATE POLICY "Admins can read all AI reports"
  ON public.ai_analysis_reports FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- User SELECT own reports (non-admin users can see their own)
CREATE POLICY "Users can read own AI reports"
  ON public.ai_analysis_reports FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- User INSERT own reports
CREATE POLICY "Users can create own AI reports"
  ON public.ai_analysis_reports FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- User UPDATE own reports
CREATE POLICY "Users can update own AI reports"
  ON public.ai_analysis_reports FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- User DELETE own reports
CREATE POLICY "Users can delete own AI reports"
  ON public.ai_analysis_reports FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admin ALL (Owner/Editor can manage all reports for housekeeping)
CREATE POLICY "Admins can manage all AI reports"
  ON public.ai_analysis_reports FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));


-- ============================================
-- PART 6: RLS Policies - ai_usage_monthly
-- ============================================
--
-- Admin-only read access (usage/budget visibility).
-- Writes happen via service_role (increment_ai_usage RPC).
--
-- ============================================

-- Admin SELECT only
CREATE POLICY "Admins can read AI usage"
  ON public.ai_usage_monthly FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- All mutations go through increment_ai_usage RPC (service_role)


-- ============================================
-- PART 7: ai_analysis_schedules (Scheduled Reports)
-- ============================================
--
-- Stores scheduled analysis configurations.
-- RLS: Owner can CRUD; Editor can read for monitoring.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Analysis configuration (mirrors AnalysisRequest)
  template_id TEXT NOT NULL CHECK (template_id IN ('user_behavior', 'sales', 'rfm', 'content_recommendation')),
  data_types TEXT[] NOT NULL DEFAULT '{}',
  mode TEXT NOT NULL DEFAULT 'standard' CHECK (mode IN ('standard', 'rag')),
  model_id TEXT NOT NULL DEFAULT 'openai/gpt-4o-mini',
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  rag_config JSONB,
  
  -- Target member (nullable = all members)
  -- Stores auth.users.id (same value as customer_profiles.user_id when profile exists)
  member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Schedule configuration
  -- Supports: @daily, @weekly, @monthly, or 5-field cron (minute hour * * *)
  schedule_cron TEXT NOT NULL CHECK (schedule_cron ~ '^(@(daily|weekly|monthly)|\d+\s+\d+\s+\*\s+\*\s+\*)$'),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Execution tracking
  next_run_at TIMESTAMPTZ NOT NULL,
  last_run_at TIMESTAMPTZ,
  last_report_id UUID REFERENCES public.ai_analysis_reports(id) ON DELETE SET NULL,
  
  -- Metadata
  name TEXT NOT NULL DEFAULT 'Scheduled Analysis',
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW())
);

-- Indexes for schedule queries
CREATE INDEX IF NOT EXISTS idx_ai_schedules_next_run ON public.ai_analysis_schedules(next_run_at) WHERE is_enabled = true;
CREATE INDEX IF NOT EXISTS idx_ai_schedules_created_by ON public.ai_analysis_schedules(created_by);

-- Enable RLS
ALTER TABLE public.ai_analysis_schedules ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 8: RLS Policies - ai_analysis_schedules
-- ============================================
--
-- Owner can CRUD all schedules.
-- Editor can read for monitoring.
--
-- ============================================

-- Owner can manage all schedules
CREATE POLICY "Owners can manage AI schedules"
  ON public.ai_analysis_schedules FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');

-- Editor can read schedules (monitoring visibility)
CREATE POLICY "Editors can read AI schedules"
  ON public.ai_analysis_schedules FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'editor');


-- ============================================
-- PART 9: Grant Permissions (Table-level access)
-- ============================================
--
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.
--
-- ============================================

-- ai_analysis_reports: authenticated can SELECT/INSERT/UPDATE/DELETE (RLS enforces row-level)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_reports TO authenticated;

-- ai_usage_monthly: authenticated can SELECT (RLS enforces admin-only)
GRANT SELECT ON public.ai_usage_monthly TO authenticated;

-- ai_analysis_schedules: authenticated can SELECT/INSERT/UPDATE/DELETE (RLS enforces owner/editor)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_schedules TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
