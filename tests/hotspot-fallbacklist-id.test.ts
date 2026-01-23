/**
 * Hotspot Fallback List ID Tests
 *
 * PR-18: Guardrail tests to ensure HotspotFallbackList uses dynamic useId()
 * instead of hardcoded DOM id, preventing id collision when multiple instances exist.
 *
 * @see ARCHITECTURE.md §2 (Non-negotiable constraints)
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (Hotspots UI a11y)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const HOTSPOT_FALLBACK_LIST_PATH = join(
    process.cwd(),
    'components/hotspots/HotspotFallbackList.tsx'
);

describe('Hotspot Fallback List ID (a11y compliance)', () => {
    describe('HotspotFallbackList component', () => {
        it('must use useId() for dynamic id generation', () => {
            const content = readFileSync(HOTSPOT_FALLBACK_LIST_PATH, 'utf-8');

            // Assert: useId is imported from React
            const hasUseIdImport = /import\s*\{[^}]*useId[^}]*\}\s*from\s*['"]react['"]/.test(content);
            assert.ok(
                hasUseIdImport,
                'HotspotFallbackList must import useId from react'
            );

            // Assert: useId() is called to generate id
            const hasUseIdCall = /useId\s*\(\s*\)/.test(content);
            assert.ok(
                hasUseIdCall,
                'HotspotFallbackList must call useId() to generate dynamic id'
            );
        });

        it('must NOT use hardcoded id="hotspot-fallback-list"', () => {
            const content = readFileSync(HOTSPOT_FALLBACK_LIST_PATH, 'utf-8');

            // Assert: no hardcoded id="hotspot-fallback-list" exists
            const hasHardcodedId = /id\s*=\s*["']hotspot-fallback-list["']/.test(content);
            assert.ok(
                !hasHardcodedId,
                'HotspotFallbackList must NOT use hardcoded id="hotspot-fallback-list" (use dynamic useId() instead)'
            );

            // Assert: no hardcoded aria-controls="hotspot-fallback-list" exists
            const hasHardcodedAriaControls = /aria-controls\s*=\s*["']hotspot-fallback-list["']/.test(content);
            assert.ok(
                !hasHardcodedAriaControls,
                'HotspotFallbackList must NOT use hardcoded aria-controls="hotspot-fallback-list" (use dynamic useId() instead)'
            );
        });

        it('must have matching id and aria-controls using same variable', () => {
            const content = readFileSync(HOTSPOT_FALLBACK_LIST_PATH, 'utf-8');

            // Assert: id uses a variable (not string literal)
            const hasDynamicId = /id\s*=\s*\{[^}]+\}/.test(content);
            assert.ok(
                hasDynamicId,
                'HotspotFallbackList must use dynamic id (e.g., id={listId})'
            );

            // Assert: aria-controls uses a variable (not string literal)
            const hasDynamicAriaControls = /aria-controls\s*=\s*\{[^}]+\}/.test(content);
            assert.ok(
                hasDynamicAriaControls,
                'HotspotFallbackList must use dynamic aria-controls (e.g., aria-controls={listId})'
            );
        });
    });
});
