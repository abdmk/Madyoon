/**
 * The arithmetic behind the reports.
 *
 * Kept out of the components that render it so it can be tested directly and
 * reused: a percentage that is wrong in a chart is wrong in a sentence too,
 * and both should be computing it the same way. Nothing here talks to the
 * database — the aggregation itself happens in Postgres; this is the last
 * step of turning aggregates into something a person can read.
 */

/**
 * Percentage change from `before` to `now`.
 *
 * A zero baseline has no meaningful percentage, so it is reported as +100%
 * when there is now something and 0% when there still isn't — the honest
 * alternatives are Infinity or NaN, and neither belongs on a dashboard.
 */
export function pctChange(now: number, before: number): number {
  if (before <= 0) return now > 0 ? 100 : 0;
  return ((now - before) / before) * 100;
}

/** `part` as a percentage of `total`, clamped so rounding can't exceed 100. */
export function share(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min((part / total) * 100, 100);
}

/** How much of a debt has been repaid, as a percentage. */
export function repaymentProgress(paid: number, total: number): number {
  return share(paid, total);
}

/** The direction a figure moved, for choosing an icon and a tone. */
export type Trend = 'up' | 'down' | 'flat';

export function trendOf(changePct: number, deadband = 0.5): Trend {
  if (Math.abs(changePct) < deadband) return 'flat';
  return changePct > 0 ? 'up' : 'down';
}

/** Sums a numeric field over rows whose values may arrive as numeric strings. */
export function sumBy<T>(rows: readonly T[], pick: (row: T) => number | string): number {
  return rows.reduce((total, row) => total + Number(pick(row) ?? 0), 0);
}
