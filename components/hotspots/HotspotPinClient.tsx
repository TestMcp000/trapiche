'use client';

/**
 * HotspotPinClient - Interactive pin button for gallery hotspots
 *
 * Client component that renders an interactive pin positioned over an image.
 * Aligned with doc/archive/DESIGN_SSOT.md §3.
 *
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-5, FR-7)
 */

import { useCallback, type KeyboardEvent } from 'react';

interface HotspotPinClientProps {
  /** Unique identifier for the hotspot */
  id: string;
  /** Normalized X coordinate (0-1) as percentage */
  x: number;
  /** Normalized Y coordinate (0-1) as percentage */
  y: number;
  /** Whether this pin is currently active/selected */
  isActive: boolean;
  /** 1-based index for display order (used in aria-label) */
  displayIndex: number;
  /** Total number of hotspots (for aria-label context) */
  totalCount?: number;
  /** Callback when pin is activated (click/keyboard) */
  onActivate: (id: string) => void;
  /** Optional media label for screen readers */
  mediaLabel?: string;
}

export function HotspotPinClient({
  id,
  x,
  y,
  isActive,
  displayIndex,
  totalCount,
  onActivate,
  mediaLabel,
}: HotspotPinClientProps) {
  // Build semantic aria-label: "媒材標記 第 X 個，共 N 個：{mediaLabel}"
  const ariaLabel = totalCount
    ? `媒材標記 第 ${displayIndex} 個，共 ${totalCount} 個${mediaLabel ? `：${mediaLabel}` : ''}`
    : `媒材標記 ${displayIndex}${mediaLabel ? `：${mediaLabel}` : ''}`;
  const handleClick = useCallback(() => {
    onActivate(id);
  }, [id, onActivate]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onActivate(id);
      }
    },
    [id, onActivate]
  );

  return (
    <button
      type="button"
      className="absolute cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary transition-transform duration-200 ease-out hover:scale-105 hover:-translate-y-0.5"
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        transform: 'translate(-50%, -50%)',
        zIndex: isActive ? 20 : 10,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={isActive}
      data-hotspot-id={id}
    >
      {/* Pin body with organic shape */}
      <div
        className={`
          relative w-8 h-8 md:w-10 md:h-10
          transition-all duration-200 ease-out
          ${isActive ? 'scale-110' : 'group-hover:scale-105'}
        `}
        style={{
          backgroundColor: isActive ? '#F3AE69' : '#CC5544',
          borderRadius: '47% 53% 45% 55% / 52% 48% 52% 48%',
          boxShadow: isActive
            ? '0 4px 12px rgba(243, 174, 105, 0.4)'
            : '0 2px 8px rgba(204, 85, 68, 0.3)',
        }}
      >
        {/* Inner highlight dot for depth */}
        <div
          className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-white/40 rounded-full"
          style={{ transform: 'translate(-50%, -50%)' }}
        />
      </div>
    </button>
  );
}

export default HotspotPinClient;
