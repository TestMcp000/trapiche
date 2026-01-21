/**
 * Gallery Hotspots Admin IO
 *
 * Admin-only hotspots management operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * Ordering rules (per PRD Implementation Contract):
 * - Auto mode: all sort_order NULL
 * - Manual mode: all sort_order NOT NULL (0..n-1)
 * - New hotspot in manual mode: append (max(sort_order) + 1)
 * - Reorder: batch update sort_order = 0..n-1
 *
 * @module lib/modules/gallery/hotspots-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md - Implementation Contract
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { GalleryHotspot, GalleryHotspotInput } from '@/lib/types/gallery';
import { sortHotspots } from './hotspots-sort';

// =============================================================================
// Types
// =============================================================================

export interface AdminHotspotResult {
    success: true;
    data?: GalleryHotspot;
}

export interface AdminHotspotError {
    success: false;
    error: string;
}

export type AdminHotspotOperationResult = AdminHotspotResult | AdminHotspotError;

// =============================================================================
// Read Operations
// =============================================================================

/**
 * Get all hotspots for an item (admin view, includes hidden)
 * Uses same ordering logic as public reads
 */
export async function getAdminHotspotsByItemId(
    itemId: string
): Promise<GalleryHotspot[]> {
    const supabase = await createClient();

    const { data: hotspots, error } = await supabase
        .from('gallery_hotspots')
        .select('*')
        .eq('item_id', itemId);

    if (error) {
        console.error('Error fetching admin hotspots:', error);
        return [];
    }

    if (!hotspots || hotspots.length === 0) {
        return [];
    }

    // Sort using shared pure function
    return sortHotspots(hotspots);
}

/**
 * Get hotspots max limit from company_settings
 * Returns default 12 if not configured
 */
export async function getHotspotsMaxLimit(): Promise<number> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('company_settings')
        .select('value')
        .eq('key', 'gallery_hotspots_max')
        .single();

    if (error || !data) {
        return 12; // Default limit
    }

    const parsed = parseInt(data.value, 10);
    return isNaN(parsed) ? 12 : parsed;
}

// =============================================================================
// Write Operations
// =============================================================================

/**
 * Create a new hotspot for an item
 * In manual mode, appends to the end (max sort_order + 1)
 */
export async function createHotspotAdmin(
    itemId: string,
    input: GalleryHotspotInput
): Promise<AdminHotspotOperationResult> {
    const supabase = await createClient();

    // Check current hotspots to determine mode and limit
    const { data: existing } = await supabase
        .from('gallery_hotspots')
        .select('sort_order')
        .eq('item_id', itemId);

    // Check limit
    const maxLimit = await getHotspotsMaxLimit();
    if (existing && existing.length >= maxLimit) {
        return { success: false, error: `已達上限 ${maxLimit} 個標記點` };
    }

    // Determine sort_order for new hotspot
    let newSortOrder: number | null = null;
    if (existing && existing.length > 0) {
        const hasManualOrder = existing.every((h) => h.sort_order !== null);
        if (hasManualOrder) {
            // Manual mode: append to end
            const maxOrder = Math.max(...existing.map((h) => h.sort_order ?? 0));
            newSortOrder = maxOrder + 1;
        }
        // Auto mode: sort_order stays null
    }

    const { data, error } = await supabase
        .from('gallery_hotspots')
        .insert({
            item_id: itemId,
            x: input.x,
            y: input.y,
            media: input.media,
            preview: input.preview ?? null,
            symbolism: input.symbolism ?? null,
            description_md: input.description_md,
            read_more_url: input.read_more_url ?? null,
            sort_order: newSortOrder,
            is_visible: input.is_visible ?? true,
        })
        .select()
        .single();

    if (error) {
        console.error('Error creating hotspot:', error);
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

/**
 * Update an existing hotspot
 * Does not modify sort_order (use reorderHotspotsAdmin for that)
 */
export async function updateHotspotAdmin(
    hotspotId: string,
    input: Partial<GalleryHotspotInput>
): Promise<AdminHotspotOperationResult> {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {};

    if (input.x !== undefined) updateData.x = input.x;
    if (input.y !== undefined) updateData.y = input.y;
    if (input.media !== undefined) updateData.media = input.media;
    if (input.preview !== undefined) updateData.preview = input.preview;
    if (input.symbolism !== undefined) updateData.symbolism = input.symbolism;
    if (input.description_md !== undefined) updateData.description_md = input.description_md;
    if (input.read_more_url !== undefined) updateData.read_more_url = input.read_more_url;
    if (input.is_visible !== undefined) updateData.is_visible = input.is_visible;

    if (Object.keys(updateData).length === 0) {
        return { success: false, error: '沒有要更新的欄位' };
    }

    const { data, error } = await supabase
        .from('gallery_hotspots')
        .update(updateData)
        .eq('id', hotspotId)
        .select()
        .single();

    if (error) {
        console.error('Error updating hotspot:', error);
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

/**
 * Delete a hotspot
 */
export async function deleteHotspotAdmin(
    hotspotId: string
): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('gallery_hotspots')
        .delete()
        .eq('id', hotspotId);

    if (error) {
        console.error('Error deleting hotspot:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Reorder hotspots for an item
 * Sets sort_order = 0..n-1 based on ordered_ids
 * This converts the item from auto mode to manual mode
 */
export async function reorderHotspotsAdmin(
    itemId: string,
    orderedIds: string[]
): Promise<{ success: true } | { success: false; error: string }> {
    const supabase = await createClient();

    // Verify all IDs belong to the item
    const { data: existing } = await supabase
        .from('gallery_hotspots')
        .select('id')
        .eq('item_id', itemId);

    if (!existing) {
        return { success: false, error: '找不到標記點' };
    }

    const existingIds = new Set(existing.map((h) => h.id));
    const orderedSet = new Set(orderedIds);

    // Validate completeness: orderedIds must contain exactly all existing IDs
    // Check for duplicates (orderedIds.length !== orderedSet.size)
    if (orderedIds.length !== orderedSet.size) {
        return { success: false, error: '排序清單包含重複的標記點 ID' };
    }

    // Check for missing IDs
    if (orderedSet.size !== existingIds.size) {
        return { success: false, error: '排序清單必須包含所有標記點' };
    }

    // Check for invalid IDs (not in existing)
    const invalidIds = orderedIds.filter((id) => !existingIds.has(id));
    if (invalidIds.length > 0) {
        return { success: false, error: `無效的標記點 ID: ${invalidIds.slice(0, 3).join(', ')}` };
    }

    // Batch update sort_order
    const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
    }));

    // Use upsert to batch update
    const { error } = await supabase
        .from('gallery_hotspots')
        .upsert(updates, { onConflict: 'id' });

    if (error) {
        console.error('Error reordering hotspots:', error);
        return { success: false, error: error.message };
    }

    return { success: true };
}
