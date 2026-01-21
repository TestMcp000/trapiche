'use client';

/**
 * HotspotFallbackList - Collapsible list for mobile/accessibility
 *
 * Provides an alternative way to access hotspots for:
 * - Mobile users (where hover doesn't work)
 * - Screen reader users
 * - Keyboard-only navigation
 *
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-7.2)
 */

import { useState, useCallback, useId } from 'react';
import type { GalleryHotspotPublic } from '@/lib/types/gallery';

// Inline SVG icons to avoid external dependencies
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

interface HotspotFallbackListProps {
  /** Array of hotspots to display in the list */
  hotspots: GalleryHotspotPublic[];
  /** Currently active hotspot ID */
  activeHotspotId: string | null;
  /** Callback when a hotspot is selected from the list */
  onSelectHotspot: (id: string) => void;
  /** Label for the toggle button */
  toggleLabel: string;
  /** Optional CSS class */
  className?: string;
}

export function HotspotFallbackList({
  hotspots,
  activeHotspotId,
  onSelectHotspot,
  toggleLabel,
  className = '',
}: HotspotFallbackListProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const listId = useId();

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleItemClick = useCallback(
    (id: string) => {
      onSelectHotspot(id);
    },
    [onSelectHotspot]
  );

  // Don't render if no hotspots
  if (hotspots.length === 0) return null;

  return (
    <div className={`${className}`}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={toggleExpand}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-secondary hover:text-foreground bg-surface-raised hover:bg-surface-raised/80 rounded-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-expanded={isExpanded}
        aria-controls={listId}
      >
        <span>
          {toggleLabel} ({hotspots.length})
        </span>
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4" />
        ) : (
          <ChevronDownIcon className="w-4 h-4" />
        )}
      </button>

      {/* Expandable List */}
      {isExpanded && (
        <div
          id={listId}
          className="mt-2 bg-surface-raised rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-200"
          role="list"
        >
          {hotspots.map((hotspot, index) => (
            <button
              key={hotspot.id}
              type="button"
              onClick={() => handleItemClick(hotspot.id)}
              className={`
                w-full text-left px-4 py-3 flex items-start gap-3
                hover:bg-primary/5 transition-colors duration-150
                focus:outline-none focus-visible:bg-primary/10
                ${activeHotspotId === hotspot.id ? 'bg-primary/10' : ''}
                ${index > 0 ? 'border-t border-border-light' : ''}
              `}
              role="listitem"
              aria-current={activeHotspotId === hotspot.id ? 'true' : undefined}
            >
              {/* Index number */}
              <span className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-medium">
                {index + 1}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{hotspot.media}</p>
                {hotspot.preview && (
                  <p className="text-sm text-secondary mt-0.5 line-clamp-2">
                    {hotspot.preview}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default HotspotFallbackList;
