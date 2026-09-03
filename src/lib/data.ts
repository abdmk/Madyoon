import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { PAGE_SIZE, type DebtQuery, type ExpenseQuery, type RevenueQuery } from '@/lib/params';
import type {
  DashboardData,
  DashboardPeriod,
  DashboardPeriodSummary,
  DebtDetail,
  DebtsPage,
  DueAlerts,
  ExpensesPage,
  RevenuesPage,
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

const EMPTY_REVENUES: RevenuesPage = {
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
    overdueAmount: 0,
    dueSoon: 0,
    dueSoonAmount: 0,
  },
  expenses: { count: 0, monthTotal: 0 },
  revenues: { count: 0, monthTotal: 0 },
  breakdown: [],
  trend: [],
  urgent: [],
};

const EMPTY_PERIOD_SUMMARY: DashboardPeriodSummary = {
  totals: { revenues: 0, expenses: 0, collected: 0, newDebt: 0 },
  series: [],
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

export async function getRevenuesPage(
  ownerId: string,
  query: RevenueQuery,
): Promise<RevenuesPage> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('list_revenues', {
    p_owner: ownerId,
    p_search: query.search || null,
    p_category: query.category,
    p_from: query.from || null,
    p_to: query.to || null,
    p_limit: PAGE_SIZE,
    p_offset: (query.page - 1) * PAGE_SIZE,
  });

  if (error || !data) return EMPTY_REVENUES;
  return data as RevenuesPage;
}

/**
 * One debt with everything the list leaves behind: phone, notes, timestamps
 * and the full payment ledger. Returns null when the id doesn't exist or RLS
 * hides it, which the route turns into a 404.
 */
export async function getDebtDetail(id: string): Promise<DebtDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('debt_detail', { p_id: id });

  if (error || !data) return null;
  return data as DebtDetail;
}

export async function getDashboard(ownerId: string): Promise<DashboardData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('dashboard_summary', { p_owner: ownerId });

  if (error || !data) return EMPTY_DASHBOARD;
  return data as DashboardData;
}

export async function getDashboardPeriodSummary(
  ownerId: string,
  period: DashboardPeriod,
): Promise<DashboardPeriodSummary> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('dashboard_period_summary', {
    p_owner: ownerId,
    p_period: period,
  });

  if (error || !data) return EMPTY_PERIOD_SUMMARY;
  return data as DashboardPeriodSummary;
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
