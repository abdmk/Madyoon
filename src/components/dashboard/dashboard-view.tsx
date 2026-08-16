'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Receipt,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import { useAppStore } from '@/store/use-app-store';
import { summarizeDebts, sumExpenses, sortDebts } from '@/lib/stats';
import { dueInfo, formatAmount, formatDate, formatPercent } from '@/lib/format';
import { DEBT_CATEGORIES, DEBT_STATUS, PRIORITIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { DebtsBreakdownChart } from './breakdown-chart';
import { ExpensesTrendChart } from './trend-chart';

export function DashboardView({ name }: { name: string }) {
  const debts = useAppStore((s) => s.debts);
  const expenses = useAppStore((s) => s.expenses);
  const profile = useAppStore((s) => s.profile);
  const currency = profile?.currency ?? 'IQD';

  const summary = React.useMemo(() => summarizeDebts(debts), [debts]);

  // This month's spend, for the "المصاريف" tile.
  const monthExpenses = React.useMemo(() => {
    const prefix = new Date().toISOString().slice(0, 7);
    return sumExpenses(expenses.filter((e) => e.date.startsWith(prefix)));
  }, [expenses]);

  const urgent = React.useMemo(
    () =>
      sortDebts(
        debts.filter((d) => d.status !== 'paid'),
        'priority',
      ).slice(0, 6),
    [debts],
  );

  const firstName = name.split(' ')[0] || '';

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={firstName ? `أهلاً ${firstName} 👋` : 'أهلاً بك 👋'}
        description="نظرة سريعة على ديونك ومصاريفك اليوم."
      >
        <Button asChild>
          <Link href="/debts">
            إدارة الديون
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
      </PageHeader>

      {/* Stats ------------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="إجمالي الديون"
          value={formatAmount(summary.total, currency)}
          hint={`${summary.count} دين`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="المتبقي"
          value={formatAmount(summary.remaining, currency)}
          hint={`${summary.active} قيد السداد`}
          icon={TrendingDown}
          tone="warning"
        />
        <StatCard
          label="المسدد"
          value={formatAmount(summary.paid, currency)}
          hint={`${summary.settled} دين مكتمل`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="مصاريف الشهر"
          value={formatAmount(monthExpenses, currency)}
          hint={`${expenses.length} عملية مسجلة`}
          icon={Receipt}
          tone="accent"
        />
      </div>

      {/* Overdue banner --------------------------------------------------- */}
      {summary.overdue > 0 ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  لديك {summary.overdue} دين متأخر عن موعده
                </p>
                <p className="text-sm text-muted-foreground">
                  ابدأ بالأقدم — تأخير السداد عادةً يزيد الكلفة.
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" asChild className="shrink-0">
              <Link href="/debts">عرض الديون المتأخرة</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Progress --------------------------------------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>نسبة السداد</CardTitle>
              <CardDescription>من إجمالي ما عليك</CardDescription>
            </div>
            <span className="font-display text-2xl font-semibold tabular text-primary">
              {formatPercent(summary.progress)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={summary.progress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>المسدد {formatAmount(summary.paid, currency)}</span>
            <span>المتبقي {formatAmount(summary.remaining, currency)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts ----------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DebtsBreakdownChart debts={debts} currency={currency} />
        <ExpensesTrendChart expenses={expenses} currency={currency} />
      </div>

      {/* Priority list ---------------------------------------------------- */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>الأولويات</CardTitle>
              <CardDescription>الديون الأهم حسب الأولوية والموعد</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/debts">
                الكل
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {urgent.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="لا توجد ديون قيد السداد"
              description="كل شيء مسدد. أضف ديناً جديداً لتتبعه هنا."
              action={
                <Button asChild size="sm">
                  <Link href="/debts">إضافة دين</Link>
                </Button>
              }
              className="border-0 py-8"
            />
          ) : (
            <ul className="divide-y">
              {urgent.map((debt) => {
                const due = dueInfo(debt);
                const cat = DEBT_CATEGORIES[debt.category];
                const pct =
                  Number(debt.amount) > 0
                    ? (Number(debt.paid_amount) / Number(debt.amount)) * 100
                    : 0;

                return (
                  <li key={debt.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <span
                      className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg"
                      style={{ backgroundColor: `${cat.color}1a` }}
                      aria-hidden
                    >
                      {cat.icon}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{debt.creditor_name}</p>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0', PRIORITIES[debt.priority].className)}
                        >
                          {PRIORITIES[debt.priority].label}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{cat.label}</span>
                        {debt.due_date ? (
                          <>
                            <span aria-hidden>·</span>
                            <span className={due.className}>
                              {formatDate(debt.due_date)} ({due.label})
                            </span>
                          </>
                        ) : null}
                      </div>
                      <Progress value={pct} className="mt-2 h-1.5" />
                    </div>

                    <div className="shrink-0 text-end">
                      <p className="font-medium tabular">
                        {formatAmount(debt.remaining_amount, debt.currency)}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn('mt-1', DEBT_STATUS[debt.status].className)}
                      >
                        {DEBT_STATUS[debt.status].label}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
