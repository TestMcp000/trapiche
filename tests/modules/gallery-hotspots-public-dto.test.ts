/**
 * Gallery Hotspots Public DTO Tests
 *
 * Ensures untrusted URL fields are hardened at the public boundary.
 *
 * @see lib/modules/gallery/gallery-hotspots-io.ts
 * @see lib/validators/external-url.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { toGalleryHotspotPublic } from '@/lib/modules/gallery/gallery-hotspots-io';

function createRow(overrides: Partial<{
    id: string;
    x: number;
    y: number;
    media: string;
    preview: string | null;
    symbolism: string | null;
    description_md: string;
    read_more_url: string | null;
}> = {}) {
    return {
        id: 'hotspot-1',
        x: 0.5,
        y: 0.5,
        media: '水彩',
        preview: null,
        symbolism: null,
        description_md: 'hello',
        read_more_url: null,
        ...overrides,
    };
}

describe('toGalleryHotspotPublic', () => {
    it('keeps https: URLs', () => {
        const dto = toGalleryHotspotPublic(
            createRow({ read_more_url: 'https://example.com/page' })
        );
        assert.strictEqual(dto.read_more_url, 'https://example.com/page');
    });

    it('keeps mailto: URLs', () => {
        const dto = toGalleryHotspotPublic(
            createRow({ read_more_url: 'mailto:test@example.com' })
        );
        assert.strictEqual(dto.read_more_url, 'mailto:test@example.com');
    });

    it('trims valid URLs', () => {
        const dto = toGalleryHotspotPublic(
            createRow({ read_more_url: '  https://example.com/page  ' })
        );
        assert.strictEqual(dto.read_more_url, 'https://example.com/page');
    });

    it('drops invalid URLs (javascript:)', () => {
        const dto = toGalleryHotspotPublic(
            createRow({ read_more_url: 'javascript:alert(1)' })
        );
        assert.strictEqual(dto.read_more_url, null);
    });

    it('drops invalid URLs (http:)', () => {
        const dto = toGalleryHotspotPublic(
            createRow({ read_more_url: 'http://example.com' })
        );
        assert.strictEqual(dto.read_more_url, null);
    });

    it('drops protocol-relative URLs (//example.com)', () => {
        const dto = toGalleryHotspotPublic(
            createRow({ read_more_url: '//example.com' })
        );
        assert.strictEqual(dto.read_more_url, null);
    });
});

