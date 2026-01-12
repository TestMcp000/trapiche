/**
 * User Tags Admin IO
 *
 * Admin-only user tag aggregation operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 * Query source: user_admin_profiles table (tags_en, tags_zh).
 *
 * @module lib/modules/user/user-tags-admin-io
 * @see uiux_refactor.md §6.2 - Tag Filter UI
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';

/**
 * Tag summary with count
 */
export interface TagSummary {
  tag: string;
  count: number;
}

/**
 * Get aggregated tag summary from user_admin_profiles
 *
 * Aggregates tags from both tags_en and tags_zh columns.
 * Returns unique tags with their occurrence counts.
 * Sorted by count desc, then tag asc.
 *
 * @returns TagSummary[] - Array of tag/count pairs
 */
export async function getUserTagSummary(): Promise<TagSummary[]> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return [];
  }

  // Query all profiles to get tags
  const { data: profiles, error } = await supabase
    .from('user_admin_profiles')
    .select('tags_en, tags_zh');

  if (error) {
    console.error('Error fetching user profiles for tag summary:', error);
    return [];
  }

  if (!profiles || profiles.length === 0) {
    return [];
  }

  // Aggregate tags using Map for counting
  const tagCounts = new Map<string, number>();

  for (const profile of profiles) {
    // Process tags_en
    const tagsEn = profile.tags_en as string[] | null;
    if (tagsEn && Array.isArray(tagsEn)) {
      for (const tag of tagsEn) {
        const trimmed = tag.trim();
        if (trimmed) {
          tagCounts.set(trimmed, (tagCounts.get(trimmed) || 0) + 1);
        }
      }
    }

    // Process tags_zh
    const tagsZh = profile.tags_zh as string[] | null;
    if (tagsZh && Array.isArray(tagsZh)) {
      for (const tag of tagsZh) {
        const trimmed = tag.trim();
        if (trimmed) {
          tagCounts.set(trimmed, (tagCounts.get(trimmed) || 0) + 1);
        }
      }
    }
  }

  // Convert to array and sort by count desc, tag asc
  const result: TagSummary[] = Array.from(tagCounts.entries()).map(
    ([tag, count]) => ({ tag, count })
  );

  result.sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count; // count desc
    }
    return a.tag.localeCompare(b.tag); // tag asc
  });

  return result;
}
