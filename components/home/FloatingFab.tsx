'use client';

/**
 * FloatingFab - Floating action button for lecture invitation
 *
 * Fixed position button that links to the event CTA URL.
 * Expandable on mobile, always visible on desktop.
 *
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-11)
 */

import { useState, useCallback } from 'react';

interface FloatingFabProps {
  /** URL to link to */
  href: string;
  /** Button label */
  label: string;
  /** Whether to show mobile variant */
  isMobile?: boolean;
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg className="w-4 h-4 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  );
}

export function FloatingFab({ href, label, isMobile = false }: FloatingFabProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleClick = useCallback(() => {
    if (isMobile && !isExpanded) {
      setIsExpanded(true);
    } else {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  }, [href, isMobile, isExpanded]);

  if (isMobile) {
    return (
      <div className="fixed bottom-6 left-6 z-30">
        <button
          onClick={handleClick}
          className="flex items-center justify-center bg-[#F3AE69] hover:bg-[#E89D58] text-white rounded-full shadow-lg transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#F3AE69]"
          style={{
            width: isExpanded ? 'auto' : '56px',
            height: '56px',
            padding: isExpanded ? '0 24px' : '0',
          }}
          aria-label={label}
        >
          <CalendarIcon />
          {isExpanded && (
            <span className="ml-2 text-sm whitespace-nowrap">{label}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed left-8 bottom-1/4 z-30 group"
    >
      <div
        className="bg-[#F3AE69] hover:bg-[#E89D58] text-white px-6 py-4 rounded-full shadow-[0_8px_24px_rgba(243,174,105,0.3)] transition-all duration-200 flex items-center gap-3 hover:scale-105 active:scale-95"
      >
        <CalendarIcon />
        <span className="text-sm">{label}</span>
        <ExternalLinkIcon />
      </div>
    </a>
  );
}

export default FloatingFab;
