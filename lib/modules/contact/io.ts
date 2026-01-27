/**
 * Contact Messages IO (Server-only)
 *
 * Database operations for contact form submissions.
 * Uses anonymous client for public form submissions.
 *
 * @module lib/modules/contact/io
 * @see ARCHITECTURE.md §3.4 - IO module pattern
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { ContactFormInput, ContactFormResult } from '@/lib/types/contact';
import { hashIP } from '@/lib/security/ip';

// =============================================================================
// Public Contact Form Submission
// =============================================================================

/**
 * Submit a contact form message
 * Returns success=false if honeypot is filled (bot detected)
 */
export async function submitContactMessage(
    input: ContactFormInput,
    ipAddress?: string
): Promise<ContactFormResult> {
    // Honeypot check - if filled, silently accept but don't store
    if (input.honeypot && input.honeypot.trim() !== '') {
        // Log for monitoring but don't expose to client
        console.log('[submitContactMessage] Bot detected via honeypot');
        return { success: true }; // Fake success to not alert bots
    }

    // Basic validation
    if (!input.name || input.name.trim().length < 2) {
        return { success: false, error: '請輸入有效的姓名' };
    }

    if (!input.email || !isValidEmail(input.email)) {
        return { success: false, error: '請輸入有效的電子郵件' };
    }

    if (!input.message || input.message.trim().length < 10) {
        return { success: false, error: '訊息內容至少需要 10 個字元' };
    }

    // Hash IP for privacy (if provided)
    const ipHash = ipAddress ? hashIP(ipAddress) : null;

    const { error } = await createAnonClient()
        .from('contact_messages')
        .insert({
            name: input.name.trim(),
            email: input.email.trim().toLowerCase(),
            subject: input.subject?.trim() || null,
            message: input.message.trim(),
            ip_hash: ipHash,
        });

    if (error) {
        console.error('[submitContactMessage] Error:', error);
        return { success: false, error: '訊息發送失敗，請稍後再試' };
    }

    return { success: true };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
