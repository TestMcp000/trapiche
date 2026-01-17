/**
 * Safety Risk Engine - Prompt Composition & Parsing
 *
 * Pure module for composing LLM prompts and parsing JSON responses.
 * Handles the contract between Safety Risk Engine and Gemini.
 *
 * @see doc/specs/proposed/safety-risk-engine-spec.md §5.1
 */

import type {
    SafetyRagContext,
    SafetyLlmResponse,
    SafetyRiskLevel,
} from '@/lib/types/safety-risk-engine';

// =============================================================================
// Constants
// =============================================================================

/**
 * System prompt for Safety Risk Engine (per spec §5.1).
 * Instructs the LLM to act as a crisis prevention assistant.
 */
export const SAFETY_SYSTEM_PROMPT = `你是一個危機預防助手。你的目標是偵測自我傷害或自殺意圖，並把不確定情況交由人工審核。

重要規則：
1. 只回傳 JSON，不要包含任何其他文字
2. 區分日常誇飾用語（如「笑死」「累死」）與真實的危機訊號
3. 若不確定，請將 risk_level 標記為 Uncertain（並適度降低 confidence）
4. 考慮上下文語境，單一詞彙不足以判斷意圖`;

/**
 * User prompt template.
 * {RAG_CONTEXT} and {COMMENT} are placeholders.
 */
const USER_PROMPT_TEMPLATE = `分析以下留言的風險，僅回傳 JSON。

[RAG 上下文]
{RAG_CONTEXT}

[留言]
{COMMENT}

[輸出要求]
僅回傳 JSON: {"risk_level": "Safe"|"High_Risk"|"Uncertain", "confidence": 0.0-1.0, "reason": "簡短說明"}`;

/**
 * Default response when no RAG context available.
 */
const NO_CONTEXT_PLACEHOLDER = '（無相關語料參考）';

// =============================================================================
// Prompt Composition
// =============================================================================

/**
 * Format RAG context items for prompt.
 *
 * @param context - Array of RAG context items
 * @returns Formatted string for prompt
 */
export function formatRagContext(context: SafetyRagContext[]): string {
    if (!context || context.length === 0) {
        return NO_CONTEXT_PLACEHOLDER;
    }

    return context
        .map((item, index) => {
            const scorePercent = (item.score * 100).toFixed(0);
            return `${index + 1}. "${item.label}" - ${item.text} (相似度: ${scorePercent}%)`;
        })
        .join('\n');
}

/**
 * Compose the user prompt for Safety LLM call.
 *
 * @param comment - De-identified user comment
 * @param ragContext - RAG context from safety corpus
 * @returns Formatted user prompt
 */
export function composeSafetyPrompt(
    comment: string,
    ragContext: SafetyRagContext[] = []
): string {
    const contextStr = formatRagContext(ragContext);

    return USER_PROMPT_TEMPLATE
        .replace('{RAG_CONTEXT}', contextStr)
        .replace('{COMMENT}', comment);
}

/**
 * Get the complete messages array for chat completion.
 *
 * @param comment - De-identified user comment
 * @param ragContext - RAG context from safety corpus
 * @returns Array of messages for chat completion
 */
export function getSafetyPromptMessages(
    comment: string,
    ragContext: SafetyRagContext[] = []
): Array<{ role: 'system' | 'user'; content: string }> {
    return [
        { role: 'system', content: SAFETY_SYSTEM_PROMPT },
        { role: 'user', content: composeSafetyPrompt(comment, ragContext) },
    ];
}

// =============================================================================
// Response Parsing
// =============================================================================

/**
 * Valid risk level values.
 */
const VALID_RISK_LEVELS: SafetyRiskLevel[] = ['Safe', 'High_Risk', 'Uncertain'];

/**
 * Check if a value is a valid risk level.
 */
function isValidRiskLevel(value: unknown): value is SafetyRiskLevel {
    return typeof value === 'string' && VALID_RISK_LEVELS.includes(value as SafetyRiskLevel);
}

/**
 * Check if a value is a valid confidence score.
 */
function isValidConfidence(value: unknown): boolean {
    return typeof value === 'number' && value >= 0 && value <= 1;
}

/**
 * Validate if an object is a valid SafetyLlmResponse.
 *
 * @param obj - Object to validate
 * @returns True if valid
 */
export function isValidSafetyLlmResponse(obj: unknown): obj is SafetyLlmResponse {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    const record = obj as Record<string, unknown>;

    return (
        isValidRiskLevel(record.risk_level) &&
        isValidConfidence(record.confidence) &&
        typeof record.reason === 'string' &&
        record.reason.length > 0
    );
}

/**
 * Extract JSON from LLM response that may be wrapped in markdown code blocks.
 *
 * Handles cases like:
 * - Plain JSON: {"risk_level": "High", ...}
 * - Markdown wrapped: ```json\n{"risk_level": "High", ...}\n```
 * - With extra whitespace or newlines
 *
 * @param raw - Raw LLM response string
 * @returns Extracted JSON string or null
 */
export function extractJsonFromResponse(raw: string): string | null {
    if (!raw || typeof raw !== 'string') {
        return null;
    }

    const trimmed = raw.trim();

    // Try to find JSON in markdown code block
    const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
        return codeBlockMatch[1].trim();
    }

    // Try to find raw JSON object
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        return jsonMatch[0];
    }

    return null;
}

/**
 * Parse and validate LLM response for Safety assessment.
 *
 * Tolerant of common LLM output variations:
 * - Wrapped in ```json``` code blocks
 * - Extra whitespace
 * - Slightly malformed but parseable JSON
 *
 * @param raw - Raw response string from LLM
 * @returns Parsed and validated response, or null if invalid
 *
 * @example
 * ```typescript
 * const response = parseSafetyLlmResponse('```json\n{"risk_level": "High_Risk", "confidence": 0.85, "reason": "..."}\n```');
 * // Returns: { risk_level: 'High_Risk', confidence: 0.85, reason: '...' }
 * ```
 */
export function parseSafetyLlmResponse(raw: string): SafetyLlmResponse | null {
    // Extract JSON from response
    const jsonStr = extractJsonFromResponse(raw);
    if (!jsonStr) {
        return null;
    }

    // Try to parse
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonStr);
    } catch {
        return null;
    }

    // Validate structure
    if (!isValidSafetyLlmResponse(parsed)) {
        return null;
    }

    return parsed;
}

// =============================================================================
// Response Normalization
// =============================================================================

/**
 * Normalize confidence to ensure it's within valid range.
 *
 * @param confidence - Raw confidence value
 * @returns Normalized confidence (0.0 to 1.0)
 */
export function normalizeConfidence(confidence: number): number {
    if (typeof confidence !== 'number' || isNaN(confidence)) {
        return 0;
    }
    return Math.max(0, Math.min(1, confidence));
}
