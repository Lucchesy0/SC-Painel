import { useState, useEffect } from 'react';

/**
 * Hook to debounce value updates to avoid expensive calculations on every keystroke.
 * @param value The value to debounce
 * @param delay Delay in milliseconds (default: 200ms)
 */
export function useDebounce<T>(value: T, delay: number = 200): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
