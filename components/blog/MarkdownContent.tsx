'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { findClosestCopyTarget, extractCodeText } from '@/lib/markdown/html';

interface MarkdownContentProps {
  html: string;
  className?: string;
}

/**
 * Lightweight client component for rendering server-processed Markdown HTML.
 * Only adds interactive enhancements (copy button, lightbox) without bundling
 * heavy Markdown processing libraries.
 *
 * ============================================================================
 * SECURITY: TRUST BOUNDARY FOR HTML RENDERING
 * ============================================================================
 *
 * This component uses `dangerouslySetInnerHTML` to render HTML content.
 * This is **safe** because:
 *
 * 1. The `html` prop MUST only come from `markdownToHtml()` in
 *    `lib/markdown/server.ts`, which processes admin-trusted content.
 *
 * 2. All markdown sources are protected by RLS (admin-only writes):
 *    - Blog posts, product descriptions, landing page content
 *
 * ⚠️  NEVER pass user-submitted content directly to this component.
 *     If user content needs rendering, use a sanitized pipeline.
 *
 * Last audited: 2025-12-21
 * ============================================================================
 */
export default function MarkdownContent({ html, className = '' }: MarkdownContentProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>('');



  const handleContainerClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const button = findClosestCopyTarget(target);
    
    if (button) {
      // Prevent default to avoid any weird focus jumps etc
      e.preventDefault();
      e.stopPropagation();

      // Find the wrapper (paret of button)
      const wrapper = button.parentElement;
      const code = extractCodeText(wrapper);
      
      if (code) {
        try {
          await navigator.clipboard.writeText(code);
          
          // Visual feedback
          button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
          
          setTimeout(() => {
             // Revert to copy icon
             button.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>`;
          }, 2000);
        } catch (err) {
          console.error('Failed to copy:', err);
        }
      }

      return;
    }

    if (target instanceof HTMLImageElement) {
      setLightboxSrc(target.src);
      setLightboxAlt(target.alt || '');
    }
  };

  // Ensure images have a consistent affordance without attaching per-node listeners
  useEffect(() => {
    if (!containerRef.current) return;

    const images = containerRef.current.querySelectorAll('img');
    images.forEach((img) => {
      if (!img.title) img.title = 'Click to enlarge';
    });
  }, [html]);

  // Close lightbox on escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setLightboxSrc(null);
    }
  }, []);

  useEffect(() => {
    if (lightboxSrc) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [lightboxSrc, handleKeyDown]);

  const closeLightbox = () => setLightboxSrc(null);

  return (
    <>
      <div
        ref={containerRef}
        className={`prose prose-lg max-w-none
          prose-headings:font-bold prose-headings:tracking-tight
          prose-h1:text-4xl prose-h1:mb-6
          prose-h2:text-3xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-2xl prose-h3:mt-8 prose-h3:mb-3
          prose-h4:text-xl prose-h4:mt-6 prose-h4:mb-2
          prose-p:text-base prose-p:leading-relaxed
          prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic
          prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
          prose-img:rounded-lg prose-img:shadow-md prose-img:cursor-zoom-in
          ${className}`}
        onClick={handleContainerClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Lightbox Portal */}
      {lightboxSrc && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          style={{ zIndex: 9999 }}
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            style={{ zIndex: 10000 }}
            onClick={closeLightbox}
            aria-label="Close"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element -- Lightbox for trusted markdown */}
          <img
            src={lightboxSrc}
            alt={lightboxAlt}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {lightboxAlt && lightboxAlt !== 'image' && (
            <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-4 py-2 rounded-lg max-w-lg text-center">
              {lightboxAlt}
            </p>
          )}
        </div>,
        document.body
      )}
    </>
  );
}
