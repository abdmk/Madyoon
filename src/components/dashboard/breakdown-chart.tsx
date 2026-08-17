'use client';

import * as React from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { DEBT_CATEGORIES } from '@/lib/constants';
import { formatAmount, formatPercent } from '@/lib/format';

export interface BreakdownSlice {
  key: string;
  value: number;
}

/** Remaining-amount-by-category donut. The grouping happens in Postgres. */
export function DebtsBreakdownChart({
  breakdown,
  currency,
}: {
  breakdown: BreakdownSlice[];
  currency: string;
}) {
  const data = React.useMemo(
    () =>
      breakdown.map((b) => ({
        key: b.key,
        name: DEBT_CATEGORIES[b.key as keyof typeof DEBT_CATEGORIES]?.label ?? b.key,
        color: DEBT_CATEGORIES[b.key as keyof typeof DEBT_CATEGORIES]?.color ?? 'hsl(215 16% 47%)',
        value: b.value,
      })),
    [breakdown],
  );

  const total = data.reduce((acc, d) => acc + d.value, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <CardTitle>توزيع الديون</CardTitle>
        <CardDescription>المتبقي حسب التصنيف</CardDescription>
      </CardHeader>

      <CardContent className="flex-1">
        {data.length === 0 ? (
          <EmptyState
            icon={PieIcon}
            title="لا توجد ديون قيد السداد"
            description="سيظهر التوزيع هنا بمجرد إضافة ديون."
            className="border-0 py-8"
          />
        ) : (
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="h-48 w-full sm:w-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="58%"
                    outerRadius="92%"
                    paddingAngle={2}
                    strokeWidth={0}
                    isAnimationActive
                    animationDuration={400}
                    animationEasing="ease-out"
                  >
                    {data.map((entry) => (
                      <Cell key={entry.key} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as (typeof data)[number];
                      return (
                        <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
                          <p className="font-medium">{p.name}</p>
                          <p className="tabular text-muted-foreground">
                            {formatAmount(p.value, currency)} ({formatPercent((p.value / total) * 100)})
                          </p>
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <ul className="w-full flex-1 space-y-2">
              {data.map((d) => (
                <li key={d.key} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: d.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">{d.name}</span>
                  <span className="shrink-0 font-medium tabular">
                    {formatAmount(d.value, currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
