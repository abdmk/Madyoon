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
import { formatAmount, formatNumber } from '@/lib/formatters';
import type { CashflowPoint } from '@/lib/types';

const MONTHS = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const SERIES = [
  { key: 'revenues', label: 'الإيرادات', color: 'hsl(var(--success))' },
  { key: 'expenses', label: 'المصاريف', color: 'hsl(var(--accent))' },
  { key: 'collected', label: 'التحصيل', color: 'hsl(var(--primary))' },
] as const;

function monthLabel(key: string) {
  const month = Number(key.slice(5, 7));
  return MONTHS[month - 1] ?? key;
}

/** Money in, money out and debt collected, month by month. */
export function CashflowChart({
  data,
  currency,
}: {
  data: CashflowPoint[];
  currency: string;
}) {
  const points = React.useMemo(
    () => data.map((d) => ({ ...d, label: monthLabel(d.month) })),
    [data],
  );

  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={points} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <defs>
            <linearGradient id="reportRevenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.28} />
              <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="reportExpenseFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.22} />
              <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            reversed
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
            stroke="hsl(var(--success))"
            strokeWidth={2}
            fill="url(#reportRevenueFill)"
            animationDuration={400}
          />
          <Area
            type="monotone"
            dataKey="expenses"
            stroke="hsl(var(--accent))"
            strokeWidth={2}
            fill="url(#reportExpenseFill)"
            animationDuration={400}
          />
          <Line
            type="monotone"
            dataKey="collected"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            animationDuration={400}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
