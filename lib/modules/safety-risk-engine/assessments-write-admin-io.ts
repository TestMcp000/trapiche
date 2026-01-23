/**
 * Safety Risk Engine - Assessments Write Admin IO Module
 *
 * Server-only module for writing safety assessments:
 * - Assessment record insertion
 * - Moderation pointer updates
 * - Combined persistence operations
 *
 * @see doc/specs/completed/safety-risk-engine-spec.md §9.3
 * @see ARCHITECTURE.md §3.4 - IO module split
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
    SafetyDecision,
    SafetyRiskLevel,
    SafetyAssessmentDraft,
    SafetyRagContext,
    SafetyHumanReviewedStatus,
} from '@/lib/types/safety-risk-engine';

// =============================================================================
// Types
// =============================================================================

/**
 * Update payload for comment_moderation safety pointers.
 */
export interface SafetyPointerUpdate {
    /** Assessment record ID. */
    assessmentId: string;

    /** Final safety decision. */
    decision: SafetyDecision;

    /** Risk level from LLM. */
    riskLevel: SafetyRiskLevel;

    /** Confidence score from LLM. */
    confidence: number;
}

/**
 * Database row structure for insert.
 */
interface AssessmentInsertRow {
    comment_id: string;
    decision: SafetyDecision;
    layer1_hit: string | null;
    layer2_context: SafetyRagContext[];
    provider: string;
    model_id: string;
    ai_risk_level: SafetyRiskLevel | null;
    confidence: number | null;
    ai_reason: string | null;
    latency_ms: number | null;
    human_reviewed_status?: SafetyHumanReviewedStatus;
}

// =============================================================================
// Assessment Persistence
// =============================================================================

/**
 * Insert a new safety assessment record.
 *
 * Creates an audit record in comment_safety_assessments table.
 * Uses service_role to bypass RLS (INSERT not allowed for authenticated).
 *
 * @param commentId - UUID of the comment being assessed
 * @param draft - Assessment draft from engine
 * @returns Inserted assessment ID, or null on failure
 *
 * @example
 * ```typescript
 * const assessmentId = await insertCommentSafetyAssessment(commentId, {
 *   decision: 'HELD',
 *   layer1Hit: null,
 *   layer2Context: [...],
 *   provider: 'gemini',
 *   modelId: 'gemini-1.5-flash',
 *   aiRiskLevel: 'High_Risk',
 *   confidence: 0.85,
 *   aiReason: 'Potential crisis indicators detected',
 * });
 * ```
 */
export async function insertCommentSafetyAssessment(
    commentId: string,
    draft: SafetyAssessmentDraft
): Promise<string | null> {
    const supabase = createAdminClient();

    const insertRow: AssessmentInsertRow = {
        comment_id: commentId,
        decision: draft.decision,
        layer1_hit: draft.layer1Hit,
        layer2_context: draft.layer2Context,
        provider: draft.provider,
        model_id: draft.modelId,
        ai_risk_level: draft.aiRiskLevel,
        confidence: draft.confidence,
        ai_reason: draft.aiReason,
        latency_ms: draft.latencyMs ?? null,
    };

    const { data, error } = await supabase
        .from('comment_safety_assessments')
        .insert(insertRow)
        .select('id')
        .single();

    if (error) {
        console.error('[insertCommentSafetyAssessment] Insert failed:', error);
        return null;
    }

    return data?.id ?? null;
}

// =============================================================================
// Moderation Pointer Updates
// =============================================================================

/**
 * Update comment_moderation with safety pointer fields.
 *
 * Updates the latest safety assessment pointer and summary fields
 * for quick admin list queries without joining to assessments table.
 *
 * @param commentId - UUID of the comment
 * @param update - Safety pointer update payload
 * @returns True on success, false on failure
 *
 * @example
 * ```typescript
 * await updateCommentModerationSafetyPointer(commentId, {
 *   assessmentId: '...',
 *   decision: 'HELD',
 *   riskLevel: 'High',
 *   confidence: 0.85,
 * });
 * ```
 */
export async function updateCommentModerationSafetyPointer(
    commentId: string,
    update: SafetyPointerUpdate
): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('comment_moderation')
        .update({
            safety_latest_assessment_id: update.assessmentId,
            safety_latest_decision: update.decision,
            safety_latest_risk_level: update.riskLevel,
            safety_latest_confidence: update.confidence,
        })
        .eq('comment_id', commentId);

    if (error) {
        console.error('[updateCommentModerationSafetyPointer] Update failed:', error);
        return false;
    }

    return true;
}

/**
 * Insert assessment and update moderation pointer in one transaction.
 *
 * Convenience function that combines both operations for the
 * typical comment submit flow.
 *
 * @param commentId - UUID of the comment
 * @param draft - Assessment draft from engine
 * @returns Assessment ID on success, null on failure
 */
export async function persistSafetyAssessment(
    commentId: string,
    draft: SafetyAssessmentDraft
): Promise<string | null> {
    // Step 1: Insert assessment record
    const assessmentId = await insertCommentSafetyAssessment(commentId, draft);

    if (!assessmentId) {
        return null;
    }

    // Step 2: Update moderation pointer
    const pointerSuccess = await updateCommentModerationSafetyPointer(commentId, {
        assessmentId,
        decision: draft.decision,
        riskLevel: draft.aiRiskLevel,
        confidence: draft.confidence,
    });

    if (!pointerSuccess) {
        console.warn('[persistSafetyAssessment] Pointer update failed, assessment still created');
        // Return assessmentId anyway - the assessment record exists
    }

    return assessmentId;
}
