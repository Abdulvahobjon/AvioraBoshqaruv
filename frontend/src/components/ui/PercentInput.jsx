import { Input } from './Input';

/**
 * Foiz inputi — faqat butun raqam, qat'iy 0..100 oralig'ida (qo'lda yozilsa ham clamp qilinadi).
 * Boshqarilgan komponent: value (string|number) + onChange(string).
 */
export function PercentInput({ value, onChange, placeholder = '%', ...props }) {
  return (
    <Input
      inputMode="numeric"
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '');
        if (digits === '') { onChange(''); return; }
        onChange(String(Math.min(100, Number(digits))));
      }}
      {...props}
    />
  );
}
