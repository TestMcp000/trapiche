/**
 * Company Settings IO
 *
 * Server-side data access for company settings.
 * Manages the company_settings table for site-wide configuration.
 *
 * @module lib/modules/content/company-settings-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-11.1)
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { CompanySetting } from '@/lib/types/content';
import { validateExternalUrl } from '@/lib/validators/external-url';
import { recordHistory } from './history-io';

// =============================================================================
// Constants
// =============================================================================

/**
 * Settings keys that require URL validation
 */
const URL_VALIDATED_KEYS = ['home_event_cta_url'] as const;

// =============================================================================
// Types
// =============================================================================

/**
 * Result type for update operations
 */
export interface UpdateSettingResult {
  success: boolean;
  data?: CompanySetting;
  error?: string;
}

// =============================================================================
// Company Settings Read Operations
// =============================================================================

/**
 * Get all company settings
 */
export async function getCompanySettings(): Promise<CompanySetting[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .order('category')
    .order('key');

  if (error) {
    console.error('Error fetching company settings:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a single setting by key
 */
export async function getCompanySetting(key: string): Promise<CompanySetting | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('key', key)
    .single();

  if (error) {
    console.error('Error fetching company setting:', error);
    return null;
  }

  return data;
}

// =============================================================================
// Company Settings Write Operations
// =============================================================================

/**
 * Update a company setting
 *
 * For URL-validated keys (e.g., home_event_cta_url), validates the URL
 * before saving. Returns error result if validation fails.
 *
 * @param key - Setting key
 * @param value - New value
 * @param userId - Optional user ID for history
 * @returns Result with success status and data or error
 */
export async function updateCompanySetting(
  key: string,
  value: string,
  userId?: string
): Promise<UpdateSettingResult> {
  // Validate URL for keys that require it
  if (URL_VALIDATED_KEYS.includes(key as typeof URL_VALIDATED_KEYS[number])) {
    // Allow empty value (clears the setting)
    if (value.trim() !== '') {
      const urlResult = validateExternalUrl(value);
      if (!urlResult.valid) {
        return {
          success: false,
          error: urlResult.error,
        };
      }
    }
  }

  const supabase = await createClient();

  const current = await getCompanySetting(key);

  const { data, error } = await supabase
    .from('company_settings')
    .update({
      value,
      updated_at: new Date().toISOString()
    })
    .eq('key', key)
    .select()
    .single();

  if (error) {
    console.error('Error updating company setting:', error);
    return {
      success: false,
      error: '儲存設定時發生錯誤',
    };
  }

  // Record history
  if (current && data) {
    await recordHistory('setting', data.id, 'update',
      { key, value: current.value },
      { key, value },
      userId
    );
  }

  return {
    success: true,
    data,
  };
}
