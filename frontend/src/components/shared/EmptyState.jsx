import { Inbox } from 'lucide-react';

export function EmptyState({ icon: Icon = Inbox, title = "Ma'lumot yo'q", description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-stroke-strong bg-bg-elevation-1 px-6 py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-bg-elevation-2">
        <Icon className="h-7 w-7 text-icon-soft" />
      </div>
      <h3 className="text-sm font-semibold text-text-strong">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-text-sub">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
