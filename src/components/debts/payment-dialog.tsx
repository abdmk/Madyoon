'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Banknote, Landmark } from 'lucide-react';
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
import { Progress } from '@/components/ui/misc';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatAmount } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { Debt, PaymentMethod } from '@/lib/types';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`;
}

const METHOD_ICONS: Record<PaymentMethod, typeof Banknote> = {
  cash: Banknote,
  transfer: Landmark,
};

/** Records a payment against a debt: logs it in `debt_payments`, raises `paid_amount`. */
export function PaymentDialog({
  debt,
  open,
  onOpenChange,
  onPaid,
}: {
  debt: Debt | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Called with the updated row once the server confirms the payment. */
  onPaid?: (debt: Debt) => void;
}) {
  const [value, setValue] = React.useState('');
  const [method, setMethod] = React.useState<PaymentMethod>('cash');
  const [paidAt, setPaidAt] = React.useState(todayIso());
  const [note, setNote] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open && debt) {
      setValue(String(debt.remaining_amount));
      setMethod('cash');
      setPaidAt(todayIso());
      setNote('');
    }
  }, [open, debt]);

  if (!debt) return null;

  const amount = Number(value || 0);
  const remaining = Number(debt.remaining_amount);
  const valid = Number.isFinite(amount) && amount > 0 && amount <= remaining && !!paidAt;
  const after = Math.max(remaining - (valid ? amount : 0), 0);
  const progressAfter =
    Number(debt.amount) > 0 ? ((Number(debt.amount) - after) / Number(debt.amount)) * 100 : 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!debt || !valid) return;

    setSaving(true);
    const supabase = getSupabaseBrowserClient();

    const { data, error } = await supabase.rpc('record_payment', {
      p_debt_id: debt.id,
      p_amount: amount,
      p_method: method,
      p_paid_at: paidAt,
      p_note: note.trim() || null,
    });

    setSaving(false);

    if (error) {
      toast.error('تعذّر تسجيل الدفعة', { description: error.message });
      return;
    }

    const updated = data as Debt;
    onPaid?.(updated);

    toast.success(
      updated.status === 'paid'
        ? 'تم سداد الدين بالكامل 🎉'
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="paid-at">تاريخ الدفعة</Label>
              <Input
                id="paid-at"
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                max={todayIso()}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PAYMENT_METHODS) as PaymentMethod[]).map((key) => {
                  const Icon = METHOD_ICONS[key];
                  const active = method === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMethod(key)}
                      aria-pressed={active}
                      className={cn(
                        'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition-colors duration-fast',
                        active
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-input bg-card text-muted-foreground hover:bg-secondary',
                      )}
                    >
                      <Icon className="size-4" />
                      {PAYMENT_METHODS[key].label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-note">ملاحظات (اختياري)</Label>
            <Textarea
              id="payment-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="رقم مرجعي، ملاحظة للدفعة…"
              rows={2}
            />
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
