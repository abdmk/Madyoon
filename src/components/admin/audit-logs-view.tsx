'use client';

import * as React from 'react';
import { toast } from 'sonner';
import { Download, ScrollText, Search, X } from 'lucide-react';
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
import { AUDIT_ACTIONS } from '@/lib/constants';
import { formatDateTime, initials } from '@/lib/formatters';
import { downloadCsv, timestampedName } from '@/lib/export';
import type { AuditLog } from '@/lib/types';

/** Colour by the verb at the end of the action, e.g. `debt.delete`. */
function toneFor(action: string) {
  if (action.endsWith('.delete') || action.endsWith('.revoke')) {
    return 'bg-destructive/10 text-destructive';
  }
  if (action.endsWith('.create') || action.endsWith('.accept')) {
    return 'bg-success/10 text-success';
  }
  if (action.startsWith('admin.')) {
    return 'bg-accent/10 text-accent';
  }
  return 'bg-primary/10 text-primary';
}

export function AuditLogsView({ initialLogs }: { initialLogs: AuditLog[] }) {
  const [logs] = React.useState(initialLogs);
  const [search, setSearch] = React.useState('');
  const [action, setAction] = React.useState<string>('all');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');

  const actions = React.useMemo(
    () => [...new Set(logs.map((l) => l.action))].sort(),
    [logs],
  );

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      if (action !== 'all' && log.action !== action) return false;
      if (from && log.created_at.slice(0, 10) < from) return false;
      if (to && log.created_at.slice(0, 10) > to) return false;
      if (q) {
        const haystack = `${log.action} ${log.actor?.name ?? ''} ${log.actor?.email ?? ''} ${JSON.stringify(log.details)}`;
        if (!haystack.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, action, from, to]);

  const hasFilters = !!search || action !== 'all' || !!from || !!to;

  function reset() {
    setSearch('');
    setAction('all');
    setFrom('');
    setTo('');
  }

  function exportCsv() {
    downloadCsv(timestampedName('madyoon-audit-logs'), filtered, [
      { header: 'التاريخ', value: (l) => l.created_at },
      { header: 'الإجراء', value: (l) => AUDIT_ACTIONS[l.action] ?? l.action },
      { header: 'المفتاح', value: (l) => l.action },
      { header: 'المستخدم', value: (l) => l.actor?.name ?? '' },
      { header: 'البريد', value: (l) => l.actor?.email ?? '' },
      { header: 'الكيان', value: (l) => l.entity ?? '' },
      { header: 'التفاصيل', value: (l) => JSON.stringify(l.details) },
    ]);
    toast.success('تم تصدير الملف');
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="سجلات النظام" description={`${logs.length} عملية مسجّلة.`}>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="size-4" />
          تصدير CSV
        </Button>
      </PageHeader>

      <Card className="no-print">
        <CardContent className="grid gap-2 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4">
          <div className="relative">
            <Search className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث…"
              className="pe-9"
              aria-label="بحث في السجلات"
            />
          </div>

          <Select value={action} onValueChange={setAction}>
            <SelectTrigger aria-label="نوع الإجراء">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الإجراءات</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {AUDIT_ACTIONS[a] ?? a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            aria-label="من تاريخ"
          />

          <div className="flex gap-2">
            <Input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              aria-label="إلى تاريخ"
            />
            {hasFilters ? (
              <Button variant="ghost" size="icon" onClick={reset} aria-label="مسح الفلاتر">
                <X className="size-4" />
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={logs.length === 0 ? 'لا توجد سجلات بعد' : 'لا نتائج مطابقة'}
          description={
            logs.length === 0
              ? 'ستظهر العمليات هنا بمجرد أن يبدأ المستخدمون بالنشاط.'
              : 'جرّب تعديل الفلاتر أو المدى الزمني.'
          }
          action={
            hasFilters ? (
              <Button variant="outline" onClick={reset}>
                مسح الفلاتر
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40">
                <tr>
                  <th scope="col" className="p-3 text-start font-medium">الإجراء</th>
                  <th scope="col" className="p-3 text-start font-medium">المستخدم</th>
                  <th scope="col" className="p-3 text-start font-medium">التفاصيل</th>
                  <th scope="col" className="p-3 text-start font-medium">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-muted/30">
                    <td className="p-3">
                      <Badge className={toneFor(log.action)}>
                        {AUDIT_ACTIONS[log.action] ?? log.action}
                      </Badge>
                    </td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-7">
                          {log.actor?.avatar_url ? (
                            <AvatarImage
                              src={log.actor.avatar_url}
                              alt=""
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <AvatarFallback className="text-[10px]">
                            {initials(log.actor?.name, log.actor?.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate">{log.actor?.name || 'مستخدم محذوف'}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {log.actor?.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="max-w-xs p-3">
                      <p className="truncate text-xs text-muted-foreground">
                        {Object.entries(log.details ?? {})
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(' · ') || '—'}
                      </p>
                    </td>

                    <td className="whitespace-nowrap p-3 text-muted-foreground tabular">
                      {formatDateTime(log.created_at)}
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
