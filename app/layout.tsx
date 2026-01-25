import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SITE_URL } from '@/lib/seo/hreflang';
// Note: KaTeX CSS moved to markdown page layouts for performance (P0)

// Viewport configuration for mobile-first optimization
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
  colorScheme: 'light dark',
};

// P0-6: Use centralized SITE_URL from lib/seo/hreflang
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: '網站',
    template: '%s',
  },
  description: '網站',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
