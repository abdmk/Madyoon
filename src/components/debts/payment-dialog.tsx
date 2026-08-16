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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/misc';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useAppStore } from '@/store/use-app-store';
import { formatAmount } from '@/lib/format';
import type { Debt } from '@/lib/types';

/** Records a payment against a debt by raising its `paid_amount`. */
export function PaymentDialog({
  debt,
  open,
  onOpenChange,
}: {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const upsertDebt = useAppStore((s) => s.upsertDebt);
  const [value, setValue] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && debt) setValue(String(debt.remaining_amount));
  }, [open, debt]);

  if (!debt) return null;

  const amount = Number(value || 0);
  const remaining = Number(debt.remaining_amount);
  const valid = Number.isFinite(amount) && amount > 0 && amount <= remaining;
  const after = Math.max(remaining - (valid ? amount : 0), 0);
  const progressAfter =
    Number(debt.amount) > 0 ? ((Number(debt.amount) - after) / Number(debt.amount)) * 100 : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!debt || !valid) return;

    setSaving(true);
    const supabase = getSupabaseBrowserClient();
    const newPaid = Number(debt.paid_amount) + amount;

    const { data, error } = await supabase
      .from('debts')
      .update({ paid_amount: newPaid })
      .eq('id', debt.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error('تعذّر تسجيل الدفعة', { description: error.message });
      return;
    }

    upsertDebt(data as Debt);
    void supabase.rpc('write_log', {
      p_action: 'debt.pay',
      p_entity: 'debts',
      p_entity_id: debt.id,
      p_details: { amount, creditor: debt.creditor_name },
    });

    toast.success(
      (data as Debt).status === 'paid'
        ? `تم سداد الدين بالكامل 🎉`
        : `تم تسجيل دفعة ${formatAmount(amount, debt.currency)}`,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة</DialogTitle>
          <DialogDescription>
            {debt.creditor_name} — المتبقي {formatAmount(remaining, debt.currency)}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment">مبلغ الدفعة</Label>
            <Input
              id="payment"
              type="number"
              inputMode="decimal"
              min={0}
              max={remaining}
              step="any"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
            {value && !valid ? (
              <p className="text-xs text-destructive">
                أدخل مبلغاً بين ١ و {formatAmount(remaining, debt.currency)}
              </p>
            ) : null}
          </div>

          <div className="flex gap-2">
            {[0.25, 0.5, 1].map((ratio) => (
              <Button
                key={ratio}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setValue(String(Math.round(remaining * ratio * 100) / 100))}
              >
                {ratio === 1 ? 'المتبقي كامل' : `${ratio * 100}%`}
              </Button>
            ))}
          </div>

          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المتبقي بعد الدفع</span>
              <span className="font-medium tabular">{formatAmount(after, debt.currency)}</span>
            </div>
            <Progress
              value={progressAfter}
              className="mt-2 h-2"
              indicatorClassName={after === 0 ? 'bg-success' : undefined}
            />
          </div>

          <DialogFooter>
            <Button type="submit" variant="success" loading={saving} disabled={!valid}>
              تأكيد الدفعة
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
