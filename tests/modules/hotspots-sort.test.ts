/**
 * Hotspots Sorting Pure Function Tests
 *
 * Tests for the shared sorting logic used by both public and admin IO.
 *
 * @see lib/modules/gallery/hotspots-sort.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';

import { sortHotspots, isManualOrderingMode } from '@/lib/modules/gallery/hotspots-sort';

// Helper to create test hotspots
function createHotspot(overrides: Partial<{
    sort_order: number | null;
    x: number;
    y: number;
    created_at: string;
}> = {}) {
    return {
        sort_order: null,
        x: 0.5,
        y: 0.5,
        created_at: '2026-01-01T00:00:00Z',
        ...overrides,
    };
}

// =============================================================================
// isManualOrderingMode Tests
// =============================================================================

describe('isManualOrderingMode', () => {
    it('returns false for empty array', () => {
        const result = isManualOrderingMode([]);
        assert.strictEqual(result, false);
    });

    it('returns false when all sort_order are null (auto mode)', () => {
        const hotspots = [
            createHotspot({ sort_order: null }),
            createHotspot({ sort_order: null }),
        ];
        const result = isManualOrderingMode(hotspots);
        assert.strictEqual(result, false);
    });

    it('returns true when all sort_order are not null (manual mode)', () => {
        const hotspots = [
            createHotspot({ sort_order: 0 }),
            createHotspot({ sort_order: 1 }),
        ];
        const result = isManualOrderingMode(hotspots);
        assert.strictEqual(result, true);
    });

    it('returns false for mixed mode (some null, some not)', () => {
        const hotspots = [
            createHotspot({ sort_order: 0 }),
            createHotspot({ sort_order: null }),
        ];
        const result = isManualOrderingMode(hotspots);
        assert.strictEqual(result, false);
    });
});

// =============================================================================
// sortHotspots Tests - Auto Mode
// =============================================================================

describe('sortHotspots - auto mode', () => {
    it('returns empty array for empty input', () => {
        const result = sortHotspots([]);
        assert.deepStrictEqual(result, []);
    });

    it('sorts by y coordinate ascending first', () => {
        const hotspots = [
            createHotspot({ y: 0.8, x: 0.5 }),
            createHotspot({ y: 0.2, x: 0.5 }),
            createHotspot({ y: 0.5, x: 0.5 }),
        ];
        const result = sortHotspots(hotspots);
        assert.strictEqual(result[0].y, 0.2);
        assert.strictEqual(result[1].y, 0.5);
        assert.strictEqual(result[2].y, 0.8);
    });

    it('sorts by x coordinate when y is equal', () => {
        const hotspots = [
            createHotspot({ y: 0.5, x: 0.9 }),
            createHotspot({ y: 0.5, x: 0.1 }),
            createHotspot({ y: 0.5, x: 0.5 }),
        ];
        const result = sortHotspots(hotspots);
        assert.strictEqual(result[0].x, 0.1);
        assert.strictEqual(result[1].x, 0.5);
        assert.strictEqual(result[2].x, 0.9);
    });

    it('sorts by created_at when y and x are equal', () => {
        const hotspots = [
            createHotspot({ created_at: '2026-01-03T00:00:00Z' }),
            createHotspot({ created_at: '2026-01-01T00:00:00Z' }),
            createHotspot({ created_at: '2026-01-02T00:00:00Z' }),
        ];
        const result = sortHotspots(hotspots);
        assert.strictEqual(result[0].created_at, '2026-01-01T00:00:00Z');
        assert.strictEqual(result[1].created_at, '2026-01-02T00:00:00Z');
        assert.strictEqual(result[2].created_at, '2026-01-03T00:00:00Z');
    });

    it('treats very close y values as equal (epsilon 0.001)', () => {
        const hotspots = [
            createHotspot({ y: 0.5005, x: 0.9 }),
            createHotspot({ y: 0.5, x: 0.1 }),
        ];
        const result = sortHotspots(hotspots);
        // Should sort by x since y difference (0.0005) is < epsilon (0.001)
        assert.strictEqual(result[0].x, 0.1);
        assert.strictEqual(result[1].x, 0.9);
    });

    it('does not mutate the original array', () => {
        const hotspots = [
            createHotspot({ y: 0.8 }),
            createHotspot({ y: 0.2 }),
        ];
        const original = [...hotspots];
        sortHotspots(hotspots);
        assert.deepStrictEqual(hotspots, original);
    });
});

// =============================================================================
// sortHotspots Tests - Manual Mode
// =============================================================================

describe('sortHotspots - manual mode', () => {
    it('sorts by sort_order ascending', () => {
        const hotspots = [
            createHotspot({ sort_order: 2 }),
            createHotspot({ sort_order: 0 }),
            createHotspot({ sort_order: 1 }),
        ];
        const result = sortHotspots(hotspots);
        assert.strictEqual(result[0].sort_order, 0);
        assert.strictEqual(result[1].sort_order, 1);
        assert.strictEqual(result[2].sort_order, 2);
    });

    it('sorts by created_at when sort_order is equal', () => {
        const hotspots = [
            createHotspot({ sort_order: 0, created_at: '2026-01-03T00:00:00Z' }),
            createHotspot({ sort_order: 0, created_at: '2026-01-01T00:00:00Z' }),
        ];
        const result = sortHotspots(hotspots);
        assert.strictEqual(result[0].created_at, '2026-01-01T00:00:00Z');
        assert.strictEqual(result[1].created_at, '2026-01-03T00:00:00Z');
    });

    it('ignores x/y coordinates in manual mode', () => {
        const hotspots = [
            createHotspot({ sort_order: 1, y: 0.1, x: 0.1 }),
            createHotspot({ sort_order: 0, y: 0.9, x: 0.9 }),
        ];
        const result = sortHotspots(hotspots);
        // Should be sorted by sort_order, not by coordinates
        assert.strictEqual(result[0].sort_order, 0);
        assert.strictEqual(result[0].y, 0.9);
    });
});

// =============================================================================
// sortHotspots Edge Cases
// =============================================================================

describe('sortHotspots - edge cases', () => {
    it('handles single item', () => {
        const hotspots = [createHotspot()];
        const result = sortHotspots(hotspots);
        assert.strictEqual(result.length, 1);
    });

    it('handles already sorted input (auto mode)', () => {
        const hotspots = [
            createHotspot({ y: 0.1 }),
            createHotspot({ y: 0.5 }),
            createHotspot({ y: 0.9 }),
        ];
        const result = sortHotspots(hotspots);
        assert.strictEqual(result[0].y, 0.1);
        assert.strictEqual(result[2].y, 0.9);
    });

    it('handles already sorted input (manual mode)', () => {
        const hotspots = [
            createHotspot({ sort_order: 0 }),
            createHotspot({ sort_order: 1 }),
            createHotspot({ sort_order: 2 }),
        ];
        const result = sortHotspots(hotspots);
        assert.strictEqual(result[0].sort_order, 0);
        assert.strictEqual(result[2].sort_order, 2);
    });
});
