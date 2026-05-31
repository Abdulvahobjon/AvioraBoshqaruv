import { cn } from '@/lib/utils/cn';

/** Format an integer-ish value with space thousand separators. */
function format(value) {
  if (value === '' || value === null || value === undefined) return '';
  const digits = String(value).replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Controlled money input: displays thousand separators ("884 843 898 493"),
 * calls onChange with the raw numeric value (number).
 */
export function MoneyInput({ value, onChange, className, error, ...props }) {
  return (
    <input
      inputMode="numeric"
      value={format(value)}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        onChange?.(digits === '' ? '' : Number(digits));
      }}
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
}
