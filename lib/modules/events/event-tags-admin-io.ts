/**
 * Event Tags Admin IO (Server-only)
 *
 * Admin CRUD operations for event tags.
 * Uses authenticated Supabase client with RLS for admin operations.
 *
 * @module lib/modules/events/event-tags-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { EventTag, EventTagWithCount, EventTagInput } from '@/lib/types/events';

/** Get all event tags (including hidden) for admin */
export async function getAllEventTagsAdmin(): Promise<EventTagWithCount[]> {
    const supabase = await createClient();
    const { data: tags, error } = await supabase.from('event_tags').select('*').order('sort_order', { ascending: true });
    if (error || !tags) { console.error('[getAllEventTagsAdmin] Error:', error); return []; }
    return Promise.all(tags.map(async (tag) => {
        const { count } = await supabase.from('event_event_tags').select('*', { count: 'exact', head: true }).eq('tag_id', tag.id);
        return { ...tag, event_count: count ?? 0 };
    }));
}

/** Get event tag by ID for admin */
export async function getEventTagByIdAdmin(id: string): Promise<EventTag | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('event_tags').select('*').eq('id', id).single();
    if (error) { if (error.code !== 'PGRST116') console.error('[getEventTagByIdAdmin] Error:', error); return null; }
    return data;
}

/** Create a new event tag */
export async function createEventTag(input: EventTagInput): Promise<EventTag | null> {
    const supabase = await createClient();
    const { data: maxOrder } = await supabase.from('event_tags').select('sort_order').order('sort_order', { ascending: false }).limit(1).single();
    const { data, error } = await supabase.from('event_tags').insert({
        slug: input.slug, name_zh: input.name_zh, sort_order: input.sort_order ?? (maxOrder?.sort_order ?? 0) + 1, is_visible: input.is_visible ?? true, show_in_nav: input.show_in_nav ?? false,
    }).select().single();
    if (error) { console.error('[createEventTag] Error:', error); return null; }
    return data;
}

/** Update an event tag */
export async function updateEventTag(id: string, input: Partial<EventTagInput>): Promise<EventTag | null> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('event_tags').update({
        ...(input.slug !== undefined && { slug: input.slug }), ...(input.name_zh !== undefined && { name_zh: input.name_zh }),
        ...(input.sort_order !== undefined && { sort_order: input.sort_order }), ...(input.is_visible !== undefined && { is_visible: input.is_visible }), ...(input.show_in_nav !== undefined && { show_in_nav: input.show_in_nav }),
        updated_at: new Date().toISOString(),
    }).eq('id', id).select().single();
    if (error) { console.error('[updateEventTag] Error:', error); return null; }
    return data;
}

/** Delete an event tag (only if no events use it) */
export async function deleteEventTag(id: string): Promise<boolean> {
    const supabase = await createClient();
    const { count } = await supabase.from('event_event_tags').select('*', { count: 'exact', head: true }).eq('tag_id', id);
    if (count && count > 0) { console.error('[deleteEventTag] Cannot delete: events using this tag'); return false; }
    const { error } = await supabase.from('event_tags').delete().eq('id', id);
    if (error) { console.error('[deleteEventTag] Error:', error); return false; }
    return true;
}

/** Reorder event tags */
export async function reorderEventTags(orderedIds: string[]): Promise<boolean> {
    const supabase = await createClient();
    for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase.from('event_tags').update({ sort_order: i + 1, updated_at: new Date().toISOString() }).eq('id', orderedIds[i]);
        if (error) { console.error('[reorderEventTags] Error:', error); return false; }
    }
    return true;
}

/** Check if event tag slug exists (for validation) */
export async function eventTagSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const supabase = await createClient();
    let query = supabase.from('event_tags').select('id', { count: 'exact', head: true }).eq('slug', slug);
    if (excludeId) query = query.neq('id', excludeId);
    const { count, error } = await query;
    if (error) { console.error('[eventTagSlugExists] Error:', error); return false; }
    return (count ?? 0) > 0;
}

/** Get or create an event tag by name (for quick-add) */
export async function getOrCreateEventTag(name_zh: string): Promise<EventTag | null> {
    const supabase = await createClient();
    const slug = name_zh.toLowerCase().replace(/\s+/g, '-');
    const { data: existing } = await supabase.from('event_tags').select('*').eq('slug', slug).single();
    if (existing) return existing;
    return createEventTag({ slug, name_zh });
}

/** Get tag IDs for an event (admin) */
export async function getEventTagIdsAdmin(eventId: string): Promise<string[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('event_event_tags').select('tag_id').eq('event_id', eventId);
    if (error) { console.error('[getEventTagIdsAdmin] Error:', error); return []; }
    return (data ?? []).map((row) => row.tag_id);
}

/** Update event tags (replace all tags for an event) */
export async function updateEventTags(eventId: string, tagIds: string[]): Promise<boolean> {
    const supabase = await createClient();
    const { error: deleteError } = await supabase.from('event_event_tags').delete().eq('event_id', eventId);
    if (deleteError) { console.error('[updateEventTags] Error deleting:', deleteError); return false; }
    if (tagIds.length > 0) {
        const { error: insertError } = await supabase.from('event_event_tags').insert(tagIds.map((tagId) => ({ event_id: eventId, tag_id: tagId })));
        if (insertError) { console.error('[updateEventTags] Error inserting:', insertError); return false; }
    }
    return true;
}

/** Get tags for a specific event (admin - includes hidden) */
export async function getEventTagsForAdmin(eventId: string): Promise<EventTag[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('event_event_tags').select(`tag:event_tags(*)`).eq('event_id', eventId);
    if (error) { console.error('[getEventTagsForAdmin] Error:', error); return []; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((item: any) => item.tag).filter(Boolean);
}
