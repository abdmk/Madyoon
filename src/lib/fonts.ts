import localFont from 'next/font/local';

/**
 * Graphik Arabic — the product typeface. Loaded locally so headings and body
 * copy share one family and Arabic shaping stays consistent across platforms.
 */
export const graphik = localFont({
  // WOFF2 — about a quarter the size of the original TTFs, same glyphs.
  src: [
    { path: '../fonts/GraphikArabic-Light.woff2', weight: '300', style: 'normal' },
    { path: '../fonts/GraphikArabic-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/GraphikArabic-Medium.woff2', weight: '500', style: 'normal' },
    { path: '../fonts/GraphikArabic-Semibold.woff2', weight: '600', style: 'normal' },
    // No bold cut shipped — the browser synthesises 700 from Semibold.
    { path: '../fonts/GraphikArabic-Semibold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-graphik',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Tahoma', 'sans-serif'],
});
