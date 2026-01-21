import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';

/**
 * Get comment content by ID.
 */
export async function getSafetyDetailCommentContent(
    commentId: string
): Promise<{ content: string } | null> {
    const supabase = createAdminClient();

    const { data } = await supabase
        .from('comments')
        .select('content')
        .eq('id', commentId)
        .single();

    return data ? { content: data.content } : null;
}

/**
 * Get the latest safety assessment ID for a comment via comment_moderation pointer.
 */
export async function getSafetyLatestAssessmentIdByCommentId(
    commentId: string
): Promise<string | null> {
    const supabase = createAdminClient();

    const { data } = await supabase
        .from('comment_moderation')
        .select('safety_latest_assessment_id')
        .eq('comment_id', commentId)
        .single();

    return data?.safety_latest_assessment_id ?? null;
}

/**
 * Get the active training batch from safety_settings.
 */
export async function getSafetyTrainingActiveBatch(): Promise<string | null> {
    const supabase = createAdminClient();

    const { data } = await supabase
        .from('safety_settings')
        .select('training_active_batch')
        .eq('id', 1)
        .single();

    return data?.training_active_batch ?? null;
}

/**
 * Composite function: fetch all data needed for safety detail page.
 * Returns comment content, latest assessment ID, and active training batch.
 */
export async function getSafetyDetailPageData(commentId: string): Promise<{
    comment: { content: string } | null;
    latestAssessmentId: string | null;
    trainingActiveBatch: string | null;
}> {
    const [comment, latestAssessmentId, trainingActiveBatch] = await Promise.all([
        getSafetyDetailCommentContent(commentId),
        getSafetyLatestAssessmentIdByCommentId(commentId),
        getSafetyTrainingActiveBatch(),
    ]);

    return {
        comment,
        latestAssessmentId,
        trainingActiveBatch,
    };
}
