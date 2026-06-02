import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/** Modal dialog with smooth Framer Motion enter/exit. Closes on Esc / backdrop click.
 *  Pass `onBack` to show a ← arrow on the left (e.g. for nested step modals). */
export function Dialog({ open, onClose, title, subtitle, children, footer, size = 'md', onBack }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <motion.div
            className={cn(
              'relative flex max-h-[90vh] w-full flex-col rounded-xl border border-stroke-sub bg-bg-base shadow-elevated',
              widths[size],
            )}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between border-b border-stroke-sub px-5 py-4">
              <div className="flex items-start gap-2">
                {onBack && (
                  <button onClick={onBack} className="mt-0.5 rounded-md p-1 text-icon-sub transition-colors hover:bg-bg-1-alt hover:text-icon-strong" aria-label="Orqaga">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <div>
                  <h2 className="text-base font-semibold text-text-strong">{title}</h2>
                  {subtitle && <p className="mt-0.5 text-sm text-text-sub">{subtitle}</p>}
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1 text-icon-sub transition-colors hover:bg-bg-1-alt hover:text-icon-strong"
                aria-label="Yopish"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-stroke-sub px-5 py-4">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
