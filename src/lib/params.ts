/**
 * Shared primitives for URL-driven list state.
 *
 * The list pages keep their filters in the URL rather than in a client store.
 * That makes every view server-renderable, shareable and back-button friendly,
 * and it means a filter change is one Postgres query instead of a full refetch
 * plus a client-side pass over every row.
 *
 * Each feature owns its own query shape (`features/<x>/params.ts`) and builds
 * it from the helpers here.
 */

export const PAGE_SIZE = 20;

export type SearchParams = Record<string, string | string[] | undefined>;

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function one(params: SearchParams, key: string) {
  const value = params[key];
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? '';
}

export function pick<T extends string>(
  value: string,
  allowed: readonly string[],
  fallback: T,
): T {
  return (allowed.includes(value) ? value : fallback) as T;
}

export function pageOf(params: SearchParams) {
  const n = Number.parseInt(one(params, 'page'), 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

/**
 * Expenses and revenues share one query shape: text search, a category, a date
 * range and a page — and their list RPCs take the same arguments. Parsing and
 * serialisation live here once instead of being duplicated per feature.
 */
export interface LedgerQuery {
  search: string;
  category: string;
  from: string;
  to: string;
  page: number;
}

export function parseLedgerQuery(params: SearchParams): LedgerQuery {
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

export function ledgerQueryString(query: Partial<LedgerQuery>) {
  const params = new URLSearchParams();
  if (query.search) params.set('q', query.search);
  if (query.category && query.category !== 'all') params.set('category', query.category);
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.page && query.page > 1) params.set('page', String(query.page));
  return params.toString();
}

export function ledgerFiltersActive(query: LedgerQuery) {
  return !!query.search || query.category !== 'all' || !!query.from || !!query.to;
}
