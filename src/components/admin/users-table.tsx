'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Download, Search, ShieldCheck, User as UserIcon, Users, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/misc';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSession } from '@/components/session-provider';
import { formatAmount, formatDate, initials } from '@/lib/formatters';
import { roleLabel } from '@/lib/permissions';
import { downloadCsv, timestampedName } from '@/lib/export';
import type { AdminUserRow, Role } from '@/lib/types';

type SortKey = 'created' | 'debts' | 'remaining' | 'name';

export function UsersTable({ initialUsers }: { initialUsers: AdminUserRow[] }) {
  const { profile: currentProfile } = useSession();
  const [users, setUsers] = React.useState(initialUsers);
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<Role | 'all'>('all');
  const [sort, setSort] = React.useState<SortKey>('created');
  const [updating, setUpdating] = React.useState<string | null>(null);

  const currency = currentProfile.currency;

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (q && !`${u.name} ${u.email ?? ''}`.toLowerCase().includes(q)) return false;
      return true;
    });

    return rows.sort((a, b) => {
      switch (sort) {
        case 'debts':
          return Number(b.total_amount) - Number(a.total_amount);
        case 'remaining':
          return Number(b.remaining_amount) - Number(a.remaining_amount);
        case 'name':
          return (a.name || '').localeCompare(b.name || '', 'ar');
        case 'created':
        default:
          return b.created_at.localeCompare(a.created_at);
      }
    });
  }, [users, search, roleFilter, sort]);

  async function changeRole(user: AdminUserRow, role: Role) {
    if (user.id === currentProfile.id) {
      toast.error('لا يمكنك تغيير صلاحية حسابك الخاص');
      return;
    }

    setUpdating(user.id);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('profiles').update({ role }).eq('id', user.id);
    setUpdating(null);

    if (error) {
      toast.error('تعذّر تغيير الصلاحية', { description: error.message });
      return;
    }

    setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, role } : u)));
    void supabase.rpc('write_log', {
      p_action: 'admin.role_change',
      p_target_user: user.id,
      p_entity: 'profiles',
      p_entity_id: user.id,
      p_details: { role },
    });
    toast.success(`تم تحديث صلاحية ${user.name || user.email}`);
  }

  function exportCsv() {
    downloadCsv(timestampedName('madyoon-users'), filtered, [
      { header: 'الاسم', value: (u) => u.name },
      { header: 'البريد', value: (u) => u.email ?? '' },
      { header: 'الصلاحية', value: (u) => roleLabel(u.role) },
      { header: 'عدد الديون', value: (u) => u.debts_count },
      { header: 'إجمالي الديون', value: (u) => u.total_amount },
      { header: 'المسدد', value: (u) => u.paid_amount },
      { header: 'المتبقي', value: (u) => u.remaining_amount },
      { header: 'إجمالي المصاريف', value: (u) => u.expenses_total },
      { header: 'تاريخ التسجيل', value: (u) => u.created_at.slice(0, 10) },
    ]);
    toast.success('تم تصدير الملف');
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="المستخدمون" description={`${users.length} حساب مسجّل في النظام.`}>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="size-4" />
          تصدير CSV
        </Button>
      </PageHeader>

      <Card className="no-print">
        <CardContent className="grid gap-2 p-3 sm:grid-cols-3 sm:p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو البريد…"
              className="pe-9"
              aria-label="بحث في المستخدمين"
            />
          </div>

          <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | 'all')}>
            <SelectTrigger aria-label="الصلاحية">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الصلاحيات</SelectItem>
              <SelectItem value="admin">المديرون</SelectItem>
              <SelectItem value="user">المستخدمون</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger aria-label="الترتيب">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created">الأحدث تسجيلاً</SelectItem>
                <SelectItem value="debts">الأكبر ديوناً</SelectItem>
                <SelectItem value="remaining">الأكبر متبقياً</SelectItem>
                <SelectItem value="name">الاسم</SelectItem>
              </SelectContent>
            </Select>

            {search || roleFilter !== 'all' ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="مسح الفلاتر"
                onClick={() => {
                  setSearch('');
                  setRoleFilter('all');
                }}
              >
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Users} title="لا نتائج مطابقة" description="جرّب تعديل البحث أو الفلاتر." />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th scope="col" className="p-3 text-start font-medium">المستخدم</th>
                  <th scope="col" className="p-3 text-start font-medium">الصلاحية</th>
                  <th scope="col" className="p-3 text-start font-medium">الديون</th>
                  <th scope="col" className="p-3 text-start font-medium">المتبقي</th>
                  <th scope="col" className="p-3 text-start font-medium">المصاريف</th>
                  <th scope="col" className="p-3 text-start font-medium">التسجيل</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((user) => (
                  <tr key={user.id} className="transition-colors hover:bg-muted/30">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          {user.avatar_url ? (
                            <AvatarImage
                              src={user.avatar_url}
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <AvatarFallback>{initials(user.name, user.email)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{user.name || 'بدون اسم'}</p>
                          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      <Select
                        value={user.role}
                        onValueChange={(v) => changeRole(user, v as Role)}
                        disabled={updating === user.id || user.id === currentProfile.id}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">
                            <span className="flex items-center gap-1.5">
                              <UserIcon className="size-3.5" />
                              مستخدم
                            </span>
                          </SelectItem>
                          <SelectItem value="admin">
                            <span className="flex items-center gap-1.5">
                              <ShieldCheck className="size-3.5" />
                              مدير
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>

                    <td className="p-3">
                      <p className="tabular">{formatAmount(user.total_amount, currency)}</p>
                      <p className="text-xs text-muted-foreground tabular">
                        {user.debts_count} دين
                      </p>
                    </td>

                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={
                          Number(user.remaining_amount) > 0
                            ? 'border-warning/25 bg-warning/10 text-warning'
                            : 'border-success/25 bg-success/10 text-success'
                        }
                      >
                        {formatAmount(user.remaining_amount, currency)}
                      </Badge>
                    </td>

                    <td className="p-3 tabular">
                      {formatAmount(user.expenses_total, currency)}
                    </td>

                    <td className="p-3 text-muted-foreground tabular">
                      {formatDate(user.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
