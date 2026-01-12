/**
 * AI Analysis Reports Write IO Module
 *
 * Server-only module for analysis report write/mutation operations.
 * Contains: create, update status, delete operations.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §2.3 - Report management
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
  AnalysisRequest,
  AnalysisStatus,
} from '@/lib/types/ai-analysis';

// =============================================================================
// Create Operations
// =============================================================================

/**
 * Create a new analysis report in pending state.
 *
 * @param userId - Owner of the report
 * @param request - Analysis request parameters
 * @returns Created report ID
 */
export async function createReport(
  userId: string,
  request: AnalysisRequest
): Promise<{ id: string } | { error: string }> {
  const supabase = createAdminClient();

  // We store ragConfig inside the filters JSONB for backwards compatibility
  const filtersWithRag = request.ragConfig
    ? { ...request.filters, _ragConfig: request.ragConfig }
    : request.filters;

  const { data, error } = await supabase
    .from('ai_analysis_reports')
    .insert({
      user_id: userId,
      template_id: request.templateId,
      custom_template_id: request.customTemplateId ?? null,
      filters: filtersWithRag,
      data_types: request.dataTypes,
      mode: request.mode,
      model_id: request.modelId,
      status: 'pending' satisfies AnalysisStatus,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create analysis report:', error);
    return { error: 'Failed to create analysis report' };
  }

  return { id: data.id };
}

// =============================================================================
// Update Operations
// =============================================================================

/**
 * Update report status and optionally set result.
 *
 * @param reportId - Report to update
 * @param status - New status
 * @param updateData - Optional additional data
 */
export async function updateReportStatus(
  reportId: string,
  status: AnalysisStatus,
  updateData?: {
    result?: string;
    inputTokens?: number;
    outputTokens?: number;
    costUsd?: number;
    model?: string;
    errorMessage?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'completed' || status === 'incomplete' || status === 'failed') {
    updates.completed_at = new Date().toISOString();
  }

  if (updateData) {
    if (updateData.result !== undefined) updates.result = updateData.result;
    if (updateData.inputTokens !== undefined) updates.input_tokens = updateData.inputTokens;
    if (updateData.outputTokens !== undefined) updates.output_tokens = updateData.outputTokens;
    if (updateData.costUsd !== undefined) updates.cost_usd = updateData.costUsd;
    if (updateData.model !== undefined) updates.model = updateData.model;
    if (updateData.errorMessage !== undefined) updates.error_message = updateData.errorMessage;
  }

  const { error } = await supabase
    .from('ai_analysis_reports')
    .update(updates)
    .eq('id', reportId);

  if (error) {
    console.error('Failed to update report status:', error);
    return { success: false, error: 'Failed to update report status' };
  }

  return { success: true };
}

// =============================================================================
// Delete Operations
// =============================================================================

/**
 * Delete a report by ID.
 *
 * @param reportId - Report to delete
 * @param userId - User ID for ownership check
 */
export async function deleteReport(
  reportId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('ai_analysis_reports')
    .delete()
    .eq('id', reportId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete report:', error);
    return { success: false, error: 'Failed to delete report' };
  }

  return { success: true };
}

/**
 * Delete old reports before a certain date.
 *
 * @param userId - User ID
 * @param beforeDate - ISO date string
 * @returns Number of deleted reports
 */
export async function deleteOldReports(
  userId: string,
  beforeDate: string
): Promise<{ deleted: number; error?: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_analysis_reports')
    .delete()
    .eq('user_id', userId)
    .lt('created_at', beforeDate)
    .select('id');

  if (error) {
    console.error('Failed to delete old reports:', error);
    return { deleted: 0, error: 'Failed to delete old reports' };
  }

  return { deleted: data?.length ?? 0 };
}
