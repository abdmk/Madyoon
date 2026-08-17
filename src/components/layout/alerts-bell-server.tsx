import { Suspense } from 'react';
import { Bell } from 'lucide-react';
import { DueAlertsBell } from './due-alerts-bell';
import type { DueAlerts } from '@/lib/types';

/** Awaits the alerts promise and renders the real bell — the Suspense boundary
 * around it lets the page's own data fetch start immediately instead of
 * waiting on this round trip first. */
async function AlertsBellContent({ promise }: { promise: Promise<DueAlerts> }) {
  const alerts = await promise;
  return <DueAlertsBell alerts={alerts} />;
}

function BellFallback() {
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-md text-muted-foreground/40">
      <Bell className="size-[18px]" />
    </span>
  );
}

export function AlertsBellServer({ promise }: { promise: Promise<DueAlerts> }) {
  return (
    <Suspense fallback={<BellFallback />}>
      <AlertsBellContent promise={promise} />
    </Suspense>
  );
}
