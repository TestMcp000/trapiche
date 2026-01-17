'use server';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
    getSafetySettingsForAdmin,
    updateSafetySettings,
} from '@/lib/modules/safety-risk-engine/admin-io';
import type { SafetyEngineSettings } from '@/lib/types/safety-risk-engine';

async function checkAdmin() {
    const supabase = await createClient();
    const guard = await requireSiteAdmin(supabase);
    if (!guard.ok) {
        throw new Error(guard.errorCode);
    }
    return { id: guard.userId };
}

/**
 * Fetch safety settings.
 */
export async function fetchSafetySettingsAction(): Promise<SafetyEngineSettings | null> {
    await checkAdmin();
    return getSafetySettingsForAdmin();
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
): Promise<{ success: boolean }> {
    await checkAdmin();
    const success = await updateSafetySettings(settings);
    return { success };
}
