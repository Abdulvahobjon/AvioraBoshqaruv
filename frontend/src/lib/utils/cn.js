import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware className combiner. */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
