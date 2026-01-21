/**
 * Safety Risk Engine - Assessments Admin IO Module
 *
 * Server-only module for assessment persistence, moderation pointer updates,
 * and queue read operations.
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
    SafetyQueueItem,
    SafetyQueueFilters,
    SafetyAssessmentDetail,
    SafetyHumanLabel,
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

// =============================================================================
// Queue Read Operations
// =============================================================================

/**
 * Get HELD comments for safety queue admin view.
 *
 * @param filters - Queue filters
 * @returns List of queue items and total count
 */
export async function getSafetyQueueItems(
    filters: SafetyQueueFilters = {}
): Promise<{ items: SafetyQueueItem[]; total: number }> {
    const supabase = createAdminClient();
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    // Build query - join comments with comment_moderation
    let query = supabase
        .from('comments')
        .select(`
            id,
            content,
            target_type,
            target_id,
            display_name,
            created_at,
            comment_moderation!inner (
                safety_latest_assessment_id,
                safety_latest_decision,
                safety_latest_risk_level,
                safety_latest_confidence
            )
        `, { count: 'exact' })
        .eq('comment_moderation.safety_latest_decision', 'HELD');

    // Apply filters
    if (filters.riskLevel) {
        query = query.eq('comment_moderation.safety_latest_risk_level', filters.riskLevel);
    }
    if (filters.confidenceMin !== undefined) {
        query = query.gte('comment_moderation.safety_latest_confidence', filters.confidenceMin);
    }
    if (filters.confidenceMax !== undefined) {
        query = query.lte('comment_moderation.safety_latest_confidence', filters.confidenceMax);
    }
    if (filters.targetType) {
        query = query.eq('target_type', filters.targetType);
    }
    if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
    }
    if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
    }
    if (filters.search) {
        query = query.ilike('content', `%${filters.search}%`);
    }

    // Order and paginate
    query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
        console.error('[getSafetyQueueItems] Query error:', error);
        return { items: [], total: 0 };
    }

    // Map to SafetyQueueItem - need to fetch assessment reasons
    // Note: Supabase returns joined relations as arrays
    type ModerationRow = {
        safety_latest_assessment_id: string | null;
        safety_latest_decision: string | null;
        safety_latest_risk_level: string | null;
        safety_latest_confidence: number | null;
    };

    const assessmentIds = (data ?? [])
        .map((row) => {
            const modArray = row.comment_moderation as ModerationRow[] | ModerationRow;
            const mod = Array.isArray(modArray) ? modArray[0] : modArray;
            return mod?.safety_latest_assessment_id;
        })
        .filter((id): id is string => id !== null);

    // Fetch assessment reasons in batch
    let reasonMap: Record<string, { layer1_hit: string | null; ai_reason: string | null }> = {};
    if (assessmentIds.length > 0) {
        const { data: assessments } = await supabase
            .from('comment_safety_assessments')
            .select('id, layer1_hit, ai_reason')
            .in('id', assessmentIds);

        if (assessments) {
            reasonMap = Object.fromEntries(
                assessments.map((a) => [a.id, { layer1_hit: a.layer1_hit, ai_reason: a.ai_reason }])
            );
        }
    }

    const items: SafetyQueueItem[] = (data ?? []).map((row) => {
        const modArray = row.comment_moderation as ModerationRow[] | ModerationRow;
        const mod = Array.isArray(modArray) ? modArray[0] : modArray;
        const assessmentId = mod?.safety_latest_assessment_id;
        const reasons = assessmentId ? reasonMap[assessmentId] : null;

        return {
            commentId: row.id,
            content: row.content?.substring(0, 200) ?? '',
            targetType: row.target_type as 'post' | 'gallery_item',
            targetId: row.target_id,
            targetTitle: '', // Would need join to posts/gallery_items - simplified for now
            authorName: row.display_name ?? 'Anonymous',
            createdAt: row.created_at,
            riskLevel: mod?.safety_latest_risk_level as SafetyRiskLevel | null,
            confidence: mod?.safety_latest_confidence ?? null,
            aiReason: reasons?.ai_reason ?? null,
            layer1Hit: reasons?.layer1_hit ?? null,
            assessmentId: assessmentId ?? null,
        };
    });

    return { items, total: count ?? 0 };
}

/**
 * Get safety assessment detail by ID.
 */
export async function getSafetyAssessmentDetail(
    assessmentId: string
): Promise<SafetyAssessmentDetail | null> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('comment_safety_assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

    if (error || !data) {
        console.error('[getSafetyAssessmentDetail] Query error:', error);
        return null;
    }

    return {
        id: data.id,
        commentId: data.comment_id,
        createdAt: data.created_at,
        decision: data.decision as SafetyDecision,
        layer1Hit: data.layer1_hit,
        layer2Context: (data.layer2_context ?? []) as SafetyRagContext[],
        provider: data.provider ?? 'gemini',
        modelId: data.model_id,
        aiRiskLevel: data.ai_risk_level as SafetyRiskLevel | null,
        confidence: data.confidence,
        aiReason: data.ai_reason,
        latencyMs: data.latency_ms,
        humanLabel: data.human_label as SafetyHumanLabel | null,
        humanReviewedStatus: (data.human_reviewed_status ?? null) as SafetyHumanReviewedStatus | null,
        reviewedBy: data.reviewed_by,
        reviewedAt: data.reviewed_at,
    };
}
