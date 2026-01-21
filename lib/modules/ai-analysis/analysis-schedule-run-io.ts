/**
 * Analysis Schedule Run IO
 *
 * Cron worker operations for AI analysis schedules.
 * Includes helper for next run time calculation.
 *
 * @module lib/modules/ai-analysis/analysis-schedule-run-io
 * @see lib/types/ai-analysis.ts - Type definitions
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { AnalysisSchedule, AnalysisFilters, RAGConfig } from '@/lib/types/ai-analysis';

// =============================================================================
// Next Run Calculation (Pure Function)
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
// Type Mappers (duplicated to avoid circular dependency with crud-io)
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
        console.error('[analysis-schedule-run-io] getSchedulesDueNow error:', error);
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
        console.error('[analysis-schedule-run-io] markScheduleExecuted error:', error);
    }
}
