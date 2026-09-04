import Link from 'next/link';
import dynamic from 'next/dynamic';
import { CalendarClock, Layers, PiggyBank, TrendingDown, TrendingUp, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Progress, Skeleton } from '@/components/ui/misc';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { formatAmount, formatCompactAmount, formatPercent } from '@/lib/formatters';
import { pctChange, sumBy } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import type { ReportsSummary } from '@/lib/types';

const CashflowChart = dynamic(
  () => import('./cashflow-chart').then((m) => m.CashflowChart),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl sm:h-72" /> },
);

const RANGES = [
  { months: 6, label: '٦ أشهر' },
  { months: 12, label: 'سنة' },
] as const;

/** Keyed loosely: a category saved before a rename still renders its raw value. */
const CATEGORY_LABEL = new Map<string, { label: string; icon: string }>(
  EXPENSE_CATEGORIES.map((c) => [c.value as string, { label: c.label, icon: c.icon }]),
);

/** A section's headline finding, stated in words rather than left to the chart. */
function Insight({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'good' | 'bad' }) {
  return (
    <p
      className={cn(
        'rounded-lg px-3 py-2 text-[13px] leading-relaxed',
        tone === 'good' && 'bg-soft-success text-soft-success-foreground',
        tone === 'bad' && 'bg-soft-warning text-soft-warning-foreground',
        tone === 'neutral' && 'bg-secondary text-muted-foreground',
      )}
    >
      {children}
    </p>
  );
}

export function ReportsView({
  data,
  currency,
  months,
}: {
  data: ReportsSummary;
  currency: string;
  months: number;
}) {
  const { cashflow, collection, aging, topCreditors, expenseCategories, comparison } = data;

  const totalIn = sumBy(cashflow, (p) => p.revenues);
  const totalOut = sumBy(cashflow, (p) => p.expenses);
  const net = totalIn - totalOut;

  const collectionRate =
    Number(collection.billed) > 0
      ? (Number(collection.collected) / Number(collection.billed)) * 100
      : 0;

  const agingRows = [
    { key: 'current', label: 'لم تستحق بعد', value: Number(aging.current), tone: 'success' as const },
    { key: 'days1_30', label: 'متأخرة ١–٣٠ يوم', value: Number(aging.days1_30), tone: 'warning' as const },
    { key: 'days31_60', label: 'متأخرة ٣١–٦٠ يوم', value: Number(aging.days31_60), tone: 'warning' as const },
    { key: 'days61_90', label: 'متأخرة ٦١–٩٠ يوم', value: Number(aging.days61_90), tone: 'danger' as const },
    { key: 'over90', label: 'متأخرة أكثر من ٩٠ يوم', value: Number(aging.over90), tone: 'danger' as const },
    { key: 'undated', label: 'بدون موعد استحقاق', value: Number(aging.undated), tone: 'neutral' as const },
  ].filter((row) => row.value > 0);

  const agingTotal = agingRows.reduce((sum, r) => sum + r.value, 0);
  const lateTotal =
    Number(aging.days1_30) + Number(aging.days31_60) + Number(aging.days61_90) + Number(aging.over90);
  const deepLate = Number(aging.days61_90) + Number(aging.over90);

  const revChange = pctChange(Number(comparison.thisMonth.revenues), Number(comparison.lastMonth.revenues));
  const expChange = pctChange(Number(comparison.thisMonth.expenses), Number(comparison.lastMonth.expenses));
  const colChange = pctChange(Number(comparison.thisMonth.collected), Number(comparison.lastMonth.collected));

  const expenseTotal = sumBy(expenseCategories, (c) => c.total);
  const hasAnything =
    totalIn > 0 || totalOut > 0 || agingTotal > 0 || Number(collection.collected) > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="التقارير" description="ما تقوله أرقامك عن الأشهر الماضية.">
        <nav aria-label="المدة" className="flex rounded-lg bg-muted p-1">
          {RANGES.map((range) => {
            const active = range.months === months;
            return (
              <Link
                key={range.months}
                href={`/reports?months=${range.months}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors duration-fast',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  active
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {range.label}
              </Link>
            );
          })}
        </nav>
      </PageHeader>

      {!hasAnything ? (
        <EmptyState
          icon={Layers}
          title="لا توجد بيانات كافية بعد"
          description="سجّل ديوناً ومصاريف وإيرادات، وستظهر هنا اتجاهاتك ونسب التحصيل وأعمار الديون."
        />
      ) : (
        <>
          {/* 1. Cash flow ------------------------------------------------- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>التدفق النقدي</CardTitle>
              <CardDescription>الداخل مقابل الخارج، شهراً بشهر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <SummaryFigure label="إيرادات" value={formatCompactAmount(totalIn, currency)} icon={TrendingUp} tone="success" />
                <SummaryFigure label="مصاريف" value={formatCompactAmount(totalOut, currency)} icon={TrendingDown} tone="accent" />
                <SummaryFigure
                  label="الصافي"
                  value={formatCompactAmount(net, currency)}
                  icon={PiggyBank}
                  tone={net >= 0 ? 'success' : 'danger'}
                />
              </div>

              <CashflowChart data={cashflow} currency={currency} />

              <Insight tone={net >= 0 ? 'good' : 'bad'}>
                {net >= 0
                  ? `خلال هذه المدة دخلك يغطي مصاريفك بفارق ${formatAmount(net, currency)}. الفائض هذا هو ما يمكنك توجيهه لتسديد الديون.`
                  : `مصاريفك تجاوزت إيراداتك بمقدار ${formatAmount(Math.abs(net), currency)}. تقليل أكبر بندين في المصاريف بالأسفل هو أسرع طريق لعكس هذا.`}
              </Insight>
            </CardContent>
          </Card>

          {/* 2. Collection rate ------------------------------------------ */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>نسبة التحصيل</CardTitle>
                <CardDescription>كم سُدّد من الديون المسجّلة في المدة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between gap-3">
                  <span className="font-display text-3xl font-semibold tabular text-primary">
                    {formatPercent(collectionRate)}
                  </span>
                  <span className="text-sm text-muted-foreground tabular">
                    {formatCompactAmount(collection.collected, currency)} من{' '}
                    {formatCompactAmount(collection.billed, currency)}
                  </span>
                </div>
                <Progress value={Math.min(collectionRate, 100)} className="h-3" />

                <Insight tone={collectionRate >= 60 ? 'good' : 'bad'}>
                  {collectionRate >= 60
                    ? `وتيرة سداد جيدة. المتبقي غير المسدّد حالياً ${formatAmount(collection.outstanding, currency)}.`
                    : `أقل من ثلثي ما سُجّل تم سداده. المتبقي عليك الآن ${formatAmount(collection.outstanding, currency)} — ابدأ بالمتأخرات في القسم التالي.`}
                </Insight>
              </CardContent>
            </Card>

            {/* 3. Aging --------------------------------------------------- */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>أعمار الديون</CardTitle>
                <CardDescription>كم مضى على استحقاق ما لم يُسدَّد</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {agingRows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    لا توجد مبالغ غير مسدّدة.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {agingRows.map((row) => {
                      const share = agingTotal > 0 ? (row.value / agingTotal) * 100 : 0;
                      return (
                        <li key={row.key}>
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="truncate text-muted-foreground">{row.label}</span>
                            <span className="shrink-0 font-medium tabular">
                              {formatCompactAmount(row.value, currency)}
                            </span>
                          </div>
                          <div className="mt-1.5 flex items-center gap-2">
                            <Progress
                              value={share}
                              className="h-1.5 flex-1"
                              indicatorClassName={
                                row.tone === 'danger'
                                  ? 'bg-destructive'
                                  : row.tone === 'warning'
                                    ? 'bg-warning'
                                    : row.tone === 'success'
                                      ? 'bg-success'
                                      : undefined
                              }
                            />
                            <Pill tone={row.tone} className="shrink-0 tabular">
                              {Math.round(share)}%
                            </Pill>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {agingTotal > 0 ? (
                  <Insight tone={deepLate > 0 ? 'bad' : 'good'}>
                    {deepLate > 0
                      ? `${formatAmount(deepLate, currency)} متأخر أكثر من شهرين — هذه أول ما يجب معالجته.`
                      : lateTotal > 0
                        ? `المتأخر كله ضمن الشهر الأول (${formatAmount(lateTotal, currency)}) ولم يتراكم بعد.`
                        : 'لا شيء متأخر — كل المبالغ ما زالت ضمن مواعيدها.'}
                  </Insight>
                ) : null}
              </CardContent>
            </Card>
          </div>

          {/* 4. Top creditors + 5. Expense categories --------------------- */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>أكبر الجهات الدائنة</CardTitle>
                <CardDescription>مَن يملك أكبر حصة من المتبقي عليك</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topCreditors.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    لا توجد ديون قائمة.
                  </p>
                ) : (
                  <>
                    <ul className="divide-y">
                      {topCreditors.map((creditor) => (
                        <li key={creditor.name}>
                          <Link
                            href={`/debts/creditor/${encodeURIComponent(creditor.name)}`}
                            className={cn(
                              '-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5',
                              'transition-colors duration-fast hover:bg-muted/40',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                            )}
                          >
                            <span
                              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-soft-primary text-soft-primary-foreground"
                              aria-hidden
                            >
                              <Users className="size-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-medium">
                                {creditor.name}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {creditor.debts} دين
                                {Number(creditor.overdue) > 0
                                  ? ` · ${creditor.overdue} متأخر`
                                  : ''}
                              </span>
                            </span>
                            <span className="shrink-0 font-medium tabular">
                              {formatCompactAmount(creditor.remaining, creditor.currency || currency)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <Insight>
                      {(() => {
                        const top = topCreditors[0];
                        const totalRemaining = topCreditors.reduce(
                          (sum, c) => sum + Number(c.remaining),
                          0,
                        );
                        const share =
                          totalRemaining > 0 ? (Number(top.remaining) / totalRemaining) * 100 : 0;
                        return `«${top.name}» وحده يمثّل ${formatPercent(share)} من هذه القائمة — التفاوض معه له أثر أكبر من بقية الجهات مجتمعة.`;
                      })()}
                    </Insight>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle>أبواب الصرف</CardTitle>
                <CardDescription>أين ذهبت المصاريف في المدة</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {expenseCategories.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    لا توجد مصاريف مسجّلة.
                  </p>
                ) : (
                  <>
                    <ul className="space-y-3">
                      {expenseCategories.slice(0, 6).map((cat) => {
                        const meta = CATEGORY_LABEL.get(cat.category);
                        const share =
                          expenseTotal > 0 ? (Number(cat.total) / expenseTotal) * 100 : 0;
                        return (
                          <li key={cat.category}>
                            <div className="flex items-center justify-between gap-2 text-sm">
                              <span className="flex min-w-0 items-center gap-2">
                                <span aria-hidden>{meta?.icon ?? '📦'}</span>
                                <span className="truncate">{meta?.label ?? cat.category}</span>
                              </span>
                              <span className="shrink-0 font-medium tabular">
                                {formatCompactAmount(cat.total, currency)}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2">
                              <Progress value={share} className="h-1.5 flex-1" />
                              <Pill className="shrink-0 tabular">{Math.round(share)}%</Pill>
                            </div>
                          </li>
                        );
                      })}
                    </ul>

                    <Insight>
                      {(() => {
                        const top = expenseCategories[0];
                        const meta = CATEGORY_LABEL.get(top.category);
                        const share =
                          expenseTotal > 0 ? (Number(top.total) / expenseTotal) * 100 : 0;
                        return `${meta?.label ?? top.category} يستهلك ${formatPercent(share)} من مصاريفك. خفضه بمقدار الخُمس يوفّر ${formatAmount(Number(top.total) * 0.2, currency)} على نفس المدة.`;
                      })()}
                    </Insight>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 6. Month over month ----------------------------------------- */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>هذا الشهر مقابل الماضي</CardTitle>
              <CardDescription>هل تتحسّن الصورة أم تسوء</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <ComparisonRow
                  label="الإيرادات"
                  now={Number(comparison.thisMonth.revenues)}
                  change={revChange}
                  currency={currency}
                  goodWhenUp
                />
                <ComparisonRow
                  label="المصاريف"
                  now={Number(comparison.thisMonth.expenses)}
                  change={expChange}
                  currency={currency}
                  goodWhenUp={false}
                />
                <ComparisonRow
                  label="التحصيل"
                  now={Number(comparison.thisMonth.collected)}
                  change={colChange}
                  currency={currency}
                  goodWhenUp
                />
              </div>

              <Insight tone={revChange >= 0 && expChange <= 0 ? 'good' : 'neutral'}>
                {revChange >= 0 && expChange <= 0
                  ? 'الاتجاه صحّي: الإيرادات ثابتة أو أعلى، والمصاريف لم ترتفع.'
                  : expChange > 0 && revChange < 0
                    ? 'المصاريف ترتفع بينما الإيرادات تنخفض — أضيق فجوة يجب الانتباه لها هذا الشهر.'
                    : 'الشهر ما زال جارياً، لذا المقارنة تكتمل مع نهايته.'}
              </Insight>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryFigure({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof TrendingUp;
  tone: 'success' | 'accent' | 'danger';
}) {
  return (
    <div className="min-w-0 rounded-xl border bg-card p-3">
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-full',
            tone === 'success' && 'bg-soft-success text-soft-success-foreground',
            tone === 'accent' && 'bg-soft-accent text-soft-accent-foreground',
            tone === 'danger' && 'bg-soft-danger text-soft-danger-foreground',
          )}
          aria-hidden
        >
          <Icon className="size-4" />
        </span>
        <span className="truncate text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="mt-2 truncate font-display text-lg font-semibold tabular">{value}</p>
    </div>
  );
}

function ComparisonRow({
  label,
  now,
  change,
  currency,
  goodWhenUp,
}: {
  label: string;
  now: number;
  change: number;
  currency: string;
  goodWhenUp: boolean;
}) {
  const up = change > 0.5;
  const down = change < -0.5;
  const good = up ? goodWhenUp : down ? !goodWhenUp : true;
  const Icon = up ? TrendingUp : down ? TrendingDown : CalendarClock;

  return (
    <div className="min-w-0 rounded-xl border bg-card p-3">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-display text-lg font-semibold tabular">
        {formatCompactAmount(now, currency)}
      </p>
      <Pill
        tone={up || down ? (good ? 'success' : 'danger') : 'neutral'}
        icon={Icon}
        className="mt-2"
        srLabel={up ? 'ارتفاع' : down ? 'انخفاض' : 'بلا تغيير'}
      >
        {up || down ? `${Math.abs(Math.round(change))}%` : 'بلا تغيير'}
      </Pill>
    </div>
  );
}
