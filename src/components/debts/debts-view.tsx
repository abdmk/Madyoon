'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Download,
  FileText,
  Filter,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
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
import { useAppStore } from '@/store/use-app-store';
import { DEBT_CATEGORIES, DEBT_STATUS, PRIORITIES } from '@/lib/constants';
import { dueInfo, formatAmount, formatDate } from '@/lib/format';
import { sortDebts, summarizeDebts } from '@/lib/stats';
import { downloadCsv, printCurrentView, timestampedName } from '@/lib/export';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { Debt, DebtCategory, DebtStatus, Priority } from '@/lib/types';
import type { DebtSort } from '@/store/use-app-store';

const SORT_LABELS: Record<DebtSort, string> = {
  due_asc: 'الأقرب استحقاقاً',
  due_desc: 'الأبعد استحقاقاً',
  amount_desc: 'الأكبر مبلغاً',
  amount_asc: 'الأصغر مبلغاً',
  priority: 'الأعلى أولوية',
  created_desc: 'الأحدث إضافة',
};

export function DebtsView() {
  const debts = useAppStore((s) => s.debts);
  const removeDebt = useAppStore((s) => s.removeDebt);
  const profile = useAppStore((s) => s.profile);
  const filters = useAppStore((s) => s.debtFilters);
  const setFilters = useAppStore((s) => s.setDebtFilters);
  const resetFilters = useAppStore((s) => s.resetDebtFilters);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Debt | null>(null);
  const [paying, setPaying] = React.useState<Debt | null>(null);
  const [deleting, setDeleting] = React.useState<Debt | null>(null);
  const [showFilters, setShowFilters] = React.useState(false);

  const currency = profile?.currency ?? 'IQD';

  const filtered = React.useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const rows = debts.filter((d) => {
      if (filters.category !== 'all' && d.category !== filters.category) return false;
      if (filters.status !== 'all' && d.status !== filters.status) return false;
      if (filters.priority !== 'all' && d.priority !== filters.priority) return false;
      if (q) {
        const haystack = `${d.creditor_name} ${d.notes ?? ''} ${d.custom_category ?? ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    return sortDebts(rows, filters.sort);
  }, [debts, filters]);

  const summary = React.useMemo(() => summarizeDebts(filtered), [filtered]);
  const activeFilterCount =
    (filters.category !== 'all' ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.priority !== 'all' ? 1 : 0);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(debt: Debt) {
    setEditing(debt);
    setFormOpen(true);
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

    removeDebt(target.id);
    void supabase.rpc('write_log', {
      p_action: 'debt.delete',
      p_entity: 'debts',
      p_entity_id: target.id,
      p_details: { creditor: target.creditor_name },
    });
    toast.success('تم حذف الدين');
  }

  function exportCsv() {
    downloadCsv(timestampedName('madyoon-debts'), filtered, [
      { header: 'الدائن', value: (d) => d.creditor_name },
      { header: 'التصنيف', value: (d) => DEBT_CATEGORIES[d.category].label },
      { header: 'المبلغ', value: (d) => d.amount },
      { header: 'المسدد', value: (d) => d.paid_amount },
      { header: 'المتبقي', value: (d) => d.remaining_amount },
      { header: 'العملة', value: (d) => d.currency },
      { header: 'الاستحقاق', value: (d) => d.due_date ?? '' },
      { header: 'الأولوية', value: (d) => PRIORITIES[d.priority].label },
      { header: 'الحالة', value: (d) => DEBT_STATUS[d.status].label },
      { header: 'ملاحظات', value: (d) => d.notes ?? '' },
    ]);
    toast.success('تم تصدير الملف');
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
              تصدير CSV
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="الإجمالي" value={formatAmount(summary.total, currency)} tone="primary" />
        <StatCard label="المتبقي" value={formatAmount(summary.remaining, currency)} tone="warning" />
        <StatCard label="المسدد" value={formatAmount(summary.paid, currency)} tone="success" />
        <StatCard
          label="متأخرة"
          value={summary.overdue}
          hint={`${summary.dueSoon} قريبة الاستحقاق`}
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
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder="ابحث باسم الدائن أو الملاحظات…"
                className="pe-9"
                aria-label="بحث في الديون"
              />
            </div>

            <Select
              value={filters.sort}
              onValueChange={(v) => setFilters({ sort: v as DebtSort })}
            >
              <SelectTrigger className="sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORT_LABELS) as DebtSort[]).map((key) => (
                  <SelectItem key={key} value={key}>
                    {SORT_LABELS[key]}
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
            <div className="grid gap-2 border-t pt-3 sm:grid-cols-3">
              <Select
                value={filters.category}
                onValueChange={(v) => setFilters({ category: v as DebtCategory | 'all' })}
              >
                <SelectTrigger aria-label="التصنيف">
                  <SelectValue placeholder="التصنيف" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات</SelectItem>
                  {Object.entries(DEBT_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={filters.status}
                onValueChange={(v) => setFilters({ status: v as DebtStatus | 'all' })}
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
                value={filters.priority}
                onValueChange={(v) => setFilters({ priority: v as Priority | 'all' })}
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

              {activeFilterCount || filters.search ? (
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
      {filtered.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title={debts.length === 0 ? 'لا توجد ديون بعد' : 'لا نتائج مطابقة'}
          description={
            debts.length === 0
              ? 'ابدأ بإضافة أول دين لتتبّع مبلغه وموعد استحقاقه.'
              : 'جرّب تعديل الفلاتر أو كلمة البحث.'
          }
          action={
            debts.length === 0 ? (
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
        <>
          {/* Cards on phones */}
          <div className="grid gap-3 sm:hidden">
            {filtered.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
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
                  {filtered.map((debt) => {
                    const due = dueInfo(debt);
                    const cat = DEBT_CATEGORIES[debt.category];
                    const pct =
                      Number(debt.amount) > 0
                        ? (Number(debt.paid_amount) / Number(debt.amount)) * 100
                        : 0;

                    return (
                      <tr key={debt.id} className="transition-colors hover:bg-muted/30">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span aria-hidden>{cat.icon}</span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{debt.creditor_name}</p>
                              <Badge
                                variant="outline"
                                className={cn('mt-0.5', PRIORITIES[debt.priority].className)}
                              >
                                {PRIORITIES[debt.priority].label}
                              </Badge>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {debt.custom_category || cat.label}
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
                          <Badge variant="outline" className={DEBT_STATUS[debt.status].className}>
                            {DEBT_STATUS[debt.status].label}
                          </Badge>
                        </td>
                        <td className="p-3 no-print">
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
        </>
      )}

      <DebtFormDialog open={formOpen} onOpenChange={setFormOpen} debt={editing} />
      <PaymentDialog debt={paying} open={!!paying} onOpenChange={(v) => !v && setPaying(null)} />

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
  debt: Debt;
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
  onEdit,
  onPay,
  onDelete,
}: {
  debt: Debt;
  onEdit: () => void;
  onPay: () => void;
  onDelete: () => void;
}) {
  const due = dueInfo(debt);
  const cat = DEBT_CATEGORIES[debt.category];
  const pct =
    Number(debt.amount) > 0 ? (Number(debt.paid_amount) / Number(debt.amount)) * 100 : 0;

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ backgroundColor: `${cat.color}1a` }}
          aria-hidden
        >
          {cat.icon}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-medium">{debt.creditor_name}</p>
            <RowActions debt={debt} onEdit={onEdit} onPay={onPay} onDelete={onDelete} />
          </div>
          <p className="text-xs text-muted-foreground">{debt.custom_category || cat.label}</p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              <p className="text-xs text-muted-foreground">المتبقي</p>
              <p className="font-display text-lg font-semibold tabular">
                {formatAmount(debt.remaining_amount, debt.currency)}
              </p>
            </div>
            <div className="text-end">
              <Badge variant="outline" className={DEBT_STATUS[debt.status].className}>
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
            <Button size="sm" variant="outline" className="mt-3 w-full" onClick={onPay}>
              <CheckCircle2 className="size-4" />
              تسجيل دفعة
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
