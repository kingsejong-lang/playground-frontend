import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { getCSPHeader } from '@/lib/csp';

export const metadata: Metadata = {
  title: '킹세종 Playground',
  description: 'Write, compile, and run code in your browser',
  other: {
    'Content-Security-Policy': getCSPHeader(),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
