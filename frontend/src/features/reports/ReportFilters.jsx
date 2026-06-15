import { useEffect, useRef, useState } from 'react';
import { ChevronDown, X, Check, Users as UsersIcon } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { Input } from '@/components/ui/Input';
import { MoneyInput } from '@/components/ui/MoneyInput';
import { AntDate } from '@/components/ui/AntDate';
import { ParticipantPicker } from '@/features/meetings/ParticipantPicker';

/** "dan / gacha" sana+vaqt oralig'i — dan=00:00, gacha=23:59 (boshlang'ich vaqt). */
export function DateRange({ from, to, onFrom, onTo, fromPlaceholder = 'dan', toPlaceholder = 'gacha' }) {
  return (
    <div className="flex gap-2">
      <AntDate value={from} onChange={onFrom} placeholder={fromPlaceholder} showTime />
      <AntDate value={to} onChange={onTo} placeholder={toPlaceholder} showTime defaultTime="23:59" />
    </div>
  );
}

/** Tashqariga bosilganda yopish. */
function useOutside(ref, onClose) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [ref, onClose]);
}

/** Yorliq + boshqaruv. */
export function FilterField({ label, className, children }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      {label && <label className="text-sm font-medium text-text-sub">{label}</label>}
      {children}
    </div>
  );
}

const triggerCls =
  'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-stroke-strong bg-bg-base px-3 text-sm transition-colors hover:border-stroke-accent focus:outline-none';

/** Bitta tanlovli (popover) — tozalash × bilan. */
export function FilterSelect({ value, onChange, options = [], placeholder = 'Tanlang' }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useOutside(ref, () => setOpen(false));
  const sel = options.find((o) => String(o.value) === String(value));

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={triggerCls}>
        <span className={cn('flex items-center gap-2 truncate', sel ? 'text-text-strong' : 'text-text-soft')}>
          {sel?.dot && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: sel.dot }} />}
          {sel ? sel.label : placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1">
          {sel && (
            <X className="h-4 w-4 text-icon-soft hover:text-error-strong" onClick={(e) => { e.stopPropagation(); onChange(''); }} />
          )}
          <ChevronDown className={cn('h-4 w-4 text-icon-soft transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-stroke-sub bg-bg-base py-1 shadow-elevated">
          {options.map((o) => {
            const active = String(o.value) === String(value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={cn('flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-1-alt', active && 'bg-bg-1-alt font-medium')}
              >
                <span className="flex items-center gap-2 truncate text-text-strong">
                  {o.dot && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.dot }} />}
                  {o.label}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-accent-strong" />}
              </button>
            );
          })}
          {options.length === 0 && <p className="px-3 py-2 text-sm text-text-soft">Variant yo'q</p>}
        </div>
      )}
    </div>
  );
}

/** Ko'p tanlovli (popover) — tanlovlar soni rozetkasi bilan. */
export function FilterMultiSelect({ value = [], onChange, options = [], placeholder = 'Tanlang' }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  useOutside(ref, () => setOpen(false));
  const toggle = (v) => {
    const has = value.some((x) => String(x) === String(v));
    onChange(has ? value.filter((x) => String(x) !== String(v)) : [...value, v]);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={triggerCls}>
        <span className={cn('truncate', value.length ? 'text-text-strong' : 'text-text-soft')}>{placeholder}</span>
        <span className="flex shrink-0 items-center gap-1.5">
          {value.length > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-disabled px-1.5 text-xs font-semibold text-accent-strong">{value.length}</span>
          )}
          <ChevronDown className={cn('h-4 w-4 text-icon-soft transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full min-w-[220px] overflow-y-auto rounded-lg border border-stroke-sub bg-bg-base py-1 shadow-elevated">
          {options.map((o) => {
            const active = value.some((x) => String(x) === String(o.value));
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className={cn('flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-bg-1-alt', active && 'bg-bg-1-alt')}
              >
                <span className="flex items-center gap-2 truncate text-text-strong">
                  {o.dot && <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: o.dot }} />}
                  {o.label}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-accent-strong" />}
              </button>
            );
          })}
          {options.length === 0 && <p className="px-3 py-2 text-sm text-text-soft">Variant yo'q</p>}
        </div>
      )}
    </div>
  );
}

/** "dan / gacha" son oralig'i. */
export function NumberRange({ from, to, onFrom, onTo, fromPlaceholder = 'dan', toPlaceholder = 'gacha' }) {
  return (
    <div className="flex gap-2">
      <Input type="number" inputMode="numeric" placeholder={fromPlaceholder} value={from} onChange={(e) => onFrom(e.target.value)} />
      <Input type="number" inputMode="numeric" placeholder={toPlaceholder} value={to} onChange={(e) => onTo(e.target.value)} />
    </div>
  );
}

/** "dan / gacha" pul oralig'i — mingliklar ajratiladi (2 000 000). */
export function MoneyRange({ from, to, onFrom, onTo, fromPlaceholder = 'dan', toPlaceholder = 'gacha' }) {
  return (
    <div className="flex gap-2">
      <MoneyInput placeholder={fromPlaceholder} value={from} onChange={onFrom} />
      <MoneyInput placeholder={toPlaceholder} value={to} onChange={onTo} />
    </div>
  );
}

/**
 * Status select (rangli nuqta bilan) + "dan/gacha" oralig'i — bir qatorda.
 * money=true bo'lsa oraliq pul formatida (UZS), aks holda oddiy son (sanoq).
 */
export function StatusRange({ statusValue, onStatus, statusOptions, statusPlaceholder = 'Jami', from, to, onFrom, onTo, money = false }) {
  const RangeC = money ? MoneyRange : NumberRange;
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
      <FilterSelect value={statusValue} onChange={onStatus} options={statusOptions} placeholder={statusPlaceholder} />
      <div className="w-full sm:w-[14rem]">
        <RangeC from={from} to={to} onFrom={onFrom} onTo={onTo} />
      </div>
    </div>
  );
}

/** Foydalanuvchi tanlash — ParticipantPicker modalini ochadi. */
export function UserPickerField({ value = [], onChange, users = [], placeholder = 'Tanlang', title = 'Tanlang' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(triggerCls, value.length && 'border-stroke-accent')}
      >
        <span className={cn('flex items-center gap-2 truncate', value.length ? 'text-text-strong' : 'text-text-soft')}>
          <UsersIcon className="h-4 w-4 shrink-0 text-icon-soft" />
          {value.length ? `${value.length} ta tanlandi` : placeholder}
        </span>
        {value.length > 0 && (
          <X className="h-4 w-4 shrink-0 text-icon-soft hover:text-error-strong" onClick={(e) => { e.stopPropagation(); onChange([]); }} />
        )}
      </button>
      <ParticipantPicker
        open={open}
        onClose={() => setOpen(false)}
        users={users}
        value={value}
        onConfirm={onChange}
        title={title}
      />
    </>
  );
}
