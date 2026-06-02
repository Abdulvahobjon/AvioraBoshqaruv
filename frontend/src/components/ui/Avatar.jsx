import { cn } from '@/lib/utils/cn';
import { initials, avatarColor } from '@/lib/utils/format';

const SIZES = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' };

export function Avatar({ name = '', src, size = 'md', className, zoomable }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        data-zoomable={zoomable || undefined}
        className={cn('rounded-full object-cover', SIZES[size], zoomable && 'cursor-zoom-in', className)}
      />
    );
  }
  return (
    <div
      className={cn('flex items-center justify-center rounded-full font-semibold text-text-white', SIZES[size], className)}
      style={{ backgroundColor: avatarColor(name) }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
