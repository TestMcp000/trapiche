/**
 * OpenRouter Chat Completion IO Module
 *
 * Server-only module providing a generic chat completion runner.
 * Designed for various use cases (Safety Risk Engine, etc.) with configurable
 * timeout, model, temperature, and max tokens.
 *
 * Unlike `openrouter-run-io.ts` which is specialized for AI Analysis markdown output,
 * this module provides a generic interface for chat completion requests.
 *
 * @see ARCHITECTURE.md §3.13 - OpenRouter API access boundaries
 */
import 'server-only';

import { SITE_URL } from '@/lib/site/site-url';

// =============================================================================
// Types
// =============================================================================

/**
 * Chat message role.
 */
export type ChatMessageRole = 'system' | 'user' | 'assistant';

/**
 * Single chat message.
 */
export interface ChatMessage {
    role: ChatMessageRole;
    content: string;
}

/**
 * Request for chat completion.
 */
export interface ChatCompletionRequest {
    /** Array of messages for the conversation. */
    messages: ChatMessage[];

    /** Model ID (e.g., 'openai/gpt-4o-mini'). */
    model: string;

    /** Timeout in milliseconds. Default: 10000ms. Safety uses shorter (1200-1500ms). */
    timeoutMs?: number;

    /** Temperature for response generation. Default: 0.7. */
    temperature?: number;

    /** Maximum tokens for response. Default: 1024. */
    maxTokens?: number;
}

/**
 * Result from chat completion request.
 */
export interface ChatCompletionResult {
    /** Whether the request succeeded. */
    success: boolean;

    /** Response content (if successful). */
    content?: string;

    /** Token usage information. */
    usage?: {
        promptTokens: number;
        completionTokens: number;
    };

    /** Actual model used. */
    model?: string;

    /** Error message (if unsuccessful). */
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
const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MAX_TOKENS = 1024;

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
 * Get site URL for referer header.
 *
 * Priority:
 * 1. process.env.SITE_URL (server-only; OpenRouter header dedicated)
 * 2. SITE_URL constant from lib/site/site-url.ts (canonical; includes dev fallback)
 *
 * NOTE: Do NOT read NEXT_PUBLIC_SITE_URL directly here.
 * The single source is lib/site/site-url.ts.
 *
 * @see ARCHITECTURE.md §3.11 (SITE_URL single source)
 */
function getSiteUrl(): string {
    return process.env.SITE_URL || SITE_URL;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Check if OpenRouter API is configured.
 */
export function isChatCompletionConfigured(): boolean {
    return !!(process.env.OPENROUTER_API_KEY ?? process.env['openrouter_api_key']);
}

/**
 * Run a generic chat completion request via OpenRouter API.
 *
 * This function provides a clean, generic interface for chat completions
 * that can be used by various modules (Safety Risk Engine, etc.).
 *
 * @param request - Chat completion request parameters
 * @returns Chat completion result
 *
 * @example
 * ```typescript
 * const result = await runChatCompletion({
 *   messages: [
 *     { role: 'system', content: 'You are a helpful assistant.' },
 *     { role: 'user', content: 'Hello!' },
 *   ],
 *   model: 'openai/gpt-4o-mini',
 *   timeoutMs: 5000,
 * });
 * ```
 */
export async function runChatCompletion(
    request: ChatCompletionRequest
): Promise<ChatCompletionResult> {
    try {
        const apiKey = getApiKey();
        const {
            messages,
            model,
            timeoutMs = DEFAULT_TIMEOUT_MS,
            temperature = DEFAULT_TEMPERATURE,
            maxTokens = DEFAULT_MAX_TOKENS,
        } = request;

        // Validate messages
        if (!messages || messages.length === 0) {
            return {
                success: false,
                error: 'Messages array is required and cannot be empty',
            };
        }

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': getSiteUrl(),
                    'X-Title': 'Chat Completion',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    max_tokens: maxTokens,
                    temperature,
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

            const result = (await response.json()) as OpenRouterResponse;

            // Validate response structure
            if (!result.choices || result.choices.length === 0) {
                return {
                    success: false,
                    error: 'OpenRouter returned empty response',
                };
            }

            const content = result.choices[0].message.content;

            return {
                success: true,
                content,
                usage: {
                    promptTokens: result.usage?.prompt_tokens ?? 0,
                    completionTokens: result.usage?.completion_tokens ?? 0,
                },
                model: result.model,
            };
        } finally {
            clearTimeout(timeoutId);
        }
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            return {
                success: false,
                error: `Request timed out after ${request.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`,
            };
        }

        return {
            success: false,
            error: `Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}
