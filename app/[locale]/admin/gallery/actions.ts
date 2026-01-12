'use server';

/**
 * Gallery Admin Server Actions
 *
 * Server-side CRUD operations for gallery items.
 * Uses server actions pattern for mutations with revalidation.
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import {
  saveGalleryItemAdmin,
  deleteGalleryItemAdmin,
  type GalleryItemDbPayload,
} from '@/lib/modules/gallery/admin-io';

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
    return { success: false, error: 'Failed to save gallery item' };
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
    return { success: false, error: 'Failed to delete gallery item' };
  }
}
