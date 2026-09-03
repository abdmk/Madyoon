'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  CalendarDays,
  Download,
  FileText,
  LayoutGrid,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  Receipt,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { Pagination } from '@/components/shared/pagination';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ExpenseFormDialog } from './expense-form-dialog';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { formatAmount, formatDate } from '@/lib/format';
import { downloadCsv, printCurrentView, timestampedName } from '@/lib/export';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { PAGE_SIZE, expenseFiltersActive, expenseQueryString } from '@/lib/params';
import { useDebouncedSearch, useListQuery } from '@/lib/use-list-query';
import { cn } from '@/lib/utils';
import type { Expense, ExpenseListItem, ExpensesPage } from '@/lib/types';
import type { ExpenseQuery } from '@/lib/params';

interface CategoryMeta {
  value: string;
  label: string;
  icon: string;
  color: string;
}

const CATEGORY_MAP = new Map<string, CategoryMeta>(
  EXPENSE_CATEGORIES.map((c) => [c.value, { ...c }]),
);

/** Falls back to a generic entry so user-defined categories still render. */
function categoryOf(value: string): CategoryMeta {
  return (
    CATEGORY_MAP.get(value) ?? {
      value,
      label: value,
      icon: '📦',
      color: 'hsl(215 16% 47%)',
    }
  );
}

export function ExpensesView({
  page,
  query,
  currency,
}: {
  page: ExpensesPage;
  query: ExpenseQuery;
  currency: string;
}) {
  const router = useRouter();
  const { update, setPage, pending } = useListQuery(query, expenseQueryString);
  const [search, setSearch] = useDebouncedSearch(query.search, (v) => update({ search: v }));

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [editLoading, setEditLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState<ExpenseListItem | null>(null);

  const { rows, total, sum, monthTotal, byCategory } = page;
  const hasFilters = expenseFiltersActive(query);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  async function openEdit(expense: ExpenseListItem) {
    setEditLoading(true);
    setFormOpen(true);
    setEditing({ ...expense, user_id: '', notes: null, created_at: '', updated_at: '' } as Expense);

    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('expenses')
      .select('notes')
      .eq('id', expense.id)
      .maybeSingle();
    setEditLoading(false);
    setEditing((prev) =>
      prev && prev.id === expense.id
        ? { ...prev, notes: (data?.notes as string | null) ?? null }
        : prev,
    );
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);

    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('expenses').delete().eq('id', target.id);

    if (error) {
      toast.error('تعذّر حذف المصروف', { description: error.message });
      return;
    }

    void supabase.rpc('write_log', {
      p_action: 'expense.delete',
      p_entity: 'expenses',
      p_entity_id: target.id,
      p_details: { description: target.description },
    });
    toast.success('تم حذف المصروف');
    router.refresh();
  }

  function exportCsv() {
    downloadCsv(timestampedName('madyoon-expenses'), rows, [
      { header: 'الوصف', value: (e) => e.description },
      { header: 'التصنيف', value: (e) => categoryOf(e.category).label },
      { header: 'المبلغ', value: (e) => e.amount },
      { header: 'العملة', value: (e) => e.currency },
      { header: 'التاريخ', value: (e) => e.date },
    ]);
    toast.success('تم تصدير الصفحة الحالية');
  }

  function resetFilters() {
    update({ search: '', category: 'all', from: '', to: '' });
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="المصاريف" description="سجّل مصاريفك وتابع أين تذهب أموالك.">
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
          مصروف جديد
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 stagger lg:grid-cols-4">
        <StatCard
          label="مصاريف الشهر"
          value={formatAmount(monthTotal, currency)}
          icon={CalendarDays}
          tone="accent"
        />
        <StatCard
          label="إجمالي المعروض"
          value={formatAmount(sum, currency)}
          hint={`${total} عملية`}
          icon={Receipt}
          tone="primary"
        />
        <StatCard
          label="متوسط العملية"
          value={formatAmount(total ? sum / total : 0, currency)}
          icon={Calculator}
          tone="muted"
        />
        <StatCard label="عدد التصنيفات" value={byCategory.length} icon={LayoutGrid} tone="success" />
      </div>

      {/* Filters ---------------------------------------------------------- */}
      <Card className="no-print">
        <CardContent className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
          <div className="relative lg:col-span-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث…"
              className="pe-9"
              aria-label="بحث في المصاريف"
            />
          </div>

          <Select value={query.category} onValueChange={(v) => update({ category: v })}>
            <SelectTrigger aria-label="التصنيف">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل التصنيفات</SelectItem>
              {EXPENSE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.icon} {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Native date inputs don't support `placeholder` — without a
              visible label they're just an empty box with no clue what
              they're for, especially on iOS before a value is picked. */}
          <div className="space-y-1">
            <Label htmlFor="expenses-from" className="px-1 text-xs font-normal text-muted-foreground">
              من تاريخ
            </Label>
            <Input
              id="expenses-from"
              type="date"
              value={query.from}
              onChange={(e) => update({ from: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="expenses-to" className="px-1 text-xs font-normal text-muted-foreground">
              إلى تاريخ
            </Label>
            <div className="flex gap-2">
              <Input
                id="expenses-to"
                type="date"
                value={query.to}
                onChange={(e) => update({ to: e.target.value })}
                className="min-w-0 flex-1"
              />
              {hasFilters ? (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="مسح الفلاتر"
                  onClick={resetFilters}
                  className="shrink-0"
                >
                  <X className="size-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <div
        className={cn(
          'grid gap-5 transition-opacity duration-fast lg:grid-cols-3',
          pending && 'opacity-60',
        )}
      >
        {/* List ----------------------------------------------------------- */}
        <div className="space-y-4 lg:col-span-2">
          {rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={total === 0 && !hasFilters ? 'لا توجد مصاريف بعد' : 'لا نتائج مطابقة'}
              description={
                total === 0 && !hasFilters
                  ? 'ابدأ بتسجيل أول مصروف لمتابعة إنفاقك الشهري.'
                  : 'جرّب تعديل الفلاتر أو المدى الزمني.'
              }
              action={
                total === 0 && !hasFilters ? (
                  <Button onClick={openCreate}>
                    <Plus className="size-4" />
                    إضافة مصروف
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
              <Card className="overflow-hidden">
                <ul className="divide-y stagger">
                  {rows.map((expense) => {
                    const cat = categoryOf(expense.category);
                    return (
                      <li
                        key={expense.id}
                        className="flex items-center gap-3 p-3 transition-colors duration-fast hover:bg-muted/30 sm:p-4"
                      >
                        <span
                          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-lg"
                          style={{ backgroundColor: `${cat.color}1a` }}
                          aria-hidden
                        >
                          {cat.icon}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {cat.label} · {formatDate(expense.date)}
                          </p>
                        </div>

                        <p className="shrink-0 font-medium tabular">
                          {formatAmount(expense.amount, expense.currency)}
                        </p>

                        <div className="no-print">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label={`إجراءات ${expense.description}`}
                              >
                                <MoreVertical className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => openEdit(expense)}>
                                <Pencil />
                                تعديل
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => setDeleting(expense)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 />
                                حذف
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              <Pagination
                page={query.page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
                pending={pending}
              />
            </>
          )}
        </div>

        {/* Breakdown ------------------------------------------------------ */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle>حسب التصنيف</CardTitle>
            <CardDescription>توزيع المصاريف المعروضة</CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">لا توجد بيانات</p>
            ) : (
              <ul className="space-y-3">
                {byCategory.map((c) => {
                  const meta = categoryOf(c.category);
                  const pct = sum > 0 ? (c.total / sum) * 100 : 0;
                  return (
                    <li key={c.category}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span aria-hidden>{meta.icon}</span>
                          <span className="truncate">{meta.label}</span>
                        </span>
                        <span className="shrink-0 font-medium tabular">
                          {formatAmount(c.total, currency)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Progress value={pct} className="h-1.5 flex-1" />
                        <Badge variant="soft" className="shrink-0 tabular">
                          {Math.round(pct)}%
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editing} loading={editLoading} />

      <AlertDialog open={!!deleting} onOpenChange={(v) => !v && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف المصروف؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف «{deleting?.description}» نهائياً.
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
