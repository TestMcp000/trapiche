/**
 * Hotspots Sorting Pure Functions
 *
 * Single source of truth for hotspots ordering logic.
 * Used by both public and admin IO modules.
 *
 * Ordering rules (per PRD Implementation Contract):
 * - Auto mode (all sort_order NULL): ORDER BY y ASC, x ASC, created_at ASC
 * - Manual mode (all sort_order NOT NULL): ORDER BY sort_order ASC, created_at ASC
 *
 * @module lib/modules/gallery/hotspots-sort
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md
 */

/**
 * Epsilon for float comparison (x, y coordinates)
 */
const COORDINATE_EPSILON = 0.001;

/**
 * Minimum shape for a sortable hotspot
 */
interface SortableHotspot {
    sort_order: number | null;
    x: number;
    y: number;
    created_at: string;
}

/**
 * Determine if hotspots are in manual ordering mode.
 * Manual mode: ALL sort_order values are NOT NULL.
 * Auto mode: ALL sort_order values are NULL.
 */
export function isManualOrderingMode<T extends Pick<SortableHotspot, 'sort_order'>>(
    hotspots: T[]
): boolean {
    if (hotspots.length === 0) {
        return false;
    }
    return hotspots.every((h) => h.sort_order !== null);
}

/**
 * Sort hotspots based on ordering mode.
 *
 * - Manual mode: sort_order ASC, then created_at ASC
 * - Auto mode: y ASC, x ASC, then created_at ASC (with epsilon comparison)
 *
 * This is a pure function - returns a new sorted array without mutating input.
 */
export function sortHotspots<T extends SortableHotspot>(hotspots: T[]): T[] {
    if (hotspots.length === 0) {
        return [];
    }

    const hasManualOrder = isManualOrderingMode(hotspots);

    return [...hotspots].sort((a, b) => {
        if (hasManualOrder) {
            // Manual mode: sort by sort_order, then created_at
            const orderDiff = (a.sort_order ?? 0) - (b.sort_order ?? 0);
            if (orderDiff !== 0) return orderDiff;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else {
            // Auto mode: sort by y, then x, then created_at
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) > COORDINATE_EPSILON) return yDiff;
            const xDiff = a.x - b.x;
            if (Math.abs(xDiff) > COORDINATE_EPSILON) return xDiff;
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
    });
}
