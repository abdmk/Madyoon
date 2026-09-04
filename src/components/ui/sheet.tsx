'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Sheets, built on the same Radix dialog as `Dialog` — so focus trapping,
 * Escape-to-close, scroll locking and `aria-modal` behave identically.
 *
 * The variant that matters here is `responsive`: a bottom sheet on a phone
 * (thumb-reachable, sized to its content, safe-area aware) that becomes a
 * centred modal from `sm` up. Forms use it so one component covers both,
 * instead of a desktop dialog being shrunk onto a phone.
 */
const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-foreground/25 backdrop-blur-[2px]',
      'data-[state=open]:animate-in data-[state=closed]:animate-out',
      'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva(
  cn(
    'fixed z-50 flex flex-col gap-4 bg-card shadow-lg',
    'data-[state=open]:animate-in data-[state=closed]:animate-out',
    'data-[state=open]:duration-300 data-[state=closed]:duration-200',
    'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
  ),
  {
    variants: {
      side: {
        bottom: cn(
          'inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t p-5',
          'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        ),
        end: cn(
          'inset-y-0 end-0 w-full max-w-md overflow-y-auto border-s p-5',
          'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
        ),
        /* Bottom sheet on a phone, centred modal on a real screen. */
        responsive: cn(
          'inset-x-0 bottom-0 max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t p-5',
          'pb-[max(1.25rem,env(safe-area-inset-bottom))]',
          'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          'sm:inset-x-auto sm:bottom-auto sm:start-1/2 sm:top-1/2 sm:w-full sm:max-w-lg',
          'sm:translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:border sm:p-6',
          'sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0',
          'sm:data-[state=closed]:zoom-out-[0.97] sm:data-[state=open]:zoom-in-[0.94]',
        ),
      },
    },
    defaultVariants: { side: 'responsive' },
  },
);

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Hides the built-in close button when the footer already provides one. */
  hideClose?: boolean;
}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ className, children, side = 'responsive', hideClose, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      style={{ '--tw-enter-timing': 'cubic-bezier(0.32, 0.72, 0, 1)' } as React.CSSProperties}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {side !== 'end' ? (
        /* Grab affordance — the thing that says "this drags down", even
           though dismissal is a tap on the overlay or Escape. */
        <span
          aria-hidden
          className="mx-auto -mt-1 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden"
        />
      ) : null}

      {children}

      {!hideClose ? (
        <DialogPrimitive.Close
          className={cn(
            'absolute end-4 top-4 rounded-lg p-1.5 text-muted-foreground transition-all duration-fast',
            'hover:bg-secondary hover:text-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <X className="size-4" />
          <span className="sr-only">إغلاق</span>
        </DialogPrimitive.Close>
      ) : null}
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col space-y-1.5 text-start', className)} {...props} />;
}

function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-start', className)}
      {...props}
    />
  );
}

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('font-display text-lg font-semibold leading-none tracking-tight', className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
