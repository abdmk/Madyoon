import { ISO_DATE, one, pageOf, pick, type SearchParams } from '@/lib/params';
import type { DebtCategory, DebtDisplayStatus, Priority } from '@/lib/types';

export const DEBT_SORTS = [
  'due_asc',
  'due_desc',
  'amount_desc',
  'amount_asc',
  'priority',
  'created_desc',
] as const;

export type DebtSort = (typeof DEBT_SORTS)[number];

export const DEBT_SORT_LABELS: Record<DebtSort, string> = {
  due_asc: 'الأقرب استحقاقاً',
  due_desc: 'الأبعد استحقاقاً',
  amount_desc: 'الأكبر مبلغاً',
  amount_asc: 'الأصغر مبلغاً',
  priority: 'الأعلى أولوية',
  created_desc: 'الأحدث إضافة',
};

export interface DebtQuery {
  search: string;
  category: DebtCategory | 'all';
  /**
   * Includes the virtual `overdue` status: unsettled and past its due date.
   * `list_debts` resolves it in SQL against current_date, so the filter can
   * never disagree with the badge the row is showing.
   */
  status: DebtDisplayStatus | 'all';
  priority: Priority | 'all';
  /** ISO 4217 code, or 'all'. */
  currency: string;
  /** Due-date range, inclusive; '' means unbounded on that side. */
  from: string;
  to: string;
  sort: DebtSort;
  page: number;
}

const DEBT_CATEGORY_VALUES = ['personal', 'credit_card', 'loan', 'bill', 'business', 'other'];
const DEBT_STATUS_VALUES = ['pending', 'partial', 'paid', 'overdue'];
const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'];

/** Anything unrecognised falls back to the default, so a hand-edited URL is safe. */
export function parseDebtQuery(params: SearchParams): DebtQuery {
  const from = one(params, 'from');
  const to = one(params, 'to');
  return {
    search: one(params, 'q').slice(0, 100),
    category: pick(one(params, 'category'), DEBT_CATEGORY_VALUES, 'all'),
    status: pick(one(params, 'status'), DEBT_STATUS_VALUES, 'all'),
    priority: pick(one(params, 'priority'), PRIORITY_VALUES, 'all'),
    // Free-form so a currency added later needs no code change; the RPC only
    // ever compares it, and the length cap keeps a hand-edited URL bounded.
    currency: one(params, 'currency').slice(0, 8) || 'all',
    from: ISO_DATE.test(from) ? from : '',
    to: ISO_DATE.test(to) ? to : '',
    sort: pick(one(params, 'sort'), DEBT_SORTS, 'due_asc'),
    page: pageOf(params),
  };
}

/** Builds the querystring for the debts list, omitting anything left at default. */
export function debtQueryString(query: Partial<DebtQuery>) {
  const params = new URLSearchParams();
  if (query.search) params.set('q', query.search);
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.priority && query.priority !== 'all') params.set('priority', query.priority);
  if (query.currency && query.currency !== 'all') params.set('currency', query.currency);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.sort && query.sort !== 'due_asc') params.set('sort', query.sort);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  return params.toString();
}

/** How many filters (search excluded — it has its own visible input) are on. */
export function debtFiltersActive(query: DebtQuery) {
  return (
    (query.category !== 'all' ? 1 : 0) +
    (query.status !== 'all' ? 1 : 0) +
    (query.priority !== 'all' ? 1 : 0) +
    (query.currency !== 'all' ? 1 : 0) +
    (query.from ? 1 : 0) +
    (query.to ? 1 : 0)
  );
}
