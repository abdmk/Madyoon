'use client';

import * as React from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as LineIcon } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { formatAmount, formatNumber } from '@/lib/formatters';
import type { DashboardPeriod, DashboardPeriodPoint } from '@/lib/types';

const SERIES = [
  { key: 'revenues', label: 'الإيرادات', color: 'hsl(142 71% 45%)' },
  { key: 'expenses', label: 'المصاريف', color: 'hsl(258 90% 66%)' },
  { key: 'collected', label: 'التحصيل', color: 'hsl(217 91% 60%)' },
] as const;

/** Hourly labels ("14:00") are dense — thin them out so the axis stays readable. */
function xAxisInterval(period: DashboardPeriod, count: number) {
  if (period === 'today') return Math.max(0, Math.ceil(count / 8) - 1);
  if (period === 'month') return Math.max(0, Math.ceil(count / 10) - 1);
  return 0;
}

export function FinancialChart({
  period,
  series,
  currency,
}: {
  period: DashboardPeriod;
  series: DashboardPeriodPoint[];
  currency: string;
}) {
  const hasData = series.some((p) => p.revenues > 0 || p.expenses > 0 || p.collected > 0);

  if (!hasData) {
    return (
      <EmptyState
        icon={LineIcon}
        title="لا توجد حركة مالية بعد لهذه الفترة"
        description="سجّل إيراداً أو مصروفاً ليظهر الرسم البياني هنا."
        className="border-0 py-10"
      />
    );
  }

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={series} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(142 71% 45%)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="hsl(142 71% 45%)" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="expenseFillFinancial" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(258 90% 66%)" stopOpacity={0.25} />
              <stop offset="100%" stopColor="hsl(258 90% 66%)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            reversed
            interval={xAxisInterval(period, series.length)}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <YAxis
            orientation="right"
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v: number) => formatNumber(v)}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                  <p className="mb-1 font-medium">{label}</p>
                  <div className="space-y-0.5">
                    {SERIES.map((s) => {
                      const entry = payload.find((p) => p.dataKey === s.key);
                      if (!entry) return null;
                      return (
                        <p key={s.key} className="flex items-center gap-2 tabular">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: s.color }}
                            aria-hidden
                          />
                          <span className="text-muted-foreground">{s.label}</span>
                          <span className="ms-auto font-medium">
                            {formatAmount(entry.value as number, currency)}
                          </span>
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            }}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value: string) => SERIES.find((s) => s.key === value)?.label ?? value}
          />
          <Area
            type="monotone"
            dataKey="revenues"
            stroke="hsl(142 71% 45%)"
            strokeWidth={2}
            fill="url(#revenueFill)"
            isAnimationActive
            animationDuration={400}
            animationEasing="ease-out"
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="hsl(258 90% 66%)"
            strokeWidth={2}
            fill="url(#expenseFillFinancial)"
            isAnimationActive
            animationDuration={400}
            animationEasing="ease-out"
          />
          <Line
            type="monotone"
            dataKey="collected"
            stroke="hsl(217 91% 60%)"
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={400}
            animationEasing="ease-out"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
