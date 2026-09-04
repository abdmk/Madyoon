'use client';

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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatAmount, formatNumber } from '@/lib/formatters';

export interface AnalyticsChartPoint {
  label: string;
  debts_total: number;
  paid_total: number;
  expenses_total: number;
  new_users: number;
}

const axis = { fontSize: 11, fill: 'hsl(var(--muted-foreground))' };

export function AnalyticsCharts({
  data,
  currency,
}: {
  data: AnalyticsChartPoint[];
  currency: string;
}) {
  return (
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
  );
}
