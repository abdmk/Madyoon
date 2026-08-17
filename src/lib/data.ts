import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PAGE_SIZE, type DebtQuery, type ExpenseQuery } from '@/lib/params';
import type {
  DashboardData,
  DebtsPage,
  DueAlerts,
  ExpensesPage,
} from '@/lib/types';

/**
 * Every read a page needs, as one Postgres round trip each.
 *
 * The filtering, sorting, paging and aggregation all happen in SQL (see
 * `supabase/migrations/0005_query_performance.sql`); nothing here fetches a
 * table in order to reduce it in JavaScript. The functions are SECURITY
 * INVOKER, so the existing RLS policies decide what comes back — passing an
 * `ownerId` you have no share with simply returns empty results.
 */

const EMPTY_DEBTS: DebtsPage = {
  rows: [],
  total: 0,
  summary: {
    total: 0,
    paid: 0,
    remaining: 0,
    count: 0,
    settled: 0,
    overdue: 0,
    dueSoon: 0,
  },
};

const EMPTY_EXPENSES: ExpensesPage = {
  rows: [],
  total: 0,
  sum: 0,
  monthTotal: 0,
  byCategory: [],
};

const EMPTY_DASHBOARD: DashboardData = {
  debts: {
    total: 0,
    paid: 0,
    remaining: 0,
    count: 0,
    settled: 0,
    active: 0,
    overdue: 0,
    dueSoon: 0,
  },
  expenses: { count: 0, monthTotal: 0 },
  breakdown: [],
  trend: [],
  urgent: [],
};

export async function getDebtsPage(ownerId: string, query: DebtQuery): Promise<DebtsPage> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('list_debts', {
    p_owner: ownerId,
    p_search: query.search || null,
    p_category: query.category,
    p_status: query.status,
    p_priority: query.priority,
    p_sort: query.sort,
    p_limit: PAGE_SIZE,
    p_offset: (query.page - 1) * PAGE_SIZE,
  });

  if (error || !data) return EMPTY_DEBTS;
  return data as DebtsPage;
}

export async function getExpensesPage(
  ownerId: string,
  query: ExpenseQuery,
): Promise<ExpensesPage> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('list_expenses', {
    p_owner: ownerId,
    p_search: query.search || null,
    p_category: query.category,
    p_from: query.from || null,
    p_to: query.to || null,
    p_limit: PAGE_SIZE,
    p_offset: (query.page - 1) * PAGE_SIZE,
  });

  if (error || !data) return EMPTY_EXPENSES;
  return data as ExpensesPage;
}

export async function getDashboard(ownerId: string): Promise<DashboardData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('dashboard_summary', { p_owner: ownerId });

  if (error || !data) return EMPTY_DASHBOARD;
  return data as DashboardData;
}

/**
 * The header bell. Memoised because the layout renders on every navigation
 * while the underlying answer changes at most once a day.
 */
export const getDueAlerts = cache(async (ownerId: string): Promise<DueAlerts> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('due_alerts', { p_owner: ownerId, p_limit: 8 });

  if (error || !data) return { count: 0, rows: [] };
  return data as DueAlerts;
});
