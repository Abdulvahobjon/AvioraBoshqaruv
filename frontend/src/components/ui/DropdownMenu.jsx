import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Kebab (⋮) dropdown menu. items: [{ label, icon, onClick, tone? }].
 * Renders the menu in a portal so it isn't clipped by table overflow.
 */
export function DropdownMenu({ items = [], align = 'right' }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = () => setOpen(false);
    document.addEventListener('mousedown', onClick);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onClick);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);

  const MENU_W = 208;
  const toggle = (e) => {
    e.stopPropagation();
    const r = btnRef.current.getBoundingClientRect();
    setCoords({ top: r.bottom + 4, left: align === 'right' ? r.right - MENU_W : r.left });
    setOpen((o) => !o);
  };

  const toneClass = { danger: 'text-error-strong hover:bg-error-soft', success: 'text-text-accent hover:bg-bg-2' };

  return (
    <>
      <button ref={btnRef} onClick={toggle} className="rounded-md p-1.5 text-icon-sub transition-colors hover:bg-bg-2">
        <MoreVertical className="h-4 w-4" />
      </button>
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, scale: 0.96, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -4 }}
              transition={{ duration: 0.14 }}
              style={{ position: 'fixed', top: coords.top, left: coords.left, width: MENU_W, zIndex: 60 }}
              className="overflow-hidden rounded-lg border border-stroke-sub bg-bg-base py-1 shadow-elevated"
            >
              {items.map((it, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick?.(); }}
                  className={cn('flex w-full items-center gap-2.5 whitespace-nowrap px-4 py-2.5 text-sm text-text-sub transition-colors hover:bg-bg-1-alt', toneClass[it.tone])}
                >
                  {it.icon && <it.icon className="h-4 w-4 shrink-0" />}
                  {it.label}
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
