'use client';

import { useState, useEffect } from 'react';

/**
 * Generic debounce hook
 * 
 * Delays updating the returned value until after the specified delay
 * has elapsed since the last change to the input value.
 * 
 * @param value - The value to debounce
 * @param delay - The debounce delay in milliseconds (default: 300)
 * @returns The debounced value
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedQuery = useDebounce(searchQuery, 300);
 * 
 * useEffect(() => {
 *   searchApi(debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
