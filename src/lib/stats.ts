import { dueInfo } from './format';
import type { Debt, Expense } from './types';

/**
 * Used by the AI assistant's context builder only (`src/lib/ai/prompt.ts`),
 * which — unlike the list pages — legitimately needs the full set of rows to
 * reason over. Every list/dashboard page computes its totals in Postgres
 * instead (see `supabase/migrations/0005_query_performance.sql`).
 */

export interface DebtSummary {
  total: number;
  paid: number;
  remaining: number;
  count: number;
  settled: number;
  active: number;
  overdue: number;
  dueSoon: number;
  progress: number;
}

export function summarizeDebts(debts: Debt[]): DebtSummary {
  let total = 0;
  let paid = 0;
  let settled = 0;
  let overdue = 0;
  let dueSoon = 0;

  for (const d of debts) {
    total += Number(d.amount);
    paid += Number(d.paid_amount);
    if (d.status === 'paid') settled += 1;
    const due = dueInfo(d);
    if (due.state === 'overdue') overdue += 1;
    else if (due.state === 'soon' || due.state === 'today') dueSoon += 1;
  }

  const remaining = Math.max(total - paid, 0);

  return {
    total,
    paid,
    remaining,
    count: debts.length,
    settled,
    active: debts.length - settled,
    overdue,
    dueSoon,
    progress: total > 0 ? (paid / total) * 100 : 0,
  };
}

export function sumExpenses(expenses: Expense[]) {
  return expenses.reduce((acc, e) => acc + Number(e.amount), 0);
}
