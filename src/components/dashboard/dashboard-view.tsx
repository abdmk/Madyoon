import Link from 'next/link';
import dynamic from 'next/dynamic';
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
import { Progress, Skeleton } from '@/components/ui/misc';
import { dueInfo, formatAmount, formatDate, formatPercent } from '@/lib/format';
import { DEBT_CATEGORIES, DEBT_STATUS, PRIORITIES } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';

// Recharts is the single heaviest dependency on this page. Splitting it into
// its own chunk keeps it out of the dashboard's initial JS — the KPI cards,
// which is what a visitor actually sees first, render without waiting on it.
const ChartSkeleton = () => <Skeleton className="h-48 w-full rounded-xl" />;

const DebtsBreakdownChart = dynamic(
  () => import('./breakdown-chart').then((m) => m.DebtsBreakdownChart),
  { ssr: false, loading: ChartSkeleton },
);

const ExpensesTrendChart = dynamic(
  () => import('./trend-chart').then((m) => m.ExpensesTrendChart),
  { ssr: false, loading: ChartSkeleton },
);

/**
 * Every number here comes from `dashboard_summary` (see
 * supabase/migrations/0005_query_performance.sql) — one Postgres round trip
 * that already did the grouping, filtering and top-6 selection. Nothing on
 * this page loads a full table to reduce it in the browser.
 */
export function DashboardView({
  name,
  currency,
  data,
}: {
  name: string;
  currency: string;
  data: DashboardData;
}) {
  const { debts, expenses, breakdown, trend, urgent } = data;
  const progress = debts.total > 0 ? (debts.paid / debts.total) * 100 : 0;
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
            <ArrowLeft className="size-4 transition-transform duration-fast group-hover:-translate-x-0.5" />
          </Link>
        </Button>
      </PageHeader>

      {/* The one number that matters most, front and centre. */}
      <div className="grid grid-cols-2 gap-3 stagger sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="المتبقي عليك"
          value={formatAmount(debts.remaining, currency)}
          hint={`${debts.active} دين قيد السداد`}
          icon={TrendingDown}
          tone="warning"
          emphasis
          className="col-span-2 lg:col-span-1"
        />
        <StatCard
          label="إجمالي الديون"
          value={formatAmount(debts.total, currency)}
          hint={`${debts.count} دين`}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="المسدد"
          value={formatAmount(debts.paid, currency)}
          hint={`${debts.settled} دين مكتمل`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="مصاريف الشهر"
          value={formatAmount(expenses.monthTotal, currency)}
          hint={`${expenses.count} عملية مسجلة`}
          icon={Receipt}
          tone="accent"
        />
      </div>

      {/* Overdue banner --------------------------------------------------- */}
      {debts.overdue > 0 ? (
        <Card className="animate-fade-up border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">
                  لديك {debts.overdue} دين متأخر عن موعده
                </p>
                <p className="text-sm text-muted-foreground">
                  ابدأ بالأقدم — تأخير السداد عادةً يزيد الكلفة.
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" asChild className="shrink-0">
              <Link href="/debts?status=pending&sort=due_asc">عرض الديون المتأخرة</Link>
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
              {formatPercent(progress)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={progress} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>المسدد {formatAmount(debts.paid, currency)}</span>
            <span>المتبقي {formatAmount(debts.remaining, currency)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Charts ----------------------------------------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DebtsBreakdownChart breakdown={breakdown} currency={currency} />
        <ExpensesTrendChart trend={trend} currency={currency} />
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
                <ArrowLeft className="size-4 transition-transform duration-fast group-hover:-translate-x-0.5" />
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
            <ul className="divide-y stagger">
              {urgent.map((debt) => {
                const due = dueInfo(debt);
                const cat = DEBT_CATEGORIES[debt.category];
                const CatIcon = cat.icon;
                const pct =
                  Number(debt.amount) > 0
                    ? (Number(debt.paid_amount) / Number(debt.amount)) * 100
                    : 0;

                return (
                  <li key={debt.id}>
                    <Link
                      href={`/debts/${debt.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-fast hover:bg-muted/40"
                    >
                      <span
                        className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
                        aria-hidden
                      >
                        <CatIcon className="size-5" />
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
                    </Link>
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
