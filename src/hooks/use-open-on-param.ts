'use client';

import * as React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

/**
 * Opens a form because the URL asked it to (`?new=1`), then strips the flag.
 *
 * This is what lets a global action — the mobile add button, a dashboard
 * quick action — land on the owning page with its form already open, without
 * every screen having to host every other screen's form. The flag is removed
 * with `replace` so closing the form and pressing back doesn't reopen it.
 */
export function useOpenOnParam(param: string, open: () => void) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const flag = searchParams.get(param);

  // `open` is typically an inline arrow, so it is deliberately not a
  // dependency — re-running on every render would reopen a dismissed form.
  const openRef = React.useRef(open);
  openRef.current = open;

  React.useEffect(() => {
    if (!flag) return;

    openRef.current();

    const next = new URLSearchParams(searchParams);
    next.delete(param);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [flag, param, pathname, router, searchParams]);
}
