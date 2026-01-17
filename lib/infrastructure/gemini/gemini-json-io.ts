/**
 * Gemini JSON Completion IO Module
 *
 * Server-only wrapper around Gemini SDK for constrained JSON output.
 *
 * @see ARCHITECTURE.md §3.13 - SDK / secrets / client bundle rules
 */
import 'server-only';

import {
    GoogleGenerativeAI,
    SchemaType,
    type ResponseSchema,
} from '@google/generative-ai';

// =============================================================================
// Types
// =============================================================================

export interface GeminiJsonCompletionRequest {
    model: string;
    systemInstruction?: string;
    userPrompt: string;
    responseSchema: ResponseSchema;
    timeoutMs: number;
    temperature?: number;
    maxOutputTokens?: number;
}

export interface GeminiJsonCompletionResult {
    success: boolean;
    content?: string;
    model?: string;
    latencyMs?: number;
    error?: string;
}

// =============================================================================
// Config
// =============================================================================

function getGeminiApiKey(): string {
    const apiKey =
        process.env.GEMINI_API_KEY ??
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
        process.env.GOOGLE_API_KEY;

    if (!apiKey) {
        throw new Error('Gemini API key not configured (set GEMINI_API_KEY)');
    }

    return apiKey;
}

export function isGeminiConfigured(): boolean {
    return !!(
        process.env.GEMINI_API_KEY ??
        process.env.GOOGLE_GENERATIVE_AI_API_KEY ??
        process.env.GOOGLE_API_KEY
    );
}

// =============================================================================
// API
// =============================================================================

export async function runGeminiJsonCompletion(
    request: GeminiJsonCompletionRequest
): Promise<GeminiJsonCompletionResult> {
    const startTime = Date.now();

    try {
        const apiKey = getGeminiApiKey();
        const genAI = new GoogleGenerativeAI(apiKey);

        const model = genAI.getGenerativeModel(
            {
                model: request.model,
                systemInstruction: request.systemInstruction,
                generationConfig: {
                    responseMimeType: 'application/json',
                    responseSchema: request.responseSchema,
                    temperature: request.temperature,
                    maxOutputTokens: request.maxOutputTokens,
                },
            },
            { timeout: request.timeoutMs }
        );

        const result = await model.generateContent(request.userPrompt, {
            timeout: request.timeoutMs,
        });

        const content = result.response.text();

        return {
            success: true,
            content,
            model: request.model,
            latencyMs: Date.now() - startTime,
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown Gemini error',
            latencyMs: Date.now() - startTime,
        };
    }
}

// =============================================================================
// Re-exports
// =============================================================================

export { SchemaType };
export type { ResponseSchema };
