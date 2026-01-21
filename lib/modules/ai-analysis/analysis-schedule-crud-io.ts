/**
 * Analysis Schedule CRUD IO
 *
 * CRUD operations for AI analysis schedules.
 * Owner-only write; Owner/Editor read.
 *
 * @module lib/modules/ai-analysis/analysis-schedule-crud-io
 * @see lib/types/ai-analysis.ts - Type definitions
 * @see ARCHITECTURE.md §3.4 - IO module splitting
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
import { calculateNextRunTime } from './analysis-schedule-run-io';

// =============================================================================
// Type Mappers
// =============================================================================

export interface ScheduleRow {
    id: string;
    created_by: string;
    template_id: string;
    custom_template_id: string | null;
    data_types: string[];
    mode: string;
    model_id: string;
    filters: Record<string, unknown>;
    rag_config: Record<string, unknown> | null;
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

export function mapRowToSchedule(row: ScheduleRow): AnalysisSchedule {
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

export function mapRowToListItem(row: ScheduleRow): AnalysisScheduleListItem {
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
            schedule_cron: request.scheduleCron,
            timezone: request.timezone ?? 'UTC',
            next_run_at: nextRunAt.toISOString(),
            name: request.name,
        })
        .select('id')
        .single();

    if (error) {
        console.error('[analysis-schedule-crud-io] createSchedule error:', error);
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
        console.error('[analysis-schedule-crud-io] listSchedules error:', error);
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
        console.error('[analysis-schedule-crud-io] getSchedule error:', error);
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
        console.error('[analysis-schedule-crud-io] updateSchedule error:', error);
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
        console.error('[analysis-schedule-crud-io] deleteSchedule error:', error);
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
