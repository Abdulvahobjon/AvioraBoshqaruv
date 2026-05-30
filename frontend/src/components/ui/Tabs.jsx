import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/cn';

/** Simple tab bar. tabs: [{ value, label, icon? }]. Controlled via value/onChange. */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex gap-1 border-b border-stroke-sub', className)}>
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors',
              active ? 'text-text-accent' : 'text-text-sub hover:text-text-strong',
            )}
          >
            {t.icon && <t.icon className="h-4 w-4" />}
            {t.label}
            {t.badge != null && (
              <span className="ml-1 rounded-full bg-bg-elevation-2 px-1.5 text-xs text-text-sub">{t.badge}</span>
            )}
            {active && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-strong"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
