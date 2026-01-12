'use client';

/**
 * Scrollytelling Hook
 *
 * Client-only hook for scroll-based animations.
 * Uses IntersectionObserver to detect when elements enter viewport.
 *
 * Respects:
 * - prefers-reduced-motion (disables animations)
 * - MAX_SCROLL_ELEMENTS limit (prevents performance issues)
 *
 * @module hooks/useScrollytelling
 * @see ARCHITECTURE.md §3.2 - ScrollytellingClient component
 */

import { useEffect, useState, useRef, useCallback } from 'react';

/** Maximum number of animated elements to prevent performance issues */
const MAX_SCROLL_ELEMENTS = 50;

/** Intersection threshold for triggering animations */
const INTERSECTION_THRESHOLD = 0.1;

interface UseScrollytellingOptions {
  /** Threshold for intersection (0-1) */
  threshold?: number;
  /** Root margin for earlier/later triggering */
  rootMargin?: string;
  /** Whether to animate only once or repeat on scroll */
  animateOnce?: boolean;
}

interface UseScrollytellingReturn {
  /** Whether scrollytelling is enabled (respects motion preferences) */
  isEnabled: boolean;
  /** Register an element for scroll observation */
  registerElement: (element: HTMLElement | null) => void;
  /** Current count of animated elements */
  elementCount: number;
  /** Whether max element limit has been reached */
  isLimitReached: boolean;
}

/**
 * Check if user prefers reduced motion.
 * Safe for SSR - returns true (animations disabled) on server.
 */
function getInitialMotionPreference(): boolean {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Hook for scroll-based animations in scrollytelling theme.
 *
 * @example
 * ```tsx
 * function AnimatedSection() {
 *   const { isEnabled, registerElement } = useScrollytelling();
 *
 *   return (
 *     <div ref={registerElement} className={isEnabled ? 'animate-on-scroll' : ''}>
 *       Content
 *     </div>
 *   );
 * }
 * ```
 */
export function useScrollytelling(options: UseScrollytellingOptions = {}): UseScrollytellingReturn {
  const {
    threshold = INTERSECTION_THRESHOLD,
    rootMargin = '0px 0px -10% 0px',
    animateOnce = true,
  } = options;

  // Initialize with server-safe value, update on client mount
  const [isEnabled, setIsEnabled] = useState(getInitialMotionPreference);
  const [elementCount, setElementCount] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<HTMLElement>>(new Set());

  // Listen for changes in motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (e: MediaQueryListEvent) => {
      setIsEnabled(!e.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Set up IntersectionObserver
  useEffect(() => {
    if (!isEnabled) {
      observerRef.current = null;
      return;
    }

    const handleIntersection: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.setAttribute('data-scrolly-visible', 'true');
          
          if (animateOnce) {
            observerRef.current?.unobserve(entry.target);
          }
        } else if (!animateOnce) {
          entry.target.removeAttribute('data-scrolly-visible');
        }
      });
    };

    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    // Observe all registered elements
    elementsRef.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [isEnabled, threshold, rootMargin, animateOnce]);

  // Register element for observation
  const registerElement = useCallback((element: HTMLElement | null) => {
    if (!element) return;

    // Check element limit
    if (elementsRef.current.size >= MAX_SCROLL_ELEMENTS) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `[useScrollytelling] Maximum element limit (${MAX_SCROLL_ELEMENTS}) reached. ` +
          'Additional elements will not be animated.'
        );
      }
      return;
    }

    // Add to set if not already present
    if (!elementsRef.current.has(element)) {
      elementsRef.current.add(element);
      setElementCount(elementsRef.current.size);

      // Observe if observer is active
      if (observerRef.current && isEnabled) {
        observerRef.current.observe(element);
      }
    }
  }, [isEnabled]);

  return {
    isEnabled,
    registerElement,
    elementCount,
    isLimitReached: elementCount >= MAX_SCROLL_ELEMENTS,
  };
}
