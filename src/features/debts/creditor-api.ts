import { createClient } from '@/lib/supabase/server';
import type { CreditorDetail } from '@/lib/types';

/**
 * Everything owed to one name, plus its ledger.
 *
 * There is no customers table — a debt carries a free-text `creditor_name`,
 * so a "creditor" is that name grouped across the owner's debts. Returns null
 * when the name has no debts (or RLS hides them), which the route turns into
 * a 404 rather than an empty page.
 */
export async function getCreditorDetail(
  ownerId: string,
  name: string,
): Promise<CreditorDetail | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('creditor_detail', {
    p_owner: ownerId,
    p_name: name,
  });

  if (error || !data) return null;

  const detail = data as CreditorDetail;
  return detail.summary && Number(detail.summary.count) > 0 ? detail : null;
}
