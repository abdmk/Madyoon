import type { Metadata } from 'next';
import { LoginCard } from '@/components/auth/login-card';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

export const metadata: Metadata = { title: 'تسجيل الدخول' };

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; error?: string };
}) {
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden p-4">
      {/* Ambient background — purely decorative. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60rem_40rem_at_70%_-10%,hsl(var(--primary)/0.18),transparent),radial-gradient(50rem_35rem_at_10%_110%,hsl(var(--accent)/0.16),transparent)]"
      />

      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary text-2xl text-primary-foreground shadow-lg shadow-primary/25">
            ₪
          </div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{APP_NAME}</h1>
          <p className="mt-1.5 text-muted-foreground">{APP_TAGLINE}</p>
        </div>

        <LoginCard next={searchParams.next} error={searchParams.error} />

        <p className="mt-6 text-center text-xs text-muted-foreground">
          بتسجيل الدخول أنت توافق على أن بياناتك محفوظة بشكل خاص ولا تُشارك إلا بموافقتك.
        </p>
      </div>
    </main>
  );
}
