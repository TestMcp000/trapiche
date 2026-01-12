/**
 * Preprocessing IO Facade
 * @see doc/specs/completed/DATA_PREPROCESSING.md
 * @see uiux_refactor.md §6.4
 *
 * Re-exports all preprocessing IO functions from capability-scoped modules.
 * This maintains backward compatibility for existing imports.
 */
import 'server-only';

// ─────────────────────────────────────────────────────────────────────────────
// Types (re-export for convenience)
// ─────────────────────────────────────────────────────────────────────────────

export type { PreprocessAndEnqueueResult } from './preprocess-io';

// ─────────────────────────────────────────────────────────────────────────────
// IO Operations
// ─────────────────────────────────────────────────────────────────────────────

export {
  preprocessAndEnqueue,
  preprocessAndEnqueueBatch,
} from './preprocess-io';

// ─────────────────────────────────────────────────────────────────────────────
// Judge Operations (LLM-as-a-Judge)
// ─────────────────────────────────────────────────────────────────────────────

export type { QualityMetrics, FailedSample } from './judge-io';

export {
  judgeChunk,
  judgeChunksForContent,
  shouldSampleContent,
  updateEmbeddingQualityScore,
  updateEmbeddingQualityScoresBatch,
  getQualityMetrics,
  getFailedSamples,
} from './judge-io';

// ─────────────────────────────────────────────────────────────────────────────
// Monitoring Operations (Phase 6.5.4)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  PreprocessingQueueStats,
  PreprocessingThroughput,
  PreprocessingErrorLog,
  PreprocessingMonitoringStats,
} from './monitoring-io';

export {
  getPreprocessingQueueStats,
  getPreprocessingThroughput,
  getPreprocessingErrorLogs,
  retryFailedPreprocessingItems,
  purgeFailedQueueItems,
  getPreprocessingMonitoringStats,
} from './monitoring-io';

// ─────────────────────────────────────────────────────────────────────────────
// Config Operations (Phase 7 - DB SSOT)
// ─────────────────────────────────────────────────────────────────────────────

export type { PreprocessingConfigResult, TypeConfigResult } from './config-io';

export {
  getPreprocessingConfig,
  getConfigForType,
  getAllConfigs,
} from './config-io';

export type { UpdateConfigResult } from './config-admin-io';

export { updatePreprocessingConfig } from './config-admin-io';
