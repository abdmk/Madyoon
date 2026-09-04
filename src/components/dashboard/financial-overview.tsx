'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Banknote, Receipt, Scale, Wallet2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, Skeleton } from '@/components/ui/misc';
import { StatCard } from '@/components/shared/stat-card';
import { formatAmount, formatCompactAmount } from '@/lib/format';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { DashboardPeriod, DashboardPeriodSummary } from '@/lib/types';

// Recharts is heavy — keep it out of the dashboard's initial JS the same
// way DebtsBreakdownChart does, loading it only once this card mounts.
const FinancialChart = dynamic(
  () => import('./financial-chart').then((m) => m.FinancialChart),
  { ssr: false, loading: () => <Skeleton className="mt-5 h-64 w-full rounded-xl sm:h-72" /> },
);

const PERIODS: { value: DashboardPeriod; label: string }[] = [
  { value: 'today', label: 'اليوم' },
  { value: 'week', label: 'الأسبوع' },
  { value: 'month', label: 'الشهر' },
  { value: 'year', label: 'السنة' },
];

/**
 * The dashboard's financial centerpiece: revenue/expense/net/collected for a
 * selectable window, plus the chart behind them. The first paint uses
 * `initial` (fetched server-side alongside the rest of the dashboard, so
 * "month" never shows a loading flash); switching the period re-fetches
 * client-side since which window to aggregate is a client-only choice.
 */
export function FinancialOverview({
  ownerId,
  currency,
  initial,
}: {
  ownerId: string;
  currency: string;
  initial: DashboardPeriodSummary;
}) {
  const [period, setPeriod] = React.useState<DashboardPeriod>('month');
  const [summary, setSummary] = React.useState(initial);
  const [loading, setLoading] = React.useState(false);
  // Ignore a stale response if the period changes again before it lands.
  const requestId = React.useRef(0);

  async function changePeriod(next: DashboardPeriod) {
    if (next === period) return;
    setPeriod(next);
    setLoading(true);
    const id = ++requestId.current;

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('dashboard_period_summary', {
      p_owner: ownerId,
      p_period: next,
    });

    if (id !== requestId.current) return;
    setLoading(false);
    if (!error && data) setSummary(data as DashboardPeriodSummary);
  }

  const { totals, series } = summary;
  const net = totals.revenues - totals.expenses;

  return (
    <Card className="animate-fade-up">
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 space-y-0 pb-3">
        <div>
          <CardTitle>الملخص المالي</CardTitle>
          <CardDescription>الإيرادات والمصاريف والتحصيل خلال الفترة المحددة</CardDescription>
        </div>

        <Tabs value={period} onValueChange={(v) => changePeriod(v as DashboardPeriod)}>
          <TabsList>
            {PERIODS.map((p) => (
              <TabsTrigger key={p.value} value={p.value}>
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="space-y-5">
        <div
          className={cn('transition-opacity duration-fast', loading && 'opacity-60')}
          aria-busy={loading}
        >
          <div className="grid grid-cols-2 gap-3 stagger lg:grid-cols-4">
            <StatCard
              label="إجمالي الإيرادات"
              value={formatCompactAmount(totals.revenues, currency)}
              icon={Banknote}
              tone="success"
            />
            <StatCard
              label="إجمالي المصاريف"
              value={formatCompactAmount(totals.expenses, currency)}
              icon={Receipt}
              tone="accent"
            />
            <StatCard
              label="صافي الربح"
              value={formatCompactAmount(net, currency)}
              hint={net >= 0 ? 'ربح' : 'خسارة'}
              icon={Scale}
              tone={net >= 0 ? 'success' : 'destructive'}
            />
            <StatCard
              label="المبالغ المحصّلة"
              value={formatCompactAmount(totals.collected, currency)}
              icon={Wallet2}
              tone="primary"
            />
          </div>

          {loading ? (
            <Skeleton className="mt-5 h-64 w-full rounded-xl sm:h-72" />
          ) : (
            <div className="mt-5">
              <FinancialChart period={period} series={series} currency={currency} />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
