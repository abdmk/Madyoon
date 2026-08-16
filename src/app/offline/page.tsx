import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = { title: 'غير متصل' };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <WifiOff className="size-7" />
      </span>
      <div>
        <h1 className="font-display text-xl font-semibold">لا يوجد اتصال بالإنترنت</h1>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {APP_NAME} يحتاج اتصالاً لعرض بياناتك المحدّثة. أعد المحاولة بعد عودة الاتصال.
        </p>
      </div>
    </main>
  );
}
