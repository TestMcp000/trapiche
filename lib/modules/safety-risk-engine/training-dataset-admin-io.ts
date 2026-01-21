/**
 * Safety Risk Engine - Training Dataset Admin IO Module
 *
 * Server-only module for promoting assessments to training datasets.
 *
 * @see doc/specs/completed/safety-risk-engine-spec.md §9.3
 * @see ARCHITECTURE.md §3.4 - IO module split
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import {
    SAFETY_SYSTEM_PROMPT,
    composeSafetyPrompt,
    isValidSafetyLlmResponse,
} from '@/lib/modules/safety-risk-engine/prompt';
import { redactPii } from '@/lib/modules/safety-risk-engine/pii';
import type {
    SafetyRagContext,
    SafetyTrainingDatasetRow,
} from '@/lib/types/safety-risk-engine';

// =============================================================================
// Training Dataset Operations
// =============================================================================

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
