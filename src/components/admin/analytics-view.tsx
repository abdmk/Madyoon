'use client';

import * as React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/components/session-provider';
import { formatAmount, formatNumber } from '@/lib/format';
import type { AnalyticsPoint } from '@/lib/types';

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

  const axis = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="التحليلات" description="اتجاهات النظام خلال آخر ١٢ شهراً." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="ديون مضافة" value={formatAmount(totals.debts, currency)} tone="primary" />
        <StatCard label="مبالغ مسددة" value={formatAmount(totals.paid, currency)} tone="success" />
        <StatCard
          label="مصاريف مسجّلة"
          value={formatAmount(totals.expenses, currency)}
          tone="accent"
        />
        <StatCard label="مستخدمون جدد" value={formatNumber(totals.users)} tone="muted" />
      </div>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="لا توجد بيانات كافية"
          description="ستظهر الرسوم البيانية بمجرد تسجيل ديون ومصاريف في النظام."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>الديون مقابل المسدد</CardTitle>
              <CardDescription>حسب شهر الإضافة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="label" reversed tickLine={false} axisLine={false} tick={axis} />
                    <YAxis
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(v: number) => formatNumber(v)}
                      tick={axis}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                      content={({ active, payload, label: l }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                            <p className="mb-1 font-medium">{l}</p>
                            {payload.map((p) => (
                              <p key={p.dataKey as string} className="tabular text-muted-foreground">
                                {p.dataKey === 'debts_total' ? 'ديون' : 'مسدد'}:{' '}
                                {formatAmount(p.value as number, currency)}
                              </p>
                            ))}
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="debts_total" fill="hsl(217 91% 60%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="paid_total" fill="hsl(142 71% 45%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle>المصاريف الشهرية</CardTitle>
              <CardDescription>إجمالي ما سجّله المستخدمون</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="label" reversed tickLine={false} axisLine={false} tick={axis} />
                    <YAxis
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tickFormatter={(v: number) => formatNumber(v)}
                      tick={axis}
                    />
                    <Tooltip
                      content={({ active, payload, label: l }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                            <p className="font-medium">{l}</p>
                            <p className="tabular text-muted-foreground">
                              {formatAmount(payload[0].value as number, currency)}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="expenses_total"
                      stroke="hsl(258 90% 66%)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle>نمو المستخدمين</CardTitle>
              <CardDescription>حسابات جديدة كل شهر</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                    <XAxis dataKey="label" reversed tickLine={false} axisLine={false} tick={axis} />
                    <YAxis
                      orientation="right"
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      allowDecimals={false}
                      tick={axis}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted) / 0.4)' }}
                      content={({ active, payload, label: l }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                            <p className="font-medium">{l}</p>
                            <p className="tabular text-muted-foreground">
                              {formatNumber(payload[0].value as number)} مستخدم
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="new_users" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
