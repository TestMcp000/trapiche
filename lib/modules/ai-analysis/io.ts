/**
 * AI Analysis IO Facade
 *
 * Re-exports all AI analysis IO operations from capability-scoped modules.
 * This is the recommended import path for app layer code.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */
import 'server-only';

// =============================================================================
// Analysis Execution
// =============================================================================

export {
  type AnalysisRunResult,
  runAnalysis,
  composeAnalysisPrompt,
  isOpenRouterConfigured,
  fetchAvailableModels,
  getModelPricing,
} from './analysis-run-io';

// =============================================================================
// Report CRUD
// =============================================================================

export {
  type CronStatus,
  createReport,
  updateReportStatus,
  getReport,
  getReportByUser,
  listReports,
  deleteReport,
  deleteOldReports,
  getPendingReports,
  getCronStatus,
} from './analysis-report-io';

// =============================================================================
// Usage Tracking
// =============================================================================

export {
  type BudgetCheckResult,
  getCurrentYearMonth,
  recordUsage,
  getMonthlyUsage,
  getCurrentMonthUsage,
  checkBudget,
  getUsageHistory,
} from './analysis-usage-io';

// =============================================================================
// Data Collection (SSOT fetchers for AI analysis)
// =============================================================================

export {
  type AnalysisDataset,
  type AnalysisDataRecord,
  type ProductAnalysisShape,
  type OrderAnalysisShape,
  type MemberAnalysisShape,
  type CommentAnalysisShape,
  type FetchWithSamplingResult,
  fetchAnalysisData,
  fetchAnalysisDataFlattened,
  fetchAnalysisDataWithSampling,
  getAnalysisDataCounts,
  fetchProductsForAnalysis,
  fetchOrdersForAnalysis,
  fetchMembersForAnalysis,
  fetchCommentsForAnalysis,
} from './analysis-data-io';

// =============================================================================
// Pure Functions (re-export for convenience)
// =============================================================================

export {
  estimateTokenCount,
  estimateDataTokens,
  estimateOutputTokens,
  calculateTokenCost,
  estimateAnalysisCost,
  deidentifyData,
  deidentifyRecord,
  prioritizedSample,
  formatCostUsd,
  formatTokenCount,
  getWarningLabel,
  // Seeded deterministic sampling (Phase 6+)
  type SamplingResult,
  hashString,
  createSeededRandom,
  seededShuffle,
  seededPrioritizedSample,
} from './analysis-pure';

// =============================================================================
// RAG Data Pipeline (Phase 6+)
// =============================================================================

export {
  type RAGChunk,
  type RAGContext,
  fetchRagContextForAnalysis,
  buildRagDataFromContext,
  isRagModeAvailable,
} from './analysis-rag-io';

