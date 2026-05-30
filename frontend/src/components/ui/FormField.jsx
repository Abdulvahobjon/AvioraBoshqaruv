import { cn } from '@/lib/utils/cn';

/** Label + control wrapper with inline error text. */
export function FormField({ label, error, required, className, children, hint }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-sm font-medium text-text-sub">
          {label}
          {required && <span className="text-error-strong"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <span className="text-xs text-text-soft">{hint}</span>}
      {error && <span className="text-xs text-error-strong">{error}</span>}
    </div>
  );
}
