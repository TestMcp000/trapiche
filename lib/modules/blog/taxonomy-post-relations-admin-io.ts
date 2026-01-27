/**
 * Post Taxonomy Relations Admin IO Module (Server-only)
 *
 * Admin operations for Post-Taxonomy relations (group, topics, tags).
 * Follows ARCHITECTURE.md §3.4 IO module pattern.
 *
 * @see lib/types/blog-taxonomy.ts - Type definitions
 * @see lib/modules/blog/taxonomy-admin-io.ts - Facade
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';

/**
 * Update post's group_id
 */
export async function updatePostGroup(postId: string, groupId: string | null): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('posts')
    .update({ group_id: groupId, updated_at: new Date().toISOString() })
    .eq('id', postId);

  if (error) {
    console.error('[taxonomy-posts-io] updatePostGroup error:', error);
    return false;
  }

  return true;
}

/**
 * Update post's topics (replace all)
 */
export async function updatePostTopics(postId: string, topicIds: string[]): Promise<boolean> {
  const supabase = await createClient();

  // Delete existing
  const { error: deleteError } = await supabase
    .from('post_topics')
    .delete()
    .eq('post_id', postId);

  if (deleteError) {
    console.error('[taxonomy-posts-io] updatePostTopics delete error:', deleteError);
    return false;
  }

  // Insert new (if any)
  if (topicIds.length > 0) {
    const { error: insertError } = await supabase
      .from('post_topics')
      .insert(topicIds.map((topic_id) => ({ post_id: postId, topic_id })));

    if (insertError) {
      console.error('[taxonomy-posts-io] updatePostTopics insert error:', insertError);
      return false;
    }
  }

  return true;
}

/**
 * Update post's tags (replace all)
 */
export async function updatePostTags(postId: string, tagIds: string[]): Promise<boolean> {
  const supabase = await createClient();

  // Delete existing
  const { error: deleteError } = await supabase
    .from('post_tags')
    .delete()
    .eq('post_id', postId);

  if (deleteError) {
    console.error('[taxonomy-posts-io] updatePostTags delete error:', deleteError);
    return false;
  }

  // Insert new (if any)
  if (tagIds.length > 0) {
    const { error: insertError } = await supabase
      .from('post_tags')
      .insert(tagIds.map((tag_id) => ({ post_id: postId, tag_id })));

    if (insertError) {
      console.error('[taxonomy-posts-io] updatePostTags insert error:', insertError);
      return false;
    }
  }

  return true;
}

/**
 * Update all post taxonomy at once (group + topics + tags)
 */
export async function updatePostTaxonomy(
  postId: string,
  groupId: string | null,
  topicIds: string[],
  tagIds: string[]
): Promise<boolean> {
  const groupResult = await updatePostGroup(postId, groupId);
  if (!groupResult) return false;

  const topicsResult = await updatePostTopics(postId, topicIds);
  if (!topicsResult) return false;

  const tagsResult = await updatePostTags(postId, tagIds);
  return tagsResult;
}
