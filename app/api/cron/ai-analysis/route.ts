import 'server-only';

/**
 * AI Analysis Cron Endpoint
 *
 * Background worker for processing pending AI analysis reports.
 * Called by Vercel Cron or external scheduler with CRON_SECRET header.
 *
 * @see uiux_refactor.md §6.2.2 - Background worker implementation
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §6 - Technical execution
 */

import { NextResponse } from 'next/server';
import {
  getPendingReports,
  updateReportStatus,
  runAnalysis,
  fetchAnalysisDataWithSampling,
  recordUsage,
  getCurrentYearMonth,
  getModelPricing,
  fetchRagContextForAnalysis,
  buildRagDataFromContext,
} from '@/lib/modules/ai-analysis/io';
import type { AnalysisReport } from '@/lib/types/ai-analysis';

// =============================================================================
// Configuration
// =============================================================================

/** Maximum reports to process per invocation */
const MAX_REPORTS_PER_RUN = 5;

/** Minimum result length to be considered complete (vs incomplete) */
const MIN_RESULT_LENGTH = 100;

// =============================================================================
// Authentication
// =============================================================================

/**
 * Validate cron request authentication.
 * Supports both custom CRON_SECRET header and Vercel Cron Authorization.
 */
function isValidCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  
  // Skip validation in development if no secret configured
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    console.warn('[AI Cron] No CRON_SECRET configured, allowing in development mode');
    return true;
  }

  // Check custom header
  const customHeader = request.headers.get('x-cron-secret');
  if (customHeader && cronSecret && customHeader === cronSecret) {
    return true;
  }

  // Check Vercel Cron Authorization header
  // See: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  const authHeader = request.headers.get('authorization');
  if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

// =============================================================================
// Report Processing
// =============================================================================

interface ProcessResult {
  reportId: string;
  success: boolean;
  status: 'completed' | 'incomplete' | 'failed';
  error?: string;
  costUsd?: number;
}

/**
 * Process a single pending report.
 */
async function processReport(report: AnalysisReport): Promise<ProcessResult> {
  const reportId = report.id;

  try {
    // Mark as running
    await updateReportStatus(reportId, 'running');

    // Fetch data based on report mode
    let data: Record<string, unknown>[];

    if (report.mode === 'rag') {
      // RAG mode: Use semantic search to retrieve relevant context
      const ragContext = await fetchRagContextForAnalysis(
        report.templateId,
        report.ragConfig
      );

      if (ragContext.totalRetrieved === 0) {
        await updateReportStatus(reportId, 'failed', {
          errorMessage: 'No relevant context found for RAG retrieval',
        });
        return {
          reportId,
          success: false,
          status: 'failed',
          error: 'No RAG context available',
        };
      }

      data = buildRagDataFromContext(ragContext);
    } else {
      // Standard mode: Fetch all filtered data with sampling
      const fetchResult = await fetchAnalysisDataWithSampling(
        report.dataTypes,
        report.filters,
        reportId // Use reportId as seed for deterministic sampling
      );

      if (fetchResult.data.length === 0) {
        await updateReportStatus(reportId, 'failed', {
          errorMessage: 'No data available for the specified filters',
        });
        return {
          reportId,
          success: false,
          status: 'failed',
          error: 'No data available',
        };
      }

      data = fetchResult.data;

      // Log sampling stats
      const { sampling } = fetchResult;
      if (sampling.wasSampled) {
        console.log(
          `[AI Cron] Sampled ${sampling.originalCount} -> ${sampling.sampledCount} records (high-priority: ${sampling.highPriorityKept})`
        );
      }
    }

    // Run analysis with modelId from report
    const analysisResult = await runAnalysis(
      {
        templateId: report.templateId,
        customTemplateId: report.customTemplateId ?? undefined,
        dataTypes: report.dataTypes,
        filters: report.filters,
        mode: report.mode,
        modelId: report.modelId,
        ragConfig: report.ragConfig,
      },
      data
    );

    if (!analysisResult.success || !analysisResult.result) {
      await updateReportStatus(reportId, 'failed', {
        errorMessage: analysisResult.error ?? 'Analysis execution failed',
        model: analysisResult.model,
      });
      return {
        reportId,
        success: false,
        status: 'failed',
        error: analysisResult.error,
      };
    }

    // Calculate cost using dynamic pricing based on requested model
    const pricing = getModelPricing(report.modelId);
    const inputTokens = analysisResult.inputTokens ?? 0;
    const outputTokens = analysisResult.outputTokens ?? 0;
    const costUsd =
      (inputTokens * pricing.inputPricePerMillion +
        outputTokens * pricing.outputPricePerMillion) /
      1_000_000;

    // Determine if result is complete or incomplete
    const isComplete = analysisResult.result.length >= MIN_RESULT_LENGTH;
    const finalStatus = isComplete ? 'completed' : 'incomplete';

    // Update report with results
    await updateReportStatus(reportId, finalStatus, {
      result: analysisResult.result,
      inputTokens,
      outputTokens,
      costUsd,
      model: analysisResult.model,
    });

    // Record usage for budget tracking
    if (costUsd > 0) {
      await recordUsage(getCurrentYearMonth(), costUsd);
    }

    return {
      reportId,
      success: true,
      status: finalStatus,
      costUsd,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[AI Cron] Failed to process report ${reportId}:`, error);

    await updateReportStatus(reportId, 'failed', {
      errorMessage,
    });

    return {
      reportId,
      success: false,
      status: 'failed',
      error: errorMessage,
    };
  }
}

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(request: Request) {
  // Validate authentication
  if (!isValidCronRequest(request)) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    // Fetch pending reports
    const pendingReports = await getPendingReports(MAX_REPORTS_PER_RUN);

    if (pendingReports.length === 0) {
      return NextResponse.json({
        message: 'No pending reports',
        processed: 0,
      });
    }

    console.log(`[AI Cron] Processing ${pendingReports.length} pending reports`);

    // Process each report
    const results: ProcessResult[] = [];
    for (const report of pendingReports) {
      const result = await processReport(report);
      results.push(result);
    }

    // Summarize results
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const totalCost = results.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);

    console.log(`[AI Cron] Completed: ${successful} success, ${failed} failed, $${totalCost.toFixed(4)} cost`);

    return NextResponse.json({
      message: 'Processing complete',
      processed: results.length,
      successful,
      failed,
      totalCostUsd: totalCost,
      results,
    });
  } catch (error) {
    console.error('[AI Cron] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Vercel Cron configuration
// To enable, add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/ai-analysis",
//     "schedule": "*/5 * * * *"
//   }]
// }
