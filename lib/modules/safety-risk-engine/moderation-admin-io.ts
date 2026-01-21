/**
 * Safety Risk Engine - Moderation Admin IO Module
 *
 * Server-only module for comment moderation actions (label, status, approve, reject).
 *
 * @see doc/specs/completed/safety-risk-engine-spec.md §9.3
 * @see ARCHITECTURE.md §3.4 - IO module split
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
    SafetyHumanLabel,
    SafetyHumanReviewedStatus,
} from '@/lib/types/safety-risk-engine';

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
