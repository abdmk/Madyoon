'use client';

import * as React from 'react';
import { AlertCircle, BarChart3, Bot, CheckCircle2, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/misc';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const HIGHLIGHTS = [
  { icon: BarChart3, text: 'تتبّع ديونك ومصاريفك في مكان واحد' },
  { icon: Bot, text: 'مساعد ذكي يبني لك خطة سداد' },
  { icon: Users, text: 'شارك حسابك مع من تثق به' },
  { icon: ShieldCheck, text: 'بياناتك محمية بصلاحيات على مستوى الصف' },
];

const ERRORS: Record<string, string> = {
  oauth: 'تعذّر إكمال تسجيل الدخول عبر Google. حاول مرة أخرى أو استخدم البريد الإلكتروني.',
  session: 'انتهت الجلسة. يرجى تسجيل الدخول من جديد.',
};

export function LoginCard({ next, error }: { next?: string; error?: string }) {
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(
    error ? (ERRORS[error] ?? 'حدث خطأ غير متوقع.') : null,
  );

  async function signInWithGoogle() {
    setGoogleLoading(true);
    setMessage(null);
    const supabase = getSupabaseBrowserClient();

    const callback = new URL('/auth/callback', window.location.origin);
    if (next) callback.searchParams.set('next', next);

    const { error: signInError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callback.toString(),
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (signInError) {
      setMessage('تعذّر بدء تسجيل الدخول عبر Google. استخدم البريد الإلكتروني بالأسفل.');
      setGoogleLoading(false);
    }
    // On success the browser navigates away, so keep the spinner running.
  }

  return (
    <Card className="border-border/70 shadow-xl shadow-black/5">
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-1.5 text-center">
          <h2 className="font-display text-xl font-semibold">مرحباً بك</h2>
          <p className="text-sm text-muted-foreground">سجّل الدخول للمتابعة</p>
        </div>

        {message ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{message}</span>
          </div>
        ) : null}

        <Button
          size="lg"
          variant="outline"
          className="w-full"
          loading={googleLoading}
          onClick={signInWithGoogle}
        >
          {!googleLoading ? <GoogleIcon /> : null}
          المتابعة عبر Google
        </Button>

        <div className="flex items-center gap-3">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">أو بالبريد الإلكتروني</span>
          <Separator className="flex-1" />
        </div>

        <EmailPasswordForm next={next} onError={setMessage} />

        <ul className="space-y-3 border-t pt-6">
          {HIGHLIGHTS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="size-4" />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function EmailPasswordForm({
  next,
  onError,
}: {
  next?: string;
  onError: (message: string | null) => void;
}) {
  const [mode, setMode] = React.useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [confirmSent, setConfirmSent] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    setConfirmSent(false);

    if (!email.trim() || password.length < 6) {
      onError('أدخل بريداً صحيحاً وكلمة مرور من ٦ أحرف على الأقل.');
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      setLoading(false);

      if (error) {
        onError(
          error.message.includes('Invalid login credentials')
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.'
            : 'تعذّر تسجيل الدخول. حاول مرة أخرى.',
        );
        return;
      }

      window.location.href = next && next.startsWith('/') ? next : '/dashboard';
      return;
    }

    // Sign-up
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);

    if (error) {
      onError(
        error.message.includes('already registered')
          ? 'هذا البريد مسجّل مسبقاً. سجّل الدخول بدلاً من ذلك.'
          : 'تعذّر إنشاء الحساب. حاول مرة أخرى.',
      );
      return;
    }

    // If email confirmation is off, Supabase returns an active session right away.
    if (data.session) {
      window.location.href = next && next.startsWith('/') ? next : '/dashboard';
      return;
    }

    setConfirmSent(true);
  }

  if (confirmSent) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-success/25 bg-success/10 p-3 text-sm text-success">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <span>أرسلنا رابط تأكيد إلى بريدك. افتحه لتفعيل الحساب ثم سجّل الدخول.</span>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="email">البريد الإلكتروني</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          dir="ltr"
          className="text-start"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">كلمة المرور</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          dir="ltr"
          className="text-start"
          minLength={6}
          required
        />
      </div>

      <Button type="submit" className="w-full" loading={loading}>
        {mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب'}
      </Button>

      <button
        type="button"
        onClick={() => {
          setMode((m) => (m === 'signin' ? 'signup' : 'signin'));
          onError(null);
        }}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
      >
        {mode === 'signin' ? 'ليس لديك حساب؟ أنشئ واحداً' : 'لديك حساب؟ سجّل الدخول'}
      </button>
    </form>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.76c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5a11 11 0 0 0-9.82 6.05l3.66 2.84c.87-2.6 3.3-4.64 6.16-4.64Z"
      />
    </svg>
  );
}
