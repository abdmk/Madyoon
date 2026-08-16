import type { Metadata } from 'next';
import { createClient, getProfile } from '@/lib/supabase/server';
import { SettingsView } from '@/components/settings/settings-view';
import type { SharedAccountView } from '@/lib/types';

export const metadata: Metadata = { title: 'الإعدادات' };

export default async function SettingsPage() {
  const profile = await getProfile();
  const supabase = createClient();

  const [{ data: shares }, { data: sharedWithMe }] = profile
    ? await Promise.all([
        supabase
          .from('shared_accounts')
          .select('*, shared_with:profiles!shared_accounts_shared_with_id_fkey(id,name,email,avatar_url)')
          .eq('owner_id', profile.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('shared_accounts')
          .select('*, owner:profiles!shared_accounts_owner_id_fkey(id,name,email,avatar_url)')
          .eq('shared_with_id', profile.id)
          .eq('status', 'accepted')
          .order('created_at', { ascending: false }),
      ])
    : [{ data: null }, { data: null }];

  return (
    <SettingsView
      initialShares={(shares as SharedAccountView[]) ?? []}
      initialSharedWithMe={(sharedWithMe as SharedAccountView[]) ?? []}
    />
  );
}
