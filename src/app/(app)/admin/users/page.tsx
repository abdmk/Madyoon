import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { UsersTable } from '@/components/admin/users-table';
import type { AdminUserRow } from '@/lib/types';

export const metadata: Metadata = { title: 'المستخدمون' };

export default async function AdminUsersPage() {
  const supabase = createClient();
  const { data } = await supabase.rpc('admin_users');

  return <UsersTable initialUsers={(data as AdminUserRow[]) ?? []} />;
}
