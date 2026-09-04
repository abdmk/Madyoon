'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Circle,
  Clock,
  Flag,
  Landmark,
  Pencil,
  Phone,
  Receipt,
  Tag,
  Trash2,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/misc';
import { DebtFormDialog } from './debt-form-dialog';
import { PaymentDialog } from './payment-dialog';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { DEBT_CATEGORIES, DEBT_STATUS, PAYMENT_METHODS, PRIORITIES } from '@/lib/constants';
import { dueInfo, formatAmount, formatDate, formatDateTime, formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { DebtDetail, PaymentMethod } from '@/lib/types';

const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  transfer: Landmark,
};

const STATUS_ICON = {
  paid: CheckCircle2,
  partial: Clock,
  pending: Circle,
} as const;

/**
 * The full page for a single debt. Everything here is already resolved on the
 * server (see `getDebtDetail`); this component only owns the dialogs and the
 * refresh that follows a write.
 */
export function DebtDetailView({ detail }: { detail: DebtDetail }) {
  const router = useRouter();
  const { debt, payments, paymentsCount } = detail;

  const [payOpen, setPayOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const cat = DEBT_CATEGORIES[debt.category];
  const CatIcon = cat.icon;
  const due = dueInfo(debt);
  const pct = Number(debt.amount) > 0 ? (Number(debt.paid_amount) / Number(debt.amount)) * 100 : 0;
  const overdue = due.state === 'overdue';

  async function confirmDelete() {
    setDeleting(false);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('debts').delete().eq('id', debt.id);

    if (error) {
      toast.error('تعذّر حذف الدين', { description: error.message });
      return;
    }

    void supabase.rpc('write_log', {
      p_action: 'debt.delete',
      p_entity: 'debts',
      p_entity_id: debt.id,
      p_details: { creditor: debt.creditor_name },
    });

    toast.success('تم حذف الدين');
    router.push('/debts');
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <Button variant="ghost" size="sm" asChild className="-ms-2 no-print">
        <Link href="/debts">
          <ArrowRight className="size-4 transition-transform duration-fast group-hover:translate-x-0.5" />
          كل الديون
        </Link>
      </Button>

      {/* Identity ---------------------------------------------------------- */}
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <span
              className="flex size-11 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
              aria-hidden
            >
              <CatIcon className="size-5" />
            </span>
            <span className="min-w-0 truncate">{debt.creditor_name}</span>
          </span>
        }
      >
        {debt.status !== 'paid' ? (
          <Button variant="success" onClick={() => setPayOpen(true)}>
            <CheckCircle2 className="size-4" />
            تسجيل دفعة
          </Button>
        ) : null}
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
          تعديل
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="حذف الدين"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleting(true)}
        >
          <Trash2 className="size-4" />
        </Button>
      </PageHeader>

      {/* Metadata chips — one soft-tinted pill per fact, icon leading. */}
      <div className="flex flex-wrap items-center gap-2">
        {(() => {
          const StatusIcon = STATUS_ICON[debt.status];
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
                DEBT_STATUS[debt.status].className,
              )}
            >
              <StatusIcon className="size-4" />
              {DEBT_STATUS[debt.status].label}
            </span>
          );
        })()}
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium',
            PRIORITIES[debt.priority].className,
          )}
        >
          <Flag className="size-4" />
          {PRIORITIES[debt.priority].label}
        </span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
          style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
        >
          <CatIcon className="size-4" />
          {cat.label}
        </span>
        {debt.due_date ? (
          <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-sm font-medium', due.className)}>
            <CalendarClock className="size-4" />
            {formatDate(debt.due_date)}
          </span>
        ) : null}
        {debt.phone ? (
          <a
            href={`tel:${debt.phone}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-sm font-medium tabular text-secondary-foreground transition-colors hover:bg-secondary/70"
            dir="ltr"
          >
            <Phone className="size-4" />
            {debt.phone}
          </a>
        ) : null}
      </div>

      {/* Overdue banner ---------------------------------------------------- */}
      {overdue ? (
        <Card className="animate-fade-up border-destructive/30 bg-destructive/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium text-destructive">هذا الدين متأخر عن موعده</p>
              <p className="text-sm text-muted-foreground">
                كان مستحقاً في {formatDate(debt.due_date)} ({due.label}).
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* KPIs -------------------------------------------------------------- */}
      <div className="grid grid-cols-2 gap-3 stagger lg:grid-cols-4">
        <StatCard
          label="المتبقي"
          value={formatAmount(debt.remaining_amount, debt.currency)}
          icon={Wallet}
          tone={debt.status === 'paid' ? 'success' : 'warning'}
          emphasis
          className="col-span-2 lg:col-span-1"
        />
        <StatCard
          label="الإجمالي"
          value={formatAmount(debt.amount, debt.currency)}
          icon={Receipt}
          tone="primary"
        />
        <StatCard
          label="المسدد"
          value={formatAmount(debt.paid_amount, debt.currency)}
          hint={`${formatPercent(pct)} من الإجمالي`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="عدد الدفعات"
          value={paymentsCount}
          icon={Banknote}
          tone="accent"
        />
      </div>

      {/* Progress ---------------------------------------------------------- */}
      <Card>
        <CardContent className="space-y-2 p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">نسبة السداد</span>
            <span className="font-display text-xl font-semibold tabular text-primary">
              {formatPercent(pct)}
            </span>
          </div>
          <Progress
            value={pct}
            className="h-3"
            indicatorClassName={debt.status === 'paid' ? 'bg-success' : undefined}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>المسدد {formatAmount(debt.paid_amount, debt.currency)}</span>
            <span>المتبقي {formatAmount(debt.remaining_amount, debt.currency)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Details ---------------------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>التفاصيل</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <dl className="divide-y">
              <DetailRow icon={Phone} label="رقم الهاتف">
                {debt.phone ? (
                  <a href={`tel:${debt.phone}`} className="tabular hover:underline" dir="ltr">
                    {debt.phone}
                  </a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </DetailRow>

              <DetailRow icon={Tag} label="التصنيف">
                {cat.label}
              </DetailRow>

              <DetailRow icon={CalendarDays} label="تاريخ الدين">
                <span className="tabular">{formatDate(debt.debt_date)}</span>
              </DetailRow>

              <DetailRow icon={CalendarClock} label="تاريخ الاستحقاق">
                {debt.due_date ? (
                  <span className="flex flex-wrap items-center gap-x-2">
                    <span className="tabular">{formatDate(debt.due_date)}</span>
                    <span className={cn('text-xs', due.className)}>({due.label})</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">بدون موعد</span>
                )}
              </DetailRow>

              <DetailRow icon={Flag} label="الأولوية">
                <Badge className={PRIORITIES[debt.priority].className}>
                  {PRIORITIES[debt.priority].label}
                </Badge>
              </DetailRow>

              <DetailRow icon={CalendarDays} label="أُضيف في">
                <span className="tabular">{formatDateTime(debt.created_at)}</span>
              </DetailRow>
            </dl>
          </CardContent>
        </Card>

        {/* Payments --------------------------------------------------------- */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <CardTitle>سجل الدفعات</CardTitle>
              <Badge variant="soft" className="tabular">
                {paymentsCount}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="لا توجد دفعات بعد"
                description="ستظهر كل دفعة هنا بتاريخها وطريقتها فور تسجيلها."
                action={
                  debt.status !== 'paid' ? (
                    <Button size="sm" onClick={() => setPayOpen(true)}>
                      تسجيل أول دفعة
                    </Button>
                  ) : undefined
                }
                className="border-0 py-8"
              />
            ) : (
              <ul className="space-y-2 stagger">
                {payments.map((p) => {
                  const Icon = METHOD_ICON[p.method];
                  return (
                    <li
                      key={p.id}
                      className="flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/30"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium tabular">
                            {formatAmount(p.amount, debt.currency)}
                          </p>
                          <span className="shrink-0 text-xs text-muted-foreground tabular">
                            {formatDate(p.paid_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {PAYMENT_METHODS[p.method].label}
                        </p>
                        {p.note ? (
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {p.note}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes -------------------------------------------------------------- */}
      {debt.notes ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>ملاحظات</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{debt.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Dialogs ------------------------------------------------------------ */}
      <PaymentDialog
        debt={debt}
        open={payOpen}
        onOpenChange={setPayOpen}
        onPaid={() => router.refresh()}
      />
      <DebtFormDialog open={editOpen} onOpenChange={setEditOpen} debt={debt} />

      <AlertDialog open={deleting} onOpenChange={setDeleting}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الدين؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{debt.creditor_name}» وكل دفعاته نهائياً. لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={confirmDelete}>نعم، احذف</AlertDialogAction>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden />
        {label}
      </dt>
      <dd className="min-w-0 text-end text-sm font-medium">{children}</dd>
    </div>
  );
}
