-- ============================================
-- ADD: AI Analysis Report Shares (Public Share Links)
-- ============================================
-- 
-- 版本 Version: 1.0
-- 最後更新 Last Updated: 2026-01-03
--
-- 包含表格 TABLES:
-- - ai_analysis_report_shares: 報告分享連結
--
-- 包含函數 FUNCTIONS:
-- - get_shared_ai_report: 公開抓取分享報告 (SECURITY DEFINER + anon)
--
-- 依賴 DEPENDENCIES:
-- - 12_ai_analysis.sql (ai_analysis_reports table)
--
-- @see doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md PR-4 - AI Analysis Share Links
-- @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
--
-- ============================================


-- ============================================
-- PART 1: ai_analysis_report_shares (Share Links Table)
-- ============================================
--
-- Stores share links for AI analysis reports.
-- Token is cryptographically secure (256-bit entropy).
-- Supports revocation and optional expiry.
-- RLS: Owner-only management.
--
-- ============================================

CREATE TABLE IF NOT EXISTS public.ai_analysis_report_shares (
  -- Token is the primary key (64-char hex string, 256-bit entropy)
  -- Note: `gen_random_bytes` lives in the `extensions` schema in Supabase.
  token TEXT PRIMARY KEY DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  
  -- Reference to the report being shared
  report_id UUID NOT NULL REFERENCES public.ai_analysis_reports(id) ON DELETE CASCADE,
  
  -- Who created the share link
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc', NOW()),
  
  -- Optional expiry date (null = never expires)
  expires_at TIMESTAMPTZ,
  
  -- Revocation timestamp (null = active)
  revoked_at TIMESTAMPTZ,
  
  -- Constraint: token must be 64-char hex
  CONSTRAINT token_format CHECK (token ~ '^[a-f0-9]{64}$')
);

-- Index for looking up shares by report
CREATE INDEX IF NOT EXISTS idx_ai_report_shares_report_id 
  ON public.ai_analysis_report_shares(report_id);

-- Index for looking up shares by creator
CREATE INDEX IF NOT EXISTS idx_ai_report_shares_created_by 
  ON public.ai_analysis_report_shares(created_by);


-- ============================================
-- PART 2: get_shared_ai_report RPC (Public Fetch)
-- ============================================
--
-- SECURITY DEFINER function to fetch shared report data.
-- Returns only whitelisted fields (no internal IDs/filters/userId).
-- GRANT EXECUTE TO anon for public access.
--
-- Security:
-- - Token validation (64-char hex)
-- - Expiry check
-- - Revocation check
-- - Whitelist-only field return
--
-- ============================================

CREATE OR REPLACE FUNCTION public.get_shared_ai_report(p_token TEXT)
RETURNS TABLE (
  result TEXT,
  template_id TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_share RECORD;
  v_report RECORD;
BEGIN
  -- Validate token format (64-char hex)
  IF p_token IS NULL OR p_token !~ '^[a-f0-9]{64}$' THEN
    RETURN;
  END IF;

  -- Find the share link
  SELECT s.report_id, s.expires_at, s.revoked_at
  INTO v_share
  FROM public.ai_analysis_report_shares s
  WHERE s.token = p_token;

  -- Share not found
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check if revoked
  IF v_share.revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  -- Check if expired
  IF v_share.expires_at IS NOT NULL AND v_share.expires_at < TIMEZONE('utc', NOW()) THEN
    RETURN;
  END IF;

  -- Fetch the report (whitelist fields only)
  SELECT r.result, r.template_id, r.status, r.created_at, r.completed_at
  INTO v_report
  FROM public.ai_analysis_reports r
  WHERE r.id = v_share.report_id;

  -- Report not found (should not happen due to FK, but defensive)
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return whitelist fields
  RETURN QUERY SELECT 
    v_report.result,
    v_report.template_id,
    v_report.status,
    v_report.created_at,
    v_report.completed_at;
END;
$$;

-- Lock down SECURITY DEFINER function, then grant to anon
REVOKE ALL ON FUNCTION public.get_shared_ai_report(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_shared_ai_report(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_shared_ai_report(TEXT) TO authenticated;


-- ============================================
-- PART 3: Enable RLS
-- ============================================

ALTER TABLE public.ai_analysis_report_shares ENABLE ROW LEVEL SECURITY;


-- ============================================
-- PART 4: RLS Policies - ai_analysis_report_shares
-- ============================================
--
-- Owner-only management.
-- Editor cannot access share tokens (security measure).
-- Public fetch goes through get_shared_ai_report RPC (bypasses RLS).
--
-- ============================================

-- Owner can manage all share links
CREATE POLICY "Owners can manage AI report shares"
  ON public.ai_analysis_report_shares FOR ALL
  TO authenticated
  USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner')
  WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'owner');


-- ============================================
-- PART 5: Grant Permissions (Table-level access)
-- ============================================
--
-- Only authenticated users (owners) can access the table directly.
-- Anon users fetch via get_shared_ai_report RPC.
--
-- ============================================

-- Owner can CRUD share links (RLS enforces owner-only)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_analysis_report_shares TO authenticated;


-- ============================================
-- 完成 DONE
-- ============================================
