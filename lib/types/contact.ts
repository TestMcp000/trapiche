/**
 * Contact Message Types
 *
 * Type definitions for the Contact Messages domain.
 *
 * @module lib/types/contact
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

// =============================================================================
// Contact Message
// =============================================================================

/**
 * Full contact message from database
 */
export interface ContactMessage {
    id: string;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    honeypot: string | null;
    ip_hash: string | null;
    is_read: boolean;
    is_archived: boolean;
    created_at: string;
}

/**
 * Contact message for admin list (excludes honeypot/ip_hash for cleaner UI)
 */
export interface ContactMessageListItem {
    id: string;
    name: string;
    email: string;
    subject: string | null;
    message: string;
    is_read: boolean;
    is_archived: boolean;
    created_at: string;
}

/**
 * Contact form input from public form submission
 */
export interface ContactFormInput {
    name: string;
    email: string;
    subject?: string;
    message: string;
    honeypot?: string;
}

/**
 * Contact form submission result
 */
export interface ContactFormResult {
    success: boolean;
    error?: string;
}
