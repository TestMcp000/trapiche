/**
 * Safety Risk Engine - Admin IO Module
 *
 * Server-only module for assessment persistence and moderation updates.
 * Uses service_role client since comment submit path doesn't have admin JWT.
 *
 * @see doc/specs/proposed/safety-risk-engine-spec.md §9.3
 * @see ARCHITECTURE.md §3.13 - IO boundaries
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { enqueueEmbedding } from '@/lib/embeddings';
import {
    SAFETY_SYSTEM_PROMPT,
    composeSafetyPrompt,
    isValidSafetyLlmResponse,
} from '@/lib/modules/safety-risk-engine/prompt';
import { redactPii } from '@/lib/modules/safety-risk-engine/pii';
import type {
    SafetyDecision,
    SafetyRiskLevel,
    SafetyAssessmentDraft,
    SafetyRagContext,
    SafetyHumanLabel,
    SafetyHumanReviewedStatus,
    SafetyTrainingDatasetRow,
    SafetyQueueItem,
    SafetyQueueFilters,
    SafetyCorpusItem,
    SafetyCorpusStatus,
    SafetyCorpusKind,
    SafetyAssessmentDetail,
    SafetyEngineSettings,
} from '@/lib/types/safety-risk-engine';
import type { EmbeddingTargetType } from '@/lib/types/embedding';

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

// =============================================================================
// Review Actions
// =============================================================================

/**
 * Label a safety assessment (human feedback).
 */
export async function labelSafetyAssessment(
    assessmentId: string,
    label: SafetyHumanLabel,
    reviewerId: string
): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('comment_safety_assessments')
        .update({
            human_label: label,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', assessmentId);

    if (error) {
        console.error('[labelSafetyAssessment] Update error:', error);
        return false;
    }

    return true;
}

/**
 * Update human_reviewed_status for ETL selection.
 */
export async function updateSafetyAssessmentHumanReviewedStatus(
    assessmentId: string,
    status: SafetyHumanReviewedStatus,
    reviewerId: string
): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('comment_safety_assessments')
        .update({
            human_reviewed_status: status,
            reviewed_by: reviewerId,
            reviewed_at: new Date().toISOString(),
        })
        .eq('id', assessmentId);

    if (error) {
        console.error('[updateSafetyAssessmentHumanReviewedStatus] Update error:', error);
        return false;
    }

    return true;
}

/**
 * Promote an assessment into safety_training_datasets for fine-tuning.
 *
 * Stores:
 * - input_messages: structured {role, content}[] (PII redacted)
 * - output_json: corrected target JSON (must include reason)
 *
 * IMPORTANT: correctedOutputJson is required. If missing/invalid, this function throws.
 */
export async function promoteSafetyAssessmentToTrainingDataset(
    params: {
        assessmentId: string;
        reviewerId: string;
        correctedOutputJson: unknown;
    }
): Promise<SafetyTrainingDatasetRow> {
    const supabase = createAdminClient();

    if (!params.correctedOutputJson) {
        throw new Error('Missing correctedOutputJson');
    }

    if (!isValidSafetyLlmResponse(params.correctedOutputJson)) {
        throw new Error('Invalid correctedOutputJson (must match SafetyLlmResponse)');
    }

    const { data: settings, error: settingsError } = await supabase
        .from('safety_settings')
        .select('training_active_batch')
        .eq('id', 1)
        .single();

    if (settingsError || !settings?.training_active_batch) {
        throw new Error('Safety training_active_batch not configured in safety_settings');
    }

    const datasetBatch = settings.training_active_batch;

    const { data: assessment, error: assessmentError } = await supabase
        .from('comment_safety_assessments')
        .select('id, comment_id, layer2_context')
        .eq('id', params.assessmentId)
        .single();

    if (assessmentError || !assessment) {
        throw new Error(
            `Failed to load assessment (${params.assessmentId}): ${assessmentError?.message ?? 'Unknown error'}`
        );
    }

    const { data: comment, error: commentError } = await supabase
        .from('comments')
        .select('content')
        .eq('id', assessment.comment_id)
        .single();

    if (commentError || !comment) {
        throw new Error(
            `Failed to load comment (${assessment.comment_id}): ${commentError?.message ?? 'Unknown error'}`
        );
    }

    const ragContext = (assessment.layer2_context ?? []) as SafetyRagContext[];
    const redactedText = redactPii(comment.content ?? '').text;
    const userPrompt = composeSafetyPrompt(redactedText, ragContext);

    const inputMessages = [
        { role: 'system' as const, content: SAFETY_SYSTEM_PROMPT },
        { role: 'user' as const, content: userPrompt },
    ];

    const { data: inserted, error: insertError } = await supabase
        .from('safety_training_datasets')
        .insert({
            input_messages: inputMessages,
            output_json: params.correctedOutputJson,
            source_log_id: assessment.id,
            dataset_batch: datasetBatch,
            created_by: params.reviewerId,
        })
        .select('id, input_messages, output_json, source_log_id, dataset_batch, created_by, created_at')
        .single();

    if (insertError) {
        // Unique violation: already promoted
        if ((insertError as { code?: string }).code === '23505') {
            const { data: existing } = await supabase
                .from('safety_training_datasets')
                .select('id, input_messages, output_json, source_log_id, dataset_batch, created_by, created_at')
                .eq('source_log_id', assessment.id)
                .eq('dataset_batch', datasetBatch)
                .single();

            if (!existing) {
                throw new Error('Unique violation but cannot load existing training dataset row');
            }

            return {
                id: existing.id,
                inputMessages: existing.input_messages,
                outputJson: existing.output_json,
                sourceLogId: existing.source_log_id,
                datasetBatch: existing.dataset_batch,
                createdBy: existing.created_by,
                createdAt: existing.created_at,
            };
        }

        throw new Error(`Failed to insert training dataset row: ${insertError.message}`);
    }

    return {
        id: inserted.id,
        inputMessages: inserted.input_messages,
        outputJson: inserted.output_json,
        sourceLogId: inserted.source_log_id,
        datasetBatch: inserted.dataset_batch,
        createdBy: inserted.created_by,
        createdAt: inserted.created_at,
    };
}

/**
 * Approve a HELD comment (update is_approved and safety decision).
 */
export async function approveSafetyComment(commentId: string): Promise<boolean> {
    const supabase = createAdminClient();

    // Update comment
    const { error: commentError } = await supabase
        .from('comments')
        .update({ is_approved: true })
        .eq('id', commentId);

    if (commentError) {
        console.error('[approveSafetyComment] Comment update error:', commentError);
        return false;
    }

    // Update moderation pointer
    const { error: modError } = await supabase
        .from('comment_moderation')
        .update({ safety_latest_decision: 'APPROVED' })
        .eq('comment_id', commentId);

    if (modError) {
        console.error('[approveSafetyComment] Moderation update error:', modError);
        // Comment already approved, so return true
    }

    return true;
}

/**
 * Reject a HELD comment (delete or mark as rejected).
 */
export async function rejectSafetyComment(commentId: string): Promise<boolean> {
    const supabase = createAdminClient();

    // Update moderation pointer first
    const { error: modError } = await supabase
        .from('comment_moderation')
        .update({ safety_latest_decision: 'REJECTED' })
        .eq('comment_id', commentId);

    if (modError) {
        console.error('[rejectSafetyComment] Moderation update error:', modError);
    }

    // Delete the comment
    const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

    if (deleteError) {
        console.error('[rejectSafetyComment] Delete error:', deleteError);
        return false;
    }

    return true;
}

// =============================================================================
// Corpus CRUD Operations
// =============================================================================

/**
 * Get safety corpus items with optional filtering.
 */
export async function getSafetyCorpusItems(
    filters: { kind?: SafetyCorpusKind; status?: SafetyCorpusStatus; search?: string } = {}
): Promise<SafetyCorpusItem[]> {
    const supabase = createAdminClient();

    let query = supabase
        .from('safety_corpus_items')
        .select('*')
        .order('created_at', { ascending: false });

    if (filters.kind) {
        query = query.eq('kind', filters.kind);
    }
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.search) {
        query = query.or(`label.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[getSafetyCorpusItems] Query error:', error);
        return [];
    }

    return (data ?? []).map((row) => ({
        id: row.id,
        kind: row.kind as SafetyCorpusKind,
        status: row.status as SafetyCorpusStatus,
        label: row.label,
        content: row.content,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        createdBy: row.created_by,
        updatedBy: row.updated_by,
    }));
}

/**
 * Create a new safety corpus item (defaults to draft status).
 */
export async function createSafetyCorpusItem(
    data: { kind: SafetyCorpusKind; label: string; content: string },
    userId: string
): Promise<string | null> {
    const supabase = createAdminClient();

    const { data: result, error } = await supabase
        .from('safety_corpus_items')
        .insert({
            kind: data.kind,
            status: 'draft',
            label: data.label,
            content: data.content,
            created_by: userId,
            updated_by: userId,
        })
        .select('id')
        .single();

    if (error) {
        console.error('[createSafetyCorpusItem] Insert error:', error);
        return null;
    }

    return result?.id ?? null;
}

/**
 * Update a safety corpus item.
 */
export async function updateSafetyCorpusItem(
    id: string,
    data: { label?: string; content?: string },
    userId: string
): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('safety_corpus_items')
        .update({
            ...data,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('[updateSafetyCorpusItem] Update error:', error);
        return false;
    }

    return true;
}

/**
 * Update safety corpus item status.
 * When activating, automatically enqueues embedding generation.
 */
export async function updateSafetyCorpusStatus(
    id: string,
    status: SafetyCorpusStatus,
    userId: string
): Promise<boolean> {
    const supabase = createAdminClient();

    // First get current item to determine kind for embedding target type
    const { data: item } = await supabase
        .from('safety_corpus_items')
        .select('kind')
        .eq('id', id)
        .single();

    const { error } = await supabase
        .from('safety_corpus_items')
        .update({
            status,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) {
        console.error('[updateSafetyCorpusStatus] Update error:', error);
        return false;
    }

    // If activating, enqueue embedding
    if (status === 'active' && item) {
        const targetType: EmbeddingTargetType = item.kind === 'slang' ? 'safety_slang' : 'safety_case';
        const result = await enqueueEmbedding({
            targetType,
            targetId: id,
            priority: 'high',
        });

        if (!result.success) {
            console.warn('[updateSafetyCorpusStatus] Embedding enqueue failed:', result.error);
            // Don't fail the status update, embedding can be retried
        }
    }

    return true;
}

/**
 * Delete a safety corpus item.
 */
export async function deleteSafetyCorpusItem(id: string): Promise<boolean> {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('safety_corpus_items')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[deleteSafetyCorpusItem] Delete error:', error);
        return false;
    }

    return true;
}

// =============================================================================
// Promote to Corpus
// =============================================================================

/**
 * Promote a text snippet to safety corpus (from comment review).
 * Creates a draft corpus item and optionally activates it.
 */
export async function promoteToCorpus(
    data: { text: string; label: string; kind: SafetyCorpusKind; activate?: boolean },
    userId: string
): Promise<string | null> {
    // Create the corpus item
    const itemId = await createSafetyCorpusItem(
        { kind: data.kind, label: data.label, content: data.text },
        userId
    );

    if (!itemId) {
        return null;
    }

    // Optionally activate (which triggers embedding enqueue)
    if (data.activate) {
        await updateSafetyCorpusStatus(itemId, 'active', userId);
    }

    return itemId;
}

// =============================================================================
// Settings Operations
// =============================================================================

/**
 * Get safety settings (singleton row id=1).
 * Uses authenticated client for RLS.
 */
export async function getSafetySettingsForAdmin(): Promise<SafetyEngineSettings | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('safety_settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error || !data) {
        console.error('[getSafetySettingsForAdmin] Query error:', error);
        return null;
    }

    return {
        isEnabled: data.is_enabled,
        modelId: data.model_id,
        timeoutMs: data.timeout_ms,
        riskThreshold: parseFloat(data.risk_threshold),
        trainingActiveBatch: data.training_active_batch ?? '2026-01_cold_start',
        heldMessage: data.held_message,
        rejectedMessage: data.rejected_message,
        layer1Blocklist: (data.layer1_blocklist ?? []) as string[],
    };
}

/**
 * Update safety settings.
 */
export async function updateSafetySettings(
    settings: Partial<{
        isEnabled: boolean;
        modelId: string;
        timeoutMs: number;
        riskThreshold: number;
        trainingActiveBatch: string;
        heldMessage: string;
        rejectedMessage: string;
        layer1Blocklist: string[];
    }>
): Promise<boolean> {
    const supabase = createAdminClient();

    const update: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (settings.isEnabled !== undefined) update.is_enabled = settings.isEnabled;
    if (settings.modelId !== undefined) update.model_id = settings.modelId;
    if (settings.timeoutMs !== undefined) update.timeout_ms = settings.timeoutMs;
    if (settings.riskThreshold !== undefined) update.risk_threshold = settings.riskThreshold;
    if (settings.trainingActiveBatch !== undefined) update.training_active_batch = settings.trainingActiveBatch;
    if (settings.heldMessage !== undefined) update.held_message = settings.heldMessage;
    if (settings.rejectedMessage !== undefined) update.rejected_message = settings.rejectedMessage;
    if (settings.layer1Blocklist !== undefined) update.layer1_blocklist = settings.layer1Blocklist;

    const { error } = await supabase
        .from('safety_settings')
        .update(update)
        .eq('id', 1);

    if (error) {
        console.error('[updateSafetySettings] Update error:', error);
        return false;
    }

    return true;
}

// =============================================================================
// Re-exports for convenience
// =============================================================================

export type {
    SafetyQueueItem,
    SafetyQueueFilters,
    SafetyCorpusItem,
    SafetyCorpusStatus,
    SafetyCorpusKind,
    SafetyAssessmentDetail,
    SafetyHumanLabel,
};
