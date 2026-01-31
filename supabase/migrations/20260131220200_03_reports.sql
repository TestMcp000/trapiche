-- ============================================
-- ADD: 報告系統表格 (Reports)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2025-12-16
--
-- ⚠️ 依賴: 需要先執行 02_add/02_comments.sql (site_admins 表)
--
-- 包含表格 TABLES:
-- - reports: 自動檢測報告 (Lighthouse/Linkinator/Schema)
--
-- ============================================


-- ============================================
-- PART 1: 建立表格
-- ============================================

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('lighthouse', 'schema', 'links')),
  status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'success', 'failed')),
  summary JSONB,
  report_url TEXT,
  error TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);


-- ============================================
-- PART 2: 建立索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_reports_type ON public.reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON public.reports(created_at DESC);


-- ============================================
-- PART 3: 啟用 RLS
-- ============================================

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: 建立 RLS Policies
-- ============================================

CREATE POLICY "Admins can manage reports"
  ON public.reports FOR ALL
  TO authenticated
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  )
  WITH CHECK (
    (auth.jwt() -> 'app_metadata' ->> 'role') IN ('owner', 'editor')
  );


-- ============================================
-- PART 5: Grant Permissions (Table-level access)
-- ============================================
-- RLS policies control WHICH rows; GRANT controls table-level access.
-- Without GRANT, PostgreSQL denies access before RLS is even evaluated.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
