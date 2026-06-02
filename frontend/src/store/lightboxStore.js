import { create } from 'zustand';

/** Full-screen image viewer state. Any `<img data-zoomable>` opens it on click. */
export const useLightbox = create((set) => ({
  src: null,
  open: (src) => set({ src }),
  close: () => set({ src: null }),
}));
