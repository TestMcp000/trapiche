'use server';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
    getSafetySettingsForAdmin,
    updateSafetySettings,
} from '@/lib/modules/safety-risk-engine/admin-io';
import type { SafetyEngineSettings } from '@/lib/types/safety-risk-engine';
import {
    ADMIN_ERROR_CODES,
    actionError,
    actionSuccess,
    type ActionResult,
} from '@/lib/types/action-result';

/**
 * Fetch safety settings.
 */
export async function fetchSafetySettingsAction(): Promise<ActionResult<SafetyEngineSettings | null>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const settings = await getSafetySettingsForAdmin();
        return actionSuccess(settings);
    } catch (error) {
        console.error('[fetchSafetySettingsAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update safety settings.
 */
export async function updateSafetySettingsAction(
    settings: Partial<{
        isEnabled: boolean;
        modelId: string;
        timeoutMs: number;
        riskThreshold: number;
        trainingActiveBatch: string;
        heldMessage: string;
        rejectedMessage: string;
    }>
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        const success = await updateSafetySettings(settings);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        return actionSuccess();
    } catch (error) {
        console.error('[updateSafetySettingsAction] Failed:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}
