/**
 * Reports Admin IO Layer (Server-only)
 *
 * Provides server-side data access for admin reports page.
 * Uses server-side Supabase client with cookie context for RLS.
 * 
 * 遵循 ARCHITECTURE.md §3.5：
 * - IO 集中於 lib/modules/reports/admin-io.ts
 * - API routes 只做 parse → validate → 呼叫 lib → return
 */

import 'server-only';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import type { ReportType, ReportStatus, ReportRow } from '@/lib/types/reports';

// Re-export for backward compatibility
export type Report = ReportRow;

const THROTTLE_MINUTES = 10;

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Get recent reports for admin page
 * Returns empty array if user is not admin (guard)
 * 
 * @param limit - Maximum number of reports to return (default: 50)
 */
export async function getRecentReports(limit = 50): Promise<ReportRow[]> {
  try {
    const supabase = await createClient();

    // Admin guard
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      console.warn('getRecentReports: User is not admin, returning empty array');
      return [];
    }

    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching reports:', error);
      // Return empty array instead of throwing to prevent Server Component crash
      return [];
    }

    return data ?? [];
  } catch (err) {
    console.error('Unexpected error in getRecentReports:', err);
    // Return empty array to prevent Server Component crash
    return [];
  }
}

/**
 * List reports for API route (no admin guard - caller should handle auth)
 * Used by GET /api/reports
 * 
 * @param limit - Maximum number of reports to return (default: 50)
 */
export async function listReports(limit = 50): Promise<ReportRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching reports:', error);
    throw error;
  }

  return data ?? [];
}

// =============================================================================
// Write Operations
// =============================================================================

export interface QueueReportResult {
  success: true;
  reportId: string;
  message: string;
}

export interface QueueReportThrottled {
  success: false;
  throttled: true;
  existingId: string;
  message: string;
}

export interface QueueReportError {
  success: false;
  throttled: false;
  error: string;
}

export type QueueReportResponse = QueueReportResult | QueueReportThrottled | QueueReportError;

/**
 * Queue a new report for execution
 * Implements throttling to prevent rapid re-runs
 * 
 * @param type - Report type
 * @param createdBy - User ID who created the report
 */
export async function queueReport(
  type: ReportType,
  createdBy: string
): Promise<QueueReportResponse> {
  const supabase = await createClient();

  // Check for existing recent report of same type (throttle)
  const throttleTime = new Date(Date.now() - THROTTLE_MINUTES * 60 * 1000).toISOString();
  
  const { data: existing } = await supabase
    .from('reports')
    .select('id, status')
    .eq('type', type)
    .gte('created_at', throttleTime)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return {
      success: false,
      throttled: true,
      existingId: existing.id,
      message: `A ${type} report was run recently. Please wait ${THROTTLE_MINUTES} minutes.`,
    };
  }

  // Create new report in queued state
  const { data: report, error } = await supabase
    .from('reports')
    .insert({
      type,
      status: 'queued' as ReportStatus,
      created_by: createdBy,
    })
    .select('id')
    .single();

  if (error || !report) {
    console.error('Error creating report:', error);
    return {
      success: false,
      throttled: false,
      error: error?.message || 'Failed to create report',
    };
  }

  return {
    success: true,
    reportId: report.id,
    message: `Report ${type} queued successfully`,
  };
}

/**
 * Update report status (for background job)
 * 
 * @param reportId - Report ID
 * @param status - New status
 * @param summary - Optional summary data
 * @param errorMessage - Optional error message (for failed status)
 */
export async function updateReportStatus(
  reportId: string,
  status: ReportStatus,
  summary?: Record<string, unknown> | null,
  errorMessage?: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const updateData: {
    status: ReportStatus;
    summary?: Record<string, unknown> | null;
    error?: string | null;
    updated_at: string;
  } = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (summary !== undefined) {
    updateData.summary = summary;
  }

  if (errorMessage !== undefined) {
    updateData.error = errorMessage;
  }

  const { error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', reportId);

  if (error) {
    console.error('Error updating report status:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get a single report by ID
 * 
 * @param reportId - Report ID
 */
export async function getReportById(reportId: string): Promise<ReportRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .eq('id', reportId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    console.error('Error fetching report:', error);
    throw error;
  }

  return data;
}
