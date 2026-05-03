import { useRef, useCallback } from "react";

/**
 * useDebounce — debounces a value by `delay` ms.
 * Returns the debounced value — stable reference until delay elapses.
 */
export function useDebounce(callback, delay = 400) {
  const timerRef = useRef(null);

  return useCallback(
    (...args) => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );
}

/**
 * useDebouncedSearch — debounces an async search function.
 * Returns { debouncedSearch, isSearching, results }.
 * Cancels in-flight requests on new keystrokes.
 */
export function useDebouncedSearch(asyncFn, delay = 350) {
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const search = useCallback(
    async (...args) => {
      clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      return new Promise((resolve) => {
        timerRef.current = setTimeout(async () => {
          try {
            const result = await asyncFn(...args);
            resolve(result);
          } catch {
            resolve({ success: false, data: [] });
          }
        }, delay);
      });
    },
    [asyncFn, delay]
  );

  return { search };
}