/**
 * Hotspot Coordinates Helper (Pure)
 *
 * Pure functions for converting and validating hotspot coordinates.
 * Used by Admin UI for drag-to-move functionality.
 *
 * @see ARCHITECTURE.md §4.3 - Pure Modules
 */

// =============================================================================
// Types
// =============================================================================

export interface ClientCoordinates {
    clientX: number;
    clientY: number;
}

export interface BoundingRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

export interface NormalizedCoords {
    x: number;
    y: number;
}

// =============================================================================
// Constants
// =============================================================================

/** Minimum drag distance in pixels to be considered a drag (vs. click) */
export const DRAG_THRESHOLD_PX = 4;

// =============================================================================
// Pure Functions
// =============================================================================

/**
 * Clamp a value to the range [0, 1].
 * Handles NaN and Infinity by returning 0.
 */
function clampNormalized(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.min(1, value));
}

/**
 * Convert client coordinates to normalized (0..1) coordinates
 * relative to an element's bounding rect.
 *
 * @param params.clientX - Client X coordinate (e.g., from pointer event)
 * @param params.clientY - Client Y coordinate (e.g., from pointer event)
 * @param params.rect - Bounding rect of the target element
 * @returns Normalized coordinates clamped to [0, 1]
 */
export function toNormalizedCoords(params: {
    clientX: number;
    clientY: number;
    rect: BoundingRect;
}): NormalizedCoords {
    const { clientX, clientY, rect } = params;

    // Guard against invalid rect dimensions
    if (rect.width <= 0 || rect.height <= 0) {
        return { x: 0, y: 0 };
    }

    // Calculate relative position
    const relativeX = (clientX - rect.left) / rect.width;
    const relativeY = (clientY - rect.top) / rect.height;

    // Clamp to valid range
    return {
        x: clampNormalized(relativeX),
        y: clampNormalized(relativeY),
    };
}

/**
 * Calculate the distance in pixels between two client coordinates.
 *
 * @param start - Starting client coordinates
 * @param end - Ending client coordinates
 * @returns Distance in pixels
 */
export function getPointerDistance(
    start: ClientCoordinates,
    end: ClientCoordinates
): number {
    const dx = end.clientX - start.clientX;
    const dy = end.clientY - start.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if the pointer has moved beyond the drag threshold.
 *
 * @param start - Starting client coordinates
 * @param end - Ending client coordinates
 * @param threshold - Distance threshold in pixels (default: DRAG_THRESHOLD_PX)
 * @returns true if movement exceeds threshold
 */
export function isDragMovement(
    start: ClientCoordinates,
    end: ClientCoordinates,
    threshold: number = DRAG_THRESHOLD_PX
): boolean {
    return getPointerDistance(start, end) >= threshold;
}
