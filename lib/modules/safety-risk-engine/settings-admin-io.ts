/**
 * Safety Risk Engine - Settings Admin IO Module
 *
 * Server-only module for admin safety settings read/write operations.
 *
 * @see doc/specs/completed/safety-risk-engine-spec.md §9.3
 * @see ARCHITECTURE.md §3.4 - IO module split
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import { createClient } from '@/lib/infrastructure/supabase/server';
import type { SafetyEngineSettings } from '@/lib/types/safety-risk-engine';

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
