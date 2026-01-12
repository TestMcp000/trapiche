'use client';

import { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import type { ThemeKey, ThemeScopeKey } from '@/lib/types/theme';

// White-listed CSS variable keys that can be injected
const ALLOWED_CSS_VARS = new Set([
  // Theme tokens (from presets.ts)
  '--theme-bg',
  '--theme-text',
  '--theme-accent',
  '--theme-accent-rgb',
  '--theme-radius',
  '--theme-radius-lg',
  '--theme-blur',
  '--theme-font',
  '--theme-spacing',
  '--theme-filter',
  // Tailwind-compatible variables
  '--background',
  '--background-rgb',
  '--foreground',
  '--foreground-rgb',
  '--primary',
  '--primary-rgb',
  '--primary-hover',
  '--primary-hover-rgb',
  '--theme-rgb',
  '--secondary',
  '--secondary-rgb',
  '--surface',
  '--surface-rgb',
  '--surface-hover',
  '--surface-hover-rgb',
  '--surface-raised',
  '--surface-raised-rgb',
  '--surface-raised-hover',
  '--surface-raised-hover-rgb',
  '--border',
  '--border-rgb',
  '--border-light',
  '--border-light-rgb',
  '--glass-surface',
  '--glass-border',
]);

export interface ThemePreviewIframeRef {
  reload: () => void;
}

interface ThemePreviewIframeProps {
  themeKey: ThemeKey;
  cssVars: Record<string, string>;
  previewPath?: string;
  showPathSelector?: boolean;
  onPathChange?: (path: string) => void;
  className?: string;
}

// Preview path scope values for admin preview route
const PREVIEW_SCOPES: (ThemeScopeKey | 'home')[] = ['home', 'blog', 'gallery', 'shop'];

const ThemePreviewIframe = forwardRef<ThemePreviewIframeRef, ThemePreviewIframeProps>(
  function ThemePreviewIframe(
    { themeKey, cssVars, previewPath = 'home', showPathSelector = true, onPathChange, className = '' },
    ref
  ) {
    const t = useTranslations('admin');
    const locale = useLocale();
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [currentPath, setCurrentPath] = useState(previewPath);
    const [isLoading, setIsLoading] = useState(true);
    const [frameError, setFrameError] = useState<string | null>(null);

    // Expose reload method via ref
    useImperativeHandle(ref, () => ({
      reload: () => {
        setIsLoading(true);
        setFrameError(null);
        try {
          iframeRef.current?.contentWindow?.location.reload();
        } catch {
          setIsLoading(false);
          setFrameError(t('theme.preview.blockedDesc'));
        }
      },
    }));

    // Apply CSS variables to iframe document
    // Target priority: .theme-scope → body → documentElement (fallback)
    // This matches the runtime SSR injection (ARCHITECTURE.md §2 Theme tokens)
    const applyThemeToIframe = useCallback(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (!doc) return;

        setFrameError(null);

        // Determine the target element (same priority as runtime SSR)
        // 1. .theme-scope (per-page theme wrapper)
        // 2. body (global theme from layout.tsx)
        // 3. documentElement (fallback)
        const target: HTMLElement =
          (doc.querySelector('.theme-scope') as HTMLElement | null) ??
          doc.body ??
          doc.documentElement;

        // Step 1: Clear old CSS variable values from target (avoid stale value mixing)
        for (const key of ALLOWED_CSS_VARS) {
          target.style.removeProperty(key);
        }

        // Step 2: Set data-theme attribute on the target element
        target.setAttribute('data-theme', themeKey);

        // Step 3: Apply only white-listed CSS variables
        for (const [key, value] of Object.entries(cssVars)) {
          if (ALLOWED_CSS_VARS.has(key)) {
            target.style.setProperty(key, value);
          }
        }
      } catch {
        setFrameError(t('theme.preview.blockedDesc'));
      }
    }, [themeKey, cssVars, t]);

    // Apply theme when cssVars or themeKey changes
    useEffect(() => {
      applyThemeToIframe();
    }, [applyThemeToIframe]);

    // Handle iframe load
    const handleIframeLoad = () => {
      setIsLoading(false);
      applyThemeToIframe();
    };

    // Handle path change
    const handlePathChange = (newPath: string) => {
      setCurrentPath(newPath);
      setIsLoading(true);
      setFrameError(null);
      onPathChange?.(newPath);
    };

    // Update currentPath when previewPath prop changes
    useEffect(() => {
      setCurrentPath(previewPath);
    }, [previewPath]);

    // Use admin-only preview route with searchParams for layout-level preview
    // This enables proper theme resolution including enableAnimations (uiux_refactor.md Step 5.2)
    const iframeSrc = `/${locale}/admin/theme/preview?path=${encodeURIComponent(currentPath)}&theme=${encodeURIComponent(themeKey)}`;

    return (
      <div className={`flex flex-col ${className}`}>
        {/* Path Selector */}
        {showPathSelector && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('theme.previewPage')}
            </span>
            <select
              value={currentPath}
              onChange={(e) => handlePathChange(e.target.value)}
              className="px-3 py-1 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-blue-500"
            >
              {PREVIEW_SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {t(`theme.scope.${scope}`)}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Iframe Container */}
        <div className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800">
          {/* Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-10">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('theme.preview.loading')}
                </span>
              </div>
            </div>
          )}

          {/* Blocked/Error Overlay */}
          {frameError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 z-20 p-6">
              <div className="max-w-md text-center space-y-2">
                <div className="text-base font-semibold text-gray-900 dark:text-white">
                  {t('theme.preview.blocked')}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{frameError}</p>
              </div>
            </div>
          )}

          {/* Preview Iframe */}
          <iframe
            ref={iframeRef}
            src={iframeSrc}
            onLoad={handleIframeLoad}
            className="w-full h-[400px] md:h-[500px] lg:h-[600px]"
            title={t('theme.preview.title')}
          />
        </div>

        {/* Preview Info */}
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-200 dark:bg-gray-700 font-mono">
            {themeKey}
          </span>
          <span>•</span>
          <span>{iframeSrc}</span>
        </div>
      </div>
    );
  }
);

export default ThemePreviewIframe;
