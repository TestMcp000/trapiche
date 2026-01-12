'use client';

/**
 * MessageBanner - Reusable success/error message display
 *
 * Shared across admin theme pages for consistent feedback styling.
 */

interface MessageBannerProps {
  type: 'success' | 'error';
  message: string;
}

export default function MessageBanner({ type, message }: MessageBannerProps) {
  const baseClass = 'p-4 rounded-lg';
  const typeClass =
    type === 'success'
      ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300'
      : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300';

  return <div className={`${baseClass} ${typeClass}`}>{message}</div>;
}
