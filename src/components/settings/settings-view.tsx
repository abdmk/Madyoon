'use client';

import * as React from 'react';
import { toast } from 'sonner';
import {
  Check,
  Copy,
  LogOut,
  Moon,
  Plus,
  Share2,
  Sun,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/feedback/empty-state';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage, Separator, Switch } from '@/components/ui/misc';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { useSession } from '@/components/session-provider';
import { CURRENCIES } from '@/lib/constants';
import { formatDate, generateInviteCode, initials } from '@/lib/formatters';
import { roleLabel } from '@/lib/permissions';
import type { Profile, SharedAccountView, SharePermission } from '@/lib/types';

export function SettingsView({
  initialShares,
  initialSharedWithMe,
}: {
  initialShares: SharedAccountView[];
  initialSharedWithMe: SharedAccountView[];
}) {
  const { profile, setProfile } = useSession();

  const [shares, setShares] = React.useState(initialShares);
  const [sharedWithMe, setSharedWithMe] = React.useState(initialSharedWithMe);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="الإعدادات" description="ملفك الشخصي، المظهر، ومشاركة الحساب." />

      <div id="profile" className="scroll-mt-20">
        <ProfileCard profile={profile} setProfile={setProfile} />
      </div>

      <AppearanceCard />

      <SharingCard shares={shares} setShares={setShares} />

      <SharedWithMeCard sharedWithMe={sharedWithMe} setSharedWithMe={setSharedWithMe} />

      <Card className="border-destructive/25">
        <CardHeader className="pb-3">
          <CardTitle>الجلسة</CardTitle>
          <CardDescription>تسجيل الخروج من هذا الجهاز.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="destructive">
              <LogOut className="size-4" />
              تسجيل الخروج
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ProfileCard({
  profile,
  setProfile,
}: {
  profile: Profile;
  setProfile: (p: Profile) => void;
}) {
  const [name, setName] = React.useState(profile.name);
  const [currency, setCurrency] = React.useState(profile.currency);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    setName(profile.name);
    setCurrency(profile.currency);
  }, [profile]);

  const dirty = name !== profile.name || currency !== profile.currency;

  async function save() {
    setSaving(true);

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('profiles')
      .update({ name: name.trim(), currency })
      .eq('id', profile.id)
      .select()
      .single();

    setSaving(false);

    if (error) {
      toast.error('تعذّر حفظ الملف الشخصي', { description: error.message });
      return;
    }

    setProfile(data as Profile);
    void supabase.rpc('write_log', { p_action: 'profile.update', p_entity: 'profiles' });
    toast.success('تم حفظ التغييرات');
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>الملف الشخصي</CardTitle>
        <CardDescription>اسمك والعملة الافتراضية للتطبيق.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="size-14">
            {profile.avatar_url ? (
              <AvatarImage src={profile.avatar_url} alt="" referrerPolicy="no-referrer" />
            ) : null}
            <AvatarFallback className="text-base">
              {initials(profile.name, profile.email)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{profile.email}</p>
            <Badge variant="soft" className="mt-1">
              {roleLabel(profile.role)}
            </Badge>
          </div>
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">الاسم</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pref-currency">العملة الافتراضية</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger id="pref-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label} ({c.symbol})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={save} loading={saving} disabled={!dirty}>
          حفظ التغييرات
        </Button>
      </CardContent>
    </Card>
  );
}

function AppearanceCard() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>المظهر</CardTitle>
        <CardDescription>اختر بين الوضع الفاتح والداكن. سيُحفظ اختيارك.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-muted">
              {mounted && isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
            </span>
            <div>
              <p className="text-sm font-medium">الوضع الداكن</p>
              <p className="text-xs text-muted-foreground">
                {mounted ? (isDark ? 'مفعّل' : 'معطّل') : '—'}
              </p>
            </div>
          </div>
          <Switch
            checked={mounted ? isDark : false}
            onCheckedChange={(v) => setTheme(v ? 'dark' : 'light')}
            aria-label="تبديل الوضع الداكن"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */

function SharingCard({
  shares,
  setShares,
}: {
  shares: SharedAccountView[];
  setShares: React.Dispatch<React.SetStateAction<SharedAccountView[]>>;
}) {
  const { profile } = useSession();
  const [permission, setPermission] = React.useState<SharePermission>('read');
  const [creating, setCreating] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);

  async function createInvite() {
    setCreating(true);

    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase
      .from('shared_accounts')
      .insert({ owner_id: profile.id, invite_code: generateInviteCode(), permission })
      .select()
      .single();

    setCreating(false);

    if (error) {
      toast.error('تعذّر إنشاء رمز الدعوة', { description: error.message });
      return;
    }

    setShares((prev) => [data as SharedAccountView, ...prev]);
    void supabase.rpc('write_log', {
      p_action: 'share.create',
      p_entity: 'shared_accounts',
      p_entity_id: (data as SharedAccountView).id,
      p_details: { permission },
    });
    toast.success('تم إنشاء رمز الدعوة');
  }

  async function copy(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 2000);
      toast.success('تم نسخ الرمز');
    } catch {
      toast.error('تعذّر النسخ — انسخ الرمز يدوياً');
    }
  }

  async function revoke(share: SharedAccountView) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('shared_accounts').delete().eq('id', share.id);

    if (error) {
      toast.error('تعذّر إلغاء المشاركة', { description: error.message });
      return;
    }

    setShares((prev) => prev.filter((s) => s.id !== share.id));
    void supabase.rpc('write_log', {
      p_action: 'share.revoke',
      p_target_user: share.shared_with_id,
      p_entity: 'shared_accounts',
      p_entity_id: share.id,
    });
    toast.success('تم إلغاء الوصول');
  }

  const pending = shares.filter((s) => s.status === 'pending');
  const accepted = shares.filter((s) => s.status === 'accepted');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Share2 className="size-4" />
          مشاركة حسابي
        </CardTitle>
        <CardDescription>
          أنشئ رمز دعوة وشاركه مع من تثق به ليتمكّن من متابعة ديونك ومصاريفك.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="permission">مستوى الصلاحية</Label>
            <Select
              value={permission}
              onValueChange={(v) => setPermission(v as SharePermission)}
            >
              <SelectTrigger id="permission">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">اطّلاع فقط</SelectItem>
                <SelectItem value="write">اطّلاع وتعديل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createInvite} loading={creating}>
            <Plus className="size-4" />
            إنشاء رمز دعوة
          </Button>
        </div>

        {pending.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium">رموز في انتظار الاستخدام</p>
            {pending.map((share) => (
              <div
                key={share.id}
                className="flex items-center gap-2 rounded-lg border border-dashed p-3"
              >
                <code className="flex-1 font-mono text-lg font-semibold tracking-[0.2em]">
                  {share.invite_code}
                </code>
                <Badge variant="soft">
                  {share.permission === 'write' ? 'تعديل' : 'اطّلاع'}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => copy(share.invite_code)}
                  aria-label="نسخ الرمز"
                >
                  {copied === share.invite_code ? (
                    <Check key="check" className="size-4 animate-scale-in text-success" />
                  ) : (
                    <Copy key="copy" className="size-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => revoke(share)}
                  aria-label="حذف الرمز"
                  className="text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-sm font-medium">لديهم وصول إلى حسابك</p>
          {accepted.length === 0 ? (
            <EmptyState
              icon={Users}
              title="لا أحد يشاركك الحساب"
              description="أنشئ رمز دعوة وشاركه لتبدأ."
              className="py-8"
            />
          ) : (
            <ul className="divide-y rounded-lg border">
              {accepted.map((share) => (
                <li key={share.id} className="flex items-center gap-3 p-3">
                  <Avatar className="size-9">
                    {share.shared_with?.avatar_url ? (
                      <AvatarImage
                        src={share.shared_with.avatar_url}
                        alt=""
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <AvatarFallback>
                      {initials(share.shared_with?.name, share.shared_with?.email)}
                    </AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {share.shared_with?.name || share.shared_with?.email || 'مستخدم'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      منذ {formatDate(share.accepted_at)}
                    </p>
                  </div>

                  <Badge variant="soft">
                    {share.permission === 'write' ? 'تعديل' : 'اطّلاع'}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => revoke(share)}
                    aria-label="إزالة الوصول"
                    className="text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function SharedWithMeCard({
  sharedWithMe,
  setSharedWithMe,
}: {
  sharedWithMe: SharedAccountView[];
  setSharedWithMe: React.Dispatch<React.SetStateAction<SharedAccountView[]>>;
}) {
  const [code, setCode] = React.useState('');
  const [joining, setJoining] = React.useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;

    setJoining(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error } = await supabase.rpc('accept_invite', { code: code.trim() });

    setJoining(false);

    if (error) {
      toast.error('تعذّر قبول الدعوة', { description: error.message });
      return;
    }

    setSharedWithMe((prev) => [data as SharedAccountView, ...prev]);
    setCode('');
    toast.success('تم قبول الدعوة');
  }

  async function leave(share: SharedAccountView) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from('shared_accounts').delete().eq('id', share.id);

    if (error) {
      toast.error('تعذّر إلغاء الوصول', { description: error.message });
      return;
    }

    setSharedWithMe((prev) => prev.filter((s) => s.id !== share.id));
    toast.success('تم إلغاء وصولك لهذا الحساب');
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="size-4" />
          حسابات مشاركة معي
        </CardTitle>
        <CardDescription>أدخل رمز دعوة للوصول إلى حساب شخص آخر.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <form onSubmit={join} className="flex gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="مثال: K7QP2XMA"
            maxLength={12}
            className="font-mono tracking-[0.2em]"
            aria-label="رمز الدعوة"
          />
          <Button type="submit" loading={joining} disabled={!code.trim()}>
            انضمام
          </Button>
        </form>

        {sharedWithMe.length === 0 ? (
          <EmptyState
            icon={Users}
            title="لا توجد حسابات مشاركة معك"
            description="اطلب رمز دعوة ممن يريد مشاركتك حسابه."
            className="py-8"
          />
        ) : (
          <ul className="divide-y rounded-lg border">
            {sharedWithMe.map((share) => (
              <li key={share.id} className="flex items-center gap-3 p-3">
                <Avatar className="size-9">
                  {share.owner?.avatar_url ? (
                    <AvatarImage src={share.owner.avatar_url} alt="" referrerPolicy="no-referrer" />
                  ) : null}
                  <AvatarFallback>
                    {initials(share.owner?.name, share.owner?.email)}
                  </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {share.owner?.name || share.owner?.email || 'مستخدم'}
                  </p>
                  <p className="text-xs text-muted-foreground">منذ {formatDate(share.accepted_at)}</p>
                </div>

                <Badge variant="soft">
                  {share.permission === 'write' ? 'تعديل' : 'اطّلاع'}
                </Badge>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => leave(share)}
                  aria-label="مغادرة"
                  className="text-destructive"
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
