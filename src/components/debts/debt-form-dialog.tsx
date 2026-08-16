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
import { CURRENCIES, DEBT_CATEGORIES, PRIORITIES } from '@/lib/constants';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/use-app-store';
import type { Debt, DebtCategory, Priority } from '@/lib/types';

interface FormState {
  creditor_name: string;
  amount: string;
  paid_amount: string;
  currency: string;
  due_date: string;
  category: DebtCategory;
  custom_category: string;
  priority: Priority;
  notes: string;
}

function toForm(debt: Debt | null, defaultCurrency: string): FormState {
  return {
    creditor_name: debt?.creditor_name ?? '',
    amount: debt ? String(debt.amount) : '',
    paid_amount: debt ? String(debt.paid_amount) : '0',
    currency: debt?.currency ?? defaultCurrency,
    due_date: debt?.due_date ?? '',
    category: debt?.category ?? 'personal',
    custom_category: debt?.custom_category ?? '',
    priority: debt?.priority ?? 'medium',
    notes: debt?.notes ?? '',
  };
}

export function DebtFormDialog({
  open,
  onOpenChange,
  debt,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  debt: Debt | null;
}) {
  const profile = useAppStore((s) => s.profile);
  const upsertDebt = useAppStore((s) => s.upsertDebt);

  const [form, setForm] = React.useState<FormState>(() => toForm(debt, profile?.currency ?? 'IQD'));
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});

  // Re-seed whenever the dialog opens for a different row.
  React.useEffect(() => {
    if (open) {
      setForm(toForm(debt, profile?.currency ?? 'IQD'));
      setErrors({});
    }
  }, [open, debt, profile?.currency]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.creditor_name.trim()) next.creditor_name = 'اسم الدائن مطلوب';

    const amount = Number(form.amount);
    if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
      next.amount = 'أدخل مبلغاً أكبر من صفر';
    }

    const paid = Number(form.paid_amount || 0);
    if (!Number.isFinite(paid) || paid < 0) next.paid_amount = 'المبلغ المسدد غير صالح';
    else if (Number.isFinite(amount) && paid > amount) {
      next.paid_amount = 'المسدد لا يمكن أن يتجاوز الإجمالي';
    }

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
      creditor_name: form.creditor_name.trim(),
      amount: Number(form.amount),
      paid_amount: Number(form.paid_amount || 0),
      currency: form.currency,
      due_date: form.due_date || null,
      category: form.category,
      custom_category: form.custom_category.trim() || null,
      priority: form.priority,
      notes: form.notes.trim() || null,
    };

    const query = debt
      ? supabase.from('debts').update(payload).eq('id', debt.id).select().single()
      : supabase.from('debts').insert(payload).select().single();

    const { data, error } = await query;
    setSaving(false);

    if (error) {
      toast.error(debt ? 'تعذّر حفظ التعديلات' : 'تعذّر إضافة الدين', {
        description: error.message,
      });
      return;
    }

    upsertDebt(data as Debt);
    void supabase.rpc('write_log', {
      p_action: debt ? 'debt.update' : 'debt.create',
      p_entity: 'debts',
      p_entity_id: (data as Debt).id,
      p_details: { creditor: payload.creditor_name, amount: payload.amount },
    });

    toast.success(debt ? 'تم حفظ التعديلات' : 'تمت إضافة الدين');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{debt ? 'تعديل الدين' : 'إضافة دين جديد'}</DialogTitle>
          <DialogDescription>
            {debt ? 'حدّث تفاصيل الدين ثم احفظ.' : 'أدخل تفاصيل الدين لتتبّعه ومتابعة موعده.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="creditor">اسم الدائن *</Label>
            <Input
              id="creditor"
              value={form.creditor_name}
              onChange={(e) => set('creditor_name', e.target.value)}
              placeholder="مثال: بنك الرافدين، أحمد، شركة الكهرباء"
              aria-invalid={!!errors.creditor_name}
            />
            {errors.creditor_name ? (
              <p className="text-xs text-destructive">{errors.creditor_name}</p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="amount">المبلغ الإجمالي *</Label>
              <Input
                id="amount"
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

            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="paid">المسدد</Label>
              <Input
                id="paid"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={form.paid_amount}
                onChange={(e) => set('paid_amount', e.target.value)}
                aria-invalid={!!errors.paid_amount}
              />
              {errors.paid_amount ? (
                <p className="text-xs text-destructive">{errors.paid_amount}</p>
              ) : null}
            </div>

            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="currency">العملة</Label>
              <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                <SelectTrigger id="currency">
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
              <Label htmlFor="category">التصنيف</Label>
              <Select
                value={form.category}
                onValueChange={(v) => set('category', v as DebtCategory)}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DEBT_CATEGORIES).map(([key, cat]) => (
                    <SelectItem key={key} value={key}>
                      {cat.icon} {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">الأولوية</Label>
              <Select value={form.priority} onValueChange={(v) => set('priority', v as Priority)}>
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITIES) as Priority[]).map((key) => (
                    <SelectItem key={key} value={key}>
                      {PRIORITIES[key].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="due">تاريخ الاستحقاق</Label>
              <Input
                id="due"
                type="date"
                value={form.due_date}
                onChange={(e) => set('due_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom">تصنيف مخصص</Label>
              <Input
                id="custom"
                value={form.custom_category}
                onChange={(e) => set('custom_category', e.target.value)}
                placeholder="اختياري"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="تفاصيل إضافية، شروط السداد، أرقام مرجعية…"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="submit" loading={saving}>
              {debt ? 'حفظ التعديلات' : 'إضافة الدين'}
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
