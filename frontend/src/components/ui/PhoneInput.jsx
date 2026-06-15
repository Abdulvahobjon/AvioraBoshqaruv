import { cn } from '@/lib/utils/cn';

/** +998 dan keyingi milliy 9 raqam (faqat raqamlar). */
export function phoneDigits(v) {
  let d = String(v ?? '').replace(/\D/g, '');
  if (d.startsWith('998')) d = d.slice(3);
  return d.slice(0, 9);
}

/** Milliy qismni "XX XXX XX XX" ko'rinishida formatlash. */
export function formatPhoneNational(v) {
  const d = phoneDigits(v);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(' ');
}

/** Kanonik saqlash qiymati: "+998901234567" yoki bo'sh bo'lsa ''. */
export function canonicalPhone(v) {
  const d = phoneDigits(v);
  return d ? `+998${d}` : '';
}

/** To'liq ko'rsatish uchun: "+998 90 123 45 67" (bo'sh bo'lsa ''). */
export function formatPhone(v) {
  const nat = formatPhoneNational(v);
  return nat ? `+998 ${nat}` : '';
}

/**
 * Telefon kiritish maydoni — +998 doimiy prefiks + "XX XXX XX XX" formati.
 * `onChange` kanonik qiymat ("+998901234567") yoki bo'sh ('') qaytaradi (CardInput uslubida).
 */
export function PhoneInput({ value, onChange, error, disabled, className, placeholder = '90 123 45 67', ...props }) {
  return (
    <div
      className={cn(
        'flex h-10 w-full items-center rounded-md border bg-bg-base text-sm transition-colors',
        'focus-within:border-stroke-accent',
        error ? 'border-error-strong' : 'border-stroke-strong',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span className="select-none pl-3 pr-1.5 text-text-soft">+998</span>
      <span className="h-5 w-px shrink-0 bg-stroke-sub" />
      <input
        inputMode="numeric"
        disabled={disabled}
        placeholder={placeholder}
        value={formatPhoneNational(value)}
        onChange={(e) => onChange(canonicalPhone(e.target.value))}
        className="h-full min-w-0 flex-1 rounded-r-md bg-transparent px-2 text-text-strong placeholder:text-text-soft focus:outline-none disabled:cursor-not-allowed"
        {...props}
      />
    </div>
  );
}
