/**
 * Safety Risk Engine - Assessments Read Admin IO Module
 *
 * Server-only module for reading safety assessments:
 * - Queue items for admin moderation view
 * - Assessment detail lookups
 *
 * @see doc/specs/completed/safety-risk-engine-spec.md §9.3
 * @see ARCHITECTURE.md §3.4 - IO module split
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
    SafetyDecision,
    SafetyRiskLevel,
    SafetyRagContext,
    SafetyQueueItem,
    SafetyQueueFilters,
    SafetyAssessmentDetail,
    SafetyHumanLabel,
    SafetyHumanReviewedStatus,
} from '@/lib/types/safety-risk-engine';

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
