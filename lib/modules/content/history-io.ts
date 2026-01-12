/**
 * Content History IO
 *
 * Server-side data access for content history tracking.
 * Used internally by other content IO modules for audit trail.
 *
 * @module lib/modules/content/history-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { ContentHistory } from '@/lib/types/content';

// =============================================================================
// History Write Operations
// =============================================================================

/**
 * Record a content change in history
 * @internal Used by other content IO modules
 */
export async function recordHistory(
  contentType: ContentHistory['content_type'],
  contentId: string,
  action: ContentHistory['action'],
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown>,
  userId?: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('content_history')
    .insert({
      content_type: contentType,
      content_id: contentId,
      action,
      old_value: oldValue,
      new_value: newValue,
      changed_by: userId,
      changed_at: new Date().toISOString()
    });

  if (error) {
    console.error('Error recording history:', error);
  }
}

// =============================================================================
// History Read Operations
// =============================================================================

/**
 * Get history for a specific content item
 */
export async function getContentHistory(
  contentType: ContentHistory['content_type'],
  contentId: string
): Promise<ContentHistory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_history')
    .select('*')
    .eq('content_type', contentType)
    .eq('content_id', contentId)
    .order('changed_at', { ascending: false });

  if (error) {
    console.error('Error fetching content history:', error);
    return [];
  }

  return data || [];
}

/**
 * Get all recent history entries
 */
export async function getAllRecentHistory(limit: number = 50): Promise<ContentHistory[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('content_history')
    .select('*')
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent history:', error);
    return [];
  }

  return data || [];
}
