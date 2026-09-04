import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { getCreditorDetail } from '@/features/debts/creditor-api';
import { CreditorView } from '@/features/debts/components/creditor-view';

export const metadata: Metadata = { title: 'جهة دائنة' };

export default async function CreditorPage({ params }: { params: { name: string } }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');

  // The name is the identity here (there is no customers table), so it
  // arrives URL-encoded and is passed to the RPC as a bound parameter.
  const name = decodeURIComponent(params.name);
  const detail = await getCreditorDetail(profile.id, name);
  if (!detail) notFound();

  return <CreditorView detail={detail} />;
}
