/**
 * Post Taxonomy Relations IO Module (Server-only)
 *
 * Database read operations for Post-Taxonomy relationships.
 *
 * @see lib/types/blog-taxonomy.ts - Type definitions
 * @see lib/modules/blog/taxonomy-io.ts - Aggregator module
 * @see supabase/02_add/21_blog_taxonomy_v2.sql - DB schema
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type {
  BlogTopic,
  BlogTag,
  PostTaxonomySummary,
} from '@/lib/types/blog-taxonomy';

/**
 * Get taxonomy summary for a post (group_id, topic_ids, tag_ids)
 */
export async function getPostTaxonomySummary(postId: string): Promise<PostTaxonomySummary> {
  const supabase = createAnonClient();

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('group_id')
    .eq('id', postId)
    .single();

  if (postError) {
    console.error('[taxonomy-post-relations-io] getPostTaxonomySummary post error:', postError);
    return { group_id: null, topic_ids: [], tag_ids: [] };
  }

  const { data: postTopics, error: ptError } = await supabase
    .from('post_topics')
    .select('topic_id')
    .eq('post_id', postId);

  if (ptError) {
    console.error('[taxonomy-post-relations-io] getPostTaxonomySummary post_topics error:', ptError);
  }

  const { data: postTags, error: tagError } = await supabase
    .from('post_tags')
    .select('tag_id')
    .eq('post_id', postId);

  if (tagError) {
    console.error('[taxonomy-post-relations-io] getPostTaxonomySummary post_tags error:', tagError);
  }

  return {
    group_id: post?.group_id ?? null,
    topic_ids: (postTopics ?? []).map((pt) => pt.topic_id),
    tag_ids: (postTags ?? []).map((pt) => pt.tag_id),
  };
}

/**
 * Get topics for a post
 */
export async function getTopicsForPost(postId: string): Promise<BlogTopic[]> {
  const supabase = createAnonClient();

  const { data: postTopics, error: ptError } = await supabase
    .from('post_topics')
    .select('topic_id')
    .eq('post_id', postId);

  if (ptError || !postTopics || postTopics.length === 0) {
    if (ptError) {
      console.error('[taxonomy-post-relations-io] getTopicsForPost post_topics error:', ptError);
    }
    return [];
  }

  const topicIds = postTopics.map((pt) => pt.topic_id);

  const { data: topics, error: topicsError } = await supabase
    .from('blog_topics')
    .select('*')
    .in('id', topicIds)
    .order('sort_order', { ascending: true });

  if (topicsError) {
    console.error('[taxonomy-post-relations-io] getTopicsForPost topics error:', topicsError);
    return [];
  }

  return topics ?? [];
}

/**
 * Get tags for a post
 */
export async function getTagsForPost(postId: string): Promise<BlogTag[]> {
  const supabase = createAnonClient();

  const { data: postTags, error: ptError } = await supabase
    .from('post_tags')
    .select('tag_id')
    .eq('post_id', postId);

  if (ptError || !postTags || postTags.length === 0) {
    if (ptError) {
      console.error('[taxonomy-post-relations-io] getTagsForPost post_tags error:', ptError);
    }
    return [];
  }

  const tagIds = postTags.map((pt) => pt.tag_id);

  const { data: tags, error: tagsError } = await supabase
    .from('blog_tags')
    .select('*')
    .in('id', tagIds)
    .order('name_zh', { ascending: true });

  if (tagsError) {
    console.error('[taxonomy-post-relations-io] getTagsForPost tags error:', tagsError);
    return [];
  }

  return tags ?? [];
}
