'use client';

/**
 * Interface language switch (ko / en). Keeps the rest of the path and the query
 * string (e.g. ?share=…) when switching.
 *
 * Usage:
 *   <LanguageToggle />                 // segmented control
 *   <LanguageToggle variant="menu" />  // stacked items for the overflow menu
 */
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { locales, type Locale } from '@/i18n/routing';

const LABELS: Record<Locale, { short: string; long: string }> = {
  ko: { short: '한', long: '한국어' },
  en: { short: 'EN', long: 'English' },
};

export function localePath(pathname: string, next: Locale): string {
  const segments = pathname.split('/');
  if ((locales as readonly string[]).includes(segments[1] ?? '')) segments[1] = next;
  else segments.splice(1, 0, next);
  return segments.join('/') || `/${next}`;
}

export default function LanguageToggle({ variant = 'segmented', onSwitch }: { variant?: 'segmented' | 'menu'; onSwitch?: () => void }) {
  const locale = useLocale() as Locale;
  const t = useTranslations('header');
  const router = useRouter();
  const pathname = usePathname();

  const switchTo = (next: Locale) => {
    onSwitch?.();
    if (next === locale) return;
    const search = typeof window !== 'undefined' ? window.location.search : '';
    router.push(`${localePath(pathname, next)}${search}`);
  };

  if (variant === 'menu') {
    return (
      <div role="group" aria-label={t('uiLanguage')}>
        {locales.map((loc) => (
          <button
            key={loc}
            type="button"
            lang={loc}
            onClick={() => switchTo(loc)}
            aria-pressed={locale === loc}
            className="flex h-9 w-full items-center gap-3 rounded-md px-3 text-left text-sm text-fg-secondary hover:bg-hover hover:text-fg"
          >
            <span className="inline-flex size-4 items-center justify-center" aria-hidden="true">
              {locale === loc && <Check className="size-4 text-accent-text" />}
            </span>
            {LABELS[loc].long}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div role="group" aria-label={t('uiLanguage')} className="inline-flex h-8 items-center rounded-md border border-hair p-0.5">
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          lang={loc}
          onClick={() => switchTo(loc)}
          aria-pressed={locale === loc}
          aria-label={LABELS[loc].long}
          title={LABELS[loc].long}
          className="inline-flex h-full min-w-7 items-center justify-center rounded-sm px-1.5 text-xs font-medium text-fg-muted hover:text-fg aria-pressed:bg-accent-soft aria-pressed:text-accent-text"
        >
          {LABELS[loc].short}
        </button>
      ))}
    </div>
  );
}
