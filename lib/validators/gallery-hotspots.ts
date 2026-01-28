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
// Hotspot Patch Validation (Partial Updates)
// =============================================================================

/**
 * Validate hotspot patch input for partial update operations.
 *
 * Allows updating any subset of fields without requiring all required fields,
 * while still validating each provided field with the same rules as create.
 *
 * This is used for admin actions like "drag pin to move" which updates only x/y.
 */
export function validateHotspotPatch(
    input: unknown
): ValidationResult<Partial<GalleryHotspotInput>> {
    if (!input || typeof input !== 'object') {
        return invalidResult('輸入必須為物件');
    }

    const obj = input as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const validated: Partial<GalleryHotspotInput> = {};

    const hasAnyField =
        'x' in obj ||
        'y' in obj ||
        'media' in obj ||
        'description_md' in obj ||
        'preview' in obj ||
        'symbolism' in obj ||
        'read_more_url' in obj ||
        'is_visible' in obj;

    if (!hasAnyField) {
        return invalidResult('沒有要更新的欄位');
    }

    if ('x' in obj) {
        const xResult = validateCoordinate(obj.x, 'x');
        if (!xResult.valid) {
            errors.x = xResult.error!;
        } else {
            validated.x = xResult.data!;
        }
    }

    if ('y' in obj) {
        const yResult = validateCoordinate(obj.y, 'y');
        if (!yResult.valid) {
            errors.y = yResult.error!;
        } else {
            validated.y = yResult.data!;
        }
    }

    if ('media' in obj) {
        if (!isNonEmptyString(obj.media)) {
            errors.media = '媒材名稱為必填';
        } else {
            validated.media = (obj.media as string).trim();
        }
    }

    if ('description_md' in obj) {
        if (!isNonEmptyString(obj.description_md)) {
            errors.description_md = '詳細描述為必填';
        } else {
            validated.description_md = (obj.description_md as string).trim();
        }
    }

    if ('preview' in obj) {
        if (obj.preview === null || obj.preview === undefined) {
            validated.preview = null;
        } else if (typeof obj.preview !== 'string') {
            errors.preview = 'preview 必須為字串';
        } else {
            const trimmed = obj.preview.trim();
            validated.preview = trimmed === '' ? null : trimmed;
        }
    }

    if ('symbolism' in obj) {
        if (obj.symbolism === null || obj.symbolism === undefined) {
            validated.symbolism = null;
        } else if (typeof obj.symbolism !== 'string') {
            errors.symbolism = 'symbolism 必須為字串';
        } else {
            const trimmed = obj.symbolism.trim();
            validated.symbolism = trimmed === '' ? null : trimmed;
        }
    }

    if ('read_more_url' in obj) {
        const urlResult = validateReadMoreUrl(
            obj.read_more_url as string | null | undefined
        );
        if (!urlResult.valid) {
            errors.read_more_url = urlResult.error!;
        } else {
            validated.read_more_url = urlResult.data!;
        }
    }

    if ('is_visible' in obj) {
        if (typeof obj.is_visible !== 'boolean') {
            errors.is_visible = 'is_visible 必須為布林值';
        } else {
            validated.is_visible = obj.is_visible;
        }
    }

    if (Object.keys(errors).length > 0) {
        return invalidResults(errors);
    }

    return validResult(validated);
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
