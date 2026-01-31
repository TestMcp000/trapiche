'use server';

/**
 * Server Actions for Events Admin Management
 *
 * Follows ARCHITECTURE.md §3.1:
 * - Server actions only do: parse/validate → call lib → revalidate
 * - Uses unified ActionResult type with error codes for i18n/security
 *
 * @see lib/modules/events/admin-io.ts - IO operations
 * @see lib/types/action-result.ts - ActionResult types
 */

import { revalidatePath, revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import { syncHamburgerNavAutogen } from '@/lib/modules/content/hamburger-nav-autogen-io';
import {
    getAllEventTypesAdmin,
    getEventTypeByIdAdmin,
    createEventType,
    updateEventType,
    deleteEventType,
    reorderEventTypes,
    getAllEventsAdmin,
    getEventByIdAdmin,
    createEvent,
    updateEvent,
    deleteEvent,
    eventSlugExists,
    eventTypeSlugExists,
    getAllEventTagsAdmin,
    createEventTag,
    updateEventTag,
    deleteEventTag,
    eventTagSlugExists,
    updateEventTags,
    getEventTagIdsAdmin,
} from '@/lib/modules/events/admin-io';
import {
    ADMIN_ERROR_CODES,
    actionSuccess,
    actionError,
    type ActionResult,
} from '@/lib/types/action-result';
import { isValidSlug } from '@/lib/validators/slug';
import type {
    Event,
    EventType,
    EventTag,
    EventTagInput,
    EventTypeInput,
} from '@/lib/types/events';

// =============================================================================
// Event Type Actions
// =============================================================================

/**
 * Create a new event type
 */
export async function createEventTypeAction(
    input: EventTypeInput,
    locale: string
): Promise<ActionResult<EventType>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        // Validate input
        if (!input.name_zh?.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }
        if (!input.slug?.trim() || !isValidSlug(input.slug.trim())) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Check for duplicate slug
        const slugExists = await eventTypeSlugExists(input.slug.trim());
        if (slugExists) {
            return actionError(ADMIN_ERROR_CODES.SLUG_DUPLICATE);
        }

        const eventType = await createEventType({
            slug: input.slug.trim(),
            name_zh: input.name_zh.trim(),
            is_visible: input.is_visible ?? true,
        });

        if (!eventType) {
            return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);

        return actionSuccess(eventType);
    } catch (error) {
        console.error('[events/actions] createEventTypeAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update an event type
 */
export async function updateEventTypeAction(
    id: string,
    input: Partial<EventTypeInput>,
    locale: string
): Promise<ActionResult<EventType>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Validate slug if provided
        if (input.slug !== undefined) {
            if (!input.slug.trim() || !isValidSlug(input.slug.trim())) {
                return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
            }

            // Check for duplicate slug
            const slugExists = await eventTypeSlugExists(input.slug.trim(), id);
            if (slugExists) {
                return actionError(ADMIN_ERROR_CODES.SLUG_DUPLICATE);
            }
        }

        // Validate name_zh if provided
        if (input.name_zh !== undefined && !input.name_zh.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const eventType = await updateEventType(id, {
            ...(input.slug !== undefined && { slug: input.slug.trim() }),
            ...(input.name_zh !== undefined && { name_zh: input.name_zh.trim() }),
            ...(input.is_visible !== undefined && { is_visible: input.is_visible }),
        });

        if (!eventType) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);

        return actionSuccess(eventType);
    } catch (error) {
        console.error('[events/actions] updateEventTypeAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Delete an event type
 */
export async function deleteEventTypeAction(
    id: string,
    locale: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const success = await deleteEventType(id);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.RESOURCE_IN_USE);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);

        return actionSuccess();
    } catch (error) {
        console.error('[events/actions] deleteEventTypeAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Toggle event type visibility
 */
export async function toggleEventTypeVisibilityAction(
    id: string,
    isVisible: boolean,
    locale: string
): Promise<ActionResult<EventType>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const eventType = await updateEventType(id, { is_visible: isVisible });

        if (!eventType) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);

        return actionSuccess(eventType);
    } catch (error) {
        console.error('[events/actions] toggleEventTypeVisibilityAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Toggle event type "show in hamburger nav" flag
 */
export async function toggleEventTypeShowInNavAction(
    id: string,
    showInNav: boolean,
    locale: string
): Promise<ActionResult<EventType>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const eventType = await updateEventType(id, { show_in_nav: showInNav });
        if (!eventType) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        const sync = await syncHamburgerNavAutogen(guard.userId);
        if (sync.updated) {
            revalidateTag('site-content', { expire: 0 });
            revalidatePath(`/${locale}`);
            revalidatePath(`/${locale}/admin/settings/navigation`);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);

        return actionSuccess(eventType);
    } catch (error) {
        console.error('[events/actions] toggleEventTypeShowInNavAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Reorder event types
 */
export async function reorderEventTypesAction(
    orderedIds: string[],
    locale: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!orderedIds || orderedIds.length === 0) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const success = await reorderEventTypes(orderedIds);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);

        return actionSuccess();
    } catch (error) {
        console.error('[events/actions] reorderEventTypesAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

// =============================================================================
// Event Actions
// =============================================================================

export interface EventActionInput {
    type_id?: string | null;
    slug: string;
    title_zh: string;
    excerpt_zh?: string | null;
    content_md_zh?: string | null;
    cover_image_url?: string | null;
    cover_image_alt_zh?: string | null;
    start_at: string;
    end_at?: string | null;
    timezone?: string;
    location_name?: string | null;
    location_address?: string | null;
    online_url?: string | null;
    registration_url?: string | null;
    visibility: 'draft' | 'private' | 'public';
    /** Tag IDs for many-to-many relation */
    tag_ids?: string[];
}

/**
 * Create a new event
 */
export async function createEventAction(
    input: EventActionInput,
    locale: string
): Promise<ActionResult<Event>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        // Validate required fields
        if (!input.title_zh?.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }
        if (!input.slug?.trim() || !isValidSlug(input.slug.trim())) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }
        if (!input.start_at) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Check for duplicate slug
        const slugExists = await eventSlugExists(input.slug.trim());
        if (slugExists) {
            return actionError(ADMIN_ERROR_CODES.SLUG_DUPLICATE);
        }

        const event = await createEvent({
            type_id: input.type_id ?? null,
            slug: input.slug.trim(),
            title_zh: input.title_zh.trim(),
            excerpt_zh: input.excerpt_zh?.trim() ?? null,
            content_md_zh: input.content_md_zh ?? null,
            cover_image_url: input.cover_image_url ?? null,
            cover_image_alt_zh: input.cover_image_alt_zh?.trim() ?? null,
            start_at: input.start_at,
            end_at: input.end_at ?? null,
            timezone: input.timezone ?? 'Asia/Taipei',
            location_name: input.location_name?.trim() ?? null,
            location_address: input.location_address?.trim() ?? null,
            online_url: input.online_url?.trim() ?? null,
            registration_url: input.registration_url?.trim() ?? null,
            visibility: input.visibility,
        });

        if (!event) {
            return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
        }

        // Update event tags if provided
        if (input.tag_ids !== undefined) {
            await updateEventTags(event.id, input.tag_ids);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);
        revalidatePath(`/${locale}/events`);

        return actionSuccess(event);
    } catch (error) {
        console.error('[events/actions] createEventAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update an event
 */
export async function updateEventAction(
    id: string,
    input: Partial<EventActionInput>,
    locale: string
): Promise<ActionResult<Event>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Validate slug if provided
        if (input.slug !== undefined) {
            if (!input.slug.trim() || !isValidSlug(input.slug.trim())) {
                return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
            }

            // Check for duplicate slug
            const slugExists = await eventSlugExists(input.slug.trim(), id);
            if (slugExists) {
                return actionError(ADMIN_ERROR_CODES.SLUG_DUPLICATE);
            }
        }

        // Validate title_zh if provided
        if (input.title_zh !== undefined && !input.title_zh.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const event = await updateEvent(id, {
            ...(input.type_id !== undefined && { type_id: input.type_id }),
            ...(input.slug !== undefined && { slug: input.slug.trim() }),
            ...(input.title_zh !== undefined && { title_zh: input.title_zh.trim() }),
            ...(input.excerpt_zh !== undefined && { excerpt_zh: input.excerpt_zh?.trim() ?? null }),
            ...(input.content_md_zh !== undefined && { content_md_zh: input.content_md_zh }),
            ...(input.cover_image_url !== undefined && { cover_image_url: input.cover_image_url }),
            ...(input.cover_image_alt_zh !== undefined && { cover_image_alt_zh: input.cover_image_alt_zh?.trim() ?? null }),
            ...(input.start_at !== undefined && { start_at: input.start_at }),
            ...(input.end_at !== undefined && { end_at: input.end_at }),
            ...(input.timezone !== undefined && { timezone: input.timezone }),
            ...(input.location_name !== undefined && { location_name: input.location_name?.trim() ?? null }),
            ...(input.location_address !== undefined && { location_address: input.location_address?.trim() ?? null }),
            ...(input.online_url !== undefined && { online_url: input.online_url?.trim() ?? null }),
            ...(input.registration_url !== undefined && { registration_url: input.registration_url?.trim() ?? null }),
            ...(input.visibility !== undefined && { visibility: input.visibility }),
        });

        if (!event) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        // Update event tags if provided
        if (input.tag_ids !== undefined) {
            await updateEventTags(id, input.tag_ids);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);
        revalidatePath(`/${locale}/events`);
        revalidatePath(`/${locale}/events/${event.slug}`);

        return actionSuccess(event);
    } catch (error) {
        console.error('[events/actions] updateEventAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Delete an event
 */
export async function deleteEventAction(
    id: string,
    locale: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const success = await deleteEvent(id);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);
        revalidatePath(`/${locale}/events`);

        return actionSuccess();
    } catch (error) {
        console.error('[events/actions] deleteEventAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

// =============================================================================
// Data Fetching Helpers (for server components)
// =============================================================================

export {
    getAllEventTypesAdmin,
    getAllEventsAdmin,
    getEventByIdAdmin,
    getEventTypeByIdAdmin,
    getAllEventTagsAdmin,
    getEventTagIdsAdmin,
};

// =============================================================================
// Event Tag Actions
// =============================================================================

/**
 * Create a new event tag
 */
export async function createEventTagAction(
    input: EventTagInput,
    locale: string
): Promise<ActionResult<EventTag>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        // Validate input
        if (!input.name_zh?.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }
        if (!input.slug?.trim() || !isValidSlug(input.slug.trim())) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Check for duplicate slug
        const slugExists = await eventTagSlugExists(input.slug.trim());
        if (slugExists) {
            return actionError(ADMIN_ERROR_CODES.SLUG_DUPLICATE);
        }

        const eventTag = await createEventTag({
            slug: input.slug.trim(),
            name_zh: input.name_zh.trim(),
            is_visible: input.is_visible ?? true,
        });

        if (!eventTag) {
            return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);

        return actionSuccess(eventTag);
    } catch (error) {
        console.error('[events/actions] createEventTagAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Update an event tag
 */
export async function updateEventTagAction(
    id: string,
    input: Partial<EventTagInput>,
    locale: string
): Promise<ActionResult<EventTag>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        // Validate slug if provided
        if (input.slug !== undefined) {
            if (!input.slug.trim() || !isValidSlug(input.slug.trim())) {
                return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
            }

            // Check for duplicate slug
            const slugExists = await eventTagSlugExists(input.slug.trim(), id);
            if (slugExists) {
                return actionError(ADMIN_ERROR_CODES.SLUG_DUPLICATE);
            }
        }

        // Validate name_zh if provided
        if (input.name_zh !== undefined && !input.name_zh.trim()) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const eventTag = await updateEventTag(id, {
            ...(input.slug !== undefined && { slug: input.slug.trim() }),
            ...(input.name_zh !== undefined && { name_zh: input.name_zh.trim() }),
            ...(input.is_visible !== undefined && { is_visible: input.is_visible }),
        });

        if (!eventTag) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);
        revalidatePath(`/${locale}/events`);

        return actionSuccess(eventTag);
    } catch (error) {
        console.error('[events/actions] updateEventTagAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Delete an event tag
 */
export async function deleteEventTagAction(
    id: string,
    locale: string
): Promise<ActionResult<void>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const success = await deleteEventTag(id);
        if (!success) {
            return actionError(ADMIN_ERROR_CODES.RESOURCE_IN_USE);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);
        revalidatePath(`/${locale}/events`);

        return actionSuccess();
    } catch (error) {
        console.error('[events/actions] deleteEventTagAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Toggle event tag visibility
 */
export async function toggleEventTagVisibilityAction(
    id: string,
    isVisible: boolean,
    locale: string
): Promise<ActionResult<EventTag>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const eventTag = await updateEventTag(id, { is_visible: isVisible });
        if (!eventTag) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);
        revalidatePath(`/${locale}/events`);

        return actionSuccess(eventTag);
    } catch (error) {
        console.error('[events/actions] toggleEventTagVisibilityAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}

/**
 * Toggle event tag "show in hamburger nav" flag
 */
export async function toggleEventTagShowInNavAction(
    id: string,
    showInNav: boolean,
    locale: string
): Promise<ActionResult<EventTag>> {
    try {
        const supabase = await createClient();
        const guard = await requireSiteAdmin(supabase);
        if (!guard.ok) {
            return actionError(guard.errorCode);
        }

        if (!id) {
            return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
        }

        const eventTag = await updateEventTag(id, { show_in_nav: showInNav });
        if (!eventTag) {
            return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
        }

        const sync = await syncHamburgerNavAutogen(guard.userId);
        if (sync.updated) {
            revalidateTag('site-content', { expire: 0 });
            revalidatePath(`/${locale}`);
            revalidatePath(`/${locale}/admin/settings/navigation`);
        }

        revalidateTag('events', { expire: 0 });
        revalidatePath(`/${locale}/admin/events`);
        revalidatePath(`/${locale}/events`);

        return actionSuccess(eventTag);
    } catch (error) {
        console.error('[events/actions] toggleEventTagShowInNavAction error:', error);
        return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
    }
}
