'use client';

/**
 * MarqueeNotice - Scrolling notice banner for home page
 *
 * Displays a scrolling notice with label (orange badge) and text.
 * Pauses animation on hover for readability.
 *
 * @see doc/specs/proposed/GALLERY_HERO_IMAGE_AND_HOTSPOTS.md (FR-8)
 */

import { useState, useRef, useEffect } from 'react';

interface MarqueeNoticeProps {
  /** Notice label (shown in orange badge) */
  label: string;
  /** Notice text content */
  text: string;
}

export function MarqueeNotice({ label, text }: MarqueeNoticeProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [animationDuration, setAnimationDuration] = useState(30);

  // Calculate animation duration based on content width
  useEffect(() => {
    if (contentRef.current) {
      const contentWidth = contentRef.current.scrollWidth;
      // Adjust duration based on content length (pixels per second)
      const pixelsPerSecond = 50;
      const duration = Math.max(15, contentWidth / pixelsPerSecond);
      setAnimationDuration(duration);
    }
  }, [text, label]);

  return (
    <div className="w-full overflow-hidden bg-[#EEEBE3] border-b border-[#E5E1D9]">
      <div 
        className="marquee-notice flex items-center h-10 px-4 md:px-8"
      >
        {/* Fixed Notice Label */}
        <div className="shrink-0 mr-4">
          <span className="inline-block px-2 py-0.5 text-xs font-semibold tracking-wider uppercase text-white bg-[#F3AE69] rounded">
            {label}
          </span>
        </div>

        {/* Scrolling Text */}
        <div className="flex-1 overflow-hidden relative">
          <div
            ref={contentRef}
            className="marquee-content inline-flex whitespace-nowrap text-sm text-[#4A4A4A]"
            style={{
              animation: `marquee ${animationDuration}s linear infinite`,
            }}
          >
            {/* Repeat content for seamless loop */}
            <span className="pr-16">{text}</span>
            <span className="pr-16">{text}</span>
            <span className="pr-16">{text}</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .marquee-notice:hover .marquee-content {
          animation-play-state: paused;
        }

        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.333%);
          }
        }
      `}</style>
    </div>
  );
}

export default MarqueeNotice;
