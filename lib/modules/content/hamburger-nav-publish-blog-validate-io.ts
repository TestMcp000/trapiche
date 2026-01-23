/**
 * Hamburger Nav Publish - Blog Validation IO
 *
 * Database validation for blog-related nav targets (posts and categories).
 *
 * @module lib/modules/content/hamburger-nav-publish-blog-validate-io
 * @see lib/modules/content/hamburger-nav-publish-io.ts (orchestrator)
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { NavDeepValidationError } from '@/lib/types/hamburger-nav';

/**
 * Check if a blog post exists and is public
 */
export async function validateBlogPost(
    postSlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('posts')
        .select('id, visibility')
        .eq('slug', postSlug)
        .maybeSingle();

    if (error) {
        return {
            path,
            message: `Database error: ${error.message}`,
            targetType: 'blog_post',
            targetSlug: postSlug,
        };
    }

    if (!data) {
        return {
            path,
            message: `Blog post "${postSlug}" does not exist`,
            targetType: 'blog_post',
            targetSlug: postSlug,
        };
    }

    if (data.visibility !== 'public') {
        return {
            path,
            message: `Blog post "${postSlug}" is not public (visibility: ${data.visibility})`,
            targetType: 'blog_post',
            targetSlug: postSlug,
        };
    }

    return null;
}

/**
 * Check if a blog category exists
 */
export async function validateBlogCategory(
    categorySlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('categories')
        .select('id')
        .eq('slug', categorySlug)
        .maybeSingle();

    if (error) {
        return {
            path,
            message: `Database error: ${error.message}`,
            targetType: 'blog_category',
            targetSlug: categorySlug,
        };
    }

    if (!data) {
        return {
            path,
            message: `Blog category "${categorySlug}" does not exist`,
            targetType: 'blog_category',
            targetSlug: categorySlug,
        };
    }

    return null;
}
