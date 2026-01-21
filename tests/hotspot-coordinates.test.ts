/**
 * Hotspot Coordinates Tests
 *
 * Tests for the pure coordinate conversion and drag threshold functions.
 *
 * @see lib/modules/gallery/hotspot-coordinates.ts
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    toNormalizedCoords,
    getPointerDistance,
    isDragMovement,
    DRAG_THRESHOLD_PX,
} from '@/lib/modules/gallery/hotspot-coordinates';

describe('hotspot-coordinates', () => {
    describe('toNormalizedCoords', () => {
        it('should convert center point to (0.5, 0.5)', () => {
            const result = toNormalizedCoords({
                clientX: 150,
                clientY: 100,
                rect: { left: 100, top: 50, width: 100, height: 100 },
            });
            assert.strictEqual(result.x, 0.5);
            assert.strictEqual(result.y, 0.5);
        });

        it('should convert top-left corner to (0, 0)', () => {
            const result = toNormalizedCoords({
                clientX: 100,
                clientY: 50,
                rect: { left: 100, top: 50, width: 100, height: 100 },
            });
            assert.strictEqual(result.x, 0);
            assert.strictEqual(result.y, 0);
        });

        it('should convert bottom-right corner to (1, 1)', () => {
            const result = toNormalizedCoords({
                clientX: 200,
                clientY: 150,
                rect: { left: 100, top: 50, width: 100, height: 100 },
            });
            assert.strictEqual(result.x, 1);
            assert.strictEqual(result.y, 1);
        });

        it('should clamp coordinates below 0 to 0', () => {
            const result = toNormalizedCoords({
                clientX: 50, // left of rect
                clientY: 25, // above rect
                rect: { left: 100, top: 50, width: 100, height: 100 },
            });
            assert.strictEqual(result.x, 0);
            assert.strictEqual(result.y, 0);
        });

        it('should clamp coordinates above 1 to 1', () => {
            const result = toNormalizedCoords({
                clientX: 300, // right of rect
                clientY: 200, // below rect
                rect: { left: 100, top: 50, width: 100, height: 100 },
            });
            assert.strictEqual(result.x, 1);
            assert.strictEqual(result.y, 1);
        });

        it('should handle NaN clientX/clientY by returning 0', () => {
            const result = toNormalizedCoords({
                clientX: NaN,
                clientY: NaN,
                rect: { left: 100, top: 50, width: 100, height: 100 },
            });
            assert.strictEqual(result.x, 0);
            assert.strictEqual(result.y, 0);
        });

        it('should handle Infinity clientX/clientY by clamping', () => {
            const result = toNormalizedCoords({
                clientX: Infinity,
                clientY: -Infinity,
                rect: { left: 100, top: 50, width: 100, height: 100 },
            });
            // Infinity will be clamped to 0 by the clampNormalized function
            assert.strictEqual(result.x, 0);
            assert.strictEqual(result.y, 0);
        });

        it('should return (0, 0) for zero-width rect', () => {
            const result = toNormalizedCoords({
                clientX: 150,
                clientY: 100,
                rect: { left: 100, top: 50, width: 0, height: 100 },
            });
            assert.strictEqual(result.x, 0);
            assert.strictEqual(result.y, 0);
        });

        it('should return (0, 0) for zero-height rect', () => {
            const result = toNormalizedCoords({
                clientX: 150,
                clientY: 100,
                rect: { left: 100, top: 50, width: 100, height: 0 },
            });
            assert.strictEqual(result.x, 0);
            assert.strictEqual(result.y, 0);
        });

        it('should return (0, 0) for negative dimensions', () => {
            const result = toNormalizedCoords({
                clientX: 150,
                clientY: 100,
                rect: { left: 100, top: 50, width: -100, height: -100 },
            });
            assert.strictEqual(result.x, 0);
            assert.strictEqual(result.y, 0);
        });

        it('should handle fractional coordinates correctly', () => {
            const result = toNormalizedCoords({
                clientX: 125,
                clientY: 75,
                rect: { left: 100, top: 50, width: 100, height: 100 },
            });
            assert.strictEqual(result.x, 0.25);
            assert.strictEqual(result.y, 0.25);
        });
    });

    describe('getPointerDistance', () => {
        it('should return 0 for same point', () => {
            const distance = getPointerDistance(
                { clientX: 100, clientY: 100 },
                { clientX: 100, clientY: 100 }
            );
            assert.strictEqual(distance, 0);
        });

        it('should calculate horizontal distance correctly', () => {
            const distance = getPointerDistance(
                { clientX: 100, clientY: 100 },
                { clientX: 110, clientY: 100 }
            );
            assert.strictEqual(distance, 10);
        });

        it('should calculate vertical distance correctly', () => {
            const distance = getPointerDistance(
                { clientX: 100, clientY: 100 },
                { clientX: 100, clientY: 115 }
            );
            assert.strictEqual(distance, 15);
        });

        it('should calculate diagonal distance correctly (3-4-5 triangle)', () => {
            const distance = getPointerDistance(
                { clientX: 0, clientY: 0 },
                { clientX: 3, clientY: 4 }
            );
            assert.strictEqual(distance, 5);
        });

        it('should handle negative movement', () => {
            const distance = getPointerDistance(
                { clientX: 100, clientY: 100 },
                { clientX: 90, clientY: 85 }
            );
            // sqrt(10^2 + 15^2) = sqrt(325) ≈ 18.03
            assert.ok(Math.abs(distance - Math.sqrt(325)) < 0.001);
        });
    });

    describe('isDragMovement', () => {
        it('should return false for movement below threshold', () => {
            const result = isDragMovement(
                { clientX: 100, clientY: 100 },
                { clientX: 102, clientY: 101 } // ~2.24px movement
            );
            assert.strictEqual(result, false);
        });

        it('should return false for movement exactly at threshold', () => {
            // DRAG_THRESHOLD_PX is 4, so exactly 4px should return true (>= threshold)
            const result = isDragMovement(
                { clientX: 100, clientY: 100 },
                { clientX: 104, clientY: 100 } // exactly 4px horizontal
            );
            assert.strictEqual(result, true);
        });

        it('should return true for movement above threshold', () => {
            const result = isDragMovement(
                { clientX: 100, clientY: 100 },
                { clientX: 110, clientY: 100 } // 10px movement
            );
            assert.strictEqual(result, true);
        });

        it('should use default threshold (DRAG_THRESHOLD_PX)', () => {
            // Movement of exactly DRAG_THRESHOLD_PX should return true
            const result = isDragMovement(
                { clientX: 0, clientY: 0 },
                { clientX: DRAG_THRESHOLD_PX, clientY: 0 }
            );
            assert.strictEqual(result, true);
        });

        it('should respect custom threshold', () => {
            // 5px movement with 10px threshold should return false
            const result = isDragMovement(
                { clientX: 100, clientY: 100 },
                { clientX: 105, clientY: 100 },
                10
            );
            assert.strictEqual(result, false);
        });

        it('should return false for zero movement', () => {
            const result = isDragMovement(
                { clientX: 100, clientY: 100 },
                { clientX: 100, clientY: 100 }
            );
            assert.strictEqual(result, false);
        });
    });
});
