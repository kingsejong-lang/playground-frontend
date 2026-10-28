import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Providers } from './providers';
import { routing } from '@/i18n/routing';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });
  return {
    title: t('title'),
    description: t('metaDescription'),
    manifest: '/manifest.json',
    icons: { icon: '/icon.svg', apple: '/icon-192.png' },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#12121a' },
    { media: '(prefers-color-scheme: light)', color: '#fbfbfc' },
  ],
  colorScheme: 'dark light',
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Reading the request headers opts every page into dynamic rendering, which the
  // per-request CSP nonce requires (static HTML cannot carry a fresh nonce).
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  // Providing all messages to the client side is the easiest way to get started
  const messages = await getMessages();

  return (
    // theme-init.js sets the theme class before hydration.
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Synchronous on purpose: it must run before the first paint. */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script src="/theme-init.js" nonce={nonce} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
