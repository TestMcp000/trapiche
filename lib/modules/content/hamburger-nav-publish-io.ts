/**
 * Hamburger Nav Publish IO
 *
 * Deep validation orchestrator for hamburger nav publish.
 * Delegates to specialized validation modules for blog and gallery targets.
 *
 * @module lib/modules/content/hamburger-nav-publish-io
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (Implementation Contract C)
 */

import 'server-only';

import type {
    HamburgerNavV2,
    NavTarget,
    NavDeepValidationError,
    NavDeepValidationResult,
} from '@/lib/types/hamburger-nav';
import {
    validateBlogPost,
    validateBlogCategory,
} from './hamburger-nav-publish-blog-validate-io';
import {
    validateGalleryItem,
    validateGalleryCategory,
} from './hamburger-nav-publish-gallery-validate-io';

/**
 * Validate a single target (deep validation)
 */
async function validateTarget(
    target: NavTarget,
    path: string
): Promise<NavDeepValidationError | null> {
    switch (target.type) {
        case 'blog_post':
            return validateBlogPost(target.postSlug, path);

        case 'blog_category':
            return validateBlogCategory(target.categorySlug, path);

        case 'gallery_item':
            return validateGalleryItem(target.categorySlug, target.itemSlug, path);

        case 'gallery_category':
            return validateGalleryCategory(target.categorySlug, path);

        case 'blog_index':
        case 'gallery_index':
        case 'page':
        case 'anchor':
        case 'external':
            return null;

        default: {
            const _exhaustive: never = target;
            return null;
        }
    }
}

/**
 * Deep validate hamburger nav for publish
 *
 * Verifies all internal targets point to existing, public content.
 * This should be called before publishing the nav.
 *
 * @param nav - The hamburger nav v2 structure to validate
 * @returns Validation result with any errors found
 */
export async function deepValidateHamburgerNav(
    nav: HamburgerNavV2
): Promise<NavDeepValidationResult> {
    const errors: NavDeepValidationError[] = [];
    const validationPromises: Promise<NavDeepValidationError | null>[] = [];

    for (let gi = 0; gi < nav.groups.length; gi++) {
        const group = nav.groups[gi];
        for (let ii = 0; ii < group.items.length; ii++) {
            const item = group.items[ii];
            const path = `groups[${gi}].items[${ii}].target`;
            validationPromises.push(validateTarget(item.target, path));
        }
    }

    const results = await Promise.all(validationPromises);

    for (const result of results) {
        if (result) {
            errors.push(result);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}
