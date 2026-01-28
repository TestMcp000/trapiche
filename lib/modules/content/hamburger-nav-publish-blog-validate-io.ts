/**
 * Hamburger Nav Publish - Blog Validation IO
 *
 * Database validation for blog-related nav targets (posts, categories, groups, topics, tags).
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

/**
 * Check if a blog group exists and is visible
 */
export async function validateBlogGroup(
    groupSlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('blog_groups')
        .select('id, is_visible')
        .eq('slug', groupSlug)
        .maybeSingle();

    if (error) {
        return {
            path,
            message: `Database error: ${error.message}`,
            targetType: 'blog_group',
            targetSlug: groupSlug,
        };
    }

    if (!data) {
        return {
            path,
            message: `Blog group "${groupSlug}" does not exist`,
            targetType: 'blog_group',
            targetSlug: groupSlug,
        };
    }

    if (!data.is_visible) {
        return {
            path,
            message: `Blog group "${groupSlug}" is not visible`,
            targetType: 'blog_group',
            targetSlug: groupSlug,
        };
    }

    return null;
}

/**
 * Check if a blog topic exists and is visible
 */
export async function validateBlogTopic(
    topicSlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('blog_topics')
        .select('id, is_visible')
        .eq('slug', topicSlug)
        .maybeSingle();

    if (error) {
        return {
            path,
            message: `Database error: ${error.message}`,
            targetType: 'blog_topic',
            targetSlug: topicSlug,
        };
    }

    if (!data) {
        return {
            path,
            message: `Blog topic "${topicSlug}" does not exist`,
            targetType: 'blog_topic',
            targetSlug: topicSlug,
        };
    }

    if (!data.is_visible) {
        return {
            path,
            message: `Blog topic "${topicSlug}" is not visible`,
            targetType: 'blog_topic',
            targetSlug: topicSlug,
        };
    }

    return null;
}

/**
 * Check if a blog tag exists
 */
export async function validateBlogTag(
    tagSlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('blog_tags')
        .select('id')
        .eq('slug', tagSlug)
        .maybeSingle();

    if (error) {
        return {
            path,
            message: `Database error: ${error.message}`,
            targetType: 'blog_tag',
            targetSlug: tagSlug,
        };
    }

    if (!data) {
        return {
            path,
            message: `Blog tag "${tagSlug}" does not exist`,
            targetType: 'blog_tag',
            targetSlug: tagSlug,
        };
    }

    return null;
}
