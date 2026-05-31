import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** Password input with a show/hide eye toggle. Forwards ref for react-hook-form register. */
export const PasswordInput = forwardRef(function PasswordInput({ className, error, ...props }, ref) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        ref={ref}
        type={show ? 'text' : 'password'}
        className={cn(
          'h-10 w-full rounded-md border bg-bg-base px-3 pr-10 text-sm text-text-strong',
          'placeholder:text-text-soft transition-colors',
          'focus:border-stroke-accent focus-visible:outline-none',
          error ? 'border-error-strong' : 'border-stroke-strong',
          className,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        tabIndex={-1}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-icon-soft hover:text-icon-strong"
        aria-label={show ? 'Yashirish' : "Ko'rsatish"}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
});
