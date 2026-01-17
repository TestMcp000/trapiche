/**
 * Safety Risk Engine - Settings IO Module
 *
 * Server-only module for reading safety settings from database.
 * Provides default values when settings are null or missing.
 *
 * @see doc/specs/proposed/safety-risk-engine-spec.md §9.2
 * @see ARCHITECTURE.md §3.13 - IO boundaries
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { SafetyEngineSettings } from '@/lib/types/safety-risk-engine';

// =============================================================================
// Default Settings
// =============================================================================

/**
 * Default safety engine settings.
 * Used when database values are null or settings row is missing.
 * Matches the seed defaults in 19_safety_risk_engine.sql.
 */
const DEFAULT_SETTINGS: SafetyEngineSettings = {
    isEnabled: false,
    modelId: 'gemini-1.5-flash',
    timeoutMs: 1500,
    riskThreshold: 0.70,
    trainingActiveBatch: '2026-01_cold_start',
    heldMessage: 'Your comment is being reviewed.',
    rejectedMessage: 'Your comment could not be posted.',
    layer1Blocklist: [],
};

// =============================================================================
// Settings IO
// =============================================================================

/**
 * Database row structure from safety_settings table.
 */
interface SafetySettingsRow {
    id: number;
    is_enabled: boolean | null;
    model_id: string | null;
    timeout_ms: number | null;
    risk_threshold: number | null;
    training_active_batch: string | null;
    held_message: string | null;
    rejected_message: string | null;
    layer1_blocklist: string[] | null;
}

/**
 * Parse blocklist from database JSONB.
 * Handles various malformed data gracefully.
 */
function parseBlocklist(raw: unknown): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) {
        return raw.filter((item): item is string => typeof item === 'string');
    }
    return [];
}

/**
 * Get safety engine settings from database.
 *
 * Reads from safety_settings singleton (id=1) and applies
 * fallback defaults for any null fields.
 *
 * @returns SafetyEngineSettings with guaranteed non-null values
 *
 * @example
 * ```typescript
 * const settings = await getSafetySettings();
 * if (settings.isEnabled) {
 *   // Run safety check
 * }
 * ```
 */
export async function getSafetySettings(): Promise<SafetyEngineSettings> {
    const supabase = createAdminClient();

    const { data, error } = await supabase
        .from('safety_settings')
        .select('*')
        .eq('id', 1)
        .single();

    if (error || !data) {
        // Settings row doesn't exist, return all defaults
        console.warn('[getSafetySettings] Settings not found, using defaults:', error?.message);
        return { ...DEFAULT_SETTINGS };
    }

    const row = data as SafetySettingsRow;

    // Merge with defaults for any null fields
    return {
        isEnabled: row.is_enabled ?? DEFAULT_SETTINGS.isEnabled,
        modelId: row.model_id ?? DEFAULT_SETTINGS.modelId,
        timeoutMs: row.timeout_ms ?? DEFAULT_SETTINGS.timeoutMs,
        riskThreshold: Number(row.risk_threshold) || DEFAULT_SETTINGS.riskThreshold,
        trainingActiveBatch: row.training_active_batch ?? DEFAULT_SETTINGS.trainingActiveBatch,
        heldMessage: row.held_message ?? DEFAULT_SETTINGS.heldMessage,
        rejectedMessage: row.rejected_message ?? DEFAULT_SETTINGS.rejectedMessage,
        layer1Blocklist: parseBlocklist(row.layer1_blocklist),
    };
}

/**
 * Check if safety engine is enabled.
 *
 * Convenience function for quick checks without loading full settings.
 *
 * @returns True if safety engine is enabled
 */
export async function isSafetyEngineEnabled(): Promise<boolean> {
    const settings = await getSafetySettings();
    return settings.isEnabled;
}
