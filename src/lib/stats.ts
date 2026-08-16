import { PRIORITIES } from './constants';
import { dueInfo } from './format';
import type { Debt, Expense } from './types';
import type { DebtSort } from '@/store/use-app-store';

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

/** Totals per category, largest first — feeds the donut charts. */
export function groupByCategory<T extends { amount: number | string }>(
  rows: T[],
  key: (row: T) => string,
) {
  const map = new Map<string, { name: string; value: number; count: number }>();
  for (const row of rows) {
    const k = key(row);
    const current = map.get(k) ?? { name: k, value: 0, count: 0 };
    current.value += Number(row.amount);
    current.count += 1;
    map.set(k, current);
  }
  return [...map.values()].sort((a, b) => b.value - a.value);
}

/** Monthly expense totals for the last `months` months, oldest first. */
export function monthlyExpenses(expenses: Expense[], months = 6) {
  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = months - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, 0);
  }

  for (const e of expenses) {
    const key = e.date.slice(0, 7);
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + Number(e.amount));
  }

  return [...buckets.entries()].map(([month, total]) => ({ month, total }));
}

export function sortDebts(debts: Debt[], sort: DebtSort): Debt[] {
  const rows = debts.slice();

  switch (sort) {
    case 'due_asc':
    case 'due_desc': {
      const dir = sort === 'due_asc' ? 1 : -1;
      // Debts with no due date always sink to the bottom, either way.
      return rows.sort((a, b) => {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return dir * a.due_date.localeCompare(b.due_date);
      });
    }
    case 'amount_desc':
      return rows.sort((a, b) => Number(b.remaining_amount) - Number(a.remaining_amount));
    case 'amount_asc':
      return rows.sort((a, b) => Number(a.remaining_amount) - Number(b.remaining_amount));
    case 'priority':
      return rows.sort((a, b) => {
        const diff = PRIORITIES[b.priority].weight - PRIORITIES[a.priority].weight;
        if (diff !== 0) return diff;
        // Same priority: whatever is due first comes first.
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      });
    case 'created_desc':
    default:
      return rows.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}
