import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="size-7" />
      </span>
      <div>
        <h1 className="font-display text-3xl font-semibold">٤٠٤</h1>
        <p className="mt-1 text-sm text-muted-foreground">الصفحة التي تبحث عنها غير موجودة.</p>
      </div>
      <Button asChild>
        <Link href="/dashboard">العودة إلى الرئيسية</Link>
      </Button>
    </div>
  );
}
