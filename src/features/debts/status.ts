import { AlertTriangle, CheckCircle2, CircleDashed, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DebtDisplayStatus, DebtStatus } from '@/lib/types';

/**
 * The status a person actually cares about.
 *
 * The database stores pending/partial/paid — maintained by the payment
 * trigger — and says nothing about lateness. "Overdue" is the combination of
 * an unsettled debt and a due date in the past, so it is derived here rather
 * than written to a column that would immediately start drifting from the
 * calendar.
 *
 * Each status carries an icon as well as a colour: colour alone is not a
 * status indicator for someone who cannot distinguish the hues.
 */
export interface DebtStatusMeta {
  value: DebtDisplayStatus;
  label: string;
  tone: 'success' | 'danger' | 'warning' | 'primary';
  icon: LucideIcon;
}

export const DEBT_DISPLAY_STATUS: Record<DebtDisplayStatus, DebtStatusMeta> = {
  paid: { value: 'paid', label: 'مسدد', tone: 'success', icon: CheckCircle2 },
  overdue: { value: 'overdue', label: 'متأخر', tone: 'danger', icon: AlertTriangle },
  partial: { value: 'partial', label: 'سداد جزئي', tone: 'warning', icon: Clock },
  pending: { value: 'pending', label: 'قيد السداد', tone: 'primary', icon: CircleDashed },
};

/** Order the filter offers them in: what needs attention first. */
export const DEBT_STATUS_FILTERS: DebtStatusMeta[] = [
  DEBT_DISPLAY_STATUS.overdue,
  DEBT_DISPLAY_STATUS.pending,
  DEBT_DISPLAY_STATUS.partial,
  DEBT_DISPLAY_STATUS.paid,
];

export function debtDisplayStatus(debt: {
  status: DebtStatus;
  due_date?: string | null;
}): DebtStatusMeta {
  if (debt.status === 'paid') return DEBT_DISPLAY_STATUS.paid;

  if (debt.due_date) {
    // Compare as calendar dates: a debt due today is not late yet.
    const today = new Date().toISOString().slice(0, 10);
    if (debt.due_date < today) return DEBT_DISPLAY_STATUS.overdue;
  }

  return debt.status === 'partial' ? DEBT_DISPLAY_STATUS.partial : DEBT_DISPLAY_STATUS.pending;
}
