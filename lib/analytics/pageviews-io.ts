/**
 * Page View Analytics IO (Server-only)
 *
 * IO module for recording page views via Supabase RPC.
 * Uses service_role to call SECURITY DEFINER function.
 *
 * @see supabase/02_add/16_page_views.sql - increment_page_view RPC
 * @see lib/validators/page-views.ts - Request validation
 * @see ARCHITECTURE.md §3.4 - IO module constraints
 */

import 'server-only';
import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { PageViewLocale } from '@/lib/types/page-views';

// =============================================================================
// Page View Recording
// =============================================================================

/**
 * Records a page view by calling the increment_page_view RPC.
 * Uses UTC date to avoid timezone drift.
 *
 * @param path - Canonical path (without locale prefix)
 * @param locale - Page locale ('en' | 'zh')
 * @throws Error if RPC call fails
 */
export async function recordPageView(
  path: string,
  locale: PageViewLocale
): Promise<void> {
  const supabase = createAdminClient();

  // Compute UTC date as YYYY-MM-DD
  const now = new Date();
  const day = now.toISOString().slice(0, 10); // e.g., '2026-01-03'

  const { error } = await supabase.rpc('increment_page_view', {
    p_day: day,
    p_path: path,
    p_locale: locale,
  });

  if (error) {
    // Log error but don't expose details to client
    console.error('[pageviews-io] Failed to record page view:', error.message);
    throw new Error('Failed to record page view');
  }
}
