/**
 * Preprocessing Config Admin IO (Write)
 * @see doc/specs/completed/DATA_PREPROCESSING.md Phase 7
 * @see uiux_refactor.md §6.4
 *
 * Server-only module for updating preprocessing configuration.
 * Owner-only operations with audit logging.
 */
import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import {
  type PreprocessingConfig,
  validatePreprocessingConfig,
} from '@/lib/validators/preprocessing-config';
import { isOwner } from '@/lib/modules/auth';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateConfigResult {
  success: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// IO Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Update preprocessing config (Owner-only).
 * Validates config before writing to DB.
 */
export async function updatePreprocessingConfig(
  config: PreprocessingConfig
): Promise<UpdateConfigResult> {
  try {
    const supabase = await createClient();

    // Owner-only gate
    const owner = await isOwner(supabase);
    if (!owner) {
      return { success: false, error: 'Unauthorized. Owner access required.' };
    }

    // Validate config
    const validation = validatePreprocessingConfig(config);
    if (!validation.success) {
      return { success: false, error: `Invalid config: ${validation.error}` };
    }

    // Get user ID for updated_by
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id ?? null;

    // Update site_config
    const { error } = await supabase
      .from('site_config')
      .update({
        preprocessing_config: config,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      console.error('[updatePreprocessingConfig] DB error:', error);
      return { success: false, error: error.message };
    }

    // Write audit log
    try {
      await supabase.from('audit_logs').insert({
        action: 'update_preprocessing_config',
        entity_type: 'site_config',
        entity_id: '1',
        performed_by: userId,
        details: { config },
      });
    } catch (auditError) {
      // Non-fatal: log but don't fail the operation
      console.warn('[updatePreprocessingConfig] Audit log failed:', auditError);
    }

    return { success: true };
  } catch (error) {
    console.error('[updatePreprocessingConfig] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
