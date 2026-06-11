import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
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
      <Card className={cn('h-full p-5', className)}>
        <Skeleton className="h-10 w-10 rounded-lg" />
        <Skeleton className="mt-4 h-4 w-24" />
        <Skeleton className="mt-2 h-7 w-32" />
        {hint !== undefined && <Skeleton className="mt-2 h-3 w-20" />}
      </Card>
    );
  }

  const inner = (
    <Card
      className={cn(
        'group relative h-full p-5',
        to && 'cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-stroke-accent hover:shadow-elevated',
        className,
      )}
    >
      {/* Yuqori qator: ikonka chiqib turadi; bosiladigan kartada o'ng burchakda strelka (hoverda jonlanadi). */}
      <div className="flex items-start justify-between">
        {Icon && (
          <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', iconTones[tone])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        {to && (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-icon-soft opacity-0 transition-all duration-200 group-hover:text-accent-strong group-hover:opacity-100" />
        )}
      </div>

      <p className="mt-4 text-sm text-text-sub">{label}</p>
      <p className="mt-0.5 truncate text-2xl font-semibold text-text-strong">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-soft">{hint}</p>}
    </Card>
  );

  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}
