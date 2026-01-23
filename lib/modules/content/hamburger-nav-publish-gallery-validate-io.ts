/**
 * Hamburger Nav Publish - Gallery Validation IO
 *
 * Database validation for gallery-related nav targets (items and categories).
 *
 * @module lib/modules/content/hamburger-nav-publish-gallery-validate-io
 * @see lib/modules/content/hamburger-nav-publish-io.ts (orchestrator)
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { NavDeepValidationError } from '@/lib/types/hamburger-nav';

/**
 * Check if a gallery item exists and is visible
 */
export async function validateGalleryItem(
    categorySlug: string,
    itemSlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data: category, error: catError } = await supabase
        .from('gallery_categories')
        .select('id, is_visible')
        .eq('slug', categorySlug)
        .maybeSingle();

    if (catError) {
        return {
            path,
            message: `Database error: ${catError.message}`,
            targetType: 'gallery_item',
            targetSlug: `${categorySlug}/${itemSlug}`,
        };
    }

    if (!category) {
        return {
            path,
            message: `Gallery category "${categorySlug}" does not exist`,
            targetType: 'gallery_item',
            targetSlug: `${categorySlug}/${itemSlug}`,
        };
    }

    if (!category.is_visible) {
        return {
            path,
            message: `Gallery category "${categorySlug}" is not visible`,
            targetType: 'gallery_item',
            targetSlug: `${categorySlug}/${itemSlug}`,
        };
    }

    const { data: item, error: itemError } = await supabase
        .from('gallery_items')
        .select('id, is_visible')
        .eq('slug', itemSlug)
        .eq('category_id', category.id)
        .maybeSingle();

    if (itemError) {
        return {
            path,
            message: `Database error: ${itemError.message}`,
            targetType: 'gallery_item',
            targetSlug: `${categorySlug}/${itemSlug}`,
        };
    }

    if (!item) {
        return {
            path,
            message: `Gallery item "${itemSlug}" does not exist in category "${categorySlug}"`,
            targetType: 'gallery_item',
            targetSlug: `${categorySlug}/${itemSlug}`,
        };
    }

    if (!item.is_visible) {
        return {
            path,
            message: `Gallery item "${itemSlug}" is not visible`,
            targetType: 'gallery_item',
            targetSlug: `${categorySlug}/${itemSlug}`,
        };
    }

    return null;
}

/**
 * Check if a gallery category exists and is visible
 */
export async function validateGalleryCategory(
    categorySlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('gallery_categories')
        .select('id, is_visible')
        .eq('slug', categorySlug)
        .maybeSingle();

    if (error) {
        return {
            path,
            message: `Database error: ${error.message}`,
            targetType: 'gallery_category',
            targetSlug: categorySlug,
        };
    }

    if (!data) {
        return {
            path,
            message: `Gallery category "${categorySlug}" does not exist`,
            targetType: 'gallery_category',
            targetSlug: categorySlug,
        };
    }

    if (!data.is_visible) {
        return {
            path,
            message: `Gallery category "${categorySlug}" is not visible`,
            targetType: 'gallery_category',
            targetSlug: categorySlug,
        };
    }

    return null;
}
