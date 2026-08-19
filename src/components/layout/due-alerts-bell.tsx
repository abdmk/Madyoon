'use client';

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
import { dueInfo, formatAmount, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DueAlerts } from '@/lib/types';

/**
 * The bell's contents come from the layout's `due_alerts` RPC — a bounded
 * query (eight rows, one count) rather than every debt the account owns.
 */
export function DueAlertsBell({ alerts }: { alerts: DueAlerts }) {
  const { count, rows } = alerts;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`التنبيهات (${count})`}>
          <Bell className="size-[18px]" />
          {count > 0 ? (
            <span className="absolute end-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground tabular animate-scale-in">
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

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <CheckCircle2 className="size-8 text-success" />
            <p className="text-sm text-muted-foreground">لا توجد مواعيد قريبة. عمل ممتاز.</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-y-auto py-1">
            {rows.map((row) => {
              const due = dueInfo({ due_date: row.due_date, status: row.status });
              return (
                <li key={row.id}>
                  <Link
                    href={`/debts/${row.id}`}
                    className="flex items-start gap-3 rounded-md px-2 py-2 transition-colors duration-fast hover:bg-secondary"
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
                      <span className="block truncate text-sm font-medium">{row.creditor_name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(row.due_date)} · {formatAmount(row.remaining_amount, row.currency)}
                      </span>
                    </span>
                    <span className={cn('shrink-0 text-xs font-medium', due.className)}>
                      {due.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        {count > rows.length ? (
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
