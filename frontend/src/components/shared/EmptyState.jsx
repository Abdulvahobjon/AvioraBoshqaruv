import { Inbox } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export function EmptyState({ icon: Icon = Inbox, title = "Ma'lumot yo'q", description, action, fill = false, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-stroke-strong bg-bg-1 px-6 py-14 text-center',
        // `fill` — bo'sh holat butun mavjud balandlikni egallaydi (ro'yxat/sahifa darajasida).
        fill && 'min-h-[70vh] w-full flex-1',
        className,
      )}
    >
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-2">
        <Icon className="h-7 w-7 text-icon-soft" />
      </div>
      <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-text-sub">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
