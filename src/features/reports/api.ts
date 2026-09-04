import { createClient } from '@/lib/supabase/server';
import type { ReportsSummary } from '@/lib/types';

const EMPTY: ReportsSummary = {
  cashflow: [],
  collection: { billed: 0, collected: 0, outstanding: 0 },
  aging: { current: 0, days1_30: 0, days31_60: 0, days61_90: 0, over90: 0, undated: 0 },
  topCreditors: [],
  expenseCategories: [],
  comparison: {
    thisMonth: { revenues: 0, expenses: 0, collected: 0 },
    lastMonth: { revenues: 0, expenses: 0, collected: 0 },
  },
};

/** Every number on the reports page, in one aggregation round trip. */
export async function getReportsSummary(
  ownerId: string,
  months: number,
): Promise<ReportsSummary> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('reports_summary', {
    p_owner: ownerId,
    p_months: months,
  });

  if (error || !data) return EMPTY;
  return data as ReportsSummary;
}
