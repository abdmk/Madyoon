import * as React from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="font-display text-[22px] font-semibold tracking-tight sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children ? (
        <div className="flex shrink-0 items-center gap-2 no-print">{children}</div>
      ) : null}
    </div>
  );
}
