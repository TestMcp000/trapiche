/**
 * Gallery Hotspots Validation (Pure Functions)
 *
 * Single source of truth for hotspots input validation.
 * Validates coordinates, required fields, URL allowlist, and reorder payloads.
 *
 * @see lib/types/gallery.ts - GalleryHotspotInput, GalleryHotspotReorderInput
 * @see lib/validators/api-common.ts - ValidationResult pattern
 */

import {
    type ValidationResult,
    validResult,
    invalidResult,
    invalidResults,
    isValidUUID,
    isNonEmptyString,
} from './api-common';
import { validateOptionalExternalUrl } from './external-url';
import type { GalleryHotspotInput, GalleryHotspotReorderInput } from '@/lib/types/gallery';

// =============================================================================
// Constants
// =============================================================================

/**
 * Allowed URL protocols for read_more_url field
 * @deprecated Use ALLOWED_URL_PROTOCOLS from external-url.ts
 */
const ALLOWED_URL_PROTOCOLS = ['https:', 'mailto:'];

// =============================================================================
// Coordinate Validation
// =============================================================================

/**
 * Validate a coordinate value (x or y)
 * Must be a number in range [0, 1]
 */
export function validateCoordinate(
    value: unknown,
    fieldName: string
): ValidationResult<number> {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return invalidResult(`${fieldName} 必須為有效數字`);
    }

    if (value < 0 || value > 1) {
        return invalidResult(`${fieldName} 必須在 0 到 1 之間`);
    }

    return validResult(value);
}

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Validate read_more_url field
 * Uses shared external-url validator as single source of truth.
 * Returns null if input is null/undefined/empty (optional field)
 */
export function validateReadMoreUrl(
    url: string | null | undefined
): ValidationResult<string | null> {
    // Delegate to shared validator which handles optional fields
    return validateOptionalExternalUrl(url);
}

// =============================================================================
// Hotspot Input Validation
// =============================================================================

/**
 * Validate hotspot input for create/update operations
 */
export function validateHotspotInput(
    input: unknown
): ValidationResult<GalleryHotspotInput> {
    if (!input || typeof input !== 'object') {
        return invalidResult('輸入必須為物件');
    }

    const obj = input as Record<string, unknown>;
    const errors: Record<string, string> = {};

    // Validate x coordinate
    const xResult = validateCoordinate(obj.x, 'x');
    if (!xResult.valid) {
        errors.x = xResult.error!;
    }

    // Validate y coordinate
    const yResult = validateCoordinate(obj.y, 'y');
    if (!yResult.valid) {
        errors.y = yResult.error!;
    }

    // Validate media (required)
    if (!isNonEmptyString(obj.media)) {
        errors.media = '媒材名稱為必填';
    }

    // Validate description_md (required)
    if (!isNonEmptyString(obj.description_md)) {
        errors.description_md = '詳細描述為必填';
    }

    // Validate read_more_url (optional)
    const urlResult = validateReadMoreUrl(obj.read_more_url as string | null | undefined);
    if (!urlResult.valid) {
        errors.read_more_url = urlResult.error!;
    }

    // Return errors if any
    if (Object.keys(errors).length > 0) {
        return invalidResults(errors);
    }

    // Build validated input
    const validatedInput: GalleryHotspotInput = {
        x: xResult.data!,
        y: yResult.data!,
        media: (obj.media as string).trim(),
        description_md: (obj.description_md as string).trim(),
    };

    // Optional fields
    if (obj.preview !== undefined && obj.preview !== null) {
        const preview = typeof obj.preview === 'string' ? obj.preview.trim() : null;
        validatedInput.preview = preview || null;
    }

    if (obj.symbolism !== undefined && obj.symbolism !== null) {
        const symbolism = typeof obj.symbolism === 'string' ? obj.symbolism.trim() : null;
        validatedInput.symbolism = symbolism || null;
    }

    if (urlResult.data !== null) {
        validatedInput.read_more_url = urlResult.data;
    }

    if (typeof obj.is_visible === 'boolean') {
        validatedInput.is_visible = obj.is_visible;
    }

    return validResult(validatedInput);
}

// =============================================================================
// Reorder Input Validation
// =============================================================================

/**
 * Validate reorder input for batch sort_order update
 * Requires item_id to be valid UUID and ordered_ids to be array of valid UUIDs
 */
export function validateReorderInput(
    input: unknown
): ValidationResult<GalleryHotspotReorderInput> {
    if (!input || typeof input !== 'object') {
        return invalidResult('輸入必須為物件');
    }

    const obj = input as Record<string, unknown>;
    const errors: Record<string, string> = {};

    // Validate item_id
    if (!isValidUUID(obj.item_id)) {
        errors.item_id = 'item_id 必須為有效的 UUID';
    }

    // Validate ordered_ids
    if (!Array.isArray(obj.ordered_ids)) {
        errors.ordered_ids = 'ordered_ids 必須為陣列';
    } else if (obj.ordered_ids.length === 0) {
        errors.ordered_ids = 'ordered_ids 不可為空陣列';
    } else {
        const invalidIds = obj.ordered_ids.filter((id) => !isValidUUID(id));
        if (invalidIds.length > 0) {
            errors.ordered_ids = `包含無效的 UUID: ${invalidIds.slice(0, 3).join(', ')}${invalidIds.length > 3 ? '...' : ''}`;
        } else {
            // Check for duplicates
            const uniqueIds = new Set(obj.ordered_ids);
            if (uniqueIds.size !== obj.ordered_ids.length) {
                errors.ordered_ids = 'ordered_ids 包含重複的 UUID';
            }
        }
    }

    if (Object.keys(errors).length > 0) {
        return invalidResults(errors);
    }

    return validResult({
        item_id: obj.item_id as string,
        ordered_ids: obj.ordered_ids as string[],
    });
}
