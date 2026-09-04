import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/supabase/server';
import { isAdmin } from '@/lib/permissions';

/**
 * Server-side gate for every /admin route. The RLS policies enforce the same
 * rule at the data layer — this just keeps non-admins out of the UI, so a
 * change here can never widen what an account can actually read or write.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect('/login');
  if (!isAdmin(profile)) redirect('/dashboard');

  return <>{children}</>;
}
