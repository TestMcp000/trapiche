/**
 * AI Analysis Run IO Module (Facade)
 *
 * Re-exports all analysis execution functions from capability-scoped modules.
 * This facade preserves backward compatibility for existing imports.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §6 - Technical execution
 * @see uiux_refactor.md §6.2 - Data Intelligence Platform (Module B)
 */
import 'server-only';

// =============================================================================
// Prompt Composition (Pure)
// =============================================================================

export { composeAnalysisPrompt } from './analysis-prompts';

// =============================================================================
// Analysis Execution (Server-only IO)
// =============================================================================

export {
  type AnalysisRunResult,
  runAnalysis,
  isOpenRouterConfigured,
} from '@/lib/infrastructure/openrouter/openrouter-run-io';

// =============================================================================
// Model Management (Server-only IO)
// =============================================================================

export { fetchAvailableModels, getModelPricing } from '@/lib/infrastructure/openrouter/openrouter-models-io';
