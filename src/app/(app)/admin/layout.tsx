import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';

/**
 * Server-side gate for every /admin route. The RLS policies enforce the same
 * rule at the data layer — this just keeps non-admins out of the UI.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (profile.role !== 'admin') redirect('/dashboard');

  return <>{children}</>;
}
