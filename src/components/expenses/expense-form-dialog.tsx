'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CURRENCIES, EXPENSE_CATEGORIES } from '@/lib/constants';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/use-app-store';
import type { Expense } from '@/lib/types';

interface FormState {
  description: string;
  amount: string;
  currency: string;
  date: string;
  category: string;
  notes: string;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

function toForm(expense: Expense | null, defaultCurrency: string): FormState {
  return {
    description: expense?.description ?? '',
    amount: expense ? String(expense.amount) : '',
    currency: expense?.currency ?? defaultCurrency,
    date: expense?.date ?? todayIso(),
    category: expense?.category ?? 'other',
    notes: expense?.notes ?? '',
  };
}

export function ExpenseFormDialog({
  open,
  onOpenChange,
  expense,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense: Expense | null;
}) {
  const profile = useAppStore((s) => s.profile);
  const upsertExpense = useAppStore((s) => s.upsertExpense);

  const [form, setForm] = React.useState<FormState>(() =>
    toForm(expense, profile?.currency ?? 'IQD'),
  );
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});

  React.useEffect(() => {
    if (open) {
      setForm(toForm(expense, profile?.currency ?? 'IQD'));
      setErrors({});
    }
  }, [open, expense, profile?.currency]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.description.trim()) next.description = 'الوصف مطلوب';
    const amount = Number(form.amount);
    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      next.amount = 'أدخل مبلغاً أكبر من صفر';
    }
    if (!form.date) next.date = 'التاريخ مطلوب';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !validate()) return;

    setSaving(true);
    const supabase = getSupabaseBrowserClient();

    const payload = {
      user_id: profile.id,
      description: form.description.trim(),
      amount: Number(form.amount),
      currency: form.currency,
      date: form.date,
      category: form.category,
      notes: form.notes.trim() || null,
    };

    const query = expense
      ? supabase.from('expenses').update(payload).eq('id', expense.id).select().single()
      : supabase.from('expenses').insert(payload).select().single();

    const { data, error } = await query;
    setSaving(false);

    if (error) {
      toast.error(expense ? 'تعذّر حفظ التعديلات' : 'تعذّر إضافة المصروف', {
        description: error.message,
      });
      return;
    }

    upsertExpense(data as Expense);
    void supabase.rpc('write_log', {
      p_action: expense ? 'expense.update' : 'expense.create',
      p_entity: 'expenses',
      p_entity_id: (data as Expense).id,
      p_details: { description: payload.description, amount: payload.amount },
    });

    toast.success(expense ? 'تم حفظ التعديلات' : 'تمت إضافة المصروف');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{expense ? 'تعديل المصروف' : 'إضافة مصروف'}</DialogTitle>
          <DialogDescription>
            سجّل مصاريفك اليومية لتعرف أين تذهب أموالك.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">الوصف *</Label>
            <Input
              id="description"
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="مثال: تسوّق أسبوعي، بنزين، فاتورة إنترنت"
              aria-invalid={!!errors.description}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-amount">المبلغ *</Label>
              <Input
                id="expense-amount"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={form.amount}
                onChange={(e) => set('amount', e.target.value)}
                aria-invalid={!!errors.amount}
              />
              {errors.amount ? <p className="text-xs text-destructive">{errors.amount}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-currency">العملة</Label>
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger id="expense-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.label} ({c.symbol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="expense-date">التاريخ *</Label>
              <Input
                id="expense-date"
                type="date"
                value={form.date}
                onChange={(e) => set('date', e.target.value)}
                aria-invalid={!!errors.date}
              />
              {errors.date ? <p className="text-xs text-destructive">{errors.date}</p> : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-category">التصنيف</Label>
              <Select value={form.category} onValueChange={(v) => set('category', v)}>
                <SelectTrigger id="expense-category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.icon} {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expense-notes">ملاحظات</Label>
            <Textarea
              id="expense-notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={2}
              placeholder="اختياري"
            />
          </div>

          <DialogFooter>
            <Button type="submit" loading={saving}>
              {expense ? 'حفظ التعديلات' : 'إضافة المصروف'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
