import { forwardRef, useState, useRef, useEffect, Children, isValidElement } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export const Input = forwardRef(function Input({ className, error, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border bg-bg-base px-3 text-sm text-text-strong',
        'placeholder:text-text-soft transition-colors',
        'focus:border-stroke-accent focus-visible:outline-none',
        error ? 'border-error-strong' : 'border-stroke-strong',
        className,
      )}
      {...props}
    />
  );
});

export const Textarea = forwardRef(function Textarea({ className, error, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        'min-h-[88px] w-full rounded-md border bg-bg-base px-3 py-2 text-sm text-text-strong',
        'placeholder:text-text-soft transition-colors resize-y',
        'focus:border-stroke-accent focus-visible:outline-none',
        error ? 'border-error-strong' : 'border-stroke-strong',
        className,
      )}
      {...props}
    />
  );
});

/**
 * Maxsus, to'liq bezatilgan dropdown — native <select> bilan BIR XIL API
 * (`<option>` bolalar, `value`, `onChange(e => e.target.value)`, `className`, `disabled`, `error`).
 * Native option ro'yxati CSS bilan bezalmagani uchun (brauzer chizadi), bu komponent
 * butun ilova bo'ylab izchil, chiroyli dropdown beradi. Body'ga portal qilinadi (modal ichida ham
 * kesilmaydi); Dialog faqat backdrop/Escape'da yopilgani uchun tashqi bosish bilan modal yopilmaydi.
 */
export const Select = forwardRef(function Select(
  { className, error, children, value, onChange, disabled, placeholder, multiple, summary, ...props },
  _ref,
) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1); // klaviatura uchun belgilangan element
  const [pos, setPos] = useState({ left: 0, top: 0, bottomAnchor: 0, width: 0, openUp: false });
  const btnRef = useRef(null);
  const popRef = useRef(null);

  // <option> bolalarni { value, label, disabled } ga aylantiramiz
  const options = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) return;
    const v = child.props.value !== undefined ? child.props.value : child.props.children;
    options.push({ value: v, label: child.props.children, disabled: !!child.props.disabled });
  });

  const sameVal = (a, b) => String(a ?? '') === String(b ?? '');
  // Ko'p tanlov (multiple): value massiv; bitta tanlovda — odatdagidek.
  const selectedArr = multiple ? (Array.isArray(value) ? value.map(String) : []) : [];
  const selectedIdx = options.findIndex((o) => sameVal(o.value, value));
  const selected = options[selectedIdx];
  const isActive = (o) => (multiple ? selectedArr.includes(String(o.value)) : sameVal(o.value, value));
  // Multiple trigger matni: "N ta · A, B, C"
  const multiLabel = options.filter((o) => selectedArr.includes(String(o.value))).map((o) => o.label).join(', ');

  const place = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const estimate = Math.min(options.length * 40 + 12, 288);
    const openUp = spaceBelow < estimate && r.top > spaceBelow;
    setPos({ left: r.left, top: r.bottom, bottomAnchor: window.innerHeight - r.top, width: r.width, openUp });
  };

  const toggle = () => {
    if (disabled) return;
    if (!open) { place(); setHi(selectedIdx); }
    setOpen((o) => !o);
  };

  const pick = (v) => {
    if (multiple) {
      // Toggle qilamiz va ro'yxatni OCHIQ qoldiramiz (ketma-ket belgilash uchun).
      const sv = String(v);
      const cur = Array.isArray(value) ? value : [];
      const next = selectedArr.includes(sv) ? cur.filter((x) => String(x) !== sv) : [...cur, v];
      onChange?.(next);
      return;
    }
    onChange?.({ target: { value: String(v) } });
    setOpen(false);
    btnRef.current?.focus();
  };

  const step = (dir) => {
    if (!options.length) return;
    let i = hi;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) { setHi(i); break; }
    }
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (popRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    // Capture fazada — Dialog'ning Escape/keydown ishlovchisidan OLDIN ushlaymiz va to'xtatamiz
    // (aks holda Escape dropdown bilan birga modalni ham yopib yuborardi).
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); btnRef.current?.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const o = options[hi];
        if (o && !o.disabled) pick(o.value);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  });

  return (
    <>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        onClick={toggle}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); }
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex h-10 w-full items-center justify-between gap-2 rounded-md border bg-bg-base px-3 text-sm transition-colors',
          'focus:border-stroke-accent focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-error-strong' : open ? 'border-stroke-accent' : 'border-stroke-strong',
          className,
        )}
        {...props}
      >
        <span className={cn('truncate text-left', (multiple ? selectedArr.length : selected && !sameVal(selected.value, '')) ? 'text-text-strong' : 'text-text-soft')}>
          {multiple
            ? (selectedArr.length
                ? (summary ? summary(selectedArr) : `${selectedArr.length} ta · ${multiLabel}`)
                : (placeholder || 'Tanlang'))
            : (selected ? selected.label : (placeholder || ''))}
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-icon-soft transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.ul
              ref={popRef}
              role="listbox"
              initial={{ opacity: 0, y: pos.openUp ? 6 : -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: pos.openUp ? 6 : -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: pos.left,
                width: pos.width,
                zIndex: 9999,
                ...(pos.openUp ? { bottom: pos.bottomAnchor + 6 } : { top: pos.top + 6 }),
              }}
              className="max-h-72 space-y-[5px] overflow-auto rounded-xl border border-stroke-sub bg-bg-base p-1.5 shadow-elevated"
            >
              {options.map((o, i) => {
                const active = isActive(o);
                return (
                  <li key={i}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      disabled={o.disabled}
                      onMouseEnter={() => setHi(i)}
                      onClick={() => !o.disabled && pick(o.value)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        'disabled:cursor-not-allowed disabled:opacity-50',
                        active
                          ? 'bg-accent-strong text-text-white'
                          : i === hi
                            ? 'bg-bg-1-alt text-text-strong'
                            : 'text-text-sub hover:bg-bg-1-alt',
                      )}
                    >
                      <span className="truncate">{o.label}</span>
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  </li>
                );
              })}
              {!options.length && <li className="px-2.5 py-2 text-sm text-text-soft">Variant yo'q</li>}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
});
