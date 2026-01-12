/**
 * lib/infrastructure/openrouter/index.ts
 *
 * Central export point for OpenRouter LLM client.
 *
 * @see ARCHITECTURE.md §3.4.1
 */
export { getModelPricing, fetchAvailableModels } from './openrouter-models-io';
export { type AnalysisRunResult, isOpenRouterConfigured, runAnalysis } from './openrouter-run-io';
