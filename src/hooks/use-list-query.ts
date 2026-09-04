'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Drives a server-rendered list from the URL.
 *
 * `update` writes the new querystring and lets the server component re-render
 * with fresh rows; `pending` is true while that round trip is in flight, so the
 * table can dim instead of unmounting. Typing is debounced, so a search is one
 * request per pause rather than one per keystroke.
 */
export function useListQuery<Q extends { page: number }>(
  query: Q,
  toQueryString: (query: Partial<Q>) => string,
) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = React.useTransition();

  const push = React.useCallback(
    (next: Partial<Q>) => {
      const qs = toQueryString({ ...query, ...next });
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [pathname, query, router, toQueryString],
  );

  /** Any filter change resets to page 1 — page 7 of a new filter is nonsense. */
  const update = React.useCallback(
    (next: Partial<Q>) => push({ ...next, page: 1 } as Partial<Q>),
    [push],
  );

  const setPage = React.useCallback(
    (page: number) => {
      push({ page } as Partial<Q>);
      // Paging keeps the filters in view but should start the list at the top.
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [push],
  );

  return { update, setPage, pending };
}

/** Local input state that syncs to the URL after the user stops typing. */
export function useDebouncedSearch(
  initial: string,
  commit: (value: string) => void,
  delay = 300,
) {
  const [value, setValue] = React.useState(initial);
  const commitRef = React.useRef(commit);
  commitRef.current = commit;

  // A navigation (or "clear filters") can change the URL out from under us.
  React.useEffect(() => setValue(initial), [initial]);

  React.useEffect(() => {
    if (value === initial) return;
    const id = setTimeout(() => commitRef.current(value), delay);
    return () => clearTimeout(id);
  }, [value, initial, delay]);

  return [value, setValue] as const;
}
