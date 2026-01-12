'use client';

/**
 * Delete Post Button Component
 * 
 * @see ../actions.ts - Server actions (route-local)
 */

import { useState, useTransition } from 'react';
import { deletePostAction } from '../actions';
import { getErrorLabel } from '@/lib/types/action-result';

interface DeletePostButtonProps {
  postId: string;
  routeLocale: string;
}

export default function DeletePostButton({ postId, routeLocale }: DeletePostButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this post?')) {
      setError(null);
      startTransition(async () => {
        const result = await deletePostAction(postId, routeLocale);
        if (!result.success) {
          setError(getErrorLabel(result.errorCode, routeLocale));
        }
      });
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isPending}
        className={`p-2 text-gray-500 hover:text-red-600 transition-colors ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
        title="Delete"
      >
        {isPending ? (
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
      {error && (
        <div className="absolute right-0 top-full mt-1 px-2 py-1 text-xs text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
}
