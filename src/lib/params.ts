import type { DebtCategory, DebtStatus, Priority } from './types';

/**
 * The list pages keep their filters in the URL rather than in a client store.
 * That makes every view server-renderable, shareable and back-button friendly,
 * and it means a filter change is one Postgres query instead of a full refetch
 * plus a client-side pass over every row.
 */

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

export const PAGE_SIZE = 20;

export type SearchParams = Record<string, string | string[] | undefined>;

export interface DebtQuery {
  search: string;
  category: DebtCategory | 'all';
  status: DebtStatus | 'all';
  priority: Priority | 'all';
  sort: DebtSort;
  page: number;
}

export interface ExpenseQuery {
  search: string;
  category: string;
  from: string;
  to: string;
  page: number;
}

const DEBT_CATEGORY_VALUES = [
  'personal',
  'credit_card',
  'loan',
  'bill',
  'business',
  'other',
];
const DEBT_STATUS_VALUES = ['pending', 'partial', 'paid'];
const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'];

function one(params: SearchParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

function pick<T extends string>(value: string, allowed: readonly string[], fallback: T): T {
  return (allowed.includes(value) ? value : fallback) as T;
}

function pageOf(params: SearchParams) {
  const n = Number.parseInt(one(params, 'page'), 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/** Anything unrecognised falls back to the default, so a hand-edited URL is safe. */
export function parseDebtQuery(params: SearchParams): DebtQuery {
  return {
    search: one(params, 'q').slice(0, 100),
    category: pick(one(params, 'category'), DEBT_CATEGORY_VALUES, 'all'),
    status: pick(one(params, 'status'), DEBT_STATUS_VALUES, 'all'),
    priority: pick(one(params, 'priority'), PRIORITY_VALUES, 'all'),
    sort: pick(one(params, 'sort'), DEBT_SORTS, 'due_asc'),
    page: pageOf(params),
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function parseExpenseQuery(params: SearchParams): ExpenseQuery {
  const from = one(params, 'from');
  const to = one(params, 'to');
  return {
    search: one(params, 'q').slice(0, 100),
    category: one(params, 'category') || 'all',
    from: ISO_DATE.test(from) ? from : '',
    to: ISO_DATE.test(to) ? to : '',
    page: pageOf(params),
  };
}

/** Builds the querystring for a list page, omitting anything left at default. */
export function debtQueryString(query: Partial<DebtQuery>) {
  const params = new URLSearchParams();
  if (query.search) params.set('q', query.search);
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.status && query.status !== 'all') params.set('status', query.status);
  if (query.priority && query.priority !== 'all') params.set('priority', query.priority);
  if (query.sort && query.sort !== 'due_asc') params.set('sort', query.sort);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  return params.toString();
}

export function expenseQueryString(query: Partial<ExpenseQuery>) {
  const params = new URLSearchParams();
  if (query.search) params.set('q', query.search);
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  return params.toString();
}

export function debtFiltersActive(query: DebtQuery) {
  return (
    (query.category !== 'all' ? 1 : 0) +
    (query.status !== 'all' ? 1 : 0) +
    (query.priority !== 'all' ? 1 : 0)
  );
}

export function expenseFiltersActive(query: ExpenseQuery) {
  return !!query.search || query.category !== 'all' || !!query.from || !!query.to;
}
