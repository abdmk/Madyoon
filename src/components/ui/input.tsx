import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs',
        'transition-[border-color,box-shadow] duration-fast ease-out',
        'placeholder:text-muted-foreground',
        'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0',
        'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
        // A field in error state says so before the message is read.
        'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/25',
        // Numeric and date fields read left-to-right even inside an RTL page.
        // `isolate` stops WebKit's known bug where a `direction: ltr` field
        // inside an RTL ancestor scrambles the day/month/year order of a
        // native date input (shows as e.g. "042026/09/" instead of a date).
        (type === 'number' || type === 'date') &&
          'text-left tabular [direction:ltr] [unicode-bidi:isolate]',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'flex min-h-20 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs',
      'transition-[border-color,box-shadow] duration-fast ease-out',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-0',
      'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
      'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/25',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export { Input, Textarea };
