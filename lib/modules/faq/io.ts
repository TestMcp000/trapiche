/**
 * FAQ IO
 *
 * Database operations for FAQs (public reads).
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/faq/io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { FAQ, FAQPublic, FAQForSitemap } from '@/lib/types/faq';

// =============================================================================
// Public FAQ Reads
// =============================================================================

/**
 * Get all visible FAQs for public display
 */
export async function getVisibleFAQs(): Promise<FAQPublic[]> {
    const { data, error } = await createAnonClient()
        .from('faqs')
        .select('id, question_zh, answer_zh, sort_order')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[getVisibleFAQs] Error:', error);
        return [];
    }

    return data ?? [];
}

/**
 * Get FAQ by ID (public, visible only)
 */
export async function getFAQById(id: string): Promise<FAQ | null> {
    const { data, error } = await createAnonClient()
        .from('faqs')
        .select('*')
        .eq('id', id)
        .eq('is_visible', true)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // Not found
            return null;
        }
        console.error('[getFAQById] Error:', error);
        return null;
    }

    return data;
}

/**
 * Get FAQs count (visible only)
 */
export async function getVisibleFAQsCount(): Promise<number> {
    const { count, error } = await createAnonClient()
        .from('faqs')
        .select('*', { count: 'exact', head: true })
        .eq('is_visible', true);

    if (error) {
        console.error('[getVisibleFAQsCount] Error:', error);
        return 0;
    }

    return count ?? 0;
}

/**
 * Get FAQ data for sitemap (last updated date)
 */
export async function getFAQsForSitemap(): Promise<FAQForSitemap | null> {
    const { data, error } = await createAnonClient()
        .from('faqs')
        .select('updated_at')
        .eq('is_visible', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // No FAQs found
            return null;
        }
        console.error('[getFAQsForSitemap] Error:', error);
        return null;
    }

    return data;
}
