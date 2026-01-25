/**
 * Gallery Hotspots IO
 *
 * Database operations for gallery hotspots (public reads).
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * Ordering rules (per PRD Implementation Contract):
 * - Auto mode (all sort_order NULL): ORDER BY y ASC, x ASC, created_at ASC
 * - Manual mode (all sort_order NOT NULL): ORDER BY sort_order ASC, created_at ASC
 *
 * @module lib/modules/gallery/gallery-hotspots-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md - Implementation Contract
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { GalleryHotspotPublic } from '@/lib/types/gallery';
import { validateOptionalExternalUrl } from '@/lib/validators/external-url';
import { sortHotspots } from './hotspots-sort';

/**
 * Convert a raw hotspot row into a public-safe DTO.
 *
 * Security hardening:
 * - read_more_url is treated as untrusted input and is validated against the
 *   external URL allowlist (https/mailto). Invalid URLs are dropped.
 */
export function toGalleryHotspotPublic(row: {
    id: string;
    x: number;
    y: number;
    media: string;
    preview: string | null;
    symbolism: string | null;
    description_md: string;
    read_more_url: string | null;
}): GalleryHotspotPublic {
    const urlResult = validateOptionalExternalUrl(row.read_more_url);
    const safeReadMoreUrl = urlResult.valid ? (urlResult.data ?? null) : null;

    return {
        id: row.id,
        x: row.x,
        y: row.y,
        media: row.media,
        preview: row.preview,
        symbolism: row.symbolism,
        description_md: row.description_md,
        read_more_url: safeReadMoreUrl,
    };
}

/**
 * Get visible hotspots for a gallery item
 *
 * Returns only visible hotspots for visible items (RLS enforced).
 * Ordering follows PRD contract: auto (y→x) or manual (sort_order).
 */
export async function getHotspotsByItemId(
    itemId: string
): Promise<GalleryHotspotPublic[]> {
    const supabase = createAnonClient();

    // First, check if item exists and is visible
    const { data: item } = await supabase
        .from('gallery_items')
        .select('id')
        .eq('id', itemId)
        .eq('is_visible', true)
        .single();

    if (!item) {
        return [];
    }

    // Fetch all visible hotspots for the item
    const { data: hotspots, error } = await supabase
        .from('gallery_hotspots')
        .select('id, x, y, media, preview, symbolism, description_md, read_more_url, sort_order, created_at')
        .eq('item_id', itemId)
        .eq('is_visible', true);

    if (error) {
        console.error('Error fetching gallery hotspots:', error);
        return [];
    }

    if (!hotspots || hotspots.length === 0) {
        return [];
    }

    // Sort using shared pure function
    const sorted = sortHotspots(hotspots);

    // Map to public DTO (exclude sort_order/created_at; sanitize external URLs)
    return sorted.map((h) => toGalleryHotspotPublic(h));
}
