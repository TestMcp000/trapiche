/**
 * Blog Topics IO Module (Server-only)
 *
 * Public read operations for Blog Topics.
 * Uses anon client for public access without auth.
 * Follows ARCHITECTURE.md §3.4 IO module pattern.
 *
 * @see lib/types/blog-taxonomy.ts - Type definitions
 * @see lib/modules/blog/taxonomy-io.ts - Aggregator facade
 * @see lib/modules/blog/taxonomy-topics-admin-io.ts - Admin CRUD
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type {
    BlogTopic,
    BlogTopicWithCounts,
    BlogTopicWithGroup,
} from '@/lib/types/blog-taxonomy';

/**
 * Get all visible blog topics (is_visible = true)
 */
export async function getVisibleBlogTopics(): Promise<BlogTopic[]> {
    const supabase = createAnonClient();

    const { data, error } = await supabase
        .from('blog_topics')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[taxonomy-topics-io] getVisibleBlogTopics error:', error);
        return [];
    }

    return data ?? [];
}

/**
 * Get visible topics by group ID
 */
export async function getTopicsByGroupId(groupId: string): Promise<BlogTopic[]> {
    const supabase = createAnonClient();

    const { data, error } = await supabase
        .from('blog_topics')
        .select('*')
        .eq('group_id', groupId)
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[taxonomy-topics-io] getTopicsByGroupId error:', error);
        return [];
    }

    return data ?? [];
}

/**
 * Get a blog topic by slug
 */
export async function getBlogTopicBySlug(slug: string): Promise<BlogTopic | null> {
    const supabase = createAnonClient();

    const { data, error } = await supabase
        .from('blog_topics')
        .select('*')
        .eq('slug', slug)
        .eq('is_visible', true)
        .single();

    if (error) {
        if (error.code !== 'PGRST116') {
            console.error('[taxonomy-topics-io] getBlogTopicBySlug error:', error);
        }
        return null;
    }

    return data;
}

/**
 * Get a blog topic with its parent group
 */
export async function getBlogTopicWithGroup(topicSlug: string): Promise<BlogTopicWithGroup | null> {
    const supabase = createAnonClient();

    const { data: topic, error: topicError } = await supabase
        .from('blog_topics')
        .select('*')
        .eq('slug', topicSlug)
        .eq('is_visible', true)
        .single();

    if (topicError || !topic) {
        if (topicError?.code !== 'PGRST116') {
            console.error('[taxonomy-topics-io] getBlogTopicWithGroup topic error:', topicError);
        }
        return null;
    }

    const { data: group, error: groupError } = await supabase
        .from('blog_groups')
        .select('*')
        .eq('id', topic.group_id)
        .eq('is_visible', true)
        .single();

    if (groupError || !group) {
        if (groupError?.code !== 'PGRST116') {
            console.error('[taxonomy-topics-io] getBlogTopicWithGroup group error:', groupError);
        }
        // Return topic without group if group is hidden
        return { ...topic, group: null };
    }

    return { ...topic, group };
}

/**
 * Get visible blog topics with post counts
 */
export async function getBlogTopicsWithCounts(): Promise<BlogTopicWithCounts[]> {
    const supabase = createAnonClient();

    const { data: topics, error: topicsError } = await supabase
        .from('blog_topics')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (topicsError || !topics) {
        console.error('[taxonomy-topics-io] getBlogTopicsWithCounts error:', topicsError);
        return [];
    }

    const topicIds = topics.map((t) => t.id);

    if (topicIds.length === 0) {
        return topics.map((t) => ({ ...t, post_count: 0 }));
    }

    // Get post counts via post_topics join (only for published posts)
    const { data: postTopics } = await supabase
        .from('post_topics')
        .select('topic_id, posts!inner(is_published)')
        .in('topic_id', topicIds);

    const postCountByTopic = new Map<string, number>();
    for (const pt of postTopics ?? []) {
        // Only count published posts
        const posts = pt.posts as unknown as { is_published: boolean } | { is_published: boolean }[];
        const isPublished = Array.isArray(posts) ? posts[0]?.is_published : posts?.is_published;
        if (isPublished) {
            postCountByTopic.set(pt.topic_id, (postCountByTopic.get(pt.topic_id) ?? 0) + 1);
        }
    }

    return topics.map((topic) => ({
        ...topic,
        post_count: postCountByTopic.get(topic.id) ?? 0,
    }));
}
