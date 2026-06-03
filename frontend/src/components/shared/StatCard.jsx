import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';

export function StatCard({ icon: Icon, label, value, hint, tone = 'accent', loading = false, className, to }) {
  const iconTones = {
    accent: 'bg-accent-disabled text-accent-strong',
    success: 'bg-success-soft text-success-strong',
    warning: 'bg-warning-soft text-warning-strong',
    error: 'bg-error-soft text-error-strong',
    info: 'bg-accent-disabled text-accent-strong',
    neutral: 'bg-bg-2 text-text-sub',
    muted: 'bg-bg-1-alt text-text-soft',
  };

  if (loading) {
    return (
      <Card className={cn('p-5', className)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
            {hint !== undefined && <Skeleton className="h-3 w-20" />}
          </div>
          <Skeleton className="h-10 w-10 rounded-lg" />
        </div>
      </Card>
    );
  }

  const inner = (
    <Card className={cn('p-5', to && 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-elevated', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-text-sub">{label}</p>
          <p className="mt-1 truncate text-2xl font-semibold text-text-strong">{value}</p>
          {hint && <p className="mt-1 text-xs text-text-soft">{hint}</p>}
        </div>
        {Icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconTones[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );

  return to ? <Link to={to} className="block">{inner}</Link> : inner;
}
