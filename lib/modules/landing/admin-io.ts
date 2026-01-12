/**
 * Landing Section Admin IO
 *
 * Server-side data access for admin landing section management.
 * Uses cookie-based server client for RLS enforcement.
 *
 * @module lib/modules/landing/admin-io
 * @see lib/infrastructure/supabase/server.ts
 */

import 'server-only';
import { createClient } from '@/lib/infrastructure/supabase/server';
import type { LandingSection, LandingSectionInput } from '@/lib/types/landing';
import { isCustomSection, isPresetSection } from '@/lib/modules/landing/validators';
import { CUSTOM_SECTION_KEYS, PRESET_SECTION_TYPES } from '@/lib/modules/landing/constants';

/**
 * Get all landing sections for admin list (includes hidden)
 */
export async function getAllLandingSections(): Promise<LandingSection[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('landing_sections')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Error fetching all landing sections:', error);
    return [];
  }

  return (data ?? []) as LandingSection[];
}

/**
 * Get a single landing section by section_key for editing
 */
export async function getLandingSectionByKey(
  sectionKey: string
): Promise<LandingSection | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('landing_sections')
    .select('*')
    .eq('section_key', sectionKey)
    .single();

  if (error || !data) {
    return null;
  }

  return data as LandingSection;
}

/**
 * Create a new custom landing section
 *
 * @throws Error if section_key is not a valid custom key
 * @throws Error if section_key already exists
 */
export async function createLandingSection(
  input: LandingSectionInput
): Promise<{ success: boolean; section?: LandingSection; error?: string }> {
  const supabase = await createClient();

  // Validate section_key is custom
  if (!input.section_key || !isCustomSection(input.section_key)) {
    return {
      success: false,
      error: 'Only custom sections (custom_1...custom_10) can be created',
    };
  }

  // Validate section_type
  if (!input.section_type) {
    return { success: false, error: 'section_type is required' };
  }

  const { data, error } = await supabase
    .from('landing_sections')
    .insert({
      section_key: input.section_key,
      section_type: input.section_type,
      sort_order: input.sort_order ?? 50, // Default to middle
      is_visible: input.is_visible ?? false, // Default to hidden
      title_en: input.title_en,
      title_zh: input.title_zh,
      subtitle_en: input.subtitle_en,
      subtitle_zh: input.subtitle_zh,
      content_en: input.content_en,
      content_zh: input.content_zh,
      gallery_category_id: input.gallery_category_id,
      gallery_surface: input.gallery_surface,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating landing section:', error);
    return { success: false, error: error.message };
  }

  return { success: true, section: data as LandingSection };
}

/**
 * Update an existing landing section
 *
 * Respects preset section restrictions:
 * - Preset sections cannot change section_key or section_type
 * - hero/contact cannot change is_visible
 */
export async function updateLandingSection(
  sectionKey: string,
  input: LandingSectionInput
): Promise<{ success: boolean; section?: LandingSection; error?: string }> {
  const supabase = await createClient();

  // Build update object
  const updateData: Record<string, unknown> = {};

  // For preset sections, restrict what can be updated
  if (isPresetSection(sectionKey)) {
    // Cannot change section_key or section_type for presets
    if (input.section_key !== undefined && input.section_key !== sectionKey) {
      return { success: false, error: 'Cannot change section_key for preset sections' };
    }

    const expectedType = PRESET_SECTION_TYPES[sectionKey as keyof typeof PRESET_SECTION_TYPES];
    if (input.section_type !== undefined && input.section_type !== expectedType) {
      return { success: false, error: 'Cannot change section_type for preset sections' };
    }

    // hero/contact cannot be hidden
    if ((sectionKey === 'hero' || sectionKey === 'contact') && input.is_visible === false) {
      return { success: false, error: `${sectionKey} section cannot be hidden` };
    }
  }

  // Apply allowed updates
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
  if (input.is_visible !== undefined) updateData.is_visible = input.is_visible;
  if (input.title_en !== undefined) updateData.title_en = input.title_en;
  if (input.title_zh !== undefined) updateData.title_zh = input.title_zh;
  if (input.subtitle_en !== undefined) updateData.subtitle_en = input.subtitle_en;
  if (input.subtitle_zh !== undefined) updateData.subtitle_zh = input.subtitle_zh;

  // Custom sections can update content and type
  if (isCustomSection(sectionKey)) {
    if (input.section_type !== undefined) updateData.section_type = input.section_type;
    if (input.content_en !== undefined) updateData.content_en = input.content_en;
    if (input.content_zh !== undefined) updateData.content_zh = input.content_zh;
  }

  // Gallery integration fields
  if (input.gallery_category_id !== undefined) updateData.gallery_category_id = input.gallery_category_id;
  if (input.gallery_surface !== undefined) updateData.gallery_surface = input.gallery_surface;

  // Add updated_at
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('landing_sections')
    .update(updateData)
    .eq('section_key', sectionKey)
    .select()
    .single();

  if (error) {
    console.error('Error updating landing section:', error);
    return { success: false, error: error.message };
  }

  return { success: true, section: data as LandingSection };
}

/**
 * Delete a custom landing section
 *
 * @throws Error if section_key is a preset section
 */
export async function deleteLandingSection(
  sectionKey: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Only custom sections can be deleted
  if (!isCustomSection(sectionKey)) {
    return {
      success: false,
      error: 'Only custom sections can be deleted',
    };
  }

  const { error } = await supabase
    .from('landing_sections')
    .delete()
    .eq('section_key', sectionKey);

  if (error) {
    console.error('Error deleting landing section:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get the next available custom section key
 *
 * Returns the first unused custom_N key, or null if all 10 are used.
 */
export async function getNextAvailableCustomKey(): Promise<string | null> {
  const sections = await getAllLandingSections();
  const usedKeys = new Set(sections.map((s) => s.section_key));

  for (const key of CUSTOM_SECTION_KEYS) {
    if (!usedKeys.has(key)) {
      return key;
    }
  }

  return null; // All custom slots are used
}

/**
 * Update sort orders for multiple sections (batch reorder)
 */
export async function updateSectionSortOrders(
  updates: Array<{ section_key: string; sort_order: number }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Use a transaction-like approach with multiple updates
  for (const update of updates) {
    const { error } = await supabase
      .from('landing_sections')
      .update({
        sort_order: update.sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('section_key', update.section_key);

    if (error) {
      console.error('Error updating section sort order:', error);
      return { success: false, error: error.message };
    }
  }

  return { success: true };
}
