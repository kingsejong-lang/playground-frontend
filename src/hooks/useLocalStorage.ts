/**
 * Custom hook for managing localStorage with SSR safety.
 * Provides a type-safe interface for reading and writing localStorage values.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Check if code is running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Hook for managing localStorage values with SSR safety
 * @param key - localStorage key
 * @param initialValue - Default value when key doesn't exist
 * @returns Tuple of [storedValue, setValue, removeValue]
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Get initial value from localStorage or use default
  const readValue = useCallback((): T => {
    if (!isBrowser()) {
      return initialValue;
    }

    try {
      const item = localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Initialize on mount
  useEffect(() => {
    setStoredValue(readValue());
  }, [readValue]);

  // Set value to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      if (!isBrowser()) {
        console.warn(`Cannot set localStorage key "${key}" during SSR`);
        return;
      }

      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        localStorage.setItem(key, JSON.stringify(valueToStore));

        // Dispatch storage event for other tabs
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(valueToStore),
          })
        );
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Remove value from localStorage
  const removeValue = useCallback(() => {
    if (!isBrowser()) {
      return;
    }

    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    if (!isBrowser()) return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue) as T);
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
}

/**
 * Simpler hook for string-based localStorage values
 * @param key - localStorage key
 * @param initialValue - Default string value
 */
export function useLocalStorageString(
  key: string,
  initialValue: string
): [string, (value: string) => void] {
  const [value, setValue] = useLocalStorage(key, initialValue);
  return [value, setValue];
}
