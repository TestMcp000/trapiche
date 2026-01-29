/**
 * Hamburger Nav Validator
 *
 * Pure validation for hamburger nav v2 structure.
 * Used for draft save validation (no DB queries).
 *
 * @module lib/validators/hamburger-nav
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-9.7)
 */

import type {
    HamburgerNavV2,
    NavTargetType,
    NavValidationError,
    NavValidationResult,
} from '@/lib/types/hamburger-nav';
import { isValidSlug } from '@/lib/validators/slug';
import { validateExternalUrl as validateExternalUrlCore } from '@/lib/validators/external-url';

// =============================================================================
// Constants
// =============================================================================

/**
 * Allowed target types
 */
export const ALLOWED_TARGET_TYPES: readonly NavTargetType[] = [
    'blog_index',
    'blog_category',
    'blog_post',
    'blog_group',
    'blog_topic',
    'blog_tag',
    'gallery_index',
    'gallery_category',
    'gallery_item',
    'events_index',
    'event_detail',
    'faq_index',
    'page',
    'anchor',
    'external',
] as const;

/**
 * Allowed query parameters for index pages
 */
export const ALLOWED_QUERY_KEYS = new Set(['q', 'tag', 'sort', 'page']);

/**
 * Allowed protocols for external URLs
 * @deprecated Use ALLOWED_URL_PROTOCOLS from external-url.ts
 */
export const ALLOWED_PROTOCOLS = ['https:', 'mailto:'] as const;

// =============================================================================
// Low-Level Validators
// =============================================================================

/**
 * Validate a slug format
 */
function validateSlug(slug: string, path: string): NavValidationError | null {
    if (!slug || typeof slug !== 'string') {
        return { path, message: 'Slug 為必填，且必須為字串' };
    }
    if (!isValidSlug(slug)) {
        return { path, message: `Slug 格式無效：「${slug}」` };
    }
    return null;
}

/**
 * Allowed target-specific keys for each target type
 */
const TARGET_SPECIFIC_KEYS = new Set([
    'type',
    // Blog
    'categorySlug',
    'postSlug',
    'groupSlug',
    'topicSlug',
    'tagSlug',
    // Gallery
    'itemSlug',
    // Events
    'eventType',
    'eventSlug',
    'tag', // events_index tag filter
    // Page/Anchor/External
    'path',
    'hash',
    'url',
]);

/**
 * Validate query parameters
 */
function validateQueryParams(
    target: Record<string, unknown>,
    path: string
): NavValidationError[] {
    const errors: NavValidationError[] = [];
    const allowedKeys = new Set(TARGET_SPECIFIC_KEYS);

    for (const key of ALLOWED_QUERY_KEYS) {
        allowedKeys.add(key);
    }

    for (const key of Object.keys(target)) {
        if (!allowedKeys.has(key)) {
            errors.push({
                path: `${path}.${key}`,
                message: `未知屬性「${key}」`,
            });
        }
    }

    // Validate query values are strings if present
    for (const key of ALLOWED_QUERY_KEYS) {
        if (key in target && target[key] !== undefined) {
            const value = target[key];
            if (typeof value !== 'string') {
                errors.push({
                    path: `${path}.${key}`,
                    message: `查詢參數「${key}」必須為字串`,
                });
            }
        }
    }

    return errors;
}

/**
 * Validate external URL protocol
 * Uses shared external-url validator as single source of truth
 */
function validateExternalUrlNav(url: string, path: string): NavValidationError | null {
    if (!url || typeof url !== 'string') {
        return { path, message: 'URL 為必填，且必須為字串' };
    }

    const result = validateExternalUrlCore(url);
    if (!result.valid) {
        return { path, message: result.error || 'URL 格式無效' };
    }

    return null;
}

/**
 * Validate path format
 */
function validatePath(pathValue: string, path: string): NavValidationError | null {
    if (!pathValue || typeof pathValue !== 'string') {
        return { path, message: 'Path 為必填，且必須為字串' };
    }

    if (!pathValue.startsWith('/')) {
        return { path, message: 'Path 必須以 / 開頭' };
    }

    // Reject absolute URLs in path
    if (pathValue.includes('://')) {
        return { path, message: 'Path 必須為相對路徑，不能是絕對 URL' };
    }

    return null;
}

/**
 * Validate hash format
 */
function validateHash(hash: string, path: string): NavValidationError | null {
    if (!hash || typeof hash !== 'string') {
        return { path, message: 'Hash 為必填，且必須為字串' };
    }

    // Normalize: remove leading # if present
    const normalized = hash.startsWith('#') ? hash.slice(1) : hash;

    if (!normalized) {
        return { path, message: 'Hash 不能為空' };
    }

    // Basic validation: no spaces, common anchor format
    if (/\s/.test(normalized)) {
        return { path, message: 'Hash 不能包含空白字元' };
    }

    return null;
}

// =============================================================================
// Target Validators
// =============================================================================

/**
 * Validate a single nav target
 */
function validateTarget(target: unknown, path: string): NavValidationError[] {
    const errors: NavValidationError[] = [];

    if (!target || typeof target !== 'object') {
        errors.push({ path, message: 'Target 必須為物件' });
        return errors;
    }

    const t = target as Record<string, unknown>;

    // Check type field
    if (!t.type || typeof t.type !== 'string') {
        errors.push({ path: `${path}.type`, message: 'Target.type 為必填' });
        return errors;
    }

    if (!ALLOWED_TARGET_TYPES.includes(t.type as NavTargetType)) {
        errors.push({
            path: `${path}.type`,
            message: `目標類型「${t.type}」無效，可用類型：${ALLOWED_TARGET_TYPES.join(', ')}`,
        });
        return errors;
    }

    // Type-specific validation
    switch (t.type) {
        case 'blog_index':
        case 'gallery_index':
            errors.push(...validateQueryParams(t, path));
            break;

        case 'blog_category': {
            const slugError = validateSlug(t.categorySlug as string, `${path}.categorySlug`);
            if (slugError) errors.push(slugError);
            errors.push(...validateQueryParams(t, path));
            break;
        }

        case 'blog_post': {
            const slugError = validateSlug(t.postSlug as string, `${path}.postSlug`);
            if (slugError) errors.push(slugError);
            break;
        }

        case 'blog_group': {
            const slugError = validateSlug(t.groupSlug as string, `${path}.groupSlug`);
            if (slugError) errors.push(slugError);
            errors.push(...validateQueryParams(t, path));
            break;
        }

        case 'blog_topic': {
            const slugError = validateSlug(t.topicSlug as string, `${path}.topicSlug`);
            if (slugError) errors.push(slugError);
            errors.push(...validateQueryParams(t, path));
            break;
        }

        case 'blog_tag': {
            const slugError = validateSlug(t.tagSlug as string, `${path}.tagSlug`);
            if (slugError) errors.push(slugError);
            errors.push(...validateQueryParams(t, path));
            break;
        }

        case 'gallery_category': {
            const slugError = validateSlug(t.categorySlug as string, `${path}.categorySlug`);
            if (slugError) errors.push(slugError);
            errors.push(...validateQueryParams(t, path));
            break;
        }

        case 'gallery_item': {
            const catError = validateSlug(t.categorySlug as string, `${path}.categorySlug`);
            if (catError) errors.push(catError);
            const itemError = validateSlug(t.itemSlug as string, `${path}.itemSlug`);
            if (itemError) errors.push(itemError);
            break;
        }

        case 'events_index': {
            // eventType is optional, validate slug format if present
            if (t.eventType !== undefined) {
                const slugError = validateSlug(t.eventType as string, `${path}.eventType`);
                if (slugError) errors.push(slugError);
            }
            errors.push(...validateQueryParams(t, path));
            break;
        }

        case 'event_detail': {
            const slugError = validateSlug(t.eventSlug as string, `${path}.eventSlug`);
            if (slugError) errors.push(slugError);
            break;
        }

        case 'faq_index':
            // No additional parameters required for faq_index
            break;

        case 'page': {
            const pathError = validatePath(t.path as string, `${path}.path`);
            if (pathError) errors.push(pathError);
            if (t.hash !== undefined) {
                const hashError = validateHash(t.hash as string, `${path}.hash`);
                if (hashError) errors.push(hashError);
            }
            break;
        }

        case 'anchor': {
            const hashError = validateHash(t.hash as string, `${path}.hash`);
            if (hashError) errors.push(hashError);
            break;
        }

        case 'external': {
            const urlError = validateExternalUrlNav(t.url as string, `${path}.url`);
            if (urlError) errors.push(urlError);
            break;
        }
    }

    return errors;
}

/**
 * Validate a single nav item
 */
function validateNavItem(item: unknown, path: string): NavValidationError[] {
    const errors: NavValidationError[] = [];

    if (!item || typeof item !== 'object') {
        errors.push({ path, message: 'Item 必須為物件' });
        return errors;
    }

    const i = item as Record<string, unknown>;

    // Validate id
    if (!i.id || typeof i.id !== 'string') {
        errors.push({ path: `${path}.id`, message: 'Item.id 為必填，且必須為字串' });
    }

    // Validate label
    if (!i.label || typeof i.label !== 'string') {
        errors.push({ path: `${path}.label`, message: 'Item.label 為必填，且必須為字串' });
    }

    // Validate target
    errors.push(...validateTarget(i.target, `${path}.target`));

    return errors;
}

/**
 * Validate a single nav group
 */
function validateNavGroup(group: unknown, path: string): NavValidationError[] {
    const errors: NavValidationError[] = [];

    if (!group || typeof group !== 'object') {
        errors.push({ path, message: 'Group 必須為物件' });
        return errors;
    }

    const g = group as Record<string, unknown>;

    // Validate id
    if (!g.id || typeof g.id !== 'string') {
        errors.push({ path: `${path}.id`, message: 'Group.id 為必填，且必須為字串' });
    }

    // Validate label
    if (!g.label || typeof g.label !== 'string') {
        errors.push({ path: `${path}.label`, message: 'Group.label 為必填，且必須為字串' });
    }

    // Validate items
    if (!Array.isArray(g.items)) {
        errors.push({ path: `${path}.items`, message: 'Group.items 必須為陣列' });
    } else {
        g.items.forEach((item, index) => {
            errors.push(...validateNavItem(item, `${path}.items[${index}]`));
        });
    }

    return errors;
}

// =============================================================================
// Main Validator
// =============================================================================

/**
 * Validate a complete hamburger nav v2 structure
 *
 * @param nav - The nav structure to validate
 * @returns Validation result with errors
 */
export function validateHamburgerNav(nav: unknown): NavValidationResult {
    const errors: NavValidationError[] = [];

    if (!nav || typeof nav !== 'object') {
        return { valid: false, errors: [{ path: '', message: 'Nav 必須為物件' }] };
    }

    const n = nav as Record<string, unknown>;

    // Validate version
    if (n.version !== 2) {
        errors.push({ path: 'version', message: 'version 必須為 2' });
    }

    // Validate groups
    if (!Array.isArray(n.groups)) {
        errors.push({ path: 'groups', message: 'groups 必須為陣列' });
    } else {
        n.groups.forEach((group, index) => {
            errors.push(...validateNavGroup(group, `groups[${index}]`));
        });

        // Check for duplicate group ids
        const groupIds = new Set<string>();
        n.groups.forEach((group: unknown, index: number) => {
            const g = group as { id?: string };
            if (g?.id) {
                if (groupIds.has(g.id)) {
                    errors.push({
                        path: `groups[${index}].id`,
                        message: `重複的群組 id：「${g.id}」`,
                    });
                }
                groupIds.add(g.id);
            }
        });
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Type guard to check if a value is a valid HamburgerNavV2
 */
export function isHamburgerNavV2(value: unknown): value is HamburgerNavV2 {
    return validateHamburgerNav(value).valid;
}

/**
 * Parse and validate hamburger nav from JSON
 *
 * @param json - JSON string or object to parse
 * @returns Parsed nav or validation errors
 */
export function parseHamburgerNav(
    json: string | Record<string, unknown>
): { nav: HamburgerNavV2 | null; errors: NavValidationError[] } {
    let parsed: unknown;

    if (typeof json === 'string') {
        try {
            parsed = JSON.parse(json);
        } catch (e) {
            return {
                nav: null,
                errors: [{ path: '', message: `JSON 無效：${e instanceof Error ? e.message : '解析失敗'}` }],
            };
        }
    } else {
        parsed = json;
    }

    const result = validateHamburgerNav(parsed);

    if (!result.valid) {
        return { nav: null, errors: result.errors };
    }

    return { nav: parsed as HamburgerNavV2, errors: [] };
}
