/**
 * Gallery Hotspots Validator Tests
 *
 * Test coverage for:
 * - Coordinate validation (edge cases)
 * - Required field validation
 * - URL allowlist (https/mailto)
 * - Reorder payload validation
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import {
    validateCoordinate,
    validateReadMoreUrl,
    validateHotspotInput,
    validateReorderInput,
} from '@/lib/validators/gallery-hotspots';

// =============================================================================
// Coordinate Validation Tests
// =============================================================================

describe('validateCoordinate', () => {
    it('accepts 0 (minimum)', () => {
        const result = validateCoordinate(0, 'x');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data, 0);
    });

    it('accepts 1 (maximum)', () => {
        const result = validateCoordinate(1, 'y');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data, 1);
    });

    it('accepts 0.5 (middle)', () => {
        const result = validateCoordinate(0.5, 'x');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data, 0.5);
    });

    it('rejects negative values', () => {
        const result = validateCoordinate(-0.1, 'x');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('0 到 1'));
    });

    it('rejects values > 1', () => {
        const result = validateCoordinate(1.1, 'y');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('0 到 1'));
    });

    it('rejects NaN', () => {
        const result = validateCoordinate(NaN, 'x');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('有效數字'));
    });

    it('rejects Infinity', () => {
        const result = validateCoordinate(Infinity, 'y');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('有效數字'));
    });

    it('rejects string', () => {
        const result = validateCoordinate('0.5', 'x');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('有效數字'));
    });

    it('rejects undefined', () => {
        const result = validateCoordinate(undefined, 'y');
        assert.strictEqual(result.valid, false);
    });
});

// =============================================================================
// URL Validation Tests
// =============================================================================

describe('validateReadMoreUrl', () => {
    it('accepts null (optional field)', () => {
        const result = validateReadMoreUrl(null);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data, null);
    });

    it('accepts undefined (optional field)', () => {
        const result = validateReadMoreUrl(undefined);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data, null);
    });

    it('accepts empty string (optional field)', () => {
        const result = validateReadMoreUrl('');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data, null);
    });

    it('accepts https URL', () => {
        const url = 'https://example.com/page';
        const result = validateReadMoreUrl(url);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data, url);
    });

    it('accepts mailto URL', () => {
        const url = 'mailto:test@example.com';
        const result = validateReadMoreUrl(url);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data, url);
    });

    it('rejects http URL', () => {
        const result = validateReadMoreUrl('http://example.com');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('https:'));
    });

    it('rejects javascript URL', () => {
        const result = validateReadMoreUrl('javascript:alert(1)');
        assert.strictEqual(result.valid, false);
        // Error message from shared validator mentions the dangerous protocol
        assert.ok(result.error?.includes('javascript:') || result.error?.includes('安全限制'));
    });

    it('rejects data URL', () => {
        const result = validateReadMoreUrl('data:text/html,<script>alert(1)</script>');
        assert.strictEqual(result.valid, false);
    });

    it('rejects ftp URL', () => {
        const result = validateReadMoreUrl('ftp://files.example.com');
        assert.strictEqual(result.valid, false);
    });

    it('rejects invalid URL format', () => {
        const result = validateReadMoreUrl('not-a-url');
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('格式無效'));
    });

    it('trims whitespace', () => {
        const result = validateReadMoreUrl('  https://example.com  ');
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data, 'https://example.com');
    });
});

// =============================================================================
// Hotspot Input Validation Tests
// =============================================================================

describe('validateHotspotInput', () => {
    const validInput = {
        x: 0.5,
        y: 0.3,
        media: '油畫',
        description_md: '這是一幅美麗的油畫作品。',
    };

    it('accepts valid input with required fields only', () => {
        const result = validateHotspotInput(validInput);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data?.x, 0.5);
        assert.strictEqual(result.data?.y, 0.3);
        assert.strictEqual(result.data?.media, '油畫');
        assert.strictEqual(result.data?.description_md, '這是一幅美麗的油畫作品。');
    });

    it('accepts valid input with all optional fields', () => {
        const fullInput = {
            ...validInput,
            preview: '一句話預覽',
            symbolism: '象徵意涵',
            read_more_url: 'https://example.com/more',
            is_visible: false,
        };
        const result = validateHotspotInput(fullInput);
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data?.preview, '一句話預覽');
        assert.strictEqual(result.data?.symbolism, '象徵意涵');
        assert.strictEqual(result.data?.read_more_url, 'https://example.com/more');
        assert.strictEqual(result.data?.is_visible, false);
    });

    it('rejects null input', () => {
        const result = validateHotspotInput(null);
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('物件'));
    });

    it('rejects missing x coordinate', () => {
        const { x: _, ...inputWithoutX } = validInput;
        const result = validateHotspotInput(inputWithoutX);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.x);
    });

    it('rejects missing y coordinate', () => {
        const { y: _, ...inputWithoutY } = validInput;
        const result = validateHotspotInput(inputWithoutY);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.y);
    });

    it('rejects missing media', () => {
        const { media: _, ...inputWithoutMedia } = validInput;
        const result = validateHotspotInput(inputWithoutMedia);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.media);
    });

    it('rejects empty media', () => {
        const result = validateHotspotInput({ ...validInput, media: '  ' });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.media);
    });

    it('rejects missing description_md', () => {
        const { description_md: _, ...inputWithoutDesc } = validInput;
        const result = validateHotspotInput(inputWithoutDesc);
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.description_md);
    });

    it('rejects empty description_md', () => {
        const result = validateHotspotInput({ ...validInput, description_md: '' });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.description_md);
    });

    it('rejects invalid read_more_url', () => {
        const result = validateHotspotInput({
            ...validInput,
            read_more_url: 'javascript:alert(1)',
        });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.read_more_url);
    });

    it('collects multiple errors', () => {
        const result = validateHotspotInput({
            x: -1,
            y: 2,
            media: '',
            description_md: '',
        });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.x);
        assert.ok(result.errors?.y);
        assert.ok(result.errors?.media);
        assert.ok(result.errors?.description_md);
    });

    it('trims string fields', () => {
        const result = validateHotspotInput({
            ...validInput,
            media: '  油畫  ',
            description_md: '  描述內容  ',
            preview: '  預覽  ',
        });
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data?.media, '油畫');
        assert.strictEqual(result.data?.description_md, '描述內容');
        assert.strictEqual(result.data?.preview, '預覽');
    });

    it('converts empty optional strings to null', () => {
        const result = validateHotspotInput({
            ...validInput,
            preview: '   ',
            symbolism: '',
        });
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data?.preview, null);
        assert.strictEqual(result.data?.symbolism, null);
    });
});

// =============================================================================
// Reorder Input Validation Tests
// =============================================================================

describe('validateReorderInput', () => {
    const validUUID1 = '550e8400-e29b-41d4-a716-446655440001';
    const validUUID2 = '550e8400-e29b-41d4-a716-446655440002';
    const validUUID3 = '550e8400-e29b-41d4-a716-446655440003';

    it('accepts valid reorder input', () => {
        const result = validateReorderInput({
            item_id: validUUID1,
            ordered_ids: [validUUID2, validUUID3],
        });
        assert.strictEqual(result.valid, true);
        assert.strictEqual(result.data?.item_id, validUUID1);
        assert.deepStrictEqual(result.data?.ordered_ids, [validUUID2, validUUID3]);
    });

    it('rejects null input', () => {
        const result = validateReorderInput(null);
        assert.strictEqual(result.valid, false);
        assert.ok(result.error?.includes('物件'));
    });

    it('rejects invalid item_id', () => {
        const result = validateReorderInput({
            item_id: 'not-a-uuid',
            ordered_ids: [validUUID1],
        });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.item_id);
    });

    it('rejects missing ordered_ids', () => {
        const result = validateReorderInput({
            item_id: validUUID1,
        });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.ordered_ids);
    });

    it('rejects non-array ordered_ids', () => {
        const result = validateReorderInput({
            item_id: validUUID1,
            ordered_ids: 'not-an-array',
        });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.ordered_ids?.includes('陣列'));
    });

    it('rejects empty ordered_ids array', () => {
        const result = validateReorderInput({
            item_id: validUUID1,
            ordered_ids: [],
        });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.ordered_ids?.includes('空陣列'));
    });

    it('rejects ordered_ids with invalid UUIDs', () => {
        const result = validateReorderInput({
            item_id: validUUID1,
            ordered_ids: [validUUID2, 'invalid-uuid', validUUID3],
        });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.ordered_ids?.includes('無效的 UUID'));
    });

    it('shows first few invalid UUIDs in error message', () => {
        const result = validateReorderInput({
            item_id: validUUID1,
            ordered_ids: ['bad1', 'bad2', 'bad3', 'bad4'],
        });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.ordered_ids?.includes('bad1'));
        assert.ok(result.errors?.ordered_ids?.includes('...'));
    });

    it('rejects ordered_ids with duplicate UUIDs', () => {
        const result = validateReorderInput({
            item_id: validUUID1,
            ordered_ids: [validUUID2, validUUID3, validUUID2], // validUUID2 is duplicated
        });
        assert.strictEqual(result.valid, false);
        assert.ok(result.errors?.ordered_ids?.includes('重複'));
    });
});
