'use server';

/**
 * AI Analysis Server Actions
 *
 * Server actions for AI-powered analysis operations.
 * RBAC: Export/View = Owner/Editor, Delete = Owner only
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin, requireOwner } from '@/lib/modules/auth/admin-guard';
import {
  type ActionResult,
  actionSuccess,
  actionError,
  ADMIN_ERROR_CODES,
} from '@/lib/types/action-result';
import { validateAnalysisRequest } from '@/lib/validators/ai-analysis';
import { untrustedMarkdownToHtml } from '@/lib/markdown/untrusted';
import type {
  AnalysisReport,
  AnalysisReportListItem,
  AnalysisUsageMonthly,
  CostEstimate,
  ModelPricing,
} from '@/lib/types/ai-analysis';
import {
  type CronStatus,
  createReport,
  listReports,
  getReportByUser,
  deleteReport,
  getCurrentMonthUsage,
  checkBudget,
  getCurrentYearMonth,
  isOpenRouterConfigured,
  fetchAvailableModels,
  estimateAnalysisCost,
  getCronStatus,
  getPendingReports,
  updateReportStatus,
  fetchAnalysisDataFlattened,
  runAnalysis,
  recordUsage,
  getModelPricing,
} from '@/lib/modules/ai-analysis/io';

// =============================================================================
// Analysis Actions
// =============================================================================

/**
 * Start a new analysis job.
 * Creates a pending report that will be executed by background worker.
 */
export async function startAnalysis(
  request: unknown
): Promise<ActionResult<{ reportId: string }>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  // Validate request
  const validation = validateAnalysisRequest(request);
  if (!validation.valid || !validation.data) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  // Check if OpenRouter is configured
  if (!isOpenRouterConfigured()) {
    return actionError(ADMIN_ERROR_CODES.FEATURE_DISABLED);
  }

  // Check budget
  const budgetCheck = await checkBudget(getCurrentYearMonth());
  if (!budgetCheck.allowed) {
    return actionError(ADMIN_ERROR_CODES.RATE_LIMITED);
  }

  // Create pending report
  const result = await createReport(guard.userId, validation.data);

  if ('error' in result) {
    return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
  }

  revalidateTag('ai-analysis', { expire: 0 });
  return actionSuccess({ reportId: result.id });
}

/**
 * Get status of an analysis report.
 */
export async function getAnalysisStatus(
  reportId: string
): Promise<ActionResult<AnalysisReport>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const report = await getReportByUser(reportId, guard.userId);

  if (!report) {
    return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
  }

  return actionSuccess(report);
}

/**
 * Report detail with result rendered as HTML.
 * For displaying in the report detail panel.
 */
export interface AnalysisReportDetail {
  id: string;
  templateId: string;
  status: AnalysisReport['status'];
  resultHtml: string | null;
  errorMessage: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costUsd: number | null;
  model: string | null;
  dataTypes: string[];
  filters: AnalysisReport['filters'];
  createdAt: string;
  completedAt: string | null;
}

/**
 * Get full report with result converted to HTML.
 * Server-side Markdown rendering for secure display.
 */
export async function getAnalysisReportDetail(
  reportId: string
): Promise<ActionResult<AnalysisReportDetail>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const report = await getReportByUser(reportId, guard.userId);

  if (!report) {
    return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
  }

  // Convert Markdown result to HTML on server side
  let resultHtml: string | null = null;
  if (report.result) {
    resultHtml = await untrustedMarkdownToHtml(report.result);
  }

  return actionSuccess({
    id: report.id,
    templateId: report.templateId,
    status: report.status,
    resultHtml,
    errorMessage: report.errorMessage,
    inputTokens: report.inputTokens,
    outputTokens: report.outputTokens,
    costUsd: report.costUsd,
    model: report.model,
    dataTypes: report.dataTypes,
    filters: report.filters,
    createdAt: report.createdAt,
    completedAt: report.completedAt,
  });
}

/**
 * List analysis reports with pagination.
 */
export async function listAnalysisReports(
  limit = 20,
  offset = 0
): Promise<
  ActionResult<{ reports: AnalysisReportListItem[]; total: number }>
> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const result = await listReports(guard.userId, limit, offset);
  return actionSuccess(result);
}

/**
 * Delete an analysis report.
 * Owner only.
 */
export async function deleteAnalysisReport(
  reportId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const result = await deleteReport(reportId, guard.userId);

  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
  }

  revalidateTag('ai-analysis', { expire: 0 });
  return actionSuccess();
}

// =============================================================================
// Estimation Actions
// =============================================================================

/**
 * Estimate cost for an analysis request.
 * This is a pure calculation, no IO.
 */
export async function estimateCost(
  request: unknown,
  sampleData: unknown[],
  pricing: ModelPricing
): Promise<ActionResult<CostEstimate>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  // Validate request
  const validation = validateAnalysisRequest(request);
  if (!validation.valid) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const estimate = estimateAnalysisCost(sampleData, pricing);
  return actionSuccess(estimate);
}

// =============================================================================
// Configuration Actions
// =============================================================================

/**
 * Get current month usage statistics.
 */
export async function getUsageStats(): Promise<
  ActionResult<AnalysisUsageMonthly | null>
> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const usage = await getCurrentMonthUsage();
  return actionSuccess(usage);
}

/**
 * Check if AI analysis is configured and available.
 */
export async function checkConfiguration(): Promise<
  ActionResult<{
    configured: boolean;
    models: ModelPricing[];
  }>
> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const configured = isOpenRouterConfigured();
  const models = configured ? await fetchAvailableModels() : [];

  return actionSuccess({ configured, models });
}

/**
 * Get budget status for current month.
 */
export async function getBudgetStatus(): Promise<
  ActionResult<{
    allowed: boolean;
    currentUsage: number;
    budgetLimit: number;
    percentUsed: number;
    warning?: 'near_limit' | 'at_limit';
  }>
> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const budget = await checkBudget(getCurrentYearMonth());
  return actionSuccess(budget);
}

// =============================================================================
// Cron Status & Manual Processing
// =============================================================================

/**
 * Get cron status for UI display.
 */
export async function getCronStatusAction(): Promise<
  ActionResult<CronStatus>
> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const status = await getCronStatus();
  return actionSuccess(status);
}

/** Minimum interval between manual trigger calls (1 minute) */
const MANUAL_TRIGGER_INTERVAL_MS = 60 * 1000;

/** Track last manual trigger time (in-memory, resets on server restart) */
let lastManualTriggerTime = 0;

/**
 * Manually trigger processing of one pending report.
 * Owner-only, rate-limited to prevent abuse.
 */
export async function triggerManualProcessing(): Promise<
  ActionResult<{
    processed: boolean;
    reportId?: string;
    status?: 'completed' | 'incomplete' | 'failed';
  }>
> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  // Rate limit check
  const now = Date.now();
  if (now - lastManualTriggerTime < MANUAL_TRIGGER_INTERVAL_MS) {
    const _waitSeconds = Math.ceil(
      (MANUAL_TRIGGER_INTERVAL_MS - (now - lastManualTriggerTime)) / 1000
    );
    return actionError(ADMIN_ERROR_CODES.RATE_LIMITED);
  }

  // Check if OpenRouter is configured
  if (!isOpenRouterConfigured()) {
    return actionError(ADMIN_ERROR_CODES.FEATURE_DISABLED);
  }

  // Get one pending report
  const pending = await getPendingReports(1);
  if (pending.length === 0) {
    return actionSuccess({ processed: false });
  }

  const report = pending[0];
  lastManualTriggerTime = now;

  try {
    // Mark as running
    await updateReportStatus(report.id, 'running');

    // Fetch data
    const data = await fetchAnalysisDataFlattened(report.dataTypes, report.filters);

    if (data.length === 0) {
      await updateReportStatus(report.id, 'failed', {
        errorMessage: '指定的篩選條件下沒有可用資料',
      });
      revalidateTag('ai-analysis', { expire: 0 });
      return actionSuccess({
        processed: true,
        reportId: report.id,
        status: 'failed',
      });
    }

    // Run analysis
    const analysisResult = await runAnalysis(
      {
        templateId: report.templateId,
        dataTypes: report.dataTypes,
        filters: report.filters,
        mode: report.mode,
        modelId: report.modelId,
      },
      data
    );

    if (!analysisResult.success || !analysisResult.result) {
      console.error('[triggerManualProcessing] Analysis execution failed:', analysisResult.error);
      await updateReportStatus(report.id, 'failed', {
        errorMessage: '分析執行失敗（詳細原因請查看伺服器日誌）',
        model: analysisResult.model,
      });
      revalidateTag('ai-analysis', { expire: 0 });
      return actionSuccess({
        processed: true,
        reportId: report.id,
        status: 'failed',
      });
    }

    // Calculate cost
    const pricing = getModelPricing(report.modelId);
    const inputTokens = analysisResult.inputTokens ?? 0;
    const outputTokens = analysisResult.outputTokens ?? 0;
    const costUsd =
      (inputTokens * pricing.inputPricePerMillion +
        outputTokens * pricing.outputPricePerMillion) /
      1_000_000;

    const isComplete = (analysisResult.result.length ?? 0) >= 100;
    const finalStatus = isComplete ? 'completed' : 'incomplete';

    // Update report
    await updateReportStatus(report.id, finalStatus, {
      result: analysisResult.result,
      inputTokens,
      outputTokens,
      costUsd,
      model: analysisResult.model,
    });

    // Record usage
    if (costUsd > 0) {
      await recordUsage(getCurrentYearMonth(), costUsd);
    }

    revalidateTag('ai-analysis', { expire: 0 });
    return actionSuccess({
      processed: true,
      reportId: report.id,
      status: finalStatus,
    });
  } catch (error) {
    console.error('[triggerManualProcessing] Unexpected error:', error);
    await updateReportStatus(report.id, 'failed', {
      errorMessage: '處理失敗（詳細原因請查看伺服器日誌）',
    });
    revalidateTag('ai-analysis', { expire: 0 });
    return actionSuccess({
      processed: true,
      reportId: report.id,
      status: 'failed',
    });
  }
}

// =============================================================================
// Schedule Actions (Phase 3)
// =============================================================================

import type {
  AnalysisScheduleListItem,
  AnalysisSchedule,
  UpdateScheduleRequest,
} from '@/lib/types/ai-analysis';
import {
  listSchedules,
  getSchedule,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleScheduleEnabled,
} from '@/lib/modules/ai-analysis/analysis-schedules-io';
import { validateCreateScheduleRequest } from '@/lib/validators/ai-analysis';

/**
 * List analysis schedules (paginated).
 */
export async function listSchedulesAction(
  limit = 20,
  offset = 0
): Promise<ActionResult<{ schedules: AnalysisScheduleListItem[]; total: number }>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const result = await listSchedules(limit, offset);
  return actionSuccess(result);
}

/**
 * Get schedule details.
 */
export async function getScheduleAction(
  scheduleId: string
): Promise<ActionResult<AnalysisSchedule>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const schedule = await getSchedule(scheduleId);
  if (!schedule) {
    return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
  }

  return actionSuccess(schedule);
}

/**
 * Create a new analysis schedule.
 * Owner only.
 */
export async function createScheduleAction(
  request: unknown
): Promise<ActionResult<{ scheduleId: string }>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  // Validate request
  const validation = validateCreateScheduleRequest(request);
  if (!validation.valid || !validation.data) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await createSchedule(guard.userId, validation.data);

  if (!result.success || !result.scheduleId) {
    return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
  }

  revalidateTag('ai-analysis', { expire: 0 });
  return actionSuccess({ scheduleId: result.scheduleId });
}

/**
 * Update an analysis schedule.
 * Owner only.
 */
export async function updateScheduleAction(
  scheduleId: string,
  updates: UpdateScheduleRequest
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const result = await updateSchedule(scheduleId, updates);

  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  revalidateTag('ai-analysis', { expire: 0 });
  return actionSuccess();
}

/**
 * Delete an analysis schedule.
 * Owner only.
 */
export async function deleteScheduleAction(
  scheduleId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const result = await deleteSchedule(scheduleId);

  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
  }

  revalidateTag('ai-analysis', { expire: 0 });
  return actionSuccess();
}

/**
 * Toggle schedule enabled/disabled.
 * Owner only.
 */
export async function toggleScheduleAction(
  scheduleId: string,
  enabled: boolean
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const result = await toggleScheduleEnabled(scheduleId, enabled);

  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  revalidateTag('ai-analysis', { expire: 0 });
  return actionSuccess();
}

// =============================================================================
// Share Link Actions (PR-4)
// =============================================================================

import type { AnalysisReportShare } from '@/lib/types/ai-analysis';
import {
  createShare,
  revokeShare,
  getActiveShareForReport,
  buildShareUrl,
} from '@/lib/modules/ai-analysis/report-shares-io';

/**
 * Create a share link for a report.
 * Owner only.
 */
export async function createShareLinkAction(
  reportId: string,
  expiresAt?: string
): Promise<ActionResult<{ token: string; url: string }>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  // Check if report exists and belongs to user
  const report = await getReportByUser(reportId, guard.userId);
  if (!report) {
    return actionError(ADMIN_ERROR_CODES.NOT_FOUND);
  }

  // Create share link
  const result = await createShare(reportId, guard.userId, expiresAt);
  if (!result) {
    return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
  }

  return actionSuccess(result);
}

/**
 * Revoke a share link.
 * Owner only.
 */
export async function revokeShareLinkAction(
  token: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const success = await revokeShare(token, guard.userId);
  if (!success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  return actionSuccess();
}

/**
 * Get the active share link for a report (if any).
 * Owner only.
 */
export async function getShareStatusAction(
  reportId: string
): Promise<ActionResult<{ share: AnalysisReportShare | null; url: string | null }>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);

  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const share = await getActiveShareForReport(reportId);
  const url = share ? buildShareUrl(share.token) : null;

  return actionSuccess({ share, url });
}
