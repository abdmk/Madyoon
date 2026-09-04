'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { canSeeAdminArea } from '@/lib/permissions';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';
import { ADMIN_NAV, MAIN_NAV, isActive, type NavItem } from '@/components/navigation/nav-items';
import { useAppStore } from '@/store/use-app-store';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/lib/types';

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
        'transition-colors duration-fast',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-1.5 -start-2 w-1 rounded-full bg-primary',
          'origin-center transition-transform duration-fast ease-out',
          active ? 'scale-y-100' : 'scale-y-0',
        )}
      />
      <Icon
        className={cn(
          'size-[18px] shrink-0 transition-transform duration-fast',
          // The page is always RTL, so "forward" is a shift toward the start edge.
          !active && 'group-hover:translate-x-0.5',
        )}
      />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

export function SidebarContent({
  profile,
  onNavigate,
}: {
  profile: Profile;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-3 px-1">
        <Image
          src="/icon.svg"
          alt=""
          aria-hidden
          width={40}
          height={40}
          className="shrink-0 rounded-xl shadow-md shadow-primary/25"
        />
        <span className="min-w-0">
          <span className="block truncate font-display text-base font-semibold">{APP_NAME}</span>
          <span className="block truncate text-xs text-muted-foreground">{APP_TAGLINE}</span>
        </span>
      </Link>

      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-none">
        <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted-foreground">عام</p>
        {MAIN_NAV.map((item) => (
          <NavLink key={item.href} item={item} onNavigate={onNavigate} />
        ))}

        {canSeeAdminArea(profile) ? (
          <>
            <p className="px-3 pb-1 pt-5 text-xs font-medium text-muted-foreground">الإدارة</p>
            {ADMIN_NAV.map((item) => (
              <NavLink key={item.href} item={item} onNavigate={onNavigate} />
            ))}
          </>
        ) : null}
      </nav>
    </div>
  );
}

/** Fixed rail on desktop; slide-over drawer on tablet and phone. */
export function Sidebar({ profile }: { profile: Profile }) {
  const { sidebarOpen, setSidebarOpen } = useAppStore();
  const pathname = usePathname();

  // Any navigation closes the drawer, including browser back/forward.
  React.useEffect(() => setSidebarOpen(false), [pathname, setSidebarOpen]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSidebarOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSidebarOpen]);

  return (
    <>
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-64 border-e bg-card lg:block">
        <SidebarContent profile={profile} />
      </aside>

      {/* Drawer */}
      <div
        className={cn(
          'fixed inset-0 z-50 lg:hidden',
          sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none',
        )}
      >
        <div
          role="presentation"
          onClick={() => setSidebarOpen(false)}
          className={cn(
            'absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200',
            sidebarOpen ? 'opacity-100' : 'opacity-0',
          )}
        />
        <div
          className={cn(
            'absolute inset-y-0 start-0 w-72 max-w-[85vw] border-e bg-card shadow-2xl transition-transform duration-300 ease-out',
            sidebarOpen ? 'translate-x-0' : 'translate-x-full',
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            aria-label="إغلاق القائمة"
            className="absolute end-2 top-3"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </Button>
          <SidebarContent profile={profile} onNavigate={() => setSidebarOpen(false)} />
        </div>
      </div>
    </>
  );
}
