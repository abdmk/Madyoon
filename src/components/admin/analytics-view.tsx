'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { BarChart3, CheckCircle2, Receipt, UserPlus, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { StatCard } from '@/components/shared/stat-card';
import { Skeleton } from '@/components/ui/misc';
import { useSession } from '@/components/session-provider';
import { formatAmount, formatCompactAmount, formatNumber } from '@/lib/formatters';
import type { AnalyticsPoint } from '@/lib/types';

// Recharts is the heaviest dependency this page pulls in — split into its own
// chunk so the KPI cards render without waiting on it, same as the dashboard.
const AnalyticsCharts = dynamic(
  () => import('./analytics-charts').then((m) => m.AnalyticsCharts),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full rounded-xl lg:col-span-2" /> },
);

const MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

function label(month: string) {
  const [year, m] = month.split('-');
  return `${MONTHS[Number(m) - 1] ?? m} ${year.slice(2)}`;
}

export function AnalyticsView({ points }: { points: AnalyticsPoint[] }) {
  const { profile } = useSession();
  const currency = profile.currency;

  const data = React.useMemo(
    () =>
      points.map((p) => ({
        ...p,
        label: label(p.month),
        debts_total: Number(p.debts_total),
        paid_total: Number(p.paid_total),
        expenses_total: Number(p.expenses_total),
        new_users: Number(p.new_users),
      })),
    [points],
  );

  const totals = React.useMemo(
    () =>
      data.reduce(
        (acc, p) => ({
          debts: acc.debts + p.debts_total,
          paid: acc.paid + p.paid_total,
          expenses: acc.expenses + p.expenses_total,
          users: acc.users + p.new_users,
        }),
        { debts: 0, paid: 0, expenses: 0, users: 0 },
      ),
    [data],
  );

  const hasData = data.some(
    (p) => p.debts_total > 0 || p.expenses_total > 0 || p.new_users > 0,
  );

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="التحليلات" description="اتجاهات النظام خلال آخر ١٢ شهراً." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ديون مضافة" value={formatCompactAmount(totals.debts, currency)} icon={Wallet} tone="primary" />
        <StatCard label="مبالغ مسددة" value={formatCompactAmount(totals.paid, currency)} icon={CheckCircle2} tone="success" />
        <StatCard
          label="مصاريف مسجّلة"
          value={formatCompactAmount(totals.expenses, currency)}
          icon={Receipt}
          tone="accent"
        />
        <StatCard label="مستخدمون جدد" value={formatNumber(totals.users)} icon={UserPlus} tone="muted" />
      </div>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="لا توجد بيانات كافية"
          description="ستظهر الرسوم البيانية بمجرد تسجيل ديون ومصاريف في النظام."
        />
      ) : (
        <AnalyticsCharts data={data} currency={currency} />
      )}
    </div>
  );
}
