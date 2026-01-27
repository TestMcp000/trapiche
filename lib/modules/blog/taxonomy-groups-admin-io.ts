/**
 * Blog Groups Admin IO Module (Server-only)
 *
 * Admin CRUD operations for Blog Groups.
 * Follows ARCHITECTURE.md §3.4 IO module pattern.
 *
 * @see lib/types/blog-taxonomy.ts - Type definitions
 * @see lib/modules/blog/taxonomy-admin-io.ts - Facade
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type {
  BlogGroup,
  BlogGroupInput,
  BlogGroupWithCounts,
} from '@/lib/types/blog-taxonomy';

/**
 * Get all blog groups (including hidden) for admin management
 */
export async function getAllBlogGroupsAdmin(): Promise<BlogGroupWithCounts[]> {
  const supabase = await createClient();

  const { data: groups, error: groupsError } = await supabase
    .from('blog_groups')
    .select('*')
    .order('sort_order', { ascending: true });

  if (groupsError || !groups) {
    console.error('[taxonomy-groups-io] getAllBlogGroupsAdmin error:', groupsError);
    return [];
  }

  // Get topic counts
  const { data: topics } = await supabase.from('blog_topics').select('group_id');

  // Get post counts per group
  const { data: posts } = await supabase
    .from('posts')
    .select('group_id')
    .not('group_id', 'is', null);

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

/**
 * Get a single blog group by ID (admin)
 */
export async function getBlogGroupByIdAdmin(id: string): Promise<BlogGroup | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_groups')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[taxonomy-groups-io] getBlogGroupByIdAdmin error:', error);
    }
    return null;
  }

  return data;
}

/**
 * Create a new blog group
 */
export async function createBlogGroup(input: BlogGroupInput): Promise<BlogGroup | null> {
  const supabase = await createClient();

  // Get max sort_order for new group
  const { data: maxOrderResult } = await supabase
    .from('blog_groups')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const nextOrder = (maxOrderResult?.sort_order ?? 0) + 1;

  const { data, error } = await supabase
    .from('blog_groups')
    .insert({
      slug: input.slug,
      name_zh: input.name_zh,
      sort_order: input.sort_order ?? nextOrder,
      is_visible: input.is_visible ?? true,
    })
    .select()
    .single();

  if (error) {
    console.error('[taxonomy-groups-io] createBlogGroup error:', error);
    return null;
  }

  return data;
}

/**
 * Update a blog group
 */
export async function updateBlogGroup(
  id: string,
  input: Partial<BlogGroupInput>
): Promise<BlogGroup | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_groups')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[taxonomy-groups-io] updateBlogGroup error:', error);
    return null;
  }

  return data;
}

/**
 * Delete a blog group (only if no topics/posts reference it)
 */
export async function deleteBlogGroup(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase.from('blog_groups').delete().eq('id', id);

  if (error) {
    console.error('[taxonomy-groups-io] deleteBlogGroup error:', error);
    return false;
  }

  return true;
}

/**
 * Reorder blog groups
 */
export async function reorderBlogGroups(orderedIds: string[]): Promise<boolean> {
  const supabase = await createClient();

  const updates = orderedIds.map((id, index) => ({
    id,
    sort_order: index + 1,
    updated_at: new Date().toISOString(),
  }));

  for (const update of updates) {
    const { error } = await supabase
      .from('blog_groups')
      .update({ sort_order: update.sort_order, updated_at: update.updated_at })
      .eq('id', update.id);

    if (error) {
      console.error('[taxonomy-groups-io] reorderBlogGroups error:', error);
      return false;
    }
  }

  return true;
}
