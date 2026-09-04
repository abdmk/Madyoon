import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type {
  AttentionFeed,
  DashboardData,
  DashboardPeriod,
  DashboardPeriodSummary,
  DueAlerts,
} from '@/lib/types';

/**
 * The dashboard's reads. Each is a single aggregation round trip — the totals,
 * groupings and top-N selections are computed in Postgres, not by loading
 * tables into the browser and reducing them there.
 */

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

const EMPTY_ATTENTION: AttentionFeed = { overdue: [], dueSoon: [], recentPayments: [] };

export async function getDashboard(ownerId: string): Promise<DashboardData> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('dashboard_summary', { p_owner: ownerId });

  if (error) {
    console.error('[getDashboard] RPC error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }
  if (!data) {
    console.warn('[getDashboard] No data returned from RPC');
  }

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

  if (error) {
    console.error('[getDashboardPeriodSummary] RPC error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }
  if (!data) {
    console.warn('[getDashboardPeriodSummary] No data returned from RPC');
  }

  if (error || !data) return EMPTY_PERIOD_SUMMARY;
  return data as DashboardPeriodSummary;
}

/**
 * The "needs a decision from you" feed: what is late, what lands this week,
 * and what was just paid. One round trip, ordered by urgency in SQL.
 */
export async function getAttentionFeed(ownerId: string): Promise<AttentionFeed> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('attention_feed', {
    p_owner: ownerId,
    p_limit: 5,
  });

  if (error) {
    console.error('[getAttentionFeed] RPC error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }
  if (!data) {
    console.warn('[getAttentionFeed] No data returned from RPC');
  }

  if (error || !data) return EMPTY_ATTENTION;
  return data as AttentionFeed;
}

/**
 * The header bell. Memoised because the layout renders on every navigation
 * while the underlying answer changes at most once a day.
 */
export const getDueAlerts = cache(async (ownerId: string): Promise<DueAlerts> => {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('due_alerts', { p_owner: ownerId, p_limit: 8 });

  if (error) {
    console.error('[getDueAlerts] RPC error:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  }
  if (!data) {
    console.warn('[getDueAlerts] No data returned from RPC');
  }

  if (error || !data) return { count: 0, rows: [] };
  return data as DueAlerts;
});
