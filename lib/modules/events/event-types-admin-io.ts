/**
 * Event Types Admin IO (Server-only)
 *
 * Admin CRUD operations for event types.
 * Uses authenticated Supabase client with RLS for admin operations.
 *
 * @module lib/modules/events/event-types-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type {
    EventType,
    EventTypeWithCount,
    EventTypeInput,
} from '@/lib/types/events';

/**
 * Get all event types (including hidden ones) for admin
 */
export async function getAllEventTypesAdmin(): Promise<EventTypeWithCount[]> {
    const supabase = await createClient();

    const { data: types, error: typesError } = await supabase
        .from('event_types')
        .select('*')
        .order('sort_order', { ascending: true });

    if (typesError || !types) {
        console.error('[getAllEventTypesAdmin] Error fetching types:', typesError);
        return [];
    }

    // Get counts for each type
    const typesWithCounts: EventTypeWithCount[] = await Promise.all(
        types.map(async (type) => {
            const { count } = await supabase
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('type_id', type.id);

            return {
                ...type,
                event_count: count ?? 0,
            };
        })
    );

    return typesWithCounts;
}

/**
 * Get event type by ID for admin
 */
export async function getEventTypeByIdAdmin(id: string): Promise<EventType | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('event_types')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[getEventTypeByIdAdmin] Error:', error);
        return null;
    }

    return data;
}

/**
 * Create a new event type
 */
export async function createEventType(input: EventTypeInput): Promise<EventType | null> {
    const supabase = await createClient();

    // Get max sort_order
    const { data: maxOrder } = await supabase
        .from('event_types')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .single();

    const newSortOrder = (maxOrder?.sort_order ?? 0) + 1;

    const { data, error } = await supabase
        .from('event_types')
        .insert({
            slug: input.slug,
            name_zh: input.name_zh,
            sort_order: input.sort_order ?? newSortOrder,
            is_visible: input.is_visible ?? true,
            show_in_nav: input.show_in_nav ?? false,
        })
        .select()
        .single();

    if (error) {
        console.error('[createEventType] Error:', error);
        return null;
    }

    return data;
}

/**
 * Update an event type
 */
export async function updateEventType(
    id: string,
    input: Partial<EventTypeInput>
): Promise<EventType | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('event_types')
        .update({
            ...(input.slug !== undefined && { slug: input.slug }),
            ...(input.name_zh !== undefined && { name_zh: input.name_zh }),
            ...(input.sort_order !== undefined && { sort_order: input.sort_order }),
            ...(input.is_visible !== undefined && { is_visible: input.is_visible }),
            ...(input.show_in_nav !== undefined && { show_in_nav: input.show_in_nav }),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[updateEventType] Error:', error);
        return null;
    }

    return data;
}

/**
 * Delete an event type (only if no events use it)
 */
export async function deleteEventType(id: string): Promise<boolean> {
    const supabase = await createClient();

    // Check if any events use this type
    const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('type_id', id);

    if (count && count > 0) {
        console.error('[deleteEventType] Cannot delete: events using this type');
        return false;
    }

    const { error } = await supabase.from('event_types').delete().eq('id', id);

    if (error) {
        console.error('[deleteEventType] Error:', error);
        return false;
    }

    return true;
}

/**
 * Reorder event types
 */
export async function reorderEventTypes(orderedIds: string[]): Promise<boolean> {
    const supabase = await createClient();

    const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index + 1,
        updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
        const { error } = await supabase
            .from('event_types')
            .update({ sort_order: update.sort_order, updated_at: update.updated_at })
            .eq('id', update.id);

        if (error) {
            console.error('[reorderEventTypes] Error:', error);
            return false;
        }
    }

    return true;
}

/**
 * Check if event type slug exists (for validation)
 */
export async function eventTypeSlugExists(
    slug: string,
    excludeId?: string
): Promise<boolean> {
    const supabase = await createClient();

    let query = supabase
        .from('event_types')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug);

    if (excludeId) {
        query = query.neq('id', excludeId);
    }

    const { count, error } = await query;

    if (error) {
        console.error('[eventTypeSlugExists] Error:', error);
        return false;
    }

    return (count ?? 0) > 0;
}
