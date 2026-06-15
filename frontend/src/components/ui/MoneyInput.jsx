import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

// Butun qismni minglik bo'shliq bilan ajratadi ("10 000 000").
const groupInt = (intStr) => (intStr || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

// Matn ↔ son. Bo'sh/"." → ''.
function parseNum(text) {
  const c = String(text ?? '').replace(/\s/g, '').replace(',', '.');
  if (c === '' || c === '.') return '';
  const n = Number(c);
  return Number.isNaN(n) ? '' : n;
}

// Tashqi son qiymatdan ko'rsatish uchun matn (har doim 2 kasr: "10 000 000.00").
function toDisplay(value) {
  if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) return '';
  const [int, dec] = Number(value).toFixed(2).split('.');
  return `${groupInt(int)}.${dec}`;
}

// Yozilayotgan matnni guruhlash (trailing nuqta/kasrni saqlaydi).
function formatTyping(cleaned) {
  if (cleaned === '') return '';
  const hasDot = cleaned.includes('.');
  const [int, dec = ''] = cleaned.split('.');
  const g = groupInt(int);
  return hasDot ? `${g}.${dec}` : g;
}

/**
 * Pul inputi: minglik ajratish + 2 kasr (.xx) bilan kiritish. onChange'ga raqamli qiymat (son) beradi.
 * Matn o'ng tomonda turadi va ozgina qalin (font-medium).
 */
export function MoneyInput({ value, onChange, className, error, ...props }) {
  const [text, setText] = useState(() => toDisplay(value));

  // Tashqi qiymat o'zgarsa (yuklash/reset) — matnni sinxronlaymiz, lekin yozish jarayonini buzmaymiz.
  useEffect(() => {
    if (value === '' || value === null || value === undefined) {
      if (text !== '') setText('');
      return;
    }
    if (Number(value) !== parseNum(text)) setText(toDisplay(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const onInput = (e) => {
    let cleaned = String(e.target.value).replace(/\s/g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    const firstDot = cleaned.indexOf('.');
    if (firstDot !== -1) {
      const intPart = cleaned.slice(0, firstDot);
      const decPart = cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2); // bitta nuqta, maks 2 kasr
      cleaned = `${intPart}.${decPart}`;
    }
    setText(formatTyping(cleaned));
    onChange?.(parseNum(cleaned));
  };

  // Fokus ketganda 2 kasrga normallashtiramiz.
  const onBlur = () => { if (value !== '' && value != null) setText(toDisplay(value)); };

  return (
    <input
      inputMode="decimal"
      value={text}
      onChange={onInput}
      onBlur={onBlur}
      className={cn(
        'h-10 w-full rounded-md border bg-bg-base px-3 text-right text-sm font-medium text-text-strong',
        'placeholder:font-normal placeholder:text-text-soft transition-colors',
        'focus:border-stroke-accent focus-visible:outline-none',
        error ? 'border-error-strong' : 'border-stroke-strong',
        className,
      )}
      {...props}
    />
  );
}
