import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A metadata chip: one fact, a soft state surface, an optional leading icon.
 *
 * Deliberately *not* a button and not a general-purpose container — a pill
 * labels a value (a date, a status, a currency, a payment method). Anything
 * clickable is a Button; anything that holds content is a Card. Keeping that
 * boundary is what stops a pill-shaped UI from becoming pill soup.
 */
const pillVariants = cva(
  'inline-flex max-w-full items-center gap-1.5 rounded-full font-medium leading-none',
  {
    variants: {
      tone: {
        neutral: 'bg-soft-neutral text-soft-neutral-foreground',
        primary: 'bg-soft-primary text-soft-primary-foreground',
        success: 'bg-soft-success text-soft-success-foreground',
        warning: 'bg-soft-warning text-soft-warning-foreground',
        danger: 'bg-soft-danger text-soft-danger-foreground',
        accent: 'bg-soft-accent text-soft-accent-foreground',
        info: 'bg-soft-info text-soft-info-foreground',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-1 text-[13px]',
        lg: 'px-3 py-1.5 text-sm',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'sm' },
  },
);

const ICON_SIZE = { sm: 'size-3', md: 'size-3.5', lg: 'size-4' } as const;

export interface PillProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof pillVariants> {
  icon?: LucideIcon;
  /**
   * Rendered for screen readers only. Use it when the icon carries the
   * meaning that colour alone would otherwise have to convey.
   */
  srLabel?: string;
}

export function Pill({
  className,
  tone,
  size = 'sm',
  icon: Icon,
  srLabel,
  children,
  ...props
}: PillProps) {
  return (
    <span className={cn(pillVariants({ tone, size }), className)} {...props}>
      {Icon ? <Icon className={cn('shrink-0', ICON_SIZE[size ?? 'sm'])} aria-hidden /> : null}
      {srLabel ? <span className="sr-only">{srLabel}</span> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

export { pillVariants };
