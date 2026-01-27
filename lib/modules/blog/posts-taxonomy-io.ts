/**
 * Blog Posts Taxonomy IO (Server-only)
 *
 * Database operations for querying posts by taxonomy v2 (groups/topics/tags).
 * Split from posts-io.ts per ARCHITECTURE.md §3.4 (300 line limit).
 *
 * @module lib/modules/blog/posts-taxonomy-io
 * @see lib/modules/blog/posts-io.ts - Base post operations
 * @see lib/types/blog-taxonomy.ts - Taxonomy types
 * @see supabase/02_add/21_blog_taxonomy_v2.sql - DB schema
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { PostSummary } from '@/lib/types/blog';

/**
 * Get public posts by group (taxonomy v2)
 */
export async function getPublicPostsByGroup(options: {
  groupSlug: string;
  locale?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'title-asc' | 'title-desc';
  limit?: number;
  offset?: number;
}): Promise<PostSummary[]> {
  const supabase = createAnonClient();

  const { data: groupData, error: groupError } = await supabase
    .from('blog_groups')
    .select('id')
    .eq('slug', options.groupSlug)
    .eq('is_visible', true)
    .single();

  if (groupError || !groupData) {
    return [];
  }

  let query = supabase
    .from('posts')
    .select(`
      id,
      title_en,
      title_zh,
      slug,
      excerpt_en,
      excerpt_zh,
      content_en,
      content_zh,
      cover_image_url,
      cover_image_alt_zh,
      visibility,
      published_at,
      created_at,
      category:categories(id, name_en, name_zh, slug)
    `)
    .eq('visibility', 'public')
    .eq('group_id', groupData.id);

  if (options.locale === 'zh') {
    query = query.not('content_zh', 'is', null);
  }

  if (options.search) {
    const searchTerm = `%${options.search}%`;
    query = query.or(`title_en.ilike.${searchTerm},title_zh.ilike.${searchTerm}`);
  }

  switch (options.sort) {
    case 'oldest':
      query = query.order('published_at', { ascending: true });
      break;
    case 'title-asc':
      query = query.order('title_zh', { ascending: true });
      break;
    case 'title-desc':
      query = query.order('title_zh', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('published_at', { ascending: false });
      break;
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data } = await query;
  return (data ?? []) as unknown as PostSummary[];
}

/**
 * Get public posts by topic (taxonomy v2)
 */
export async function getPublicPostsByTopic(options: {
  topicSlug: string;
  locale?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'title-asc' | 'title-desc';
  limit?: number;
  offset?: number;
}): Promise<PostSummary[]> {
  const supabase = createAnonClient();

  const { data: topicData, error: topicError } = await supabase
    .from('blog_topics')
    .select('id')
    .eq('slug', options.topicSlug)
    .eq('is_visible', true)
    .single();

  if (topicError || !topicData) {
    return [];
  }

  const { data: postTopics, error: ptError } = await supabase
    .from('post_topics')
    .select('post_id')
    .eq('topic_id', topicData.id);

  if (ptError || !postTopics || postTopics.length === 0) {
    return [];
  }

  const postIds = postTopics.map(pt => pt.post_id);

  let query = supabase
    .from('posts')
    .select(`
      id,
      title_en,
      title_zh,
      slug,
      excerpt_en,
      excerpt_zh,
      content_en,
      content_zh,
      cover_image_url,
      cover_image_alt_zh,
      visibility,
      published_at,
      created_at,
      category:categories(id, name_en, name_zh, slug)
    `)
    .eq('visibility', 'public')
    .in('id', postIds);

  if (options.locale === 'zh') {
    query = query.not('content_zh', 'is', null);
  }

  if (options.search) {
    const searchTerm = `%${options.search}%`;
    query = query.or(`title_en.ilike.${searchTerm},title_zh.ilike.${searchTerm}`);
  }

  switch (options.sort) {
    case 'oldest':
      query = query.order('published_at', { ascending: true });
      break;
    case 'title-asc':
      query = query.order('title_zh', { ascending: true });
      break;
    case 'title-desc':
      query = query.order('title_zh', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('published_at', { ascending: false });
      break;
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data } = await query;
  return (data ?? []) as unknown as PostSummary[];
}

/**
 * Get public posts by tag (taxonomy v2)
 */
export async function getPublicPostsByTag(options: {
  tagSlug: string;
  locale?: string;
  sort?: 'newest' | 'oldest' | 'title-asc' | 'title-desc';
  limit?: number;
  offset?: number;
}): Promise<PostSummary[]> {
  const supabase = createAnonClient();

  const { data: tagData, error: tagError } = await supabase
    .from('blog_tags')
    .select('id')
    .eq('slug', options.tagSlug)
    .single();

  if (tagError || !tagData) {
    return [];
  }

  const { data: postTags, error: ptError } = await supabase
    .from('post_tags')
    .select('post_id')
    .eq('tag_id', tagData.id);

  if (ptError || !postTags || postTags.length === 0) {
    return [];
  }

  const postIds = postTags.map(pt => pt.post_id);

  let query = supabase
    .from('posts')
    .select(`
      id,
      title_en,
      title_zh,
      slug,
      excerpt_en,
      excerpt_zh,
      content_en,
      content_zh,
      cover_image_url,
      cover_image_alt_zh,
      visibility,
      published_at,
      created_at,
      category:categories(id, name_en, name_zh, slug)
    `)
    .eq('visibility', 'public')
    .in('id', postIds);

  if (options.locale === 'zh') {
    query = query.not('content_zh', 'is', null);
  }

  switch (options.sort) {
    case 'oldest':
      query = query.order('published_at', { ascending: true });
      break;
    case 'title-asc':
      query = query.order('title_zh', { ascending: true });
      break;
    case 'title-desc':
      query = query.order('title_zh', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('published_at', { ascending: false });
      break;
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data } = await query;
  return (data ?? []) as unknown as PostSummary[];
}
