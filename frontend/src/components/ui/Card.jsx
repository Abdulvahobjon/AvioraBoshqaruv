import { cn } from '@/lib/utils/cn';

export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn('rounded-lg border border-stroke-sub bg-bg-elevation-1 shadow-card', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ className, children }) {
  return <div className={cn('px-5 pt-5 pb-3', className)}>{children}</div>;
}

export function CardTitle({ className, children }) {
  return <h3 className={cn('text-base font-semibold text-text-strong', className)}>{children}</h3>;
}

export function CardContent({ className, children }) {
  return <div className={cn('px-5 pb-5', className)}>{children}</div>;
}
