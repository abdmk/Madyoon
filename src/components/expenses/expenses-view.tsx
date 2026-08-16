'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  CalendarDays,
  Download,
  FileText,
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ExpenseFormDialog } from './expense-form-dialog';
import { useAppStore } from '@/store/use-app-store';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { formatAmount, formatDate } from '@/lib/format';
import { sumExpenses } from '@/lib/stats';
import { downloadCsv, printCurrentView, timestampedName } from '@/lib/export';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { Expense } from '@/lib/types';

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

export function ExpensesView() {
  const expenses = useAppStore((s) => s.expenses);
  const removeExpense = useAppStore((s) => s.removeExpense);
  const profile = useAppStore((s) => s.profile);
  const filters = useAppStore((s) => s.expenseFilters);
  const setFilters = useAppStore((s) => s.setExpenseFilters);
  const resetFilters = useAppStore((s) => s.resetExpenseFilters);

  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Expense | null>(null);
  const [deleting, setDeleting] = React.useState<Expense | null>(null);

  const currency = profile?.currency ?? 'IQD';

  const filtered = React.useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return expenses
      .filter((e) => {
        if (filters.category !== 'all' && e.category !== filters.category) return false;
        if (filters.from && e.date < filters.from) return false;
        if (filters.to && e.date > filters.to) return false;
        if (q && !`${e.description} ${e.notes ?? ''}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.created_at.localeCompare(a.created_at));
  }, [expenses, filters]);

  const total = React.useMemo(() => sumExpenses(filtered), [filtered]);

  const monthTotal = React.useMemo(() => {
    const prefix = new Date().toISOString().slice(0, 7);
    return sumExpenses(expenses.filter((e) => e.date.startsWith(prefix)));
  }, [expenses]);

  const byCategory = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const e of filtered) map.set(e.category, (map.get(e.category) ?? 0) + Number(e.amount));
    return [...map.entries()]
      .map(([key, value]) => ({ ...categoryOf(key), total: value }))
      .sort((a, b) => b.total - a.total);
  }, [filtered]);

  const hasFilters =
    !!filters.search || filters.category !== 'all' || !!filters.from || !!filters.to;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
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

    removeExpense(target.id);
    void supabase.rpc('write_log', {
      p_action: 'expense.delete',
      p_entity: 'expenses',
      p_entity_id: target.id,
      p_details: { description: target.description },
    });
    toast.success('تم حذف المصروف');
  }

  function exportCsv() {
    downloadCsv(timestampedName('madyoon-expenses'), filtered, [
      { header: 'الوصف', value: (e) => e.description },
      { header: 'التصنيف', value: (e) => categoryOf(e.category).label },
      { header: 'المبلغ', value: (e) => e.amount },
      { header: 'العملة', value: (e) => e.currency },
      { header: 'التاريخ', value: (e) => e.date },
      { header: 'ملاحظات', value: (e) => e.notes ?? '' },
    ]);
    toast.success('تم تصدير الملف');
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
          مصروف جديد
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="مصاريف الشهر"
          value={formatAmount(monthTotal, currency)}
          icon={CalendarDays}
          tone="accent"
        />
        <StatCard
          label="إجمالي المعروض"
          value={formatAmount(total, currency)}
          hint={`${filtered.length} عملية`}
          icon={Receipt}
          tone="primary"
        />
        <StatCard
          label="متوسط العملية"
          value={formatAmount(filtered.length ? total / filtered.length : 0, currency)}
          tone="muted"
        />
        <StatCard label="عدد التصنيفات" value={byCategory.length} tone="success" />
      </div>

      {/* Filters ---------------------------------------------------------- */}
      <Card className="no-print">
        <CardContent className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
          <div className="relative lg:col-span-1">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              placeholder="ابحث…"
              className="pe-9"
              aria-label="بحث في المصاريف"
            />
          </div>

          <Select
            value={filters.category}
            onValueChange={(v) => setFilters({ category: v })}
          >
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

          <Input
            type="date"
            value={filters.from}
            onChange={(e) => setFilters({ from: e.target.value })}
            aria-label="من تاريخ"
          />
          <div className="flex gap-2">
            <Input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters({ to: e.target.value })}
              aria-label="إلى تاريخ"
            />
            {hasFilters ? (
              <Button variant="ghost" size="icon" aria-label="مسح الفلاتر" onClick={resetFilters}>
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* List ----------------------------------------------------------- */}
        <div className="lg:col-span-2">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={expenses.length === 0 ? 'لا توجد مصاريف بعد' : 'لا نتائج مطابقة'}
              description={
                expenses.length === 0
                  ? 'ابدأ بتسجيل أول مصروف لمتابعة إنفاقك الشهري.'
                  : 'جرّب تعديل الفلاتر أو المدى الزمني.'
              }
              action={
                expenses.length === 0 ? (
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
            <Card className="overflow-hidden">
              <ul className="divide-y">
                {filtered.map((expense) => {
                  const cat = categoryOf(expense.category);
                  return (
                    <li
                      key={expense.id}
                      className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/30 sm:p-4"
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
                            <DropdownMenuItem
                              onSelect={() => {
                                setEditing(expense);
                                setFormOpen(true);
                              }}
                            >
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
                  const pct = total > 0 ? (c.total / total) * 100 : 0;
                  return (
                    <li key={c.value}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span aria-hidden>{c.icon}</span>
                          <span className="truncate">{c.label}</span>
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

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} expense={editing} />

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
