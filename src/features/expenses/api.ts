import { createClient } from '@/lib/supabase/server';
import { PAGE_SIZE, type LedgerQuery } from '@/lib/params';
import type { ExpensesPage } from '@/lib/types';

const EMPTY_EXPENSES: ExpensesPage = {
  rows: [],
  total: 0,
  sum: 0,
  monthTotal: 0,
  byCategory: [],
};

/** One page of expenses plus totals and the category breakdown, all from SQL. */
export async function getExpensesPage(
  ownerId: string,
  query: LedgerQuery,
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
