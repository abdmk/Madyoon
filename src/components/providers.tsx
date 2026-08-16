'use client';

import * as React from 'react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { useTheme } from 'next-themes';

function AppToaster() {
  const { resolvedTheme } = useTheme();
  return (
    <Toaster
      position="bottom-center"
      dir="rtl"
      richColors
      closeButton
      theme={(resolvedTheme as 'light' | 'dark') ?? 'light'}
      toastOptions={{ className: 'font-sans text-sm' }}
    />
  );
}

/** Registers the offline service worker once the app is interactive. */
function ServiceWorker() {
  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;
    const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
      <AppToaster />
      <ServiceWorker />
    </ThemeProvider>
  );
}
