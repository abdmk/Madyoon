'use client';

import * as React from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Landmark,
  Phone,
  Receipt,
  Wallet,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Progress, Skeleton } from '@/components/ui/misc';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/shared/empty-state';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { DEBT_CATEGORIES, DEBT_STATUS, PAYMENT_METHODS, PRIORITIES } from '@/lib/constants';
import { dueInfo, formatAmount, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DebtDetail } from '@/lib/types';

const METHOD_ICON = { cash: Banknote, transfer: Landmark } as const;

/**
 * Everything the list deliberately leaves out — phone, notes, timestamps and
 * the payment ledger — fetched once, only when a row is actually opened.
 */
export function DebtDetailDialog({
  debtId,
  open,
  onOpenChange,
}: {
  debtId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [detail, setDetail] = React.useState<DebtDetail | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open || !debtId) return;

    let cancelled = false;
    setLoading(true);
    setDetail(null);

    const supabase = getSupabaseBrowserClient();
    (async () => {
      const { data } = await supabase.rpc('debt_detail', { p_id: debtId });
      if (cancelled) return;
      setDetail((data as DebtDetail | null) ?? null);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, debtId]);

  const debt = detail?.debt;
  const cat = debt ? DEBT_CATEGORIES[debt.category] : null;
  const CatIcon = cat?.icon ?? null;
  const due = debt ? dueInfo(debt) : null;
  const pct = debt && Number(debt.amount) > 0 ? (Number(debt.paid_amount) / Number(debt.amount)) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {loading || !debt ? (
          <DetailSkeleton />
        ) : (
          <>
            <DialogHeader>
              <div className="flex items-start gap-3">
                <span
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${cat!.color}1a`, color: cat!.color }}
                  aria-hidden
                >
                  {CatIcon && <CatIcon className="size-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <DialogTitle className="flex items-center gap-2">
                    {debt.creditor_name}
                    <Badge variant="outline" className={PRIORITIES[debt.priority].className}>
                      {PRIORITIES[debt.priority].label}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{cat!.label}</span>
                    {debt.phone ? (
                      <span className="flex items-center gap-1 tabular" dir="ltr">
                        <Phone className="size-3" />
                        {debt.phone}
                      </span>
                    ) : null}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* KPIs -------------------------------------------------------- */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MiniStat label="الإجمالي" value={formatAmount(debt.amount, debt.currency)} tone="primary" />
              <MiniStat label="المسدد" value={formatAmount(debt.paid_amount, debt.currency)} tone="success" />
              <MiniStat
                label="المتبقي"
                value={formatAmount(debt.remaining_amount, debt.currency)}
                tone="warning"
              />
              <MiniStat
                label="متأخرة"
                value={due?.state === 'overdue' ? 'نعم' : 'لا'}
                tone={due?.state === 'overdue' ? 'destructive' : 'muted'}
              />
            </div>

            <div className="space-y-2">
              <Progress
                value={pct}
                className="h-2"
                indicatorClassName={debt.status === 'paid' ? 'bg-success' : undefined}
              />
              <div className="flex flex-wrap items-center justify-between gap-y-1 text-xs text-muted-foreground">
                <Badge variant="outline" className={DEBT_STATUS[debt.status].className}>
                  {DEBT_STATUS[debt.status].label}
                </Badge>
                <div className="flex items-center gap-3">
                  {debt.debt_date ? (
                    <span>تاريخ الدين {formatDate(debt.debt_date)}</span>
                  ) : null}
                  {debt.due_date ? (
                    <span className={due?.className}>
                      الاستحقاق {formatDate(debt.due_date)} ({due?.label})
                    </span>
                  ) : (
                    <span>بدون موعد استحقاق</span>
                  )}
                </div>
              </div>
            </div>

            {debt.notes ? (
              <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                <p className="mb-1 text-xs font-medium text-muted-foreground">ملاحظات</p>
                <p className="leading-relaxed">{debt.notes}</p>
              </div>
            ) : null}

            {/* Payments ------------------------------------------------------ */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">سجل الدفعات</p>
                <span className="text-xs text-muted-foreground tabular">
                  {detail!.paymentsCount}
                </span>
              </div>

              {detail!.payments.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="لا توجد دفعات بعد"
                  description="ستظهر الدفعات هنا فور تسجيلها."
                  className="py-8"
                />
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto pe-1">
                  {detail!.payments.map((p) => {
                    const Icon = METHOD_ICON[p.method];
                    return (
                      <li
                        key={p.id}
                        className="flex items-center gap-3 rounded-lg border p-2.5 text-sm"
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                          <Icon className="size-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium tabular">{formatAmount(p.amount, debt.currency)}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {PAYMENT_METHODS[p.method].label} · {formatDate(p.paid_at)}
                            {p.note ? ` · ${p.note}` : ''}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone: 'primary' | 'success' | 'warning' | 'destructive' | 'muted';
}) {
  const TONE_ICON = {
    primary: Wallet,
    success: CheckCircle2,
    warning: Receipt,
    destructive: AlertTriangle,
    muted: CheckCircle2,
  } as const;
  const TONE_CLASS = {
    primary: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-warning bg-warning/10',
    destructive: 'text-destructive bg-destructive/10',
    muted: 'text-muted-foreground bg-muted',
  } as const;
  const Icon = TONE_ICON[tone];

  return (
    <Card className="p-3">
      <span
        className={cn('mb-2 flex size-7 items-center justify-center rounded-lg', TONE_CLASS[tone])}
        aria-hidden
      >
        <Icon className="size-3.5" />
      </span>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular">{value}</p>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-2 rounded-full" />
      <Skeleton className="h-24 rounded-xl" />
    </div>
  );
}
