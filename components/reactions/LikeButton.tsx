'use client';

/**
 * LikeButton Component
 * 
 * Reusable like button for gallery items and comments.
 * Uses anonymous ID cookie for tracking likes without login.
 * Supports optimistic updates for better UX.
 */

import React, { useState, useCallback } from 'react';
import styles from './LikeButton.module.css';

interface LikeButtonProps {
  /** Target type: 'gallery_item' or 'comment' */
  targetType: 'gallery_item' | 'comment';
  /** Target ID */
  targetId: string;
  /** Initial liked state */
  initialLiked: boolean;
  /** Initial like count */
  initialCount: number;
  /** Optional size variant */
  size?: 'small' | 'medium';
}

export default function LikeButton({
  targetType,
  targetId,
  initialLiked,
  initialCount,
  size = 'medium',
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = useCallback(async () => {
    if (isLoading) return;

    // Optimistic update
    const prevLiked = liked;
    const prevCount = count;
    setLiked(!liked);
    setCount(liked ? count - 1 : count + 1);
    setIsLoading(true);

    try {
      const res = await fetch('/api/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId }),
      });

      if (!res.ok) {
        // Revert on error
        setLiked(prevLiked);
        setCount(prevCount);
        console.error('Failed to toggle like');
        return;
      }

      const data = await res.json();
      // Sync with server state
      setLiked(data.liked);
      setCount(data.likeCount);
    } catch (error) {
      // Revert on error
      setLiked(prevLiked);
      setCount(prevCount);
      console.error('Failed to toggle like:', error);
    } finally {
      setIsLoading(false);
    }
  }, [liked, count, isLoading, targetType, targetId]);

  const sizeClass = size === 'small' ? styles.small : styles.medium;

  return (
    <button
      className={`${styles.likeButton} ${sizeClass} ${liked ? styles.liked : ''}`}
      onClick={handleClick}
      disabled={isLoading}
      aria-label={liked ? 'Unlike' : 'Like'}
      aria-pressed={liked}
    >
      <svg
        className={styles.heartIcon}
        viewBox="0 0 24 24"
        fill={liked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      {count > 0 && <span className={styles.count}>{count}</span>}
    </button>
  );
}
