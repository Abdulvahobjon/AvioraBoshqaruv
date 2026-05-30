import { cn } from '@/lib/utils/cn';
import { TONE_CLASSES } from '@/lib/constants';

export function Badge({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_CLASSES[tone] || TONE_CLASSES.neutral,
        className,
      )}
    >
      {children}
    </span>
  );
}
