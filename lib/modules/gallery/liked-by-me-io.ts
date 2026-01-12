/**
 * Gallery likedByMe query (server-only)
 *
 * Centralizes the service role query for anonymous like status.
 * Page files should use this instead of directly calling createAdminClient.
 */
import 'server-only';
import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import { isValidAnonId } from '@/lib/utils/anon-id';

/**
 * Get the IDs of gallery items that the anonymous user has liked.
 *
 * @param anonId - The anonymous user ID from cookie
 * @param itemIds - Array of gallery item IDs to check
 * @returns Set of item IDs that the user has liked
 */
export async function getLikedGalleryItemIds(
  anonId: string | undefined,
  itemIds: string[]
): Promise<Set<string>> {
  if (!anonId || !isValidAnonId(anonId) || itemIds.length === 0) {
    return new Set();
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from('reactions')
    .select('target_id')
    .eq('target_type', 'gallery_item')
    .eq('anon_id', anonId)
    .in('target_id', itemIds);

  return new Set((data || []).map((r) => r.target_id));
}
