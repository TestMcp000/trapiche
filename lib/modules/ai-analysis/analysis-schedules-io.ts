/**
 * AI Analysis Schedules IO (Server-only)
 *
 * CRUD operations for analysis schedules.
 * Owner-only write; Owner/Editor read.
 *
 * @see lib/types/ai-analysis.ts - Type definitions
 * @see uiux_refactor.md §4 item 6 - Scheduled Reports
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
  AnalysisSchedule,
  AnalysisScheduleListItem,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  AnalysisFilters,
  RAGConfig,
} from '@/lib/types/ai-analysis';

// =============================================================================
// Type Mappers
// =============================================================================

interface ScheduleRow {
  id: string;
  created_by: string;
  template_id: string;
  custom_template_id: string | null;
  data_types: string[];
  mode: string;
  model_id: string;
  filters: Record<string, unknown>;
  rag_config: Record<string, unknown> | null;
  member_id: string | null;
  schedule_cron: string;
  timezone: string;
  is_enabled: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_report_id: string | null;
  name: string;
  created_at: string;
  updated_at: string;
}

function mapRowToSchedule(row: ScheduleRow): AnalysisSchedule {
  return {
    id: row.id,
    createdBy: row.created_by,
    templateId: row.template_id as AnalysisSchedule['templateId'],
    customTemplateId: row.custom_template_id,
    dataTypes: row.data_types as AnalysisSchedule['dataTypes'],
    mode: row.mode as AnalysisSchedule['mode'],
    modelId: row.model_id,
    filters: row.filters as AnalysisFilters,
    ragConfig: row.rag_config ? (row.rag_config as unknown as RAGConfig) : undefined,
    memberId: row.member_id,
    scheduleCron: row.schedule_cron,
    timezone: row.timezone,
    isEnabled: row.is_enabled,
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
    lastReportId: row.last_report_id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToListItem(row: ScheduleRow): AnalysisScheduleListItem {
  return {
    id: row.id,
    name: row.name,
    templateId: row.template_id as AnalysisScheduleListItem['templateId'],
    scheduleCron: row.schedule_cron,
    isEnabled: row.is_enabled,
    nextRunAt: row.next_run_at,
    lastRunAt: row.last_run_at,
  };
}

// =============================================================================
// Next Run Calculation
// =============================================================================

/**
 * Calculate the next run time based on cron expression.
 * For simplicity, we use preset mappings. A full cron parser would be overkill.
 */
export function calculateNextRunTime(
  cronExpr: string,
  _timezone: string = 'UTC'
): Date {
  const now = new Date();
  
  // Simple mappings for presets
  switch (cronExpr) {
    case '@daily': {
      // Next 6:00 AM
      const next = new Date(now);
      next.setUTCHours(6, 0, 0, 0);
      if (next <= now) {
        next.setUTCDate(next.getUTCDate() + 1);
      }
      return next;
    }
    case '@weekly': {
      // Next Monday at 6:00 AM
      const next = new Date(now);
      const daysUntilMonday = (8 - now.getUTCDay()) % 7 || 7;
      next.setUTCDate(next.getUTCDate() + daysUntilMonday);
      next.setUTCHours(6, 0, 0, 0);
      return next;
    }
    case '@monthly': {
      // 1st of next month at 6:00 AM
      const next = new Date(now);
      next.setUTCMonth(next.getUTCMonth() + 1, 1);
      next.setUTCHours(6, 0, 0, 0);
      return next;
    }
    default: {
      // Parse "minute hour * * *" format
      const match = cronExpr.match(/^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/);
      if (match) {
        const minute = parseInt(match[1], 10);
        const hour = parseInt(match[2], 10);
        const next = new Date(now);
        next.setUTCHours(hour, minute, 0, 0);
        if (next <= now) {
          next.setUTCDate(next.getUTCDate() + 1);
        }
        return next;
      }
      // Fallback: 24 hours from now
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}

// =============================================================================
// CRUD Operations
// =============================================================================

/**
 * Create a new analysis schedule.
 */
export async function createSchedule(
  userId: string,
  request: CreateScheduleRequest
): Promise<{ success: boolean; scheduleId?: string; error?: string }> {
  const supabase = createAdminClient();

  const nextRunAt = calculateNextRunTime(request.scheduleCron, request.timezone);

  const { data, error } = await supabase
    .from('ai_analysis_schedules')
    .insert({
      created_by: userId,
      template_id: request.templateId,
      custom_template_id: request.customTemplateId ?? null,
      data_types: request.dataTypes,
      mode: request.mode,
      model_id: request.modelId,
      filters: request.filters ?? {},
      rag_config: request.ragConfig ?? null,
      member_id: request.memberId ?? null,
      schedule_cron: request.scheduleCron,
      timezone: request.timezone ?? 'UTC',
      next_run_at: nextRunAt.toISOString(),
      name: request.name,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[analysis-schedules-io] createSchedule error:', error);
    return { success: false, error: error.message };
  }

  return { success: true, scheduleId: data.id };
}

/**
 * List schedules (paginated).
 */
export async function listSchedules(
  limit: number = 20,
  offset: number = 0
): Promise<{ schedules: AnalysisScheduleListItem[]; total: number }> {
  const supabase = createAdminClient();

  // Get total count
  const { count } = await supabase
    .from('ai_analysis_schedules')
    .select('id', { count: 'exact', head: true });

  // Get paginated results
  const { data, error } = await supabase
    .from('ai_analysis_schedules')
    .select('id, name, template_id, schedule_cron, is_enabled, next_run_at, last_run_at')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[analysis-schedules-io] listSchedules error:', error);
    return { schedules: [], total: 0 };
  }

  return {
    schedules: (data as ScheduleRow[]).map(mapRowToListItem),
    total: count ?? 0,
  };
}

/**
 * Get schedule by ID.
 */
export async function getSchedule(id: string): Promise<AnalysisSchedule | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('ai_analysis_schedules')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('[analysis-schedules-io] getSchedule error:', error);
    return null;
  }

  return mapRowToSchedule(data as ScheduleRow);
}

/**
 * Update schedule.
 */
export async function updateSchedule(
  id: string,
  updates: UpdateScheduleRequest
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  // Build update object
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.templateId !== undefined) updateData.template_id = updates.templateId;
  if (updates.customTemplateId !== undefined) updateData.custom_template_id = updates.customTemplateId;
  if (updates.dataTypes !== undefined) updateData.data_types = updates.dataTypes;
  if (updates.mode !== undefined) updateData.mode = updates.mode;
  if (updates.modelId !== undefined) updateData.model_id = updates.modelId;
  if (updates.filters !== undefined) updateData.filters = updates.filters;
  if (updates.ragConfig !== undefined) updateData.rag_config = updates.ragConfig;
  if (updates.memberId !== undefined) updateData.member_id = updates.memberId;
  if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
  if (updates.isEnabled !== undefined) updateData.is_enabled = updates.isEnabled;

  // Recalculate next run if cron changed
  if (updates.scheduleCron !== undefined) {
    updateData.schedule_cron = updates.scheduleCron;
    updateData.next_run_at = calculateNextRunTime(
      updates.scheduleCron,
      updates.timezone ?? 'UTC'
    ).toISOString();
  }

  const { error } = await supabase
    .from('ai_analysis_schedules')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('[analysis-schedules-io] updateSchedule error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Delete schedule.
 */
export async function deleteSchedule(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('ai_analysis_schedules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[analysis-schedules-io] deleteSchedule error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Toggle schedule enabled state.
 */
export async function toggleScheduleEnabled(
  id: string,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  return updateSchedule(id, { isEnabled: enabled });
}

// =============================================================================
// Cron Worker Operations
// =============================================================================

/**
 * Get schedules that are due for execution.
 * Used by the cron worker to find schedules to process.
 */
export async function getSchedulesDueNow(): Promise<AnalysisSchedule[]> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('ai_analysis_schedules')
    .select('*')
    .eq('is_enabled', true)
    .lte('next_run_at', now)
    .order('next_run_at', { ascending: true })
    .limit(10); // Process max 10 per run

  if (error) {
    console.error('[analysis-schedules-io] getSchedulesDueNow error:', error);
    return [];
  }

  return (data as ScheduleRow[]).map(mapRowToSchedule);
}

/**
 * Mark schedule as executed and update next run time.
 */
export async function markScheduleExecuted(
  id: string,
  reportId: string,
  cronExpr: string,
  timezone: string
): Promise<void> {
  const supabase = createAdminClient();
  const nextRunAt = calculateNextRunTime(cronExpr, timezone);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('ai_analysis_schedules')
    .update({
      last_run_at: now,
      last_report_id: reportId,
      next_run_at: nextRunAt.toISOString(),
      updated_at: now,
    })
    .eq('id', id);

  if (error) {
    console.error('[analysis-schedules-io] markScheduleExecuted error:', error);
  }
}
