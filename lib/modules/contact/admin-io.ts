/**
 * Contact Messages Admin IO (Server-only)
 *
 * Database operations for contact messages admin management.
 * Uses authenticated Supabase client with RLS for admin operations.
 *
 * @module lib/modules/contact/admin-io
 * @see ARCHITECTURE.md §3.4 - IO module pattern
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { ContactMessage, ContactMessageListItem } from '@/lib/types/contact';

// =============================================================================
// Admin Contact Message Operations
// =============================================================================

export interface ContactMessagesQueryOptions {
    showArchived?: boolean;
    showRead?: boolean;
    limit?: number;
    offset?: number;
}

/**
 * Get contact messages for admin list
 */
export async function getContactMessagesAdmin(
    options: ContactMessagesQueryOptions = {}
): Promise<{ data: ContactMessageListItem[]; total: number }> {
    const supabase = await createClient();
    const { showArchived = false, limit = 50, offset = 0 } = options;

    let query = supabase
        .from('contact_messages')
        .select('id, name, email, subject, message, is_read, is_archived, created_at', { count: 'exact' });

    if (!showArchived) {
        query = query.eq('is_archived', false);
    }

    const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('[getContactMessagesAdmin] Error:', error);
        return { data: [], total: 0 };
    }

    return { data: data ?? [], total: count ?? 0 };
}

/**
 * Get a single contact message by ID
 */
export async function getContactMessageByIdAdmin(id: string): Promise<ContactMessage | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[getContactMessageByIdAdmin] Error:', error);
        return null;
    }

    return data;
}

/**
 * Mark a contact message as read
 */
export async function markMessageAsRead(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: true })
        .eq('id', id);

    if (error) {
        console.error('[markMessageAsRead] Error:', error);
        return false;
    }

    return true;
}

/**
 * Mark a contact message as unread
 */
export async function markMessageAsUnread(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('contact_messages')
        .update({ is_read: false })
        .eq('id', id);

    if (error) {
        console.error('[markMessageAsUnread] Error:', error);
        return false;
    }

    return true;
}

/**
 * Archive a contact message
 */
export async function archiveMessage(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('contact_messages')
        .update({ is_archived: true })
        .eq('id', id);

    if (error) {
        console.error('[archiveMessage] Error:', error);
        return false;
    }

    return true;
}

/**
 * Unarchive a contact message
 */
export async function unarchiveMessage(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('contact_messages')
        .update({ is_archived: false })
        .eq('id', id);

    if (error) {
        console.error('[unarchiveMessage] Error:', error);
        return false;
    }

    return true;
}

/**
 * Delete a contact message permanently
 */
export async function deleteMessage(id: string): Promise<boolean> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('contact_messages')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('[deleteMessage] Error:', error);
        return false;
    }

    return true;
}

/**
 * Get unread messages count
 */
export async function getUnreadMessagesCount(): Promise<number> {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from('contact_messages')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false)
        .eq('is_archived', false);

    if (error) {
        console.error('[getUnreadMessagesCount] Error:', error);
        return 0;
    }

    return count ?? 0;
}

/**
 * Delete messages older than specified days (retention policy)
 */
export async function purgeOldMessages(daysOld: number = 90): Promise<number> {
    const supabase = await createClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const { data, error } = await supabase
        .from('contact_messages')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .select('id');

    if (error) {
        console.error('[purgeOldMessages] Error:', error);
        return 0;
    }

    return data?.length ?? 0;
}
