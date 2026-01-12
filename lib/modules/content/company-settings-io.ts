/**
 * Company Settings IO
 *
 * Server-side data access for company settings.
 * Manages the company_settings table for site-wide configuration.
 *
 * @module lib/modules/content/company-settings-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { CompanySetting } from '@/lib/types/content';
import { recordHistory } from './history-io';

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
 */
export async function updateCompanySetting(
  key: string,
  value: string,
  userId?: string
): Promise<CompanySetting | null> {
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
    return null;
  }

  // Record history
  if (current && data) {
    await recordHistory('setting', data.id, 'update',
      { key, value: current.value },
      { key, value },
      userId
    );
  }

  return data;
}
