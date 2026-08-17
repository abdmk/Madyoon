import type { Metadata } from 'next';
import { LandingView } from '@/components/marketing/landing-view';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

// A signed-in visitor never reaches this file — the middleware redirects
// `/` straight to `/dashboard` before Next.js renders anything. That means
// this route needs no auth check and no Supabase call of its own: it is a
// static marketing page, so it stays fast for the anonymous visitors it's
// actually built for.
export const metadata: Metadata = {
  title: `${APP_NAME} — ${APP_TAGLINE}`,
  description:
    'مديون يساعدك على إدارة ديونك ومصاريفك في مكان واحد: تابع من عليك له، سجّل الدفعات، وتابع وضعك المالي بنظرة واحدة.',
  openGraph: {
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: 'رتّب ديونك، واعرف أين يذهب مالك. إدارة ديون ومصاريف بسيطة واحترافية.',
    type: 'website',
    locale: 'ar',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${APP_NAME} — ${APP_TAGLINE}`,
    description: 'رتّب ديونك، واعرف أين يذهب مالك.',
  },
};

export default function LandingPage() {
  return <LandingView />;
}
