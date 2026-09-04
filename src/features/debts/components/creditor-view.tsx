import Link from 'next/link';
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Landmark,
  Phone,
  Receipt,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Progress } from '@/components/ui/misc';
import { PAYMENT_METHODS } from '@/lib/constants';
import { formatAmount, formatCompactAmount, formatDate, formatPercent } from '@/lib/formatters';
import { cn } from '@/lib/utils';
import { debtDisplayStatus } from '../status';
import type { CreditorDetail, PaymentMethod } from '@/lib/types';

const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  transfer: Landmark,
};

/**
 * One creditor, end to end: what you owe them, which debts make it up, and
 * every payment you have made — the history that answers "where do I stand
 * with this person" without opening each debt in turn.
 */
export function CreditorView({ detail }: { detail: CreditorDetail }) {
  const { name, phone, summary, debts, payments } = detail;
  const currency = summary.currency ?? 'IQD';
  const progress = Number(summary.total) > 0 ? (Number(summary.paid) / Number(summary.total)) * 100 : 0;
  const active = debts.filter((d) => d.status !== 'paid');
  const settled = debts.filter((d) => d.status === 'paid');

  return (
    <div className="space-y-5 animate-fade-in">
      <Button variant="ghost" size="sm" asChild className="-ms-2 no-print">
        <Link href="/debts">
          <ArrowRight className="size-4" />
          كل الديون
        </Link>
      </Button>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-soft-primary text-soft-primary-foreground"
              aria-hidden
            >
              <Wallet className="size-5" />
            </span>
            <span className="min-w-0 truncate">{name}</span>
          </span>
        }
        description={`${summary.count} دين مسجّل · ${summary.active} قيد السداد`}
      >
        {phone ? (
          <Button variant="outline" asChild>
            <a href={`tel:${phone}`} dir="ltr">
              <Phone className="size-4" />
              {phone}
            </a>
          </Button>
        ) : null}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        {Number(summary.overdue) > 0 ? (
          <Pill tone="danger" size="md" icon={CalendarClock} srLabel="تنبيه">
            {summary.overdue} متأخر · {formatAmount(summary.overdueAmount, currency)}
          </Pill>
        ) : (
          <Pill tone="success" size="md" icon={CheckCircle2} srLabel="الحالة">
            لا شيء متأخر
          </Pill>
        )}
        {summary.lastDebtAt ? (
          <Pill size="md" icon={CalendarClock}>
            آخر دين {formatDate(summary.lastDebtAt)}
          </Pill>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3 stagger lg:grid-cols-4">
        <StatCard
          label="المتبقي"
          value={formatCompactAmount(summary.remaining, currency)}
          hint={`${summary.active} دين قائم`}
          icon={TrendingDown}
          tone={Number(summary.remaining) > 0 ? 'warning' : 'success'}
          emphasis
          className="col-span-2 lg:col-span-1"
        />
        <StatCard
          label="الإجمالي"
          value={formatCompactAmount(summary.total, currency)}
          hint={`${summary.count} دين`}
          icon={Receipt}
          tone="primary"
        />
        <StatCard
          label="المسدد"
          value={formatCompactAmount(summary.paid, currency)}
          hint={formatPercent(progress)}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard label="عدد الدفعات" value={payments.length} icon={Banknote} tone="accent" />
      </div>

      <Card>
        <CardContent className="space-y-2 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">نسبة السداد لهذه الجهة</span>
            <span className="font-display text-xl font-semibold tabular text-primary">
              {formatPercent(progress)}
            </span>
          </div>
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>المسدد {formatAmount(summary.paid, currency)}</span>
            <span>المتبقي {formatAmount(summary.remaining, currency)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Debts ---------------------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>الديون</CardTitle>
            <CardDescription>القائمة أولاً، ثم المسدّدة</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {[...active, ...settled].map((debt) => {
                const status = debtDisplayStatus(debt);
                const StatusIcon = status.icon;
                const pct =
                  Number(debt.amount) > 0
                    ? (Number(debt.paid_amount) / Number(debt.amount)) * 100
                    : 0;

                return (
                  <li key={debt.id}>
                    <Link
                      href={`/debts/${debt.id}`}
                      className={cn(
                        '-mx-2 flex items-start gap-3 rounded-lg px-2 py-3',
                        'transition-colors duration-fast hover:bg-muted/40',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Pill tone={status.tone} icon={StatusIcon} srLabel="الحالة">
                            {status.label}
                          </Pill>
                          {debt.due_date ? (
                            <Pill icon={CalendarClock}>{formatDate(debt.due_date)}</Pill>
                          ) : null}
                        </div>
                        <Progress value={pct} className="mt-2 h-1.5" />
                      </div>

                      <div className="shrink-0 text-end">
                        <p className="font-medium tabular">
                          {formatAmount(debt.remaining_amount, debt.currency)}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground tabular">
                          من {formatCompactAmount(debt.amount, debt.currency)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        {/* Activity timeline ---------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>سجل الدفعات</CardTitle>
            <CardDescription>كل دفعة سدّدتها لهذه الجهة</CardDescription>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="لا توجد دفعات بعد"
                description="ستظهر كل دفعة هنا بتاريخها وطريقتها فور تسجيلها."
                className="border-0 py-8"
              />
            ) : (
              <ol className="relative space-y-4 border-s ps-5">
                {payments.map((payment) => {
                  const Icon = METHOD_ICON[payment.method] ?? Banknote;
                  return (
                    <li key={payment.id} className="relative">
                      <span
                        className="absolute -start-[1.72rem] flex size-6 items-center justify-center rounded-full bg-soft-success text-soft-success-foreground ring-4 ring-card"
                        aria-hidden
                      >
                        <Icon className="size-3" />
                      </span>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-medium tabular">
                          {formatAmount(payment.amount, payment.currency)}
                        </p>
                        <time
                          dateTime={payment.paid_at}
                          className="shrink-0 text-xs text-muted-foreground tabular"
                        >
                          {formatDate(payment.paid_at)}
                        </time>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {PAYMENT_METHODS[payment.method]?.label ?? payment.method}
                      </p>
                      {payment.note ? (
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {payment.note}
                        </p>
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
