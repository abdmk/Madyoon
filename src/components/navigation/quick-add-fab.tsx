'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HandCoins, Plus, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

/**
 * The four things people open this app to record. Each links to the owning
 * page with `?new=1`, which that page turns into an open form — so the action
 * is one tap from anywhere without every screen having to host every form.
 */
const ACTIONS = [
  {
    href: '/debts?new=1',
    label: 'دين جديد',
    hint: 'سجّل مبلغاً عليك',
    icon: Wallet,
    className: 'bg-soft-primary text-soft-primary-foreground',
  },
  {
    href: '/debts?pay=1',
    label: 'تسجيل دفعة',
    hint: 'اختر ديناً وسدّد جزءاً منه',
    icon: HandCoins,
    className: 'bg-soft-success text-soft-success-foreground',
  },
  {
    href: '/expenses?new=1',
    label: 'مصروف جديد',
    hint: 'أين ذهبت النقود',
    icon: Receipt,
    className: 'bg-soft-accent text-soft-accent-foreground',
  },
  {
    href: '/revenues?new=1',
    label: 'إيراد جديد',
    hint: 'دخل استلمته',
    icon: TrendingUp,
    className: 'bg-soft-info text-soft-info-foreground',
  },
] as const;

export function QuickAddFab() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="إضافة"
        className={cn(
          // Clears the 56px tab bar plus the home indicator.
          'fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] end-4 z-30 lg:hidden no-print',
          'flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground',
          'shadow-lg transition-transform duration-fast ease-out active:scale-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'focus-visible:ring-offset-background',
        )}
      >
        <Plus className="size-6" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>إضافة جديدة</SheetTitle>
            <SheetDescription>اختر ما تريد تسجيله</SheetDescription>
          </SheetHeader>

          <ul className="space-y-2">
            {ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className={cn(
                      'flex min-h-[64px] items-center gap-3 rounded-xl border bg-card p-3',
                      'transition-colors duration-fast hover:bg-secondary',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-11 shrink-0 items-center justify-center rounded-2xl',
                        action.className,
                      )}
                      aria-hidden
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{action.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {action.hint}
                      </span>
                    </span>
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
