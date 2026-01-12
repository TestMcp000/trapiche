'use client';

/**
 * Scrollytelling Client Component
 *
 * Minimal client component for scrollytelling theme animations.
 * Only rendered when theme is 'scrollytelling'.
 *
 * Responsibilities:
 * - Initialize scrollytelling context
 * - Provide animation utilities to children
 * - Apply global scroll-based styles
 *
 * @module components/theme/ScrollytellingClient
 * @see ARCHITECTURE.md §3.2 - ScrollytellingClient component
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useScrollytelling } from '@/hooks/useScrollytelling';

interface ScrollytellingContextValue {
  /** Whether scrollytelling animations are enabled */
  isEnabled: boolean;
  /** Register an element for scroll-based animation */
  registerElement: (element: HTMLElement | null) => void;
  /** Current count of animated elements */
  elementCount: number;
  /** Whether the max limit has been reached */
  isLimitReached: boolean;
}

const ScrollytellingContext = createContext<ScrollytellingContextValue | null>(null);

/**
 * Hook to access scrollytelling context.
 * Must be used within ScrollytellingClient.
 */
export function useScrollytellingContext(): ScrollytellingContextValue | null {
  return useContext(ScrollytellingContext);
}

interface ScrollytellingClientProps {
  children: ReactNode;
}

/**
 * Client component that provides scrollytelling animation context.
 *
 * Usage:
 * ```tsx
 * // In page with scrollytelling theme
 * <ScrollytellingClient>
 *   <AnimatedContent />
 * </ScrollytellingClient>
 * ```
 *
 * Child components can use:
 * - `useScrollytellingContext()` hook
 * - `data-scrolly-visible` attribute for CSS styling
 */
export function ScrollytellingClient({ children }: ScrollytellingClientProps) {
  const scrollytelling = useScrollytelling({
    threshold: 0.1,
    rootMargin: '0px 0px -10% 0px',
    animateOnce: true,
  });

  const { isEnabled, registerElement } = scrollytelling;
  const rootRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);

  // Reset readiness when animations are disabled (avoid stale "enabled" mode on re-enable).
  useEffect(() => {
    if (isEnabled) return;
    const raf = window.requestAnimationFrame(() => setIsReady(false));
    return () => window.cancelAnimationFrame(raf);
  }, [isEnabled]);

  // Auto-register sections for scroll observation (progressive enhancement).
  // - SSR renders with data-scrollytelling="disabled" (no hide)
  // - On client, once enabled, we mark above-the-fold sections as visible first
  // - Then flip to "enabled" so CSS can hide/animate the remaining sections
  useEffect(() => {
    if (!isEnabled) return;

    const root = rootRef.current;
    if (!root) return;

    const sections = Array.from(root.querySelectorAll('section'));

    // Pre-mark sections already in viewport to avoid a flash of hidden content
    for (const section of sections) {
      const rect = section.getBoundingClientRect();
      const isInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (isInViewport) {
        section.setAttribute('data-scrolly-visible', 'true');
      }

      registerElement(section);
    }

    const raf = window.requestAnimationFrame(() => {
      setIsReady(true);
    });

    return () => window.cancelAnimationFrame(raf);
  }, [isEnabled, registerElement]);

  const scrollyMode = isEnabled ? (isReady ? 'enabled' : 'pending') : 'disabled';

  return (
    <ScrollytellingContext.Provider value={scrollytelling}>
      {/* Add global data attribute for CSS styling */}
      <div
        ref={rootRef}
        data-scrollytelling={scrollyMode}
        className="scrollytelling-root"
      >
        {children}
      </div>
    </ScrollytellingContext.Provider>
  );
}

/**
 * Wrapper component for animated sections.
 * Automatically registers with scrollytelling observer.
 */
interface AnimatedSectionProps {
  children: ReactNode;
  className?: string;
  /** Animation style: 'fade-up', 'fade-in', 'slide-left', 'slide-right' */
  animation?: 'fade-up' | 'fade-in' | 'slide-left' | 'slide-right';
}

export function AnimatedSection({
  children,
  className = '',
  animation = 'fade-up',
}: AnimatedSectionProps) {
  const context = useScrollytellingContext();
  const elementRef = useRef<HTMLDivElement>(null);

  // Register element with observer after mount
  useEffect(() => {
    if (context?.isEnabled && elementRef.current) {
      context.registerElement(elementRef.current);
    }
  }, [context]);

  if (!context?.isEnabled) {
    // Render without animation if disabled
    return <div className={className}>{children}</div>;
  }

  return (
    <div
      ref={elementRef}
      className={`scrolly-section scrolly-${animation} ${className}`}
      data-scrolly-animation={animation}
    >
      {children}
    </div>
  );
}
