/**
 * OpenRouter Run IO Module
 *
 * Server-only module for executing AI analysis via OpenRouter API.
 * Handles API calls, timeout, and response parsing.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §6 - Technical execution
 */
import 'server-only';

import type { AnalysisRequest } from '@/lib/types/ai-analysis';

import {
  SYSTEM_PROMPT,
  composeAnalysisPrompt,
  composeCustomAnalysisPrompt,
} from '@/lib/modules/ai-analysis/analysis-prompts';
import { fetchPromptTextById } from '@/lib/modules/ai-analysis/analysis-templates-io';

// =============================================================================
// Types
// =============================================================================

/**
 * Result from running an analysis.
 */
export interface AnalysisRunResult {
  success: boolean;
  result?: string;           // Markdown result
  inputTokens?: number;
  outputTokens?: number;
  model?: string;
  error?: string;
}

/**
 * OpenRouter API response structure.
 */
interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  model: string;
}

// =============================================================================
// Constants
// =============================================================================

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Default model to use if not configured.
 */
const DEFAULT_MODEL = 'openai/gpt-4o-mini';

/**
 * Analysis timeout in milliseconds (10 minutes per PRD).
 */
const ANALYSIS_TIMEOUT_MS = 10 * 60 * 1000;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get the OpenRouter API key from environment.
 * @throws Error if API key is not configured.
 */
function getApiKey(): string {
  const apiKey = process.env.OPENROUTER_API_KEY ?? process.env['openrouter_api_key'];
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable not configured');
  }
  return apiKey;
}

/**
 * Get the configured model or default.
 * @param requestedModel - Model ID from request (overrides environment)
 */
function getModel(requestedModel?: string): string {
  // Request model takes priority, then env, then default
  return requestedModel || process.env.OPENROUTER_MODEL || DEFAULT_MODEL;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Check if OpenRouter API is configured.
 */
export function isOpenRouterConfigured(): boolean {
  return !!(process.env.OPENROUTER_API_KEY ?? process.env['openrouter_api_key']);
}

/**
 * Run AI analysis via OpenRouter API.
 *
 * @param request - Analysis request with template, modelId, and data
 * @param data - Pre-fetched data to analyze (will be de-identified)
 * @returns Analysis result with markdown content
 */
export async function runAnalysis(
  request: AnalysisRequest,
  data: Record<string, unknown>[]
): Promise<AnalysisRunResult> {
  try {
    const apiKey = getApiKey();
    // Use modelId from request (allows user to select model via UI)
    const model = getModel(request.modelId);

    // Compose prompt with de-identified data
    let userPrompt: string;

    if (request.templateId === 'custom' && request.customTemplateId) {
      // Custom template: fetch prompt text from database
      const customPromptText = await fetchPromptTextById(request.customTemplateId);
      if (!customPromptText) {
        return {
          success: false,
          error: 'Custom template not found or disabled',
        };
      }
      userPrompt = composeCustomAnalysisPrompt(customPromptText, data);
    } else {
      // Built-in template
      userPrompt = composeAnalysisPrompt(request.templateId, data);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.SITE_URL || 'http://localhost:3000',
          'X-Title': 'AI Analysis',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 4096,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `OpenRouter API error: ${response.status} - ${errorText}`,
        };
      }

      const result = await response.json() as OpenRouterResponse;

      // Validate response
      if (!result.choices || result.choices.length === 0) {
        return {
          success: false,
          error: 'OpenRouter returned empty response',
        };
      }

      const content = result.choices[0].message.content;

      // Check for incomplete response (< 100 chars per PRD)
      if (!content || content.length < 100) {
        return {
          success: true, // Still save it but mark as incomplete
          result: content || '',
          inputTokens: result.usage?.prompt_tokens,
          outputTokens: result.usage?.completion_tokens,
          model: result.model,
          error: 'Response too short (may be incomplete)',
        };
      }

      return {
        success: true,
        result: content,
        inputTokens: result.usage?.prompt_tokens,
        outputTokens: result.usage?.completion_tokens,
        model: result.model,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        error: 'Analysis timed out (exceeded 10 minutes)',
      };
    }

    return {
      success: false,
      error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
