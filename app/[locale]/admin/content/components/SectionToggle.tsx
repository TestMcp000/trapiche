'use client';

/**
 * Section Toggle Component
 * 
 * @see ../actions.ts - Server actions (route-local)
 */

import { useState, useTransition } from 'react';
import { toggleSectionVisibility } from '../actions';

interface SectionToggleProps {
  sectionKey: string;
  isPublished: boolean;
  routeLocale: string;
  labels: {
    published: string;
    draft: string;
  };
}

export default function SectionToggle({ 
  sectionKey, 
  isPublished: initialIsPublished, 
  routeLocale,
  labels 
}: SectionToggleProps) {
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    const newValue = !isPublished;
    
    // Optimistic update
    setIsPublished(newValue);
    
    startTransition(async () => {
      const result = await toggleSectionVisibility(sectionKey, newValue, routeLocale);
      
      if (!result.success) {
        // Revert on error
        setIsPublished(!newValue);
        console.error('Failed to toggle section:', result.error);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`
        relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        ${isPending ? 'opacity-50 cursor-wait' : ''}
        ${isPublished 
          ? 'bg-green-500 dark:bg-green-600' 
          : 'bg-gray-300 dark:bg-gray-600'
        }
      `}
      role="switch"
      aria-checked={isPublished}
      aria-label={isPublished ? labels.published : labels.draft}
    >
      <span className="sr-only">
        {isPublished ? labels.published : labels.draft}
      </span>
      <span
        className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
          transition duration-200 ease-in-out
          ${isPublished ? 'translate-x-5' : 'translate-x-0'}
        `}
      >
        {isPending && (
          <svg 
            className="absolute inset-0 m-auto h-3 w-3 animate-spin text-gray-400" 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24"
          >
            <circle 
              className="opacity-25" 
              cx="12" 
              cy="12" 
              r="10" 
              stroke="currentColor" 
              strokeWidth="4"
            />
            <path 
              className="opacity-75" 
              fill="currentColor" 
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
      </span>
    </button>
  );
}
