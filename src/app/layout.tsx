import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '킹세종 Playground',
  description: 'Write, compile, and run code in your browser',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
