'use client';

/**
 * Client-side wrapper for CommentSection with scoped i18n provider
 *
 * Performance optimization (P1): Instead of having NextIntlClientProvider at the root
 * layout with the full ~9KB messages payload, we scope it here with only the 'comments'
 * namespace. This reduces initial bundle size for all pages.
 *
 * The parent server component fetches messages via getMessages() and passes only
 * the 'comments' namespace to this component.
 *
 * @see ARCHITECTURE.md - "i18n Provider Strategy" section
 */

import dynamic from 'next/dynamic';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';

// Lazy load CommentSection to reduce initial bundle size
// This defers loading of Supabase auth, reCAPTCHA, and comment logic
const CommentSection = dynamic(
  () => import('@/components/blog/CommentSection'),
  {
    loading: () => (
      <div className="mt-16 pt-8 border-t border-border-light">
        <div className="animate-pulse">
          <div className="h-8 bg-surface rounded w-48 mb-6"></div>
          <div className="h-24 bg-surface rounded mb-4"></div>
          <div className="h-10 bg-surface rounded w-32"></div>
        </div>
      </div>
    ),
    ssr: false, // CommentSection requires client-side auth state
  }
);

interface ClientCommentSectionProps {
  /** Target type for polymorphic comments */
  targetType: 'post' | 'gallery_item';
  /** Target ID (post ID or gallery item ID) */
  targetId: string;
  /** Scoped messages containing only 'comments' namespace (passed from server component) */
  messages: AbstractIntlMessages;
  /** Locale for i18n (required for scoped NextIntlClientProvider) */
  locale: string;
}

export default function ClientCommentSection({
  targetType,
  targetId,
  messages,
  locale,
}: ClientCommentSectionProps) {
  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <CommentSection targetType={targetType} targetId={targetId} />
    </NextIntlClientProvider>
  );
}


