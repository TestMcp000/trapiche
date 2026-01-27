'use server';

/**
 * Server Actions for Contact Page
 *
 * Handles contact form submissions.
 *
 * @see lib/modules/contact/io.ts - IO operations
 * @see doc/meta/STEP_PLAN.md (PR-38)
 */

import { headers } from 'next/headers';
import { submitContactMessage } from '@/lib/modules/contact/io';
import type { ContactFormInput, ContactFormResult } from '@/lib/types/contact';

/**
 * Submit contact form
 */
export async function submitContactFormAction(
    input: ContactFormInput
): Promise<ContactFormResult> {
    // Get IP address from headers
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || undefined;

    return submitContactMessage(input, ipAddress);
}
