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
import { CURRENCIES, REVENUE_CATEGORIES } from '@/lib/constants';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSession } from '@/components/session-provider';
import { useRouter } from 'next/navigation';
import type { Revenue } from '@/lib/types';

interface FormState {
  source: string;
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

function toForm(revenue: Revenue | null, defaultCurrency: string): FormState {
  return {
    source: revenue?.source ?? '',
    amount: revenue ? String(revenue.amount) : '',
    currency: revenue?.currency ?? defaultCurrency,
    date: revenue?.date ?? todayIso(),
    category: revenue?.category ?? 'salary',
    notes: revenue?.notes ?? '',
  };
}

export function RevenueFormDialog({
  open,
  onOpenChange,
  revenue,
  loading,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  revenue: Revenue | null;
  /** True while a field the list row doesn't carry (e.g. notes) is still loading. */
  loading?: boolean;
}) {
  const { profile } = useSession();
  const router = useRouter();

  const [form, setForm] = React.useState<FormState>(() => toForm(revenue, profile.currency));
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({});

  React.useEffect(() => {
    if (open && !loading) {
      setForm(toForm(revenue, profile.currency));
      setErrors({});
    }
  }, [open, loading, revenue, profile.currency]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const next: Partial<Record<keyof FormState, string>> = {};
    if (!form.source.trim()) next.source = 'مصدر الإيراد مطلوب';
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
    if (!validate()) return;

    setSaving(true);
    const supabase = getSupabaseBrowserClient();

    const payload = {
      user_id: profile.id,
      source: form.source.trim(),
      amount: Number(form.amount),
      currency: form.currency,
      date: form.date,
      category: form.category,
      notes: form.notes.trim() || null,
    };

    const query = revenue
      ? supabase.from('revenues').update(payload).eq('id', revenue.id).select().single()
      : supabase.from('revenues').insert(payload).select().single();

    const { data, error } = await query;
    setSaving(false);

    if (error) {
      toast.error(revenue ? 'تعذّر حفظ التعديلات' : 'تعذّر إضافة الإيراد', {
        description: error.message,
      });
      return;
    }

    void supabase.rpc('write_log', {
      p_action: revenue ? 'revenue.update' : 'revenue.create',
      p_entity: 'revenues',
      p_entity_id: (data as Revenue).id,
      p_details: { source: payload.source, amount: payload.amount },
    });

    toast.success(revenue ? 'تم حفظ التعديلات' : 'تمت إضافة الإيراد');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{revenue ? 'تعديل الإيراد' : 'إضافة إيراد'}</DialogTitle>
          <DialogDescription>سجّل مصادر دخلك لمتابعة صافي أموالك.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <fieldset disabled={loading} className="space-y-4 disabled:opacity-60">
            <div className="space-y-2">
              <Label htmlFor="source">المصدر *</Label>
              <Input
                id="source"
                value={form.source}
                onChange={(e) => set('source', e.target.value)}
                placeholder="مثال: راتب شهر أغسطس، مشروع تصميم"
                aria-invalid={!!errors.source}
              />
              {errors.source ? <p className="text-xs text-destructive">{errors.source}</p> : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="revenue-amount">المبلغ *</Label>
                <Input
                  id="revenue-amount"
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
                <Label htmlFor="revenue-currency">العملة</Label>
                <Select value={form.currency} onValueChange={(v) => set('currency', v)}>
                  <SelectTrigger id="revenue-currency">
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
                <Label htmlFor="revenue-date">التاريخ *</Label>
                <Input
                  id="revenue-date"
                  type="date"
                  value={form.date}
                  onChange={(e) => set('date', e.target.value)}
                  aria-invalid={!!errors.date}
                />
                {errors.date ? <p className="text-xs text-destructive">{errors.date}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="revenue-category">التصنيف</Label>
                <Select value={form.category} onValueChange={(v) => set('category', v)}>
                  <SelectTrigger id="revenue-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVENUE_CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenue-notes">ملاحظات</Label>
              <Textarea
                id="revenue-notes"
                value={form.notes}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
                placeholder="اختياري"
              />
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="submit" loading={saving || loading}>
              {revenue ? 'حفظ التعديلات' : 'إضافة الإيراد'}
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
