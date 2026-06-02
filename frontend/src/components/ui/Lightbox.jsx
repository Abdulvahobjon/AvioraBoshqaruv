import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useLightbox } from '@/store/lightboxStore';

/**
 * Global full-screen image viewer.
 * Mount once at app root. Any `<img data-zoomable>` anywhere opens it on click.
 */
export function Lightbox() {
  const src = useLightbox((s) => s.src);
  const open = useLightbox((s) => s.open);
  const close = useLightbox((s) => s.close);

  // Delegated: clicking any image marked data-zoomable opens it full-screen.
  useEffect(() => {
    const onClick = (e) => {
      const img = e.target?.closest?.('img[data-zoomable]');
      if (img?.getAttribute('src')) {
        e.preventDefault();
        e.stopPropagation();
        open(img.currentSrc || img.getAttribute('src'));
      }
    };
    document.addEventListener('click', onClick, true); // capture: beats parent handlers
    return () => document.removeEventListener('click', onClick, true);
  }, [open]);

  // Esc to close + lock scroll while open
  useEffect(() => {
    if (!src) return;
    const onKey = (e) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [src, close]);

  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        >
          <button onClick={close} className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20" aria-label="Yopish">
            <X className="h-6 w-6" />
          </button>
          <motion.img
            src={src}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[92vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
          />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
