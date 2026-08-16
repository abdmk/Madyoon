import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  MessageSquare,
  Receipt,
  ScrollText,
  Share2,
  TrendingDown,
  Users,
  Wallet,
} from 'lucide-react';
import { createClient, getProfile } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/misc';
import { formatAmount, formatDateTime, formatNumber, formatPercent } from '@/lib/format';
import { AUDIT_ACTIONS } from '@/lib/constants';
import type { AdminStats, AuditLog } from '@/lib/types';

export const metadata: Metadata = { title: 'لوحة التحكم' };

const QUICK_LINKS = [
  { href: '/admin/users', label: 'المستخدمون', icon: Users, hint: 'قائمة الحسابات والصلاحيات' },
  { href: '/admin/analytics', label: 'التحليلات', icon: BarChart3, hint: 'اتجاهات شهرية' },
  { href: '/admin/audit-logs', label: 'السجلات', icon: ScrollText, hint: 'من فعل ماذا ومتى' },
];

export default async function AdminPage() {
  const profile = await getProfile();
  const supabase = createClient();

  const [{ data: statsData }, { data: logs }] = await Promise.all([
    supabase.rpc('admin_stats'),
    supabase
      .from('audit_logs')
      .select('*, actor:profiles!audit_logs_actor_id_fkey(id,name,email,avatar_url)')
      .order('created_at', { ascending: false })
      .limit(8),
  ]);

  const stats = (statsData as AdminStats | null) ?? null;
  const currency = profile?.currency ?? 'IQD';

  if (!stats) {
    return (
      <div className="space-y-6">
        <PageHeader title="لوحة التحكم" />
        <Card className="border-destructive/25 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">
            تعذّر تحميل الإحصائيات. تأكد من صلاحيات حسابك.
          </CardContent>
        </Card>
      </div>
    );
  }

  const repaymentRate = stats.total_debts > 0 ? (stats.paid_debts / stats.total_debts) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="لوحة التحكم"
        description="نظرة شاملة على النظام والمستخدمين."
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="إجمالي المستخدمين"
          value={formatNumber(stats.total_users)}
          hint={`${stats.active_users} نشط خلال ٣٠ يوم`}
          icon={Users}
          tone="primary"
        />
        <StatCard
          label="إجمالي الديون"
          value={formatAmount(stats.total_debts, currency)}
          hint={`${formatNumber(stats.debts_count)} دين`}
          icon={Wallet}
          tone="accent"
        />
        <StatCard
          label="المسدد"
          value={formatAmount(stats.paid_debts, currency)}
          hint={`${formatNumber(stats.settled_count)} دين مكتمل`}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="المتبقي"
          value={formatAmount(stats.remaining_debts, currency)}
          hint={`${formatNumber(stats.overdue_count)} متأخر`}
          icon={TrendingDown}
          tone="warning"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>نسبة السداد في النظام</CardTitle>
              <CardDescription>من إجمالي الديون المسجّلة</CardDescription>
            </div>
            <span className="font-display text-3xl font-semibold tabular text-primary">
              {formatPercent(repaymentRate)}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={repaymentRate} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>مسدد {formatAmount(stats.paid_debts, currency)}</span>
            <span>متبقٍ {formatAmount(stats.remaining_debts, currency)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="إجمالي المصاريف"
          value={formatAmount(stats.total_expenses, currency)}
          hint={`${formatNumber(stats.expenses_count)} عملية`}
          icon={Receipt}
          tone="accent"
        />
        <StatCard
          label="ديون متأخرة"
          value={formatNumber(stats.overdue_count)}
          icon={AlertTriangle}
          tone="destructive"
        />
        <StatCard
          label="حسابات مشاركة"
          value={formatNumber(stats.shares_count)}
          icon={Share2}
          tone="muted"
        />
        <StatCard
          label="محادثات المساعد"
          value={formatNumber(stats.conversations)}
          icon={MessageSquare}
          tone="muted"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {QUICK_LINKS.map(({ href, label, icon: Icon, hint }) => (
          <Link key={href} href={href} className="group">
            <Card className="h-full p-4 transition-all group-hover:border-primary/40 group-hover:shadow-md">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{hint}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>آخر النشاطات</CardTitle>
              <CardDescription>أحدث ٨ عمليات في النظام</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/audit-logs">
                كل السجلات
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!logs || logs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">لا توجد سجلات بعد</p>
          ) : (
            <ul className="divide-y">
              {(logs as AuditLog[]).map((log) => (
                <li key={log.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">
                      {AUDIT_ACTIONS[log.action] ?? log.action}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {log.actor?.name || log.actor?.email || 'مستخدم محذوف'}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground tabular">
                    {formatDateTime(log.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
