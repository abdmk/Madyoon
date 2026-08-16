'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { LineChart as LineIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { monthlyExpenses } from '@/lib/stats';
import { formatAmount, formatNumber } from '@/lib/format';
import type { Expense } from '@/lib/types';

const MONTH_LABELS = [
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

function monthLabel(key: string) {
  const month = Number(key.slice(5, 7));
  return MONTH_LABELS[month - 1] ?? key;
}

export function ExpensesTrendChart({
  expenses,
  currency,
}: {
  expenses: Expense[];
  currency: string;
}) {
  const data = React.useMemo(
    () => monthlyExpenses(expenses, 6).map((d) => ({ ...d, label: monthLabel(d.month) })),
    [expenses],
  );

  const hasData = data.some((d) => d.total > 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>اتجاه المصاريف</CardTitle>
        <CardDescription>آخر ٦ أشهر</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {!hasData ? (
          <EmptyState
            icon={LineIcon}
            title="لا توجد مصاريف مسجلة"
            description="سجّل مصاريفك ليظهر الاتجاه الشهري هنا."
            className="border-0 py-8"
          />
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(258 90% 66%)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="hsl(258 90% 66%)" stopOpacity={0.02} />
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
                        <p className="font-medium">{label}</p>
                        <p className="tabular text-muted-foreground">
                          {formatAmount(payload[0].value as number, currency)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(258 90% 66%)"
                  strokeWidth={2}
                  fill="url(#expenseFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
