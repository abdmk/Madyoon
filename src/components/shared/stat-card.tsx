import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatTone = 'primary' | 'accent' | 'success' | 'warning' | 'destructive' | 'muted';

const TONES: Record<StatTone, string> = {
  primary: 'bg-primary/10 text-primary',
  accent: 'bg-accent/10 text-accent',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  destructive: 'bg-destructive/10 text-destructive',
  muted: 'bg-muted text-muted-foreground',
};

/**
 * A KPI tile. The number is the loudest thing on it — the label sits above in
 * small caps-ish muted text, the icon is a quiet marker, never the focal point.
 */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'primary',
  emphasis = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: StatTone;
  /** Raises the number a step, for the one figure that matters most. */
  emphasis?: boolean;
  className?: string;
}) {
  return (
    // min-w-0: without it, a CSS grid item defaults to its content's
    // min-content width — a long formatted amount could force this card
    // (and the whole grid track it sits in) wider than the viewport on a
    // narrow phone, pushing content off-screen instead of letting `truncate`
    // do its job.
    <Card className={cn('hover-lift min-w-0 p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-muted-foreground">{label}</p>
          <p
            className={cn(
              'mt-2 truncate font-display font-semibold tabular tracking-tight',
              emphasis ? 'text-[26px] sm:text-3xl' : 'text-xl sm:text-2xl',
            )}
          >
            {value}
          </p>
          {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-lg',
              TONES[tone],
            )}
            aria-hidden
          >
            <Icon className="size-[18px]" />
          </span>
        ) : null}
      </div>
    </Card>
  );
}
