'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  MOBILE_MORE_NAV,
  MOBILE_NAV,
  MORE_NAV_ITEM,
  isActive,
  isMoreActive,
  type NavItem,
} from './nav-items';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

const TAB = cn(
  'flex h-full min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2',
  'text-[11px] font-medium transition-colors duration-fast',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
);

function TabIcon({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <>
      <Icon className={cn('size-5 transition-transform duration-fast ease-out', active && 'scale-110')} />
      <span className="truncate">{item.label}</span>
    </>
  );
}

/**
 * Bottom tab bar — shown wherever the sidebar is not (below `lg`), so a
 * tablet gets real navigation instead of falling back to the header's drawer.
 *
 * Three destinations plus "المزيد", so each tab keeps a ~56px target instead
 * of the seven slivers a flattened sidebar would produce. Sits above the iOS
 * home indicator, and leaves room on the end for the floating add action.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const moreActive = isMoreActive(pathname);

  // Any navigation closes the sheet, including browser back/forward.
  React.useEffect(() => setMoreOpen(false), [pathname]);

  return (
    <>
      <nav
        aria-label="التنقل الرئيسي"
        className={cn(
          'fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur-md',
          'pb-[env(safe-area-inset-bottom)] lg:hidden no-print',
        )}
      >
        <ul className="flex items-stretch">
          {MOBILE_NAV.map((item) => {
            const active = isActive(pathname, item);
            return (
              <li key={item.href} className="flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(TAB, active ? 'text-primary' : 'text-muted-foreground')}
                >
                  <TabIcon item={item} active={active} />
                </Link>
              </li>
            );
          })}

          <li className="flex-1">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={moreOpen}
              className={cn(TAB, 'w-full', moreActive ? 'text-primary' : 'text-muted-foreground')}
            >
              <TabIcon item={MORE_NAV_ITEM} active={moreActive} />
            </button>
          </li>
        </ul>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>المزيد</SheetTitle>
            <SheetDescription>بقية أقسام التطبيق</SheetDescription>
          </SheetHeader>

          <ul className="grid grid-cols-2 gap-2">
            {MOBILE_MORE_NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex min-h-[64px] items-center gap-3 rounded-xl border p-3 text-sm font-medium',
                      'transition-colors duration-fast',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      active
                        ? 'border-primary/30 bg-soft-primary text-soft-primary-foreground'
                        : 'bg-card hover:bg-secondary',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-xl',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-soft-neutral text-soft-neutral-foreground',
                      )}
                      aria-hidden
                    >
                      <Icon className="size-[18px]" />
                    </span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
