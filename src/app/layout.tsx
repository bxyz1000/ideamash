import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ClientProviders from '@/components/ClientProviders';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'IdeaMash — Startup Ideas Judged by Real Humans',
  description:
    'Post your startup idea. Get brutal honest votes from real founders. No AI hype, no fake validation. Just 🔥 crazy shit or 🗑 dump it.',
  openGraph: {
    title: 'IdeaMash — Startup Ideas Judged by Real Humans',
    description:
      'Post your startup idea. Get brutal honest votes from real founders. No AI hype, no fake validation.',
    url: 'https://ideamash.vercel.app',
    siteName: 'IdeaMash',
    type: 'website',
  },
  robots: { index: true, follow: true },
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔥</text></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
