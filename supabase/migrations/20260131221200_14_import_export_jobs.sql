-- ============================================
-- ADD: Import/Export Jobs Table
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-31
--
-- @see uiux_refactor.md §4 item 3 - Job History / Audit Trail / Re-download
-- @see ARCHITECTURE.md §3.13 - Data Intelligence Platform (Module A)
--
-- 包含表格 TABLES:
-- - import_export_jobs: Import/Export 任務記錄
--
-- ============================================


-- ============================================
-- PART 1: 建立表格
-- ============================================

CREATE TABLE IF NOT EXISTS public.import_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL CHECK (kind IN ('import', 'export')),
  entity TEXT NOT NULL,
  format TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  storage_bucket TEXT,
  storage_path TEXT,
  size_bytes INTEGER,
  row_count INTEGER,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);


-- ============================================
-- PART 2: 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_import_export_jobs_status 
  ON public.import_export_jobs(status);

CREATE INDEX IF NOT EXISTS idx_import_export_jobs_created_at 
  ON public.import_export_jobs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_import_export_jobs_requested_by 
  ON public.import_export_jobs(requested_by);

CREATE INDEX IF NOT EXISTS idx_import_export_jobs_entity_created 
  ON public.import_export_jobs(entity, created_at DESC);


-- ============================================
-- PART 3: 啟用 RLS
-- ============================================

ALTER TABLE public.import_export_jobs ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: 建立 RLS Policies
-- ============================================

-- Admins can read all jobs
CREATE POLICY "Admins can read import_export_jobs"
  ON public.import_export_jobs FOR SELECT
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admins can insert jobs (via server actions)
CREATE POLICY "Admins can create import_export_jobs"
  ON public.import_export_jobs FOR INSERT
  TO authenticated
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Admins can update jobs (status updates)
CREATE POLICY "Admins can update import_export_jobs"
  ON public.import_export_jobs FOR UPDATE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'))
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor'));

-- Owner can delete jobs
CREATE POLICY "Owner can delete import_export_jobs"
  ON public.import_export_jobs FOR DELETE
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');


-- ============================================
-- PART 5: Grant Permissions
-- ============================================

GRANT SELECT, INSERT, UPDATE ON public.import_export_jobs TO authenticated;
GRANT DELETE ON public.import_export_jobs TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
