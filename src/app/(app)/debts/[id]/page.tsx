import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getDebtDetail } from '@/lib/data';
import { DebtDetailView } from '@/components/debts/debt-detail-view';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const detail = await getDebtDetail(params.id);
  return { title: detail ? detail.debt.creditor_name : 'الدين' };
}

export default async function DebtPage({ params }: { params: { id: string } }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  // SECURITY INVOKER + RLS: a debt this account cannot see comes back null,
  // which is a 404 here rather than a leak that the id exists.
  const detail = await getDebtDetail(params.id);
  if (!detail) notFound();

  return <DebtDetailView detail={detail} />;
}
