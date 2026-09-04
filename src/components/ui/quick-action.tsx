import * as React from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  primary: 'bg-soft-primary text-soft-primary-foreground',
  success: 'bg-soft-success text-soft-success-foreground',
  warning: 'bg-soft-warning text-soft-warning-foreground',
  danger: 'bg-soft-danger text-soft-danger-foreground',
  accent: 'bg-soft-accent text-soft-accent-foreground',
  info: 'bg-soft-info text-soft-info-foreground',
} as const;

type QuickActionTone = keyof typeof TONES;

interface BaseProps {
  label: string;
  icon: LucideIcon;
  tone?: QuickActionTone;
  hint?: string;
  className?: string;
}

/**
 * One of the four things a person opens this app to do. Big icon, short
 * label, whole tile is the hit target — on a phone the tile is the thumb
 * target, not the icon inside it.
 *
 * Renders a real `<button>` or `<a>` (never a div with onClick), so keyboard
 * activation, focus rings and screen-reader semantics come for free.
 */
function QuickActionShell({
  label,
  icon: Icon,
  tone = 'primary',
  hint,
}: Pick<BaseProps, 'label' | 'icon' | 'tone' | 'hint'>) {
  return (
    <>
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-2xl transition-transform',
          'duration-fast ease-out group-hover:scale-105 group-active:scale-95 sm:size-12',
          TONES[tone],
        )}
        aria-hidden
      >
        <Icon className="size-5 sm:size-[22px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium sm:text-sm">{label}</span>
        {hint ? (
          <span className="block truncate text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </span>
    </>
  );
}

const SHELL = cn(
  'group flex min-h-[76px] w-full min-w-0 flex-col items-start gap-2.5 rounded-xl border bg-card p-3',
  'text-start shadow-xs transition-all duration-fast ease-out',
  'hover:-translate-y-0.5 hover:shadow-md',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
  'sm:p-4',
);

export function QuickActionLink({ href, ...props }: BaseProps & { href: string }) {
  return (
    <Link href={href} className={cn(SHELL, props.className)}>
      <QuickActionShell {...props} />
    </Link>
  );
}
