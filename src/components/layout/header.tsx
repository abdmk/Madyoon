'use client';

import * as React from 'react';
import Link from 'next/link';
import { LogOut, Menu, Settings, ShieldCheck, User as UserIcon } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage, Separator } from '@/components/ui/misc';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/use-app-store';
import { initials } from '@/lib/format';
import { DueAlertsBell } from './due-alerts-bell';
import type { DueAlerts, Profile } from '@/lib/types';

export function Header({ profile, alerts }: { profile: Profile; alerts: DueAlerts }) {
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6 no-print">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="فتح القائمة"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="size-5" />
      </Button>

      <div className="flex-1" />

      <DueAlertsBell alerts={alerts} />
      <ThemeToggle />

      <Separator orientation="vertical" className="mx-1 h-6" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="قائمة الحساب"
          >
            <Avatar>
              {profile.avatar_url ? (
                <AvatarImage src={profile.avatar_url} alt="" referrerPolicy="no-referrer" />
              ) : null}
              <AvatarFallback>{initials(profile.name, profile.email)}</AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="font-normal">
            <span className="block truncate text-sm font-medium">{profile.name || 'مستخدم'}</span>
            <span className="block truncate text-xs text-muted-foreground">{profile.email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {profile.role === 'admin' ? (
            <DropdownMenuItem asChild>
              <Link href="/admin">
                <ShieldCheck />
                لوحة التحكم
              </Link>
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings />
              الإعدادات
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem asChild>
            <Link href="/settings#profile">
              <UserIcon />
              الملف الشخصي
            </Link>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild className="text-destructive focus:text-destructive">
            {/* A form POST so sign-out is never triggered by a prefetch. */}
            <form action="/auth/signout" method="post">
              <button type="submit" className="flex w-full items-center gap-2">
                <LogOut />
                تسجيل الخروج
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
