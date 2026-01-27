/**
 * Blog Groups IO Module (Server-only)
 *
 * Public read operations for Blog Groups.
 * Uses anon client for public access without auth.
 * Follows ARCHITECTURE.md §3.4 IO module pattern.
 *
 * @see lib/types/blog-taxonomy.ts - Type definitions
 * @see lib/modules/blog/taxonomy-io.ts - Aggregator facade
 * @see lib/modules/blog/taxonomy-groups-admin-io.ts - Admin CRUD
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type {
  BlogGroup,
  BlogGroupWithCounts,
  BlogGroupWithTopics,
} from '@/lib/types/blog-taxonomy';

/**
 * Get all visible blog groups (is_visible = true)
 */
export async function getVisibleBlogGroups(): Promise<BlogGroup[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('blog_groups')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('[taxonomy-groups-io] getVisibleBlogGroups error:', error);
    return [];
  }

  return data ?? [];
}

/**
 * Get a blog group by slug
 */
export async function getBlogGroupBySlug(slug: string): Promise<BlogGroup | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('blog_groups')
    .select('*')
    .eq('slug', slug)
    .eq('is_visible', true)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[taxonomy-groups-io] getBlogGroupBySlug error:', error);
    }
    return null;
  }

  return data;
}

/**
 * Get all visible blog groups with their visible topics
 */
export async function getBlogGroupsWithTopics(): Promise<BlogGroupWithTopics[]> {
  const supabase = createAnonClient();

  const { data: groups, error: groupsError } = await supabase
    .from('blog_groups')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (groupsError || !groups) {
    console.error('[taxonomy-groups-io] getBlogGroupsWithTopics groups error:', groupsError);
    return [];
  }

  const groupIds = groups.map((g) => g.id);

  if (groupIds.length === 0) {
    return groups.map((g) => ({ ...g, topics: [] }));
  }

  const { data: topics, error: topicsError } = await supabase
    .from('blog_topics')
    .select('*')
    .in('group_id', groupIds)
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (topicsError) {
    console.error('[taxonomy-groups-io] getBlogGroupsWithTopics topics error:', topicsError);
    return groups.map((g) => ({ ...g, topics: [] }));
  }

  const topicsByGroup = new Map<string, typeof topics>();
  for (const topic of topics ?? []) {
    const existing = topicsByGroup.get(topic.group_id) ?? [];
    existing.push(topic);
    topicsByGroup.set(topic.group_id, existing);
  }

  return groups.map((group) => ({
    ...group,
    topics: topicsByGroup.get(group.id) ?? [],
  }));
}

/**
 * Get all visible blog groups with post counts
 */
export async function getBlogGroupsWithCounts(): Promise<BlogGroupWithCounts[]> {
  const supabase = createAnonClient();

  const { data: groups, error: groupsError } = await supabase
    .from('blog_groups')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order', { ascending: true });

  if (groupsError || !groups) {
    console.error('[taxonomy-groups-io] getBlogGroupsWithCounts groups error:', groupsError);
    return [];
  }

  const groupIds = groups.map((g) => g.id);

  if (groupIds.length === 0) {
    return groups.map((g) => ({ ...g, topic_count: 0, post_count: 0 }));
  }

  // Get topic counts
  const { data: topics } = await supabase
    .from('blog_topics')
    .select('group_id')
    .in('group_id', groupIds)
    .eq('is_visible', true);

  // Get post counts
  const { data: posts } = await supabase
    .from('posts')
    .select('group_id')
    .in('group_id', groupIds)
    .eq('is_published', true);

  const topicCountByGroup = new Map<string, number>();
  for (const t of topics ?? []) {
    topicCountByGroup.set(t.group_id, (topicCountByGroup.get(t.group_id) ?? 0) + 1);
  }

  const postCountByGroup = new Map<string, number>();
  for (const p of posts ?? []) {
    if (p.group_id) {
      postCountByGroup.set(p.group_id, (postCountByGroup.get(p.group_id) ?? 0) + 1);
    }
  }

  return groups.map((group) => ({
    ...group,
    topic_count: topicCountByGroup.get(group.id) ?? 0,
    post_count: postCountByGroup.get(group.id) ?? 0,
  }));
}
