/**
 * A localStorage key as an external store for useSyncExternalStore.
 *
 * Components read it during render instead of copying it into state in an
 * effect: the server render and the first client render use `fallback` (so
 * hydration matches), then React switches to the stored value. Writes through
 * `set` (or any change followed by `notify`) re-render every subscriber in this
 * tab; changes from other tabs arrive through the `storage` event.
 *
 * Usage:
 *   const layoutStore = createLocalStore('layout', parseLayout, DEFAULT_LAYOUT);
 *   const layout = useLocalStore(layoutStore);
 *   layoutStore.set({ ...layout, orientation: 'vertical' });
 */
import { useSyncExternalStore } from 'react';

export interface LocalStore<T> {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => T;
  getServerSnapshot: () => T;
  /** Stores a value (in memory when storage refuses it) and notifies subscribers. */
  set: (value: T) => void;
  /** Tells subscribers the key was written by someone else in this tab. */
  notify: () => void;
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null; // storage blocked (privacy mode, sandboxed iframe)
  }
}

export function createLocalStore<T>(
  key: string,
  /** Turns the stored string (null when absent) into a value; must not throw. */
  parse: (raw: string | null) => T,
  fallback: T,
  serialize: (value: T) => string = JSON.stringify
): LocalStore<T> {
  const listeners = new Set<() => void>();
  // getSnapshot must return the same object while the stored string is unchanged.
  let cachedRaw: string | null | undefined;
  let cachedValue: T = fallback;
  // When storage refuses a write, the value lives here for the rest of the visit.
  let memory: { value: T } | null = null;

  const notify = () => listeners.forEach((l) => l());
  const onStorage = (e: StorageEvent) => {
    if (e.key === key || e.key === null) notify();
  };

  return {
    subscribe(onChange) {
      listeners.add(onChange);
      if (listeners.size === 1) window.addEventListener('storage', onStorage);
      return () => {
        listeners.delete(onChange);
        if (listeners.size === 0) window.removeEventListener('storage', onStorage);
      };
    },
    getSnapshot() {
      if (memory) return memory.value;
      const raw = readRaw(key);
      if (raw !== cachedRaw) {
        cachedRaw = raw;
        cachedValue = parse(raw);
      }
      return cachedValue;
    },
    getServerSnapshot: () => fallback,
    set(value) {
      try {
        localStorage.setItem(key, serialize(value));
        memory = null;
      } catch {
        memory = { value }; // storage blocked or full: keep it in memory
      }
      notify();
    },
    notify,
  };
}

export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
