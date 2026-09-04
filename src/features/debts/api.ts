import { createClient } from '@/lib/supabase/server';
import { PAGE_SIZE } from '@/lib/params';
import type { DebtQuery } from './params';
import type { DebtDetail, DebtsPage } from '@/lib/types';

/**
 * Every debt read the app makes, as one Postgres round trip each.
 *
 * Filtering, sorting, paging and the summary totals all happen in SQL
 * (`list_debts`, `debt_detail`); nothing here pulls a table in order to
 * reduce it in JavaScript. The functions are SECURITY INVOKER, so the
 * existing RLS policies decide what comes back — passing an `ownerId` you
 * have no share with simply returns empty results rather than an error.
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

export async function getDebtsPage(ownerId: string, query: DebtQuery): Promise<DebtsPage> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('list_debts', {
    p_owner: ownerId,
    p_search: query.search || null,
    p_category: query.category,
    p_status: query.status,
    p_priority: query.priority,
    p_sort: query.sort,
    p_currency: query.currency === 'all' ? null : query.currency,
    p_from: query.from || null,
    p_to: query.to || null,
    p_limit: PAGE_SIZE,
    p_offset: (query.page - 1) * PAGE_SIZE,
  });

  if (error || !data) return EMPTY_DEBTS;
  return data as DebtsPage;
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

/** The distinct currencies this owner actually has debts in — powers the filter. */
export async function getDebtCurrencies(ownerId: string): Promise<string[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('debts')
    .select('currency')
    .eq('user_id', ownerId);

  if (error || !data) return [];
  return [...new Set((data as { currency: string }[]).map((r) => r.currency))].sort();
}
