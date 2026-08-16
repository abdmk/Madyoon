'use client';

import * as React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <AlertTriangle className="size-7" />
      </span>
      <div>
        <h2 className="font-display text-xl font-semibold">حدث خطأ غير متوقع</h2>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">
          تعذّر عرض هذه الصفحة. حاول مرة أخرى، وإذا تكرر الخطأ أعد تحميل التطبيق.
        </p>
        {error.digest ? (
          <p className="mt-2 font-mono text-xs text-muted-foreground">#{error.digest}</p>
        ) : null}
      </div>
      <Button onClick={reset}>
        <RotateCcw className="size-4" />
        إعادة المحاولة
      </Button>
    </div>
  );
}
