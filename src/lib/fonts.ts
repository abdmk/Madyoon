import localFont from 'next/font/local';

/**
 * Graphik Arabic — the product typeface. Loaded locally so headings and body
 * copy share one family and Arabic shaping stays consistent across platforms.
 */
export const graphik = localFont({
  src: [
    { path: '../fonts/GraphikArabic-Light.ttf', weight: '300', style: 'normal' },
    { path: '../fonts/GraphikArabic-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../fonts/GraphikArabic-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../fonts/GraphikArabic-Semibold.ttf', weight: '600', style: 'normal' },
    // No bold cut shipped — the browser synthesises 700 from Semibold.
    { path: '../fonts/GraphikArabic-Semibold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-graphik',
  display: 'swap',
  fallback: ['system-ui', 'Segoe UI', 'Tahoma', 'sans-serif'],
});
