/**
 * Blog Topics Admin IO Module (Server-only)
 *
 * Admin CRUD operations for Blog Topics.
 * Follows ARCHITECTURE.md §3.4 IO module pattern.
 *
 * @see lib/types/blog-taxonomy.ts - Type definitions
 * @see lib/modules/blog/taxonomy-admin-io.ts - Facade
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type {
  BlogTopic,
  BlogTopicInput,
  BlogTopicWithCounts,
} from '@/lib/types/blog-taxonomy';

/**
 * Get all blog topics (including hidden) for admin management
 */
export async function getAllBlogTopicsAdmin(): Promise<BlogTopicWithCounts[]> {
  const supabase = await createClient();

  const { data: topics, error: topicsError } = await supabase
    .from('blog_topics')
    .select('*')
    .order('sort_order', { ascending: true });

  if (topicsError || !topics) {
    console.error('[taxonomy-topics-io] getAllBlogTopicsAdmin error:', topicsError);
    return [];
  }

  // Get post counts via post_topics join
  const { data: postTopics } = await supabase.from('post_topics').select('topic_id');

  const postCountByTopic = new Map<string, number>();
  for (const pt of postTopics ?? []) {
    postCountByTopic.set(pt.topic_id, (postCountByTopic.get(pt.topic_id) ?? 0) + 1);
  }

  return topics.map((topic) => ({
    ...topic,
    post_count: postCountByTopic.get(topic.id) ?? 0,
  }));
}

/**
 * Get topics by group ID (admin, including hidden)
 */
export async function getTopicsByGroupIdAdmin(groupId: string): Promise<BlogTopicWithCounts[]> {
  const supabase = await createClient();

  const { data: topics, error: topicsError } = await supabase
    .from('blog_topics')
    .select('*')
    .eq('group_id', groupId)
    .order('sort_order', { ascending: true });

  if (topicsError || !topics) {
    console.error('[taxonomy-topics-io] getTopicsByGroupIdAdmin error:', topicsError);
    return [];
  }

  const topicIds = topics.map((t) => t.id);

  if (topicIds.length === 0) {
    return topics.map((t) => ({ ...t, post_count: 0 }));
  }

  const { data: postTopics } = await supabase
    .from('post_topics')
    .select('topic_id')
    .in('topic_id', topicIds);

  const postCountByTopic = new Map<string, number>();
  for (const pt of postTopics ?? []) {
    postCountByTopic.set(pt.topic_id, (postCountByTopic.get(pt.topic_id) ?? 0) + 1);
  }

  return topics.map((topic) => ({
    ...topic,
    post_count: postCountByTopic.get(topic.id) ?? 0,
  }));
}

/**
 * Get a single blog topic by ID (admin)
 */
export async function getBlogTopicByIdAdmin(id: string): Promise<BlogTopic | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_topics')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[taxonomy-topics-io] getBlogTopicByIdAdmin error:', error);
    }
    return null;
  }

  return data;
}

/**
 * Create a new blog topic
 */
export async function createBlogTopic(input: BlogTopicInput): Promise<BlogTopic | null> {
  const supabase = await createClient();

  // Get max sort_order for new topic within group
  const { data: maxOrderResult } = await supabase
    .from('blog_topics')
    .select('sort_order')
    .eq('group_id', input.group_id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrderResult?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('blog_topics')
    .insert({
      group_id: input.group_id,
      slug: input.slug,
      name_zh: input.name_zh,
      sort_order: input.sort_order ?? nextOrder,
      is_visible: input.is_visible ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('[taxonomy-topics-io] createBlogTopic error:', error);
    return null;
  }

  return data;
}

/**
 * Update a blog topic
 */
export async function updateBlogTopic(
  id: string,
  input: Partial<BlogTopicInput>
): Promise<BlogTopic | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_topics')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[taxonomy-topics-io] updateBlogTopic error:', error);
    return null;
  }

  return data;
}

/**
 * Delete a blog topic
 */
export async function deleteBlogTopic(id: string): Promise<boolean> {
  const supabase = await createClient();

  // First delete post_topics relations
  await supabase.from('post_topics').delete().eq('topic_id', id);

  const { error } = await supabase.from('blog_topics').delete().eq('id', id);

  if (error) {
    console.error('[taxonomy-topics-io] deleteBlogTopic error:', error);
    return false;
  }

  return true;
}

/**
 * Reorder topics within a group
 */
export async function reorderBlogTopics(orderedIds: string[]): Promise<boolean> {
  const supabase = await createClient();

  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from('blog_topics')
      .update({ sort_order: i + 1, updated_at: new Date().toISOString() })
      .eq('id', orderedIds[i]);

    if (error) {
      console.error('[taxonomy-topics-io] reorderBlogTopics error:', error);
      return false;
    }
  }

  return true;
}
