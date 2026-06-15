import { ROLE_LABELS } from '@/lib/constants';
import { cn } from '@/lib/utils/cn';

// Qo'shimcha rol sifatida beriladigan rollar (superadmin alohida — bu yerda yo'q).
const ASSIGNABLE = ['admin', 'manager', 'accountant', 'auditor', 'employee'];

/**
 * Qo'shimcha rollar tanlovi (faqat superadmin ko'radi). Asosiy rol ('primaryRole')
 * variantlardan chiqariladi. value — tanlangan qo'shimcha rollar massivi.
 */
export function AdditionalRolesField({ value = [], onChange, primaryRole }) {
  const opts = ASSIGNABLE.filter((r) => r !== primaryRole);
  const toggle = (r) => onChange(value.includes(r) ? value.filter((x) => x !== r) : [...value, r]);
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map((r) => {
        const on = value.includes(r);
        return (
          <button
            key={r}
            type="button"
            onClick={() => toggle(r)}
            className={cn(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              on ? 'border-stroke-accent bg-bg-1 text-text-accent' : 'border-stroke-sub text-text-sub hover:bg-bg-1-alt',
            )}
          >
            {ROLE_LABELS[r]}
          </button>
        );
      })}
    </div>
  );
}
