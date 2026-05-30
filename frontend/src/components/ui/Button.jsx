import { cn } from '@/lib/utils/cn';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-accent-strong text-text-white hover:bg-accent-sub disabled:bg-accent-disabled disabled:text-text-disabled',
  secondary: 'bg-bg-2 text-text-strong hover:bg-bg-2-alt disabled:text-text-disabled',
  outline: 'border border-stroke-strong bg-transparent text-text-strong hover:bg-bg-1-alt',
  ghost: 'bg-transparent text-text-sub hover:bg-bg-1-alt hover:text-text-strong',
  danger: 'bg-error-strong text-text-white hover:bg-error-sub',
};

const SIZES = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
  icon: 'h-9 w-9 p-0',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none disabled:cursor-not-allowed',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
