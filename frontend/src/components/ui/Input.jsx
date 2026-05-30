import { forwardRef } from 'react';
import { cn } from '@/lib/utils/cn';

export const Input = forwardRef(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border bg-bg-base px-3 text-sm text-text-strong',
        'placeholder:text-text-soft transition-colors',
        'focus:border-stroke-accent focus-visible:outline-none',
        error ? 'border-error-strong' : 'border-stroke-strong',
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[88px] w-full rounded-md border bg-bg-base px-3 py-2 text-sm text-text-strong',
        'placeholder:text-text-soft transition-colors resize-y',
        'focus:border-stroke-accent focus-visible:outline-none',
        error ? 'border-error-strong' : 'border-stroke-strong',
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef(function Select({ className, error, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border bg-bg-base px-3 text-sm text-text-strong',
        'transition-colors focus:border-stroke-accent focus-visible:outline-none',
        error ? 'border-error-strong' : 'border-stroke-strong',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
});
