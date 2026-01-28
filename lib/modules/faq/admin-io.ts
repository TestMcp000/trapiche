/**
 * FAQ Admin IO (Server-only)
 *
 * Database operations for FAQ admin CRUD.
 * Uses authenticated Supabase client with RLS for admin operations.
 *
 * @module lib/modules/faq/admin-io
 * @see ARCHITECTURE.md §3.4 - IO module pattern
 * @see doc/SPEC.md (FAQ: /faq + /admin/faqs)
 * @see doc/archive/2026-01-28-step-plan-v15-cms-vnext-nav-blog-taxonomy-events-pages.md (PR-38)
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { FAQ, FAQInput } from '@/lib/types/faq';

// =============================================================================
// Admin FAQ Operations
// =============================================================================

/**
 * Get all FAQs (including hidden ones) for admin
 */
export async function getAllFAQsAdmin(): Promise<FAQ[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[getAllFAQsAdmin] Error:', error);
        return [];
    }

    return data ?? [];
}

/**
 * Get FAQ by ID for admin (including hidden)
 */
export async function getFAQByIdAdmin(id: string): Promise<FAQ | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('faqs')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[getFAQByIdAdmin] Error:', error);
        return null;
    }

    return data;
}

/**
 * Create a new FAQ
 */
export async function createFAQ(input: FAQInput): Promise<FAQ | null> {
    const supabase = await createClient();

    // Get max sort_order
    const { data: maxOrder } = await supabase
        .from('faqs')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

    const newSortOrder = input.sort_order ?? (maxOrder?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
        .from('faqs')
        .insert({
            question_zh: input.question_zh,
            answer_zh: input.answer_zh,
            sort_order: newSortOrder,
            is_visible: input.is_visible ?? true,
        })
        .select()
        .single();

    if (error) {
        console.error('[createFAQ] Error:', error);
        return null;
    }

    return data;
}

/**
 * Update an existing FAQ
 */
export async function updateFAQ(id: string, input: Partial<FAQInput>): Promise<FAQ | null> {
    const supabase = await createClient();

    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (input.question_zh !== undefined) {
        updateData.question_zh = input.question_zh;
    }
    if (input.answer_zh !== undefined) {
        updateData.answer_zh = input.answer_zh;
    }
    if (input.sort_order !== undefined) {
        updateData.sort_order = input.sort_order;
    }
    if (input.is_visible !== undefined) {
        updateData.is_visible = input.is_visible;
    }

    const { data, error } = await supabase
        .from('faqs')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[updateFAQ] Error:', error);
        return null;
    }

    return data;
}

/**
 * Delete a FAQ
 */
export async function deleteFAQ(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('faqs')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[deleteFAQ] Error:', error);
        return false;
    }

    return true;
}

/**
 * Reorder FAQs
 */
export async function reorderFAQs(orderedIds: string[]): Promise<boolean> {
    const supabase = await createClient();

    // Update sort_order for each FAQ
    const updates = orderedIds.map((id, index) =>
        supabase
            .from('faqs')
            .update({ sort_order: index, updated_at: new Date().toISOString() })
            .eq('id', id)
    );

    const results = await Promise.all(updates);
    const hasError = results.some((result) => result.error);

    if (hasError) {
        console.error('[reorderFAQs] Error during reorder');
        return false;
    }

    return true;
}

/**
 * Toggle FAQ visibility
 */
export async function toggleFAQVisibility(id: string, isVisible: boolean): Promise<FAQ | null> {
    return updateFAQ(id, { is_visible: isVisible });
}
