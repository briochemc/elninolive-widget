import type { Metadata } from 'next';
import { IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';
import { site } from '@/lib/site';

// Fonts are downloaded at BUILD time and self-hosted from /_next/static —
// visitors' browsers never contact Google Fonts.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  // 400 (small labels) and 600 (the headline numbers) are the only weights used.
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: `${site.name} widget`,
  description: 'Live El Niño status widget: BOM relative Niño 3.4, NOAA weekly Niño 3.4 and NOAA RONI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${plexMono.variable} font-sans`}>{children}</body>
    </html>
  );
}
