'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Download,
  FileText,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Printer,
  Trash2,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { Pagination } from '@/components/feedback/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Pill } from '@/components/ui/pill';
import { Progress } from '@/components/ui/misc';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { DebtFilters } from './debt-filters';
import { PaymentDialog } from './payment-dialog';
import { DEBT_CATEGORIES, DEBT_STATUS, PRIORITIES } from '@/lib/constants';
import { dueInfo, formatAmount, formatCompactAmount, formatDate } from '@/lib/formatters';
import { downloadCsv, printCurrentView, timestampedName } from '@/lib/export';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { PAGE_SIZE } from '@/lib/params';
import { debtFiltersActive, debtQueryString } from '@/features/debts/params';
import { debtDisplayStatus } from '@/features/debts/status';
import { useDebouncedSearch, useListQuery } from '@/hooks/use-list-query';
import { useOpenOnParam } from '@/hooks/use-open-on-param';
import { cn } from '@/lib/utils';
import type { Debt, DebtListItem } from '@/lib/types';
import type { DebtQuery } from '@/features/debts/params';
import type { DebtsPage } from '@/lib/types';

export function DebtsView({
  page,
  query,
  currency,
  currencies,
}: {
  page: DebtsPage;
  query: DebtQuery;
  currency: string;
  currencies: string[];
}) {
  const router = useRouter();
  const { update, setPage, pending } = useListQuery(query, debtQueryString);
  const [search, setSearch] = useDebouncedSearch(query.search, (v) => update({ search: v }));

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Debt | null>(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [paying, setPaying] = React.useState<DebtListItem | null>(null);
  const [pickPayment, setPickPayment] = React.useState(false);
  const [deleting, setDeleting] = React.useState<DebtListItem | null>(null);

  const { rows, total, summary } = page;
  const activeFilterCount = debtFiltersActive(query);
  const unsettled = rows.filter((d) => d.status !== 'paid');

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  // Lets the global add / pay actions land here with the right thing already
  // open, so "record a payment" from anywhere is a single tap plus a pick.
  useOpenOnParam('new', openCreate);
  useOpenOnParam('pay', () => setPickPayment(true));

  async function openEdit(debt: DebtListItem) {
    // The list row deliberately skips `notes` — fetch just that one column so
    // the edit form doesn't silently drop existing notes on save.
    setEditLoading(true);
    setFormOpen(true);
    setEditing({ ...debt, user_id: '', notes: null, created_at: '', updated_at: '' } as Debt);

    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.from('debts').select('notes').eq('id', debt.id).maybeSingle();
    setEditLoading(false);
    setEditing((prev) =>
      prev && prev.id === debt.id ? { ...prev, notes: (data?.notes as string | null) ?? null } : prev,
    );
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('debts').delete().eq('id', target.id);

    if (error) {
      toast.error('تعذّر حذف الدين', { description: error.message });
      return;
    }

    void supabase.rpc('write_log', {
      p_action: 'debt.delete',
      p_entity: 'debts',
      p_entity_id: target.id,
      p_details: { creditor: target.creditor_name },
    });
    toast.success('تم حذف الدين');
    router.refresh();
  }

  function exportCsv() {
    downloadCsv(timestampedName('madyoon-debts'), rows, [
      { header: 'الدائن', value: (d) => d.creditor_name },
      { header: 'الهاتف', value: (d) => d.phone ?? '' },
      { header: 'التصنيف', value: (d) => DEBT_CATEGORIES[d.category].label },
      { header: 'المبلغ', value: (d) => d.amount },
      { header: 'المسدد', value: (d) => d.paid_amount },
      { header: 'المتبقي', value: (d) => d.remaining_amount },
      { header: 'العملة', value: (d) => d.currency },
      { header: 'الاستحقاق', value: (d) => d.due_date ?? '' },
      { header: 'آخر دفعة', value: (d) => d.last_payment_at ?? '' },
      { header: 'الأولوية', value: (d) => PRIORITIES[d.priority].label },
      { header: 'الحالة', value: (d) => DEBT_STATUS[d.status].label },
    ]);
    toast.success('تم تصدير الصفحة الحالية');
  }

  function resetFilters() {
    update({
      search: '',
      category: 'all',
      status: 'all',
      priority: 'all',
      currency: 'all',
      from: '',
      to: '',
    });
  }

  const listIsEmpty = total === 0 && !query.search && !activeFilterCount;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="الديون" description="أضف ديونك، تابع مواعيدها، وسجّل الدفعات.">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="تصدير">
              <Download className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={exportCsv}>
              <FileText />
              تصدير الصفحة الحالية CSV
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => printCurrentView()}>
              <Printer />
              تصدير PDF / طباعة
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          onClick={() => setPickPayment(true)}
          disabled={unsettled.length === 0}
        >
          <Banknote className="size-4" />
          تسجيل دفعة
        </Button>

        <Button onClick={openCreate}>
          <Plus className="size-4" />
          دين جديد
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 stagger lg:grid-cols-4">
        <StatCard label="الإجمالي" value={formatCompactAmount(summary.total, currency)} icon={Wallet} tone="primary" />
        <StatCard label="المتبقي" value={formatCompactAmount(summary.remaining, currency)} icon={TrendingDown} tone="warning" />
        <StatCard label="المسدد" value={formatCompactAmount(summary.paid, currency)} icon={CheckCircle2} tone="success" />
        <StatCard
          label="متأخرة"
          value={summary.overdue}
          hint={`${summary.dueSoon} قريبة الاستحقاق`}
          icon={AlertTriangle}
          tone={summary.overdue > 0 ? 'destructive' : 'success'}
        />
      </div>

      <DebtFilters
        query={query}
        currencies={currencies}
        activeCount={activeFilterCount}
        search={search}
        onSearchChange={setSearch}
        update={update}
        onReset={resetFilters}
      />

      {/* Results ---------------------------------------------------------- */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={listIsEmpty ? 'لا توجد ديون بعد' : 'لا نتائج مطابقة'}
          description={
            listIsEmpty
              ? 'ابدأ بإضافة أول دين لتتبّع مبلغه وموعد استحقاقه.'
              : 'جرّب تعديل الفلاتر أو كلمة البحث.'
          }
          action={
            listIsEmpty ? (
              <Button onClick={openCreate}>
                <Plus className="size-4" />
                إضافة دين
              </Button>
            ) : (
              <Button variant="outline" onClick={resetFilters}>
                مسح الفلاتر
              </Button>
            )
          }
        />
      ) : (
        <div className={cn('space-y-4 transition-opacity duration-fast', pending && 'opacity-60')}>
          {/* Cards on phones */}
          <div className="grid gap-3 stagger sm:hidden">
            {rows.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onOpen={() => router.push(`/debts/${debt.id}`)}
                onEdit={() => openEdit(debt)}
                onPay={() => setPaying(debt)}
                onDelete={() => setDeleting(debt)}
              />
            ))}
          </div>

          {/* Table from tablet up */}
          <Card className="hidden overflow-hidden sm:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  قائمة الديون: الجهة، الوصف، المبلغ، المتبقي، الاستحقاق، الحالة، وآخر دفعة
                </caption>
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th scope="col" className="p-3 text-start font-medium">الجهة</th>
                    <th scope="col" className="p-3 text-start font-medium">الوصف</th>
                    <th scope="col" className="p-3 text-start font-medium">المبلغ</th>
                    <th scope="col" className="p-3 text-start font-medium">المتبقي</th>
                    <th scope="col" className="p-3 text-start font-medium">الاستحقاق</th>
                    <th scope="col" className="p-3 text-start font-medium">الحالة</th>
                    <th scope="col" className="p-3 text-start font-medium">آخر دفعة</th>
                    <th scope="col" className="p-3 text-start font-medium no-print">
                      <span className="sr-only">إجراءات</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((debt) => {
                    const due = dueInfo(debt);
                    const status = debtDisplayStatus(debt);
                    const StatusIcon = status.icon;
                    const cat = DEBT_CATEGORIES[debt.category];
                    const CatIcon = cat.icon;
                    const pct =
                      Number(debt.amount) > 0
                        ? (Number(debt.paid_amount) / Number(debt.amount)) * 100
                        : 0;

                    return (
                      <tr
                        key={debt.id}
                        onClick={() => router.push(`/debts/${debt.id}`)}
                        className="cursor-pointer transition-colors duration-fast hover:bg-muted/30"
                      >
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="flex size-8 shrink-0 items-center justify-center rounded-lg"
                              style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
                              aria-hidden
                            >
                              <CatIcon className="size-4" />
                            </span>
                            <div className="min-w-0">
                              {/* Goes to the person, not the debt: their whole
                                  history is usually the question being asked. */}
                              <Link
                                href={`/debts/creditor/${encodeURIComponent(debt.creditor_name)}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block truncate font-medium hover:underline"
                              >
                                {debt.creditor_name}
                              </Link>
                              {debt.phone ? (
                                <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground tabular">
                                  <Phone className="size-3" aria-hidden />
                                  {debt.phone}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[16rem] p-3">
                          {/* There is no free-text description column on a
                              debt — `custom_category` is what a person types
                              when the fixed categories don't fit, so it is
                              the closest thing to one. */}
                          <p className="truncate text-muted-foreground">
                            {debt.custom_category || cat.label}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Pill>{cat.label}</Pill>
                            <Pill
                              tone={debt.priority === 'critical' || debt.priority === 'high' ? 'warning' : 'neutral'}
                              srLabel="الأولوية"
                            >
                              {PRIORITIES[debt.priority].label}
                            </Pill>
                          </div>
                        </td>
                        <td className="p-3 tabular">{formatAmount(debt.amount, debt.currency)}</td>
                        <td className="p-3">
                          <p className="font-medium tabular">
                            {formatAmount(debt.remaining_amount, debt.currency)}
                          </p>
                          <Progress
                            value={pct}
                            className="mt-1 h-1.5 w-24"
                            indicatorClassName={debt.status === 'paid' ? 'bg-success' : undefined}
                          />
                        </td>
                        <td className="p-3">
                          <p className="tabular">{formatDate(debt.due_date)}</p>
                          {due.state !== 'none' ? (
                            <p className={cn('text-xs', due.className)}>{due.label}</p>
                          ) : null}
                        </td>
                        <td className="p-3">
                          <Pill tone={status.tone} icon={StatusIcon} srLabel="الحالة">
                            {status.label}
                          </Pill>
                        </td>
                        <td className="p-3 text-muted-foreground tabular">
                          {debt.last_payment_at ? formatDate(debt.last_payment_at) : '—'}
                        </td>
                        <td className="p-3 no-print" onClick={(e) => e.stopPropagation()}>
                          <RowActions
                            debt={debt}
                            onEdit={() => openEdit(debt)}
                            onPay={() => setPaying(debt)}
                            onDelete={() => setDeleting(debt)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <Pagination
            page={query.page}
            pageSize={PAGE_SIZE}
            total={total}
            onPageChange={setPage}
            pending={pending}
          />
        </div>
      )}

      {/* Which debt am I paying? — the step between a global "record a
          payment" action and the payment form itself. */}
      <Sheet open={pickPayment} onOpenChange={setPickPayment}>
        <SheetContent className="gap-4">
          <SheetHeader>
            <SheetTitle>تسجيل دفعة</SheetTitle>
            <SheetDescription>
              اختر الدين الذي تريد الخصم منه. إن لم يظهر، ابحث عنه في القائمة أولاً.
            </SheetDescription>
          </SheetHeader>

          {unsettled.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              لا توجد ديون قائمة في هذه الصفحة.
            </p>
          ) : (
            <ul className="-mx-1 max-h-[55dvh] divide-y overflow-y-auto">
              {unsettled.map((debt) => {
                const status = debtDisplayStatus(debt);
                const StatusIcon = status.icon;
                return (
                  <li key={debt.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPickPayment(false);
                        setPaying(debt);
                      }}
                      className={cn(
                        'flex min-h-[56px] w-full items-center gap-3 rounded-lg px-1 py-3 text-start',
                        'transition-colors duration-fast hover:bg-muted/40',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{debt.creditor_name}</p>
                        <div className="mt-1">
                          <Pill tone={status.tone} icon={StatusIcon} srLabel="الحالة">
                            {status.label}
                          </Pill>
                        </div>
                      </div>
                      <p className="shrink-0 font-medium tabular">
                        {formatAmount(debt.remaining_amount, debt.currency)}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </SheetContent>
      </Sheet>

      <DebtFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        debt={editing}
        loading={editLoading}
      />
      <PaymentDialog
        debt={paying as Debt | null}
        open={!!paying}
        onOpenChange={(v) => !v && setPaying(null)}
        onPaid={() => router.refresh()}
      />
      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الدين؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleting?.creditor_name}» نهائياً. لا يمكن التراجع عن هذا الإجراء.
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

function RowActions({
  debt,
  onEdit,
  onPay,
  onDelete,
}: {
  debt: DebtListItem;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`إجراءات ${debt.creditor_name}`}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {debt.status !== 'paid' ? (
          <DropdownMenuItem onSelect={onPay}>
            <Banknote />
            تسجيل دفعة
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil />
          تعديل
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:text-destructive">
          <Trash2 />
          حذف
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DebtCard({
  debt,
  onOpen,
  onEdit,
  onPay,
  onDelete,
}: {
  debt: DebtListItem;
  onOpen: () => void;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
}) {
  const due = dueInfo(debt);
  const status = debtDisplayStatus(debt);
  const StatusIcon = status.icon;
  const cat = DEBT_CATEGORIES[debt.category];
  const CatIcon = cat.icon;
  const pct =
    Number(debt.amount) > 0 ? (Number(debt.paid_amount) / Number(debt.amount)) * 100 : 0;

  return (
    <Card
      className="hover-lift cursor-pointer p-4"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full"
          style={{ backgroundColor: `${cat.color}1a`, color: cat.color }}
          aria-hidden
        >
          <CatIcon className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-medium">{debt.creditor_name}</p>
            <div onClick={(e) => e.stopPropagation()}>
              <RowActions debt={debt} onEdit={onEdit} onPay={onPay} onDelete={onDelete} />
            </div>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {debt.custom_category || cat.label}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Pill tone={status.tone} icon={StatusIcon} srLabel="الحالة">
              {status.label}
            </Pill>
            <Pill>{cat.label}</Pill>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">المتبقي</p>
              <p className="font-display text-lg font-semibold tabular">
                {formatAmount(debt.remaining_amount, debt.currency)}
              </p>
            </div>
            {due.state !== 'none' ? (
              <p className={cn('text-xs', due.className)}>{due.label}</p>
            ) : null}
          </div>

          <Progress
            value={pct}
            className="mt-3 h-1.5"
            indicatorClassName={debt.status === 'paid' ? 'bg-success' : undefined}
          />

          <div className="mt-1 flex justify-between text-xs text-muted-foreground">
            <span>من {formatAmount(debt.amount, debt.currency)}</span>
            <span>{formatDate(debt.due_date)}</span>
          </div>

          {debt.last_payment_at ? (
            <p className="mt-1 text-xs text-muted-foreground">
              آخر دفعة {formatDate(debt.last_payment_at)}
            </p>
          ) : null}

          {debt.status !== 'paid' ? (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 w-full"
              onClick={(e) => {
                e.stopPropagation();
                onPay();
              }}
            >
              <Banknote className="size-4" />
              تسجيل دفعة
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
