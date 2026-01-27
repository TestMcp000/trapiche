/**
 * Blog Tags IO Module (Server-only)
 *
 * Public read operations for Blog Tags.
 * Uses anon client for public access without auth.
 * Follows ARCHITECTURE.md §3.4 IO module pattern.
 *
 * @see lib/types/blog-taxonomy.ts - Type definitions
 * @see lib/modules/blog/taxonomy-io.ts - Aggregator facade
 * @see lib/modules/blog/taxonomy-tags-admin-io.ts - Admin CRUD
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { BlogTag, BlogTagWithCounts } from '@/lib/types/blog-taxonomy';

/**
 * Get all blog tags
 */
export async function getAllBlogTags(): Promise<BlogTag[]> {
    const supabase = createAnonClient();

    const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name_zh', { ascending: true });

    if (error) {
        console.error('[taxonomy-tags-io] getAllBlogTags error:', error);
        return [];
    }

    return data ?? [];
}

/**
 * Get a blog tag by slug
 */
export async function getBlogTagBySlug(slug: string): Promise<BlogTag | null> {
    const supabase = createAnonClient();

    const { data, error } = await supabase
        .from('blog_tags')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error('[taxonomy-tags-io] getBlogTagBySlug error:', error);
        }
        return null;
    }

    return data;
}

/**
 * Get all blog tags with post counts (only counting published posts)
 */
export async function getBlogTagsWithCounts(): Promise<BlogTagWithCounts[]> {
    const supabase = createAnonClient();

    const { data: tags, error: tagsError } = await supabase
        .from('blog_tags')
        .select('*')
        .order('name_zh', { ascending: true });

    if (tagsError || !tags) {
        console.error('[taxonomy-tags-io] getBlogTagsWithCounts error:', tagsError);
        return [];
    }

    const tagIds = tags.map((t) => t.id);

    if (tagIds.length === 0) {
        return tags.map((t) => ({ ...t, post_count: 0 }));
    }

    // Get post counts via post_tags join (only for published posts)
    const { data: postTags } = await supabase
        .from('post_tags')
        .select('tag_id, posts!inner(is_published)')
        .in('tag_id', tagIds);

    const postCountByTag = new Map<string, number>();
    for (const pt of postTags ?? []) {
        // Only count published posts
        const posts = pt.posts as unknown as { is_published: boolean } | { is_published: boolean }[];
        const isPublished = Array.isArray(posts) ? posts[0]?.is_published : posts?.is_published;
        if (isPublished) {
            postCountByTag.set(pt.tag_id, (postCountByTag.get(pt.tag_id) ?? 0) + 1);
        }
    }

    return tags.map((tag) => ({
        ...tag,
        post_count: postCountByTag.get(tag.id) ?? 0,
    }));
}
