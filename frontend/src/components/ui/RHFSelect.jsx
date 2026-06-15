import { Controller } from 'react-hook-form';
import { Select } from './Input';

/**
 * react-hook-form bilan ishlovchi Select.
 *
 * Loyihadagi `Select` — maxsus (button/listbox) controlled komponent: u `value` propini kutadi.
 * `register()` esa `value` bermaydi (faqat native input uchun ref/onChange) — shu sababli
 * `<Select {...register('x')}>` tanlangan qiymatni KO'RSATMAYDI. Bu wrapper `Controller` orqali
 * `value`+`onChange`ni to'g'ri bog'laydi.
 *
 * Foydalanish:
 *   <RHFSelect control={control} name="status" error={errors.status}>
 *     <option value="active">Faol</option>
 *   </RHFSelect>
 */
export function RHFSelect({ control, name, rules, error, children, ...props }) {
  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <Select value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value)} error={error} {...props}>
          {children}
        </Select>
      )}
    />
  );
}
