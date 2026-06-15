import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** Raqamlarni 4 tadan ajratadi: "9860 1901 1286 4616" (maks 16 raqam). */
export function formatCard(raw) {
  return String(raw ?? '').replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
}

/**
 * Karta raqami inputi — avtomatik formatlash (0000 0000 0000 0000) +
 * fokuslanganda foydalanuvchining saqlangan kartalari ("Mening kartam") dropdown'i.
 */
export function CardNumberInput({ value, onChange, savedCards = [], placeholder = '0000 0000 0000 0000', error, className, ...props }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ left: 0, top: 0, width: 0 });
  const inputRef = useRef(null);
  const popRef = useRef(null);

  const cards = [...new Set(savedCards.filter(Boolean).map((c) => formatCard(c)))];

  const place = () => {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: r.left, top: r.bottom + 6, width: r.width });
  };

  const openMenu = () => { if (!cards.length) return; place(); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (popRef.current?.contains(e.target) || inputRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  });

  const pick = (c) => { onChange(c); setOpen(false); inputRef.current?.focus(); };

  return (
    <>
      <input
        ref={inputRef}
        value={value || ''}
        inputMode="numeric"
        onChange={(e) => onChange(formatCard(e.target.value))}
        onFocus={openMenu}
        placeholder={placeholder}
        className={cn(
          'h-10 w-full rounded-md border bg-bg-base px-3 text-sm tracking-wide text-text-strong',
          'placeholder:tracking-normal placeholder:text-text-soft transition-colors',
          'focus:border-stroke-accent focus-visible:outline-none',
          error ? 'border-error-strong' : 'border-stroke-strong',
          className,
        )}
        {...props}
      />
      {createPortal(
        <AnimatePresence>
          {open && cards.length > 0 && (
            <motion.div
              ref={popRef}
              initial={{ opacity: 0, y: -6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{ position: 'fixed', left: pos.left, top: pos.top, width: pos.width, zIndex: 9999 }}
              className="overflow-hidden rounded-xl border border-stroke-sub bg-bg-base p-1.5 shadow-elevated"
            >
              {cards.map((c, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(c)}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-bg-1-alt"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-soft text-accent-strong"><CreditCard className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-text-soft">Mening kartam</p>
                    <p className="truncate text-sm font-semibold tracking-wide text-text-strong">{c}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-icon-soft" />
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}
