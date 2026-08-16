import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { AuditLogsView } from '@/components/admin/audit-logs-view';
import type { AuditLog } from '@/lib/types';

export const metadata: Metadata = { title: 'السجلات' };

export default async function AdminAuditLogsPage() {
  const supabase = createClient();

  const { data } = await supabase
    .from('audit_logs')
    .select('*, actor:profiles!audit_logs_actor_id_fkey(id,name,email,avatar_url)')
    .order('created_at', { ascending: false })
    .limit(500);

  return <AuditLogsView initialLogs={(data as AuditLog[]) ?? []} />;
}
