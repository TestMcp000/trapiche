/**
 * AI Analysis Reports Read IO Module
 *
 * Server-only module for analysis report read/query operations.
 * Contains: list, get, pending check, cron status detection.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §2.3 - Report management
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
  AnalysisReport,
  AnalysisReportListItem,
} from '@/lib/types/ai-analysis';

import type { RAGConfig } from '@/lib/types/ai-analysis';

// =============================================================================
// Types (Internal)
// =============================================================================

/**
 * Database row structure for ai_analysis_reports table.
 */
interface ReportRow {
  id: string;
  user_id: string;
  template_id: string;
  custom_template_id: string | null;
  filters: Record<string, unknown>;
  data_types: string[];
  mode: string;
  /** Model ID requested by user at creation time */
  model_id: string;
  status: string;
  result: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  cost_usd: number | null;
  /** Model ID actually used (from OpenRouter response) */
  model: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// =============================================================================
// Row to Type Mapping
// =============================================================================

function rowToReport(row: ReportRow): AnalysisReport {
  // Extract ragConfig from filters JSONB (stored as _ragConfig)
  const filters = { ...row.filters };
  const ragConfig = filters._ragConfig as RAGConfig | undefined;
  delete filters._ragConfig;

  return {
    id: row.id,
    userId: row.user_id,
    templateId: row.template_id as AnalysisReport['templateId'],
    customTemplateId: row.custom_template_id,
    filters: filters as AnalysisReport['filters'],
    dataTypes: row.data_types as AnalysisReport['dataTypes'],
    mode: row.mode as AnalysisReport['mode'],
    modelId: row.model_id,
    ragConfig,
    status: row.status as AnalysisReport['status'],
    result: row.result,
    inputTokens: row.input_tokens,
    outputTokens: row.output_tokens,
    costUsd: row.cost_usd,
    model: row.model,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function rowToListItem(row: ReportRow): AnalysisReportListItem {
  return {
    id: row.id,
    templateId: row.template_id as AnalysisReportListItem['templateId'],
    status: row.status as AnalysisReportListItem['status'],
    costUsd: row.cost_usd,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Get a single report by ID.
 *
 * @param reportId - Report ID
 * @returns Report or null if not found
 */
export async function getReport(
  reportId: string
): Promise<AnalysisReport | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_analysis_reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToReport(data as ReportRow);
}

/**
 * Get a report if it belongs to the user.
 *
 * @param reportId - Report ID
 * @param userId - User ID for ownership check
 * @returns Report or null
 */
export async function getReportByUser(
  reportId: string,
  userId: string
): Promise<AnalysisReport | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_analysis_reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return rowToReport(data as ReportRow);
}

/**
 * List reports for a user with pagination.
 *
 * @param userId - User ID
 * @param limit - Max records (default 20)
 * @param offset - Pagination offset
 * @returns Report list items
 */
export async function listReports(
  userId: string,
  limit = 20,
  offset = 0
): Promise<{ reports: AnalysisReportListItem[]; total: number }> {
  const supabase = createAdminClient();

  // Get total count
  const { count } = await supabase
    .from('ai_analysis_reports')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Get paginated list
  const { data, error } = await supabase
    .from('ai_analysis_reports')
    .select('id, template_id, status, cost_usd, created_at, completed_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Failed to list reports:', error);
    return { reports: [], total: 0 };
  }

  return {
    reports: (data as ReportRow[]).map(rowToListItem),
    total: count ?? 0,
  };
}

/**
 * Get pending reports for background processing.
 * Used by Cron job to find reports to execute.
 *
 * @param limit - Max reports to fetch
 */
export async function getPendingReports(
  limit = 10
): Promise<AnalysisReport[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_analysis_reports')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return (data as ReportRow[]).map(rowToReport);
}

// =============================================================================
// Cron Status Detection
// =============================================================================

/**
 * Threshold for detecting stale pending reports (10 minutes).
 * If pending reports exist older than this, cron may not be running.
 */
const STALE_PENDING_THRESHOLD_MS = 10 * 60 * 1000;

/**
 * Cron status information for Admin UI.
 */
export interface CronStatus {
  /** Whether CRON_SECRET is configured */
  cronConfigured: boolean;
  /** Whether cron appears to be actively processing (no stale pending reports) */
  cronActive: boolean;
  /** Number of pending reports */
  pendingCount: number;
  /** Age of oldest pending report in milliseconds (null if none) */
  oldestPendingAgeMs: number | null;
}

/**
 * Get cron status for Admin UI display.
 * Detects if cron is configured and actively processing reports.
 *
 * @returns Cron status object
 */
export async function getCronStatus(): Promise<CronStatus> {
  const cronConfigured = !!process.env.CRON_SECRET;

  const supabase = createAdminClient();

  // Get oldest pending report
  const { data, error } = await supabase
    .from('ai_analysis_reports')
    .select('id, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1);

  if (error || !data || data.length === 0) {
    // No pending reports = cron is active (or nothing to process)
    return {
      cronConfigured,
      cronActive: true,
      pendingCount: 0,
      oldestPendingAgeMs: null,
    };
  }

  // Count total pending
  const { count } = await supabase
    .from('ai_analysis_reports')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  const oldestCreatedAt = new Date(data[0].created_at).getTime();
  const now = Date.now();
  const ageMs = now - oldestCreatedAt;

  // If oldest pending report is older than threshold, cron may not be running
  const cronActive = ageMs < STALE_PENDING_THRESHOLD_MS;

  return {
    cronConfigured,
    cronActive,
    pendingCount: count ?? 1,
    oldestPendingAgeMs: ageMs,
  };
}
