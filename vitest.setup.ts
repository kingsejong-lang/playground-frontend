import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
});

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  useParams: () => ({}),
}));

// Real English messages with a tiny ICU subset ({var} and {n, plural, ...}),
// so components and hooks render the same text the app shows on /en.
vi.mock('next-intl', async () => {
  const messages = (await import('./messages/en.json')).default as Record<string, unknown>;
  const lookup = (path: string): unknown =>
    path.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), messages);
  const format = (template: string, values: Record<string, unknown> = {}): string =>
    template
      .replace(/\{(\w+), plural, ((?:[^{}]|\{[^{}]*\})*)\}/g, (_m, name: string, body: string) => {
        const n = Number(values[name]);
        const cases = Object.fromEntries([...body.matchAll(/(=\d+|\w+) \{([^{}]*)\}/g)].map((c) => [c[1], c[2]]));
        const chosen = cases[`=${n}`] ?? (n === 1 ? cases.one : undefined) ?? cases.other ?? '';
        return chosen.replace(/#/g, String(n));
      })
      .replace(/\{(\w+)\}/g, (_m, name: string) => String(values[name] ?? `{${name}}`));
  type T = ((key: string, values?: Record<string, unknown>) => string) & { rich?: unknown };
  const cache = new Map<string, T>();
  const useTranslations = (namespace?: string) => {
    const ns = namespace ?? '';
    if (!cache.has(ns)) {
      const t = (key: string, values?: Record<string, unknown>) => {
        const full = ns ? `${ns}.${key}` : key;
        const found = lookup(full);
        return typeof found === 'string' ? format(found, values) : full;
      };
      // Rich text: element placeholders render as empty strings in tests.
      t.rich = (key: string, values: Record<string, unknown> = {}) =>
        t(key, values).replace(/<(\w+)><\/\1>/g, '');
      cache.set(ns, t);
    }
    return cache.get(ns)!;
  };
  return { useTranslations, useLocale: () => 'en' };
});

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

class NoopObserver {
  disconnect() {}
  observe() {}
  unobserve() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver = NoopObserver as unknown as typeof IntersectionObserver;
globalThis.ResizeObserver = NoopObserver as unknown as typeof ResizeObserver;
