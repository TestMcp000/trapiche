'use server';

/**
 * Landing Section Admin Actions
 *
 * Server actions for landing section management with cache revalidation.
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import {
  createLandingSection as createSection,
  updateLandingSection as updateSection,
  deleteLandingSection as deleteSection,
  getNextAvailableCustomKey,
  updateSectionSortOrders,
} from '@/lib/modules/landing/admin-io';
import type { LandingSectionInput, LandingSectionType } from '@/lib/types/landing';
import { LOCALES } from '@/lib/i18n/locales';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';

/**
 * Revalidate all landing-related caches
 */
function revalidateLandingCaches() {
  // Invalidate cached landing section data
  revalidateTag('landing-sections', { expire: 0 });

  // Public pages
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}`);
  }
  revalidatePath('/sitemap.xml');

  // Admin pages
  for (const locale of LOCALES) {
    revalidatePath(`/${locale}/admin/landing`);
  }
}

/**
 * Toggle section visibility
 */
export async function toggleSectionVisibility(
  sectionKey: string,
  isVisible: boolean
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!sectionKey) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await updateSection(sectionKey, { is_visible: isVisible });
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  revalidateLandingCaches();
  return actionSuccess();
}

/**
 * Update section sort order
 */
export async function updateSectionOrder(
  sectionKey: string,
  sortOrder: number
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!sectionKey) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await updateSection(sectionKey, { sort_order: sortOrder });
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  revalidateLandingCaches();
  return actionSuccess();
}

/**
 * Batch update section sort orders
 */
export async function batchUpdateSortOrders(
  updates: Array<{ section_key: string; sort_order: number }>
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!Array.isArray(updates) || updates.length === 0) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await updateSectionSortOrders(updates);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  revalidateLandingCaches();
  return actionSuccess();
}

/**
 * Create a new custom section
 */
export async function createCustomSection(input: {
  section_type: LandingSectionType;
  title_zh?: string;
}): Promise<ActionResult<{ sectionKey: string }>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  // Get next available custom key
  const nextKey = await getNextAvailableCustomKey();
  
  if (!nextKey) {
    return actionError(ADMIN_ERROR_CODES.LIMIT_REACHED);
  }
  
  const sectionInput: LandingSectionInput = {
    section_key: nextKey,
    section_type: input.section_type,
    // Let admin set title later; avoid hard-coded default strings.
    title_en: input.title_zh,
    title_zh: input.title_zh,
    is_visible: false, // Start hidden
  };
  
  const result = await createSection(sectionInput);
  
  if (result.success) {
    revalidateLandingCaches();
    return actionSuccess({ sectionKey: nextKey });
  }
  
  return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
}

/**
 * Update a section
 */
export async function updateSectionAction(
  sectionKey: string,
  input: LandingSectionInput
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!sectionKey) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await updateSection(sectionKey, input);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  revalidateLandingCaches();
  return actionSuccess();
}

/**
 * Delete a custom section
 */
export async function deleteSectionAction(
  sectionKey: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!sectionKey) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await deleteSection(sectionKey);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
  }

  revalidateLandingCaches();
  return actionSuccess();
}
