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
import type {
    SafetyAssessmentDetail,
    SafetyHumanLabel,
    SafetyCorpusKind,
    SafetyHumanReviewedStatus,
    SafetyLlmResponse,
    SafetyTrainingDatasetRow,
} from '@/lib/types/safety-risk-engine';

async function checkAdmin() {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
        throw new Error(guard.errorCode);
    }
    return { id: guard.userId };
}

/**
 * Fetch safety assessment detail by comment ID.
 * Uses IO module to fetch page data, then retrieves assessment detail if available.
 */
export async function fetchAssessmentByCommentAction(
    commentId: string
): Promise<{ assessment: SafetyAssessmentDetail | null; comment: { content: string } | null; trainingActiveBatch: string | null }> {
    await checkAdmin();

    const pageData = await getSafetyDetailPageData(commentId);

    if (!pageData.latestAssessmentId) {
        return {
            assessment: null,
            comment: pageData.comment,
            trainingActiveBatch: pageData.trainingActiveBatch,
        };
    }

    const assessment = await getSafetyAssessmentDetail(pageData.latestAssessmentId);

    return {
        assessment,
        comment: pageData.comment,
        trainingActiveBatch: pageData.trainingActiveBatch,
    };
}

/**
 * Label a safety assessment.
 */
export async function labelDetailAssessmentAction(
    assessmentId: string,
    label: SafetyHumanLabel
): Promise<{ success: boolean }> {
    const user = await checkAdmin();
    const success = await labelSafetyAssessment(assessmentId, label, user.id);
    return { success };
}

/**
 * Approve comment from detail page.
 */
export async function approveDetailCommentAction(
    commentId: string
): Promise<{ success: boolean }> {
    await checkAdmin();
    const success = await approveSafetyComment(commentId);
    return { success };
}

/**
 * Reject comment from detail page.
 */
export async function rejectDetailCommentAction(
    commentId: string
): Promise<{ success: boolean }> {
    await checkAdmin();
    const success = await rejectSafetyComment(commentId);
    return { success };
}

/**
 * Promote text to corpus from detail page.
 */
export async function promoteDetailToCorpusAction(data: {
    text: string;
    label: string;
    kind: SafetyCorpusKind;
    activate?: boolean;
}): Promise<{ success: boolean; itemId?: string }> {
    const user = await checkAdmin();
    const itemId = await promoteToCorpus(data, user.id);
    return { success: !!itemId, itemId: itemId ?? undefined };
}

/**
 * Promote assessment to training dataset with corrected output JSON.
 *
 * IMPORTANT: correctedOutputJson is required (must include reason).
 */
export async function promoteDetailToTrainingAction(
    assessmentId: string,
    correctedOutputJson: SafetyLlmResponse
): Promise<{ success: boolean; dataset?: SafetyTrainingDatasetRow; error?: string }> {
    const user = await checkAdmin();

    try {
        const existingAssessment = await getSafetyAssessmentDetail(assessmentId);

        const dataset = await promoteSafetyAssessmentToTrainingDataset({
            assessmentId,
            reviewerId: user.id,
            correctedOutputJson,
        });

        // Best-effort: mark review status for ETL bookkeeping
        let status: SafetyHumanReviewedStatus = 'corrected';
        if (existingAssessment?.aiRiskLevel === correctedOutputJson.risk_level) {
            if (correctedOutputJson.risk_level === 'Safe') status = 'verified_safe';
            else if (correctedOutputJson.risk_level === 'High_Risk') status = 'verified_risk';
        }

        await updateSafetyAssessmentHumanReviewedStatus(assessmentId, status, user.id);

        return { success: true, dataset };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown promote error',
        };
    }
}
