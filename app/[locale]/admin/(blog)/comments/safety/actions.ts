'use server';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
    getSafetyQueueItems,
    getSafetyAssessmentDetail,
    labelSafetyAssessment,
    approveSafetyComment,
    rejectSafetyComment,
    promoteToCorpus,
} from '@/lib/modules/safety-risk-engine/admin-io';
import type {
    SafetyQueueItem,
    SafetyQueueFilters,
    SafetyAssessmentDetail,
    SafetyHumanLabel,
    SafetyCorpusKind,
} from '@/lib/types/safety-risk-engine';
import {
    ADMIN_ERROR_CODES,
    actionError,
    actionSuccess,
    type ActionResult,
} from '@/lib/types/action-result';

// =============================================================================
// Queue Actions
// =============================================================================

/**
 * Fetch safety queue items with filters.
 */
export async function fetchSafetyQueueAction(
    filters: SafetyQueueFilters = {}
): Promise<ActionResult<{ items: SafetyQueueItem[]; total: number }>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const result = await getSafetyQueueItems(filters);
        return actionSuccess(result);
    } catch (error) {
        console.error('[fetchSafetyQueueAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Fetch safety assessment detail by ID.
 */
export async function fetchSafetyAssessmentAction(
    assessmentId: string
): Promise<ActionResult<SafetyAssessmentDetail | null>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const result = await getSafetyAssessmentDetail(assessmentId);
        return actionSuccess(result);
    } catch (error) {
        console.error('[fetchSafetyAssessmentAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

// =============================================================================
// Review Actions
// =============================================================================

/**
 * Label a safety assessment (human feedback).
 */
export async function labelAssessmentAction(
    assessmentId: string,
    label: SafetyHumanLabel
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const success = await labelSafetyAssessment(assessmentId, label, guard.userId);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        return actionSuccess();
    } catch (error) {
        console.error('[labelAssessmentAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Approve a HELD comment.
 */
export async function approveCommentAction(
    commentId: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const success = await approveSafetyComment(commentId);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        return actionSuccess();
    } catch (error) {
        console.error('[approveCommentAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Reject (delete) a HELD comment.
 */
export async function rejectCommentAction(
    commentId: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const success = await rejectSafetyComment(commentId);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
        }

        return actionSuccess();
    } catch (error) {
        console.error('[rejectCommentAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Promote text snippet to safety corpus.
 */
export async function promoteToCorpusAction(data: {
    text: string;
    label: string;
    kind: SafetyCorpusKind;
    activate?: boolean;
}): Promise<ActionResult<{ itemId: string }>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const itemId = await promoteToCorpus(data, guard.userId);
        if (!itemId) {
            return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
        }

        return actionSuccess({ itemId });
    } catch (error) {
        console.error('[promoteToCorpusAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}
