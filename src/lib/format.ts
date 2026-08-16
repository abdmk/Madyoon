import { differenceInCalendarDays, parseISO } from 'date-fns';
import { CURRENCIES, DUE_SOON_DAYS } from './constants';
import type { Debt } from './types';

export function currencySymbol(code: string) {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

/**
 * Latin digits inside Arabic copy — easier to scan in tables and matches how
 * amounts are written on real invoices in the region.
 */
export function formatAmount(value: number | string | null | undefined, currency?: string) {
  const n = Number(value ?? 0);
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(Number.isFinite(n) ? n : 0);
  return currency ? `${formatted} ${currencySymbol(currency)}` : formatted;
}

export function formatNumber(value: number | string | null | undefined) {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat('en-US').format(Number.isFinite(n) ? n : 0);
}

export function formatPercent(value: number) {
  if (!Number.isFinite(value)) return '0%';
  return `${Math.round(value)}%`;
}

const dateFmt = new Intl.DateTimeFormat('ar', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  numberingSystem: 'latn',
});

const dateTimeFmt = new Intl.DateTimeFormat('ar', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  numberingSystem: 'latn',
});

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return dateFmt.format(d);
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—';
  const d = typeof value === 'string' ? parseISO(value) : value;
  if (Number.isNaN(d.getTime())) return '—';
  return dateTimeFmt.format(d);
}

export type DueState = 'none' | 'overdue' | 'today' | 'soon' | 'later';

export interface DueInfo {
  state: DueState;
  days: number;
  label: string;
  className: string;
}

/** Where a debt sits relative to its due date, for badges and alerts. */
export function dueInfo(debt: Pick<Debt, 'due_date' | 'status'>): DueInfo {
  if (!debt.due_date || debt.status === 'paid') {
    return { state: 'none', days: 0, label: '—', className: 'text-muted-foreground' };
  }

  const days = differenceInCalendarDays(parseISO(debt.due_date), new Date());

  if (days < 0) {
    return {
      state: 'overdue',
      days,
      label: `متأخر ${Math.abs(days)} يوم`,
      className: 'text-destructive',
    };
  }
  if (days === 0) {
    return { state: 'today', days, label: 'يستحق اليوم', className: 'text-destructive' };
  }
  if (days <= DUE_SOON_DAYS) {
    return { state: 'soon', days, label: `بعد ${days} يوم`, className: 'text-warning' };
  }
  return { state: 'later', days, label: `بعد ${days} يوم`, className: 'text-muted-foreground' };
}

/** Short, human initials for avatar fallbacks. */
export function initials(name?: string | null, email?: string | null) {
  const source = (name || email || '؟').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

/** Human-readable invite code: unambiguous characters only. */
export function generateInviteCode(length = 8) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
