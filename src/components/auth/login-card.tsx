'use client';

import * as React from 'react';
import { AlertCircle, BarChart3, Bot, ShieldCheck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

const HIGHLIGHTS = [
  { icon: BarChart3, text: 'تتبّع ديونك ومصاريفك في مكان واحد' },
  { icon: Bot, text: 'مساعد ذكي يبني لك خطة سداد' },
  { icon: Users, text: 'شارك حسابك مع من تثق به' },
  { icon: ShieldCheck, text: 'بياناتك محمية بصلاحيات على مستوى الصف' },
];

const ERRORS: Record<string, string> = {
  oauth: 'تعذّر إكمال تسجيل الدخول عبر Google. حاول مرة أخرى.',
  session: 'انتهت الجلسة. يرجى تسجيل الدخول من جديد.',
};

export function LoginCard({ next, error }: { next?: string; error?: string }) {
  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(
    error ? (ERRORS[error] ?? 'حدث خطأ غير متوقع.') : null,
  );

  async function signInWithGoogle() {
    setLoading(true);
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
      setMessage('تعذّر بدء تسجيل الدخول. تأكد من تفعيل Google في إعدادات Supabase.');
      setLoading(false);
    }
    // On success the browser navigates away, so keep the spinner running.
  }

  return (
    <Card className="border-border/70 shadow-xl shadow-black/5">
      <CardContent className="space-y-6 p-6 sm:p-8">
        <div className="space-y-1.5 text-center">
          <h2 className="font-display text-xl font-semibold">مرحباً بك</h2>
          <p className="text-sm text-muted-foreground">سجّل الدخول بحساب Google للمتابعة</p>
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

        <Button size="lg" className="w-full" loading={loading} onClick={signInWithGoogle}>
          {!loading ? <GoogleIcon /> : null}
          المتابعة عبر Google
        </Button>

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
