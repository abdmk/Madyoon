'use client';

import * as React from 'react';
import Link from 'next/link';
import { Bell, CalendarClock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAppStore } from '@/store/use-app-store';
import { dueInfo, formatAmount, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Debts that are overdue or due within the alert window, most urgent first. */
export function useDueAlerts() {
  const debts = useAppStore((s) => s.debts);

  return React.useMemo(
    () =>
      debts
        .map((d) => ({ debt: d, due: dueInfo(d) }))
        .filter(({ due }) => due.state === 'overdue' || due.state === 'today' || due.state === 'soon')
        .sort((a, b) => a.due.days - b.due.days),
    [debts],
  );
}

export function DueAlertsBell() {
  const alerts = useDueAlerts();
  const count = alerts.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`التنبيهات (${count})`}>
          <Bell className="size-[18px]" />
          {count > 0 ? (
            <span className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground tabular">
              {count > 9 ? '9+' : count}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center gap-2">
          <CalendarClock className="size-4" />
          مواعيد قريبة ومتأخرة
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {count === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <CheckCircle2 className="size-8 text-success" />
            <p className="text-sm text-muted-foreground">لا توجد مواعيد قريبة. عمل ممتاز.</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {alerts.slice(0, 8).map(({ debt, due }) => (
              <li key={debt.id}>
                <Link
                  href="/debts"
                  className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors hover:bg-secondary"
                >
                  <span
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      due.state === 'overdue' || due.state === 'today'
                        ? 'bg-destructive'
                        : 'bg-warning',
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{debt.creditor_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(debt.due_date)} · {formatAmount(debt.remaining_amount, debt.currency)}
                    </span>
                  </span>
                  <span className={cn('shrink-0 text-xs font-medium', due.className)}>
                    {due.label}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {count > 8 ? (
          <>
            <DropdownMenuSeparator />
            <Link
              href="/debts"
              className="block px-2 py-2 text-center text-xs font-medium text-primary hover:underline"
            >
              عرض كل الديون ({count})
            </Link>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
