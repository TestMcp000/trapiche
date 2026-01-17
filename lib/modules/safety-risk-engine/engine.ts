/**
 * Safety Risk Engine - Decision Engine
 *
 * Pure module containing Layer 1 rules and decision logic.
 * Does not perform any I/O operations.
 *
 * Pattern similar to lib/spam/engine.ts for consistency.
 *
 * @see lib/spam/engine.ts - Similar pattern
 * @see doc/specs/proposed/safety-risk-engine-spec.md §3
 */

import type {
    SafetyDecision,
    SafetyLlmResponse,
    SafetyLayer1Input,
    SafetyLayer1Output,
} from '@/lib/types/safety-risk-engine';

// =============================================================================
// Constants
// =============================================================================

/**
 * Default high-confidence blocklist patterns.
 * These are patterns that almost certainly indicate crisis content.
 *
 * Note: This is a minimal starting set. Production blocklist should be
 * loaded from safety_settings.layer1_blocklist in DB.
 */
export const DEFAULT_BLOCKLIST: string[] = [
    // Explicit method mentions (very high confidence)
    // Note: Keep this list minimal and high-precision to avoid false positives
];

/**
 * Default confidence threshold for auto-approval.
 * Below this threshold, decisions default to HELD.
 */
export const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;

// =============================================================================
// Layer 1: Blocklist Check
// =============================================================================

/**
 * Check content against blocklist patterns.
 *
 * Layer 1 is for high-confidence, deterministic patterns that
 * can be immediately flagged without LLM analysis.
 *
 * @param content - Content to check
 * @param blocklist - Array of blocklist patterns (case-insensitive)
 * @returns Check result with hit status and matched pattern
 */
export function checkBlocklist(
    content: string,
    blocklist: string[] = DEFAULT_BLOCKLIST
): SafetyLayer1Output {
    if (!content || typeof content !== 'string') {
        return { hit: false, matched: null };
    }

    if (!blocklist || blocklist.length === 0) {
        return { hit: false, matched: null };
    }

    const contentLower = content.toLowerCase();

    for (const pattern of blocklist) {
        if (!pattern) continue;

        const patternLower = pattern.toLowerCase().trim();
        if (patternLower && contentLower.includes(patternLower)) {
            return {
                hit: true,
                matched: pattern,
                decision: 'HELD', // Conservative: HELD not REJECTED
                reason: `Blocklist pattern matched: ${pattern}`,
            };
        }
    }

    return { hit: false, matched: null };
}

/**
 * Run Layer 1 check on input.
 *
 * @param input - Layer 1 input with content and optional blocklist
 * @returns Layer 1 output if hit, null if passed
 */
export function runLayer1Check(input: SafetyLayer1Input): SafetyLayer1Output | null {
    const result = checkBlocklist(input.content, input.blocklist);

    if (result.hit) {
        return result;
    }

    return null;
}

// =============================================================================
// Decision Logic (Fail Closed)
// =============================================================================

/**
 * Decision result from LLM response interpretation.
 */
export interface SafetyDecisionResult {
    decision: SafetyDecision;
    reason: string;
}

/**
 * Make safety decision based on LLM response.
 *
 * Implements Fail Closed policy:
 * - null response → HELD (parse/network failure)
 * - Low confidence → HELD (uncertain)
 * - High_Risk/Uncertain → HELD (for human review, V1 policy)
 * - Safe + high confidence → APPROVED
 *
 * @param llmResponse - Parsed LLM response (or null if parse failed)
 * @param confidenceThreshold - Threshold for auto-decisions
 * @returns Decision and reason
 */
export function makeSafetyDecision(
    llmResponse: SafetyLlmResponse | null,
    confidenceThreshold: number = DEFAULT_CONFIDENCE_THRESHOLD
): SafetyDecisionResult {
    // Fail Closed: null response means something went wrong
    if (llmResponse === null) {
        return {
            decision: 'HELD',
            reason: 'LLM response parse failed or unavailable',
        };
    }

    const { risk_level, confidence, reason } = llmResponse;

    // Priority 1: Non-safe classifications always HELD (V1 policy)
    if (risk_level !== 'Safe') {
        return {
            decision: 'HELD',
            reason: `${risk_level} detected (${(confidence * 100).toFixed(0)}% confidence): ${reason}`,
        };
    }

    // Priority 2: Safe but low confidence → HELD
    if (confidence < confidenceThreshold) {
        return {
            decision: 'HELD',
            reason: `Low confidence (${(confidence * 100).toFixed(0)}%): ${reason}`,
        };
    }

    // Safe + high confidence → APPROVED
    return {
        decision: 'APPROVED',
        reason: `Safe (${(confidence * 100).toFixed(0)}% confidence): ${reason}`,
    };
}

/**
 * Determine if a decision should block publication.
 *
 * @param decision - Safety decision
 * @returns True if content should NOT be published
 */
export function shouldBlockPublication(decision: SafetyDecision): boolean {
    return decision === 'HELD' || decision === 'REJECTED';
}

/**
 * Determine if a decision requires human review.
 *
 * @param decision - Safety decision
 * @returns True if content should go to review queue
 */
export function requiresHumanReview(decision: SafetyDecision): boolean {
    return decision === 'HELD';
}

// =============================================================================
// Combined Engine (Pure)
// =============================================================================

/**
 * Full engine input combining all check stages.
 */
export interface SafetyEngineFullInput {
    /** Original content to check */
    content: string;

    /** Blocklist patterns for Layer 1 */
    blocklist?: string[];

    /** LLM response for Layer 3 (optional, may not have run yet) */
    llmResponse?: SafetyLlmResponse | null;

    /** Confidence threshold for decisions */
    confidenceThreshold?: number;

    /** Whether Layer 1 hit was already found */
    layer1Result?: SafetyLayer1Output;
}

/**
 * Full engine output with all decision details.
 */
export interface SafetyEngineFullOutput {
    /** Final decision */
    decision: SafetyDecision;

    /** Decision reason */
    reason: string;

    /** Layer 1 hit (if any) */
    layer1Hit: string | null;

    /** Whether blocked by Layer 1 */
    blockedByLayer1: boolean;
}

/**
 * Run full safety engine decision (pure).
 *
 * This function combines Layer 1 and Layer 3 decisions.
 * Layer 2 (RAG) is handled by IO modules and provides context to LLM.
 *
 * @param input - Full engine input
 * @returns Full engine output with decision
 */
export function runSafetyEngine(input: SafetyEngineFullInput): SafetyEngineFullOutput {
    // Check Layer 1 if not already done
    const layer1Result = input.layer1Result ?? runLayer1Check({
        content: input.content,
        blocklist: input.blocklist,
    });

    // If Layer 1 hit, return immediately
    if (layer1Result?.hit) {
        return {
            decision: layer1Result.decision ?? 'HELD',
            reason: layer1Result.reason ?? 'Blocklist pattern matched',
            layer1Hit: layer1Result.matched,
            blockedByLayer1: true,
        };
    }

    // No Layer 1 hit, use Layer 3 (LLM) decision
    const llmDecision = makeSafetyDecision(
        input.llmResponse ?? null,
        input.confidenceThreshold
    );

    return {
        decision: llmDecision.decision,
        reason: llmDecision.reason,
        layer1Hit: null,
        blockedByLayer1: false,
    };
}
