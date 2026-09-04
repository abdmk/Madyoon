import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Banknote, CalendarClock, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { formatAmount, formatDate } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import type { AttentionFeed } from '@/lib/types';

/**
 * "Attention required" — the part of the dashboard that asks for a decision
 * rather than reporting a number.
 *
 * Ordered by how much it costs to ignore: what is already late, what lands
 * this week, then what was just paid (which is here as reassurance, and as
 * the undo trail if a payment was recorded against the wrong debt).
 *
 * Every row is a link to the thing it is about — a list of problems you
 * cannot click into is just anxiety.
 */
export function AttentionPanel({ feed }: { feed: AttentionFeed }) {
  const { overdue, dueSoon, recentPayments } = feed;
  const hasWork = overdue.length > 0 || dueSoon.length > 0;

  if (!hasWork && recentPayments.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>ما يحتاج انتباهك</CardTitle>
          <CardDescription>المتأخر، وما يستحق هذا الأسبوع</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-xl bg-soft-success p-4 text-soft-success-foreground">
            <CheckCircle2 className="size-5 shrink-0" aria-hidden />
            <p className="text-sm font-medium">لا شيء متأخر ولا مستحق هذا الأسبوع.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle>ما يحتاج انتباهك</CardTitle>
            <CardDescription>المتأخر، وما يستحق هذا الأسبوع</CardDescription>
          </div>
          {hasWork ? (
            <Link
              href="/debts?status=overdue&sort=due_asc"
              className={cn(
                'group inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-sm font-medium text-primary',
                'transition-colors duration-fast hover:bg-soft-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              )}
            >
              عرض الكل
              <ArrowLeft className="size-4 transition-transform duration-fast group-hover:-translate-x-0.5" />
            </Link>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {overdue.length > 0 ? (
          <section aria-labelledby="attention-overdue">
            <h3
              id="attention-overdue"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-destructive"
            >
              <AlertTriangle className="size-4" aria-hidden />
              متأخرة ({overdue.length})
            </h3>
            <ul className="divide-y">
              {overdue.map((debt) => (
                <li key={debt.id}>
                  <AttentionRow
                    href={`/debts/${debt.id}`}
                    name={debt.creditor_name}
                    amount={formatAmount(debt.remaining_amount, debt.currency)}
                    meta={
                      <Pill tone="danger" icon={CalendarClock} srLabel="متأخر">
                        متأخر {debt.days_late} يوم
                      </Pill>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {dueSoon.length > 0 ? (
          <section aria-labelledby="attention-soon">
            <h3
              id="attention-soon"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-soft-warning-foreground"
            >
              <CalendarClock className="size-4" aria-hidden />
              تستحق خلال أسبوع ({dueSoon.length})
            </h3>
            <ul className="divide-y">
              {dueSoon.map((debt) => (
                <li key={debt.id}>
                  <AttentionRow
                    href={`/debts/${debt.id}`}
                    name={debt.creditor_name}
                    amount={formatAmount(debt.remaining_amount, debt.currency)}
                    meta={
                      <Pill tone="warning" icon={CalendarClock} srLabel="تستحق قريباً">
                        {Number(debt.days_left) === 0
                          ? 'تستحق اليوم'
                          : `بعد ${debt.days_left} يوم`}
                      </Pill>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {recentPayments.length > 0 ? (
          <section aria-labelledby="attention-payments">
            <h3
              id="attention-payments"
              className="mb-2 flex items-center gap-2 text-sm font-medium text-soft-success-foreground"
            >
              <Banknote className="size-4" aria-hidden />
              دفعات مسجّلة مؤخراً
            </h3>
            <ul className="divide-y">
              {recentPayments.map((payment) => (
                <li key={payment.id}>
                  <AttentionRow
                    href={`/debts/${payment.debt_id}`}
                    name={payment.creditor_name}
                    amount={formatAmount(payment.amount, payment.currency)}
                    amountClassName="text-soft-success-foreground"
                    meta={
                      <Pill tone="success" icon={CheckCircle2} srLabel="دفعة">
                        {formatDate(payment.paid_at)}
                      </Pill>
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

function AttentionRow({
  href,
  name,
  amount,
  meta,
  amountClassName,
}: {
  href: string;
  name: string;
  amount: string;
  meta: React.ReactNode;
  amountClassName?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        '-mx-2 flex min-h-[52px] items-center gap-3 rounded-lg px-2 py-2.5',
        'transition-colors duration-fast hover:bg-muted/40',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <div className="mt-1">{meta}</div>
      </div>
      <p className={cn('shrink-0 font-medium tabular', amountClassName)}>{amount}</p>
    </Link>
  );
}
