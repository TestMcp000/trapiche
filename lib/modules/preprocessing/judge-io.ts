/**
 * Judge IO Module (LLM-as-a-Judge) - Facade
 * @see doc/specs/completed/DATA_PREPROCESSING.md §5.3
 * @see uiux_refactor.md §6.4.2
 *
 * Thin facade re-exporting from sub-modules:
 * - judge-invoke-io.ts: Edge Function calls and sampling logic
 * - judge-metrics-io.ts: Quality metrics queries
 * - judge-write-io.ts: Quality score persistence
 */
import 'server-only';

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports from sub-modules
// ─────────────────────────────────────────────────────────────────────────────

// Invoke (Edge Function client + sampling)
export { judgeChunk, shouldSampleContent, judgeChunksForContent } from './judge-invoke-io';

// Metrics (quality metrics + failed samples)
export { getQualityMetrics, getFailedSamples } from './judge-metrics-io';
export type { QualityMetrics, FailedSample } from './judge-metrics-io';

// Write (quality score persistence)
export {
  updateEmbeddingQualityScore,
  updateEmbeddingQualityScoresBatch,
} from './judge-write-io';
