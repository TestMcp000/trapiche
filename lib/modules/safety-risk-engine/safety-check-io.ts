/**
 * Safety Risk Engine - Safety Check IO Module (Orchestrator)
 *
 * Server-only orchestrator that runs the full safety check pipeline:
 * Layer 1 (blocklist) → Layer 2 (RAG) → Layer 3 (LLM)
 *
 * Implements Fail Closed policy: any error/timeout defaults to HELD.
 *
 * @see doc/specs/proposed/safety-risk-engine-spec.md §3, §4.2.0
 * @see ARCHITECTURE.md §3.13 - IO boundaries
 */
import 'server-only';

import { getSafetySettings } from '@/lib/modules/safety-risk-engine/settings-io';
import { searchSafetyCorpus } from '@/lib/modules/safety-risk-engine/rag-io';
import { runSafetyLlmAssessment, isLlmAssessmentAvailable } from '@/lib/modules/safety-risk-engine/llm-io';
import { redactPii } from '@/lib/modules/safety-risk-engine/pii';
import { runLayer1Check, makeSafetyDecision } from '@/lib/modules/safety-risk-engine/engine';
import type {
    SafetyDecision,
    SafetyAssessmentDraft,
    SafetyRagContext,
    SafetyEngineSettings,
} from '@/lib/types/safety-risk-engine';

// =============================================================================
// Constants
// =============================================================================

/** Default provider name for assessment records (audit only, not SDK access). */
const PROVIDER_NAME = 'gemini';

// =============================================================================
// Types
// =============================================================================

/**
 * Result from safety check orchestrator.
 */
export interface SafetyCheckResult {
    /** Final safety decision. */
    decision: SafetyDecision;

    /** Assessment draft for persistence (null if Layer 1 short-circuit). */
    assessmentDraft: SafetyAssessmentDraft | null;

    /** User-facing message. */
    message: string;

    /** Maps to comment.is_approved (false for HELD/REJECTED, true for APPROVED). */
    isApproved: boolean;
}

// =============================================================================
// Orchestrator
// =============================================================================

/**
 * Run the full safety check pipeline on content.
 *
 * Pipeline:
 * 1. Apply PII redaction
 * 2. Layer 1: Blocklist check (pure, immediate)
 * 3. Layer 2: RAG search for context (async)
 * 4. Layer 3: LLM assessment (async)
 * 5. Make final decision
 *
 * Implements Fail Closed: errors/timeouts → HELD.
 *
 * @param content - Raw comment content to check
 * @returns SafetyCheckResult with decision and assessment draft
 *
 * @example
 * ```typescript
 * const result = await runSafetyCheck('user comment text');
 * if (result.decision === 'REJECTED') {
 *   return { success: false, message: result.message };
 * }
 * // Insert comment with is_approved = result.isApproved
 * ```
 */
export async function runSafetyCheck(content: string): Promise<SafetyCheckResult> {
    const startTime = Date.now();

    // Get settings
    const settings = await getSafetySettings();

    // Step 1: Apply PII redaction
    const piiResult = redactPii(content);
    const deidentifiedText = piiResult.text;

    // Step 2: Layer 1 blocklist check (pure, fast)
    const layer1Result = runLayer1Check({
        content: deidentifiedText,
        blocklist: settings.layer1Blocklist,
    });

    if (layer1Result?.hit) {
        // Layer 1 hit: immediate HELD decision
        return createLayer1Result(layer1Result.matched, settings);
    }

    // Step 3: Layer 2 RAG search (async, can fail gracefully)
    let ragContext: SafetyRagContext[] = [];
    try {
        ragContext = await searchSafetyCorpus(deidentifiedText);
    } catch {
        // RAG failure: continue without context (Layer 3 can still run)
        console.warn('[runSafetyCheck] RAG search failed, continuing without context');
    }

    // Step 4: Layer 3 LLM assessment
    if (!isLlmAssessmentAvailable()) {
        // LLM not configured: Fail Closed
        return createFailClosedResult(
            ragContext,
            settings,
            'LLM assessment not available',
            Date.now() - startTime
        );
    }

    const llmResult = await runSafetyLlmAssessment({
        comment: content,
        ragContext,
        settings,
    });

    const latencyMs = Date.now() - startTime;

    if (!llmResult.success || !llmResult.response) {
        // LLM failed: Fail Closed
        return createFailClosedResult(
            ragContext,
            settings,
            llmResult.error ?? 'LLM assessment failed',
            latencyMs
        );
    }

    // Step 5: Make decision based on LLM response
    const decisionResult = makeSafetyDecision(
        llmResult.response,
        settings.riskThreshold
    );

    // Create assessment draft
    const assessmentDraft: SafetyAssessmentDraft = {
        decision: decisionResult.decision,
        layer1Hit: null,
        layer2Context: ragContext,
        provider: PROVIDER_NAME,
        modelId: llmResult.model ?? settings.modelId,
        aiRiskLevel: llmResult.response.risk_level,
        confidence: llmResult.response.confidence,
        aiReason: llmResult.response.reason,
        latencyMs,
    };

    return {
        decision: decisionResult.decision,
        assessmentDraft,
        message: getMessageForDecision(decisionResult.decision, settings),
        isApproved: decisionResult.decision === 'APPROVED',
    };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create result for Layer 1 blocklist hit.
 */
function createLayer1Result(
    matchedPattern: string | null,
    settings: SafetyEngineSettings
): SafetyCheckResult {
    const assessmentDraft: SafetyAssessmentDraft = {
        decision: 'HELD',
        layer1Hit: matchedPattern,
        layer2Context: [],
        provider: PROVIDER_NAME,
        modelId: settings.modelId,
        aiRiskLevel: 'High_Risk',
        confidence: 1.0,
        aiReason: `Blocklist pattern matched: ${matchedPattern}`,
    };

    return {
        decision: 'HELD',
        assessmentDraft,
        message: settings.heldMessage,
        isApproved: false,
    };
}

/**
 * Create result for Fail Closed scenario (LLM error/timeout).
 */
function createFailClosedResult(
    ragContext: SafetyRagContext[],
    settings: SafetyEngineSettings,
    errorReason: string,
    latencyMs: number
): SafetyCheckResult {
    const assessmentDraft: SafetyAssessmentDraft = {
        decision: 'HELD',
        layer1Hit: null,
        layer2Context: ragContext,
        provider: PROVIDER_NAME,
        modelId: settings.modelId,
        aiRiskLevel: 'Uncertain',
        confidence: 0,
        aiReason: `Fail Closed: ${errorReason}`,
        latencyMs,
    };

    return {
        decision: 'HELD',
        assessmentDraft,
        message: settings.heldMessage,
        isApproved: false,
    };
}

/**
 * Get user-facing message for decision.
 */
function getMessageForDecision(
    decision: SafetyDecision,
    settings: SafetyEngineSettings
): string {
    switch (decision) {
        case 'APPROVED':
            return 'Comment posted successfully!';
        case 'HELD':
            return settings.heldMessage;
        case 'REJECTED':
            return settings.rejectedMessage;
    }
}
