'use server';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
    getSafetyAssessmentDetail,
    labelSafetyAssessment,
    updateSafetyAssessmentHumanReviewedStatus,
    approveSafetyComment,
    rejectSafetyComment,
    promoteToCorpus,
    promoteSafetyAssessmentToTrainingDataset,
} from '@/lib/modules/safety-risk-engine/admin-io';
import { getSafetyDetailPageData } from '@/lib/modules/safety-risk-engine/safety-detail-admin-io';
import { isValidSafetyLlmResponse } from '@/lib/modules/safety-risk-engine/prompt';
import type {
    SafetyAssessmentDetail,
    SafetyHumanLabel,
    SafetyCorpusKind,
    SafetyHumanReviewedStatus,
    SafetyLlmResponse,
} from '@/lib/types/safety-risk-engine';
import {
    ADMIN_ERROR_CODES,
    actionError,
    actionSuccess,
    type ActionResult,
} from '@/lib/types/action-result';

/**
 * Fetch safety assessment detail by comment ID.
 * Uses IO module to fetch page data, then retrieves assessment detail if available.
 */
export async function fetchAssessmentByCommentAction(
    commentId: string
): Promise<ActionResult<{ assessment: SafetyAssessmentDetail | null; comment: { content: string } | null; trainingActiveBatch: string | null }>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const pageData = await getSafetyDetailPageData(commentId);

        if (!pageData.latestAssessmentId) {
            return actionSuccess({
                assessment: null,
                comment: pageData.comment,
                trainingActiveBatch: pageData.trainingActiveBatch,
            });
        }

        const assessment = await getSafetyAssessmentDetail(pageData.latestAssessmentId);

        return actionSuccess({
            assessment,
            comment: pageData.comment,
            trainingActiveBatch: pageData.trainingActiveBatch,
        });
    } catch (error) {
        console.error('[fetchAssessmentByCommentAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Label a safety assessment.
 */
export async function labelDetailAssessmentAction(
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
        console.error('[labelDetailAssessmentAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Approve comment from detail page.
 */
export async function approveDetailCommentAction(
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
        console.error('[approveDetailCommentAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Reject comment from detail page.
 */
export async function rejectDetailCommentAction(
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
        console.error('[rejectDetailCommentAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Promote text to corpus from detail page.
 */
export async function promoteDetailToCorpusAction(data: {
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
        console.error('[promoteDetailToCorpusAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Promote assessment to training dataset with corrected output JSON.
 *
 * IMPORTANT: correctedOutputJson is required (must include reason).
 */
export async function promoteDetailToTrainingAction(
    assessmentId: string,
    correctedOutputJson: SafetyLlmResponse
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!isValidSafetyLlmResponse(correctedOutputJson)) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const existingAssessment = await getSafetyAssessmentDetail(assessmentId);

        await promoteSafetyAssessmentToTrainingDataset({
            assessmentId,
            reviewerId: guard.userId,
            correctedOutputJson,
        });

        // Best-effort: mark review status for ETL bookkeeping
        let status: SafetyHumanReviewedStatus = 'corrected';
        if (existingAssessment?.aiRiskLevel === correctedOutputJson.risk_level) {
            if (correctedOutputJson.risk_level === 'Safe') status = 'verified_safe';
            else if (correctedOutputJson.risk_level === 'High_Risk') status = 'verified_risk';
        }

        await updateSafetyAssessmentHumanReviewedStatus(assessmentId, status, guard.userId);

        return actionSuccess();
    } catch (error) {
        console.error('[promoteDetailToTrainingAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
    }
}
