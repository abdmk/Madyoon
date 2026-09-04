import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Plus,
  Receipt,
  Scale,
  TrendingDown,
  Wallet2,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pill } from '@/components/ui/pill';
import { QuickActionLink } from '@/components/ui/quick-action';
import { Progress, Skeleton } from '@/components/ui/misc';
import { FinancialOverview } from './financial-overview';
import { AttentionPanel } from './attention-panel';
import { formatAmount, formatCompactAmount, formatDate, formatPercent } from '@/lib/formatters';
import { DEBT_CATEGORIES } from '@/lib/constants';
import { debtDisplayStatus } from '@/features/debts/status';
import { cn } from '@/lib/utils';
import type { AttentionFeed, DashboardData, DashboardPeriodSummary } from '@/lib/types';

// Recharts is the single heaviest dependency on this page. Splitting it into
// its own chunk keeps it out of the dashboard's initial JS — the KPI cards,
// which is what a visitor actually sees first, render without waiting on it.
const ChartSkeleton = () => <Skeleton className="h-48 w-full rounded-xl" />;

const DebtsBreakdownChart = dynamic(
  () => import('./breakdown-chart').then((m) => m.DebtsBreakdownChart),
  { ssr: false, loading: ChartSkeleton },
);

/**
 * The dashboard is organised around decisions, not around charts.
 *
 * Top to bottom: what you can do right now (quick actions), where you stand
 * (four KPIs), what needs a decision today (the attention feed), and only
 * then the analysis — the financial summary, repayment progress and the
 * breakdown. Someone who opens this app to record a payment should never
 * have to scroll past a chart to do it.
 *
 * Every number comes from `dashboard_summary` / `dashboard_period_summary`
 * (see supabase/migrations/0005 and 0010) — one Postgres round trip each,
 * already grouped and filtered. Nothing here loads a table to reduce it in
 * the browser.
 */
export function DashboardView({
  ownerId,
  name,
  currency,
  data,
  initialPeriodSummary,
  attention,
}: {
  ownerId: string;
  name: string;
  currency: string;
  data: DashboardData;
  initialPeriodSummary: DashboardPeriodSummary;
  attention: AttentionFeed;
}) {
  const { debts, breakdown, urgent } = data;
  const progress = debts.total > 0 ? (debts.paid / debts.total) * 100 : 0;
  const firstName = name.split(' ')[0] || '';

  // The KPI row is deliberately pinned to the current month regardless of the
  // period the financial card is showing: "collected this month" has to mean
  // the same thing every time you glance at it.
  const month = initialPeriodSummary.totals;
  const netCashFlow = month.revenues - month.expenses;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title={firstName ? `أهلاً ${firstName} 👋` : 'أهلاً بك 👋'}
        description="ابدأ من هنا: ما يمكنك فعله الآن، وأين تقف، وما يحتاج قراراً منك."
      >
        <Button variant="outline" asChild>
          <Link href="/reports">
            التقارير
            <ArrowLeft className="size-4 transition-transform duration-fast group-hover:-translate-x-0.5" />
          </Link>
        </Button>
      </PageHeader>

      {/* Quick actions — the four things this app exists to do. Placed above
          every number so the common case is one tap from the top. */}
      <section aria-labelledby="quick-actions" className="space-y-3">
        <h2 id="quick-actions" className="text-sm font-medium text-muted-foreground">
          إجراءات سريعة
        </h2>
        <div className="grid grid-cols-2 gap-3 stagger lg:grid-cols-4">
          <QuickActionLink
            href="/debts?new=1"
            label="إضافة دين"
            hint="تسجيل مبلغ جديد عليك"
            icon={Plus}
            tone="primary"
          />
          <QuickActionLink
            href="/debts?pay=1"
            label="تسجيل دفعة"
            hint="خصم من دين قائم"
            icon={Banknote}
            tone="success"
          />
          <QuickActionLink
            href="/expenses?new=1"
            label="إضافة مصروف"
            hint="مصروف خرج اليوم"
            icon={Receipt}
            tone="accent"
          />
          <QuickActionLink
            href="/revenues?new=1"
            label="إضافة إيراد"
            hint="مبلغ دخل اليوم"
            icon={Wallet2}
            tone="info"
          />
        </div>
      </section>

      {/* The four numbers that describe your position: what you still owe,
          what is already late, what you collected this month, and whether the
          month is net positive. */}
      <div className="grid grid-cols-2 gap-3 stagger sm:gap-4 lg:grid-cols-4">
        <StatCard
          label="إجمالي المتبقي عليك"
          value={formatCompactAmount(debts.remaining, currency)}
          hint={`${debts.active} دين قيد السداد`}
          icon={TrendingDown}
          tone="warning"
          emphasis
          className="col-span-2 lg:col-span-1"
        />
        <StatCard
          label="المبالغ المتأخرة"
          value={formatCompactAmount(debts.overdueAmount, currency)}
          hint={debts.overdue > 0 ? `${debts.overdue} دين متأخر` : 'لا شيء متأخر'}
          icon={AlertTriangle}
          tone={debts.overdue > 0 ? 'destructive' : 'success'}
        />
        <StatCard
          label="المحصّل هذا الشهر"
          value={formatCompactAmount(month.collected, currency)}
          hint="دفعات مسجّلة خلال الشهر"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="صافي التدفق النقدي"
          value={formatCompactAmount(netCashFlow, currency)}
          hint={`${netCashFlow >= 0 ? 'فائض' : 'عجز'} هذا الشهر`}
          icon={Scale}
          tone={netCashFlow >= 0 ? 'success' : 'destructive'}
        />
      </div>

      {/* What needs a decision — clickable, ordered by what it costs to
          ignore. This replaces the old overdue banner, which said the same
          thing without letting you act on any single debt. */}
      <AttentionPanel feed={attention} />

      {/* Financial overview — revenue/expense/net/collected, switchable by
          period, with the chart behind it. */}
      <FinancialOverview ownerId={ownerId} currency={currency} initial={initialPeriodSummary} />

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
          <p className="pt-1 text-xs leading-relaxed text-muted-foreground">
            سدّدت {formatPercent(progress)} من {debts.count} ديناً مسجّلاً، منها {debts.settled} دين
            مكتمل.
          </p>
        </CardContent>
      </Card>

      {/* Breakdown chart + priority list, side by side on wide screens. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <DebtsBreakdownChart breakdown={breakdown} currency={currency} />

        {/* Priority list -------------------------------------------------- */}
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
                    <Link href="/debts?new=1">إضافة دين</Link>
                  </Button>
                }
                className="border-0 py-8"
              />
            ) : (
              <ul className="divide-y stagger">
                {urgent.map((debt) => {
                  const status = debtDisplayStatus(debt);
                  const StatusIcon = status.icon;
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
                        className={cn(
                          '-mx-2 flex min-h-[56px] items-center gap-3 rounded-lg px-2 py-3',
                          'transition-colors duration-fast hover:bg-muted/40',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        )}
                      >
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
                          aria-hidden
                        >
                          <CatIcon className="size-5" />
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{debt.creditor_name}</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <Pill tone={status.tone} icon={StatusIcon} srLabel="الحالة">
                              {status.label}
                            </Pill>
                            {debt.due_date ? (
                              <Pill srLabel="تاريخ الاستحقاق">{formatDate(debt.due_date)}</Pill>
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
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
