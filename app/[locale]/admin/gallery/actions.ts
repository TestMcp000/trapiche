'use server';

/**
 * Gallery Admin Server Actions
 *
 * Server-side CRUD operations for gallery items, hotspots, and hero.
 * Uses server actions pattern for mutations with revalidation.
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import {
  saveGalleryItemAdmin,
  deleteGalleryItemAdmin,
  type GalleryItemDbPayload,
} from '@/lib/modules/gallery/admin-io';
import {
  getAdminHotspotsByItemId,
  getHotspotsMaxLimit,
  createHotspotAdmin,
  updateHotspotAdmin,
  deleteHotspotAdmin,
  reorderHotspotsAdmin,
} from '@/lib/modules/gallery/hotspots-admin-io';
import {
  getHeroPin,
  setHeroAdmin,
  clearHeroAdmin,
  type PinWithItem,
} from '@/lib/modules/gallery/pins-admin-io';
import {
  validateHotspotInput,
  validateReorderInput,
} from '@/lib/validators/gallery-hotspots';
import { isValidUUID } from '@/lib/validators/api-common';
import { isValidHotspotsMarkdown } from '@/lib/markdown/hotspots';
import type { GalleryHotspot, GalleryHotspotInput } from '@/lib/types/gallery';

// =============================================================================
// Gallery Item Actions
// =============================================================================

/**
 * Save (create or update) a gallery item
 */
export async function saveGalleryItemAction(
  itemId: string | null,
  payload: GalleryItemDbPayload,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await saveGalleryItemAdmin(itemId, payload);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Revalidate cache
    revalidateTag('gallery', { expire: 0 });
    revalidatePath(`/${locale}/admin/gallery`);
    revalidatePath(`/${locale}/gallery`);

    return { success: true };
  } catch (error) {
    console.error('Error saving gallery item:', error);
    return { success: false, error: '儲存作品失敗' };
  }
}

/**
 * Delete a gallery item
 */
export async function deleteGalleryItemAction(
  itemId: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await deleteGalleryItemAdmin(itemId);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    // Revalidate cache
    revalidateTag('gallery', { expire: 0 });
    revalidatePath(`/${locale}/admin/gallery`);
    revalidatePath(`/${locale}/gallery`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return { success: false, error: '刪除作品失敗' };
  }
}

// =============================================================================
// Hotspot Read Actions
// =============================================================================

/**
 * Get all hotspots for a gallery item (admin view, includes hidden)
 */
export async function getHotspotsAction(
  itemId: string
): Promise<{ data: GalleryHotspot[] } | { error: string }> {
  if (!isValidUUID(itemId)) {
    return { error: '無效的作品 ID' };
  }

  try {
    const hotspots = await getAdminHotspotsByItemId(itemId);
    return { data: hotspots };
  } catch (error) {
    console.error('Error fetching hotspots:', error);
    return { error: '讀取標記失敗' };
  }
}

/**
 * Get maximum hotspots limit from company_settings
 */
export async function getHotspotsMaxLimitAction(): Promise<number> {
  return getHotspotsMaxLimit();
}

// =============================================================================
// Hotspot Write Actions
// =============================================================================

/**
 * Create a new hotspot for a gallery item
 */
export async function createHotspotAction(
  itemId: string,
  input: GalleryHotspotInput,
  locale: string
): Promise<{ success: true; data: GalleryHotspot } | { error: string; errors?: Record<string, string> }> {
  // Validate item ID
  if (!isValidUUID(itemId)) {
    return { error: '無效的作品 ID' };
  }

  // Validate input
  const validation = validateHotspotInput(input);
  if (!validation.valid) {
    return {
      error: validation.error || '輸入驗證失敗',
      errors: validation.errors,
    };
  }

  // Validate markdown safety at save-time
  const isMarkdownValid = await isValidHotspotsMarkdown(validation.data!.description_md);
  if (!isMarkdownValid) {
    return {
      error: '內容在安全處理後為空',
      errors: { description_md: '內容在安全處理後為空，請輸入有效的文字內容' },
    };
  }

  try {
    const result = await createHotspotAdmin(itemId, validation.data!);

    if (!result.success) {
      return { error: result.error };
    }

    // Revalidate cache
    revalidateTag('gallery', { expire: 0 });
    revalidatePath(`/${locale}/admin/gallery`);

    return { success: true, data: result.data! };
  } catch (error) {
    console.error('Error creating hotspot:', error);
    return { error: '新增標記失敗' };
  }
}

/**
 * Update an existing hotspot
 */
export async function updateHotspotAction(
  hotspotId: string,
  input: Partial<GalleryHotspotInput>,
  locale: string
): Promise<{ success: true; data: GalleryHotspot } | { error: string; errors?: Record<string, string> }> {
  // Validate hotspot ID
  if (!isValidUUID(hotspotId)) {
    return { error: '無效的標記 ID' };
  }

  // For partial updates, validate only provided fields
  // Build a complete input object for validation
  const fullInput = {
    x: input.x ?? 0,
    y: input.y ?? 0,
    media: input.media ?? '',
    description_md: input.description_md ?? '',
    ...input,
  };

  // Only validate if all required fields are present
  if (input.x !== undefined || input.y !== undefined || input.media !== undefined || input.description_md !== undefined) {
    const validation = validateHotspotInput(fullInput);
    if (!validation.valid) {
      return {
        error: validation.error || '輸入驗證失敗',
        errors: validation.errors,
      };
    }
  }

  // Validate markdown safety at save-time if description_md is being updated
  if (input.description_md !== undefined) {
    const isMarkdownValid = await isValidHotspotsMarkdown(input.description_md);
    if (!isMarkdownValid) {
      return {
        error: '內容在安全處理後為空',
        errors: { description_md: '內容在安全處理後為空，請輸入有效的文字內容' },
      };
    }
  }

  try {
    const result = await updateHotspotAdmin(hotspotId, input);

    if (!result.success) {
      return { error: result.error };
    }

    // Revalidate cache
    revalidateTag('gallery', { expire: 0 });
    revalidatePath(`/${locale}/admin/gallery`);

    return { success: true, data: result.data! };
  } catch (error) {
    console.error('Error updating hotspot:', error);
    return { error: '更新標記失敗' };
  }
}

/**
 * Delete a hotspot
 */
export async function deleteHotspotAction(
  hotspotId: string,
  locale: string
): Promise<{ success: true } | { error: string }> {
  if (!isValidUUID(hotspotId)) {
    return { error: '無效的標記 ID' };
  }

  try {
    const result = await deleteHotspotAdmin(hotspotId);

    if (!result.success) {
      return { error: result.error };
    }

    // Revalidate cache
    revalidateTag('gallery', { expire: 0 });
    revalidatePath(`/${locale}/admin/gallery`);

    return { success: true };
  } catch (error) {
    console.error('Error deleting hotspot:', error);
    return { error: '刪除標記失敗' };
  }
}

/**
 * Reorder hotspots for a gallery item
 */
export async function reorderHotspotsAction(
  itemId: string,
  orderedIds: string[],
  locale: string
): Promise<{ success: true } | { error: string; errors?: Record<string, string> }> {
  // Validate reorder input
  const validation = validateReorderInput({ item_id: itemId, ordered_ids: orderedIds });
  if (!validation.valid) {
    return {
      error: validation.error || '排序驗證失敗',
      errors: validation.errors,
    };
  }

  try {
    const result = await reorderHotspotsAdmin(itemId, orderedIds);

    if (!result.success) {
      return { error: result.error };
    }

    // Revalidate cache
    revalidateTag('gallery', { expire: 0 });
    revalidatePath(`/${locale}/admin/gallery`);

    return { success: true };
  } catch (error) {
    console.error('Error reordering hotspots:', error);
    return { error: '排序失敗' };
  }
}

/**
 * Toggle hotspot visibility
 */
export async function toggleHotspotVisibilityAction(
  hotspotId: string,
  isVisible: boolean,
  locale: string
): Promise<{ success: true } | { error: string }> {
  if (!isValidUUID(hotspotId)) {
    return { error: '無效的標記 ID' };
  }

  try {
    const result = await updateHotspotAdmin(hotspotId, { is_visible: isVisible });

    if (!result.success) {
      return { error: result.error };
    }

    // Revalidate cache
    revalidateTag('gallery', { expire: 0 });
    revalidatePath(`/${locale}/admin/gallery`);

    return { success: true };
  } catch (error) {
    console.error('Error toggling hotspot visibility:', error);
    return { error: '切換顯示狀態失敗' };
  }
}

// =============================================================================
// Hero Actions
// =============================================================================

/**
 * Get current Home Hero item (if any)
 */
export async function getHeroAction(): Promise<{ data: PinWithItem | null } | { error: string }> {
  try {
    const hero = await getHeroPin();
    return { data: hero };
  } catch (error) {
    console.error('Error fetching hero:', error);
    return { error: '讀取主視覺失敗' };
  }
}

/**
 * Set a gallery item as the Home Hero
 */
export async function setHeroAction(
  itemId: string,
  locale: string
): Promise<{ success: true } | { error: string }> {
  if (!isValidUUID(itemId)) {
    return { error: '無效的作品 ID' };
  }

  try {
    const result = await setHeroAdmin(itemId);

    if (!('success' in result)) {
      return { error: result.error };
    }

    // Revalidate cache
    revalidateTag('gallery', { expire: 0 });
    revalidatePath(`/${locale}`); // Home page
    revalidatePath(`/${locale}/admin/gallery`);

    return { success: true };
  } catch (error) {
    console.error('Error setting hero:', error);
    return { error: '設定主視覺失敗' };
  }
}

/**
 * Clear the Home Hero selection
 */
export async function clearHeroAction(
  locale: string
): Promise<{ success: true } | { error: string }> {
  try {
    const result = await clearHeroAdmin();

    if (!('success' in result)) {
      return { error: result.error };
    }

    // Revalidate cache
    revalidateTag('gallery', { expire: 0 });
    revalidatePath(`/${locale}`); // Home page
    revalidatePath(`/${locale}/admin/gallery`);

    return { success: true };
  } catch (error) {
    console.error('Error clearing hero:', error);
    return { error: '取消主視覺失敗' };
  }
}

/**
 * Check if a specific item is the current hero
 */
export async function isItemHeroAction(itemId: string): Promise<boolean> {
  if (!isValidUUID(itemId)) {
    return false;
  }

  try {
    const hero = await getHeroPin();
    return hero?.item_id === itemId;
  } catch {
    return false;
  }
}
