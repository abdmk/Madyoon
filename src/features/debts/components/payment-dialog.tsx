'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Banknote, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/misc';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { formatAmount } from '@/lib/formatters';
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

/**
 * Records a payment against a debt: logs it in `debt_payments`, raises
 * `paid_amount` (the trigger recomputes `status`).
 *
 * Presented as a responsive sheet — a bottom sheet on a phone, where this is
 * the single most frequent thing anyone does in the app, and a centred modal
 * on a desktop. The running "remaining after this payment" figure updates as
 * you type, and the confirmation repeats it, because the question behind
 * every payment is "what do I still owe them".
 */
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

    // The confirmation carries the new balance: the point of recording a
    // payment is knowing what is left afterwards.
    toast.success(
      updated.status === 'paid'
        ? 'تم سداد الدين بالكامل 🎉'
        : `تم تسجيل دفعة ${formatAmount(amount, debt.currency)}`,
      {
        description:
          updated.status === 'paid'
            ? `${debt.creditor_name} — لم يبقَ شيء.`
            : `${debt.creditor_name} — المتبقي الآن ${formatAmount(
                updated.remaining_amount,
                debt.currency,
              )}`,
      },
    );
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>تسجيل دفعة</SheetTitle>
          <SheetDescription>
            {debt.creditor_name} — المتبقي {formatAmount(remaining, debt.currency)}
          </SheetDescription>
        </SheetHeader>

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
              aria-invalid={!!value && !valid}
              aria-describedby={value && !valid ? 'payment-error' : undefined}
              autoFocus
            />
            {value && !valid ? (
              <p id="payment-error" role="alert" className="text-xs text-destructive">
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
                aria-label={
                  ratio === 1
                    ? 'دفع المتبقي كاملاً'
                    : `دفع ${ratio * 100}٪ من المتبقي`
                }
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
                className="[unicode-bidi:isolate]"
                dir="ltr"
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
                        'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium',
                        'transition-[background-color,border-color,color,transform] duration-fast active:scale-[0.97]',
                        active
                          ? 'border-primary/40 bg-primary/10 text-primary'
                          : 'border-input bg-card text-muted-foreground hover:bg-secondary',
                      )}
                    >
                      <Icon className={cn('size-4 transition-transform duration-fast', active && 'scale-110')} />
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

          <div className="rounded-lg border bg-muted/40 p-3" aria-live="polite">
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

          <SheetFooter>
            <Button type="submit" variant="success" loading={saving} disabled={!valid}>
              تأكيد الدفعة
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
