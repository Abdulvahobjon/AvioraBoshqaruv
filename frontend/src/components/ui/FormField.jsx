import { useId, cloneElement, isValidElement } from 'react';
import { cn } from '@/lib/utils/cn';

/** Label + control wrapper with inline error text. Label is wired to the control via htmlFor/id. */
export function FormField({ label, error, required, className, children, hint }) {
  const id = useId();
  // Yagona element bo'lsa, unga id biriktiramiz va label htmlFor bilan bog'laymiz (a11y).
  const linkable = isValidElement(children) && !children.props.id;
  const control = linkable ? cloneElement(children, { id }) : children;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={linkable ? id : undefined} className="text-sm font-medium text-text-sub">
          {label}
          {required && <span className="text-error-strong"> *</span>}
        </label>
      )}
      {control}
      {hint && !error && <span className="text-xs text-text-soft">{hint}</span>}
      {error && <span className="text-xs text-error-strong">{error}</span>}
    </div>
  );
}
