/**
 * External URL Validator (Pure Functions)
 *
 * Single source of truth for external URL validation.
 * Validates that URLs use only allowed protocols (https: and mailto:).
 * Used for company settings, hamburger nav, and hotspots URL validation.
 *
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-11.1, FR-9.7)
 * @see lib/validators/api-common.ts - ValidationResult pattern
 */

import {
    type ValidationResult,
    validResult,
    invalidResult,
} from './api-common';

// =============================================================================
// Constants
// =============================================================================

/**
 * Allowed URL protocols for external URLs
 * Only https and mailto are allowed per security requirements
 */
export const ALLOWED_URL_PROTOCOLS = ['https:', 'mailto:'] as const;

/**
 * Dangerous protocols that must be rejected (XSS vectors)
 */
export const DANGEROUS_PROTOCOLS = [
    'javascript:',
    'data:',
    'vbscript:',
    'file:',
] as const;

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Validate an external URL
 *
 * Only https: and mailto: protocols are allowed.
 * Rejects dangerous protocols (javascript:, data:, etc.) and protocol-relative URLs.
 *
 * @param url - The URL to validate
 * @returns ValidationResult with validated URL string
 */
export function validateExternalUrl(
    url: string | null | undefined
): ValidationResult<string> {
    // Null/undefined/empty is invalid for required URLs
    if (url === null || url === undefined || url.trim() === '') {
        return invalidResult('URL 為必填');
    }

    const trimmedUrl = url.trim();

    // Reject protocol-relative URLs (//example.com)
    if (trimmedUrl.startsWith('//')) {
        return invalidResult('不允許使用 protocol-relative URL（以 // 開頭）');
    }

    try {
        const parsedUrl = new URL(trimmedUrl);

        // Check for dangerous protocols first
        for (const proto of DANGEROUS_PROTOCOLS) {
            if (parsedUrl.protocol === proto) {
                return invalidResult(
                    `不允許使用 ${proto} 協議（安全限制）`
                );
            }
        }

        // Check if protocol is in allowlist
        if (!ALLOWED_URL_PROTOCOLS.includes(parsedUrl.protocol as typeof ALLOWED_URL_PROTOCOLS[number])) {
            return invalidResult(
                `僅允許 https: 或 mailto: 協議，收到: ${parsedUrl.protocol}`
            );
        }

        return validResult(trimmedUrl);
    } catch {
        return invalidResult('URL 格式無效');
    }
}

/**
 * Validate an optional external URL
 *
 * Same as validateExternalUrl but allows null/undefined/empty values.
 * Returns null for empty input (valid optional field).
 *
 * @param url - The URL to validate (optional)
 * @returns ValidationResult with validated URL string or null
 */
export function validateOptionalExternalUrl(
    url: string | null | undefined
): ValidationResult<string | null> {
    // Optional field - null/undefined/empty is valid
    if (url === null || url === undefined || url.trim() === '') {
        return validResult(null);
    }

    const result = validateExternalUrl(url);
    if (!result.valid) {
        return invalidResult(result.error!);
    }

    return validResult(result.data!);
}

/**
 * Type guard to check if a URL is valid (https: or mailto:)
 *
 * Useful for render-side validation before passing URLs to components.
 *
 * @param url - The URL to check
 * @returns true if URL is valid and uses allowed protocol
 */
export function isValidExternalUrl(url: string | null | undefined): boolean {
    return validateExternalUrl(url).valid;
}
