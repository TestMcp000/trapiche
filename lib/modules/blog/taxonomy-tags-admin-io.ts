/**
 * Blog Tags Admin IO Module (Server-only)
 *
 * Admin CRUD operations for Blog Tags.
 * Follows ARCHITECTURE.md §3.4 IO module pattern.
 *
 * @see lib/types/blog-taxonomy.ts - Type definitions
 * @see lib/modules/blog/taxonomy-admin-io.ts - Facade
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { BlogTag, BlogTagInput, BlogTagWithCounts } from '@/lib/types/blog-taxonomy';

/**
 * Get all blog tags for admin management
 */
export async function getAllBlogTagsAdmin(): Promise<BlogTagWithCounts[]> {
  const supabase = await createClient();

  const { data: tags, error: tagsError } = await supabase
    .from('blog_tags')
    .select('*')
    .order('name_zh', { ascending: true });

  if (tagsError || !tags) {
    console.error('[taxonomy-tags-io] getAllBlogTagsAdmin error:', tagsError);
    return [];
  }

  // Get post counts via post_tags join
  const { data: postTags } = await supabase.from('post_tags').select('tag_id');

  const postCountByTag = new Map<string, number>();
  for (const pt of postTags ?? []) {
    postCountByTag.set(pt.tag_id, (postCountByTag.get(pt.tag_id) ?? 0) + 1);
  }

  return tags.map((tag) => ({
    ...tag,
    post_count: postCountByTag.get(tag.id) ?? 0,
  }));
}

/**
 * Get a single blog tag by ID (admin)
 */
export async function getBlogTagByIdAdmin(id: string): Promise<BlogTag | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_tags')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[taxonomy-tags-io] getBlogTagByIdAdmin error:', error);
    }
    return null;
  }

  return data;
}

/**
 * Create a new blog tag
 */
export async function createBlogTag(input: BlogTagInput): Promise<BlogTag | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_tags')
    .insert({
      slug: input.slug,
      name_zh: input.name_zh,
    })
    .select()
    .single();

  if (error) {
    console.error('[taxonomy-tags-io] createBlogTag error:', error);
    return null;
  }

  return data;
}

/**
 * Update a blog tag
 */
export async function updateBlogTag(
  id: string,
  input: Partial<BlogTagInput>
): Promise<BlogTag | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('blog_tags')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[taxonomy-tags-io] updateBlogTag error:', error);
    return null;
  }

  return data;
}

/**
 * Delete a blog tag
 */
export async function deleteBlogTag(id: string): Promise<boolean> {
  const supabase = await createClient();

  // First delete post_tags relations
  await supabase.from('post_tags').delete().eq('tag_id', id);

  const { error } = await supabase.from('blog_tags').delete().eq('id', id);

  if (error) {
    console.error('[taxonomy-tags-io] deleteBlogTag error:', error);
    return false;
  }

  return true;
}

/**
 * Merge tags: move all post relations from sourceIds to targetId, then delete sources
 */
export async function mergeBlogTags(sourceIds: string[], targetId: string): Promise<boolean> {
  const supabase = await createClient();

  // Get all post_tags for source tags
  const { data: existingRelations } = await supabase
    .from('post_tags')
    .select('post_id')
    .in('tag_id', sourceIds);

  // Get existing relations for target tag to avoid duplicates
  const { data: targetRelations } = await supabase
    .from('post_tags')
    .select('post_id')
    .eq('tag_id', targetId);

  const targetPostIds = new Set((targetRelations ?? []).map((r) => r.post_id));

  // Insert new relations (avoiding duplicates)
  const newRelations = (existingRelations ?? [])
    .filter((r) => !targetPostIds.has(r.post_id))
    .map((r) => ({ post_id: r.post_id, tag_id: targetId }));

  if (newRelations.length > 0) {
    const { error: insertError } = await supabase.from('post_tags').insert(newRelations);

    if (insertError) {
      console.error('[taxonomy-tags-io] mergeBlogTags insert error:', insertError);
      return false;
    }
  }

  // Delete old relations
  const { error: deleteRelError } = await supabase
    .from('post_tags')
    .delete()
    .in('tag_id', sourceIds);

  if (deleteRelError) {
    console.error('[taxonomy-tags-io] mergeBlogTags delete relations error:', deleteRelError);
    return false;
  }

  // Delete source tags
  const { error: deleteTagError } = await supabase
    .from('blog_tags')
    .delete()
    .in('id', sourceIds);

  if (deleteTagError) {
    console.error('[taxonomy-tags-io] mergeBlogTags delete tags error:', deleteTagError);
    return false;
  }

  return true;
}

/**
 * Get or create tag by name (for tag input autocomplete)
 */
export async function getOrCreateTag(nameZh: string): Promise<BlogTag | null> {
  const supabase = await createClient();

  // Try to find existing tag
  const { data: existing } = await supabase
    .from('blog_tags')
    .select('*')
    .eq('name_zh', nameZh)
    .single();

  if (existing) {
    return existing;
  }

  // Create new tag with slug derived from name
  const slug = nameZh
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return createBlogTag({ slug: slug || `tag-${Date.now()}`, name_zh: nameZh });
}
