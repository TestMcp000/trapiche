/**
 * AI Analysis Report Shares IO Module
 *
 * Server-only module for managing report share links.
 * Enables public viewing of AI analysis reports without authentication.
 *
 * Security:
 * - Tokens are 64-char hex (256-bit entropy)
 * - Owner-only creation and revocation
 * - Public fetch via SECURITY DEFINER RPC (whitelist fields only)
 *
 * @see doc/archive/2026-01-03-data-intelligence-a1-a3-step-plan.md PR-4 - AI Analysis Share Links
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type {
  AnalysisReportShare,
  SharedReportPublic,
} from '@/lib/types/ai-analysis';
import { SITE_URL } from '@/lib/seo/hreflang';

// =============================================================================
// Types (Internal)
// =============================================================================

/**
 * Database row structure for ai_analysis_report_shares table.
 */
interface ShareRow {
  token: string;
  report_id: string;
  created_by: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
}

/**
 * RPC response structure for get_shared_ai_report.
 */
interface SharedReportRow {
  result: string | null;
  template_id: string;
  status: string;
  created_at: string;
  completed_at: string | null;
}

// =============================================================================
// Row to Type Mapping
// =============================================================================

function rowToShare(row: ShareRow): AnalysisReportShare {
  return {
    token: row.token,
    reportId: row.report_id,
    createdBy: row.created_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
  };
}

function rowToSharedReport(row: SharedReportRow): SharedReportPublic | null {
  if (!row.result) {
    return null;
  }
  return {
    result: row.result,
    templateId: row.template_id,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

// =============================================================================
// Share Link URL Builder
// =============================================================================

/**
 * Build the public share URL for a token.
 * Uses the site's configured URL.
 */
export function buildShareUrl(token: string, locale: string = 'en'): string {
  return `${SITE_URL}/${locale}/ai-analysis/share/${token}`;
}

// =============================================================================
// Create Share Link
// =============================================================================

export interface CreateShareResult {
  token: string;
  url: string;
}

/**
 * Create a new share link for a report.
 * Owner-only operation (enforced by RLS).
 *
 * @param reportId - ID of the report to share
 * @param createdBy - User ID of the owner creating the share
 * @param expiresAt - Optional expiry date (ISO string)
 * @returns Token and URL, or null if creation failed
 */
export async function createShare(
  reportId: string,
  createdBy: string,
  expiresAt?: string
): Promise<CreateShareResult | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_analysis_report_shares')
    .insert({
      report_id: reportId,
      created_by: createdBy,
      expires_at: expiresAt || null,
    })
    .select('token')
    .single();

  if (error || !data) {
    console.error('Failed to create share link:', error);
    return null;
  }

  return {
    token: data.token,
    url: buildShareUrl(data.token),
  };
}

// =============================================================================
// Revoke Share Link
// =============================================================================

/**
 * Revoke a share link by setting revoked_at timestamp.
 * Owner-only operation (enforced by RLS).
 *
 * @param token - The share token to revoke
 * @param createdBy - User ID for ownership verification
 * @returns True if revoked, false if not found or already revoked
 */
export async function revokeShare(
  token: string,
  createdBy: string
): Promise<boolean> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_analysis_report_shares')
    .update({ revoked_at: new Date().toISOString() })
    .eq('token', token)
    .eq('created_by', createdBy)
    .is('revoked_at', null)
    .select('token')
    .single();

  if (error || !data) {
    return false;
  }

  return true;
}

// =============================================================================
// Get Active Share for Report
// =============================================================================

/**
 * Get the active (non-revoked, non-expired) share link for a report.
 * Used by Admin UI to display current share status.
 *
 * @param reportId - ID of the report
 * @returns Share info or null if no active share exists
 */
export async function getActiveShareForReport(
  reportId: string
): Promise<AnalysisReportShare | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_analysis_report_shares')
    .select('*')
    .eq('report_id', reportId)
    .is('revoked_at', null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return rowToShare(data as ShareRow);
}

// =============================================================================
// Fetch Shared Report (Public)
// =============================================================================

/**
 * Fetch a shared report by token.
 * Uses anon client + SECURITY DEFINER RPC for public access.
 *
 * @param token - The share token (64-char hex)
 * @returns Whitelist report fields or null if not found/expired/revoked
 */
export async function fetchSharedReport(
  token: string
): Promise<SharedReportPublic | null> {
  // Validate token format before calling RPC
  if (!/^[a-f0-9]{64}$/.test(token)) {
    return null;
  }

  const supabase = createAnonClient();

  const { data, error } = await supabase.rpc('get_shared_ai_report', {
    p_token: token,
  });

  if (error) {
    console.error('Failed to fetch shared report:', error);
    return null;
  }

  // RPC returns array (even for single row)
  const rows = data as SharedReportRow[] | null;
  if (!rows || rows.length === 0) {
    return null;
  }

  return rowToSharedReport(rows[0]);
}

// =============================================================================
// List Shares for Report
// =============================================================================

/**
 * List all shares (including revoked/expired) for a report.
 * Used by Admin UI to display share history.
 *
 * @param reportId - ID of the report
 * @returns Array of all shares for the report
 */
export async function listSharesForReport(
  reportId: string
): Promise<AnalysisReportShare[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_analysis_report_shares')
    .select('*')
    .eq('report_id', reportId)
    .order('created_at', { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as ShareRow[]).map(rowToShare);
}
