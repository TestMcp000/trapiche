/**
 * OpenRouter Models IO Module
 *
 * Server-only module for fetching available AI models from OpenRouter.
 *
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §6 - Technical execution
 */
import 'server-only';

import type { ModelPricing } from '@/lib/types/ai-analysis';

// =============================================================================
// Default Models
// =============================================================================

/**
 * Default model pricing (fallback when API unavailable).
 * Prices per million tokens, updated 2025-01.
 */
const DEFAULT_MODEL_PRICING: ModelPricing[] = [
  {
    modelId: 'openai/gpt-4o-mini',
    modelName: 'GPT-4o Mini',
    inputPricePerMillion: 0.15,
    outputPricePerMillion: 0.6,
  },
  {
    modelId: 'openai/gpt-4o',
    modelName: 'GPT-4o',
    inputPricePerMillion: 2.5,
    outputPricePerMillion: 10.0,
  },
  {
    modelId: 'anthropic/claude-3.5-sonnet',
    modelName: 'Claude 3.5 Sonnet',
    inputPricePerMillion: 3.0,
    outputPricePerMillion: 15.0,
  },
  {
    modelId: 'anthropic/claude-3-haiku',
    modelName: 'Claude 3 Haiku',
    inputPricePerMillion: 0.25,
    outputPricePerMillion: 1.25,
  },
  {
    modelId: 'google/gemini-pro-1.5',
    modelName: 'Gemini Pro 1.5',
    inputPricePerMillion: 1.25,
    outputPricePerMillion: 5.0,
  },
  {
    modelId: 'google/gemini-flash-1.5',
    modelName: 'Gemini Flash 1.5',
    inputPricePerMillion: 0.075,
    outputPricePerMillion: 0.3,
  },
];

/**
 * Get default models when API fetch fails.
 */
function getDefaultModels(): ModelPricing[] {
  return DEFAULT_MODEL_PRICING;
}

/**
 * Get pricing for a specific model by ID.
 * Falls back to default gpt-4o-mini pricing if model not found.
 *
 * @param modelId - OpenRouter model ID
 * @returns Model pricing info
 */
export function getModelPricing(modelId: string): ModelPricing {
  const model = DEFAULT_MODEL_PRICING.find((m) => m.modelId === modelId);
  if (model) {
    return model;
  }
  // Fallback to gpt-4o-mini pricing
  return DEFAULT_MODEL_PRICING[0];
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Fetch available models from OpenRouter.
 * Returns a subset of popular models for the settings UI.
 */
export async function fetchAvailableModels(): Promise<ModelPricing[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch OpenRouter models:', response.status);
      return getDefaultModels();
    }

    const data = await response.json() as {
      data: Array<{
        id: string;
        name: string;
        pricing: {
          prompt: string;
          completion: string;
        };
      }>;
    };

    // Filter to popular models and format
    const popularModels = [
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-sonnet',
      'anthropic/claude-3-haiku',
      'google/gemini-pro-1.5',
      'google/gemini-flash-1.5',
    ];

    const models: ModelPricing[] = [];

    for (const modelId of popularModels) {
      const model = data.data.find((m) => m.id === modelId);
      if (model) {
        models.push({
          modelId: model.id,
          modelName: model.name,
          // OpenRouter returns price per token as string
          inputPricePerMillion: parseFloat(model.pricing.prompt) * 1_000_000,
          outputPricePerMillion: parseFloat(model.pricing.completion) * 1_000_000,
        });
      }
    }

    return models.length > 0 ? models : getDefaultModels();
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return getDefaultModels();
  }
}
