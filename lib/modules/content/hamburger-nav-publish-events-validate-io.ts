/**
 * Hamburger Nav Publish - Events Validation IO
 *
 * Database validation for events-related nav targets (events_index with eventType, event_detail).
 *
 * @module lib/modules/content/hamburger-nav-publish-events-validate-io
 * @see lib/modules/content/hamburger-nav-publish-io.ts (orchestrator)
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { NavDeepValidationError } from '@/lib/types/hamburger-nav';

/**
 * Check if an event type exists and is visible
 */
export async function validateEventType(
    eventTypeSlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('event_types')
        .select('id, is_visible')
        .eq('slug', eventTypeSlug)
        .maybeSingle();

    if (error) {
        return {
            path,
            message: `Database error: ${error.message}`,
            targetType: 'events_index',
            targetSlug: eventTypeSlug,
        };
    }

    if (!data) {
        return {
            path,
            message: `Event type "${eventTypeSlug}" does not exist`,
            targetType: 'events_index',
            targetSlug: eventTypeSlug,
        };
    }

    if (!data.is_visible) {
        return {
            path,
            message: `Event type "${eventTypeSlug}" is not visible`,
            targetType: 'events_index',
            targetSlug: eventTypeSlug,
        };
    }

    return null;
}

/**
 * Check if an event tag exists and is visible
 */
export async function validateEventTag(
    eventTagSlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('event_tags')
        .select('id, is_visible')
        .eq('slug', eventTagSlug)
        .maybeSingle();

    if (error) {
        return {
            path,
            message: `Database error: ${error.message}`,
            targetType: 'events_index',
            targetSlug: eventTagSlug,
        };
    }

    if (!data) {
        return {
            path,
            message: `Event tag "${eventTagSlug}" does not exist`,
            targetType: 'events_index',
            targetSlug: eventTagSlug,
        };
    }

    if (!data.is_visible) {
        return {
            path,
            message: `Event tag "${eventTagSlug}" is not visible`,
            targetType: 'events_index',
            targetSlug: eventTagSlug,
        };
    }

    return null;
}

/**
 * Check if an event exists and is public
 */
export async function validateEventDetail(
    eventSlug: string,
    path: string
): Promise<NavDeepValidationError | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('events')
        .select('id, visibility')
        .eq('slug', eventSlug)
        .maybeSingle();

    if (error) {
        return {
            path,
            message: `Database error: ${error.message}`,
            targetType: 'event_detail',
            targetSlug: eventSlug,
        };
    }

    if (!data) {
        return {
            path,
            message: `Event "${eventSlug}" does not exist`,
            targetType: 'event_detail',
            targetSlug: eventSlug,
        };
    }

    if (data.visibility !== 'public') {
        return {
            path,
            message: `Event "${eventSlug}" is not public (visibility: ${data.visibility})`,
            targetType: 'event_detail',
            targetSlug: eventSlug,
        };
    }

    return null;
}
