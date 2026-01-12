'use client';

/**
 * GalleryCardClient Component
 * 
 * Thin client wrapper that provides LikeButton interactivity for gallery cards.
 * The visual content is server-rendered and passed as children.
 * 
 * This pattern isolates client-side hydration to only the interactive elements,
 * improving performance by keeping the card content server-rendered.
 */

import React from 'react';
import LikeButton from '@/components/reactions/LikeButton';

interface GalleryCardClientProps {
  /** Gallery item ID for the like button */
  itemId: string;
  /** Whether the current user has liked this item */
  likedByMe: boolean;
  /** Current like count */
  likeCount: number;
  /** Server-rendered card content (image, title, links) */
  children: React.ReactNode;
}

export default function GalleryCardClient({
  itemId,
  likedByMe,
  likeCount,
  children,
}: GalleryCardClientProps) {
  return (
    <article className="gallery-card group break-inside-avoid mb-4">
      {children}
      <div className="p-3 flex items-center justify-end">
        <LikeButton
          targetType="gallery_item"
          targetId={itemId}
          initialLiked={likedByMe}
          initialCount={likeCount}
          size="small"
        />
      </div>
    </article>
  );
}
