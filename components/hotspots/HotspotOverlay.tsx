'use client';

/**
 * HotspotOverlay - Container component for positioning pins over an image
 *
 * Wraps an image and renders interactive pins at their normalized coordinates.
 * Manages the mapping between hotspot data and pin components.
 *
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-5, FR-7)
 */

import { type ReactNode } from 'react';
import { HotspotPinClient } from './HotspotPinClient';
import type { GalleryHotspotPublic } from '@/lib/types/gallery';

interface HotspotOverlayProps {
  /** Array of hotspot data to render as pins */
  hotspots: GalleryHotspotPublic[];
  /** The image element to overlay pins on */
  children: ReactNode;
  /** Currently active/selected hotspot ID */
  activeHotspotId: string | null;
  /** Callback when a hotspot is selected */
  onSelectHotspot: (id: string) => void;
  /** Optional CSS class for the container */
  className?: string;
}

export function HotspotOverlay({
  hotspots,
  children,
  activeHotspotId,
  onSelectHotspot,
  className = '',
}: HotspotOverlayProps) {
  // Don't render pins layer if no hotspots
  if (hotspots.length === 0) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Image container */}
      {children}

      {/* Pins overlay layer */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-label="作品媒材標記"
        role="group"
      >
      {hotspots.map((hotspot, index) => (
          <div key={hotspot.id} className="pointer-events-auto">
            <HotspotPinClient
              id={hotspot.id}
              x={hotspot.x}
              y={hotspot.y}
              isActive={activeHotspotId === hotspot.id}
              displayIndex={index + 1}
              totalCount={hotspots.length}
              onActivate={onSelectHotspot}
              mediaLabel={hotspot.media}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default HotspotOverlay;
