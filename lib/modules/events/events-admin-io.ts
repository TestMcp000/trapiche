/**
 * Events Admin IO (Server-only)
 *
 * Admin CRUD operations for events.
 * Uses authenticated Supabase client with RLS for admin operations.
 *
 * @module lib/modules/events/events-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C1–C4)
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type {
    Event,
    EventWithType,
    EventInput,
    EventVisibility,
} from '@/lib/types/events';
import { getEventTagsForAdmin } from './event-tags-admin-io';

/**
 * Admin query options
 */
export interface AdminEventsQueryOptions {
    typeId?: string;
    visibility?: EventVisibility;
    search?: string;
    sort?: 'newest' | 'oldest' | 'start-asc' | 'start-desc';
    limit?: number;
    offset?: number;
}

/**
 * Get all events for admin (includes all visibility states)
 */
export async function getAllEventsAdmin(
    options?: AdminEventsQueryOptions
): Promise<EventWithType[]> {
    const supabase = await createClient();

    let query = supabase
        .from('events')
        .select(`
            *,
            event_type:event_types(id, slug, name_zh, sort_order, is_visible, created_at, updated_at)
        `);

    // Filter by event type
    if (options?.typeId) {
        query = query.eq('type_id', options.typeId);
    }

    // Filter by visibility
    if (options?.visibility) {
        query = query.eq('visibility', options.visibility);
    }

    // Search by title
    if (options?.search) {
        const searchTerm = `%${options.search}%`;
        query = query.ilike('title_zh', searchTerm);
    }

    // Sort
    switch (options?.sort) {
        case 'oldest':
            query = query.order('created_at', { ascending: true });
            break;
        case 'start-asc':
            query = query.order('start_at', { ascending: true });
            break;
        case 'start-desc':
            query = query.order('start_at', { ascending: false });
            break;
        case 'newest':
        default:
            query = query.order('created_at', { ascending: false });
            break;
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[getAllEventsAdmin] Error:', error);
        return [];
    }

    // Load tags for each event
    const events = (data ?? []) as unknown as EventWithType[];
    const eventsWithTags = await Promise.all(
        events.map(async (event) => ({
            ...event,
            event_tags: await getEventTagsForAdmin(event.id),
        }))
    );

    return eventsWithTags;
}

/**
 * Get event by ID for admin (with tags)
 */
export async function getEventByIdAdmin(id: string): Promise<EventWithType | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('events')
        .select(`
            *,
            event_type:event_types(id, slug, name_zh, sort_order, is_visible, created_at, updated_at)
        `)
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[getEventByIdAdmin] Error:', error);
        return null;
    }

    const event = data as unknown as EventWithType;

    // Load tags for this event
    event.event_tags = await getEventTagsForAdmin(event.id);

    return event;
}

/**
 * Create a new event
 */
export async function createEvent(input: EventInput): Promise<Event | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('events')
        .insert({
            type_id: input.type_id ?? null,
            slug: input.slug,
            title_zh: input.title_zh,
            excerpt_zh: input.excerpt_zh ?? null,
            content_md_zh: input.content_md_zh ?? null,
            cover_image_url: input.cover_image_url ?? null,
            cover_image_alt_zh: input.cover_image_alt_zh ?? null,
            start_at: input.start_at,
            end_at: input.end_at ?? null,
            timezone: input.timezone ?? 'Asia/Taipei',
            location_name: input.location_name ?? null,
            location_address: input.location_address ?? null,
            online_url: input.online_url ?? null,
            registration_url: input.registration_url ?? null,
            visibility: input.visibility,
            published_at: input.visibility === 'public' ? new Date().toISOString() : null,
        })
        .select()
        .single();

    if (error) {
        console.error('[createEvent] Error:', error);
        return null;
    }

    return data;
}

/**
 * Update an event
 */
export async function updateEvent(
    id: string,
    input: Partial<EventInput>
): Promise<Event | null> {
    const supabase = await createClient();

    // Build update object
    const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (input.type_id !== undefined) updateData.type_id = input.type_id;
    if (input.slug !== undefined) updateData.slug = input.slug;
    if (input.title_zh !== undefined) updateData.title_zh = input.title_zh;
    if (input.excerpt_zh !== undefined) updateData.excerpt_zh = input.excerpt_zh;
    if (input.content_md_zh !== undefined) updateData.content_md_zh = input.content_md_zh;
    if (input.cover_image_url !== undefined) updateData.cover_image_url = input.cover_image_url;
    if (input.cover_image_alt_zh !== undefined) updateData.cover_image_alt_zh = input.cover_image_alt_zh;
    if (input.start_at !== undefined) updateData.start_at = input.start_at;
    if (input.end_at !== undefined) updateData.end_at = input.end_at;
    if (input.timezone !== undefined) updateData.timezone = input.timezone;
    if (input.location_name !== undefined) updateData.location_name = input.location_name;
    if (input.location_address !== undefined) updateData.location_address = input.location_address;
    if (input.online_url !== undefined) updateData.online_url = input.online_url;
    if (input.registration_url !== undefined) updateData.registration_url = input.registration_url;

    // Handle visibility and published_at
    if (input.visibility !== undefined) {
        updateData.visibility = input.visibility;

        // Get current event to check if we need to update published_at
        const { data: currentEvent } = await supabase
            .from('events')
            .select('visibility, published_at')
            .eq('id', id)
            .single();

        // Set published_at when first publishing
        if (input.visibility === 'public' && currentEvent?.visibility !== 'public' && !currentEvent?.published_at) {
            updateData.published_at = new Date().toISOString();
        }
    }

    const { data, error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) {
        console.error('[updateEvent] Error:', error);
        return null;
    }

    return data;
}

/**
 * Delete an event
 */
export async function deleteEvent(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase.from('events').delete().eq('id', id);

    if (error) {
        console.error('[deleteEvent] Error:', error);
        return false;
    }

    return true;
}

/**
 * Check if event slug exists (for validation)
 */
export async function eventSlugExists(
    slug: string,
    excludeId?: string
): Promise<boolean> {
    const supabase = await createClient();

    let query = supabase
        .from('events')
        .select('id', { count: 'exact', head: true })
        .eq('slug', slug);

    if (excludeId) {
        query = query.neq('id', excludeId);
    }

    const { count, error } = await query;

    if (error) {
        console.error('[eventSlugExists] Error:', error);
        return false;
    }

    return (count ?? 0) > 0;
}
