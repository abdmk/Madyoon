'use client';

import * as React from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Filter,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingDown,
  Wallet,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/feedback/empty-state';
import { Pagination } from '@/components/feedback/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/misc';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { PaymentDialog } from './payment-dialog';
import { DEBT_CATEGORIES, DEBT_STATUS, PRIORITIES } from '@/lib/constants';
import { dueInfo, formatAmount, formatCompactAmount, formatDate } from '@/lib/formatters';
import { downloadCsv, printCurrentView, timestampedName } from '@/lib/export';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { PAGE_SIZE } from '@/lib/params';
import { DEBT_SORTS, DEBT_SORT_LABELS, debtFiltersActive, debtQueryString } from '@/features/debts/params';
import { useDebouncedSearch, useListQuery } from '@/hooks/use-list-query';
import { useOpenOnParam } from '@/hooks/use-open-on-param';
import { cn } from '@/lib/utils';
import type { Debt, DebtCategory, DebtListItem, DebtStatus, Priority } from '@/lib/types';
import type { DebtQuery, DebtSort } from '@/features/debts/params';
import type { DebtsPage } from '@/lib/types';

export function DebtsView({
  page,
  query,
  currency,
}: {
  page: DebtsPage;
  query: DebtQuery;
  currency: string;
}) {
  const router = useRouter();
  const { update, setPage, pending } = useListQuery(query, debtQueryString);
  const [search, setSearch] = useDebouncedSearch(query.search, (v) => update({ search: v }));

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Debt | null>(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [paying, setPaying] = React.useState<DebtListItem | null>(null);
  const [deleting, setDeleting] = React.useState<DebtListItem | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  const { rows, total, summary } = page;
  const activeFilterCount = debtFiltersActive(query);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  // Lets the global add action land here with the form already open.
  useOpenOnParam('new', openCreate);

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
      { header: 'الأولوية', value: (d) => PRIORITIES[d.priority].label },
      { header: 'الحالة', value: (d) => DEBT_STATUS[d.status].label },
    ]);
    toast.success('تم تصدير الصفحة الحالية');
  }

  function resetFilters() {
    update({ search: '', category: 'all', status: 'all', priority: 'all' });
  }

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
          tone="destructive"
        />
      </div>

      {/* Filters ---------------------------------------------------------- */}
      <Card className="no-print">
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث باسم الدائن أو الهاتف…"
                className="pe-9"
                aria-label="بحث في الديون"
              />
            </div>

            <Select value={query.sort} onValueChange={(v) => update({ sort: v as DebtSort })}>
              <SelectTrigger className="sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEBT_SORTS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {DEBT_SORT_LABELS[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant={showFilters || activeFilterCount ? 'default' : 'outline'}
              onClick={() => setShowFilters((v) => !v)}
              className="shrink-0"
            >
              <Filter className="size-4" />
              فلاتر
              {activeFilterCount ? (
                <span className="rounded-full bg-background/25 px-1.5 text-xs tabular">
                  {activeFilterCount}
                </span>
              ) : null}
            </Button>
          </div>

          {showFilters ? (
            <div className="grid animate-fade-up gap-2 border-t pt-3 sm:grid-cols-3">
              <Select
                value={query.category}
                onValueChange={(v) => update({ category: v as DebtCategory | 'all' })}
              >
                <SelectTrigger aria-label="التصنيف">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات</SelectItem>
                  {Object.entries(DEBT_CATEGORIES).map(([key, cat]) => {
                    const CatIcon = cat.icon;
                    return (
                      <SelectItem key={key} value={key}>
                        <span className="inline-flex items-center gap-2">
                          <CatIcon className="size-4" style={{ color: cat.color }} />
                          {cat.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Select
                value={query.status}
                onValueChange={(v) => update({ status: v as DebtStatus | 'all' })}
              >
                <SelectTrigger aria-label="الحالة">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {(Object.keys(DEBT_STATUS) as DebtStatus[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {DEBT_STATUS[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={query.priority}
                onValueChange={(v) => update({ priority: v as Priority | 'all' })}
              >
                <SelectTrigger aria-label="الأولوية">
                  <SelectValue placeholder="الأولوية" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأولويات</SelectItem>
                  {(Object.keys(PRIORITIES) as Priority[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PRIORITIES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeFilterCount || query.search ? (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="sm:col-span-3">
                  <X className="size-4" />
                  مسح الفلاتر
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Results ---------------------------------------------------------- */}
      {rows.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={total === 0 && !query.search && !activeFilterCount ? 'لا توجد ديون بعد' : 'لا نتائج مطابقة'}
          description={
            total === 0 && !query.search && !activeFilterCount
              ? 'ابدأ بإضافة أول دين لتتبّع مبلغه وموعد استحقاقه.'
              : 'جرّب تعديل الفلاتر أو كلمة البحث.'
          }
          action={
            total === 0 && !query.search && !activeFilterCount ? (
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
                <thead className="border-b bg-muted/40 text-start">
                  <tr>
                    <th className="p-3 text-start font-medium">الدائن</th>
                    <th className="p-3 text-start font-medium">التصنيف</th>
                    <th className="p-3 text-start font-medium">المبلغ</th>
                    <th className="p-3 text-start font-medium">المتبقي</th>
                    <th className="p-3 text-start font-medium">الاستحقاق</th>
                    <th className="p-3 text-start font-medium">الحالة</th>
                    <th className="p-3 text-start font-medium no-print">
                      <span className="sr-only">إجراءات</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((debt) => {
                    const due = dueInfo(debt);
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
                              {/* A real link, so keyboard and middle-click work
                                  even though the whole row is clickable. */}
                              <Link
                                href={`/debts/${debt.id}`}
                                onClick={(e) => e.stopPropagation()}
                                className="block truncate font-medium hover:underline"
                              >
                                {debt.creditor_name}
                              </Link>
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <Badge
                                  className={PRIORITIES[debt.priority].className}
                                >
                                  {PRIORITIES[debt.priority].label}
                                </Badge>
                                {debt.phone ? (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground tabular">
                                    <Phone className="size-3" />
                                    {debt.phone}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {cat.label}
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
                          <Badge className={DEBT_STATUS[debt.status].className}>
                            {DEBT_STATUS[debt.status].label}
                          </Badge>
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
            <CheckCircle2 />
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
          <p className="text-xs text-muted-foreground">{cat.label}</p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">المتبقي</p>
              <p className="font-display text-lg font-semibold tabular">
                {formatAmount(debt.remaining_amount, debt.currency)}
              </p>
            </div>
            <div className="text-end">
              <Badge className={DEBT_STATUS[debt.status].className}>
                {DEBT_STATUS[debt.status].label}
              </Badge>
              {due.state !== 'none' ? (
                <p className={cn('mt-1 text-xs', due.className)}>{due.label}</p>
              ) : null}
            </div>
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
              <CheckCircle2 className="size-4" />
              تسجيل دفعة
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
