import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Every empty region in the app uses this: an icon, a sentence that says what
 * would normally be here, and — when there is one — the action that fills it.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex animate-fade-in flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card/40 px-6 py-16 text-center',
        className,
      )}
    >
      <span
        className="flex size-12 animate-scale-in items-center justify-center rounded-xl bg-muted text-muted-foreground"
        aria-hidden
      >
        <Icon className="size-6" />
      </span>

      <div className="space-y-1.5">
        <p className="font-display text-base font-semibold">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {action || secondaryAction ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}
